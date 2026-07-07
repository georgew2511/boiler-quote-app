export type BoilerTier = "LOW" | "MID" | "HIGH";
export type NewBoilerType = "COMBI" | "SYSTEM" | "REGULAR";

export interface SurveyData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  postcode: string;
  customerCares: string;
  customerConcerns: string;

  currentFuelType: string;
  currentBoilerType: string;
  currentBoilerLocation: string;
  currentFlueOrientation: string;
  currentFlueFloor: string;
  removalItems: string[];

  newBoilerType: NewBoilerType;
  labourType: string;
  conventionalToCombi: boolean;
  newLocation: boolean;
  newLocationDetails: string;
  newLocationExtraCost: number;

  electricalWorks: string;
  doubleExtensionLadders: boolean;
  scaffoldingRequired: boolean;
  safetyInspectionRequired: boolean;
  asbestosIdentified: string;

  condensateTermination: boolean;
  condensatePipeRun: string;
  condensateFittings: string[];

  lowBoilerId: string;
  midBoilerId: string;
  highBoilerId: string;

  flueBrand: string;
  flueKit: string;
  plumeKit: boolean;
  flueExtensions1m: number;
  flue90Elbows: number;
  flue45BendPairs: number;
  plumeExtensions1m: number;
  plume90Elbows: number;
  flueClips: boolean;
  flueClipsQty: number;
  flueTerminalGuard: string;

  newCylinder: boolean;
  cylinderType: string;
  cylinderSize: string;
  cylinderLabour: string;

  systemComponents: boolean;
  systemComponentItems: string[];
  system2Port22mmQty: number;
  system2Port28mmQty: number;
  boosterPumpDescription: string;
  boosterPumpPrice: number;
  expansionVessel: boolean;
  expansionVesselSize: string;
  boosterPump: boolean;

  controls: string;
  filterSize: string;
  filterModel: string;
  smartControlsUpsell: boolean;
  smartControlsUpsellKey: string;

  fillingLoop: boolean;
  powerflushupsell: boolean;

  gasRun: string;
  copper15mm: number;
  copper22mm: number;
  copper28mm: number;
  fittingsPack15mm: number;
  fittingsPack22mm: number;
  fittingsPack28mm: number;
  lagging15mm: number;
  lagging22mm: number;
  lagging32mmArmaflex: number;

  radValveType: string;
  radTRVLockshieldPacks: number;
  radLockshieldPairsOnly: number;
  radiatorsInstalling: number;
  radStraightSwap: number;
  radMinorAlteration: number;
  radNewInstall: number;
  radNotes: string;

  systemClean: string;
  inhibitor: string;
  engineerDays: string[];

  financeRequested: boolean;
  financeType: string;
  whatHappensNext: string;
  specialNotes: string;
}

export interface LineItem {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: string;
  editable: boolean;
  upsell?: boolean;
}

export interface TieredQuote {
  tier: BoilerTier;
  boilerId: string;
  boilerName: string;
  boilerImageSlug: string | null;
  boilerPrice: number;
  lineItems: LineItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
}

export interface QuoteResult {
  low: TieredQuote;
  mid: TieredQuote;
  high: TieredQuote;
}

export interface Boiler {
  id: string;
  name: string;
  brand: string;
  model: string;
  kw: number;
  tier: BoilerTier;
  boilerType: string; // COMBI | SYSTEM | REGULAR
  tradePrice: number;
  warrantyYears: number;
  description: string | null;
  imageSlug: string | null;
  active: boolean;
}

export interface CompanySettings {
  companyName: string;
  logoSlug: string | null;
  primaryColor: string;
  phone: string;
  email: string;
  website: string;
  quoteValidityDays: number;
  workmanshipWarrantyMonths: number;
  googleReviewsUrl: string;
  trustpilotUrl: string;
  vatRegistered: boolean;
  financeEnabled: boolean;
  financeApr: number;
  financeDepositPercent: number;
  financeZeroPercent: boolean;
  financeZeroPercentTerms: number[];
  financeLoanTerms: number[];
  financeDisclosure: string;
  // Shown on customer quote page if populated (not yet editable in settings)
  whyChooseUs: string[];
  howToAccept: { method: string; detail: string }[];
  contractDetails: string;
  termsUrl: string;
  privacyUrl: string;
  companyNumber: string;
  fcaNumber: string;
}

export interface PricingItem {
  id: string;
  category: string;
  name: string;
  key: string;
  price: number;
  unit: string;
  active: boolean;
}

/** Map a raw Supabase boilers row to the surveyor Boiler shape */
export function mapSupabaseBoiler(row: {
  id: string;
  name: string;
  manufacturer: string;
  output: number;
  tier: string;
  category: string;
  price: number;
  warranty: number;
  image: string | null;
  status: string;
}): Boiler {
  const tierMap: Record<string, BoilerTier> = {
    Good: "LOW",
    Better: "MID",
    Best: "HIGH",
  };
  const typeMap: Record<string, string> = {
    combi: "COMBI",
    system: "SYSTEM",
    regular: "REGULAR",
  };
  return {
    id: row.id,
    name: row.name,
    brand: row.manufacturer,
    model: row.name,
    kw: row.output,
    tier: tierMap[row.tier] ?? "LOW",
    boilerType: typeMap[row.category] ?? "COMBI",
    tradePrice: row.price,
    warrantyYears: row.warranty,
    description: null,
    imageSlug: row.image,
    active: row.status === "Active",
  };
}

/** Map a raw Supabase company_settings row to the surveyor CompanySettings shape */
export function mapCompanySettings(row: Record<string, any>): CompanySettings {
  const zeroTerms: number[] = [];
  if (row.zero_percent_term_1) zeroTerms.push(Number(row.zero_percent_term_1));
  if (row.zero_percent_term_2) zeroTerms.push(Number(row.zero_percent_term_2));
  if (row.zero_percent_term_3) zeroTerms.push(Number(row.zero_percent_term_3));

  let loanTerms: number[] = [60, 120];
  if (row.finance_loan_terms) {
    try {
      const parsed = JSON.parse(row.finance_loan_terms);
      if (Array.isArray(parsed) && parsed.length > 0) loanTerms = parsed;
    } catch {}
  }

  return {
    companyName: row.company_name ?? "Your Company",
    logoSlug: row.logo_url ?? null,
    primaryColor: row.primary_colour ?? "#1d4ed8",
    phone: row.phone_number ?? "",
    email: row.email_address ?? "",
    website: row.website ?? "",
    quoteValidityDays: Number(row.quote_validity_days ?? 30),
    workmanshipWarrantyMonths: Number(row.workmanship_warranty_months ?? 12),
    googleReviewsUrl: row.google_reviews_url ?? "",
    trustpilotUrl: row.trustpilot_url ?? "",
    vatRegistered: row.vat_registered ?? false,
    financeEnabled: row.finance_enabled ?? true,
    financeApr: Number(row.apr ?? 9.9),
    financeDepositPercent: Number(row.finance_deposit_percent ?? 0),
    financeZeroPercent: zeroTerms.length > 0,
    financeZeroPercentTerms: zeroTerms.length > 0 ? zeroTerms : [24],
    financeLoanTerms: loanTerms,
    financeDisclosure: row.finance_disclosure ?? "",
    whyChooseUs: [],
    howToAccept: [],
    contractDetails: "",
    termsUrl: "",
    privacyUrl: "",
    companyNumber: "",
    fcaNumber: "",
  };
}

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Your Company",
  logoSlug: null,
  primaryColor: "#1d4ed8",
  phone: "",
  email: "",
  website: "",
  quoteValidityDays: 30,
  workmanshipWarrantyMonths: 12,
  googleReviewsUrl: "",
  trustpilotUrl: "",
  vatRegistered: true,
  financeEnabled: true,
  financeApr: 9.9,
  financeDepositPercent: 0,
  financeZeroPercent: true,
  financeZeroPercentTerms: [24],
  financeLoanTerms: [60, 120],
  financeDisclosure: "",
  whyChooseUs: [],
  howToAccept: [],
  contractDetails: "",
  termsUrl: "",
  privacyUrl: "",
  companyNumber: "",
  fcaNumber: "",
};
