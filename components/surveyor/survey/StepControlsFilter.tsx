"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Select, Toggle, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const CONTROLS = [
  { value: "ctrl_eph_wireless",         label: "EPH Controller Wireless" },
  { value: "ctrl_hive_combi",           label: "Hive Thermostat — Combi" },
  { value: "ctrl_hive_hwc",             label: "Hive Thermostat with Hot Water Control" },
  { value: "ctrl_honeywell_t6_wired",   label: "Honeywell T6 wired" },
  { value: "ctrl_honeywell_t6_wireless",label: "Honeywell T6 wireless" },
  { value: "ctrl_honeywell_t6_hwc",     label: "Honeywell T6 with Hot Water Control" },
  { value: "ctrl_nest",                 label: "Google Nest Learning Thermostat" },
  { value: "ctrl_nest_wireless_stand",  label: "Google Nest Wireless (inc. Stand)" },
  { value: "ctrl_worcester_comfort2",   label: "Worcester Comfort 2" },
  { value: "ctrl_worcester_easy_white", label: "Worcester Easy Control — White" },
  { value: "ctrl_worcester_easy_black", label: "Worcester Easy Control — Black" },
  { value: "ctrl_vaillant_vsmart",      label: "Vaillant vSMART thermostat" },
  { value: "ctrl_existing",             label: "Connect to existing controls (no charge)" },
];

const SMART_CONTROLS = [
  { value: "ctrl_hive_combi",          label: "Hive Thermostat — Combi" },
  { value: "ctrl_hive_hwc",            label: "Hive Thermostat with Hot Water Control" },
  { value: "ctrl_nest",                label: "Google Nest Learning Thermostat" },
  { value: "ctrl_nest_wireless_stand", label: "Google Nest Wireless (inc. Stand)" },
  { value: "ctrl_vaillant_vsmart",     label: "Vaillant vSMART thermostat" },
];

const FILTER_SIZES = [
  { value: "22mm", label: "22mm" },
  { value: "28mm", label: "28mm" },
];

const FILTER_MODELS: Record<string, { value: string; label: string }[]> = {
  "22mm": [
    { value: "filter_fernox_omega_22mm",        label: "Fernox Omega 22mm" },
    { value: "filter_magnaclean_micro2_22mm",   label: "Magnaclean Micro2 22mm" },
    { value: "filter_spirotech_spirovent_22mm",  label: "Spirotech SpiroVent 22mm" },
    { value: "filter_worcester_system_22mm",    label: "Worcester system filter 22mm" },
  ],
  "28mm": [
    { value: "filter_fernox_omega_28mm",        label: "Fernox Omega 28mm" },
    { value: "filter_magnaclean_micro2_28mm",   label: "Magnaclean Micro2 28mm" },
  ],
};

export default function StepControlsFilter({ survey, update, onNext, onBack }: Props) {
  const filterSize = survey.filterSize ?? "22mm";
  const modelOptions = FILTER_MODELS[filterSize] ?? [];

  function handleSizeChange(size: string) {
    update({ filterSize: size, filterModel: FILTER_MODELS[size]?.[0]?.value ?? "" });
  }

  // Don't offer the same control as the upsell
  const upsellOptions = SMART_CONTROLS.filter((s) => s.value !== survey.controls);

  return (
    <FormCard title="Controls & Filter" subtitle="Thermostat type and magnetic system filter">
      <Field label="Which controls / thermostat?">
        <Select
          value={survey.controls ?? ""}
          onChange={(v) => update({ controls: v, smartControlsUpsellKey: "" })}
          options={[{ value: "", label: "Select controls…" }, ...CONTROLS]}
        />
      </Field>

      <Field
        label="Offer smart controls upsell to customer?"
        hint="Customer will see a toggle on their quote to upgrade to smart controls"
      >
        <Toggle
          label={survey.smartControlsUpsell ? "Yes — show upsell on quote" : "No — no upsell offered"}
          checked={survey.smartControlsUpsell ?? false}
          onChange={(v) => update({ smartControlsUpsell: v, smartControlsUpsellKey: "" })}
        />
      </Field>

      {survey.smartControlsUpsell && (
        <Field label="Which smart control to upsell?">
          <Select
            value={survey.smartControlsUpsellKey ?? ""}
            onChange={(v) => update({ smartControlsUpsellKey: v })}
            options={[{ value: "", label: "Select smart control…" }, ...upsellOptions]}
          />
        </Field>
      )}

      <Field label="Filling loop required?">
        <Toggle
          label={survey.fillingLoop ? "Yes — include filling loop" : "No — not required"}
          checked={survey.fillingLoop ?? false}
          onChange={(v) => update({ fillingLoop: v })}
        />
      </Field>

      <Field label="Magnetic filter size">
        <div className="flex gap-3">
          {FILTER_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleSizeChange(s.value)}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                filterSize === s.value
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Which filter model?">
        <Select
          value={survey.filterModel ?? modelOptions[0]?.value ?? ""}
          onChange={(v) => update({ filterModel: v })}
          options={modelOptions}
        />
      </Field>

      <NavButtons onNext={onNext} onBack={onBack} />
    </FormCard>
  );
}
