"use client";

import { useState } from "react";
import type { Boiler, SurveyData, QuoteResult, TieredQuote, LineItem } from "@/lib/surveyor/types";

interface Props {
  survey: SurveyData;
  quoteResult: QuoteResult;
  updateQuote: (r: QuoteResult) => void;
  boilers: Boiler[];
  companyId: string;
  surveyorId?: string;
  surveyorName?: string;
  vatRate?: number;
  onBack: () => void;
}

type Tier = "low" | "mid" | "high";

const TIER_LABELS: Record<Tier, { label: string; badge: string; bg: string }> = {
  low: { label: "Good", badge: "bg-slate-200 text-slate-700", bg: "bg-slate-50 border-slate-300" },
  mid: { label: "Better", badge: "bg-blue-100 text-blue-700", bg: "bg-blue-50 border-blue-400" },
  high: { label: "Best", badge: "bg-amber-100 text-amber-700", bg: "bg-amber-50 border-amber-400" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function makeRecalc(vatRate: number) {
  return function recalcTotals(quote: TieredQuote): TieredQuote {
    const subtotal = quote.lineItems.reduce((s, i) => s + i.total, 0);
    const vatAmount = subtotal * vatRate;
    return { ...quote, subtotal, vatAmount, total: subtotal + vatAmount };
  };
}

export default function StepReview({ survey, quoteResult, updateQuote, boilers, companyId, surveyorId, surveyorName, vatRate = 0.20, onBack }: Props) {
  const recalcTotals = makeRecalc(vatRate);
  const [activeTier, setActiveTier] = useState<Tier>("mid");
  const [hasEdited, setHasEdited] = useState(false);
  const [editLocked, setEditLocked] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sent, setSent] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quote = quoteResult[activeTier];

  function startEdit(item: LineItem) {
    if (editLocked) return;
    setEditingKey(item.key);
    setEditValue(String(item.unitPrice));
  }

  function commitEdit(item: LineItem) {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice < 0) {
      setEditingKey(null);
      return;
    }
    const updatedItems = quote.lineItems.map((li) =>
      li.key === item.key
        ? { ...li, unitPrice: newPrice, total: newPrice * li.quantity }
        : li
    );
    const updatedQuote = recalcTotals({ ...quote, lineItems: updatedItems });

    // Apply to all three tiers — shared items stay in sync
    const applyToTier = (t: TieredQuote): TieredQuote => {
      const items = t.lineItems.map((li) =>
        li.key === item.key && li.category !== "BOILER"
          ? { ...li, unitPrice: newPrice, total: newPrice * li.quantity }
          : li
      );
      return recalcTotals({ ...t, lineItems: items });
    };

    updateQuote({
      low: applyToTier(quoteResult.low),
      mid: activeTier === "mid" ? updatedQuote : applyToTier(quoteResult.mid),
      high: applyToTier(quoteResult.high),
    });

    setEditingKey(null);
    setHasEdited(true);
  }

  function lockAndSave() {
    setEditLocked(true);
  }

  async function saveQuote(): Promise<string> {
    const res = await fetch("/api/surveyor/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ survey, quoteResult, companyId, surveyorId, surveyorName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to save quote");
    return data.id;
  }

  async function previewQuote() {
    setPreviewing(true);
    setError(null);
    try {
      const id = quoteId ?? await saveQuote();
      setQuoteId(id);
      window.open(`/q/${id}`, "_blank");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setPreviewing(false);
    }
  }

  async function sendToCustomer() {
    setSending(true);
    setError(null);
    try {
      // saveQuote POSTs to /api/surveyor/quotes which also sends the email
      const id = quoteId ?? await saveQuote();
      setQuoteId(id);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }

  if (sent && quoteId) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-slate-900">Quote sent!</h2>
        <p className="text-slate-600">
          The interactive quote has been emailed to{" "}
          <strong>{survey.customerEmail}</strong>.
        </p>
        <p className="text-slate-500 text-sm">
          Customer quote link:{" "}
          <a
            href={`/q/${quoteId}`}
            target="_blank"
            className="text-blue-600 underline"
          >
            {typeof window !== "undefined" ? window.location.origin : ""}/quote/{quoteId}
          </a>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
        >
          Start new survey
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Quote Review</h2>
            <p className="text-blue-200 text-sm mt-0.5">{survey.customerName} · {survey.postcode}</p>
          </div>
          <div className="text-right text-blue-100 text-sm">
            <p>{survey.customerEmail}</p>
            <p>{survey.customerPhone}</p>
          </div>
        </div>

        {/* Tier selector */}
        <div className="flex border-b border-slate-200">
          {(["low", "mid", "high"] as Tier[]).map((t) => {
            const cfg = TIER_LABELS[t];
            const q = quoteResult[t];
            return (
              <button
                key={t}
                onClick={() => setActiveTier(t)}
                className={`flex-1 py-4 px-3 text-center transition-all ${
                  activeTier === t ? "bg-white border-b-2 border-blue-600" : "bg-slate-50 hover:bg-white"
                }`}
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{q.boilerName}</p>
                <p className="text-lg font-bold text-slate-900">{fmt(q.total)}</p>
                <p className="text-xs text-slate-500">inc. 20% VAT</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">
            Line items — {TIER_LABELS[activeTier].label} tier
          </h3>
          {!editLocked && (
            <div className="flex gap-2">
              {hasEdited ? (
                <button
                  onClick={lockAndSave}
                  className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-all"
                >
                  Lock prices ✓
                </button>
              ) : (
                <span className="text-xs text-slate-400 italic">Tap any price to edit</span>
              )}
            </div>
          )}
          {editLocked && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">
              🔒 Prices locked
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {quote.lineItems.map((item) => (
            <div key={item.key} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 font-medium truncate">{item.name}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{item.category}</p>
              </div>
              {item.quantity > 1 && (
                <span className="text-xs text-slate-500">×{item.quantity}</span>
              )}
              <div className="text-right">
                {editingKey === item.key ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-500">£</span>
                    <input
                      autoFocus
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(item);
                        if (e.key === "Escape") setEditingKey(null);
                      }}
                      className="w-20 px-2 py-1 border border-blue-400 rounded-lg text-sm font-semibold text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(item)}
                    disabled={editLocked}
                    className={`text-sm font-semibold text-slate-900 ${
                      !editLocked ? "hover:text-blue-600 hover:underline cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {fmt(item.total)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-slate-200 px-5 py-4 space-y-2 bg-slate-50">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{fmt(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>VAT (20%)</span>
            <span>{fmt(quote.vatAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-300">
            <span>Total</span>
            <span>{fmt(quote.total)}</span>
          </div>
        </div>
      </div>

      {/* All three totals summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Quote summary — all tiers</h3>
        <div className="grid grid-cols-3 gap-3">
          {(["low", "mid", "high"] as Tier[]).map((t) => {
            const cfg = TIER_LABELS[t];
            const q = quoteResult[t];
            return (
              <div key={t} className={`rounded-xl border-2 p-4 text-center ${cfg.bg}`}>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <p className="text-xs text-slate-600 mt-2 font-medium truncate">{q.boilerName}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{fmt(q.total)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={previewQuote}
          disabled={previewing || sending}
          className="px-5 py-3 rounded-xl border-2 border-blue-300 text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-50 transition-all"
        >
          {previewing ? "Opening…" : "👁 Preview"}
        </button>
        <button
          onClick={sendToCustomer}
          disabled={sending || previewing}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {sending ? "Sending…" : `📧 Email quote to ${survey.customerName}`}
        </button>
      </div>
      <p className="text-xs text-center text-slate-400">
        {editLocked
          ? "Prices are locked. The customer will see all three tier prices and can choose their preferred option."
          : hasEdited
          ? "Lock prices before sending to prevent further changes."
          : "You can tap any price to edit it before sending. Once sent, prices cannot be changed."}
      </p>
    </div>
  );
}
