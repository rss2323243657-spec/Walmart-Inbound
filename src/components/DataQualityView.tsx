import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AnomalyItem, Shipment } from '../types';

interface DataQualityViewProps {
  anomalies: AnomalyItem[];
  shipments: Shipment[];
  onSelectShipment: (shipmentId: string) => void;
  onRefreshQualityCheck: () => void;
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({
  anomalies,
  shipments,
  onSelectShipment,
  onRefreshQualityCheck,
}) => {
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const filtered = anomalies.filter((a) => {
    if (levelFilter !== 'all' && a.level !== levelFilter) return false;
    return true;
  });

  const criticalCount = anomalies.filter((a) => a.level === 'critical').length;
  const warningCount = anomalies.filter((a) => a.level === 'warning').length;
  const infoCount = anomalies.filter((a) => a.level === 'info').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            数据质量监控与异常稽核中心 (Data Quality Center)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            实时侦测重复单号、日期逻辑倒挂（发货晚于到仓）、超收异常、缺失必填项等 8 类脏数据
          </p>
        </div>

        <button
          onClick={onRefreshQualityCheck}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          重新全量扫描
        </button>
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setLevelFilter(levelFilter === 'critical' ? 'all' : 'critical')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            levelFilter === 'critical'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-red-50/70 border-red-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">🔴 严重逻辑冲突 (Critical)</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">{criticalCount} 项</div>
          <div
            className={`text-[11px] mt-1 ${
              levelFilter === 'critical' ? 'text-red-100' : 'text-red-600'
            }`}
          >
            重复货件单号、到仓早于发货日等致命错误
          </div>
        </div>

        <div
          onClick={() => setLevelFilter(levelFilter === 'warning' ? 'all' : 'warning')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            levelFilter === 'warning'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">🟠 业务警告 (Warning)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">{warningCount} 项</div>
          <div
            className={`text-[11px] mt-1 ${
              levelFilter === 'warning' ? 'text-amber-100' : 'text-amber-700'
            }`}
          >
            超收异常、在途超期未送达、箱数短缺
          </div>
        </div>

        <div
          onClick={() => setLevelFilter(levelFilter === 'info' ? 'all' : 'info')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            levelFilter === 'info'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-blue-50/70 border-blue-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">🔵 信息补全提示 (Info)</span>
            <Info className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">{infoCount} 项</div>
          <div
            className={`text-[11px] mt-1 ${
              levelFilter === 'info' ? 'text-blue-100' : 'text-blue-700'
            }`}
          >
            缺少承运商、运单号或预计到仓日
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <span className="text-xs font-semibold">稽核异常明细 ({filtered.length} 条)</span>
          {levelFilter !== 'all' && (
            <button
              onClick={() => setLevelFilter('all')}
              className="text-[11px] text-blue-300 hover:underline"
            >
              清除过滤
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-4 hover:bg-slate-50 flex items-center justify-between transition-colors text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      item.level === 'critical'
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : item.level === 'warning'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {item.level}
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">[{item.type}]</span>
                  <span className="text-slate-600 font-mono">
                    货件: <strong>{item.shipmentId}</strong>
                  </span>
                </div>
                <div className="text-slate-700 leading-relaxed">{item.message}</div>
              </div>

              <div>
                <button
                  onClick={() => onSelectShipment(item.shipmentId)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  定位货件 <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              当前无未解决的数据质量异常，所有货件与库存数据健康合规
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
