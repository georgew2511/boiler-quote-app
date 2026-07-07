"use client";

import { MAX_QUOTE_OPTIONS } from "@/lib/surveyor/types";
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

  const selectedIds = survey.selectedBoilerIds ?? [];
  const atMax = selectedIds.length >= MAX_QUOTE_OPTIONS;
  const validSel = selectedIds.length >= 1;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      update({ selectedBoilerIds: selectedIds.filter((x) => x !== id) });
    } else {
      if (atMax) return;
      update({ selectedBoilerIds: [...selectedIds, id] });
    }
  }

  function BoilerCard({
    boiler,
    tier,
  }: {
    boiler: Boiler;
    tier: BoilerTier;
  }) {
    const cfg = TIER_CONFIG[tier];
    const selected = selectedIds.includes(boiler.id);
    const disabled = !selected && atMax;
    return (
      <button
        type="button"
        onClick={() => toggle(boiler.id)}
        disabled={disabled}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
          selected
            ? `${cfg.border} ${cfg.bg} shadow-sm`
            : disabled
            ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold ${
              selected ? `${cfg.border} ${cfg.bg} ${cfg.color}` : "border-slate-300 bg-white"
            }`}
          >
            {selected && "✓"}
          </span>
          <div>
            <p className={`font-semibold text-sm ${selected ? cfg.color : "text-slate-800"}`}>
              {boiler.name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{boiler.kw}kW · {boiler.warrantyYears}-yr warranty</p>
            {boiler.description && (
              <p className="text-xs text-slate-400 mt-1">{boiler.description}</p>
            )}
          </div>
        </div>
      </button>
    );
  }

  function TierGroup({ tier }: { tier: BoilerTier }) {
    const cfg = TIER_CONFIG[tier];
    const options = tierBoilers(tier);
    if (options.length === 0) return null;

    return (
      <div className={`rounded-xl border-2 ${cfg.border} overflow-hidden`}>
        <div className={`px-4 py-3 ${cfg.bg} flex items-center gap-2`}>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className={`text-sm font-semibold ${cfg.color}`}>
            {tier.charAt(0) + tier.slice(1).toLowerCase()} tier boilers
          </span>
        </div>

        <div className="p-3 space-y-2 bg-white">
          {options.map((b) => (
            <BoilerCard key={b.id} boiler={b} tier={tier} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <FormCard
      title="Boiler Selection"
      subtitle={`Select up to ${MAX_QUOTE_OPTIONS} boilers to present to the customer — they'll see them ordered cheapest to most expensive.`}
    >
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
        <span className="font-medium text-slate-600">
          {selectedIds.length} of {MAX_QUOTE_OPTIONS} selected
        </span>
        {atMax && <span className="text-amber-600 font-medium">Maximum reached</span>}
      </div>

      <TierGroup tier="LOW" />
      <TierGroup tier="MID" />
      <TierGroup tier="HIGH" />

      {!validSel && (
        <p className="text-xs text-amber-600 text-center">
          Please select at least one boiler to continue
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
