import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { rpcErrorMessage } from '../../lib/adminErrors';
import { CURRENCIES, CURRENCY_SYMBOL } from '../../lib/pricing';
import type { BillingInterval, Currency } from '../../types';

const INTERVALS: BillingInterval[] = ['month', 'year'];

interface PlanRow {
  key: string;
  name: string;
  monthly_credits: number;
  active: boolean;
}

// Editable form state — prices kept as major-unit strings for the inputs.
interface PlanForm {
  name: string;
  monthly_credits: string;
  active: boolean;
  prices: Record<string, string>; // key `${currency}_${interval}` → major amount
}

function priceKey(currency: Currency, interval: BillingInterval): string {
  return `${currency}_${interval}`;
}

function minorToMajorInput(amountMinor: number): string {
  const major = amountMinor / 100;
  return Number.isInteger(major) ? String(major) : major.toFixed(2);
}

export function AdminPricingPage() {
  const [forms, setForms] = useState<Record<string, PlanForm>>({});
  const [planOrder, setPlanOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [plansRes, pricesRes] = await Promise.all([
      supabase.from('plans').select('key,name,monthly_credits,active').order('key'),
      supabase.from('plan_prices').select('plan_key,currency,interval,amount_minor'),
    ]);

    if (plansRes.error) {
      setError(plansRes.error.message);
      setLoading(false);
      return;
    }

    const plans = (plansRes.data ?? []) as PlanRow[];
    const prices = (pricesRes.data ?? []) as {
      plan_key: string;
      currency: Currency;
      interval: BillingInterval;
      amount_minor: number;
    }[];

    const next: Record<string, PlanForm> = {};
    for (const plan of plans) {
      const priceMap: Record<string, string> = {};
      for (const c of CURRENCIES) {
        for (const i of INTERVALS) {
          priceMap[priceKey(c, i)] = '';
        }
      }
      for (const p of prices.filter((p) => p.plan_key === plan.key)) {
        priceMap[priceKey(p.currency, p.interval)] = minorToMajorInput(p.amount_minor);
      }
      next[plan.key] = {
        name: plan.name,
        monthly_credits: String(plan.monthly_credits),
        active: plan.active,
        prices: priceMap,
      };
    }

    setForms(next);
    setPlanOrder(plans.map((p) => p.key));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (planKey: string, patch: Partial<PlanForm>) => {
    setForms((prev) => ({ ...prev, [planKey]: { ...prev[planKey], ...patch } }));
    setSavedKey(null);
  };

  const updatePrice = (planKey: string, pk: string, value: string) => {
    setForms((prev) => ({
      ...prev,
      [planKey]: { ...prev[planKey], prices: { ...prev[planKey].prices, [pk]: value } },
    }));
    setSavedKey(null);
  };

  const isFormValid = (form: PlanForm): boolean => {
    if (!form.name.trim()) return false;
    const credits = Number(form.monthly_credits);
    if (!Number.isInteger(credits) || credits < 0) return false;
    for (const v of Object.values(form.prices)) {
      if (v.trim() === '') continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return false;
    }
    return true;
  };

  const save = async (planKey: string) => {
    const form = forms[planKey];
    if (!form || !isFormValid(form)) return;

    setSaveError((prev) => ({ ...prev, [planKey]: '' }));
    setSavingKey(planKey);
    try {
      const { error: planError } = await supabase
        .from('plans')
        .update({
          name: form.name.trim(),
          monthly_credits: Number(form.monthly_credits),
          active: form.active,
        })
        .eq('key', planKey);
      if (planError) throw planError;

      const priceRows: {
        plan_key: string;
        currency: Currency;
        interval: BillingInterval;
        amount_minor: number;
      }[] = [];
      for (const c of CURRENCIES) {
        for (const i of INTERVALS) {
          const raw = form.prices[priceKey(c, i)];
          if (raw.trim() === '') continue;
          priceRows.push({
            plan_key: planKey,
            currency: c,
            interval: i,
            amount_minor: Math.round(Number(raw) * 100),
          });
        }
      }
      if (priceRows.length > 0) {
        const { error: priceError } = await supabase
          .from('plan_prices')
          .upsert(priceRows, { onConflict: 'plan_key,currency,interval' });
        if (priceError) throw priceError;
      }

      setSavedKey(planKey);
    } catch (err) {
      setSaveError((prev) => ({ ...prev, [planKey]: rpcErrorMessage(err) }));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-error">Не вдалося завантажити тарифи: {error}</p>;
  }

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-bold text-neutral-50 mb-2">Тарифи та ціни</h1>
      <p className="text-sm text-neutral-300 mb-6">
        Ціни зберігаються у фіксованих сумах на місяць/рік. Порожнє поле — ціна не задана
        для цієї комбінації.
      </p>

      <div className="space-y-6">
        {planOrder.map((planKey) => {
          const form = forms[planKey];
          const valid = isFormValid(form);
          const saving = savingKey === planKey;
          return (
            <div
              key={planKey}
              className="bg-neutral-700/50 border border-white/10 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-50">
                  {form.name || planKey}{' '}
                  <span className="text-xs text-neutral-300 font-normal">({planKey})</span>
                </h2>
                <label className="flex items-center gap-2 text-sm text-neutral-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => updateForm(planKey, { active: e.target.checked })}
                    className="accent-primary-500"
                  />
                  Активний
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Назва</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm(planKey, { name: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-500 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    Кредитів на місяць
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.monthly_credits}
                    onChange={(e) => updateForm(planKey, { monthly_credits: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-500 rounded-lg px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-neutral-300">
                      <th className="px-3 py-2">Валюта</th>
                      {INTERVALS.map((i) => (
                        <th key={i} className="px-3 py-2">
                          {i === 'month' ? 'за місяць' : 'за рік'}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CURRENCIES.map((c) => (
                      <tr key={c}>
                        <td className="px-3 py-2 text-neutral-100">
                          {c} {CURRENCY_SYMBOL[c]}
                        </td>
                        {INTERVALS.map((i) => (
                          <td key={i} className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={form.prices[priceKey(c, i)]}
                              onChange={(e) => updatePrice(planKey, priceKey(c, i), e.target.value)}
                              placeholder="—"
                              className="w-28 bg-neutral-900 border border-neutral-500 rounded-lg px-3 py-1.5 text-sm text-neutral-50 focus:outline-none focus:border-primary-500"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => save(planKey)}
                  disabled={!valid || saving}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-primary-500 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Зберегти
                </button>
                {savedKey === planKey && !saving && (
                  <span className="flex items-center gap-1 text-sm text-success">
                    <Check className="w-4 h-4" /> Збережено
                  </span>
                )}
                {saveError[planKey] && (
                  <span className="text-sm text-error">{saveError[planKey]}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
