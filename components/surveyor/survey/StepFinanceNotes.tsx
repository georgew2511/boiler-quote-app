"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Toggle, Select, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const FINANCE_TYPES = [
  { value: "120m_9.9",  label: "120 months at 9.9% APR" },
  { value: "60m_9.9",   label: "60 months at 9.9% APR" },
  { value: "24m_0",     label: "24 months interest free" },
];

const WHAT_HAPPENS_NEXT = [
  { value: "book_install",        label: "Book installation date" },
  { value: "send_quote_review",   label: "Customer to review quote and confirm" },
  { value: "awaiting_finance",    label: "Awaiting finance approval" },
  { value: "awaiting_decision",   label: "Customer thinking it over" },
];

export default function StepFinanceNotes({ survey, update, onNext, onBack }: Props) {
  return (
    <FormCard title="Finance & Next Steps" subtitle="Finance preference and any final notes">
      <Field label="Customer interested in finance?">
        <Toggle
          label={survey.financeRequested ? "Yes — finance options to be shown" : "No — cash / card payment"}
          checked={survey.financeRequested ?? false}
          onChange={(v) => update({ financeRequested: v })}
        />
      </Field>

      {survey.financeRequested && (
        <Field label="Preferred finance term">
          <Select
            value={survey.financeType ?? ""}
            onChange={(v) => update({ financeType: v })}
            options={[{ value: "", label: "No preference shown" }, ...FINANCE_TYPES]}
          />
        </Field>
      )}

      <Field label="What happens next?">
        <Select
          value={survey.whatHappensNext ?? ""}
          onChange={(v) => update({ whatHappensNext: v })}
          options={[{ value: "", label: "Select next step…" }, ...WHAT_HAPPENS_NEXT]}
        />
      </Field>

      <Field label="Special notes" hint="Anything to highlight on the quote or for the install team">
        <textarea
          value={survey.specialNotes ?? ""}
          onChange={(e) => update({ specialNotes: e.target.value })}
          rows={4}
          placeholder="e.g. Boiler in tight cupboard, customer has a dog, parking on street..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </Field>

      <NavButtons onNext={onNext} onBack={onBack} nextLabel="Review Quote →" />
    </FormCard>
  );
}
