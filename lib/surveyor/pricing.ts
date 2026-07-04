import type { SurveyData, LineItem, TieredQuote, QuoteResult, Boiler, PricingItem } from "./types";

const VAT_RATE = 0.20; // default; callers can override via vatRate param

function item(pricing: Record<string, PricingItem>, key: string, qty = 1): LineItem | null {
  const p = pricing[key];
  if (!p || !p.active) return null;
  return { key, name: p.name, quantity: qty, unitPrice: p.price, total: p.price * qty, category: p.category, editable: true };
}

export function computeLineItems(survey: SurveyData, pricing: Record<string, PricingItem>): LineItem[] {
  const items: LineItem[] = [];
  const add = (key: string, qty = 1) => { const i = item(pricing, key, qty); if (i) items.push(i); };

  const isCombi = survey.newBoilerType === "COMBI";

  // Labour
  if (survey.labourType) add(survey.labourType);
  if (survey.newLocationExtraCost > 0) {
    items.push({
      key: "labour_relocation_extra",
      name: `Relocation extra${survey.newLocationDetails ? ` — ${survey.newLocationDetails}` : ""}`,
      quantity: 1,
      unitPrice: survey.newLocationExtraCost,
      total: survey.newLocationExtraCost,
      category: "LABOUR",
      editable: true,
    });
  }
  if (!isCombi && survey.conventionalToCombi) add("labour_conventional_to_combi");

  // Flue
  if (survey.flueKit) add(survey.flueKit);
  if (survey.plumeKit) add("flue_plume_kit");
  if (survey.flueExtensions1m > 0) add("flue_extension_1m", survey.flueExtensions1m);
  if (survey.flue90Elbows > 0) add("flue_elbow_90", survey.flue90Elbows);
  if (survey.flue45BendPairs > 0) add("flue_bend_45_pair", survey.flue45BendPairs);
  if (survey.plumeExtensions1m > 0) add("flue_plume_extension_1m", survey.plumeExtensions1m);
  if (survey.plume90Elbows > 0) add("flue_plume_elbow_90", survey.plume90Elbows);
  if (survey.flueClips && survey.flueClipsQty > 0) add("flue_clips", survey.flueClipsQty);
  if (survey.flueTerminalGuard && survey.flueTerminalGuard !== "none") add(survey.flueTerminalGuard);

  // Cylinder
  if (!isCombi && survey.newCylinder) {
    if (survey.cylinderLabour) add(survey.cylinderLabour);
    if (survey.cylinderSize) add(survey.cylinderSize);
  }

  // System components
  if (survey.systemComponents) {
    for (const key of survey.systemComponentItems ?? []) add(key);
    if (survey.system2Port22mmQty > 0) add("system_2port_22mm", survey.system2Port22mmQty);
    if (survey.system2Port28mmQty > 0) add("system_2port_28mm", survey.system2Port28mmQty);
  }
  if (survey.expansionVessel && survey.expansionVesselSize) add(survey.expansionVesselSize);
  if (survey.boosterPump && survey.boosterPumpPrice > 0) {
    items.push({
      key: "system_booster_pump",
      name: `Booster pump${survey.boosterPumpDescription ? ` — ${survey.boosterPumpDescription}` : ""}`,
      quantity: 1,
      unitPrice: survey.boosterPumpPrice,
      total: survey.boosterPumpPrice,
      category: "SYSTEM",
      editable: true,
    });
  }

  if (survey.electricalWorks === "new_fused_spur") add("electrical_fused_spur");

  // Condensate
  if (survey.condensateTermination) {
    if (survey.condensatePipeRun) add(survey.condensatePipeRun);
    for (const key of survey.condensateFittings ?? []) add(key);
  }

  // Controls
  if (survey.controls && survey.controls !== "ctrl_existing") add(survey.controls);

  if (survey.smartControlsUpsell && survey.smartControlsUpsellKey) {
    const p = pricing[survey.smartControlsUpsellKey];
    if (p && p.active) {
      items.push({
        key: survey.smartControlsUpsellKey,
        name: `Upgrade: ${p.name}`,
        quantity: 1,
        unitPrice: p.price,
        total: p.price,
        category: p.category,
        editable: true,
        upsell: true,
      });
    }
  }

  if (survey.filterModel) add(survey.filterModel);

  if (survey.gasRun && survey.gasRun !== "none") add(survey.gasRun);

  if (survey.copper15mm > 0) add("copper_15mm_per_metre", Math.ceil(survey.copper15mm / 3));
  if (survey.copper22mm > 0) add("copper_22mm_per_metre", Math.ceil(survey.copper22mm / 3));
  if (survey.copper28mm > 0) add("copper_28mm_per_metre", Math.ceil(survey.copper28mm / 3));

  if (survey.fittingsPack15mm > 0) add("fittings_pack_15mm", survey.fittingsPack15mm);
  if (survey.fittingsPack22mm > 0) add("fittings_pack_22mm", survey.fittingsPack22mm);
  if (survey.fittingsPack28mm > 0) add("fittings_pack_28mm", survey.fittingsPack28mm);

  if (survey.lagging15mm > 0) add("lagging_15mm_internal", survey.lagging15mm);
  if (survey.lagging22mm > 0) add("lagging_22mm_internal", survey.lagging22mm);
  if (survey.lagging32mmArmaflex > 0) add("lagging_32mm_armaflex", survey.lagging32mmArmaflex);

  if (survey.radValveType === "rad_trv_lockshield_pack") {
    if (survey.radTRVLockshieldPacks > 0) add("rv_15mm_trv_lockshield_pack", survey.radTRVLockshieldPacks);
  } else if (survey.radValveType === "rad_lockshield_pair") {
    if (survey.radLockshieldPairsOnly > 0) add("rv_15mm_lockshield_pair", survey.radLockshieldPairsOnly);
  }

  if (survey.radiatorsInstalling) {
    if (survey.radStraightSwap > 0) add("rad_straight_swap", survey.radStraightSwap);
    if (survey.radMinorAlteration > 0) add("rad_minor_alteration", survey.radMinorAlteration);
    if (survey.radNewInstall > 0) add("rad_new_install", survey.radNewInstall);
  }

  if (survey.systemClean && survey.systemClean !== "none") add(survey.systemClean);

  if (survey.powerflushupsell && survey.systemClean?.startsWith("clean_chem_")) {
    const pfKey = survey.systemClean.replace("clean_chem_", "clean_powerflush_");
    const p = pricing[pfKey];
    if (p && p.active) {
      items.push({
        key: pfKey,
        name: `Upgrade: ${p.name}`,
        quantity: 1,
        unitPrice: p.price,
        total: p.price,
        category: p.category,
        editable: true,
        upsell: true,
      });
    }
  }

  if (survey.inhibitor && survey.inhibitor !== "none") add(survey.inhibitor);

  return items;
}

export function buildTieredQuote(
  tier: "LOW" | "MID" | "HIGH",
  boilerId: string,
  boilers: Boiler[],
  lineItems: LineItem[],
  vatRate: number = VAT_RATE
): TieredQuote {
  const boiler = boilers.find((b) => b.id === boilerId)!;
  const boilerItem: LineItem = {
    key: `boiler_${boilerId}`,
    name: `${boiler.name} — ${boiler.warrantyYears}-year warranty`,
    quantity: 1,
    unitPrice: boiler.tradePrice,
    total: boiler.tradePrice,
    category: "BOILER",
    editable: true,
  };
  const allItems = [boilerItem, ...lineItems];
  const subtotal = allItems.reduce((s, i) => s + i.total, 0);
  const vatAmount = subtotal * vatRate;
  return {
    tier,
    boilerId,
    boilerName: boiler.name,
    boilerImageSlug: boiler.imageSlug ?? null,
    boilerPrice: boiler.tradePrice,
    lineItems: allItems,
    subtotal,
    vatAmount,
    total: subtotal + vatAmount,
  };
}

export function buildQuoteResult(
  survey: SurveyData,
  boilers: Boiler[],
  pricing: Record<string, PricingItem>,
  vatRate: number = VAT_RATE
): QuoteResult {
  const shared = computeLineItems(survey, pricing);
  return {
    low:  buildTieredQuote("LOW",  survey.lowBoilerId,  boilers, shared, vatRate),
    mid:  buildTieredQuote("MID",  survey.midBoilerId,  boilers, shared, vatRate),
    high: buildTieredQuote("HIGH", survey.highBoilerId, boilers, shared, vatRate),
  };
}
