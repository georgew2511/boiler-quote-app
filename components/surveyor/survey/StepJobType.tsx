"use client";
import type { SurveyData, NewBoilerType } from "@/lib/surveyor/types";
import { FormCard, Field, OptionGrid, Toggle, Select, NavButtons } from "./FormComponents";

const ELECTRICAL_OPTIONS = [
  { value: "connect_existing", label: "Connect onto existing wiring" },
  { value: "new_fused_spur",   label: "New fused spur required" },
];

const ASBESTOS_OPTIONS = [
  { value: "no",      label: "No asbestos identified" },
  { value: "unknown", label: "Unknown — not confirmed" },
  { value: "yes",     label: "Yes — specialist required" },
];

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const LABOUR_OPTIONS: Record<NewBoilerType, { value: string; label: string }[]> = {
  COMBI:   [{ value: "labour_combi_same_location",    label: "Combi install"          }],
  SYSTEM:  [{ value: "labour_system_same_location",   label: "System boiler install"  }],
  REGULAR: [{ value: "labour_regular_same_location",  label: "Regular/heat-only install" }],
};

export default function StepJobType({ survey, update, onNext, onBack }: Props) {
  const boilerType = survey.newBoilerType ?? "COMBI";
  const isCombi = boilerType === "COMBI";
  const labourOptions = LABOUR_OPTIONS[boilerType];
  const valid = survey.labourType;

  function handleTypeChange(t: NewBoilerType) {
    // Clear combi-specific or regular-specific fields when switching type
    update({
      newBoilerType: t,
      labourType: LABOUR_OPTIONS[t][0].value,
      conventionalToCombi: t === "COMBI" ? survey.conventionalToCombi : false,
    });
  }

  return (
    <FormCard title="Job Type" subtitle="Specify what type of boiler installation this is">
      <Field label="Which boiler type will you be installing?">
        <OptionGrid<NewBoilerType>
          value={boilerType}
          onChange={handleTypeChange}
          options={[
            { value: "COMBI",   label: "Combi boiler",        icon: "🔄", description: "Instant hot water, no tank" },
            { value: "SYSTEM",  label: "System boiler",        icon: "📦", description: "Sealed system with cylinder" },
            { value: "REGULAR", label: "Regular / Heat-only",  icon: "🏗️", description: "Open vented — cylinder & cold tank" },
          ]}
        />
      </Field>

      {boilerType === "REGULAR" && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <strong>Regular / heat-only:</strong> open vented system — includes separate cold water feed &amp; expansion tank in loft, hot water cylinder, and circulating pump. Ensure cylinder and system components steps are completed.
        </div>
      )}

      {boilerType === "SYSTEM" && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          <strong>System boiler:</strong> sealed pressurised system — cylinder required, expansion vessel likely needed. Pump and motorised valves may be separate depending on cylinder type.
        </div>
      )}

      <Field label="Is the boiler moving to a new location?">
        <Toggle
          label={survey.newLocation ? "Yes — relocating to a new position" : "No — same location"}
          checked={survey.newLocation ?? false}
          onChange={(v) => update({ newLocation: v, newLocationDetails: v ? survey.newLocationDetails : "", newLocationExtraCost: v ? survey.newLocationExtraCost : 0 })}
          description="Tick if the boiler is being installed in a different position — you will be able to add the extra cost"
        />
      </Field>

      {survey.newLocation && (
        <>
          <Field label="Where is the boiler being moved to?" hint="e.g. Kitchen to utility room, airing cupboard to loft">
            <textarea
              value={survey.newLocationDetails ?? ""}
              onChange={(e) => update({ newLocationDetails: e.target.value })}
              rows={2}
              placeholder="e.g. Moving from kitchen cupboard to utility room — new pipework run required"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </Field>
          <Field label="Additional relocation cost (£)" hint="Extra labour charge for moving the boiler to a new position">
            <input
              type="number"
              min={0}
              step={50}
              value={survey.newLocationExtraCost ?? 0}
              onChange={(e) => update({ newLocationExtraCost: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </>
      )}

      {!isCombi && (
        <Field label="Converting from a conventional (regular) system?">
          <Toggle
            label={survey.conventionalToCombi ? "Yes — converting from conventional system" : "No — not converting"}
            checked={survey.conventionalToCombi ?? false}
            onChange={(v) => update({ conventionalToCombi: v })}
            description="Adds conventional-to-combi conversion labour (tank removal, capping off, etc)"
          />
        </Field>
      )}

      <div className="border-t border-slate-100 pt-4 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Installation requirements</p>

        <Field label="Electrical works">
          <Select
            value={survey.electricalWorks ?? "connect_existing"}
            onChange={(v) => update({ electricalWorks: v })}
            options={ELECTRICAL_OPTIONS}
          />
        </Field>

        <Field label="Double extension ladders required?">
          <Toggle
            label={survey.doubleExtensionLadders ? "Yes — double ladders required" : "No — standard access"}
            checked={survey.doubleExtensionLadders ?? false}
            onChange={(v) => update({ doubleExtensionLadders: v })}
          />
        </Field>

        <Field label="Scaffolding required?">
          <Toggle
            label={survey.scaffoldingRequired ? "Yes — scaffolding required (quote separately)" : "No scaffolding required"}
            checked={survey.scaffoldingRequired ?? false}
            onChange={(v) => update({ scaffoldingRequired: v })}
          />
        </Field>

        <Field label="Gas safety inspection required?">
          <Toggle
            label={survey.safetyInspectionRequired ? "Yes — safety inspection required" : "No — not required"}
            checked={survey.safetyInspectionRequired ?? false}
            onChange={(v) => update({ safetyInspectionRequired: v })}
          />
        </Field>

        <Field label="Asbestos identified?">
          <Select
            value={survey.asbestosIdentified ?? "no"}
            onChange={(v) => update({ asbestosIdentified: v })}
            options={ASBESTOS_OPTIONS}
          />
        </Field>
      </div>

      <NavButtons onNext={onNext} onBack={onBack} nextDisabled={!valid} />
    </FormCard>
  );
}
