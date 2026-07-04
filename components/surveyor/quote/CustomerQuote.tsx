"use client";

import { useState } from "react";
import type { QuoteResult, TieredQuote, SurveyData, CompanySettings } from "@/lib/surveyor/types";
import QuoteInstallationSummary from "@/components/surveyor/quote/QuoteInstallationSummary";

interface Props {
  quoteId: string;
  quoteResult: QuoteResult;
  survey: SurveyData;
  createdAt: string;
  settings: CompanySettings;
}

type Tier = "low" | "mid" | "high";

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function monthlyPayment(total: number, months: number, aprPercent: number): number {
  if (aprPercent === 0) return total / months;
  const r = aprPercent / 12 / 100;
  return (total * r) / (1 - Math.pow(1 + r, -months));
}

function totalPayable(total: number, months: number, aprPercent: number): number {
  return monthlyPayment(total, months, aprPercent) * months;
}


const TIER_LABELS: Record<Tier, string> = { low: "Good", mid: "Better", high: "Best" };

export default function CustomerQuote({ quoteId, quoteResult, survey, createdAt, settings }: Props) {
  const [selectedTier, setSelectedTier] = useState<Tier>("mid");
  const [activeUpsells, setActiveUpsells] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState("");

  const rawQuote = quoteResult[selectedTier];
  const color = settings.primaryColor ?? "#1d4ed8";

  const upsellItems = rawQuote.lineItems.filter((li) => li.upsell);

  const vatRate = settings.vatRegistered ? 0.20 : 0;

  // Compute a display total for any tier that respects which upsells are toggled on
  function tierDisplayTotal(q: typeof rawQuote): number {
    const items = q.lineItems.filter((li) => !li.upsell || activeUpsells.has(li.key));
    const sub = items.reduce((s, li) => s + li.total, 0);
    return sub * (1 + vatRate);
  }

  const visibleItems = rawQuote.lineItems.filter((li) => !li.upsell || activeUpsells.has(li.key));
  const subtotal = visibleItems.reduce((s, li) => s + li.total, 0);
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;
  const quote = { ...rawQuote, lineItems: visibleItems, subtotal, vatAmount, total };

  function toggleUpsell(key: string) {
    setActiveUpsells((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const expiryDate = new Date(createdAt);
  expiryDate.setDate(expiryDate.getDate() + 30);
  const expiryStr = expiryDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const quoteRef = quoteId.slice(-8).toUpperCase();

  // Build finance options from settings
  const financeOptions: { label: string; months: number; apr: number }[] = [];
  if (settings.financeEnabled) {
    const deposit = quote.total * (settings.financeDepositPercent / 100);
    const loanAmount = quote.total - deposit;
    for (const m of (settings.financeLoanTerms ?? [120, 60])) {
      financeOptions.push({
        label: `Personal Loan — ${m} months`,
        months: m,
        apr: settings.financeApr,
      });
    }
    if (settings.financeZeroPercent) {
      for (const m of (settings.financeZeroPercentTerms ?? [24])) {
        financeOptions.push({
          label: `Interest Free — ${m} months`,
          months: m,
          apr: 0,
        });
      }
    }
    // sort longest term first (matches original order)
    financeOptions.sort((a, b) => b.months - a.months);
    void loanAmount; // used below per-row
  }

  const longestTerm = financeOptions[0]?.months ?? 120;
  const lowestMonthly = settings.financeEnabled
    ? monthlyPayment(quote.total * (1 - (settings.financeDepositPercent / 100)), longestTerm, settings.financeApr)
    : 0;

  async function handleAccept() {
    setAccepting(true);
    setAcceptError("");
    try {
      const res = await fetch(`/api/surveyor/quotes/${quoteId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier.toUpperCase(),
          boilerName: quote.boilerName,
          total,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setAccepted(true);
      setShowConfirm(false);
    } catch {
      setAcceptError("Something went wrong. Please try again or contact us directly.");
    } finally {
      setAccepting(false);
    }
  }

  const tierLabel = selectedTier === "low" ? "Good" : selectedTier === "mid" ? "Better" : "Best";

  if (accepted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl brand-bg">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Quote accepted!</h1>
          <p className="text-slate-500 text-sm mb-4">
            Thank you, <strong>{survey.customerName}</strong>. You've accepted the <strong>{tierLabel}</strong> option — <strong>{quote.boilerName}</strong> for <strong>{fmt(total)}</strong>.
          </p>
          <p className="text-slate-500 text-sm">
            A confirmation has been sent to <strong>{survey.customerEmail}</strong>. A member of the {settings.companyName} team will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white font-sans">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .brand-bg { background-color: ${color}; }
        .brand-text { color: ${color}; }
        .brand-border { border-color: ${color}; }
        .brand-row { background-color: ${color}20; }
        .finance-row-0 { background-color: ${color}30; }
        .finance-row-1 { background-color: ${color}20; }
        .finance-row-2 { background-color: ${color}10; }
      `}</style>

      {/* ── SAVE AS PDF BUTTON ── */}
      <div className="no-print sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings.logoSlug
            ? <img src={`/logos/${settings.logoSlug}`} alt={settings.companyName} className="h-8 object-contain" />
            : <span className="text-lg font-bold" style={{ color }}>{settings.companyName}</span>
          }
        </div>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 brand-bg"
        >
          ⬇ Save as PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 print:px-0 print:py-0 print:max-w-none print:space-y-0">

        {/* ══ HERO BANNER ══ */}
        <div className="rounded-2xl overflow-hidden shadow-md bg-white print:rounded-none print:shadow-none">
          <div className="px-6 pt-6 pb-0 print:px-8 print:pt-8">
            <div className="flex items-stretch justify-between gap-6">

              {/* Left: logo + price */}
              <div className="flex flex-col gap-4 justify-between pb-6">
                {settings.logoSlug
                  ? <img src={`/logos/${settings.logoSlug}`} alt={settings.companyName} className="h-12 object-contain" />
                  : <span className="text-2xl font-extrabold tracking-tight brand-text">{settings.companyName}</span>
                }
                <div className="rounded-2xl p-4 text-center min-w-[140px] brand-row">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your quote</p>
                  <p className="text-3xl font-extrabold mt-1 brand-text">{fmt(quote.total)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">inc. 20% VAT</p>
                </div>
              </div>

              {/* Centre: boiler image — flush to bottom */}
              {quote.boilerImageSlug && (
                <div className="flex-1 flex items-end justify-center">
                  <img
                    src={`/boilers/${quote.boilerImageSlug}`}
                    alt={quote.boilerName}
                    className="h-44 object-contain drop-shadow-lg"
                  />
                </div>
              )}

              {/* Right: finance teaser + accept CTA */}
              <div className="text-right flex-shrink-0 max-w-[200px] flex flex-col justify-between pb-6">
                {settings.financeEnabled && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Exclusive offer</p>
                    <p className="text-xl font-extrabold leading-tight text-slate-800">
                      FROM ONLY<br />
                      <span className="text-4xl brand-text">{fmt(lowestMonthly)}</span>
                      <span className="text-lg text-slate-600"> /mo</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Subject to status · {settings.financeApr}% APR</p>
                    <p className="text-xs font-semibold mt-2 text-slate-600">
                      {settings.financeDepositPercent > 0
                        ? `${settings.financeDepositPercent}% deposit required`
                        : "No upfront deposit required"}
                    </p>
                  </div>
                )}
                <div className="no-print mt-4">
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-95 brand-bg"
                  >
                    Accept quote
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                    {quote.boilerName} · {fmt(total)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer details strip */}
          <div className="bg-slate-50 border-t-4 brand-border px-6 py-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Name",     value: survey.customerName  },
              { label: "Postcode", value: survey.postcode      },
              { label: "Phone",    value: survey.customerPhone },
              { label: "Email",    value: survey.customerEmail },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Boiler model + ref */}
          <div className="bg-slate-50 px-6 py-3 flex items-center justify-between text-sm border-t border-slate-100">
            <div>
              <span className="text-slate-500 font-medium">Boiler model: </span>
              <span className="font-semibold text-slate-800">{quote.boilerName}</span>
            </div>
            <div className="text-slate-400 text-xs">Ref: {quoteRef} · Valid until {expiryStr}</div>
          </div>
        </div>

        {/* ══ CURRENT BOILER DETAILS ══ */}
        {(survey.currentBoilerType || survey.currentFuelType) && (() => {
          const fuelLabel: Record<string, string> = { gas: "Gas (mains)", oil: "Oil", lpg: "LPG", electric: "Electric", none: "None" };
          const typeLabel: Record<string, string> = { combi: "Combi", system: "System", regular: "Regular / heat-only", back_boiler: "Back boiler", none: "None" };
          const locLabel:  Record<string, string> = { kitchen: "Kitchen", utility: "Utility room", airing_cupboard: "Airing cupboard", garage: "Garage", loft: "Loft", other: "Other" };
          const flueLabel: Record<string, string> = { horizontal: "Horizontal", vertical: "Vertical", none: "N/A" };
          const floorLabel: Record<string, string> = { ground: "Ground floor", first: "First floor", second: "Second floor", other: "Other", na: "N/A" };
          const removalLabels: Record<string, string> = {
            removal_boiler: "Old boiler", removal_cylinder: "Hot water cylinder",
            removal_cold_tank: "Cold water tank", removal_header_tank: "Expansion / header tank",
            removal_back_boiler: "Back boiler & fire", removal_pump: "Existing pump",
            removal_controls: "Old controls / programmer",
          };
          const rows = [
            survey.currentFuelType       && ["Current fuel type",      fuelLabel[survey.currentFuelType]  ?? survey.currentFuelType],
            survey.currentBoilerType     && ["Current boiler type",    typeLabel[survey.currentBoilerType] ?? survey.currentBoilerType],
            survey.currentBoilerLocation && ["Current location",       locLabel[survey.currentBoilerLocation] ?? survey.currentBoilerLocation],
            survey.currentFlueOrientation && ["Current flue",          flueLabel[survey.currentFlueOrientation] ?? survey.currentFlueOrientation],
            survey.currentFlueFloor      && ["Flue floor level",       floorLabel[survey.currentFlueFloor] ?? survey.currentFlueFloor],
          ].filter(Boolean) as [string, string][];
          const removals = (survey.removalItems ?? []).map((k) => removalLabels[k] ?? k);

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="brand-bg px-6 py-4">
                <h2 className="text-white font-bold text-base uppercase tracking-wide">Current Boiler Details</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-6 py-3">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
                {removals.length > 0 && (
                  <div className="flex items-start justify-between px-6 py-3 gap-4">
                    <span className="text-sm text-slate-500">Items to be removed</span>
                    <span className="text-sm font-semibold text-slate-800 text-right">{removals.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ══ TIER SWITCHER (web only) ══ */}
        <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wide">
            Choose your preferred option — prices update instantly
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(["low", "mid", "high"] as Tier[]).map((t) => {
              const q = quoteResult[t];
              const isSelected = t === selectedTier;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className={`rounded-xl p-4 text-center transition-all border-2 ${
                    isSelected ? "shadow-md" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  style={isSelected ? { borderColor: color, backgroundColor: `${color}10` } : {}}
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: isSelected ? color : "#94a3b8" }}
                  >
                    {TIER_LABELS[t]}
                  </span>
                  {q.boilerImageSlug && (
                    <img src={`/boilers/${q.boilerImageSlug}`} alt={q.boilerName} className="w-14 h-14 object-contain mx-auto mt-2" />
                  )}
                  <p className="text-xs font-semibold mt-2 leading-tight text-slate-700">{q.boilerName}</p>
                  <p className="text-xl font-extrabold mt-1 text-slate-900">{fmt(tierDisplayTotal(q))}</p>
                  <p className="text-xs text-slate-400">inc. VAT</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ UPSELL CARDS ══ */}
        {upsellItems.map((upsellItem) => {
          const isOn = activeUpsells.has(upsellItem.key);
          const diff = upsellItem.total * 1.05;
          const isSmartControls = upsellItem.key.startsWith("ctrl_");
          const label = isSmartControls ? "Upgrade to smart controls" : "Upgrade to powerflush";
          const sublabel = isSmartControls
            ? `${upsellItem.name.replace("Upgrade: ", "")} — control your heating from anywhere`
            : `${upsellItem.name.replace("Upgrade: ", "")} — a deeper clean for better efficiency`;
          return (
            <div
              key={upsellItem.key}
              className="no-print bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all"
              style={{ borderColor: isOn ? color : "#e2e8f0" }}
            >
              <div className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold brand-text">+{fmt(diff)}</span>
                  <button
                    type="button"
                    onClick={() => toggleUpsell(upsellItem.key)}
                    className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none"
                    style={{ backgroundColor: isOn ? color : "#cbd5e1" }}
                    aria-pressed={isOn}
                  >
                    <span
                      className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                      style={{ transform: isOn ? "translateX(22px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>
              </div>
              {isOn && (
                <div className="px-5 pb-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                  ✓ {label.replace("Upgrade to ", "")} added — your total has been updated above
                </div>
              )}
            </div>
          );
        })}

        {/* ══ INSTALLATION SUMMARY ══ */}
        <QuoteInstallationSummary
          survey={survey}
          lineItems={visibleItems}
          color={color}
          boilerName={quote.boilerName}
        />

        {/* ══ FINANCE OPTIONS ══ */}
        {settings.financeEnabled && financeOptions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="brand-bg px-6 py-4">
              <h2 className="text-white font-bold text-base tracking-wide uppercase">Finance Options</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">Plan & Term</th>
                    <th className="px-4 py-3 text-center font-semibold">Deposit</th>
                    <th className="px-4 py-3 text-center font-semibold">Loan Amount</th>
                    <th className="px-4 py-3 text-center font-semibold">Total Payable</th>
                    <th className="px-4 py-3 text-center font-semibold">APR (Fixed)</th>
                    <th className="px-4 py-3 text-right font-semibold">Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  {financeOptions.map((opt, i) => {
                    const deposit = quote.total * (settings.financeDepositPercent / 100);
                    const loanAmount = quote.total - deposit;
                    const monthly = monthlyPayment(loanAmount, opt.months, opt.apr);
                    const payable = totalPayable(loanAmount, opt.months, opt.apr) + deposit;
                    return (
                      <tr key={i} className={`finance-row-${Math.min(i, 2)} border-t border-slate-100`}>
                        <td className="px-4 py-3 font-medium text-slate-800">{opt.label}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{fmt(deposit)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{fmt(loanAmount)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{fmt(payable)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{opt.apr}%</td>
                        <td className="px-4 py-3 text-right font-extrabold brand-text text-base">{fmt(monthly)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 px-4 pb-3">Finance is subject to status and credit checks. Representative example only.</p>
          </div>
        )}

        {/* ══ WHY CHOOSE US + HOW TO ACCEPT ══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Why choose us */}
          {settings.whyChooseUs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="brand-bg px-5 py-4">
                <h2 className="text-white font-bold text-sm uppercase tracking-wide">Why Choose Us?</h2>
              </div>
              <ul className="p-5 space-y-3">
                {settings.whyChooseUs.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="brand-text font-bold mt-0.5 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* How to accept */}
          {settings.howToAccept.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="brand-bg px-5 py-4">
                <h2 className="text-white font-bold text-sm uppercase tracking-wide">How to Accept</h2>
              </div>
              <ul className="p-5 space-y-4">
                {settings.howToAccept.map((item, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-semibold brand-text">{item.method}</p>
                    <p className="text-slate-600 mt-0.5">{item.detail}</p>
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-5 space-y-1">
                {settings.phone && <p className="text-sm font-semibold text-slate-700">📞 {settings.phone}</p>}
                {settings.email && <p className="text-sm font-semibold text-slate-700">✉ {settings.email}</p>}
              </div>
            </div>
          )}
        </div>

        {/* ══ CONTRACT DETAILS ══ */}
        {settings.contractDetails && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 uppercase tracking-wide text-sm">Contract Details</h2>
            </div>
            <div className="px-6 py-5 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {settings.contractDetails}
            </div>
            {(settings.termsUrl || settings.privacyUrl) && (
              <div className="px-6 pb-5 flex gap-4 text-xs">
                {settings.termsUrl && (
                  <a href={settings.termsUrl} target="_blank" className="brand-text underline">Terms & Conditions</a>
                )}
                {settings.privacyUrl && (
                  <a href={settings.privacyUrl} target="_blank" className="brand-text underline">Privacy Policy</a>
                )}
              </div>
            )}
            {(settings.companyNumber || settings.fcaNumber) && (
              <div className="px-6 pb-5 text-xs text-slate-400">
                {settings.companyNumber && <span>Company No: {settings.companyNumber} · </span>}
                {settings.fcaNumber && <span>FCA Authorised: {settings.fcaNumber}</span>}
              </div>
            )}
          </div>
        )}

        {/* ══ ACCEPT QUOTE ══ */}
        <div className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="brand-bg px-6 py-4">
            <h2 className="text-white font-bold text-base tracking-wide uppercase">Accept Your Quote</h2>
          </div>
          <div className="px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-slate-800 font-semibold text-sm">
                You've selected the <span className="font-extrabold">{tierLabel}</span> option — <span className="font-extrabold">{quote.boilerName}</span>
              </p>
              <p className="text-slate-500 text-sm mt-0.5">
                Total: <span className="font-extrabold brand-text">{fmt(total)}</span> inc. 20% VAT
              </p>
              <p className="text-xs text-slate-400 mt-2">Clicking accept will notify {settings.companyName} and send you a confirmation email.</p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-shrink-0 px-8 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-95 brand-bg"
            >
              Accept this quote
            </button>
          </div>
        </div>

        {/* ══ FOOTER ══ */}
        <div className="brand-bg rounded-2xl text-white px-6 py-5 flex flex-wrap items-center justify-between gap-4 print:rounded-none">
          <div className="flex items-center gap-4">
            {settings.email && <span className="text-sm opacity-90">✉ {settings.email}</span>}
            {settings.phone && <span className="text-sm opacity-90">📞 {settings.phone}</span>}
          </div>
          {settings.logoSlug
            ? <img src={`/logos/${settings.logoSlug}`} alt={settings.companyName} className="h-8 object-contain opacity-90" />
            : <span className="text-lg font-extrabold opacity-90">{settings.companyName}</span>
          }
        </div>

      </div>

      {/* ── CONFIRMATION MODAL ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h2 className="text-lg font-extrabold text-slate-800 mb-2">Confirm your choice</h2>
            <p className="text-sm text-slate-600 mb-1">
              You're accepting the <strong>{tierLabel}</strong> option:
            </p>
            <p className="text-sm font-semibold text-slate-800 mb-1">{quote.boilerName}</p>
            <p className="text-xl font-extrabold brand-text mb-4">{fmt(total)} <span className="text-sm font-normal text-slate-400">inc. VAT</span></p>
            <p className="text-xs text-slate-500 mb-5">
              A confirmation email will be sent to <strong>{survey.customerEmail}</strong> and {settings.companyName} will be notified to arrange your installation.
            </p>
            {acceptError && <p className="text-sm text-red-600 mb-4">{acceptError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={accepting}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:border-slate-300 transition-all"
              >
                Go back
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60 brand-bg"
              >
                {accepting ? "Sending…" : "Confirm & accept"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
