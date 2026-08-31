import React, { useState } from 'react';
import {
  History,
  FileSpreadsheet,
  Search,
  Download,
  Filter,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { InventoryLedgerEntry, AuditLog } from '../types';

interface HistoryLedgerViewProps {
  ledger: InventoryLedgerEntry[];
  auditLogs: AuditLog[];
}

export const HistoryLedgerView: React.FC<HistoryLedgerViewProps> = ({
  ledger,
  auditLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'audit'>('ledger');
  const [search, setSearch] = useState<string>('');

  const filteredLedger = ledger.filter((l) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.sku.toLowerCase().includes(q) ||
        l.reference.toLowerCase().includes(q) ||
        l.changeType.toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredAudit = auditLogs.filter((a) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.targetId.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q) ||
        (a.field || '').toLowerCase().includes(q) ||
        (a.details || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            库存流水台账与操作审计日志
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            记录每一次货件发货扣减、FC入库上架、Case索赔调整与人工修改的全生命周期审计溯源
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'ledger'
                ? 'bg-white shadow-xs text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            库存变动流水 (Ledger)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'audit'
                ? 'bg-white shadow-xs text-purple-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            系统操作日志 (Audit Log)
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索 SKU / 单号 / 变动类型 / 审计操作..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-500 font-mono">
          共 {activeTab === 'ledger' ? filteredLedger.length : filteredAudit.length} 条记录
        </div>
      </div>

      {/* Content Table */}
      {activeTab === 'ledger' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">变动日期</th>
                  <th className="p-3">SKU 编号</th>
                  <th className="p-3">变动类型 (Change Type)</th>
                  <th className="p-3">关联单号 / 来源</th>
                  <th className="p-3 text-right">变动前数量</th>
                  <th className="p-3 text-right">变动数量</th>
                  <th className="p-3 text-right">变动后数量</th>
                  <th className="p-3">数据源</th>
                  <th className="p-3">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-600">{row.date}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{row.sku}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800">{row.changeType}</span>
                    </td>
                    <td className="p-3 font-mono text-blue-600">{row.reference}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{row.beforeQty}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      <span
                        className={row.changeQty > 0 ? 'text-emerald-600' : 'text-red-600'}
                      >
                        {row.changeQty > 0 ? `+${row.changeQty}` : row.changeQty}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {row.afterQty}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {row.source}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{row.notes || '—'}</td>
                  </tr>
                ))}

                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-xs text-slate-400">
                      暂无库存流水记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">操作时间</th>
                  <th className="p-3">操作对象 (Target)</th>
                  <th className="p-3">动作类型 (Action)</th>
                  <th className="p-3">变更字段</th>
                  <th className="p-3">修改前</th>
                  <th className="p-3">修改后</th>
                  <th className="p-3">来源 / 操作员</th>
                  <th className="p-3">明细说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAudit.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-500">
                      {log.timestamp.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{log.targetId}</td>
                    <td className="p-3">
                      <span className="font-semibold text-purple-700">{log.action}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-700">{log.field || '—'}</td>
                    <td className="p-3 font-mono text-slate-400">{log.beforeValue || '—'}</td>
                    <td className="p-3 font-mono font-semibold text-slate-900">
                      {log.afterValue || '—'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {log.operator || log.source || 'System'}
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{log.details || '—'}</td>
                  </tr>
                ))}

                {filteredAudit.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-xs text-slate-400">
                      暂无审计日志记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
