'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  Calculator,
  RefreshCw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useUser } from '../../components/Navbar';
import { RFQRecord } from '@/lib/db';
import { CostBreakdown, RoutingStep, VolumeTier } from '@/lib/costing';

export default function PartCostingScreen() {
  const params = useParams();
  const router = useRouter();
  const { role, userName } = useUser();
  const rfqId = params.id as string;

  const [rfq, setRfq] = useState<RFQRecord | null>(null);
  const [costing, setCosting] = useState<{
    multiVolumeBreakdown: CostBreakdown[];
    recommendedBreakdown: CostBreakdown;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Form State for interactive modifications
  const [materialGrade, setMaterialGrade] = useState('');
  const [grossWeightKg, setGrossWeightKg] = useState<number>(0);
  const [netWeightKg, setNetWeightKg] = useState<number>(0);
  const [marginPct, setMarginPct] = useState<number>(15);
  const [factoryOverheadPct, setFactoryOverheadPct] = useState<number>(12);
  const [routingSteps, setRoutingSteps] = useState<RoutingStep[]>([]);
  const [estimatorAccepted, setEstimatorAccepted] = useState(true);
  const [selectedVolumeIndex, setSelectedVolumeIndex] = useState(2); // default to highest volume

  const fetchRFQDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/rfqs/${rfqId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRfq(json.data);
        setCosting(json.costing);
        setMaterialGrade(json.data.material_grade);
        setGrossWeightKg(json.data.gross_weight_kg);
        setNetWeightKg(json.data.net_weight_kg);
        setMarginPct(json.data.margin_pct ?? 15);
        setFactoryOverheadPct(json.data.factory_overhead_pct ?? 12);
        setRoutingSteps(json.data.routing_steps || []);
        setEstimatorAccepted(json.data.ai_extraction_provenance?.accepted_by_estimator ?? true);
        if (json.data.volume_tiers?.length) {
          setSelectedVolumeIndex(json.data.volume_tiers.length - 1);
        }
      }
    } catch (e) {
      console.error('Failed to load RFQ costing', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rfqId) fetchRFQDetails();
  }, [rfqId]);

  // Recalculate or Save to backend
  const handleSave = async (statusOverride?: RFQRecord['status']) => {
    try {
      setSaving(true);
      const payload: Partial<RFQRecord> = {
        material_grade: materialGrade,
        gross_weight_kg: Number(grossWeightKg),
        net_weight_kg: Number(netWeightKg),
        scrap_weight_kg: Math.max(0, Number(grossWeightKg) - Number(netWeightKg)),
        margin_pct: Number(marginPct),
        factory_overhead_pct: Number(factoryOverheadPct),
        routing_steps: routingSteps,
        ai_extraction_provenance: rfq?.ai_extraction_provenance ? {
          ...rfq.ai_extraction_provenance,
          accepted_by_estimator: estimatorAccepted,
        } : undefined,
      };

      if (statusOverride) {
        payload.status = statusOverride;
      }

      const res = await fetch(`/api/rfqs/${rfqId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setRfq(json.data);
        setCosting(json.costing);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Error saving costing', e);
    } finally {
      setSaving(false);
    }
  };

  // Sales Head Approval Trigger
  const handleApprove = async () => {
    try {
      setApprovalLoading(true);
      const res = await fetch(`/api/rfqs/${rfqId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: userName }),
      });
      const json = await res.json();
      if (json.success) {
        setRfq(json.data);
        setCosting(json.costing);
      }
    } catch (e) {
      console.error('Approval failed', e);
    } finally {
      setApprovalLoading(false);
    }
  };

  // Routing Step modifiers
  const handleRoutingStepChange = (index: number, field: keyof RoutingStep, value: any) => {
    const updated = [...routingSteps];
    updated[index] = { ...updated[index], [field]: value };
    setRoutingSteps(updated);
  };

  const handleAddRoutingStep = () => {
    const nextStepNo = (routingSteps.length + 1) * 10;
    const newStep: RoutingStep = {
      step_no: nextStepNo,
      operation_name: 'CNC 2-Axis Turning',
      machine_code: 'CNC-TURN-01',
      cycle_time_minutes: 2.5,
      setup_time_minutes: 30,
      machine_hour_rate_inr: 850.0,
    };
    setRoutingSteps([...routingSteps, newStep]);
  };

  const handleRemoveRoutingStep = (index: number) => {
    setRoutingSteps(routingSteps.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
        <p className="text-sm text-slate-600 font-medium">Loading Part Costing Sheet...</p>
      </div>
    );
  }

  if (!rfq || !costing) {
    return (
      <div className="py-16 text-center">
        <p className="text-base text-slate-800 font-semibold">RFQ not found</p>
        <Link href="/" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          Return to RFQ Register
        </Link>
      </div>
    );
  }

  const activeTierBreakdown = costing.multiVolumeBreakdown[selectedVolumeIndex] || costing.recommendedBreakdown;
  const isHighValue = activeTierBreakdown.requires_sales_head_approval;
  const isPendingApproval = rfq.status === 'pending_approval';
  const isApproved = rfq.status === 'approved' || rfq.status === 'sent' || rfq.status === 'won';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between no-print">
        <Link 
          href="/" 
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to RFQ Register
        </Link>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
              <CheckCircle2 className="w-3.5 h-3.5" /> Costing Updated &amp; Recalculated
            </span>
          )}

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded shadow-xs transition-all"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save &amp; Recalculate
          </button>

          <Link
            href={`/rfqs/${rfq.id}/quote`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            Formal PDF Quote
          </Link>
        </div>
      </div>

      {/* Flagship Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{rfq.rfq_number}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                {rfq.drawing_number}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${
                rfq.status === 'won' ? 'bg-emerald-100 text-emerald-800' :
                rfq.status === 'lost' ? 'bg-rose-100 text-rose-800' :
                rfq.status === 'approved' ? 'bg-purple-100 text-purple-800' :
                rfq.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {rfq.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-800 mt-1">
              {rfq.part_name} <span className="text-xs font-normal text-slate-500">for</span> {rfq.customer_name}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
              <span>Plant: {rfq.plant_location}</span>
              <span>•</span>
              <span>Estimator: {rfq.assigned_estimator}</span>
              <span>•</span>
              <span>Due: {rfq.due_date}</span>
            </div>
          </div>

          {/* Quick Metrics Header Tile */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-md">
            <div>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Unit Price (Excl GST)</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                ₹{activeTierBreakdown.unit_price_excl_gst.toFixed(2)}
              </div>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Annual Contract Value</div>
              <div className="text-lg font-bold text-blue-600 font-mono">
                ₹{(activeTierBreakdown.annual_contract_value_excl_gst / 100000).toFixed(2)} Lakhs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High-Value Approval Banner (> ₹25 Lakhs) */}
      {isHighValue && (
        <div className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isApproved 
            ? 'bg-purple-50 border-purple-200 text-purple-900' 
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-start gap-2.5">
            <ShieldCheck className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isApproved ? 'text-purple-600' : 'text-amber-600'}`} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide">
                {isApproved ? 'High-Value Quote Approved' : 'High-Value Approval Gate Triggered (> ₹25 Lakhs)'}
              </div>
              <p className="text-xs mt-0.5">
                {isApproved ? (
                  <span>Approved by <strong>{rfq.approved_by || 'Vikram Malhotra (VP Sales)'}</strong> on {rfq.approved_at?.slice(0, 10) || '2026-10-30'}. Commercial terms verified.</span>
                ) : (
                  <span>
                    Annual contract value of <strong>₹{(activeTierBreakdown.annual_contract_value_excl_gst / 100000).toFixed(2)} Lakhs</strong> requires VP Sales sign-off before formal quotation dispatch.
                  </span>
                )}
              </p>
            </div>
          </div>

          {!isApproved && (
            <div className="flex items-center gap-2">
              {role === 'sales_head' ? (
                <button
                  onClick={handleApprove}
                  disabled={approvalLoading}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  {approvalLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Approve Quote (&gt; ₹25L)
                </button>
              ) : (
                <button
                  onClick={() => handleSave('pending_approval')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium transition-all whitespace-nowrap"
                >
                  Submit to Sales Head for Sign-off
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main 3-Column Dense Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANE (4 Cols): Part Specifications & Raw Material */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-200 flex items-center justify-between">
              <span>1. Material &amp; Scrap Recovery</span>
              <span className="text-[10px] text-blue-600 font-mono">Rates v2.0 Snapshot</span>
            </h2>

            <div className="space-y-3 mt-3 text-xs">
              
              {/* Material Grade */}
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Material Grade / Alloy Spec
                </label>
                <select
                  value={materialGrade}
                  onChange={(e) => setMaterialGrade(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="EN8">EN8 - Carbon Steel Bar (₹76.50/kg)</option>
                  <option value="40Cr4 forging">40Cr4 forging - Alloy Steel (₹98.00/kg)</option>
                  <option value="20MnCr5">20MnCr5 - Case Hardening Steel (₹110.00/kg)</option>
                  <option value="C45">C45 - Medium Carbon (₹68.00/kg)</option>
                  <option value="SS304">SS304 - Austenitic Stainless (₹240.00/kg)</option>
                </select>
              </div>

              {/* Base Material Rate Indicator */}
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200 font-mono text-[11px]">
                <span className="text-slate-600">Material Master Rate:</span>
                <span className="font-semibold text-slate-900">₹{activeTierBreakdown.material_rate_per_kg.toFixed(2)} / kg</span>
              </div>

              {/* Gross Weight */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Gross / Input Wt (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={grossWeightKg}
                    onChange={(e) => setGrossWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Finished / Net Wt (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={netWeightKg}
                    onChange={(e) => setNetWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Calculated Scrap Credit */}
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Material Cost:</span>
                  <span className="font-medium text-slate-900">₹{activeTierBreakdown.gross_material_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Scrap Credit ({activeTierBreakdown.scrap_weight_kg.toFixed(2)}kg @ ₹{activeTierBreakdown.scrap_rate_per_kg}/kg):</span>
                  <span className="font-medium">-₹{activeTierBreakdown.scrap_recovery_credit.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900 text-xs">
                  <span>Net Material Cost / Part:</span>
                  <span className="text-blue-700">₹{activeTierBreakdown.net_material_cost.toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>

          {/* AI Intake Provenance Card */}
          {rfq.ai_extraction_provenance && (
            <div className="bg-white border border-blue-200 rounded-lg p-3.5 shadow-xs text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  AI Intake Provenance
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-mono font-medium rounded-full">
                  {Math.round(rfq.ai_extraction_provenance.confidence_score * 100)}% Confidence
                </span>
              </div>

              <div className="mt-2.5 space-y-2 text-[11px] text-slate-600">
                <div>
                  <span className="font-medium text-slate-800">Source:</span> {rfq.ai_extraction_provenance.extracted_from}
                </div>
                {rfq.ai_extraction_provenance.historical_match && (
                  <div>
                    <span className="font-medium text-slate-800">Routing Match:</span> {rfq.ai_extraction_provenance.historical_match}
                  </div>
                )}
                {rfq.ai_extraction_provenance.flagged_uncertainties && rfq.ai_extraction_provenance.flagged_uncertainties.length > 0 && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
                    <span className="font-semibold">Flagged Note:</span> {rfq.ai_extraction_provenance.flagged_uncertainties[0]}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="estimator-verify"
                    checked={estimatorAccepted}
                    onChange={(e) => setEstimatorAccepted(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <label htmlFor="estimator-verify" className="text-slate-800 font-medium cursor-pointer">
                    Estimator Verified against drawing standards
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MIDDLE & RIGHT PANE (8 Cols): Routing Operations & Slabs */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Section B: Routing Operations */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  2. Manufacturing Routing &amp; Machine Hour Rates
                </h2>
                <p className="text-[11px] text-slate-500">
                  Direct cycle time machining + setup amortization for {activeTierBreakdown.batch_size} pcs batch
                </p>
              </div>
              <button
                onClick={handleAddRoutingStep}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Operation
              </button>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-2 px-2 w-10">Step</th>
                    <th className="py-2 px-2">Operation &amp; Machine</th>
                    <th className="py-2 px-2 text-right">Cycle (m)</th>
                    <th className="py-2 px-2 text-right">MHR (₹/hr)</th>
                    <th className="py-2 px-2 text-right">Machining ₹</th>
                    <th className="py-2 px-2 text-right">Setup ₹</th>
                    <th className="py-2 px-2 text-right">Total ₹</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {routingSteps.map((step, idx) => {
                    const opDetail = activeTierBreakdown.operations[idx] || {
                      machining_cost_per_piece: (step.cycle_time_minutes / 60) * (step.machine_hour_rate_inr || 850),
                      setup_cost_per_piece: ((step.setup_time_minutes || 0) / 60 * 450) / activeTierBreakdown.batch_size,
                      total_operation_cost_per_piece: 0,
                    };
                    const opTotal = opDetail.machining_cost_per_piece + opDetail.setup_cost_per_piece;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-2 text-slate-400 font-sans">{step.step_no}</td>
                        <td className="py-2 px-2 font-sans">
                          <input
                            type="text"
                            value={step.operation_name}
                            onChange={(e) => handleRoutingStepChange(idx, 'operation_name', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs text-slate-900 font-medium"
                          />
                          <div className="text-[10px] font-mono text-slate-500">{step.machine_code}</div>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="0.1"
                            value={step.cycle_time_minutes}
                            onChange={(e) => handleRoutingStepChange(idx, 'cycle_time_minutes', parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-0.5 text-right bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-2 text-right text-slate-700">
                          ₹{step.machine_hour_rate_inr || 850}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-900">
                          ₹{opDetail.machining_cost_per_piece.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-500">
                          ₹{opDetail.setup_cost_per_piece.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-blue-700">
                          ₹{opTotal.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleRemoveRoutingStep(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remove Step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-2 px-2 text-right font-sans">
                      Total Routing Cost / Part:
                    </td>
                    <td className="py-2 px-2 text-right text-slate-800">
                      ₹{activeTierBreakdown.total_machining_cost.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-600">
                      ₹{activeTierBreakdown.total_setup_cost.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-blue-700">
                      ₹{activeTierBreakdown.total_routing_cost.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section C: Multi-Volume Slabs & Margin Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Multi-Volume Price Slabs &amp; Margin Breakdown
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select volume tier to inspect batch setup amortization and total cost breakdown
                </p>
              </div>

              {/* Volume Tier Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
                {costing.multiVolumeBreakdown.map((tier, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVolumeIndex(idx)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                      selectedVolumeIndex === idx
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tier.label.split(' ')[0]} ({tier.volume.toLocaleString('en-IN')})
                  </button>
                ))}
              </div>
            </div>

            {/* Overheads & Margin Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-b border-slate-100 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span className="font-medium">Factory Overhead %</span>
                  <span className="font-mono font-bold text-slate-900">{factoryOverheadPct}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="0.5"
                  value={factoryOverheadPct}
                  onChange={(e) => setFactoryOverheadPct(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span className="font-medium">Profit Margin %</span>
                  <span className="font-mono font-bold text-blue-700">{marginPct}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="0.5"
                  value={marginPct}
                  onChange={(e) => setMarginPct(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded"
                />
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-200 flex flex-col justify-center text-[11px] font-mono">
                <div className="text-slate-500">Logistics &amp; Quality:</div>
                <div className="text-slate-800 font-semibold mt-0.5">
                  Pack: ₹4.50 | Freight: ₹3.00 | QA: 3%
                </div>
              </div>
            </div>

            {/* Multi-Volume Comparison Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-2 px-2">Volume Slab</th>
                    <th className="py-2 px-2 text-right">Batch Size</th>
                    <th className="py-2 px-2 text-right">Ex-Factory ₹</th>
                    <th className="py-2 px-2 text-right">Margin ₹</th>
                    <th className="py-2 px-2 text-right">Unit Excl. GST</th>
                    <th className="py-2 px-2 text-right">GST (18%)</th>
                    <th className="py-2 px-2 text-right font-bold text-slate-900">Final Incl. GST</th>
                    <th className="py-2 px-2 text-right">Annual Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {costing.multiVolumeBreakdown.map((tier, idx) => (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedVolumeIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        selectedVolumeIndex === idx ? 'bg-blue-50/70 font-semibold' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-2.5 px-2 font-sans font-medium text-slate-900">
                        {tier.label}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-600">
                        {tier.batch_size.toLocaleString('en-IN')} pcs
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700">
                        ₹{tier.total_ex_factory_cost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-emerald-700">
                        ₹{tier.margin_amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-blue-900">
                        ₹{tier.unit_price_excl_gst.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-500">
                        ₹{tier.gst_amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-extrabold text-slate-900 bg-slate-100/60">
                        ₹{tier.final_unit_price_incl_gst.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-800">
                        ₹{(tier.annual_contract_value_excl_gst / 100000).toFixed(2)} L
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
