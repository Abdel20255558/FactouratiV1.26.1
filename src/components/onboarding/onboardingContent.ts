export type OnboardingStepKey = 'client' | 'product' | 'supplier' | 'invoice';

export const ONBOARDING_STEPS: Array<{
  key: OnboardingStepKey;
  title: string;
  shortTitle: string;
  description: string;
  actionLabel: string;
}> = [
  {
    key: 'client',
    title: 'Premier client',
    shortTitle: 'Client',
    description: 'Ajoutez un premier client pour preparer votre espace de facturation.',
    actionLabel: 'Creer mon premier client',
  },
  {
    key: 'product',
    title: 'Premier produit',
    shortTitle: 'Produit',
    description: 'Ajoutez un produit ou un service simple pour votre premiere facture.',
    actionLabel: 'Creer mon premier produit',
  },
  {
    key: 'supplier',
    title: 'Premier fournisseur',
    shortTitle: 'Fournisseur',
    description: 'Ajoutez un fournisseur pour structurer votre activite des le depart.',
    actionLabel: 'Creer mon premier fournisseur',
  },
  {
    key: 'invoice',
    title: 'Premiere facture',
    shortTitle: 'Facture',
    description: 'Creez votre premiere facture en utilisant les donnees deja ajoutees.',
    actionLabel: 'Creer ma premiere facture',
  },
];

export const ONBOARDING_TEXT = {
  title: 'Bienvenue sur Factourati',
  subtitle: 'Configurons votre activite en quelques etapes simples. En moins de 3 minutes, vous pourrez emettre votre premiere facture.',
  skipLabel: 'Passer pour le moment',
  nextLabel: 'Suivant',
  backLabel: 'Retour',
  continueLabel: 'Continuer',
  relaunchLabel: "Relancer l'onboarding",
  dashboardCardTitle: 'Terminez votre configuration',
  dashboardCardDescription: 'Quelques etapes rapides suffisent pour rendre votre espace pleinement operationnel.',
  completedTitle: 'Bravo, votre espace Factourati est pret',
  completedDescription: 'Votre premier parcours est termine. Vous pouvez maintenant facturer, creer un devis ou enrichir votre base clients.',
  completedActions: {
    invoices: 'Voir mes factures',
    quote: 'Creer un devis',
    client: 'Ajouter un autre client',
    dashboard: 'Aller au dashboard',
  },
  savedMessage: 'Etape enregistree avec succes.',
  skippedMessage: "L'onboarding est masque pour le moment. Vous pourrez le relancer a tout moment.",
};

export const ONBOARDING_PLACEHOLDERS = {
  client: {
    name: 'Client Demo',
    ice: '001234567000089',
    phone: '+212 6 61 23 45 67',
    email: 'client@demo.ma',
    address: 'Casablanca, Maroc',
  },
  product: {
    name: 'Service de gestion',
    description: 'Accompagnement et suivi administratif',
    purchasePrice: '800',
    price: '1500',
    initialStock: '10',
  },
  supplier: {
    name: 'Fournisseur Demo',
    phone: '+212 6 72 34 56 78',
    email: 'contact@fournisseur-demo.ma',
    address: 'Rabat, Maroc',
  },
};

export const ONBOARDING_PRODUCT_UNITS = [
  'unite',
  'Kg',
  'Litre',
  'Boite',
  'Paquet',
  'Heure',
  'Jour',
] as const;

export const ONBOARDING_PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Selectionner un mode de paiement' },
  { value: 'virement', label: 'Virement' },
  { value: 'espece', label: 'Espece' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'effet', label: 'Effet' },
] as const;
