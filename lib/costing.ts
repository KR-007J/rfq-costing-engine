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

/**
 * Deterministic Costing Engine.
 * Calculates exact production costs, multi-volume price breaks, and checks high-value approval gates.
 */
export function calculatePartCost(
  inputs: CostingInputs,
  rates: RateMasterDatabase,
  asOfDate: string = new Date().toISOString().split('T')[0]
): CostBreakdown {
  // 1. Resolve Material Rate as of the specified date
  const matEntry = rates.material_rates.find(
    (m) =>
      m.material_grade.toLowerCase() === inputs.material_grade.toLowerCase() &&
      m.effective_from <= asOfDate &&
      (!m.effective_to || m.effective_to >= asOfDate)
  ) || rates.material_rates.find(
    (m) => m.material_grade.toLowerCase() === inputs.material_grade.toLowerCase()
  );

  const matRatePerKg = matEntry ? matEntry.base_rate_per_kg : 75.0; // fallback default
  const scrapRatePerKg = rates.scrap_recovery_rates[0]?.credit_rate_per_kg || 32.0;

  const grossWt = Math.max(0, inputs.gross_weight_kg);
  const netWt = Math.min(grossWt, Math.max(0, inputs.net_weight_kg));
  const scrapWt = Math.max(0, grossWt - netWt);

  const grossMaterialCost = grossWt * matRatePerKg;
  const scrapRecoveryCredit = scrapWt * scrapRatePerKg;
  const netMaterialCost = Math.max(0, grossMaterialCost - scrapRecoveryCredit);

  // 2. Resolve Routing Steps
  let totalMachiningCost = 0;
  let totalSetupCost = 0;
  const operations: OperationCostDetail[] = [];

  const batchSize = Math.max(1, inputs.volume_tier.batch_size || 1000);

  for (const step of inputs.routing_steps) {
    const mhrEntry = rates.machine_hour_rates.find(
      (m) =>
        m.machine_code.toLowerCase() === step.machine_code.toLowerCase() &&
        m.effective_from <= asOfDate &&
        (!m.effective_to || m.effective_to >= asOfDate)
    ) || rates.machine_hour_rates.find(
      (m) => m.machine_code.toLowerCase() === step.machine_code.toLowerCase()
    );

    const hourRate = step.machine_hour_rate_inr ?? (mhrEntry ? mhrEntry.hour_rate_inr : 850.0);
    const setupRate = mhrEntry ? mhrEntry.setup_rate_inr : 450.0;

    // Direct cycle time machining cost = (cycle_time_minutes / 60) * hourRate
    const machiningCostPerPiece = (step.cycle_time_minutes / 60) * hourRate;

    // Setup amortization per piece = (setup_time_minutes / 60 * setupRate) / batchSize
    const setupCostPerPiece = ((step.setup_time_minutes || 0) / 60 * setupRate) / batchSize;

    const opTotal = machiningCostPerPiece + setupCostPerPiece;

    totalMachiningCost += machiningCostPerPiece;
    totalSetupCost += setupCostPerPiece;

    operations.push({
      step_no: step.step_no,
      operation_name: step.operation_name,
      machine_code: step.machine_code,
      cycle_time_minutes: step.cycle_time_minutes,
      machine_hour_rate_inr: Math.round(hourRate * 100) / 100,
      machining_cost_per_piece: Math.round(machiningCostPerPiece * 100) / 100,
      setup_time_minutes: step.setup_time_minutes,
      setup_cost_per_piece: Math.round(setupCostPerPiece * 100) / 100,
      total_operation_cost_per_piece: Math.round(opTotal * 100) / 100,
    });
  }

  const totalRoutingCost = totalMachiningCost + totalSetupCost;

  // 3. Overheads & Logistics
  const factoryOverheadPct = inputs.factory_overhead_pct ?? rates.standard_overheads?.factory_overhead_percent ?? 12.0;
  const qualityInspectionPct = inputs.quality_inspection_pct ?? rates.standard_overheads?.quality_inspection_percent ?? 3.0;
  const marginPct = inputs.margin_pct ?? rates.standard_overheads?.standard_profit_margin_percent ?? 15.0;
  const packagingInr = inputs.packaging_inr ?? rates.standard_overheads?.packaging_per_piece_inr ?? 4.5;
  const freightInr = inputs.freight_inr ?? rates.standard_overheads?.freight_per_piece_inr ?? 3.0;
  const gstPct = inputs.gst_pct ?? rates.standard_overheads?.gst_percent ?? 18.0;

  const primeManufacturingCost = netMaterialCost + totalRoutingCost;
  const factoryOverheadCost = primeManufacturingCost * (factoryOverheadPct / 100);
  const qualityInspectionCost = primeManufacturingCost * (qualityInspectionPct / 100);
  const logisticsPackagingCost = packagingInr + freightInr;

  const totalExFactoryCost = primeManufacturingCost + factoryOverheadCost + qualityInspectionCost + logisticsPackagingCost;

  // Unit selling price before tax = ExFactoryCost / (1 - marginPct/100)
  const unitPriceExclGst = marginPct < 100 ? totalExFactoryCost / (1 - marginPct / 100) : totalExFactoryCost * 1.15;
  const marginAmount = unitPriceExclGst - totalExFactoryCost;

  const gstAmount = unitPriceExclGst * (gstPct / 100);
  const finalUnitPriceInclGst = unitPriceExclGst + gstAmount;

  // Annual Contract Value & Gate
  const annualContractValueExclGst = unitPriceExclGst * inputs.volume_tier.volume;
  const annualContractValueInclGst = finalUnitPriceInclGst * inputs.volume_tier.volume;

  // High Value Approval Rule: Annual value > ₹25 Lakhs (₹2,500,000)
  const requiresSalesHeadApproval = annualContractValueExclGst > 2500000;

  return {
    volume: inputs.volume_tier.volume,
    batch_size: batchSize,
    label: inputs.volume_tier.label,

    material_grade: inputs.material_grade,
    material_rate_per_kg: Math.round(matRatePerKg * 100) / 100,
    gross_weight_kg: Math.round(grossWt * 1000) / 1000,
    net_weight_kg: Math.round(netWt * 1000) / 1000,
    scrap_weight_kg: Math.round(scrapWt * 1000) / 1000,
    scrap_rate_per_kg: Math.round(scrapRatePerKg * 100) / 100,
    gross_material_cost: Math.round(grossMaterialCost * 100) / 100,
    scrap_recovery_credit: Math.round(scrapRecoveryCredit * 100) / 100,
    net_material_cost: Math.round(netMaterialCost * 100) / 100,

    operations,
    total_machining_cost: Math.round(totalMachiningCost * 100) / 100,
    total_setup_cost: Math.round(totalSetupCost * 100) / 100,
    total_routing_cost: Math.round(totalRoutingCost * 100) / 100,

    prime_manufacturing_cost: Math.round(primeManufacturingCost * 100) / 100,
    factory_overhead_cost: Math.round(factoryOverheadCost * 100) / 100,
    quality_inspection_cost: Math.round(qualityInspectionCost * 100) / 100,
    logistics_packaging_cost: Math.round(logisticsPackagingCost * 100) / 100,
    total_ex_factory_cost: Math.round(totalExFactoryCost * 100) / 100,

    margin_pct: marginPct,
    margin_amount: Math.round(marginAmount * 100) / 100,
    unit_price_excl_gst: Math.round(unitPriceExclGst * 100) / 100,
    gst_pct: gstPct,
    gst_amount: Math.round(gstAmount * 100) / 100,
    final_unit_price_incl_gst: Math.round(finalUnitPriceInclGst * 100) / 100,

    annual_contract_value_excl_gst: Math.round(annualContractValueExclGst * 100) / 100,
    annual_contract_value_incl_gst: Math.round(annualContractValueInclGst * 100) / 100,
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
  return tiers.map((tier) =>
    calculatePartCost({ ...baseInputs, volume_tier: tier }, rates, asOfDate)
  );
}
