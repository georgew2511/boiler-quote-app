"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Select, Stepper, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const RAD_VALVE_TYPES = [
  { value: "",                        label: "No rad valves required" },
  { value: "rad_trv_lockshield_pack", label: "TRV + lockshield packs (angled)" },
  { value: "rad_lockshield_pair",     label: "Lockshield pairs only" },
];

export default function StepRadiators({ survey, update, onNext, onBack }: Props) {
  return (
    <FormCard title="Radiators & Valves" subtitle="Valve types, radiator work and quantities">
      <Field label="Radiator valve type">
        <Select
          value={survey.radValveType ?? ""}
          onChange={(v) => update({ radValveType: v })}
          options={RAD_VALVE_TYPES}
        />
      </Field>

      {survey.radValveType === "rad_trv_lockshield_pack" && (
        <Field label="How many TRV + lockshield packs?">
          <Stepper value={survey.radTRVLockshieldPacks ?? 0} onChange={(v) => update({ radTRVLockshieldPacks: v })} min={0} max={30} label="packs" />
        </Field>
      )}

      {survey.radValveType === "rad_lockshield_pair" && (
        <Field label="How many lockshield pairs?">
          <Stepper value={survey.radLockshieldPairsOnly ?? 0} onChange={(v) => update({ radLockshieldPairsOnly: v })} min={0} max={30} label="pairs" />
        </Field>
      )}

      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Radiator installation</p>
        <div className="space-y-3">
          <Field label="Total radiators installing">
            <Stepper value={survey.radiatorsInstalling ?? 0} onChange={(v) => update({ radiatorsInstalling: v })} min={0} max={30} label="rads" />
          </Field>
          <Field label="Straight swap (existing location)" hint="Swap existing rad like-for-like">
            <Stepper value={survey.radStraightSwap ?? 0} onChange={(v) => update({ radStraightSwap: v })} min={0} max={30} label="rads" />
          </Field>
          <Field label="Minor alteration" hint="Small pipe alteration needed">
            <Stepper value={survey.radMinorAlteration ?? 0} onChange={(v) => update({ radMinorAlteration: v })} min={0} max={20} label="rads" />
          </Field>
          <Field label="New install" hint="New radiator in new position">
            <Stepper value={survey.radNewInstall ?? 0} onChange={(v) => update({ radNewInstall: v })} min={0} max={20} label="rads" />
          </Field>
        </div>
      </div>

      <Field label="Radiator notes" hint="Any additional info about radiator work">
        <textarea
          value={survey.radNotes ?? ""}
          onChange={(e) => update({ radNotes: e.target.value })}
          rows={2}
          placeholder="e.g. 2 rads in extension, access may be tight..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </Field>

      <NavButtons onNext={onNext} onBack={onBack} />
    </FormCard>
  );
}
