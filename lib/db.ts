import fs from 'fs';
import path from 'path';
import type { CostBreakdown, VolumeTier, RoutingStep } from './costing';
import { calculatePartCost, calculateMultiVolumeQuotes } from './costing';

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

// Sanitization & Security Helpers
function sanitizeString(val: any, maxLength: number = 250): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags to prevent stored XSS
    .replace(/[^\w\s\-\.\,\(\)\/]/gi, '') // Strip script injection chars
    .trim()
    .slice(0, maxLength);
}

function sanitizeNumber(val: any, fallback: number, min: number = 0, max: number = 100000000): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

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
  try {
    fs.writeFileSync(RATES_FILE, JSON.stringify(rates, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist rate masters to disk', err);
  }
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
  try {
    fs.writeFileSync(RFQS_FILE, JSON.stringify(rfqs, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist RFQs to disk', err);
  }
}

export const db = {
  // RFQ Queries with sanitization
  getRFQs(filter?: { status?: string; search?: string }): RFQRecord[] {
    let list = loadRFQs();
    if (filter?.status && filter.status !== 'all') {
      const safeStatus = sanitizeString(filter.status, 30);
      list = list.filter((r) => r.status === safeStatus);
    }
    if (filter?.search) {
      const q = sanitizeString(filter.search, 100).toLowerCase();
      if (q) {
        list = list.filter(
          (r) =>
            r.rfq_number.toLowerCase().includes(q) ||
            r.customer_name.toLowerCase().includes(q) ||
            r.part_name.toLowerCase().includes(q) ||
            r.drawing_number.toLowerCase().includes(q) ||
            r.material_grade.toLowerCase().includes(q)
        );
      }
    }
    return list;
  },

  getRFQById(id: string): RFQRecord | null {
    const safeId = sanitizeString(id, 64);
    if (!safeId) return null;
    const list = loadRFQs();
    return list.find((r) => r.id === safeId || r.rfq_number.toLowerCase() === safeId.toLowerCase()) || null;
  },

  createRFQ(rfqData: Omit<RFQRecord, 'id'> & { id?: string }): RFQRecord {
    const list = loadRFQs();
    const safeId = sanitizeString(rfqData.id, 64) || `rfq-${Date.now().toString(36)}`;
    
    const gross = sanitizeNumber(rfqData.gross_weight_kg, 1.0, 0.01, 10000);
    const net = Math.min(gross, sanitizeNumber(rfqData.net_weight_kg, gross * 0.8, 0.01, gross));
    const scrap = Math.max(0, gross - net);

    const safeRecord: RFQRecord = {
      id: safeId,
      rfq_number: sanitizeString(rfqData.rfq_number, 64) || `RFQ-${new Date().getFullYear().toString().slice(2)}-${Math.floor(100 + Math.random() * 900)}`,
      customer_name: sanitizeString(rfqData.customer_name, 120) || 'Automotive Tier-1 Customer',
      customer_tier: sanitizeString(rfqData.customer_tier, 64) || 'Tier-1 OEM',
      plant_location: sanitizeString(rfqData.plant_location, 64) || 'Chakan, Pune',
      part_name: sanitizeString(rfqData.part_name, 120) || 'Machined Component',
      drawing_number: sanitizeString(rfqData.drawing_number, 64) || `DWG-${Math.floor(1000 + Math.random() * 9000)}-REV-A`,
      material_grade: sanitizeString(rfqData.material_grade, 64) || 'EN8',
      gross_weight_kg: gross,
      net_weight_kg: net,
      scrap_weight_kg: scrap,
      annual_volume: sanitizeNumber(rfqData.annual_volume, 50000, 1, 10000000),
      target_price_inr: rfqData.target_price_inr ? sanitizeNumber(rfqData.target_price_inr, 0) : undefined,
      status: (['estimating', 'pending_approval', 'approved', 'sent', 'won', 'lost'].includes(rfqData.status) ? rfqData.status : 'estimating') as any,
      lost_reason: rfqData.lost_reason ? sanitizeString(rfqData.lost_reason, 500) : undefined,
      assigned_estimator: sanitizeString(rfqData.assigned_estimator, 100) || 'Rajesh Sharma (Senior Estimator)',
      assigned_sales_head: sanitizeString(rfqData.assigned_sales_head, 100) || 'Vikram Malhotra (VP Sales)',
      created_date: rfqData.created_date ? sanitizeString(rfqData.created_date, 20) : new Date().toISOString().split('T')[0],
      due_date: rfqData.due_date ? sanitizeString(rfqData.due_date, 20) : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      currency: 'INR',
      gst_rate_percent: 18.0,
      margin_pct: sanitizeNumber(rfqData.margin_pct, 15, 0, 90),
      factory_overhead_pct: sanitizeNumber(rfqData.factory_overhead_pct, 12, 0, 50),
      quality_inspection_pct: sanitizeNumber(rfqData.quality_inspection_pct, 3, 0, 20),
      packaging_inr: sanitizeNumber(rfqData.packaging_inr, 4.5, 0, 1000),
      freight_inr: sanitizeNumber(rfqData.freight_inr, 3.0, 0, 1000),
      volume_tiers: Array.isArray(rfqData.volume_tiers) ? rfqData.volume_tiers : [],
      routing_steps: Array.isArray(rfqData.routing_steps) ? rfqData.routing_steps : [],
      ai_extraction_provenance: rfqData.ai_extraction_provenance,
    };

    list.unshift(safeRecord);
    saveRFQs(list);
    return safeRecord;
  },

  updateRFQ(id: string, updates: Partial<RFQRecord>): RFQRecord | null {
    const safeId = sanitizeString(id, 64);
    const list = loadRFQs();
    const idx = list.findIndex((r) => r.id === safeId || r.rfq_number.toLowerCase() === safeId.toLowerCase());
    if (idx === -1) return null;

    // Prevent modifying primary key or prototype
    const safeUpdates: Partial<RFQRecord> = {};
    if (updates.part_name) safeUpdates.part_name = sanitizeString(updates.part_name, 120);
    if (updates.customer_name) safeUpdates.customer_name = sanitizeString(updates.customer_name, 120);
    if (updates.material_grade) safeUpdates.material_grade = sanitizeString(updates.material_grade, 64);
    if (updates.gross_weight_kg !== undefined) safeUpdates.gross_weight_kg = sanitizeNumber(updates.gross_weight_kg, 1.0);
    if (updates.net_weight_kg !== undefined) safeUpdates.net_weight_kg = sanitizeNumber(updates.net_weight_kg, 0.8);
    if (updates.scrap_weight_kg !== undefined) safeUpdates.scrap_weight_kg = sanitizeNumber(updates.scrap_weight_kg, 0.2);
    if (updates.margin_pct !== undefined) safeUpdates.margin_pct = sanitizeNumber(updates.margin_pct, 15, 0, 90);
    if (updates.factory_overhead_pct !== undefined) safeUpdates.factory_overhead_pct = sanitizeNumber(updates.factory_overhead_pct, 12, 0, 50);
    if (updates.routing_steps) safeUpdates.routing_steps = updates.routing_steps;
    if (updates.volume_tiers) safeUpdates.volume_tiers = updates.volume_tiers;
    if (updates.status && ['estimating', 'pending_approval', 'approved', 'sent', 'won', 'lost'].includes(updates.status)) {
      safeUpdates.status = updates.status;
    }
    if (updates.lost_reason) safeUpdates.lost_reason = sanitizeString(updates.lost_reason, 500);
    if (updates.ai_extraction_provenance) safeUpdates.ai_extraction_provenance = updates.ai_extraction_provenance;
    if (updates.approved_at) safeUpdates.approved_at = sanitizeString(updates.approved_at, 50);
    if (updates.approved_by) safeUpdates.approved_by = sanitizeString(updates.approved_by, 100);

    list[idx] = {
      ...list[idx],
      ...safeUpdates,
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
      approved_by: sanitizeString(approvedBy, 100),
    });
  },

  // Rate Masters
  getRateMasters(): RateMasterDatabase {
    return loadRates();
  },

  addMaterialRate(rate: Omit<MaterialRateRecord, 'id'>): MaterialRateRecord {
    const rates = loadRates();
    const gradeSafe = sanitizeString(rate.material_grade, 40);
    const id = `mat-${gradeSafe.toLowerCase().replace(/[^a-z0-9]/g, '-')}-v${Date.now().toString(36)}`;
    
    // Close previous version if open
    const prev = rates.material_rates.find(
      (m) => m.material_grade.toLowerCase() === gradeSafe.toLowerCase() && !m.effective_to
    );
    if (prev) {
      prev.effective_to = sanitizeString(rate.effective_from, 20);
    }

    const newEntry: MaterialRateRecord = {
      id,
      material_grade: gradeSafe,
      material_type: sanitizeString(rate.material_type, 64) || 'Steel Alloy',
      density_kg_dm3: sanitizeNumber(rate.density_kg_dm3, 7.85, 1, 20),
      base_rate_per_kg: sanitizeNumber(rate.base_rate_per_kg, 75, 1, 5000),
      effective_from: sanitizeString(rate.effective_from, 20),
      effective_to: null,
      version: sanitizeString(rate.version, 20) || 'v2.0',
    };
    rates.material_rates.unshift(newEntry);
    saveRates(rates);
    return newEntry;
  },

  addMachineHourRate(rate: Omit<MachineHourRateRecord, 'id'>): MachineHourRateRecord {
    const rates = loadRates();
    const machineSafe = sanitizeString(rate.machine_code, 40);
    const id = `mhr-${machineSafe.toLowerCase().replace(/[^a-z0-9]/g, '-')}-v${Date.now().toString(36)}`;

    // Close previous version if open
    const prev = rates.machine_hour_rates.find(
      (m) => m.machine_code.toLowerCase() === machineSafe.toLowerCase() && !m.effective_to
    );
    if (prev) {
      prev.effective_to = sanitizeString(rate.effective_from, 20);
    }

    const newEntry: MachineHourRateRecord = {
      id,
      machine_code: machineSafe,
      machine_name: sanitizeString(rate.machine_name, 100) || machineSafe,
      hour_rate_inr: sanitizeNumber(rate.hour_rate_inr, 850, 10, 50000),
      setup_rate_inr: sanitizeNumber(rate.setup_rate_inr, 450, 10, 50000),
      effective_from: sanitizeString(rate.effective_from, 20),
      effective_to: null,
      version: sanitizeString(rate.version, 20) || 'v2.0',
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
    const q = sanitizeString(query, 100).toLowerCase();
    if (!q) {
      return list.map((r) => ({
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
    }
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
  if (!Array.isArray(steps)) return '';
  return steps.map((s) => `${s.operation_name} (${s.cycle_time_minutes}m)`).join(' → ');
}
