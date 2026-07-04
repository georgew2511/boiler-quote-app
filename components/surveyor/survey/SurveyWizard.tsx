"use client";

import { useState } from "react";
import type { Boiler, PricingItem, SurveyData, QuoteResult } from "@/lib/surveyor/types";
import { buildQuoteResult } from "@/lib/surveyor/pricing";
import StepCustomer from "./StepCustomer";
import StepJobType from "./StepJobType";
import StepFlue from "./StepFlue";
import StepCylinder from "./StepCylinder";
import StepSystemComponents from "./StepSystemComponents";
import StepControlsFilter from "./StepControlsFilter";
import StepGasCopper from "./StepGasCopper";
import StepRadiators from "./StepRadiators";
import StepSystemClean from "./StepSystemClean";
import StepFinanceNotes from "./StepFinanceNotes";
import StepCurrentBoiler from "./StepCurrentBoiler";
import StepBoilerSelection from "./StepBoilerSelection";
import StepReview from "./StepReview";

interface Props {
  boilers: Boiler[];
  pricingItems: PricingItem[];
  companyId: string;
  vatRegistered?: boolean;
}

const STEP_LABELS = [
  "Customer",
  "Current Boiler",
  "Job Type",
  "Flue",
  "Cylinder",
  "System",
  "Controls",
  "Pipework",
  "Radiators",
  "Clean",
  "Finance",
  "Boilers",
  "Review",
];

const DEFAULT_SURVEY: Partial<SurveyData> = {
  newBoilerType: "COMBI",
  conventionalToCombi: false,
  newLocation: false,
  newLocationDetails: "",
  newLocationExtraCost: 0,
  systemComponents: false,
  systemComponentItems: [],
  system2Port22mmQty: 0,
  system2Port28mmQty: 0,
  expansionVessel: false,
  boosterPump: false,
  boosterPumpDescription: "",
  boosterPumpPrice: 0,
  newCylinder: false,
  cylinderType: "pressurised_indirect",
  plumeKit: false,
  flueExtensions1m: 0,
  flue90Elbows: 0,
  flue45BendPairs: 0,
  plumeExtensions1m: 0,
  plume90Elbows: 0,
  flueClips: false,
  flueClipsQty: 0,
  flueTerminalGuard: "none",
  copper15mm: 0,
  copper22mm: 0,
  copper28mm: 0,
  fittingsPack15mm: 0,
  fittingsPack22mm: 0,
  fittingsPack28mm: 0,
  lagging15mm: 0,
  lagging22mm: 0,
  lagging32mmArmaflex: 0,
  radiatorsInstalling: 0,
  radStraightSwap: 0,
  radMinorAlteration: 0,
  radNewInstall: 0,
  radTRVLockshieldPacks: 0,
  radLockshieldPairsOnly: 0,
  engineerDays: [],
  financeRequested: false,
  smartControlsUpsell: false,
  smartControlsUpsellKey: "",
  powerflushupsell: false,
  // Current boiler
  currentFuelType: "",
  currentBoilerType: "",
  currentBoilerLocation: "",
  currentFlueOrientation: "",
  currentFlueFloor: "",
  removalItems: [],
  // Installation requirements
  electricalWorks: "connect_existing",
  doubleExtensionLadders: false,
  scaffoldingRequired: false,
  safetyInspectionRequired: false,
  asbestosIdentified: "no",
  // Condensate
  condensateTermination: false,
  condensatePipeRun: "",
  condensateFittings: [],
};

export default function SurveyWizard({ boilers, pricingItems, companyId, vatRegistered = true }: Props) {
  const [step, setStep] = useState(0);
  const [survey, setSurvey] = useState<Partial<SurveyData>>(DEFAULT_SURVEY);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);

  const pricingMap = Object.fromEntries(pricingItems.map((p) => [p.key, p]));

  function update(patch: Partial<SurveyData>) {
    setSurvey((prev) => ({ ...prev, ...patch }));
  }

  function next() {
    if (step === STEP_LABELS.length - 2) { // step 11 = Boilers
      const result = buildQuoteResult(survey as SurveyData, boilers, pricingMap, vatRegistered ? 0.20 : 0);
      setQuoteResult(result);
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateQuote(result: QuoteResult) {
    setQuoteResult(result);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-blue-700">relode</span>
            <span className="ml-2 text-sm text-slate-500">Survey Tool</span>
          </div>
          <span className="text-sm text-slate-400">
            Step {step + 1} of {STEP_LABELS.length}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-3 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    i === step
                      ? "bg-blue-600 text-white"
                      : i < step
                      ? "bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200"
                      : "bg-slate-100 text-slate-400 cursor-default"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i < step ? "bg-blue-600 text-white" : i === step ? "bg-white text-blue-600" : "bg-slate-300 text-white"
                    }`}
                  >
                    {i < step ? "✓" : i + 1}
                  </span>
                  {label}
                </button>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`w-4 h-0.5 mx-0.5 ${i < step ? "bg-blue-300" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {step === 0  && <StepCustomer survey={survey} update={update} onNext={next} />}
        {step === 1  && <StepCurrentBoiler survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 2  && <StepJobType survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 3  && <StepFlue survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 4  && <StepCylinder survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 5  && <StepSystemComponents survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 6  && <StepControlsFilter survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 7  && <StepGasCopper survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 8  && <StepRadiators survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 9  && <StepSystemClean survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 10 && <StepFinanceNotes survey={survey} update={update} onNext={next} onBack={back} />}
        {step === 11 && (
          <StepBoilerSelection survey={survey} update={update} boilers={boilers} onNext={next} onBack={back} />
        )}
        {step === 12 && quoteResult && (
          <StepReview
            survey={survey as SurveyData}
            quoteResult={quoteResult}
            updateQuote={updateQuote}
            boilers={boilers}
            companyId={companyId}
            vatRate={vatRegistered ? 0.20 : 0}
            onBack={back}
          />
        )}
      </main>
    </div>
  );
}
