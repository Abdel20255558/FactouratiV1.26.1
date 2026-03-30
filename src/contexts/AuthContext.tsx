// ==============================
// src/contexts/AuthContext.tsx
// ==============================
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification as fbSendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  ActionCodeSettings,
} from 'firebase/auth';
import { addDoc, doc, getDoc, setDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ManagedUser } from './UserManagementContext';

interface Company {
  name: string;
  activity?: string;
  ice: string;
  if: string;
  rc: string;
  cnss: string;
  address: string;
  phone: string;
  email: string;
  patente: string;
  website: string;
  logo?: string;
  signature?: string;
  invoiceNumberingFormat?: string;
  invoicePrefix?: string;
  invoiceCounter?: number;
  lastInvoiceYear?: number;
  defaultTemplate?: string;
  subscription?: 'free' | 'pro';
  subscriptionDate?: string;
  expiryDate?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isAdmin: boolean;
  entrepriseId?: string;
  permissions?: {
    dashboard: boolean;
    invoices: boolean;
    quotes: boolean;
    clients: boolean;
    products: boolean;
    orders: boolean;
    suppliers: boolean;
    stockManagement: boolean;
    supplierManagement: boolean;
    hrManagement: boolean;
    reports: boolean;
    settings: boolean;
    projectManagement: boolean;
  };
  company: Company;
}

interface SupportSession {
  isActive: boolean;
  companyId: string | null;
  companyName: string | null;
  adminEmail: string | null;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  supportSession: SupportSession;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, companyData: Company) => Promise<boolean>;
  sendEmailVerification: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  startSupportAccess: (companyId: string) => Promise<boolean>;
  stopSupportAccess: () => void;
  upgradeSubscription: () => Promise<void>;
  updateCompanySettings: (settings: Partial<Company>) => Promise<void>;
  checkSubscriptionExpiry: () => Promise<void>;
  isLoading: boolean;
  showExpiryAlert: boolean;
  setShowExpiryAlert: (show: boolean) => void;
  expiredDate: string | null;
  subscriptionStatus: {
    isExpired: boolean;
    isExpiringSoon: boolean;
    daysRemaining: number;
    shouldBlockUsers: boolean;
    shouldShowNotification: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Base URL pour la redirection après vérif email */
const BASE_URL =
  import.meta.env.VITE_PUBLIC_BASE_URL ||
  'https://www.factourati.com/';


const getActionCodeSettings = (): ActionCodeSettings => ({
  url: `${BASE_URL}/verify-email-success?mode=verifyEmail`,
  handleCodeInApp: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [platformAdminUser, setPlatformAdminUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExpiryAlert, setShowExpiryAlert] = useState(false);
  const [expiredDate, setExpiredDate] = useState<string | null>(null);
  const [supportSession, setSupportSession] = useState<SupportSession>({
    isActive: false,
    companyId: null,
    companyName: null,
    adminEmail: null
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isExpired: false,
    isExpiringSoon: false,
    daysRemaining: 0,
    shouldBlockUsers: false,
    shouldShowNotification: false
  });

  const calculateSubscriptionStatus = (userData: any) => {
    if (userData.subscription !== 'pro' || !userData.expiryDate) {
      return {
        isExpired: false,
        isExpiringSoon: false,
        daysRemaining: 0,
        shouldBlockUsers: false,
        shouldShowNotification: false
      };
    }
    const currentDate = new Date();
    const expiry = new Date(userData.expiryDate);
    const timeDiff = expiry.getTime() - currentDate.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;
    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 5;
    const shouldBlockUsers = isExpired;
    const shouldShowNotification = isExpiringSoon && !isExpired;
    return {
      isExpired,
      isExpiringSoon,
      daysRemaining: Math.max(0, daysRemaining),
      shouldBlockUsers,
      shouldShowNotification
    };
  };

  const buildCompanyAdminUser = (companyId: string, companyData: any, emailOverride?: string, nameOverride?: string): User => ({
    id: companyId,
    name: nameOverride || companyData.ownerName || emailOverride?.split('@')[0] || 'Administrateur',
    email: emailOverride || companyData.ownerEmail || companyData.email || '',
    role: 'admin',
    isAdmin: true,
    entrepriseId: companyId,
    company: {
      name: companyData.name,
      activity: companyData.activity || '',
      ice: companyData.ice,
      if: companyData.if,
      rc: companyData.rc,
      cnss: companyData.cnss,
      address: companyData.address,
      phone: companyData.phone,
      logo: companyData.logo,
      email: companyData.email,
      signature: companyData.signature || '',
      patente: companyData.patente,
      website: companyData.website,
      invoiceNumberingFormat: companyData.invoiceNumberingFormat,
      invoicePrefix: companyData.invoicePrefix,
      invoiceCounter: companyData.invoiceCounter,
      lastInvoiceYear: companyData.lastInvoiceYear,
      defaultTemplate: companyData.defaultTemplate || 'template1',
      subscription: companyData.subscription || 'free',
      subscriptionDate: companyData.subscriptionDate,
      expiryDate: companyData.expiryDate
    }
  });

  const checkManagedUser = async (email: string, password: string): Promise<ManagedUser | null> => {
    try {
      const managedUsersQuery = query(
        collection(db, 'managedUsers'),
        where('email', '==', email),
        where('password', '==', password),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(managedUsersQuery);
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as ManagedUser;
        return { id: snapshot.docs[0].id, ...userData };
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la vérification de l’utilisateur géré:', error);
      return null;
    }
  };

  const checkSubscriptionExpiry = async (userId: string, userData: any) => {
    if (userData.subscription === 'pro' && userData.expiryDate) {
      const currentDate = new Date();
      const expiryDate = new Date(userData.expiryDate);
      if (currentDate > expiryDate) {
        try {
          await updateDoc(doc(db, 'entreprises', userId), {
            subscription: 'free',
            subscriptionDate: new Date().toISOString(),
            expiryDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          setUser(prev => prev ? {
            ...prev,
            company: { ...prev.company, subscription: 'free', subscriptionDate: new Date().toISOString(), expiryDate: new Date().toISOString() }
          } : prev);
          setExpiredDate(userData.expiryDate);
          setShowExpiryAlert(true);
        } catch (error) {
          console.error('Erreur lors de la mise à jour de l’expiration:', error);
        }
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const userDoc = await getDoc(doc(db, 'entreprises', fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Synchroniser Firestore si l’email vient d’être vérifié
            if (fbUser.emailVerified && userData.emailVerified !== true) {
              try {
                await updateDoc(doc(db, 'entreprises', fbUser.uid), {
                  emailVerified: true,
                  updatedAt: new Date().toISOString(),
                });
                (userData as any).emailVerified = true;
              } catch (e) {
                console.warn('Sync emailVerified Firestore échouée:', e);
              }
            }

            setUser(
              buildCompanyAdminUser(
                fbUser.uid,
                userData,
                fbUser.email || '',
                userData.ownerName || fbUser.email?.split('@')[0]
              )
            );
            setSubscriptionStatus(calculateSubscriptionStatus(userData));
            await checkSubscriptionExpiry(fbUser.uid, userData);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      if (email === 'admin@facturati.ma' && password === 'Rahma1211?') {
        const adminUser: User = {
          id: 'facture-admin',
          name: 'Administrateur Facturati',
          email: 'admin@facturati.ma',
          role: 'admin',
          isAdmin: true,
          entrepriseId: 'facture-admin',
          company: {
            name: 'Facturati Administration',
            ice: 'ADMIN',
            if: 'ADMIN',
            rc: 'ADMIN',
            cnss: 'ADMIN',
            address: 'Casablanca, Maroc',
            phone: '+212 522 123 456',
            email: 'admin@facturati.ma',
            patente: 'ADMIN',
            website: 'https://facturati.ma',
            subscription: 'pro',
            subscriptionDate: new Date().toISOString(),
            expiryDate: new Date(2030, 11, 31).toISOString()
          }
        };
        setFirebaseUser(null);
        setPlatformAdminUser(adminUser);
        setSupportSession({
          isActive: false,
          companyId: null,
          companyName: null,
          adminEmail: adminUser.email
        });
        setUser(adminUser);
        return true;
      }

      const managedUser = await checkManagedUser(email, password);
      if (managedUser) {
        const companyDoc = await getDoc(doc(db, 'entreprises', managedUser.entrepriseId));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          const status = calculateSubscriptionStatus(companyData);
          if (status.shouldBlockUsers || (companyData.subscription !== 'pro')) {
            throw new Error('ACCOUNT_BLOCKED_EXPIRED');
          }
          const loginAt = new Date().toISOString();
          await updateDoc(doc(db, 'managedUsers', managedUser.id), { lastLogin: loginAt });
          await updateDoc(doc(db, 'entreprises', managedUser.entrepriseId), {
            lastClientAccessAt: loginAt,
            lastClientAccessByEmail: managedUser.email,
            updatedAt: loginAt
          });
          setUser({
            id: managedUser.id,
            name: managedUser.name,
            email: managedUser.email,
            role: 'user',
            isAdmin: false,
            permissions: managedUser.permissions,
            entrepriseId: managedUser.entrepriseId,
            company: {
              name: companyData.name,
              activity: companyData.activity || '',
              ice: companyData.ice,
              if: companyData.if,
              rc: companyData.rc,
              cnss: companyData.cnss,
              address: companyData.address,
              phone: companyData.phone,
              logo: companyData.logo,
              email: companyData.email,
              signature: companyData.signature || '',
              patente: companyData.patente,
              website: companyData.website,
              invoiceNumberingFormat: companyData.invoiceNumberingFormat,
              invoicePrefix: companyData.invoicePrefix,
              invoiceCounter: companyData.invoiceCounter,
              lastInvoiceYear: companyData.lastInvoiceYear,
              defaultTemplate: companyData.defaultTemplate || 'template1',
              subscription: companyData.subscription || 'free',
              subscriptionDate: companyData.subscriptionDate,
              expiryDate: companyData.expiryDate
            }
          });
          setSubscriptionStatus(status);
          return true;
        }
        return false;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loginAt = new Date().toISOString();
      await updateDoc(doc(db, 'entreprises', userCredential.user.uid), {
        lastClientAccessAt: loginAt,
        lastClientAccessByEmail: email,
        updatedAt: loginAt
      });
      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, companyData: Company): Promise<boolean> => {
    try {
      // Vérification finale du nom de société avant création
      const companiesQuery = query(
        collection(db, 'entreprises'),
        where('name', '==', companyData.name.trim())
      );
      const existingCompanies = await getDocs(companiesQuery);
      
      if (!existingCompanies.empty) {
        console.error('Nom de société déjà utilisé:', companyData.name);
        return false;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // envoyer la vérification avec redirection personnalisée
      auth.languageCode = 'fr';
      await fbSendEmailVerification(userCredential.user, getActionCodeSettings());

      // 1 mois pro offert
      const now = new Date();
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + 1);

      await setDoc(doc(db, 'entreprises', userId), {
        ...companyData,
        ownerEmail: email,
        ownerName: email.split('@')[0],
        emailVerified: false,
        subscription: 'pro',
        subscriptionDate: now.toISOString(),
        expiryDate: expiry.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        verificationEmailSentAt: now.toISOString(),
      });

      try { localStorage.setItem('welcomeProPending', '1'); } catch {}

      return true;
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      return false;
    }
  };

  const sendEmailVerificationManual = async (): Promise<void> => {
    if (!firebaseUser) throw new Error('Aucun utilisateur connecté');
    try {
      auth.languageCode = 'fr';
      await fbSendEmailVerification(firebaseUser, getActionCodeSettings());
    } catch (error) {
      console.error('Erreur envoi email vérification:', error);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try { await sendPasswordResetEmail(auth, email); } catch (error) { console.error('Erreur reset password:', error); throw error; }
  };

  const upgradeSubscription = async (): Promise<void> => {
    if (!user) return;
    try {
      const currentDate = new Date();
      const expiryDate = new Date(currentDate);
      expiryDate.setDate(currentDate.getDate() + 30);
      await updateDoc(doc(db, 'entreprises', user.id), {
        subscription: 'pro',
        subscriptionDate: currentDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        updatedAt: new Date().toISOString()
      });
      setUser(prev => prev ? {
        ...prev,
        company: { ...prev.company, subscription: 'pro', subscriptionDate: currentDate.toISOString(), expiryDate: expiryDate.toISOString() }
      } : prev);
    } catch (error) {
      console.error('Erreur lors de la mise à niveau:', error);
      throw error;
    }
  };

  const updateCompanySettings = async (settings: Partial<Company>): Promise<void> => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'entreprises', user.id), { ...settings, updatedAt: new Date().toISOString() });
      setUser(prev => prev ? { ...prev, company: { ...prev.company, ...settings } } : prev);
    } catch (error) {
      console.error('Erreur update paramètres:', error);
      throw error;
    }
  };

  const checkSubscriptionExpiryManual = async (): Promise<void> => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'entreprises', user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        await checkSubscriptionExpiry(user.id, userData);
      }
    } catch (error) {
      console.error("Erreur check expiration:", error);
    }
  };

  const startSupportAccess = async (companyId: string): Promise<boolean> => {
    if (!user || user.email !== 'admin@facturati.ma') {
      return false;
    }

    try {
      const companyDoc = await getDoc(doc(db, 'entreprises', companyId));
      if (!companyDoc.exists()) {
        return false;
      }

      const companyData = companyDoc.data();
      await addDoc(collection(db, 'supportAccessLogs'), {
        adminEmail: user.email,
        adminName: user.name,
        companyId,
        companyName: companyData.name || '',
        companyOwnerEmail: companyData.ownerEmail || companyData.email || '',
        openedAt: new Date().toISOString()
      });
      setPlatformAdminUser(user);
      setUser(buildCompanyAdminUser(companyId, companyData));
      setSupportSession({
        isActive: true,
        companyId,
        companyName: companyData.name || null,
        adminEmail: 'admin@facturati.ma'
      });
      setSubscriptionStatus(calculateSubscriptionStatus(companyData));
      return true;
    } catch (error) {
      console.error('Erreur lors de l acces support:', error);
      return false;
    }
  };

  const stopSupportAccess = (): void => {
    if (!platformAdminUser) {
      return;
    }

    setUser(platformAdminUser);
    setSupportSession({
      isActive: false,
      companyId: null,
      companyName: null,
      adminEmail: platformAdminUser.email
    });
    setSubscriptionStatus({
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: 0,
      shouldBlockUsers: false,
      shouldShowNotification: false
    });
  };

  const logout = async (): Promise<void> => {
    try {
      if (supportSession.isActive && platformAdminUser) {
        stopSupportAccess();
        return;
      }

      if (user && !user.isAdmin) {
        setUser(null);
        setFirebaseUser(null);
      } else {
        setUser(null);
        setFirebaseUser(null);
        setPlatformAdminUser(null);
        setSupportSession({
          isActive: false,
          companyId: null,
          companyName: null,
          adminEmail: null
        });
        await signOut(auth);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    isAuthenticated: !!user,
    supportSession,
    login,
    register,
    sendEmailVerification: sendEmailVerificationManual,
    sendPasswordReset,
    logout,
    startSupportAccess,
    stopSupportAccess,
    upgradeSubscription,
    updateCompanySettings,
    checkSubscriptionExpiry: checkSubscriptionExpiryManual,
    isLoading,
    showExpiryAlert,
    setShowExpiryAlert,
    expiredDate,
    subscriptionStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
