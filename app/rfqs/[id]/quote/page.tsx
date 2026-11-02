'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, Download, CheckCircle2, ShieldCheck, Building2, FileCheck } from 'lucide-react';
import { RFQRecord } from '@/lib/db';
import { CostBreakdown } from '@/lib/costing';

export default function FormalPDFQuotationView() {
  const params = useParams();
  const rfqId = params.id as string;

  const [rfq, setRfq] = useState<RFQRecord | null>(null);
  const [costing, setCosting] = useState<{
    multiVolumeBreakdown: CostBreakdown[];
    recommendedBreakdown: CostBreakdown;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/rfqs/${rfqId}`);
        const json = await res.json();
        if (json.success) {
          setRfq(json.data);
          setCosting(json.costing);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (rfqId) loadData();
  }, [rfqId]);

  if (loading || !rfq || !costing) {
    return <div className="py-24 text-center text-xs text-slate-500">Loading formal quotation...</div>;
  }

  const primary = costing.recommendedBreakdown;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between no-print">
        <Link
          href={`/rfqs/${rfq.id}`}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Part Costing Sheet
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Printable Quotation Document */}
      <div className="bg-white border border-slate-200 rounded-lg p-8 sm:p-10 shadow-sm print:p-0 print:border-none print:shadow-none text-slate-900 text-xs font-sans leading-relaxed">
        
        {/* Letterhead Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm tracking-wider">
                CA
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-900">
                  Company A Precision Auto-Components Ltd.
                </h1>
                <div className="text-[11px] text-slate-600 font-medium">
                  Machined Shafts, Forgings &amp; Drivetrain Assemblies
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-2 space-y-0.5">
              <div>Plot 42, Sector 10, MIDC Chakan Industrial Area, Phase II, Pune – 410501, Maharashtra</div>
              <div>GSTIN: 27AAAC1234F1Z8 | CIN: U29220PN1998PLC045210 | ISO/TS 16949 Certified</div>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 space-y-1">
            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-900 font-mono font-bold text-[10px] rounded uppercase tracking-wider">
              Commercial Quotation
            </span>
            <div className="font-mono text-xs font-bold text-slate-900 mt-1">
              QTN-{rfq.rfq_number.replace('RFQ-', '')}-REV01
            </div>
            <div className="text-[11px] text-slate-500">
              Date: <span className="font-medium text-slate-800">{new Date().toISOString().split('T')[0]}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Validity: <span className="font-medium text-slate-800">30 Days</span>
            </div>
          </div>
        </div>

        {/* Addressed to Customer */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer Details:</div>
            <div className="font-bold text-sm text-slate-900 mt-0.5">{rfq.customer_name}</div>
            <div className="text-slate-600 mt-0.5">{rfq.customer_tier} · Chakan Operations</div>
            <div className="text-slate-500 text-[11px]">Attention: Sourcing &amp; Procurement Team</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Part Identification:</div>
            <div className="font-bold text-sm text-slate-900 mt-0.5">{rfq.part_name}</div>
            <div className="font-mono text-slate-700 text-xs mt-0.5">{rfq.drawing_number}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              Material: <strong>{rfq.material_grade}</strong> (Gross {rfq.gross_weight_kg}kg / Net {rfq.net_weight_kg}kg)
            </div>
          </div>
        </div>

        {/* Section: Formal Price Slabs Table */}
        <div className="py-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Unit Price Schedule &amp; Cost Breakup (Prices in INR ₹)
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Raw Material Master Base: ₹{primary.material_rate_per_kg.toFixed(2)}/kg
            </div>
          </div>

          <table className="w-full text-left border border-slate-300">
            <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold border-b border-slate-300">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">Cost Element</th>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <th key={idx} className="py-2 px-3 text-right border-r border-slate-300 last:border-r-0">
                    {t.label}
                    <div className="text-[9px] font-normal normal-case text-slate-500">
                      Batch: {t.batch_size.toLocaleString('en-IN')} pcs
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              <tr>
                <td className="py-2 px-3 font-sans font-medium border-r border-slate-300 text-slate-800">
                  Net Material Cost (after scrap credit)
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2 px-3 text-right border-r border-slate-300 last:border-r-0">
                    ₹{t.net_material_cost.toFixed(2)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2 px-3 font-sans font-medium border-r border-slate-300 text-slate-800">
                  Machining &amp; Direct Processing
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2 px-3 text-right border-r border-slate-300 last:border-r-0">
                    ₹{t.total_machining_cost.toFixed(2)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2 px-3 font-sans font-medium border-r border-slate-300 text-slate-800">
                  Setup Amortization (per batch)
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2 px-3 text-right border-r border-slate-300 last:border-r-0 text-slate-600">
                    ₹{t.total_setup_cost.toFixed(2)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2 px-3 font-sans font-medium border-r border-slate-300 text-slate-800">
                  Factory Overheads &amp; Quality Inspection (15%)
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2 px-3 text-right border-r border-slate-300 last:border-r-0">
                    ₹{(t.factory_overhead_cost + t.quality_inspection_cost).toFixed(2)}
                  </td>
                ))}
              </tr>

              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td className="py-2 px-3 font-sans border-r border-slate-300">
                  Ex-Factory Production Cost
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2 px-3 text-right border-r border-slate-300 last:border-r-0">
                    ₹{t.total_ex_factory_cost.toFixed(2)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2 px-3 font-sans font-medium border-r border-slate-300 text-slate-800">
                  Logistics &amp; Protective VCI Packaging
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2 px-3 text-right border-r border-slate-300 last:border-r-0">
                    ₹{t.logistics_packaging_cost.toFixed(2)}
                  </td>
                ))}
              </tr>

              <tr className="bg-blue-50/50 font-bold text-blue-900 border-t-2 border-slate-300">
                <td className="py-2.5 px-3 font-sans border-r border-slate-300">
                  Quoted Unit Price (Excl. GST)
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2.5 px-3 text-right border-r border-slate-300 last:border-r-0 text-xs">
                    ₹{t.unit_price_excl_gst.toFixed(2)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2 px-3 font-sans font-medium border-r border-slate-300 text-slate-600">
                  Applicable GST @ 18% (Shown Separately)
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2 px-3 text-right border-r border-slate-300 last:border-r-0 text-slate-600">
                    ₹{t.gst_amount.toFixed(2)}
                  </td>
                ))}
              </tr>

              <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-900">
                <td className="py-2.5 px-3 font-sans border-r border-slate-800">
                  Total Final Price (Incl. GST)
                </td>
                {costing.multiVolumeBreakdown.map((t, idx) => (
                  <td key={idx} className="py-2.5 px-3 text-right border-r border-slate-800 last:border-r-0">
                    ₹{t.final_unit_price_incl_gst.toFixed(2)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Commercial Terms & Conditions */}
        <div className="py-4 border-t border-slate-200 space-y-2 text-[11px] text-slate-600">
          <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
            Commercial Terms &amp; Standard Operating Conditions:
          </div>
          <ol className="list-decimal pl-4 space-y-1">
            <li>
              <strong>Raw Material Escalation:</strong> Base commodity rate is indexed to alloy market standards at <strong>₹{primary.material_rate_per_kg.toFixed(2)}/kg</strong>. Any quarterly movement exceeding ±5% will be adjusted mutually as per standard ACMA/SIAM guidelines.
            </li>
            <li>
              <strong>Payment Terms:</strong> 45 days net from the date of invoice.
            </li>
            <li>
              <strong>Delivery &amp; Logistics:</strong> Ex-works Chakan plant. Delivery schedules will be aligned with monthly EDI release orders.
            </li>
            <li>
              <strong>Tooling &amp; Fixtures:</strong> Standard CNC tooling amortized within piece price. Dedicated forging dies / special gauges billed separately upon PPAP approval if applicable.
            </li>
            <li>
              <strong>Quality Assurance:</strong> 100% critical dimension inspection with CMM reports provided per production heat lot.
            </li>
          </ol>
        </div>

        {/* Dual Signatures Block */}
        <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 items-end">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Costing Prepared By:</div>
            <div className="h-10 border-b border-slate-300 flex items-end pb-1 font-serif italic text-slate-700">
              Rajesh Sharma
            </div>
            <div className="font-semibold text-slate-800 text-xs mt-1">Rajesh Sharma</div>
            <div className="text-[10px] text-slate-500">Senior Costing Estimator · Company A</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase">Commercial Approval &amp; Authorization:</div>
            <div className="h-10 border-b border-slate-300 flex items-end justify-end pb-1 font-serif italic text-slate-700">
              Vikram Malhotra
            </div>
            <div className="font-semibold text-slate-800 text-xs mt-1">Vikram Malhotra</div>
            <div className="text-[10px] text-slate-500">Vice President, Commercial &amp; Sales</div>
          </div>
        </div>

        {/* Document Footer */}
        <div className="mt-8 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
          <span>System Generated by AutoQuote AI Engine · Company A</span>
          <span>Doc ID: QTN-{rfq.rfq_number}-ISO9001 · Page 1 of 1</span>
        </div>

      </div>

    </div>
  );
}
