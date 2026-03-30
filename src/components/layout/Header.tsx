import React from 'react';
import { ArrowLeftRight, Bell, LogOut, Menu, Moon, Search, Sun, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
}

export default function Header({ sidebarOpen, setSidebarOpen, onOpenSearch, onOpenNotifications }: HeaderProps) {
  const { user, logout, supportSession, stopSupportAccess } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { toggleTheme, isDark } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur lors de la deconnexion:', error);
    }
  };

  const isPlatformAdmin = user?.email === 'admin@facturati.ma';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {supportSession.isActive && (
            <div className="hidden lg:flex items-center space-x-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Mode support</p>
                <p className="text-sm font-medium text-amber-900">{supportSession.companyName || 'Client'}</p>
              </div>
              <button
                onClick={stopSupportAccess}
                className="inline-flex items-center space-x-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Retour admin</span>
              </button>
            </div>
          )}

          <button
            onClick={onOpenSearch}
            className="hidden min-w-80 items-center space-x-3 rounded-lg bg-gray-100 px-4 py-2 transition-all duration-200 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 md:flex"
          >
            <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Rechercher facture, devis, client, produit...</span>
            <div className="ml-auto flex items-center space-x-1">
              <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">Ctrl</kbd>
              <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">K</kbd>
            </div>
          </button>

          <button
            onClick={onOpenSearch}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
          >
            <Search className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setLanguage('fr')}
              className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
                language === 'fr' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              FR
            </button>
          </div>

          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </button>

          <button
            onClick={onOpenNotifications}
            className="relative rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-red-500"></span>
          </button>

          {user?.company?.name && (
            <div className="text-lg font-bold uppercase text-gray-900 dark:text-white">
              {user.company.name}
              {supportSession.isActive && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Support</span>
              )}
              {!supportSession.isActive && !user.isAdmin && !isPlatformAdmin && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">Utilisateur</span>
              )}
              {isPlatformAdmin && !supportSession.isActive && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">Admin Plateforme</span>
              )}
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="group relative">
              <button className="flex items-center space-x-2 rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white">
                {user?.company.logo ? (
                  <img src={user.company.logo} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-blue-500">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>

              <div className="invisible absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:border-gray-700 dark:bg-gray-800">
                <div className="py-2">
                  {user && (
                    <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {supportSession.isActive
                          ? 'Acces support'
                          : isPlatformAdmin
                            ? 'Admin Plateforme'
                            : user.isAdmin
                              ? 'Administrateur'
                              : 'Utilisateur'}
                      </p>
                    </div>
                  )}

                  {supportSession.isActive && (
                    <button
                      onClick={stopSupportAccess}
                      className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>Retour admin</span>
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{supportSession.isActive ? 'Quitter le mode support' : 'Deconnexion'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
