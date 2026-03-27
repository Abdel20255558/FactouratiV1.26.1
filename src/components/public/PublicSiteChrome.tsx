import { ReactNode } from 'react';
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

type PublicSiteChromeProps = {
  children: ReactNode;
};

const homeLinks = [
  { label: 'Accueil', href: '/#accueil' },
  { label: 'Secteurs', href: '/#secteurs' },
  { label: 'Modules', href: '/#modules' },
  { label: 'Tarifs', href: '/#tarifs' },
  { label: 'FAQ', href: '/#faq' },
];

export default function PublicSiteChrome({ children }: PublicSiteChromeProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-black-200 to-red-600 shadow-lg">
                <img
                  src="https://www.factourati.com/files_3254075-1761082431431-image.png"
                  alt="Logo Factourati"
                  width="40"
                  height="40"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">Factourati</p>
                <p className="text-xs text-gray-500">ERP Morocco</p>
              </div>
            </Link>

            <nav className="hidden items-center space-x-8 md:flex">
              {homeLinks.map((item) => (
                <a key={item.label} href={item.href} className="font-medium text-gray-800 hover:text-teal-600">
                  {item.label}
                </a>
              ))}
              <Link to="/blog" className="font-medium text-teal-700">
                Blog
              </Link>
              <Link to="/login" className="font-medium text-gray-800 hover:text-teal-600">
                Connexion
              </Link>
            </nav>

            <Link
              to="/login?mode=register"
              className="rounded-lg bg-gradient-to-r from-teal-600 to-blue-600 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:from-teal-700 hover:to-blue-700 hover:shadow-xl sm:px-6"
            >
              Essai 1 mois gratuit
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">{children}</main>

      <footer id="contact" className="mt-auto bg-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-4 flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-black-200 to-red-600 shadow-lg">
                  <img
                    src="https://www.factourati.com/files_3254075-1761082431431-image.png"
                    alt="Logo Factourati"
                    width="32"
                    height="32"
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Factourati</h3>
                  <p className="text-sm text-gray-400">ERP Morocco</p>
                </div>
              </div>
              <p className="mb-6 max-w-md text-gray-400">
                La solution marocaine qui reunit devis, factures, stock, fournisseurs, projets et equipe pour travailler plus vite et plus sereinement.
              </p>
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Phone className="h-4 w-4" />
                  <span>+212 666 736 446</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span>contact@Factourati.com</span>
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-semibold text-white">Suivez-nous</h4>
                <div className="flex items-center space-x-4">
                  <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 transition-colors hover:bg-blue-600" aria-label="Facebook">
                    <Facebook className="h-5 w-5" />
                  </a>
                  <a href="https://www.instagram.com/factourati/" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 transition-colors hover:bg-pink-600" aria-label="Instagram">
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a href="https://x.com/FacTourati" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 transition-colors hover:bg-sky-500" aria-label="Twitter/X">
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a href="https://www.linkedin.com/company/factourati" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 transition-colors hover:bg-blue-700" aria-label="LinkedIn">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 transition-colors hover:bg-red-600" aria-label="YouTube">
                    <Youtube className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Liens rapides</h4>
              <ul className="space-y-2 text-gray-400">
                {homeLinks.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="transition-colors hover:text-white">
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link to="/blog" className="transition-colors hover:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="transition-colors hover:text-white">
                    Connexion
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Contact</h4>
              <div className="space-y-3 text-gray-400">
                <div className="flex items-start space-x-2">
                  <MapPin className="mt-1 h-4 w-4 flex-shrink-0" />
                  <span>Sale, Maroc</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>contact@Factourati.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>+212 666 736 446</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Factourati. Tous droits reserves. Made in Morocco</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
