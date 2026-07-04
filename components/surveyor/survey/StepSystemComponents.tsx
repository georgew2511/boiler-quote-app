"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Toggle, Select, Stepper, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

// Components that are single-quantity (tick or not)
const SINGLE_COMPONENTS = [
  { key: "system_pump_grundfos_ups3", label: "Grundfos UPS3 15-50/65 pump" },
  { key: "system_3port_22mm",         label: "Honeywell 3 port valve 22mm" },
  { key: "system_3port_28mm",         label: "Honeywell 3 port valve 28mm" },
  { key: "system_bypass_22mm",        label: "22mm bypass" },
];

const EXPANSION_VESSELS = [
  { value: "system_expansion_8L",  label: "8L expansion vessel"  },
  { value: "system_expansion_12L", label: "12L expansion vessel" },
  { value: "system_expansion_18L", label: "18L expansion vessel" },
  { value: "system_expansion_24L", label: "24L expansion vessel" },
  { value: "system_expansion_35L", label: "35L expansion vessel" },
];

export default function StepSystemComponents({ survey, update, onNext, onBack }: Props) {
  const selected = survey.systemComponentItems ?? [];

  function toggle(key: string) {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    update({ systemComponentItems: next });
  }

  const qty22 = survey.system2Port22mmQty ?? 0;
  const qty28 = survey.system2Port28mmQty ?? 0;

  return (
    <FormCard title="System Components" subtitle="Pump, valves, bypass and expansion vessel">
      <Field label="System components required? (pump, 3 port, bypass etc)">
        <Toggle
          label={survey.systemComponents ? "Yes — system components needed" : "No — not required"}
          checked={survey.systemComponents ?? false}
          onChange={(v) => update({ systemComponents: v })}
        />
      </Field>

      {survey.systemComponents && (
        <>
          <Field label="Which components?">
            <div className="space-y-2">
              {SINGLE_COMPONENTS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => toggle(c.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    selected.includes(c.key)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 ${
                    selected.includes(c.key) ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                  }`}>
                    {selected.includes(c.key) && "✓"}
                  </div>
                  <span className={`text-sm font-medium ${selected.includes(c.key) ? "text-blue-700" : "text-slate-700"}`}>
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Honeywell 2 port valve 22mm — how many?">
            <Stepper
              value={qty22}
              onChange={(v) => update({ system2Port22mmQty: v })}
              min={0}
              max={10}
              label="valves"
            />
          </Field>

          <Field label="Honeywell 2 port valve 28mm — how many?">
            <Stepper
              value={qty28}
              onChange={(v) => update({ system2Port28mmQty: v })}
              min={0}
              max={10}
              label="valves"
            />
          </Field>
        </>
      )}

      <Field label="Expansion vessel required?">
        <Toggle
          label={survey.expansionVessel ? "Expansion vessel required" : "No expansion vessel"}
          checked={survey.expansionVessel ?? false}
          onChange={(v) => update({ expansionVessel: v })}
        />
      </Field>

      {survey.expansionVessel && (
        <Field label="Which expansion vessel?">
          <Select
            value={survey.expansionVesselSize ?? ""}
            onChange={(v) => update({ expansionVesselSize: v })}
            options={[{ value: "", label: "Select size…" }, ...EXPANSION_VESSELS]}
          />
        </Field>
      )}

      <Field label="Cold water mains booster pump?">
        <Toggle
          label={survey.boosterPump ? "Booster pump required" : "No booster pump"}
          checked={survey.boosterPump ?? false}
          onChange={(v) => update({ boosterPump: v, boosterPumpDescription: "", boosterPumpPrice: 0 })}
        />
      </Field>

      {survey.boosterPump && (
        <>
          <Field label="Booster pump — make / model" hint="e.g. Stuart Turner Monsoon 2.0 bar">
            <input
              type="text"
              value={survey.boosterPumpDescription ?? ""}
              onChange={(e) => update({ boosterPumpDescription: e.target.value })}
              placeholder="e.g. Stuart Turner Monsoon 2.0 bar"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
          <Field label="Booster pump price (£)" hint="Supply and fit cost for this specific pump">
            <input
              type="number"
              min={0}
              step={10}
              value={survey.boosterPumpPrice ?? 0}
              onChange={(e) => update({ boosterPumpPrice: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </>
      )}

      <NavButtons onNext={onNext} onBack={onBack} />
    </FormCard>
  );
}
