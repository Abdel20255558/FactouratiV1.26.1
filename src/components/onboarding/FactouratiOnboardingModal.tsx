import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Package,
  Receipt,
  Sparkles,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData, type Client } from '../../contexts/DataContext';
import { useSupplier } from '../../contexts/SupplierContext';
import { useLicense } from '../../contexts/LicenseContext';
import { useFactouratiOnboarding } from '../../hooks/useFactouratiOnboarding';
import {
  ONBOARDING_PAYMENT_METHOD_OPTIONS,
  ONBOARDING_PLACEHOLDERS,
  ONBOARDING_PRODUCT_UNITS,
  ONBOARDING_STEPS,
  ONBOARDING_TEXT,
  type OnboardingStepKey,
} from './onboardingContent';

interface FactouratiOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type InvoicePaymentMethod = '' | 'virement' | 'espece' | 'cheque' | 'effet';

const STEP_ICONS: Record<OnboardingStepKey, typeof Users> = {
  client: Users,
  product: Package,
  supplier: Truck,
  invoice: Receipt,
};

const todayValue = () => new Date().toISOString().split('T')[0];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function inputClassName(hasError = false) {
  return `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
    hasError
      ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-400 dark:border-red-700 dark:bg-red-950/30 dark:text-red-100'
      : 'border-slate-200 bg-white text-slate-900 focus:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
  }`;
}

function CompletionState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
        <div>
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">{title}</p>
          <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-300">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function FactouratiOnboardingModal({
  isOpen,
  onClose,
}: FactouratiOnboardingModalProps) {
  const navigate = useNavigate();
  const { addClient, addProduct, addInvoice, clients, products } = useData();
  const { addSupplier, suppliers } = useSupplier();
  const { checkLimit } = useLicense();
  const onboarding = useFactouratiOnboarding();

  const [stepIndex, setStepIndex] = React.useState(0);
  const [showCompletionScreen, setShowCompletionScreen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [savedMessage, setSavedMessage] = React.useState('');
  const [recentlyCreated, setRecentlyCreated] = React.useState<Record<OnboardingStepKey, boolean>>({
    client: false,
    product: false,
    supplier: false,
    invoice: false,
  });

  const [clientForm, setClientForm] = React.useState({
    name: '',
    ice: '',
    phone: '',
    email: '',
    address: '',
  });

  const [productForm, setProductForm] = React.useState({
    name: '',
    description: '',
    purchasePrice: '',
    price: '',
    vatRate: '20',
    initialStock: '',
    unit: 'unite',
  });

  const [supplierForm, setSupplierForm] = React.useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [invoiceForm, setInvoiceForm] = React.useState<{
    clientId: string;
    productId: string;
    quantity: number;
    date: string;
    paymentMethod: InvoicePaymentMethod;
  }>({
    clientId: '',
    productId: '',
    quantity: 1,
    date: todayValue(),
    paymentMethod: '',
  });

  React.useEffect(() => {
    if (!isOpen) return;

    setErrorMessage('');
    setSavedMessage('');
    setRecentlyCreated({
      client: false,
      product: false,
      supplier: false,
      invoice: false,
    });
    setShowCompletionScreen(onboarding.isCompleted);
    setStepIndex(onboarding.currentStepIndex >= onboarding.totalSteps ? onboarding.totalSteps - 1 : onboarding.currentStepIndex);
  }, [isOpen, onboarding.currentStepIndex, onboarding.isCompleted, onboarding.totalSteps]);

  React.useEffect(() => {
    if (!isOpen) return;

    setInvoiceForm((prev) => ({
      ...prev,
      clientId: prev.clientId || onboarding.preferredIds.clientId,
      productId: prev.productId || onboarding.preferredIds.productId,
    }));
  }, [isOpen, onboarding.preferredIds.clientId, onboarding.preferredIds.productId]);

  const localCompletion = React.useMemo(
    () => ({
      client: onboarding.completion.client || recentlyCreated.client,
      product: onboarding.completion.product || recentlyCreated.product,
      supplier: onboarding.completion.supplier || recentlyCreated.supplier,
      invoice: onboarding.completion.invoice || recentlyCreated.invoice,
    }),
    [onboarding.completion, recentlyCreated],
  );

  const activeStep = ONBOARDING_STEPS[stepIndex];
  const stepNumber = Math.min(stepIndex + 1, onboarding.totalSteps);

  const selectedClient =
    clients.find((client) => client.id === invoiceForm.clientId) ||
    (recentlyCreated.client && invoiceForm.clientId
      ? {
          id: invoiceForm.clientId,
          name: clientForm.name,
          ice: clientForm.ice,
          address: clientForm.address,
          phone: clientForm.phone,
          email: clientForm.email,
          createdAt: new Date().toISOString(),
          entrepriseId: '',
        }
      : undefined);

  const selectedProduct = products.find((product) => product.id === invoiceForm.productId);
  const selectedProductName = selectedProduct?.name || productForm.name;
  const selectedProductUnitPrice = selectedProduct?.salePrice || Number(productForm.price || 0);
  const selectedProductVatRate =
    typeof selectedProduct?.vatRate === 'number'
      ? selectedProduct.vatRate
      : Number(productForm.vatRate || 0);

  const invoiceSubtotal = selectedProductUnitPrice * Number(invoiceForm.quantity || 0);
  const invoiceVatAmount = invoiceSubtotal * (selectedProductVatRate / 100);
  const invoiceTotal = invoiceSubtotal + invoiceVatAmount;

  const moveToNextStep = () => {
    if (stepIndex >= onboarding.totalSteps - 1) {
      setShowCompletionScreen(true);
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, onboarding.totalSteps - 1));
    setErrorMessage('');
  };

  const moveToPreviousStep = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
    setSavedMessage('');
    setErrorMessage('');
  };

  const handleSkip = async () => {
    await onboarding.dismissOnboarding();
    onClose();
  };

  const handleClose = async () => {
    if (showCompletionScreen || onboarding.isCompleted) {
      onClose();
      return;
    }

    await handleSkip();
  };

  const handleCreateClient = async () => {
    if (!clientForm.name.trim()) {
      setErrorMessage('Le nom du client est obligatoire.');
      return;
    }

    if (!clientForm.ice.trim()) {
      setErrorMessage("L'ICE du client est obligatoire.");
      return;
    }

    if (!checkLimit('clients')) {
      setErrorMessage("La limite de clients de votre offre actuelle est atteinte.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const clientId = await addClient({
        name: clientForm.name.trim(),
        ice: clientForm.ice.trim(),
        address: clientForm.address.trim(),
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim(),
      });

      if (!clientId) {
        setErrorMessage("Impossible de creer le client pour le moment.");
        return;
      }

      await onboarding.saveOnboardingData({
        onboardingClientId: clientId,
      });

      setRecentlyCreated((prev) => ({ ...prev, client: true }));
      setInvoiceForm((prev) => ({ ...prev, clientId }));
      setSavedMessage(ONBOARDING_TEXT.savedMessage);
      moveToNextStep();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!productForm.name.trim()) {
      setErrorMessage('Le nom du produit est obligatoire.');
      return;
    }

    if (!checkLimit('products')) {
      setErrorMessage("La limite de produits de votre offre actuelle est atteinte.");
      return;
    }

    const purchasePrice = Number(productForm.purchasePrice || 0);
    const salePrice = Number(productForm.price || 0);
    const vatRate = Number(productForm.vatRate || 0);
    const initialStock = Number(productForm.initialStock || 0);

    if (productForm.initialStock === '') {
      setErrorMessage('Le stock initial est obligatoire.');
      return;
    }

    if (purchasePrice < 0) {
      setErrorMessage("Le prix d'achat ne peut pas etre negatif.");
      return;
    }

    if (salePrice <= 0) {
      setErrorMessage('Le prix doit etre superieur a 0.');
      return;
    }

    if (initialStock < 0) {
      setErrorMessage('Le stock initial ne peut pas etre negatif.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const productId = await addProduct({
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        category: 'Services',
        purchasePrice,
        salePrice,
        vatRate,
        unit: productForm.unit,
        initialStock,
        stock: initialStock,
        minStock: 0,
        status: 'active',
        sku: '',
      });

      if (!productId) {
        setErrorMessage("Impossible de creer le produit pour le moment.");
        return;
      }

      await onboarding.saveOnboardingData({
        onboardingProductId: productId,
      });

      setRecentlyCreated((prev) => ({ ...prev, product: true }));
      setInvoiceForm((prev) => ({ ...prev, productId }));
      setSavedMessage(ONBOARDING_TEXT.savedMessage);
      moveToNextStep();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.name.trim()) {
      setErrorMessage('Le nom du fournisseur est obligatoire.');
      return;
    }

    if (!checkLimit('suppliers')) {
      setErrorMessage("La limite de fournisseurs de votre offre actuelle est atteinte.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const supplierId = await addSupplier({
        name: supplierForm.name.trim(),
        ice: '',
        address: supplierForm.address.trim(),
        phone: supplierForm.phone.trim(),
        email: supplierForm.email.trim(),
        contactPerson: '',
        paymentTerms: 30,
        status: 'active',
      });

      if (!supplierId) {
        setErrorMessage("Impossible de creer le fournisseur pour le moment.");
        return;
      }

      await onboarding.saveOnboardingData({
        onboardingSupplierId: supplierId,
      });

      setRecentlyCreated((prev) => ({ ...prev, supplier: true }));
      setSavedMessage(ONBOARDING_TEXT.savedMessage);
      moveToNextStep();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.clientId) {
      setErrorMessage('Selectionnez un client pour la facture.');
      return;
    }

    if (!invoiceForm.productId) {
      setErrorMessage('Selectionnez un produit pour la facture.');
      return;
    }

    if (invoiceForm.quantity <= 0) {
      setErrorMessage('La quantite doit etre superieure a 0.');
      return;
    }

    if (!checkLimit('invoices')) {
      setErrorMessage("La limite de factures de votre offre actuelle est atteinte.");
      return;
    }

    const invoiceClient: Client | undefined =
      clients.find((client) => client.id === invoiceForm.clientId) || selectedClient;

    if (!invoiceClient || !selectedProductName || selectedProductUnitPrice <= 0) {
      setErrorMessage("Les donnees de la facture sont incompletes.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const invoiceId = await addInvoice({
        clientId: invoiceForm.clientId,
        client: invoiceClient,
        date: invoiceForm.date,
        dueDate: invoiceForm.date,
        items: [
          {
            id: `${invoiceForm.productId}-1`,
            description: selectedProductName,
            quantity: invoiceForm.quantity,
            unitPrice: selectedProductUnitPrice,
            vatRate: selectedProductVatRate,
            total: invoiceSubtotal,
            unit: selectedProduct?.unit || 'unite',
          },
        ],
        subtotal: invoiceSubtotal,
        totalVat: invoiceVatAmount,
        totalTTC: invoiceTotal,
        status: 'unpaid',
        paymentMethod: invoiceForm.paymentMethod || undefined,
      });

      if (!invoiceId) {
        setErrorMessage("Impossible de creer la facture pour le moment.");
        return;
      }

      await onboarding.completeOnboarding({
        onboardingClientId: invoiceForm.clientId,
        onboardingProductId: invoiceForm.productId,
        onboardingSupplierId: onboarding.preferredIds.supplierId,
        onboardingInvoiceId: invoiceId,
      });

      setRecentlyCreated((prev) => ({ ...prev, invoice: true }));
      setShowCompletionScreen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderClientStep = () => {
    if (localCompletion.client) {
      const existingClient = clients.find((client) => client.id === onboarding.preferredIds.clientId);

      return (
        <CompletionState
          title="Un client est deja en place"
          description={
            existingClient
              ? `Votre base contient deja le client "${existingClient.name}". Vous pouvez passer a l'etape suivante.`
              : 'Vous avez deja au moins un client dans votre espace. Vous pouvez continuer.'
          }
        />
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom du client">
          <input
            type="text"
            value={clientForm.name}
            onChange={(event) => setClientForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.client.name}
            className={inputClassName()}
          />
        </Field>

        <Field label="ICE du client">
          <input
            type="text"
            value={clientForm.ice}
            onChange={(event) => setClientForm((prev) => ({ ...prev, ice: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.client.ice}
            className={inputClassName()}
          />
        </Field>

        <Field label="Telephone">
          <input
            type="text"
            value={clientForm.phone}
            onChange={(event) => setClientForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.client.phone}
            className={inputClassName()}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={clientForm.email}
            onChange={(event) => setClientForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.client.email}
            className={inputClassName()}
          />
        </Field>

        <Field label="Adresse du client">
          <input
            type="text"
            value={clientForm.address}
            onChange={(event) => setClientForm((prev) => ({ ...prev, address: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.client.address}
            className={inputClassName()}
          />
        </Field>
      </div>
    );
  };

  const renderProductStep = () => {
    if (localCompletion.product) {
      const existingProduct = products.find((product) => product.id === onboarding.preferredIds.productId);

      return (
        <CompletionState
          title="Un produit est deja en place"
          description={
            existingProduct
              ? `Votre catalogue contient deja "${existingProduct.name}". Vous pouvez continuer vers le fournisseur.`
              : 'Vous avez deja au moins un produit ou service dans votre espace. Vous pouvez continuer.'
          }
        />
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom du produit">
          <input
            type="text"
            value={productForm.name}
            onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.product.name}
            className={inputClassName()}
          />
        </Field>

        <Field label="Prix d'achat (MAD)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={productForm.purchasePrice}
            onChange={(event) => setProductForm((prev) => ({ ...prev, purchasePrice: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.product.purchasePrice}
            className={inputClassName()}
          />
        </Field>

        <Field label="Prix de vente HT (MAD)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={productForm.price}
            onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.product.price}
            className={inputClassName()}
          />
        </Field>

        <Field label="Description courte">
          <input
            type="text"
            value={productForm.description}
            onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.product.description}
            className={inputClassName()}
          />
        </Field>

        <Field label="TVA (%)">
          <input
            type="number"
            min="0"
            step="1"
            value={productForm.vatRate}
            onChange={(event) => setProductForm((prev) => ({ ...prev, vatRate: event.target.value }))}
            className={inputClassName()}
          />
        </Field>

        <Field label="Stock initial *">
          <input
            type="number"
            min="0"
            step="1"
            value={productForm.initialStock}
            onChange={(event) => setProductForm((prev) => ({ ...prev, initialStock: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.product.initialStock}
            className={inputClassName()}
          />
        </Field>

        <Field label="Unite">
          <select
            value={productForm.unit}
            onChange={(event) => setProductForm((prev) => ({ ...prev, unit: event.target.value }))}
            className={inputClassName()}
          >
            {ONBOARDING_PRODUCT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </Field>
      </div>
    );
  };

  const renderSupplierStep = () => {
    if (localCompletion.supplier) {
      const existingSupplier = suppliers.find((supplier) => supplier.id === onboarding.preferredIds.supplierId);

      return (
        <CompletionState
          title="Un fournisseur est deja en place"
          description={
            existingSupplier
              ? `Votre base contient deja le fournisseur "${existingSupplier.name}". Vous pouvez terminer avec la facture.`
              : 'Vous avez deja au moins un fournisseur dans votre espace. Vous pouvez continuer.'
          }
        />
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom du fournisseur">
          <input
            type="text"
            value={supplierForm.name}
            onChange={(event) => setSupplierForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.supplier.name}
            className={inputClassName()}
          />
        </Field>

        <Field label="Telephone">
          <input
            type="text"
            value={supplierForm.phone}
            onChange={(event) => setSupplierForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.supplier.phone}
            className={inputClassName()}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={supplierForm.email}
            onChange={(event) => setSupplierForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.supplier.email}
            className={inputClassName()}
          />
        </Field>

        <Field label="Adresse">
          <input
            type="text"
            value={supplierForm.address}
            onChange={(event) => setSupplierForm((prev) => ({ ...prev, address: event.target.value }))}
            placeholder={ONBOARDING_PLACEHOLDERS.supplier.address}
            className={inputClassName()}
          />
        </Field>
      </div>
    );
  };

  const renderInvoiceStep = () => {
    if (localCompletion.invoice) {
      return (
        <CompletionState
          title="Une facture existe deja"
          description="Votre compte contient deja une premiere facture. Vous pouvez terminer ce parcours quand vous voulez."
        />
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Client">
            <select
              value={invoiceForm.clientId}
              onChange={(event) => setInvoiceForm((prev) => ({ ...prev, clientId: event.target.value }))}
              className={inputClassName()}
            >
              <option value="">Selectionner un client</option>
              {invoiceForm.clientId && !clients.some((client) => client.id === invoiceForm.clientId) && selectedClient ? (
                <option value={invoiceForm.clientId}>{selectedClient.name || 'Client cree'}</option>
              ) : null}
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Produit">
            <select
              value={invoiceForm.productId}
              onChange={(event) => setInvoiceForm((prev) => ({ ...prev, productId: event.target.value }))}
              className={inputClassName()}
            >
              <option value="">Selectionner un produit</option>
              {invoiceForm.productId && !products.some((product) => product.id === invoiceForm.productId) && selectedProductName ? (
                <option value={invoiceForm.productId}>{selectedProductName}</option>
              ) : null}
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Quantite">
            <input
              type="number"
              min="1"
              step="1"
              value={invoiceForm.quantity}
              onChange={(event) =>
                setInvoiceForm((prev) => ({
                  ...prev,
                  quantity: Math.max(1, Number(event.target.value || 1)),
                }))
              }
              className={inputClassName()}
            />
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={invoiceForm.date}
              onChange={(event) => setInvoiceForm((prev) => ({ ...prev, date: event.target.value }))}
              className={inputClassName()}
            />
          </Field>
        </div>

        <Field label="Mode de paiement">
          <select
            value={invoiceForm.paymentMethod}
            onChange={(event) =>
              setInvoiceForm((prev) => ({
                ...prev,
                paymentMethod: event.target.value as InvoicePaymentMethod,
              }))
            }
            className={inputClassName()}
          >
            {ONBOARDING_PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Apercu rapide
          </p>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 dark:text-slate-200 md:grid-cols-3">
            <div className="rounded-2xl bg-white px-4 py-3 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Produit</p>
              <p className="mt-1 font-semibold">{selectedProductName || '-'}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">TVA</p>
              <p className="mt-1 font-semibold">{selectedProductVatRate}%</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total TTC</p>
              <p className="mt-1 font-semibold">{invoiceTotal.toFixed(2)} MAD</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStepBody = () => {
    switch (activeStep.key) {
      case 'client':
        return renderClientStep();
      case 'product':
        return renderProductStep();
      case 'supplier':
        return renderSupplierStep();
      case 'invoice':
        return renderInvoiceStep();
      default:
        return null;
    }
  };

  const handlePrimaryAction = async () => {
    if (activeStep.key === 'client' && localCompletion.client) {
      moveToNextStep();
      return;
    }

    if (activeStep.key === 'product' && localCompletion.product) {
      moveToNextStep();
      return;
    }

    if (activeStep.key === 'supplier' && localCompletion.supplier) {
      moveToNextStep();
      return;
    }

    if (activeStep.key === 'invoice' && localCompletion.invoice) {
      setShowCompletionScreen(true);
      return;
    }

    if (activeStep.key === 'client') {
      await handleCreateClient();
      return;
    }

    if (activeStep.key === 'product') {
      await handleCreateProduct();
      return;
    }

    if (activeStep.key === 'supplier') {
      await handleCreateSupplier();
      return;
    }

    await handleCreateInvoice();
  };

  if (!isOpen || !onboarding.isEligible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 lg:grid-cols-[320px_minmax(0,1fr)]"
        >
          <aside className="bg-gradient-to-br from-teal-600 via-teal-700 to-blue-700 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="rounded-2xl bg-white/12 p-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                Setup rapide
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{ONBOARDING_TEXT.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/85">{ONBOARDING_TEXT.subtitle}</p>
            </div>

            <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center justify-between text-sm font-medium text-white">
                <span>Progression</span>
                <span>
                  {Math.min(stepNumber, onboarding.totalSteps)}/{onboarding.totalSteps}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{
                    width: `${((showCompletionScreen ? onboarding.totalSteps : stepNumber) / onboarding.totalSteps) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {onboarding.steps.map((step, index) => {
                const Icon = STEP_ICONS[step.key];
                const isCurrent = !showCompletionScreen && index === stepIndex;
                const isDone = localCompletion[step.key];

                return (
                  <div
                    key={step.key}
                    className={`rounded-2xl border px-4 py-3 transition ${
                      isCurrent ? 'border-white/40 bg-white/15' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                        {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {index + 1}. {step.shortTitle}
                        </p>
                        <p className="text-xs text-white/75">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="flex min-h-[720px] flex-col bg-white dark:bg-slate-950">
            {showCompletionScreen ? (
              <div className="flex h-full flex-col justify-between p-6 sm:p-8">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Configuration terminee
                  </div>
                  <h3 className="mt-5 text-3xl font-semibold text-slate-900 dark:text-white">
                    {ONBOARDING_TEXT.completedTitle}
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                    {ONBOARDING_TEXT.completedDescription}
                  </p>
                </div>

                <div className="mt-8 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/invoices');
                    }}
                    className="rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 px-5 py-4 text-left font-semibold text-white shadow-lg transition hover:from-teal-700 hover:to-blue-700"
                  >
                    {ONBOARDING_TEXT.completedActions.invoices}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/quotes/create');
                    }}
                    className="rounded-2xl border border-slate-200 px-5 py-4 text-left font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    {ONBOARDING_TEXT.completedActions.quote}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/clients');
                    }}
                    className="rounded-2xl border border-slate-200 px-5 py-4 text-left font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    {ONBOARDING_TEXT.completedActions.client}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/dashboard');
                    }}
                    className="rounded-2xl border border-slate-200 px-5 py-4 text-left font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
                  >
                    {ONBOARDING_TEXT.completedActions.dashboard}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800 sm:px-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-600 dark:text-teal-300">
                        Etape {stepNumber}/{onboarding.totalSteps}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                        {activeStep.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {activeStep.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {ONBOARDING_TEXT.skipLabel}
                    </button>
                  </div>
                </div>

                <div className="flex-1 px-6 py-6 sm:px-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep.key}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {renderStepBody()}

                      {savedMessage ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                          {savedMessage}
                        </div>
                      ) : null}

                      {errorMessage ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                          {errorMessage}
                        </div>
                      ) : null}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="border-t border-slate-200 px-6 py-5 dark:border-slate-800 sm:px-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={moveToPreviousStep}
                      disabled={stepIndex === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {ONBOARDING_TEXT.backLabel}
                    </button>

                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-teal-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? 'Enregistrement...' : activeStep.actionLabel}
                      {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
