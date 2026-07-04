"use client";

import type { Boiler, SurveyData, BoilerTier } from "@/lib/surveyor/types";
import { FormCard, NavButtons } from "./FormComponents";

interface Props {
  survey: Partial<SurveyData>;
  update: (p: Partial<SurveyData>) => void;
  boilers: Boiler[];
  onNext: () => void;
  onBack: () => void;
}

const TIER_CONFIG: Record<BoilerTier, { label: string; color: string; bg: string; border: string; badge: string }> = {
  LOW: {
    label: "Good",
    color: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-300",
    badge: "bg-slate-200 text-slate-700",
  },
  MID: {
    label: "Better",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-400",
    badge: "bg-blue-100 text-blue-700",
  },
  HIGH: {
    label: "Best",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-400",
    badge: "bg-amber-100 text-amber-700",
  },
};

export default function StepBoilerSelection({ survey, update, boilers, onNext, onBack }: Props) {

  const boilerType = survey.newBoilerType ?? "COMBI";
  const filteredBoilers = boilers.filter((b) => b.boilerType === boilerType);
  const tierBoilers = (tier: BoilerTier) => filteredBoilers.filter((b) => b.tier === tier);

  const validSel = survey.lowBoilerId && survey.midBoilerId && survey.highBoilerId;

  function BoilerCard({
    boiler,
    selected,
    onSelect,
    tier,
  }: {
    boiler: Boiler;
    selected: boolean;
    onSelect: () => void;
    tier: BoilerTier;
  }) {
    const cfg = TIER_CONFIG[tier];
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
          selected ? `${cfg.border} ${cfg.bg} shadow-sm` : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`font-semibold text-sm ${selected ? cfg.color : "text-slate-800"}`}>
              {boiler.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{boiler.kw}kW · {boiler.warrantyYears}-yr warranty</p>
            {boiler.description && (
              <p className="text-xs text-slate-400 mt-1">{boiler.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            {selected && (
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                ✓ Selected
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  function TierSection({
    tier,
    field,
  }: {
    tier: BoilerTier;
    field: "lowBoilerId" | "midBoilerId" | "highBoilerId";
  }) {
    const cfg = TIER_CONFIG[tier];
    const options = tierBoilers(tier);
    const selected = survey[field];

    return (
      <div className={`rounded-xl border-2 ${cfg.border} overflow-hidden`}>
        <div className={`px-4 py-3 ${cfg.bg} flex items-center gap-2`}>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className={`text-sm font-semibold ${cfg.color}`}>
            {tier.charAt(0) + tier.slice(1).toLowerCase()} tier — select one to present to customer
          </span>
        </div>

        <div className="p-3 space-y-2 bg-white">
          {options.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No boilers available in this tier</p>
          ) : (
            options.map((b) => (
              <BoilerCard
                key={b.id}
                boiler={b}
                selected={selected === b.id}
                onSelect={() => update({ [field]: b.id } as Partial<SurveyData>)}
                tier={tier}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <FormCard
      title="Boiler Selection"
      subtitle="Select one boiler per tier to present to the customer."
    >
      <TierSection tier="LOW" field="lowBoilerId" />
      <TierSection tier="MID" field="midBoilerId" />
      <TierSection tier="HIGH" field="highBoilerId" />

      {!validSel && (
        <p className="text-xs text-amber-600 text-center">
          Please select one boiler from each tier to continue
        </p>
      )}

      <NavButtons
        onNext={onNext}
        onBack={onBack}
        nextLabel="Generate Quote →"
        nextDisabled={!validSel}
      />
    </FormCard>
  );
}
