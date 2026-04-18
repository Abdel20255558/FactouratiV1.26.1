import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MailCheck, RefreshCw, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import { sendEmailVerification as fbSendEmailVerification } from 'firebase/auth';

const LOGO =
  'https://i.ibb.co/kgVKRM9z/20250915-1327-Conception-Logo-Color-remix-01k56ne0szey2vndspbkzvezyp-1.png';

function getVerificationEmailErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;

  if (code === 'auth/network-request-failed') {
    return "Connexion impossible avec Firebase. Verifiez internet puis reessayez.";
  }

  if (code === 'auth/too-many-requests') {
    return "Trop de tentatives. Attendez quelques minutes puis reessayez.";
  }

  if (code === 'auth/quota-exceeded') {
    return "Quota d'envoi Firebase depasse. Reessayez plus tard ou contactez le support.";
  }

  if (code === 'auth/operation-not-allowed') {
    return "L'envoi d'emails Firebase n'est pas active. Activez Email/Password dans Firebase Auth.";
  }

  if (code === 'auth/user-token-expired' || code === 'auth/invalid-user-token') {
    return "Votre session a expire. Reconnectez-vous puis renvoyez l'email.";
  }

  if (code === 'auth/unauthorized-domain' || code === 'auth/unauthorized-continue-uri' || code === 'auth/invalid-continue-uri') {
    return "Le domaine de verification n'est pas autorise dans Firebase.";
  }

  if (code) {
    return `Erreur Firebase ${code}. Reconnectez-vous puis reessayez.`;
  }

  return (error as { message?: string })?.message || "Impossible d'envoyer l'email de verification.";
}

// --- Confetti minimal sans dépendances
const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#a855f7', '#22c55e'];
function ConfettiBurst({ pieces = 90 }: { pieces?: number }) {
  const items = React.useMemo(
    () =>
      Array.from({ length: pieces }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / pieces + Math.random() * 0.8;
        const distance = 140 + Math.random() * 90;
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * -distance,
          rotate: Math.random() * 360,
          size: 5 + Math.random() * 6,
          delay: Math.random() * 0.12,
          color: COLORS[i % COLORS.length],
          key: i,
        };
      }),
    [pieces]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((p) => (
        <motion.span
          key={p.key}
          initial={{ x: 0, y: 0, rotate: 0, scale: 0.9, opacity: 1 }}
          animate={{ x: p.x, y: p.y, rotate: p.rotate, scale: 1, opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: p.delay }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: p.size,
            height: p.size * 1.6,
            borderRadius: 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

export default function EmailVerificationPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const emailFromQuery = params.get('email') || '';

  // Si ton AuthContext propose une méthode, on la préfère ; sinon fallback Firebase.
  const { sendEmailVerification: ctxSendEmailVerification } = useAuth() as {
    sendEmailVerification?: () => Promise<void>;
  };

  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string>('');

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      if (typeof ctxSendEmailVerification === 'function') {
        await ctxSendEmailVerification();
      } else if (auth.currentUser) {
        await fbSendEmailVerification(auth.currentUser);
      } else {
        throw new Error("Aucun utilisateur connecté pour renvoyer l'email.");
      }
      setSent(true);
    } catch (e: any) {
      setError(getVerificationEmailErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-blue-50 overflow-hidden px-4">
      {/* halos de fond */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-teal-300/30 to-blue-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-gradient-to-tr from-amber-300/30 to-red-300/30 blur-3xl" />

      {/* confetti discret quand on vient de renvoyer */}
      <AnimatePresence>{sent && <ConfettiBurst />}</AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* header */}
          <div className="px-6 sm:px-8 py-6 bg-gradient-to-r from-teal-600 to-blue-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 grid place-items-center shadow-inner">
                <img src={LOGO} alt="Factourati" className="w-9 h-9 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Vérification d’email</h1>
                <p className="text-xs text-white/85">Un dernier pas avant de commencer 🎯</p>
              </div>
            </div>
          </div>

          {/* contenu */}
          <div className="px-6 sm:px-8 py-8 text-center">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-teal-50 grid place-items-center border border-teal-100">
              <MailCheck className="w-8 h-8 text-teal-600" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Confirmez votre adresse email
            </h2>
            <p className="mt-2 text-gray-600">
              Nous avons envoyé un lien de vérification à{' '}
              <span className="font-semibold text-gray-900">
                {emailFromQuery || 'votre adresse email'}
              </span>
              . Ouvrez votre boîte de réception et cliquez sur le lien.
            </p>

            {/* feedback */}
            {error && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            {sent && !error && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>Email de vérification renvoyé. Vérifiez votre boîte de réception !</span>
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                type="button"
                onClick={handleResend}
                disabled={sending}
                whileHover={{ scale: sending ? 1 : 1.03 }}
                whileTap={{ scale: sending ? 1 : 0.98 }}
                animate={{ opacity: sending ? 0.8 : 1 }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition shadow disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${sending ? 'animate-spin' : ''}`} />
                {sending ? 'Envoi…' : 'Renvoyer l’email'}
              </motion.button>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>

            <p className="mt-6 text-xs text-gray-500">
              Une fois l’email confirmé, revenez vous connecter depuis la page Login.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-xs text-gray-500">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Astuce : cherchez aussi dans “SPAM” ou “Promotions”.</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
