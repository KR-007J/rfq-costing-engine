'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Layers, 
  ArrowRight,
  RefreshCw,
  Copy,
  Info
} from 'lucide-react';

const PRESET_SAMPLES = [
  {
    title: 'Sample 1: Company B (Two-Wheelers) - Rear Wheel Spindle',
    badge: 'Email + Drawing OCR',
    text: `From: procurement@companyb-twowheelers.com
Subject: RFQ for Rear Wheel Spindle - BS970 EN8 Bar Machining
Dear Rajesh / Estimation Team,
Please submit your quotation for our Rear Wheel Spindle component as per enclosed Drawing DWG-RWS-8842-REV-C.

Annual volume requirement is 180,000 units/annum for the FY2026-27 production ramp up.
Drawing Title Block Summary:
- Part Name: Rear wheel spindle
- Drawing No: DWG-RWS-8842-REV-C
- Material: EN8 Carbon Steel Bar
- Raw Billet Wt: 0.61 kg
- Finished Part Wt: 0.48 kg
- Target Price: ₹85.00 / pc
- Critical Note: Induction harden journal bearing section ~0.8mm depth, finish grinding OD to ±0.008mm.
Required Quote turnaround: 4 working days.`
  },
  {
    title: 'Sample 2: Company C (Tractors) - Hydraulic Lift Arm',
    badge: 'Forging RFP Package',
    text: `From: sourcing@companyc-agri.com
Subject: Formal RFP - Hydraulic Lift Arm (Heavy Forging & Twin Bore VMC)
Company C, Chakan Tractor Division is inviting bids for Hydraulic lift arm.
Part Details:
- Part Name: Hydraulic lift arm
- Drawing No: DWG-HLA-4040-REV-B
- Material Grade: 40Cr4 forging (Alloy Steel)
- Rough Billet Wt: 4.60 kg
- Finished Machined Wt: 3.85 kg
- Annual SOP Volume: 24,000 units
- Target Price: ₹620.00 / unit
- Operations required: 1600T closed die forging, flash trimming, shot blast, twin-bore VMC machining.`
  },
  {
    title: 'Sample 3: Company D (Drivetrains) - Gear Blank',
    badge: 'Drawing Title Block Scan',
    text: `DRAWING TITLE BLOCK OCR CAPTURE:
----------------------------------------
CUSTOMER: Company D (drivetrains) Pune
PART NAME: Gear blank
PART NO / DWG: DWG-GB-202-REV-E
MATERIAL SPEC: 20MnCr5 (Case Hardening Alloy Steel)
ROUGH BILLET WT: 1.48 kg
FINISH WT: 1.15 kg
ANNUAL VOLUME: 60,000 units/year
TOLERANCE: Bore dia 42.00 +0.02/-0.00 mm
ROUTING NOTE: Forged rolled ring, face & bore turning, VMC keyway broach.`
  }
];

export default function AIRFQIntakeScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState(PRESET_SAMPLES[0].text);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [initializing, setInitializing] = useState(false);

  // Field overrides
  const [partName, setPartName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [drawingNo, setDrawingNo] = useState('');
  const [materialGrade, setMaterialGrade] = useState('');
  const [grossWt, setGrossWt] = useState(1.0);
  const [netWt, setNetWt] = useState(0.8);
  const [annualVol, setAnnualVol] = useState(60000);

  const handleRunExtraction = async () => {
    try {
      setAnalyzing(true);
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const json = await res.json();
      if (json.success) {
        setAnalysisResult(json);
        setPartName(json.extracted.part_name.value);
        setCustomerName(json.extracted.customer_name.value);
        setDrawingNo(json.extracted.drawing_number.value);
        setMaterialGrade(json.extracted.material_grade.value);
        setGrossWt(json.extracted.gross_weight_kg.value);
        setNetWt(json.extracted.net_weight_kg.value);
        setAnnualVol(json.extracted.annual_volume.value);
      }
    } catch (e) {
      console.error('Extraction error', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateAndInitialize = async () => {
    try {
      setInitializing(true);
      const payload = {
        part_name: partName,
        customer_name: customerName,
        drawing_number: drawingNo,
        material_grade: materialGrade,
        gross_weight_kg: grossWt,
        net_weight_kg: netWt,
        annual_volume: annualVol,
        routing_steps: analysisResult?.suggestedRouting,
        ai_extraction_provenance: {
          extracted_from: 'AI Drawing/Email Intake Parser',
          confidence_score: analysisResult?.overallConfidenceScore || 0.92,
          flagged_uncertainties: analysisResult?.flaggedUncertainties,
          historical_match: analysisResult?.historicalMatchExplanation,
          accepted_by_estimator: true,
        },
      };

      const res = await fetch('/api/rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        router.push(`/rfqs/${json.data.id}`);
      }
    } catch (e) {
      console.error('Failed to create RFQ', e);
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to RFQ Register
        </Link>
        
        {/* NDA Privacy Badge */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Customer Drawing NDA Protection: Zero External AI Training</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          AI RFQ Intake &amp; Drawing OCR Parser
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Extract customer metadata, material specs, and auto-recommend machine routings from past parts with confidence tags.
        </p>
      </div>

      {/* Preset Pickers */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">Choose a Chakan Client Sample:</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {PRESET_SAMPLES.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(sample.text);
                setAnalysisResult(null);
              }}
              className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                inputText === sample.text
                  ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold text-slate-900">{sample.title.split(' - ')[0]}</div>
              <div className="text-[11px] text-slate-600 truncate">{sample.title.split(' - ')[1]}</div>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                {sample.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Pane */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Intake Text / OCR Raw Dump
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {inputText.length} characters
          </span>
        </div>

        <textarea
          rows={7}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste RFQ email body, drawing title block OCR text, or Excel part row here..."
          className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:bg-white resize-y"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-500">
            Tip: Click &quot;Analyze &amp; Extract&quot; to parse entity fields, confidence scores, and historical routing matches.
          </div>
          <button
            onClick={handleRunExtraction}
            disabled={analyzing || !inputText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition-all"
          >
            {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyze &amp; Extract with AI
          </button>
        </div>
      </div>

      {/* Analysis Results Pane */}
      {analysisResult && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-5 animate-in fade-in duration-300">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Extraction Results &amp; Estimator Verification
              </h2>
              <p className="text-xs text-slate-500">
                Inspect extracted fields. Edit any value before creating the formal costing record.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Overall Accuracy:</span>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full font-mono">
                {Math.round(analysisResult.overallConfidenceScore * 100)}%
              </span>
            </div>
          </div>

          {/* Extracted Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            
            {/* Part Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Part Name</label>
                <span className="text-[10px] text-blue-600 font-mono">
                  {Math.round(analysisResult.extracted.part_name.confidence * 100)}% conf
                </span>
              </div>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium focus:bg-white"
              />
              <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={analysisResult.extracted.part_name.source_snippet}>
                Source: {analysisResult.extracted.part_name.source_snippet}
              </div>
            </div>

            {/* Customer Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Customer Name</label>
                <span className="text-[10px] text-blue-600 font-mono">
                  {Math.round(analysisResult.extracted.customer_name.confidence * 100)}% conf
                </span>
              </div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-medium focus:bg-white"
              />
              <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={analysisResult.extracted.customer_name.source_snippet}>
                Source: {analysisResult.extracted.customer_name.source_snippet}
              </div>
            </div>

            {/* Drawing Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Drawing Number</label>
                <span className="text-[10px] text-blue-600 font-mono">
                  {Math.round(analysisResult.extracted.drawing_number.confidence * 100)}% conf
                </span>
              </div>
              <input
                type="text"
                value={drawingNo}
                onChange={(e) => setDrawingNo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium focus:bg-white"
              />
              <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={analysisResult.extracted.drawing_number.source_snippet}>
                Source: {analysisResult.extracted.drawing_number.source_snippet}
              </div>
            </div>

            {/* Material Grade */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Material Grade</label>
                <span className="text-[10px] text-blue-600 font-mono">
                  {Math.round(analysisResult.extracted.material_grade.confidence * 100)}% conf
                </span>
              </div>
              <input
                type="text"
                value={materialGrade}
                onChange={(e) => setMaterialGrade(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold focus:bg-white text-slate-900"
              />
              <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={analysisResult.extracted.material_grade.source_snippet}>
                Source: {analysisResult.extracted.material_grade.source_snippet}
              </div>
            </div>

            {/* Weights */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Gross Wt / Net Wt (kg)</label>
                <span className="text-[10px] text-blue-600 font-mono">
                  {Math.round(analysisResult.extracted.gross_weight_kg.confidence * 100)}% conf
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={grossWt}
                  onChange={(e) => setGrossWt(parseFloat(e.target.value) || 0)}
                  className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  placeholder="Gross"
                />
                <input
                  type="number"
                  step="0.01"
                  value={netWt}
                  onChange={(e) => setNetWt(parseFloat(e.target.value) || 0)}
                  className="w-1/2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                  placeholder="Net"
                />
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Scrap: {(Math.max(0, grossWt - netWt)).toFixed(2)} kg
              </div>
            </div>

            {/* Annual Volume */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Annual Volume</label>
                <span className="text-[10px] text-blue-600 font-mono">
                  {Math.round(analysisResult.extracted.annual_volume.confidence * 100)}% conf
                </span>
              </div>
              <input
                type="number"
                value={annualVol}
                onChange={(e) => setAnnualVol(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono font-medium focus:bg-white"
              />
              <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={analysisResult.extracted.annual_volume.source_snippet}>
                Source: {analysisResult.extracted.annual_volume.source_snippet}
              </div>
            </div>

          </div>

          {/* Historical Routing Recommendation */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Recommended Routing from Past Parts
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {analysisResult.suggestedRouting.length} operations auto-configured
              </span>
            </div>
            
            <div className="text-xs text-blue-900 bg-blue-50/80 p-2 rounded border border-blue-200">
              <span className="font-semibold">Historical Match Provenance:</span> {analysisResult.historicalMatchExplanation}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              {analysisResult.suggestedRouting.map((op: any, i: number) => (
                <div key={i} className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-sans">Op {op.step_no}</div>
                  <div className="font-semibold text-slate-800 font-sans truncate">{op.operation_name}</div>
                  <div className="text-slate-500 mt-0.5">{op.machine_code}</div>
                  <div className="text-blue-700 font-bold mt-0.5">{op.cycle_time_minutes} min @ ₹{op.machine_hour_rate_inr}/hr</div>
                </div>
              ))}
            </div>
          </div>

          {/* Flagged Uncertainties Alert */}
          {analysisResult.flaggedUncertainties.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                AI Flagged Uncertainties (Requires Estimator Confirmation)
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800">
                {analysisResult.flaggedUncertainties.map((u: string, idx: number) => (
                  <li key={idx}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setAnalysisResult(null)}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Discard &amp; Re-paste
            </button>
            <button
              onClick={handleCreateAndInitialize}
              disabled={initializing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-sm transition-all"
            >
              {initializing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Accept &amp; Initialize Part Costing Sheet
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
