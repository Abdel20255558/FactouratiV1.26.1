import { ReactNode } from 'react';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type PublicSiteChromeProps = {
  children: ReactNode;
};

const homeLinks = [
  { label: 'Accueil', href: '/' },
  { label: 'Secteurs', href: '/secteurs' },
  { label: 'Modules', href: '/modules' },
  { label: 'Generateur', href: '/generateur-facture' },
  { label: 'Tarifs', href: '/tarifs' },
  { label: 'FAQ', href: '/faq' },
];

export default function PublicSiteChrome({ children }: PublicSiteChromeProps) {
  const { pathname } = useLocation();
  const linkClass = (href: string) =>
    `font-medium transition-colors ${pathname === href ? 'text-sky-700' : 'text-slate-700 hover:text-sky-700'}`;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-sky-100 bg-white/88 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-md ring-1 ring-sky-100">
                <img
                  src="https://www.factourati.com/files_3254075-1761082431431-image.png"
                  alt="Logo Factourati"
                  width="40"
                  height="40"
                  className="h-9 w-9 object-contain"
                />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-950">Factourati</p>
                <p className="text-xs uppercase tracking-[0.18em] text-sky-700">ERP Marocain</p>
              </div>
            </Link>

            <nav className="hidden items-center space-x-8 md:flex">
              {homeLinks.map((item) => (
                <Link key={item.label} to={item.href} className={linkClass(item.href)}>
                  {item.label}
                </Link>
              ))}
              <Link
                to="/blog"
                className={`font-medium transition-colors ${pathname.startsWith('/blog') ? 'text-sky-700' : 'text-slate-700 hover:text-sky-700'}`}
              >
                Blog
              </Link>
              <Link to="/login" className="font-medium text-slate-700 hover:text-sky-700">
                Connexion
              </Link>
            </nav>

            <Link
              to="/login?mode=register"
              className="rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:from-sky-600 hover:via-cyan-600 hover:to-emerald-500 hover:shadow-xl sm:px-6"
            >
              Essai 1 mois gratuit
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">{children}</main>

      <footer id="contact" className="mt-auto border-t border-cyan-100 bg-[linear-gradient(180deg,#f8fffd_0%,#ecfeff_100%)] py-16 text-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-sm md:col-span-2">
              <div className="mb-4 flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-50 to-emerald-50 shadow-sm ring-1 ring-sky-100">
                  <img
                    src="https://www.factourati.com/files_3254075-1761082431431-image.png"
                    alt="Logo Factourati"
                    width="32"
                    height="32"
                    className="h-7 w-7 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Factourati</h3>
                  <p className="text-sm uppercase tracking-[0.18em] text-sky-700">ERP Marocain</p>
                </div>
              </div>
              <p className="mb-6 max-w-md text-slate-600">
                La solution marocaine qui reunit devis, factures, stock, fournisseurs, projets et equipe pour travailler plus vite et plus sereinement.
              </p>
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Phone className="h-4 w-4 text-sky-600" />
                  <span>+212 666 736 446</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Mail className="h-4 w-4 text-sky-600" />
                  <span>contact@Factourati.com</span>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-semibold text-slate-950">Suivez-nous</h4>
                <div className="flex items-center space-x-4">
                  <a href="https://web.facebook.com/profile.php?id=61585975779434" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-blue-600 hover:text-white" aria-label="Facebook">
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a href="https://www.instagram.com/factourati/" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-pink-600 hover:text-white" aria-label="Instagram">
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a href="https://x.com/FacTourati" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-sky-500 hover:text-white" aria-label="Twitter/X">
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a href="https://www.linkedin.com/company/factourati" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-blue-700 hover:text-white" aria-label="LinkedIn">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-red-600 hover:text-white" aria-label="YouTube">
                    <Youtube className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-sm">
              <h4 className="mb-4 font-semibold text-slate-950">Liens rapides</h4>
              <ul className="space-y-2 text-slate-600">
                {homeLinks.map((item) => (
                  <li key={item.label}>
                    <Link to={item.href} className="transition-colors hover:text-sky-700">
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/blog" className="transition-colors hover:text-sky-700">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="transition-colors hover:text-sky-700">
                    Connexion
                  </Link>
                </li>
              </ul>
            </div>

            <div className="rounded-[1.75rem] border border-white bg-white/90 p-6 shadow-sm">
              <h4 className="mb-4 font-semibold text-slate-950">Contact</h4>
              <div className="space-y-3 text-slate-600">
                <div className="flex items-start space-x-2">
                  <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-sky-600" />
                  <span>Sale, Maroc</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-sky-600" />
                  <span>contact@Factourati.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-sky-600" />
                  <span>+212 666 736 446</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-cyan-100 pt-8 text-center text-slate-500">
            <p>&copy; {new Date().getFullYear()} Factourati. Tous droits reserves. Made in Morocco</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
