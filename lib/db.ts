import fs from 'fs';
import path from 'path';
import { CostBreakdown, calculatePartCost, calculateMultiVolumeQuotes, VolumeTier, RoutingStep } from './costing';

export interface RFQRecord {
  id: string;
  rfq_number: string;
  customer_name: string;
  customer_tier: string;
  plant_location: string;
  part_name: string;
  drawing_number: string;
  material_grade: string;
  gross_weight_kg: number;
  net_weight_kg: number;
  scrap_weight_kg: number;
  annual_volume: number;
  target_price_inr?: number;
  status: 'estimating' | 'pending_approval' | 'approved' | 'sent' | 'won' | 'lost';
  lost_reason?: string;
  assigned_estimator: string;
  assigned_sales_head: string;
  created_date: string;
  due_date: string;
  currency: string;
  gst_rate_percent: number;
  factory_overhead_pct?: number;
  quality_inspection_pct?: number;
  margin_pct?: number;
  packaging_inr?: number;
  freight_inr?: number;
  volume_tiers: VolumeTier[];
  routing_steps: RoutingStep[];
  ai_extraction_provenance?: {
    extracted_from: string;
    confidence_score: number;
    flagged_uncertainties?: string[];
    historical_match?: string;
    accepted_by_estimator?: boolean;
  };
  approved_at?: string;
  approved_by?: string;
}

export interface MaterialRateRecord {
  id: string;
  material_grade: string;
  material_type: string;
  density_kg_dm3: number;
  base_rate_per_kg: number;
  effective_from: string;
  effective_to: string | null;
  version: string;
}

export interface MachineHourRateRecord {
  id: string;
  machine_code: string;
  machine_name: string;
  hour_rate_inr: number;
  setup_rate_inr: number;
  effective_from: string;
  effective_to: string | null;
  version: string;
}

export interface ScrapRateRecord {
  id: string;
  material_category: string;
  credit_rate_per_kg: number;
  effective_from: string;
  effective_to: string | null;
}

export interface StandardOverheads {
  factory_overhead_percent: number;
  quality_inspection_percent: number;
  standard_profit_margin_percent: number;
  packaging_per_piece_inr: number;
  freight_per_piece_inr: number;
  gst_percent: number;
}

export interface RateMasterDatabase {
  material_rates: MaterialRateRecord[];
  machine_hour_rates: MachineHourRateRecord[];
  scrap_recovery_rates: ScrapRateRecord[];
  standard_overheads: StandardOverheads;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RFQS_FILE = path.join(DATA_DIR, 'seed_rfqs.json');
const RATES_FILE = path.join(DATA_DIR, 'rate_masters.json');

// In-memory cache for fast lookups and atomic mutations
let _rfqsCache: RFQRecord[] | null = null;
let _ratesCache: RateMasterDatabase | null = null;

function loadRates(): RateMasterDatabase {
  if (!_ratesCache) {
    const raw = fs.readFileSync(RATES_FILE, 'utf8');
    _ratesCache = JSON.parse(raw);
  }
  return _ratesCache!;
}

function saveRates(rates: RateMasterDatabase) {
  _ratesCache = rates;
  fs.writeFileSync(RATES_FILE, JSON.stringify(rates, null, 2), 'utf8');
}

function loadRFQs(): RFQRecord[] {
  if (!_rfqsCache) {
    const raw = fs.readFileSync(RFQS_FILE, 'utf8');
    _rfqsCache = JSON.parse(raw);
  }
  return _rfqsCache!;
}

function saveRFQs(rfqs: RFQRecord[]) {
  _rfqsCache = rfqs;
  fs.writeFileSync(RFQS_FILE, JSON.stringify(rfqs, null, 2), 'utf8');
}

export const db = {
  // RFQ Queries
  getRFQs(filter?: { status?: string; search?: string }): RFQRecord[] {
    let list = loadRFQs();
    if (filter?.status && filter.status !== 'all') {
      list = list.filter((r) => r.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.rfq_number.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q) ||
          r.part_name.toLowerCase().includes(q) ||
          r.drawing_number.toLowerCase().includes(q) ||
          r.material_grade.toLowerCase().includes(q)
      );
    }
    return list;
  },

  getRFQById(id: string): RFQRecord | null {
    const list = loadRFQs();
    return list.find((r) => r.id === id || r.rfq_number.toLowerCase() === id.toLowerCase()) || null;
  },

  createRFQ(rfqData: Omit<RFQRecord, 'id'> & { id?: string }): RFQRecord {
    const list = loadRFQs();
    const id = rfqData.id || `rfq-${Date.now().toString(36)}`;
    const newRecord: RFQRecord = {
      ...rfqData,
      id,
    };
    list.unshift(newRecord);
    saveRFQs(list);
    return newRecord;
  },

  updateRFQ(id: string, updates: Partial<RFQRecord>): RFQRecord | null {
    const list = loadRFQs();
    const idx = list.findIndex((r) => r.id === id || r.rfq_number.toLowerCase() === id.toLowerCase());
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...updates,
    };
    saveRFQs(list);
    return list[idx];
  },

  approveRFQ(id: string, approvedBy: string = 'Vikram Malhotra (VP Sales)'): RFQRecord | null {
    const rfq = this.getRFQById(id);
    if (!rfq) return null;

    return this.updateRFQ(rfq.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
    });
  },

  // Rate Masters
  getRateMasters(): RateMasterDatabase {
    return loadRates();
  },

  addMaterialRate(rate: Omit<MaterialRateRecord, 'id'>): MaterialRateRecord {
    const rates = loadRates();
    const id = `mat-${rate.material_grade.toLowerCase().replace(/[^a-z0-9]/g, '-')}-v${Date.now().toString(36)}`;
    
    // Close previous version if open
    const prev = rates.material_rates.find(
      (m) => m.material_grade.toLowerCase() === rate.material_grade.toLowerCase() && !m.effective_to
    );
    if (prev) {
      // Set previous effective_to as rate.effective_from minus 1 day
      prev.effective_to = rate.effective_from;
    }

    const newEntry: MaterialRateRecord = {
      ...rate,
      id,
    };
    rates.material_rates.unshift(newEntry);
    saveRates(rates);
    return newEntry;
  },

  addMachineHourRate(rate: Omit<MachineHourRateRecord, 'id'>): MachineHourRateRecord {
    const rates = loadRates();
    const id = `mhr-${rate.machine_code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-v${Date.now().toString(36)}`;

    // Close previous version if open
    const prev = rates.machine_hour_rates.find(
      (m) => m.machine_code.toLowerCase() === rate.machine_code.toLowerCase() && !m.effective_to
    );
    if (prev) {
      prev.effective_to = rate.effective_from;
    }

    const newEntry: MachineHourRateRecord = {
      ...rate,
      id,
    };
    rates.machine_hour_rates.unshift(newEntry);
    saveRates(rates);
    return newEntry;
  },

  // Costing calculation helper on an RFQ
  calculateRFQCost(rfqId: string, asOfDate?: string): {
    rfq: RFQRecord;
    multiVolumeBreakdown: CostBreakdown[];
    recommendedBreakdown: CostBreakdown;
  } | null {
    const rfq = this.getRFQById(rfqId);
    if (!rfq) return null;

    const rates = this.getRateMasters();
    const dateToUse = asOfDate || rfq.created_date || new Date().toISOString().split('T')[0];

    const baseInputs = {
      material_grade: rfq.material_grade,
      gross_weight_kg: rfq.gross_weight_kg,
      net_weight_kg: rfq.net_weight_kg,
      routing_steps: rfq.routing_steps,
      factory_overhead_pct: rfq.factory_overhead_pct,
      quality_inspection_pct: rfq.quality_inspection_pct,
      margin_pct: rfq.margin_pct,
      packaging_inr: rfq.packaging_inr,
      freight_inr: rfq.freight_inr,
      gst_pct: rfq.gst_rate_percent,
    };

    const multiVolumeBreakdown = calculateMultiVolumeQuotes(
      baseInputs,
      rfq.volume_tiers,
      rates,
      dateToUse
    );

    // Default recommended breakdown is the highest/contract volume tier (last tier)
    const recommendedBreakdown = multiVolumeBreakdown[multiVolumeBreakdown.length - 1] || multiVolumeBreakdown[0];

    return {
      rfq,
      multiVolumeBreakdown,
      recommendedBreakdown,
    };
  },

  // Past Parts Finder
  searchPastParts(query: string) {
    const list = loadRFQs();
    const q = query.toLowerCase();
    return list
      .filter(
        (r) =>
          r.part_name.toLowerCase().includes(q) ||
          r.drawing_number.toLowerCase().includes(q) ||
          r.material_grade.toLowerCase().includes(q) ||
          r.customer_name.toLowerCase().includes(q)
      )
      .map((r) => ({
        id: r.id,
        rfq_number: r.rfq_number,
        part_name: r.part_name,
        drawing_number: r.drawing_number,
        material_grade: r.material_grade,
        customer_name: r.customer_name,
        status: r.status,
        created_date: r.created_date,
        annual_volume: r.annual_volume,
        routing_steps_count: r.routing_steps.length,
        routing_steps: rfq_routing_summary(r.routing_steps),
      }));
  },
};

function rfq_routing_summary(steps: RoutingStep[]): string {
  return steps.map((s) => `${s.operation_name} (${s.cycle_time_minutes}m)`).join(' → ');
}
