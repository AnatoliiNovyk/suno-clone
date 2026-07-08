import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CURRENCIES, fetchPlanPrices, findPrice, formatMoney } from '../lib/pricing';
import type { BillingInterval, Currency, PlanPrice } from '../types';

// Marketing copy stays local; money comes from the plan_prices table.
const plans = [
  {
    id: 'free',
    name: 'Free',
    icon: Sparkles,
    credits: 50,
    creditsInterval: 'день',
    features: [
      '50 кредитів на день',
      'Базова генерація музики',
      'Стандартна якість',
      'Водяний знак',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    credits: 2500,
    creditsInterval: 'місяць',
    recommended: true,
    features: [
      '2500 кредитів на місяць',
      'Розширена генерація',
      'Висока якість аудіо',
      'Без водяного знаку',
      'Комерційне використання',
      'Пріоритетна черга',
    ],
  },
  {
    id: 'premier',
    name: 'Premier',
    icon: Crown,
    credits: 10000,
    creditsInterval: 'місяць',
    features: [
      '10000 кредитів на місяць',
      'Повний доступ до функцій',
      'Найвища якість аудіо',
      'Без водяного знаку',
      'Комерційне використання',
      'Пріоритетна черга',
      'API доступ',
      'Персональна підтримка',
    ],
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [currency, setCurrency] = useState<Currency>('UAH');
  const [prices, setPrices] = useState<PlanPrice[]>([]);

  useEffect(() => {
    fetchPlanPrices().then(setPrices);
  }, []);

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      navigate('/signup');
    } else {
      navigate(`/payment?plan=${planId}&interval=${billingInterval}&currency=${currency}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-50 mb-4">
            Обери свій план
          </h1>
          <p className="text-lg text-neutral-100 max-w-2xl mx-auto">
            Почни безкоштовно або отримай більше можливостей з Pro та Premier планами
          </p>
        </div>

        {/* Billing + Currency Toggles */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              billingInterval === 'month'
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-700 text-neutral-100'
            }`}
          >
            Щомісяця
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              billingInterval === 'year'
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-700 text-neutral-100'
            }`}
          >
            Щорічно
            <span className="ml-2 text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
              -20%
            </span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mb-12">
          <span className="text-sm text-neutral-300 mr-1">Валюта:</span>
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                currency === c
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-100 border border-white/10 hover:border-white/20'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const priceRow = findPrice(prices, plan.id, currency, billingInterval);
            const isFree = plan.id === 'free';
            const isCurrentPlan = user?.plan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative bg-neutral-700/50 rounded-2xl border p-6 lg:p-8 ${
                  plan.recommended
                    ? 'border-primary-500 scale-105 shadow-glow-orange'
                    : 'border-white/10'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                      Рекомендовано
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-50">{plan.name}</h3>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-neutral-50">
                    {isFree ? formatMoney(0, currency) : priceRow ? formatMoney(priceRow.amount_minor, currency) : '—'}
                  </span>
                  {!isFree && (
                    <span className="text-neutral-100">
                      /{billingInterval === 'year' ? 'рік' : 'місяць'}
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  <span className="text-sm text-neutral-100">
                    {plan.credits.toLocaleString()} кредитів / {plan.creditsInterval}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-neutral-100">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 rounded-full font-semibold transition-all ${
                    isCurrentPlan
                      ? 'bg-neutral-500 text-neutral-300 cursor-not-allowed'
                      : plan.recommended
                      ? 'bg-gradient-to-r from-[#FF6B35] via-primary-500 to-primary-700 text-white shadow-glow-orange hover:brightness-110'
                      : 'bg-neutral-700 text-neutral-50 border border-white/15 hover:bg-neutral-700/80'
                  }`}
                >
                  {isCurrentPlan ? 'Поточний план' : isFree ? 'Почати безкоштовно' : 'Обрати план'}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-neutral-50 text-center mb-8">
            Часті питання
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Що таке кредити?',
                a: 'Кредити - це внутрішня валюта для генерації музики. Одна генерація коштує 10 кредитів.'
              },
              {
                q: 'В якій валюті я можу платити?',
                a: 'Підтримуються гривня (₴), долар ($) та євро (€). Оплата в гривні проходить через LiqPay, у доларах та євро — через Stripe або LiqPay.'
              },
              {
                q: 'Чи можу я використовувати музику комерційно?',
                a: 'Так, з планами Pro та Premier ви отримуєте права на комерційне використання.'
              },
              {
                q: 'Чи можу я скасувати підписку?',
                a: 'Так, ви можете скасувати підписку в будь-який момент. Доступ збережеться до кінця оплаченого періоду.'
              }
            ].map((faq, index) => (
              <div key={index} className="bg-neutral-700/50 rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-neutral-50 mb-2">{faq.q}</h3>
                <p className="text-neutral-100">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
