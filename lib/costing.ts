export interface RoutingStep {
  step_no: number;
  operation_name: string;
  machine_code: string;
  cycle_time_minutes: number;
  setup_time_minutes: number;
  machine_hour_rate_inr?: number; // Optional override; else fetched from rate master
}

export interface VolumeTier {
  volume: number;
  batch_size: number;
  label: string;
}

export interface CostingInputs {
  material_grade: string;
  gross_weight_kg: number;
  net_weight_kg: number;
  routing_steps: RoutingStep[];
  volume_tier: VolumeTier;
  factory_overhead_pct?: number; // e.g. 12%
  quality_inspection_pct?: number; // e.g. 3%
  margin_pct?: number; // e.g. 15%
  packaging_inr?: number; // e.g. 4.5 ₹/part
  freight_inr?: number; // e.g. 3.0 ₹/part
  gst_pct?: number; // e.g. 18%
}

export interface OperationCostDetail {
  step_no: number;
  operation_name: string;
  machine_code: string;
  cycle_time_minutes: number;
  machine_hour_rate_inr: number;
  machining_cost_per_piece: number;
  setup_time_minutes: number;
  setup_cost_per_piece: number;
  total_operation_cost_per_piece: number;
}

export interface CostBreakdown {
  volume: number;
  batch_size: number;
  label: string;
  
  // Material breakdown
  material_grade: string;
  material_rate_per_kg: number;
  gross_weight_kg: number;
  net_weight_kg: number;
  scrap_weight_kg: number;
  scrap_rate_per_kg: number;
  gross_material_cost: number;
  scrap_recovery_credit: number;
  net_material_cost: number;

  // Machining / Routing breakdown
  operations: OperationCostDetail[];
  total_machining_cost: number;
  total_setup_cost: number;
  total_routing_cost: number;

  // Prime & Overheads
  prime_manufacturing_cost: number;
  factory_overhead_cost: number;
  quality_inspection_cost: number;
  logistics_packaging_cost: number;
  total_ex_factory_cost: number;

  // Margin & Selling Price
  margin_pct: number;
  margin_amount: number;
  unit_price_excl_gst: number;
  gst_pct: number;
  gst_amount: number;
  final_unit_price_incl_gst: number;

  // Annual Totals & High-Value Approval Gate (> ₹25 Lakhs)
  annual_contract_value_excl_gst: number;
  annual_contract_value_incl_gst: number;
  requires_sales_head_approval: boolean;
}

export interface RateMasterDatabase {
  material_rates: Array<{
    id: string;
    material_grade: string;
    base_rate_per_kg: number;
    effective_from: string;
    effective_to: string | null;
  }>;
  machine_hour_rates: Array<{
    id: string;
    machine_code: string;
    hour_rate_inr: number;
    setup_rate_inr: number;
    effective_from: string;
    effective_to: string | null;
  }>;
  scrap_recovery_rates: Array<{
    id: string;
    material_category: string;
    credit_rate_per_kg: number;
    effective_from: string;
    effective_to: string | null;
  }>;
  standard_overheads?: {
    factory_overhead_percent?: number;
    quality_inspection_percent?: number;
    standard_profit_margin_percent?: number;
    packaging_per_piece_inr?: number;
    freight_per_piece_inr?: number;
    gst_percent?: number;
  };
}

// Defensive number coercion
function safeNum(val: any, fallback: number = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function safeStr(val: any, fallback: string = ''): string {
  return typeof val === 'string' ? val.trim() : fallback;
}

function round2(val: number): number {
  return Math.round((safeNum(val) + Number.EPSILON) * 100) / 100;
}

function round3(val: number): number {
  return Math.round((safeNum(val) + Number.EPSILON) * 1000) / 1000;
}

/**
 * Deterministic Costing Engine.
 * Calculates exact production costs, multi-volume price breaks, and checks high-value approval gates.
 * Hardened with defensive bounds against NaN, division by zero, and invalid types.
 */
export function calculatePartCost(
  inputs: CostingInputs,
  rates: RateMasterDatabase,
  asOfDate: string = new Date().toISOString().split('T')[0]
): CostBreakdown {
  const safeDate = safeStr(asOfDate) || new Date().toISOString().split('T')[0];
  const inputGrade = safeStr(inputs.material_grade, 'EN8').toLowerCase();

  // 1. Resolve Material Rate as of the specified date
  const matList = Array.isArray(rates?.material_rates) ? rates.material_rates : [];
  const matEntry = matList.find(
    (m) =>
      safeStr(m.material_grade).toLowerCase() === inputGrade &&
      m.effective_from <= safeDate &&
      (!m.effective_to || m.effective_to >= safeDate)
  ) || matList.find(
    (m) => safeStr(m.material_grade).toLowerCase() === inputGrade
  );

  const matRatePerKg = matEntry ? safeNum(matEntry.base_rate_per_kg, 76.5) : 76.5;
  const scrapList = Array.isArray(rates?.scrap_recovery_rates) ? rates.scrap_recovery_rates : [];
  const scrapRatePerKg = scrapList[0]?.credit_rate_per_kg ? safeNum(scrapList[0].credit_rate_per_kg, 32.0) : 32.0;

  const rawGross = safeNum(inputs.gross_weight_kg, 1.0);
  const grossWt = Math.max(0, rawGross);
  const rawNet = safeNum(inputs.net_weight_kg, grossWt * 0.8);
  const netWt = Math.min(grossWt, Math.max(0, rawNet));
  const scrapWt = Math.max(0, grossWt - netWt);

  const grossMaterialCost = grossWt * matRatePerKg;
  const scrapRecoveryCredit = scrapWt * scrapRatePerKg;
  const netMaterialCost = Math.max(0, grossMaterialCost - scrapRecoveryCredit);

  // 2. Resolve Routing Steps
  let totalMachiningCost = 0;
  let totalSetupCost = 0;
  const operations: OperationCostDetail[] = [];

  const rawBatch = safeNum(inputs.volume_tier?.batch_size, 1000);
  const batchSize = rawBatch > 0 ? Math.round(rawBatch) : 1000;

  const steps = Array.isArray(inputs.routing_steps) ? inputs.routing_steps : [];
  const mhrList = Array.isArray(rates?.machine_hour_rates) ? rates.machine_hour_rates : [];

  for (const step of steps) {
    const stepMachineCode = safeStr(step.machine_code).toLowerCase();
    const mhrEntry = mhrList.find(
      (m) =>
        safeStr(m.machine_code).toLowerCase() === stepMachineCode &&
        m.effective_from <= safeDate &&
        (!m.effective_to || m.effective_to >= safeDate)
    ) || mhrList.find(
      (m) => safeStr(m.machine_code).toLowerCase() === stepMachineCode
    );

    const hourRate = step.machine_hour_rate_inr !== undefined
      ? safeNum(step.machine_hour_rate_inr, 850.0)
      : (mhrEntry ? safeNum(mhrEntry.hour_rate_inr, 850.0) : 850.0);

    const setupRate = mhrEntry ? safeNum(mhrEntry.setup_rate_inr, 450.0) : 450.0;

    const cycleMins = Math.max(0, safeNum(step.cycle_time_minutes, 1.0));
    const setupMins = Math.max(0, safeNum(step.setup_time_minutes, 30.0));

    // Direct cycle time machining cost = (cycle_time_minutes / 60) * hourRate
    const machiningCostPerPiece = (cycleMins / 60) * hourRate;

    // Setup amortization per piece = (setup_time_minutes / 60 * setupRate) / batchSize
    const setupCostPerPiece = ((setupMins / 60) * setupRate) / batchSize;

    const opTotal = machiningCostPerPiece + setupCostPerPiece;

    totalMachiningCost += machiningCostPerPiece;
    totalSetupCost += setupCostPerPiece;

    operations.push({
      step_no: safeNum(step.step_no, operations.length + 1),
      operation_name: safeStr(step.operation_name, 'Machining Operation'),
      machine_code: safeStr(step.machine_code, 'CNC-GENERIC'),
      cycle_time_minutes: round2(cycleMins),
      machine_hour_rate_inr: round2(hourRate),
      machining_cost_per_piece: round2(machiningCostPerPiece),
      setup_time_minutes: round2(setupMins),
      setup_cost_per_piece: round2(setupCostPerPiece),
      total_operation_cost_per_piece: round2(opTotal),
    });
  }

  const totalRoutingCost = totalMachiningCost + totalSetupCost;

  // 3. Overheads & Logistics
  const factoryOverheadPct = safeNum(
    inputs.factory_overhead_pct,
    safeNum(rates?.standard_overheads?.factory_overhead_percent, 12.0)
  );
  const qualityInspectionPct = safeNum(
    inputs.quality_inspection_pct,
    safeNum(rates?.standard_overheads?.quality_inspection_percent, 3.0)
  );

  // Profit margin clamped between 0% and 90% to avoid division by zero / negative denominator
  const rawMargin = safeNum(
    inputs.margin_pct,
    safeNum(rates?.standard_overheads?.standard_profit_margin_percent, 15.0)
  );
  const marginPct = Math.min(90.0, Math.max(0.0, rawMargin));

  const packagingInr = safeNum(
    inputs.packaging_inr,
    safeNum(rates?.standard_overheads?.packaging_per_piece_inr, 4.5)
  );
  const freightInr = safeNum(
    inputs.freight_inr,
    safeNum(rates?.standard_overheads?.freight_per_piece_inr, 3.0)
  );
  const gstPct = safeNum(
    inputs.gst_pct,
    safeNum(rates?.standard_overheads?.gst_percent, 18.0)
  );

  const primeManufacturingCost = netMaterialCost + totalRoutingCost;
  const factoryOverheadCost = primeManufacturingCost * (factoryOverheadPct / 100);
  const qualityInspectionCost = primeManufacturingCost * (qualityInspectionPct / 100);
  const logisticsPackagingCost = packagingInr + freightInr;

  const totalExFactoryCost = primeManufacturingCost + factoryOverheadCost + qualityInspectionCost + logisticsPackagingCost;

  // Unit selling price before tax = ExFactoryCost / (1 - marginPct/100)
  const marginDenominator = Math.max(0.05, 1 - marginPct / 100);
  const unitPriceExclGst = totalExFactoryCost / marginDenominator;
  const marginAmount = unitPriceExclGst - totalExFactoryCost;

  const gstAmount = unitPriceExclGst * (gstPct / 100);
  const finalUnitPriceInclGst = unitPriceExclGst + gstAmount;

  // Annual Contract Value & Gate
  const volume = Math.max(1, safeNum(inputs.volume_tier?.volume, 10000));
  const annualContractValueExclGst = unitPriceExclGst * volume;
  const annualContractValueInclGst = finalUnitPriceInclGst * volume;

  // High Value Approval Rule: Annual value > ₹25 Lakhs (₹2,500,000)
  const requiresSalesHeadApproval = annualContractValueExclGst > 2500000;

  return {
    volume,
    batch_size: batchSize,
    label: safeStr(inputs.volume_tier?.label, `${volume.toLocaleString('en-IN')} pcs/yr`),

    material_grade: safeStr(inputs.material_grade, 'EN8'),
    material_rate_per_kg: round2(matRatePerKg),
    gross_weight_kg: round3(grossWt),
    net_weight_kg: round3(netWt),
    scrap_weight_kg: round3(scrapWt),
    scrap_rate_per_kg: round2(scrapRatePerKg),
    gross_material_cost: round2(grossMaterialCost),
    scrap_recovery_credit: round2(scrapRecoveryCredit),
    net_material_cost: round2(netMaterialCost),

    operations,
    total_machining_cost: round2(totalMachiningCost),
    total_setup_cost: round2(totalSetupCost),
    total_routing_cost: round2(totalRoutingCost),

    prime_manufacturing_cost: round2(primeManufacturingCost),
    factory_overhead_cost: round2(factoryOverheadCost),
    quality_inspection_cost: round2(qualityInspectionCost),
    logistics_packaging_cost: round2(logisticsPackagingCost),
    total_ex_factory_cost: round2(totalExFactoryCost),

    margin_pct: round2(marginPct),
    margin_amount: round2(marginAmount),
    unit_price_excl_gst: round2(unitPriceExclGst),
    gst_pct: round2(gstPct),
    gst_amount: round2(gstAmount),
    final_unit_price_incl_gst: round2(finalUnitPriceInclGst),

    annual_contract_value_excl_gst: round2(annualContractValueExclGst),
    annual_contract_value_incl_gst: round2(annualContractValueInclGst),
    requires_sales_head_approval: requiresSalesHeadApproval,
  };
}

/**
 * Computes multi-volume comparison (e.g. 3 volume tiers) for a given RFQ.
 */
export function calculateMultiVolumeQuotes(
  baseInputs: Omit<CostingInputs, 'volume_tier'>,
  tiers: VolumeTier[],
  rates: RateMasterDatabase,
  asOfDate?: string
): CostBreakdown[] {
  const safeTiers = Array.isArray(tiers) && tiers.length > 0 ? tiers : [
    { volume: 30000, batch_size: 2500, label: 'Batch Low (30k/yr)' },
    { volume: 60000, batch_size: 5000, label: 'Batch Mid (60k/yr)' },
    { volume: 90000, batch_size: 10000, label: 'Full Commitment (90k/yr)' },
  ];

  return safeTiers.map((tier) =>
    calculatePartCost({ ...baseInputs, volume_tier: tier }, rates, asOfDate)
  );
}
