"use client";
import type { SurveyData } from "@/lib/surveyor/types";
import { FormCard, Field, Toggle, Select, OptionGrid, NavButtons } from "./FormComponents";

interface Props { survey: Partial<SurveyData>; update: (p: Partial<SurveyData>) => void; onNext: () => void; onBack: () => void; }

const CYLINDER_LABOUR = [
  { value: "cylinder_labour_straight_swap",          label: "Straight swap existing cylinder" },
  { value: "cylinder_labour_vented_to_pressurised",  label: "Vented to pressurised conversion" },
  { value: "cylinder_labour_new_install",            label: "New install next to boiler" },
];

const CYLINDERS_PRESSURISED_VERTICAL = [
  { value: "cylinder_90L_indirect",  label: "90L"  },
  { value: "cylinder_125L_indirect", label: "125L" },
  { value: "cylinder_150L_indirect", label: "150L" },
  { value: "cylinder_170L_indirect", label: "170L" },
  { value: "cylinder_200L_indirect", label: "200L" },
  { value: "cylinder_250L_indirect", label: "250L" },
  { value: "cylinder_300L_indirect", label: "300L" },
];

const CYLINDERS_PRESSURISED_HORIZONTAL = [
  { value: "cylinder_90L_indirect_horizontal",  label: "90L"  },
  { value: "cylinder_125L_indirect_horizontal", label: "125L" },
  { value: "cylinder_150L_indirect_horizontal", label: "150L" },
  { value: "cylinder_170L_indirect_horizontal", label: "170L" },
  { value: "cylinder_200L_indirect_horizontal", label: "200L" },
  { value: "cylinder_250L_indirect_horizontal", label: "250L" },
  { value: "cylinder_300L_indirect_horizontal", label: "300L" },
];

const CYLINDERS_VENTED = [
  { value: "cylinder_36x18_vented", label: "36×18\" indirect vented" },
  { value: "cylinder_42x18_vented", label: "42×18\" indirect vented" },
];

const TANK_TYPES = [
  { value: "pressurised_vertical",   label: "Pressurised vertical",   icon: "💧" },
  { value: "pressurised_horizontal", label: "Pressurised horizontal",  icon: "↔️" },
  { value: "vented_indirect",        label: "Vented indirect",         icon: "🪣" },
];

function getSizeOptions(cylType: string) {
  if (cylType === "pressurised_horizontal") return CYLINDERS_PRESSURISED_HORIZONTAL;
  if (cylType === "vented_indirect") return CYLINDERS_VENTED;
  return CYLINDERS_PRESSURISED_VERTICAL;
}

function getSizeLabel(cylType: string) {
  if (cylType === "vented_indirect") return "Cylinder size";
  return "Cylinder size (litres)";
}

export default function StepCylinder({ survey, update, onNext, onBack }: Props) {
  const cylType = survey.cylinderType ?? "pressurised_vertical";
  const sizeOptions = getSizeOptions(cylType);

  return (
    <FormCard title="Cylinder" subtitle="Hot water cylinder details for system / regular boiler installations">
      <Field label="Installing a new cylinder?">
        <Toggle
          label={survey.newCylinder ? "Yes — new cylinder required" : "No — keeping existing cylinder"}
          checked={survey.newCylinder ?? false}
          onChange={(v) => update({ newCylinder: v })}
        />
      </Field>

      {survey.newCylinder && (<>
        <Field label="Cylinder type">
          <OptionGrid
            value={cylType}
            onChange={(v) => update({ cylinderType: v, cylinderSize: "" })}
            options={TANK_TYPES}
          />
        </Field>

        <Field label={getSizeLabel(cylType)}>
          <Select
            value={survey.cylinderSize ?? ""}
            onChange={(v) => update({ cylinderSize: v })}
            options={[{ value: "", label: "Select size…" }, ...sizeOptions]}
          />
        </Field>

        <Field label="Installation labour">
          <Select
            value={survey.cylinderLabour ?? ""}
            onChange={(v) => update({ cylinderLabour: v })}
            options={[{ value: "", label: "Select labour type…" }, ...CYLINDER_LABOUR]}
          />
        </Field>
      </>)}

      <NavButtons onNext={onNext} onBack={onBack} />
    </FormCard>
  );
}
