import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Clock, FileText, Loader2, Upload, XCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Merchant } from '../types';

// Minimal-KYC onboarding: name, email, country and ONE document are enough
// to submit an application. Review happens asynchronously (status: pending).
const DOCUMENT_TYPES = [
  { value: 'identity', label: 'Документ, що посвідчує особу' },
  { value: 'tax_id', label: 'ІПН / РНОКПП' },
  { value: 'company_registration', label: 'Виписка з ЄДР (для ФОП/юросіб)' },
];

const STATUS_VIEW = {
  pending: { icon: Clock, color: 'text-warning', label: 'На розгляді' },
  approved: { icon: Check, color: 'text-success', label: 'Підтверджено' },
  rejected: { icon: XCircle, color: 'text-error', label: 'Відхилено' },
} as const;

export function MerchantRegisterPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);

  const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [country, setCountry] = useState('Україна');
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0].value);
  const [docFile, setDocFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setContactEmail((prev) => prev || user.email);

    supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setMerchant((data as Merchant) ?? null);
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

  const handleSubmit = async () => {
    if (!user) return;
    const trimmedName = legalName.trim();
    const trimmedEmail = contactEmail.trim();

    if (!trimmedName || !trimmedEmail || !country.trim()) {
      setError('Заповніть назву, email та країну');
      return;
    }
    if (!docFile) {
      setError('Додайте один документ — цього достатньо для заявки');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data: created, error: insertError } = await supabase
        .from('merchants')
        .insert({
          owner_user_id: user.id,
          legal_name: trimmedName,
          contact_email: trimmedEmail,
          country: country.trim(),
        })
        .select()
        .maybeSingle();

      if (insertError) throw insertError;
      if (!created) throw new Error('Не вдалося створити заявку мерчанта');

      const safeName = docFile.name.replace(/[^\w.-]+/g, '_');
      const filePath = `${user.id}/${created.id}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('merchant-docs')
        .upload(filePath, docFile);
      if (uploadError) throw uploadError;

      const { error: docError } = await supabase.from('merchant_documents').insert({
        merchant_id: created.id,
        type: docType,
        file_path: filePath,
      });
      if (docError) throw docError;

      setMerchant(created as Merchant);
    } catch (err: any) {
      console.error('Merchant registration error:', err);
      setError(err.message || 'Не вдалося надіслати заявку. Спробуйте пізніше.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  // Existing application → status card
  if (merchant) {
    const view = STATUS_VIEW[merchant.status];
    const StatusIcon = view.icon;
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 pb-12">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-neutral-700/50 rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-primary-500/20 flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-50 mb-2">{merchant.legal_name}</h1>
            <div className={`flex items-center justify-center gap-2 mb-4 ${view.color}`}>
              <StatusIcon className="w-5 h-5" />
              <span className="font-semibold">{view.label}</span>
            </div>
            {merchant.status === 'pending' && (
              <p className="text-neutral-100 text-sm">
                Заявку отримано. Ми перевіримо документи та повідомимо вас на {merchant.contact_email}.
              </p>
            )}
            {merchant.status === 'rejected' && merchant.review_note && (
              <p className="text-neutral-100 text-sm">Причина: {merchant.review_note}</p>
            )}
            {merchant.status === 'approved' && (
              <p className="text-neutral-100 text-sm">
                Вітаємо! Ваш мерчант-акаунт активний. Налаштування платіжних систем — у профілі.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-12">
      <div className="max-w-xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-50">Стати мерчантом</h1>
          <p className="text-neutral-100 mt-2">
            Мінімум документів: назва, контакти та один документ — і заявку прийнято.
          </p>
        </div>

        <div className="bg-neutral-700/50 rounded-2xl border border-white/10 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-100 mb-2">
              Назва (ПІБ або юридична назва)
            </label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="ФОП Шевченко Т.Г."
              className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-100 mb-2">
              Контактний email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-100 mb-2">Країна</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-50 placeholder:text-neutral-300 focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-100 mb-2">Тип документа</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-neutral-700 border border-neutral-500 rounded-xl px-4 py-3 text-neutral-50 focus:outline-none focus:border-primary-500"
            >
              {DOCUMENT_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-100 mb-2">Документ (PDF або фото)</label>
            <label className="flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-neutral-500 text-neutral-100 hover:border-neutral-300 transition-colors cursor-pointer">
              {docFile ? (
                <>
                  <FileText className="w-5 h-5 text-primary-500" />
                  <span className="text-sm">{docFile.name}</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Обрати файл</span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold shadow-glow-orange hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Надсилання...
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5" />
                Надіслати заявку
              </>
            )}
          </button>

          <p className="text-xs text-neutral-300 text-center">
            Документи зберігаються у приватному сховищі та доступні лише вам і команді перевірки.
          </p>
        </div>
      </div>
    </div>
  );
}
