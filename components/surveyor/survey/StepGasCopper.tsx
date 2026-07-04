"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Select, Stepper, Toggle, NavButtons } from "./FormComponents";

const CONDENSATE_PIPE_RUNS = [
  { value: "",                          label: "Select pipe run…" },
  { value: "condensate_internal_3m",    label: "Internal — up to 3m" },
  { value: "condensate_internal_6m",    label: "Internal — up to 6m" },
  { value: "condensate_internal_9m",    label: "Internal — up to 9m" },
  { value: "condensate_external_3m",    label: "External (lagged) — up to 3m" },
  { value: "condensate_external_6m",    label: "External (lagged) — up to 6m" },
];

const CONDENSATE_FITTINGS = [
  { key: "condensate_mcalpine_clamp",   label: "McAlpine waste pipe clamp" },
  { key: "condensate_strap_boss",       label: "Strap-on boss" },
  { key: "condensate_rainwater_tee",    label: "Rainwater downpipe tee" },
  { key: "condensate_soil_pipe",        label: "Soil pipe connection" },
  { key: "condensate_standpipe",        label: "Standpipe / open end into drain" },
  { key: "condensate_pump",             label: "Condensate pump (gravity not possible)" },
];

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const GAS_RUNS = [
  { value: "",                      label: "No gas run required" },
  { value: "gas_meter_tail_upgrade",label: "Meter tail upgrade only" },
  { value: "gas_tee_only",          label: "Gas tee only" },
  { value: "gas_run_5m",            label: "Gas run up to 5m" },
];

export default function StepGasCopper({ survey, update, onNext, onBack }: Props) {
  return (
    <FormCard title="Gas Run & Pipework" subtitle="Enter metres of copper pipe and lagging required">
      <Field label="Gas work required?">
        <Select
          value={survey.gasRun ?? ""}
          onChange={(v) => update({ gasRun: v })}
          options={GAS_RUNS}
        />
      </Field>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Copper pipe (metres)</p>
        <div className="space-y-3">
          <Field label="15mm copper (m)">
            <Stepper value={survey.copper15mm ?? 0} onChange={(v) => update({ copper15mm: v })} min={0} max={50} label="m" />
          </Field>
          <Field label="22mm copper (m)">
            <Stepper value={survey.copper22mm ?? 0} onChange={(v) => update({ copper22mm: v })} min={0} max={50} label="m" />
          </Field>
          <Field label="28mm copper (m)">
            <Stepper value={survey.copper28mm ?? 0} onChange={(v) => update({ copper28mm: v })} min={0} max={50} label="m" />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-1">Fittings packs</p>
        <p className="text-xs text-slate-400 mb-3">Number of fittings packs required per pipe size</p>
        <div className="space-y-3">
          <Field label="15mm fittings packs">
            <Stepper value={survey.fittingsPack15mm ?? 0} onChange={(v) => update({ fittingsPack15mm: v })} min={0} max={10} label="packs" />
          </Field>
          <Field label="22mm fittings packs">
            <Stepper value={survey.fittingsPack22mm ?? 0} onChange={(v) => update({ fittingsPack22mm: v })} min={0} max={10} label="packs" />
          </Field>
          <Field label="28mm fittings packs">
            <Stepper value={survey.fittingsPack28mm ?? 0} onChange={(v) => update({ fittingsPack28mm: v })} min={0} max={10} label="packs" />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Pipe lagging (metres)</p>
        <div className="space-y-3">
          <Field label="15mm lagging (m)">
            <Stepper value={survey.lagging15mm ?? 0} onChange={(v) => update({ lagging15mm: v })} min={0} max={50} label="m" />
          </Field>
          <Field label="22mm lagging (m)">
            <Stepper value={survey.lagging22mm ?? 0} onChange={(v) => update({ lagging22mm: v })} min={0} max={50} label="m" />
          </Field>
          <Field label="32mm Armaflex (m)">
            <Stepper value={survey.lagging32mmArmaflex ?? 0} onChange={(v) => update({ lagging32mmArmaflex: v })} min={0} max={50} label="m" />
          </Field>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Condensate termination</p>

        <Field label="Condensate termination required?">
          <Toggle
            label={survey.condensateTermination ? "Yes — condensate work required" : "No — connect to existing / not required"}
            checked={survey.condensateTermination ?? false}
            onChange={(v) => update({ condensateTermination: v, condensatePipeRun: "", condensateFittings: [] })}
          />
        </Field>

        {survey.condensateTermination && (
          <>
            <Field label="Condensate pipe run">
              <Select
                value={survey.condensatePipeRun ?? ""}
                onChange={(v) => update({ condensatePipeRun: v })}
                options={CONDENSATE_PIPE_RUNS}
              />
            </Field>

            <Field label="Condensate fittings required" hint="Select all that apply">
              <div className="space-y-2">
                {CONDENSATE_FITTINGS.map((f) => {
                  const selected = (survey.condensateFittings ?? []).includes(f.key);
                  return (
                    <button key={f.key} type="button"
                      onClick={() => {
                        const current = survey.condensateFittings ?? [];
                        update({ condensateFittings: selected ? current.filter((k) => k !== f.key) : [...current, f.key] });
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 ${
                        selected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                      }`}>{selected && "✓"}</div>
                      <span className={`text-sm font-medium ${selected ? "text-blue-700" : "text-slate-700"}`}>{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        )}
      </div>

      <NavButtons onNext={onNext} onBack={onBack} />
    </FormCard>
  );
}
