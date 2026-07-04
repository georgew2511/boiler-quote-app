"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Input, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; }

export default function StepCustomer({ survey, update, onNext }: Props) {
  const valid = survey.customerName?.trim() && survey.customerEmail?.trim() && survey.customerPhone?.trim() && survey.postcode?.trim();
  return (
    <FormCard title="Customer Details" subtitle="Contact information and initial notes from your conversation">
      <Field label="Full name">
        <Input value={survey.customerName ?? ""} onChange={(v) => update({ customerName: v })} placeholder="e.g. John Smith" />
      </Field>
      <Field label="Email address">
        <Input type="email" value={survey.customerEmail ?? ""} onChange={(v) => update({ customerEmail: v })} placeholder="john@example.com" />
      </Field>
      <Field label="Phone number">
        <Input type="tel" value={survey.customerPhone ?? ""} onChange={(v) => update({ customerPhone: v })} placeholder="07700 900 000" />
      </Field>
      <Field label="Postcode">
        <Input value={survey.postcode ?? ""} onChange={(v) => update({ postcode: v.toUpperCase() })} placeholder="KT3 3TY" />
      </Field>
      <Field label="What does the customer care about the most?" hint="Note what matters to them so you can address it in your pitch">
        <textarea
          value={survey.customerCares ?? ""}
          onChange={(e) => update({ customerCares: e.target.value })}
          rows={2}
          placeholder="e.g. Reliability, warranty length, minimal disruption..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </Field>
      <Field label="Any concerns we can help overcome?" hint="Objections or worries mentioned by the customer">
        <textarea
          value={survey.customerConcerns ?? ""}
          onChange={(e) => update({ customerConcerns: e.target.value })}
          rows={2}
          placeholder="e.g. Worried about cost, had a bad experience before..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </Field>
      <NavButtons onNext={onNext} nextDisabled={!valid} />
    </FormCard>
  );
}
