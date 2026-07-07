"use client";

import { useState } from "react";
import type { Boiler, SurveyData, QuoteResult, QuoteOption, LineItem } from "@/lib/surveyor/types";

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

const LABEL_STYLES: Record<string, { badge: string; bg: string }> = {
  Standard: { badge: "bg-slate-200 text-slate-700", bg: "bg-slate-50 border-slate-300" },
  Good:     { badge: "bg-slate-200 text-slate-700", bg: "bg-slate-50 border-slate-300" },
  Better:   { badge: "bg-blue-100 text-blue-700",   bg: "bg-blue-50 border-blue-400" },
  Best:     { badge: "bg-amber-100 text-amber-700", bg: "bg-amber-50 border-amber-400" },
  Premium:  { badge: "bg-purple-100 text-purple-700", bg: "bg-purple-50 border-purple-400" },
  Elite:    { badge: "bg-emerald-100 text-emerald-700", bg: "bg-emerald-50 border-emerald-400" },
};
const DEFAULT_LABEL_STYLE = { badge: "bg-slate-200 text-slate-700", bg: "bg-slate-50 border-slate-300" };
const styleFor = (label: string) => LABEL_STYLES[label] ?? DEFAULT_LABEL_STYLE;

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function makeRecalc(vatRate: number) {
  return function recalcTotals(option: QuoteOption): QuoteOption {
    const subtotal = option.lineItems.reduce((s, i) => s + i.total, 0);
    const vatAmount = subtotal * vatRate;
    return { ...option, subtotal, vatAmount, total: subtotal + vatAmount };
  };
}

export default function StepReview({ survey, quoteResult, updateQuote, boilers, companyId, surveyorId, surveyorName, vatRate = 0.20, onBack }: Props) {
  const recalcTotals = makeRecalc(vatRate);
  const options = quoteResult.options;
  // Default to a middle option so a 3-boiler quote still opens on "Better" as before.
  const [activeIndex, setActiveIndex] = useState(() => Math.floor((options.length - 1) / 2));
  const [hasEdited, setHasEdited] = useState(false);
  const [editLocked, setEditLocked] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sent, setSent] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quote = options[activeIndex];

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

    // The active option's own price gets edited regardless of category
    // (including its BOILER line — each option can have a different boiler).
    // Every other option only picks up the edit for shared, non-BOILER items,
    // so labour/materials stay in sync without one option's boiler price
    // bleeding into another's.
    const applyEdit = (opt: QuoteOption, isActive: boolean): QuoteOption => {
      const items = opt.lineItems.map((li) =>
        li.key === item.key && (isActive || li.category !== "BOILER")
          ? { ...li, unitPrice: newPrice, total: newPrice * li.quantity }
          : li
      );
      return recalcTotals({ ...opt, lineItems: items });
    };

    updateQuote({
      options: options.map((opt, i) => applyEdit(opt, i === activeIndex)),
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

        {/* Option selector */}
        <div className="flex flex-wrap border-b border-slate-200">
          {options.map((opt, i) => {
            const cfg = styleFor(opt.label);
            return (
              <button
                key={opt.boilerId}
                onClick={() => setActiveIndex(i)}
                className={`flex-1 min-w-[110px] py-4 px-3 text-center transition-all ${
                  activeIndex === i ? "bg-white border-b-2 border-blue-600" : "bg-slate-50 hover:bg-white"
                }`}
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {opt.label}
                </span>
                <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{opt.boilerName}</p>
                <p className="text-lg font-bold text-slate-900">{fmt(opt.total)}</p>
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
            Line items — {quote.label} option
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

      {/* All options summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Quote summary — all options</h3>
        <div className="flex flex-wrap gap-3">
          {options.map((opt) => {
            const cfg = styleFor(opt.label);
            return (
              <div key={opt.boilerId} className={`flex-1 min-w-[140px] rounded-xl border-2 p-4 text-center ${cfg.bg}`}>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {opt.label}
                </span>
                <p className="text-xs text-slate-600 mt-2 font-medium truncate">{opt.boilerName}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{fmt(opt.total)}</p>
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
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          {sending ? "Sending…" : `📧 Email quote to ${survey.customerName}`}
        </button>
      </div>
      <p className="text-xs text-center text-slate-400">
        {editLocked
          ? `Prices are locked. The customer will see all ${options.length} option${options.length === 1 ? "" : "s"} and can choose their preferred one.`
          : hasEdited
          ? "Lock prices before sending to prevent further changes."
          : "You can tap any price to edit it before sending. Once sent, prices cannot be changed."}
      </p>
    </div>
  );
}
