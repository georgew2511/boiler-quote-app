"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Select, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const FUEL_TYPES = [
  { value: "gas",      label: "Gas (mains)" },
  { value: "oil",      label: "Oil" },
  { value: "lpg",      label: "LPG" },
  { value: "electric", label: "Electric" },
  { value: "none",     label: "No existing boiler" },
];

const BOILER_TYPES = [
  { value: "combi",   label: "Combi" },
  { value: "system",  label: "System" },
  { value: "regular", label: "Regular / heat-only" },
  { value: "back_boiler", label: "Back boiler" },
  { value: "none",    label: "No existing boiler" },
];

const LOCATIONS = [
  { value: "kitchen",         label: "Kitchen" },
  { value: "utility",         label: "Utility room" },
  { value: "airing_cupboard", label: "Airing cupboard" },
  { value: "garage",          label: "Garage" },
  { value: "loft",            label: "Loft" },
  { value: "other",           label: "Other" },
];

const FLUE_ORIENTATIONS = [
  { value: "horizontal", label: "Horizontal (through wall)" },
  { value: "vertical",   label: "Vertical (through roof)" },
  { value: "none",       label: "N/A — no existing flue" },
];

const FLUE_FLOORS = [
  { value: "ground", label: "Ground floor" },
  { value: "first",  label: "First floor" },
  { value: "second", label: "Second floor" },
  { value: "other",  label: "Other" },
  { value: "na",     label: "N/A" },
];

const REMOVAL_OPTIONS = [
  { key: "removal_boiler",       label: "Old boiler" },
  { key: "removal_cylinder",     label: "Hot water cylinder" },
  { key: "removal_cold_tank",    label: "Cold water tank" },
  { key: "removal_header_tank",  label: "Expansion / header tank" },
  { key: "removal_back_boiler",  label: "Back boiler & fire" },
  { key: "removal_pump",         label: "Existing pump" },
  { key: "removal_controls",     label: "Old controls / programmer" },
];

export default function StepCurrentBoiler({ survey, update, onNext, onBack }: Props) {
  const removals = survey.removalItems ?? [];

  function toggleRemoval(key: string) {
    const next = removals.includes(key) ? removals.filter((k) => k !== key) : [...removals, key];
    update({ removalItems: next });
  }

  return (
    <FormCard title="Current Boiler Details" subtitle="Record what is currently installed — shown on the customer quote">
      <Field label="Current fuel type">
        <Select value={survey.currentFuelType ?? ""} onChange={(v) => update({ currentFuelType: v })}
          options={[{ value: "", label: "Select…" }, ...FUEL_TYPES]} />
      </Field>

      <Field label="Current boiler type">
        <Select value={survey.currentBoilerType ?? ""} onChange={(v) => update({ currentBoilerType: v })}
          options={[{ value: "", label: "Select…" }, ...BOILER_TYPES]} />
      </Field>

      <Field label="Current boiler location">
        <Select value={survey.currentBoilerLocation ?? ""} onChange={(v) => update({ currentBoilerLocation: v })}
          options={[{ value: "", label: "Select…" }, ...LOCATIONS]} />
      </Field>

      <Field label="Current flue orientation">
        <Select value={survey.currentFlueOrientation ?? ""} onChange={(v) => update({ currentFlueOrientation: v })}
          options={[{ value: "", label: "Select…" }, ...FLUE_ORIENTATIONS]} />
      </Field>

      <Field label="Current flue floor level">
        <Select value={survey.currentFlueFloor ?? ""} onChange={(v) => update({ currentFlueFloor: v })}
          options={[{ value: "", label: "Select…" }, ...FLUE_FLOORS]} />
      </Field>

      <Field label="What will be removed / decommissioned?" hint="Select all that apply">
        <div className="space-y-2">
          {REMOVAL_OPTIONS.map((opt) => (
            <button key={opt.key} type="button" onClick={() => toggleRemoval(opt.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                removals.includes(opt.key) ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}>
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 ${
                removals.includes(opt.key) ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
              }`}>{removals.includes(opt.key) && "✓"}</div>
              <span className={`text-sm font-medium ${removals.includes(opt.key) ? "text-blue-700" : "text-slate-700"}`}>{opt.label}</span>
            </button>
          ))}
        </div>
      </Field>

      <NavButtons onNext={onNext} onBack={onBack} />
    </FormCard>
  );
}
