import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Plus,
  Upload,
  Calendar,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { AnomalyItem, CaseRecord, Shipment } from '../types';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  globalSearch: string;
  onSearchChange: (query: string) => void;
  todayDateStr: string;
  isDemo: boolean;
  onResetDemo: () => void;
  onClearAllData?: () => void;
  onOpenNewShipmentModal: () => void;
  onNavigateToImport: () => void;
  
  // Notification stats
  urgentCases: Shipment[];
  overdueCases: Shipment[];
  approachingCases: Shipment[];
  lowStockCount: number;
  anomalies: AnomalyItem[];
  onSelectShipment?: (shipmentId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  globalSearch,
  onSearchChange,
  todayDateStr,
  isDemo,
  onResetDemo,
  onClearAllData,
  onOpenNewShipmentModal,
  onNavigateToImport,
  urgentCases,
  overdueCases,
  approachingCases,
  lowStockCount,
  anomalies,
  onSelectShipment,
}) => {
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const totalAlerts =
    urgentCases.length +
    overdueCases.length +
    approachingCases.length +
    lowStockCount +
    anomalies.filter((a) => a.level === 'critical').length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setShowBellDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0 z-20">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="全局搜索 SKU / Item ID / 货件编号 / Case ID / 运单号 / 产品名称..."
            value={globalSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {globalSearch && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">系统基准日:</span>
          <span>{todayDateStr}</span>
        </div>

        {/* Reference Data & Clear Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onResetDemo}
            title="加载/运行沃尔玛标准参考数据（8大业务场景）"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{isDemo ? '重置参考数据' : '运行参考数据'}</span>
          </button>

          {onClearAllData && (
            <button
              onClick={onClearAllData}
              title="清空当前所有货件、库存与工单记录"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空数据</span>
            </button>
          )}
        </div>

        {/* Notification Center */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setShowBellDropdown(!showBellDropdown)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="提醒中心"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {showBellDropdown && (
            <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold">待办预警与提醒中心</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 bg-red-500/20 text-red-300 rounded border border-red-400/30">
                  {totalAlerts} 项需关注
                </span>
              </div>

              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                {/* 1. Overdue Cases */}
                {overdueCases.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-red-50/70 border border-red-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-red-800 mb-1">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        已超期未开Case ({overdueCases.length})
                      </span>
                      <button
                        onClick={() => {
                          onSelectTab('discrepancies');
                          setShowBellDropdown(false);
                        }}
                        className="text-[11px] text-red-600 hover:underline flex items-center gap-0.5"
                      >
                        处理 <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="space-y-1 mt-1.5">
                      {overdueCases.slice(0, 3).map((shp) => (
                        <div
                          key={shp.id}
                          onClick={() => {
                            onSelectShipment?.(shp.id);
                            setShowBellDropdown(false);
                          }}
                          className="text-[11px] text-red-700 hover:bg-red-100/60 p-1.5 rounded cursor-pointer flex items-center justify-between"
                        >
                          <span className="font-mono font-medium">{shp.id}</span>
                          <span>
                            差异 {shp.totalDiscrepancyQty} 件 / 超期{' '}
                            {Math.abs(shp.daysUntilCase ?? 0)} 天
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Urgent Today Cases */}
                {urgentCases.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        今日达到 10 天 Case 条件 ({urgentCases.length})
                      </span>
                      <button
                        onClick={() => {
                          onSelectTab('cases');
                          setShowBellDropdown(false);
                        }}
                        className="text-[11px] text-amber-700 hover:underline flex items-center gap-0.5"
                      >
                        开Case <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="space-y-1 mt-1.5">
                      {urgentCases.slice(0, 3).map((shp) => (
                        <div
                          key={shp.id}
                          onClick={() => {
                            onSelectShipment?.(shp.id);
                            setShowBellDropdown(false);
                          }}
                          className="text-[11px] text-amber-800 hover:bg-amber-100/60 p-1.5 rounded cursor-pointer flex items-center justify-between"
                        >
                          <span className="font-mono font-medium">{shp.id}</span>
                          <span>差异 {shp.totalDiscrepancyQty} 件 (今日达标)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Approaching Cases */}
                {approachingCases.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        即将达到 10 天条件 (1-3天内) ({approachingCases.length})
                      </span>
                    </div>
                    <div className="space-y-1 mt-1.5">
                      {approachingCases.slice(0, 2).map((shp) => (
                        <div
                          key={shp.id}
                          className="text-[11px] text-blue-800 p-1.5 rounded flex items-center justify-between"
                        >
                          <span className="font-mono">{shp.id}</span>
                          <span>还剩 {shp.daysUntilCase} 天 / 差异 {shp.totalDiscrepancyQty} 件</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Low stock */}
                {lowStockCount > 0 && (
                  <div className="p-2.5 rounded-lg bg-orange-50/70 border border-orange-100 flex items-center justify-between">
                    <div className="text-xs text-orange-900 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                      <span>{lowStockCount} 个 SKU 低于安全库存</span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectTab('inventory-alerts');
                        setShowBellDropdown(false);
                      }}
                      className="text-[11px] text-orange-700 font-semibold hover:underline"
                    >
                      查看预警
                    </button>
                  </div>
                )}

                {/* 5. Data Anomalies */}
                {anomalies.filter((a) => a.level === 'critical').length > 0 && (
                  <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-100 flex items-center justify-between">
                    <div className="text-xs text-purple-900 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                      <span>
                        {anomalies.filter((a) => a.level === 'critical').length} 项严重数据异常
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        onSelectTab('data-quality');
                        setShowBellDropdown(false);
                      }}
                      className="text-[11px] text-purple-700 font-semibold hover:underline"
                    >
                      质量中心
                    </button>
                  </div>
                )}

                {totalAlerts === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    所有货件与库存数据运行正常，无待办异常
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <button
          onClick={onNavigateToImport}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>导入报表</span>
        </button>

        <button
          onClick={onOpenNewShipmentModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>手动新增货件</span>
        </button>
      </div>
    </header>
  );
};
