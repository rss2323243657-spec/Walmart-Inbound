import React from 'react';
import {
  LayoutDashboard,
  Truck,
  AlertTriangle,
  FileCheck,
  Boxes,
  Layers,
  BellRing,
  UploadCloud,
  ShieldCheck,
  History,
  Settings,
  Sparkles,
  Trash2,
  Calculator,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'shipments'
  | 'freight'
  | 'discrepancies'
  | 'cases'
  | 'inventory'
  | 'inventory-alerts'
  | 'data-import'
  | 'data-quality'
  | 'history-ledger'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  discrepancyCount?: number;
  caseEligibleCount?: number;
  anomalyCount?: number;
  lowStockCount?: number;
  badgeCounts?: {
    shipments?: number;
    discrepancies?: number;
    cases?: number;
    inventoryAlerts?: number;
    dataQuality?: number;
  };
  onResetDemo?: () => void;
  onClearAllData?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  discrepancyCount = 0,
  caseEligibleCount = 0,
  anomalyCount = 0,
  lowStockCount = 0,
  badgeCounts,
  onResetDemo,
  onClearAllData,
}) => {
  const actualDiscrepancyCount = badgeCounts?.discrepancies ?? discrepancyCount;
  const actualCaseCount = badgeCounts?.cases ?? caseEligibleCount;
  const actualAnomalyCount = badgeCounts?.dataQuality ?? anomalyCount;
  const actualLowStockCount = badgeCounts?.inventoryAlerts ?? lowStockCount;

  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard 总览',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'shipments' as NavTab,
      label: '货件管理',
      icon: Truck,
      badge: null,
    },
    {
      id: 'freight' as NavTab,
      label: '月头程费用汇总',
      icon: Calculator,
      badge: null,
    },
    {
      id: 'discrepancies' as NavTab,
      label: '收货差异',
      icon: AlertTriangle,
      badge: actualDiscrepancyCount > 0 ? actualDiscrepancyCount : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      id: 'cases' as NavTab,
      label: 'Case 管理',
      icon: FileCheck,
      badge: actualCaseCount > 0 ? actualCaseCount : null,
      badgeColor: 'bg-red-100 text-red-800 border-red-300 font-bold animate-pulse',
    },
    {
      id: 'inventory' as NavTab,
      label: '库存管理',
      icon: Boxes,
      badge: null,
    },
    {
      id: 'inventory-alerts' as NavTab,
      label: '库存预警',
      icon: BellRing,
      badge: actualLowStockCount > 0 ? actualLowStockCount : null,
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    {
      id: 'data-import' as NavTab,
      label: '数据导入中心',
      icon: UploadCloud,
      badge: null,
    },
    {
      id: 'data-quality' as NavTab,
      label: '数据质量中心',
      icon: ShieldCheck,
      badge: actualAnomalyCount > 0 ? actualAnomalyCount : null,
      badgeColor: 'bg-red-100 text-red-700 border-red-200',
    },
    {
      id: 'history-ledger' as NavTab,
      label: '库存流水与日志',
      icon: History,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: '系统设置',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            W
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight flex items-center gap-1.5">
              Walmart Inbound
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                US
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              库存与货件全生命周期
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          核心业务
        </div>
        {menuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                    item.badgeColor || 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mt-5 mb-2">
          库存与预警
        </div>
        {menuItems.slice(5, 7).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                    item.badgeColor || 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mt-5 mb-2">
          数据与质量
        </div>
        {menuItems.slice(7).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                    item.badgeColor || 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Reference Data Actions */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1">
          数据与环境
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {onResetDemo && (
            <button
              onClick={onResetDemo}
              title="运行/加载沃尔玛标准参考数据"
              className="px-2 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>运行参考数据</span>
            </button>
          )}

          {onClearAllData && (
            <button
              onClick={onClearAllData}
              title="清空所有本地业务数据"
              className="px-2 py-1.5 bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-300 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>清空数据</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/80">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            本地持久化就绪
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Walmart US</span>
        </div>
      </div>
    </aside>
  );
};
