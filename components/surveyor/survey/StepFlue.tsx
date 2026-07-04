"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Toggle, Stepper, Select, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const HORIZONTAL_KITS = [
  { value: "flue_horizontal_standard", label: "Standard telescopic flue" },
  { value: "flue_horizontal_long",     label: "Long telescopic flue" },
];

const VERTICAL_KITS = [
  { value: "flue_vertical_terminal_only", label: "Vertical flue — terminal only" },
  { value: "flue_vertical_small",         label: "Vertical flue kit — small" },
  { value: "flue_vertical_medium",        label: "Vertical flue kit — medium" },
  { value: "flue_vertical_large",         label: "Vertical flue kit — large" },
];

const HORIZONTAL_KEYS = new Set(HORIZONTAL_KITS.map((k) => k.value));

const TERMINAL_GUARDS = [
  { value: "none",                  label: "None required" },
  { value: "flue_guard_11x6",       label: "11\" × 6\" terminal guard" },
  { value: "flue_guard_11_5x9",     label: "11.5\" × 9\" terminal guard" },
  { value: "flue_guard_10x4",       label: "10\" × 4\" terminal guard" },
  { value: "flue_guard_plume_hole", label: "Terminal guard with plume kit hole" },
];

export default function StepFlue({ survey, update, onNext, onBack }: Props) {
  const selectedKit = survey.flueKit ?? "";
  const isHorizontal = HORIZONTAL_KEYS.has(selectedKit);
  const isVertical = selectedKit && !HORIZONTAL_KEYS.has(selectedKit);

  function handleOrientationChange(orientation: "horizontal" | "vertical") {
    if (orientation === "horizontal") {
      update({ flueKit: HORIZONTAL_KITS[0].value, plumeKit: false });
    } else {
      update({ flueKit: VERTICAL_KITS[0].value, plumeKit: false });
    }
  }

  function handleKitChange(v: string) {
    const nowHorizontal = HORIZONTAL_KEYS.has(v);
    update({ flueKit: v, plumeKit: nowHorizontal ? (survey.plumeKit ?? false) : false });
  }

  const orientation = isHorizontal ? "horizontal" : isVertical ? "vertical" : "";

  return (
    <FormCard title="Flue" subtitle="Select flue type and any additional fittings required">

      <Field label="Flue orientation">
        <div className="flex gap-3">
          {[
            { value: "horizontal", label: "Horizontal", hint: "Through the wall" },
            { value: "vertical",   label: "Vertical",   hint: "Through the roof" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleOrientationChange(opt.value as "horizontal" | "vertical")}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all ${
                orientation === opt.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className={`text-sm font-semibold ${orientation === opt.value ? "text-blue-700" : "text-slate-700"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{opt.hint}</p>
            </button>
          ))}
        </div>
      </Field>

      {isHorizontal && (
        <Field label="Which horizontal flue kit?">
          <Select
            value={selectedKit}
            onChange={handleKitChange}
            options={HORIZONTAL_KITS}
          />
        </Field>
      )}

      {isVertical && (
        <Field label="Which vertical flue kit?">
          <Select
            value={selectedKit}
            onChange={handleKitChange}
            options={VERTICAL_KITS}
          />
        </Field>
      )}

      {isHorizontal && (
        <Field label="Plume kit required?" hint="Redirects flue exhaust away from windows or walls">
          <Toggle
            label={survey.plumeKit ? "Yes — plume kit required" : "No plume kit needed"}
            checked={survey.plumeKit ?? false}
            onChange={(v) => update({ plumeKit: v })}
          />
        </Field>
      )}

      {selectedKit && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="1m flue extensions">
              <Stepper value={survey.flueExtensions1m ?? 0} onChange={(v) => update({ flueExtensions1m: v })} min={0} max={10} label="extensions" />
            </Field>
            <Field label="90° elbows">
              <Stepper value={survey.flue90Elbows ?? 0} onChange={(v) => update({ flue90Elbows: v })} min={0} max={10} label="elbows" />
            </Field>
            <Field label="45° bends (pairs)">
              <Stepper value={survey.flue45BendPairs ?? 0} onChange={(v) => update({ flue45BendPairs: v })} min={0} max={10} label="pairs" />
            </Field>
            {survey.plumeKit && (<>
              <Field label="Plume extensions 1m">
                <Stepper value={survey.plumeExtensions1m ?? 0} onChange={(v) => update({ plumeExtensions1m: v })} min={0} max={5} label="extensions" />
              </Field>
              <Field label="Plume 90° elbows">
                <Stepper value={survey.plume90Elbows ?? 0} onChange={(v) => update({ plume90Elbows: v })} min={0} max={5} label="elbows" />
              </Field>
            </>)}
          </div>

          <Field label="Flue clips required?">
            <Toggle
              label={survey.flueClips ? "Flue clips required" : "No flue clips needed"}
              checked={survey.flueClips ?? false}
              onChange={(v) => update({ flueClips: v, flueClipsQty: v ? 1 : 0 })}
            />
          </Field>

          {survey.flueClips && (
            <Field label="How many flue clips?">
              <Stepper
                value={survey.flueClipsQty ?? 1}
                onChange={(v) => update({ flueClipsQty: v })}
                min={1}
                max={20}
                label="clips"
              />
            </Field>
          )}

          <Field label="Flue terminal guard">
            <Select
              value={survey.flueTerminalGuard ?? "none"}
              onChange={(v) => update({ flueTerminalGuard: v })}
              options={TERMINAL_GUARDS}
            />
          </Field>
        </>
      )}

      <NavButtons onNext={onNext} onBack={onBack} nextDisabled={!selectedKit} />
    </FormCard>
  );
}
