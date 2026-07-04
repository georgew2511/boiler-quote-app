"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Select, Toggle, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const CHEM_FLUSH_OPTIONS = [
  { value: "clean_chem_up_to_5",  label: "Chemical flush — up to 5 rads"  },
  { value: "clean_chem_up_to_10", label: "Chemical flush — up to 10 rads" },
  { value: "clean_chem_up_to_15", label: "Chemical flush — up to 15 rads" },
  { value: "clean_chem_over_15",  label: "Chemical flush — over 15 rads"  },
];

const POWERFLUSH_OPTIONS = [
  { value: "clean_powerflush_up_to_5",  label: "Powerflush — up to 5 rads"  },
  { value: "clean_powerflush_up_to_10", label: "Powerflush — up to 10 rads" },
  { value: "clean_powerflush_up_to_15", label: "Powerflush — up to 15 rads" },
  { value: "clean_powerflush_over_15",  label: "Powerflush — over 15 rads"  },
];

const CLEAN_OPTIONS = [
  { value: "", label: "No system clean required" },
  ...CHEM_FLUSH_OPTIONS,
  ...POWERFLUSH_OPTIONS,
];

const INHIBITOR_OPTIONS = [
  { value: "",                label: "No inhibitor required" },
  { value: "inhibitor_500ml", label: "Inhibitor 500ml"       },
  { value: "inhibitor_1L",    label: "Inhibitor 1L"          },
  { value: "inhibitor_2L",    label: "Inhibitor 2L"          },
];


export default function StepSystemClean({ survey, update, onNext, onBack }: Props) {
  const days = survey.engineerDays ?? [];
  const isChemFlush = (survey.systemClean ?? "").startsWith("clean_chem_");

  function handleCleanChange(v: string) {
    // Clear powerflush upsell if switching away from chem flush
    const stillChem = v.startsWith("clean_chem_flush_");
    update({ systemClean: v, powerflushupsell: stillChem ? survey.powerflushupsell : false });
  }

  function toggleDay(day: string) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    update({ engineerDays: next });
  }

  const DAY_OPTIONS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

  return (
    <FormCard title="System Clean & Schedule" subtitle="Flush type, inhibitor and engineer days on site">
      <Field label="System clean required?">
        <Select
          value={survey.systemClean ?? ""}
          onChange={handleCleanChange}
          options={CLEAN_OPTIONS}
        />
      </Field>

      {isChemFlush && (
        <Field
          label="Offer powerflush upgrade to customer?"
          hint="Customer will see a toggle on their quote to upgrade from chemical flush to powerflush"
        >
          <Toggle
            label={survey.powerflushupsell ? "Yes — show powerflush upsell on quote" : "No — no upsell offered"}
            checked={survey.powerflushupsell ?? false}
            onChange={(v) => update({ powerflushupsell: v })}
          />
        </Field>
      )}

      <Field label="Inhibitor">
        <Select
          value={survey.inhibitor ?? ""}
          onChange={(v) => update({ inhibitor: v })}
          options={INHIBITOR_OPTIONS}
        />
      </Field>

      <Field label="Engineer days on site" hint="Select how many days the job will take">
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                days.includes(day)
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        {days.length > 0 && (
          <p className="text-xs text-slate-500 mt-2">{days.length} day{days.length > 1 ? "s" : ""} selected</p>
        )}
      </Field>

      <NavButtons onNext={onNext} onBack={onBack} />
    </FormCard>
  );
}
