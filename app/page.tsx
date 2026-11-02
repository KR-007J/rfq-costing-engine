'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Send, 
  ArrowUpRight, 
  Sparkles, 
  TrendingUp, 
  IndianRupee, 
  FileText,
  ShieldAlert,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useUser } from './components/Navbar';
import { RFQRecord } from '@/lib/db';

export default function RFQRegisterPage() {
  const { role } = useUser();
  const [rfqs, setRfqs] = useState<RFQRecord[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/rfqs', window.location.origin);
      if (activeTab !== 'all') url.searchParams.set('status', activeTab);
      if (searchQuery) url.searchParams.set('search', searchQuery);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setRfqs(json.data);
        setMetrics(json.metrics);
      }
    } catch (e) {
      console.error('Failed to fetch RFQs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQs();
  }, [activeTab, searchQuery]);

  const getStatusBadge = (status: RFQRecord['status'], lostReason?: string) => {
    switch (status) {
      case 'estimating':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            Estimating
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldAlert className="w-3 h-3" />
            Approval Needed (&gt; ₹25L)
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
            <Send className="w-3 h-3" />
            Quote Sent
          </span>
        );
      case 'won':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Order Won
          </span>
        );
      case 'lost':
        return (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 w-fit">
              <XCircle className="w-3 h-3" />
              Lost
            </span>
            {lostReason && (
              <span className="text-[10px] text-rose-600 mt-1 max-w-[200px] truncate" title={lostReason}>
                {lostReason}
              </span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">RFQ Register & Quoting Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active costings, machine routings, and high-value approvals for Company A, Chakan plant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRFQs()}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            title="Refresh Table"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/rfqs/new"
            className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            + New AI RFQ Intake
          </Link>
        </div>
      </div>

      {/* Metric Cards (Industrial KPI Dashboard) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Total RFQs</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {metrics?.totalCount ?? 8}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">FY 2026-27 Active</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-medium text-blue-600">Estimating</div>
          <div className="text-xl font-bold text-blue-900 mt-1 font-mono">
            {metrics?.estimatingCount ?? 2}
          </div>
          <div className="text-[10px] text-blue-500 mt-0.5">In engineering review</div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/30 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Pending Approval
          </div>
          <div className="text-xl font-bold text-amber-900 mt-1 font-mono">
            {metrics?.pendingApprovalCount ?? 1}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">&gt; ₹25 Lakhs threshold</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-600">Quotes Sent</div>
          <div className="text-xl font-bold text-slate-800 mt-1 font-mono">
            {metrics?.sentCount ?? 1}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting customer PO</div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/30 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Win Rate
          </div>
          <div className="text-xl font-bold text-emerald-800 mt-1 font-mono">
            {metrics?.winRate ?? 50}%
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">
            {metrics?.wonCount ?? 2} Won / {metrics?.lostCount ?? 2} Lost
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-medium text-slate-600">Avg Turnaround</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono text-emerald-600">
            3.8 Days
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Target: 4d (Prev: 9d)</div>
        </div>

      </div>

      {/* Role Banner Alert for Sales Head */}
      {role === 'sales_head' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Sales Head Mode Active:</strong> You have approval authority for high-value quotes exceeding <strong>₹25 Lakhs</strong> annual value.
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('pending_approval')}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium transition-colors"
          >
            Review Pending ({metrics?.pendingApprovalCount ?? 1})
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All RFQs' },
            { id: 'estimating', label: 'Estimating' },
            { id: 'pending_approval', label: 'Pending Approval' },
            { id: 'sent', label: 'Sent' },
            { id: 'won', label: 'Won' },
            { id: 'lost', label: 'Lost' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search RFQ, customer, part, material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>

      </div>

      {/* RFQ Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">RFQ &amp; Date</th>
                <th className="py-2.5 px-3">Customer &amp; Tier</th>
                <th className="py-2.5 px-3">Part Details</th>
                <th className="py-2.5 px-3">Material &amp; Wt</th>
                <th className="py-2.5 px-3 text-right">Annual Vol</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading RFQs...
                    </div>
                  </td>
                </tr>
              ) : rfqs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="font-medium text-slate-600">No RFQs found</p>
                    <p className="text-[11px] mt-1">Try clearing filters or search query.</p>
                  </td>
                </tr>
              ) : (
                rfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* RFQ No & Created Date */}
                    <td className="py-3 px-3">
                      <Link 
                        href={`/rfqs/${rfq.id}`}
                        className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        {rfq.rfq_number}
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </Link>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {rfq.created_date}
                      </div>
                    </td>

                    {/* Customer & Tier */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{rfq.customer_name}</div>
                      <div className="text-[10px] text-slate-500">{rfq.customer_tier}</div>
                    </td>

                    {/* Part Details & Drawing Rev */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{rfq.part_name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{rfq.drawing_number}</div>
                    </td>

                    {/* Material & Weight */}
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800">{rfq.material_grade}</span>
                      <div className="text-[10px] font-mono text-slate-500">
                        Gross: {rfq.gross_weight_kg} kg | Net: {rfq.net_weight_kg} kg
                      </div>
                    </td>

                    {/* Annual Volume */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                      {rfq.annual_volume.toLocaleString('en-IN')} pcs
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {getStatusBadge(rfq.status, rfq.lost_reason)}
                    </td>

                    {/* Due Date & Owner */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{rfq.due_date}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        {rfq.assigned_estimator.split(' ')[0]}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/rfqs/${rfq.id}`}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                        >
                          Costing
                        </Link>
                        <Link
                          href={`/rfqs/${rfq.id}/quote`}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                          title="View PDF Quotation"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
