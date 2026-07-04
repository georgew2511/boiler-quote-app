"use client";

import type { LineItem, SurveyData } from "@/lib/surveyor/types";

interface Props {
  survey: SurveyData;
  lineItems: LineItem[];
  color: string;
  boilerName: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  LABOUR:     { label: "Installation labour",        icon: "🔧" },
  ELECTRICAL: { label: "Electrical works",           icon: "⚡" },
  CONDENSATE: { label: "Condensate termination",     icon: "💧" },
  FLUE:       { label: "Flue system",                icon: "💨" },
  CYLINDER:   { label: "Hot water cylinder",         icon: "🚿" },
  SYSTEM:     { label: "System components",          icon: "⚙️" },
  CONTROLS:   { label: "Controls & thermostat",      icon: "🎛️" },
  FILTER:     { label: "System filter",              icon: "🧲" },
  GAS:        { label: "Gas supply",                 icon: "🔥" },
  COPPER:     { label: "Copper pipework",            icon: "🪛" },
  FITTINGS:   { label: "Fittings packs",             icon: "🔩" },
  LAGGING:    { label: "Pipe insulation",            icon: "🧱" },
  RAD_VALVES: { label: "Radiator valves",            icon: "🌡️" },
  RADIATORS:  { label: "Radiator works",             icon: "📐" },
  CLEAN:      { label: "System clean",               icon: "✨" },
  INHIBITOR:  { label: "System protection",          icon: "🛡️" },
};

// Preferred display order
const CATEGORY_ORDER = [
  "LABOUR", "ELECTRICAL", "CONDENSATE", "FLUE", "CYLINDER", "SYSTEM",
  "CONTROLS", "FILTER", "GAS", "COPPER",
  "FITTINGS", "LAGGING", "RAD_VALVES", "RADIATORS", "CLEAN", "INHIBITOR",
];

const ALWAYS_INCLUDED = [
  "Gas Safe registered engineers throughout",
  "All old boiler, parts and packaging removed from your property",
  "All radiators balanced and tested for even heat distribution",
  "Full system pressure check and leak test before handover",
  "Heating controls set up and demonstrated to you",
  "Gas safety checks carried out at every stage",
  "Benchmark logbook completed and handed over",
  "Engineer on hand to answer questions on the day",
];

export default function QuoteInstallationSummary({ survey, lineItems, color, boilerName }: Props) {
  // Group every non-BOILER line item (including upsells that are active, since they're in visibleItems) by category
  const grouped: Record<string, LineItem[]> = {};
  for (const li of lineItems) {
    if (li.category === "BOILER") continue;
    if (!grouped[li.category]) grouped[li.category] = [];
    grouped[li.category].push(li);
  }

  // Ordered list of categories that have at least one item
  const categoriesPresent = CATEGORY_ORDER.filter((c) => (grouped[c]?.length ?? 0) > 0)
    // Also catch any categories not in our order list
    .concat(Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c) && c !== "BOILER"));

  function itemLabel(li: LineItem): string {
    const qty = li.quantity > 1 ? `${li.quantity} × ` : "";
    // Strip "Upgrade: " prefix from upsell items
    const name = li.name.replace(/^Upgrade:\s*/i, "");

    // Enrich specific categories with helpful context
    if (li.category === "FILTER") return `${qty}${name} — traps iron oxide and debris, protecting your boiler`;
    if (li.category === "INHIBITOR") return `${qty}${name} — keeps your system protected against corrosion year-round`;
    if (li.category === "COPPER") return `${qty}${name}`;
    if (li.category === "LAGGING") return `${qty}${name}`;
    if (li.category === "CLEAN") {
      if (name.toLowerCase().includes("powerflush")) return `${name} — high-pressure clean removes years of sludge and debris`;
      if (name.toLowerCase().includes("chemical")) return `${name} — chemical treatment to clean and protect your system`;
    }
    return `${qty}${name}`;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5" style={{ backgroundColor: color }}>
        <h2 className="text-white font-bold text-base uppercase tracking-wide">What's included in your installation</h2>
        <p className="text-white/75 text-xs mt-0.5">Everything selected for your {boilerName} installation</p>
      </div>

      <div className="p-6 space-y-6">
        {/* All selected items grouped by category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categoriesPresent.map((cat) => {
            const meta = CATEGORY_LABELS[cat] ?? { label: cat, icon: "📦" };
            const items = grouped[cat];
            return (
              <div key={cat} className="rounded-xl border border-slate-100 overflow-hidden">
                <div
                  className="px-4 py-2.5 flex items-center gap-2 border-b border-slate-100"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
                    {meta.label}
                  </span>
                </div>
                <ul className="bg-slate-50 px-4 py-3 space-y-1.5">
                  {items.map((li) => (
                    <li key={li.key} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="font-bold mt-0.5 flex-shrink-0" style={{ color }}>✓</span>
                      <span>{itemLabel(li)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Always included */}
        <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: color }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: color }}>
            <span className="text-white text-sm">⭐</span>
            <span className="text-white text-xs font-bold uppercase tracking-wide">
              Always included as standard — at no extra charge
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 px-4 py-4">
            {ALWAYS_INCLUDED.map((item, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 text-sm text-slate-700">
                <span className="font-bold mt-0.5 flex-shrink-0" style={{ color }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Special notes from surveyor */}
        {survey.specialNotes && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">Notes from your surveyor</p>
            <p className="text-sm text-amber-900 whitespace-pre-line">{survey.specialNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
