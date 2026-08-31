import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Edit2,
  Plus,
  Building2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { CaseRecord, Shipment, CaseStatus } from '../types';

interface CaseManagementViewProps {
  cases: CaseRecord[];
  shipments: Shipment[];
  onOpenCaseModal: (shipment: Shipment, existingCase?: CaseRecord) => void;
  onSelectShipment: (shipmentId: string) => void;
}

export const CaseManagementView: React.FC<CaseManagementViewProps> = ({
  cases,
  shipments,
  onOpenCaseModal,
  onSelectShipment,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.shipmentId.toLowerCase().includes(q) ||
          c.sku.toLowerCase().includes(q) ||
          (c.walmartResponse || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [cases, search, statusFilter]);

  const totalCases = cases.length;
  const activeCases = cases.filter(
    (c) => c.status === 'Opened' || c.status === 'In Review' || c.status === 'Partially Resolved'
  );
  const resolvedCases = cases.filter((c) => c.status === 'Resolved' || c.status === 'Closed');
  const totalRecoveredUnits = cases.reduce((acc, curr) => acc + (curr.resolutionQty || 0), 0);
  const resolutionRate =
    totalCases > 0 ? ((resolvedCases.length / totalCases) * 100).toFixed(1) : '0.0';

  const kanbanStatuses: { status: CaseStatus; title: string; color: string }[] = [
    { status: 'Eligible', title: '待提交 / 满足条件', color: 'border-red-400 bg-red-50/50' },
    { status: 'Opened', title: '已提交 / 处理中', color: 'border-blue-400 bg-blue-50/50' },
    { status: 'In Review', title: 'Walmart 调查中', color: 'border-purple-400 bg-purple-50/50' },
    {
      status: 'Partially Resolved',
      title: '部分解决 / 补录',
      color: 'border-amber-400 bg-amber-50/50',
    },
    { status: 'Resolved', title: '已完全闭环 / 索赔成功', color: 'border-emerald-400 bg-emerald-50/50' },
    { status: 'Rejected', title: '已被驳回 / 申诉失败', color: 'border-slate-400 bg-slate-50/50' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Walmart 差异 Case 全流程索赔管理
            <span className="text-xs font-mono font-normal text-slate-500">
              ({filteredCases.length} / {totalCases} 宗 Case)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            跟踪从 Case 开立、Walmart 官方反馈、补录确认到最终全额闭环的全流程台账
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              表格视图
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === 'kanban' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              看板视图
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">Case 总数</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{totalCases} 宗</div>
          <div className="text-[10px] text-slate-400">Total Cases</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">正在处理中 (Active)</div>
          <div className="text-xl font-bold font-mono text-blue-600 mt-1">
            {activeCases.length} 宗
          </div>
          <div className="text-[10px] text-slate-400">Opened / In Review</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">已解决闭环 (Resolved)</div>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {resolvedCases.length} 宗
          </div>
          <div className="text-[10px] text-slate-400">结案率: {resolutionRate}%</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">成功索赔/补录数量</div>
          <div className="text-xl font-bold font-mono text-purple-600 mt-1">
            +{totalRecoveredUnits} 件
          </div>
          <div className="text-[10px] text-slate-400">Recovered Units</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索 Case 编号 / 货件编号 / SKU / Walmart 反馈关键词..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">状态筛选:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部状态 (All)</option>
            <option value="Eligible">Eligible (待开Case)</option>
            <option value="Opened">Opened (已开Case)</option>
            <option value="In Review">In Review (调查中)</option>
            <option value="Partially Resolved">Partially Resolved (部分解决)</option>
            <option value="Resolved">Resolved (已解决)</option>
            <option value="Rejected">Rejected (已驳回)</option>
            <option value="Closed">Closed (已关闭)</option>
          </select>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Case 编号</th>
                  <th className="p-3">关联货件</th>
                  <th className="p-3">SKU / 品名</th>
                  <th className="p-3 text-right">短少差异</th>
                  <th className="p-3 text-right">已补录/赔偿</th>
                  <th className="p-3 text-right">最终剩余差异</th>
                  <th className="p-3">开Case日期</th>
                  <th className="p-3">Walmart 客服反馈记录</th>
                  <th className="p-3 text-center">状态</th>
                  <th className="p-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCases.map((c) => {
                  const targetShipment = shipments.find((s) => s.id === c.shipmentId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      {/* Case ID */}
                      <td className="p-3 font-mono font-bold text-purple-700">{c.id}</td>

                      {/* Shipment ID */}
                      <td className="p-3">
                        <button
                          onClick={() => onSelectShipment(c.shipmentId)}
                          className="font-mono font-semibold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {c.shipmentId}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </td>

                      {/* SKU */}
                      <td className="p-3">
                        <div className="font-mono font-semibold text-slate-900">{c.sku}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {c.productName}
                        </div>
                      </td>

                      {/* Discrepancy */}
                      <td className="p-3 text-right font-mono font-bold text-red-600">
                        -{c.discrepancyQty}
                      </td>

                      {/* Resolved */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        +{c.resolutionQty || 0}
                      </td>

                      {/* Final Diff */}
                      <td className="p-3 text-right font-mono font-bold">
                        {c.finalDifference === 0 ? (
                          <span className="text-emerald-600">0 (闭环)</span>
                        ) : (
                          <span className="text-red-600">-{c.finalDifference}</span>
                        )}
                      </td>

                      {/* Open Date */}
                      <td className="p-3 font-mono text-slate-600">{c.caseOpenDate || '—'}</td>

                      {/* Walmart Response */}
                      <td className="p-3">
                        <div className="truncate max-w-[220px] text-slate-700">
                          {c.walmartResponse || <span className="text-slate-400">暂无官方回复</span>}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                            c.status === 'Resolved' || c.status === 'Closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'In Review' || c.status === 'Opened'
                              ? 'bg-blue-100 text-blue-800 font-bold'
                              : c.status === 'Partially Resolved'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (targetShipment) onOpenCaseModal(targetShipment, c);
                          }}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-[11px] font-medium shadow-xs flex items-center gap-1 mx-auto transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          更新进展
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredCases.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-xs text-slate-400">
                      暂无匹配的 Case 记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {kanbanStatuses.map((k) => {
            const list = filteredCases.filter((c) => c.status === k.status);
            return (
              <div
                key={k.status}
                className={`rounded-xl border p-3 flex flex-col min-h-[420px] ${k.color}`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">{k.title}</span>
                  <span className="text-xs font-mono font-semibold px-1.5 py-0.2 bg-white rounded border border-slate-200">
                    {list.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {list.map((c) => {
                    const targetShipment = shipments.find((s) => s.id === c.shipmentId);
                    return (
                      <div
                        key={c.id}
                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-purple-700">{c.id}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {c.caseOpenDate?.slice(5)}
                          </span>
                        </div>

                        <div className="text-[11px]">
                          <span className="text-slate-500">货件: </span>
                          <span className="font-mono text-slate-800 font-semibold">
                            {c.shipmentId}
                          </span>
                        </div>

                        <div className="flex items-center justify-between font-mono pt-1 border-t border-slate-100">
                          <span className="text-red-600 font-bold">短少 -{c.discrepancyQty}</span>
                          <span className="text-emerald-600 font-bold">
                            已补 +{c.resolutionQty || 0}
                          </span>
                        </div>

                        {c.walmartResponse && (
                          <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 line-clamp-2">
                            {c.walmartResponse}
                          </div>
                        )}

                        <button
                          onClick={() => {
                            if (targetShipment) onOpenCaseModal(targetShipment, c);
                          }}
                          className="w-full py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-medium transition-colors"
                        >
                          更新 Case 状态
                        </button>
                      </div>
                    );
                  })}

                  {list.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">无数据</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
