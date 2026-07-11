import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Check, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  fetchPlanPrices,
  findPrice,
  formatMoney,
  PROVIDER_LABEL,
  PROVIDERS_FOR_CURRENCY,
} from '../lib/pricing';
import type { BillingInterval, Currency, PaymentProviderKey, PlanPrice } from '../types';

const planDetails: Record<string, { name: string; credits: number }> = {
  pro: { name: 'Pro', credits: 2500 },
  premier: { name: 'Premier', credits: 10000 },
};

export function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const planId = searchParams.get('plan') ?? '';
  const interval: BillingInterval = searchParams.get('interval') === 'year' ? 'year' : 'month';
  const currencyParam = (searchParams.get('currency') ?? 'UAH').toUpperCase();
  const currency: Currency = ['UAH', 'USD', 'EUR'].includes(currencyParam)
    ? (currencyParam as Currency)
    : 'UAH';

  const availableProviders = PROVIDERS_FOR_CURRENCY[currency];
  const [provider, setProvider] = useState<PaymentProviderKey>(availableProviders[0]);
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const plan = planDetails[planId];
  const priceRow = findPrice(prices, planId, currency, interval);

  useEffect(() => {
    fetchPlanPrices().then(setPrices);
  }, []);

  useEffect(() => {
    // Currency comes from the URL; keep the selected provider valid for it.
    if (!availableProviders.includes(provider)) {
      setProvider(availableProviders[0]);
    }
  }, [availableProviders, provider]);

  useEffect(() => {
    // Handle return from the payment gateway
    const status = searchParams.get('subscription');
    if (status === 'success') {
      navigate('/profile?success=true', { replace: true });
    } else if (status === 'cancelled') {
      setError('Оплату скасовано. Ви можете спробувати знову.');
    }
  }, [searchParams, navigate]);

  if (!plan) {
    return (
      <div className="min-h-screen bg-neutral-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-100 mb-4">План не знайдено</p>
          <button
            onClick={() => navigate('/pricing')}
            className="text-primary-500 hover:underline"
          >
            Повернутися до тарифів
          </button>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-payment', {
        body: {
          provider,
          planKey: planId,
          currency,
          interval,
        }
      });

      if (fnError) throw fnError;

      if (data?.error) {
        throw new Error(data.error.message);
      }

      if (data?.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        throw new Error('Не вдалося створити сесію оплати');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Помилка обробки платежу. Спробуйте пізніше.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 text-neutral-100 hover:text-neutral-50 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад до тарифів
        </button>

        <div className="bg-neutral-700/50 rounded-2xl border border-white/10 p-8">
          {/* Order Summary */}
          <h2 className="text-2xl font-bold text-neutral-50 mb-6">Підтвердження замовлення</h2>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-3 border-b border-white/10">
              <span className="text-neutral-100">План</span>
              <span className="text-neutral-50 font-semibold">{plan.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-white/10">
              <span className="text-neutral-100">Кредити</span>
              <span className="text-neutral-50">{plan.credits.toLocaleString()} / місяць</span>
            </div>
            <div className="flex justify-between py-3 border-b border-white/10">
              <span className="text-neutral-100">Період</span>
              <span className="text-neutral-50">{interval === 'year' ? 'Щорічно' : 'Щомісяця'}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-white/10">
              <span className="text-neutral-100">Валюта</span>
              <span className="text-neutral-50">{currency}</span>
            </div>
            {interval === 'year' && (
              <div className="flex justify-between py-3 border-b border-white/10 text-success">
                <span>Знижка</span>
                <span>-20%</span>
              </div>
            )}
            <div className="flex justify-between py-4">
              <span className="text-xl text-neutral-50 font-bold">Разом</span>
              <span className="text-xl text-neutral-50 font-bold">
                {priceRow ? formatMoney(priceRow.amount_minor, currency) : '—'}
                {interval === 'year' ? '/рік' : '/місяць'}
              </span>
            </div>
          </div>

          {/* Payment method */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-neutral-50 mb-3">Спосіб оплати:</h3>
            <div className="flex flex-wrap gap-3">
              {availableProviders.map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    provider === p
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {PROVIDER_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="mb-8 p-4 bg-neutral-700/50 rounded-xl">
            <h3 className="text-sm font-semibold text-neutral-50 mb-3">Що включено:</h3>
            <ul className="space-y-2">
              {[
                `${plan.credits.toLocaleString()} кредитів на місяць`,
                'Комерційне використання',
                'Без водяного знаку',
                'Висока якість аудіо',
                'Пріоритетна підтримка'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-neutral-100">
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error/20 border border-error/30 rounded-xl">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white font-semibold text-lg shadow-glow-orange hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Перенаправлення до оплати...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Оплатити через {PROVIDER_LABEL[provider]}
                <ExternalLink className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <p className="mt-4 text-xs text-neutral-300 text-center">
            Ви будете перенаправлені на захищену сторінку платіжної системи для завершення оплати.
            Підтримуються Visa, Mastercard, Apple Pay, Google Pay.
          </p>

          {/* Security badges */}
          <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-neutral-300">
              <Lock className="w-4 h-4" />
              <span className="text-xs">SSL захист</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <Check className="w-4 h-4" />
              <span className="text-xs">PCI DSS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
