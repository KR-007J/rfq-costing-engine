'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Database, 
  ArrowLeft, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  History, 
  Layers, 
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { RateMasterDatabase, MaterialRateRecord, MachineHourRateRecord } from '@/lib/db';

export default function RateMastersPage() {
  const [rates, setRates] = useState<RateMasterDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'material' | 'machine'>('material');

  // Form State
  const [materialGrade, setMaterialGrade] = useState('EN8');
  const [baseRatePerKg, setBaseRatePerKg] = useState('78.0');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [versionTag, setVersionTag] = useState('v3.0');

  const [machineCode, setMachineCode] = useState('CNC-TURN-01');
  const [hourRateInr, setHourRateInr] = useState('880.0');
  const [setupRateInr, setSetupRateInr] = useState('475.0');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rates');
      const json = await res.json();
      if (json.success) {
        setRates(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch rate masters', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = modalType === 'material' ? {
        type: 'material',
        material_grade: materialGrade,
        base_rate_per_kg: parseFloat(baseRatePerKg),
        effective_from: effectiveFrom,
        version: versionTag,
      } : {
        type: 'machine',
        machine_code: machineCode,
        hour_rate_inr: parseFloat(hourRateInr),
        setup_rate_inr: parseFloat(setupRateInr),
        effective_from: effectiveFrom,
        version: versionTag,
      };

      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Successfully added ${modalType} rate version ${versionTag}`);
        setModalOpen(false);
        fetchRates();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (e) {
      console.error('Error adding rate version', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
        <p className="text-sm text-slate-600 font-medium">Loading Rate Masters Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to RFQ Register
        </Link>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          + Add New Rate Version
        </button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Rate Masters with Effective Dates &amp; Snapshot Immutability
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl">
          Single source of truth for raw material commodity prices and machine hour rates (MHR). All past quotes bind to the rate snapshot in effect on their quotation date, preventing retro-active drift.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Section 1: Material Rates Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              1. Raw Material Commodity Rates (₹/kg)
            </h2>
            <p className="text-[11px] text-slate-500">
              Versioned alloy bar stock and forging billet base rates
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {rates?.material_rates.length} historical records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-sans uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Grade</th>
                <th className="py-2.5 px-3">Material Category</th>
                <th className="py-2.5 px-3 text-right">Density</th>
                <th className="py-2.5 px-3 text-right">Base Rate (₹/kg)</th>
                <th className="py-2.5 px-3">Effective Range</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {rates?.material_rates.map((mat) => {
                const isActive = !mat.effective_to || mat.effective_to >= new Date().toISOString().split('T')[0];
                return (
                  <tr key={mat.id} className={isActive ? 'bg-white font-medium' : 'bg-slate-50/60 text-slate-400'}>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{mat.material_grade}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{mat.material_type}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{mat.density_kg_dm3} kg/dm³</td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-700">₹{mat.base_rate_per_kg.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {mat.effective_from} → {mat.effective_to || 'Active / Present'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono">
                        {mat.version}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-sans text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Machine Hour Rates Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Machine Hour Rates (MHR) &amp; Setup Standards
            </h2>
            <p className="text-[11px] text-slate-500">
              Chakan plant work centers: CNC Lathes, 1600T Forging Press, VMC 4-Axis, Induction line
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {rates?.machine_hour_rates.length} machines calibrated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-sans uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Machine Code</th>
                <th className="py-2.5 px-3">Machine Description</th>
                <th className="py-2.5 px-3 text-right">Operating MHR (₹/hr)</th>
                <th className="py-2.5 px-3 text-right">Setup Rate (₹/hr)</th>
                <th className="py-2.5 px-3">Effective From</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {rates?.machine_hour_rates.map((mhr) => {
                const isActive = !mhr.effective_to;
                return (
                  <tr key={mhr.id} className={isActive ? 'bg-white font-medium' : 'bg-slate-50/60 text-slate-400'}>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{mhr.machine_code}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{mhr.machine_name}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-700">₹{mhr.hour_rate_inr.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">₹{mhr.setup_rate_inr.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-slate-600">{mhr.effective_from} → {mhr.effective_to || 'Present'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono">
                        {mhr.version}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-sans text-slate-400">Archived</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Scrap & Standard Overheads Master */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Scrap Recovery Rates */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-200">
            3. Scrap Recovery Credit Rates
          </h2>
          <div className="mt-3 space-y-2 text-xs font-mono">
            {rates?.scrap_recovery_rates.map((scrap) => (
              <div key={scrap.id} className="flex justify-between items-center p-2 rounded bg-slate-50 border border-slate-200">
                <span className="font-sans text-slate-700">{scrap.material_category}</span>
                <span className="font-bold text-emerald-700">₹{scrap.credit_rate_per_kg.toFixed(2)} / kg</span>
              </div>
            ))}
          </div>
        </div>

        {/* Standard Factory Overheads */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-200">
            4. Factory Overheads &amp; Logistics Baseline
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-sans text-slate-500">Factory Overhead:</div>
              <div className="font-bold text-slate-800">{rates?.standard_overheads.factory_overhead_percent}%</div>
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-sans text-slate-500">Quality Inspection:</div>
              <div className="font-bold text-slate-800">{rates?.standard_overheads.quality_inspection_percent}%</div>
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-sans text-slate-500">Packaging (Corrugated/VCI):</div>
              <div className="font-bold text-slate-800">₹{rates?.standard_overheads.packaging_per_piece_inr} / pc</div>
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-sans text-slate-500">Logistics Freight:</div>
              <div className="font-bold text-slate-800">₹{rates?.standard_overheads.freight_per_piece_inr} / pc</div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal: Add Rate Version */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Add New Master Rate Version</h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRate} className="space-y-3 text-xs">
              
              {/* Type Switcher */}
              <div className="flex bg-slate-100 p-1 rounded">
                <button
                  type="button"
                  onClick={() => setModalType('material')}
                  className={`w-1/2 py-1 text-xs font-semibold rounded transition-all ${
                    modalType === 'material' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Raw Material Rate
                </button>
                <button
                  type="button"
                  onClick={() => setModalType('machine')}
                  className={`w-1/2 py-1 text-xs font-semibold rounded transition-all ${
                    modalType === 'machine' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Machine Hour Rate (MHR)
                </button>
              </div>

              {modalType === 'material' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Material Grade
                    </label>
                    <select
                      value={materialGrade}
                      onChange={(e) => setMaterialGrade(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium"
                    >
                      <option value="EN8">EN8 (Current: ₹76.50/kg)</option>
                      <option value="40Cr4 forging">40Cr4 forging (Current: ₹98.00/kg)</option>
                      <option value="20MnCr5">20MnCr5 (Current: ₹110.00/kg)</option>
                      <option value="C45">C45 (Current: ₹68.00/kg)</option>
                      <option value="SS304">SS304 (Current: ₹240.00/kg)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      New Base Rate (₹/kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={baseRatePerKg}
                      onChange={(e) => setBaseRatePerKg(e.target.value)}
                      className="w-full p-2 font-mono bg-slate-50 border border-slate-200 rounded"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Machine Code
                    </label>
                    <select
                      value={machineCode}
                      onChange={(e) => setMachineCode(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-medium font-mono"
                    >
                      <option value="CNC-TURN-01">CNC-TURN-01 (CNC Turning Center)</option>
                      <option value="FORGE-PRESS-1600T">FORGE-PRESS-1600T (1600T Forging Press)</option>
                      <option value="VMC-4AX-02">VMC-4AX-02 (4-Axis VMC)</option>
                      <option value="CYL-GRIND-01">CYL-GRIND-01 (Cylindrical Grinder)</option>
                      <option value="HEAT-INDUCT-01">HEAT-INDUCT-01 (Induction Hardening)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Hour Rate (₹/hr)
                      </label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={hourRateInr}
                        onChange={(e) => setHourRateInr(e.target.value)}
                        className="w-full p-2 font-mono bg-slate-50 border border-slate-200 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Setup Rate (₹/hr)
                      </label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={setupRateInr}
                        onChange={(e) => setSetupRateInr(e.target.value)}
                        className="w-full p-2 font-mono bg-slate-50 border border-slate-200 rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Effective From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full p-2 font-mono bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Version Tag
                  </label>
                  <input
                    type="text"
                    required
                    value={versionTag}
                    onChange={(e) => setVersionTag(e.target.value)}
                    className="w-full p-2 font-mono bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs"
                >
                  {submitting ? 'Stamping Version...' : 'Save Rate Version'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
