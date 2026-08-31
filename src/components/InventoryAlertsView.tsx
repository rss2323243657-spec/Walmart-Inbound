import React from 'react';
import {
  AlertTriangle,
  Boxes,
  TrendingDown,
  Clock,
  ArrowRight,
  ExternalLink,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { InventoryItem } from '../types';

interface InventoryAlertsViewProps {
  inventory: InventoryItem[];
  onSelectSku: (sku: string) => void;
  onOpenNewShipmentModal: () => void;
}

export const InventoryAlertsView: React.FC<InventoryAlertsViewProps> = ({
  inventory,
  onSelectSku,
  onOpenNewShipmentModal,
}) => {
  // 1. Critical Low Stock: Available < Safety Stock
  const lowStockItems = inventory.filter((i) => i.available < i.safetyStock);

  // 2. Reorder Recommended: (Available + Inbound) < Target Stock (or safetyStock * 2)
  const reorderItems = inventory.filter((i) => {
    const target = i.targetStock || i.safetyStock * 2;
    return i.available + i.inbound < target;
  });

  // 3. Overstock / Slow Moving: Available > (MaxStock || safetyStock * 5)
  const overstockItems = inventory.filter((i) => {
    const max = i.maxStock || i.safetyStock * 6;
    return i.available > max;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Walmart 库存智能预警与补货建议
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {lowStockItems.length} 个 SKU 低于安全水位
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            基于可用现货、在途补货与30天销售速率动态评估缺货风险与备货需求
          </p>
        </div>

        <button
          onClick={onOpenNewShipmentModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          创建补货发货批次
        </button>
      </div>

      {/* 3 Alert Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Critical Stock Out Risk */}
        <div className="bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-red-50/80 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold text-red-900">
                🔴 极度缺货风险 (Available &lt; 安全库存)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-red-700">
              {lowStockItems.length} 个
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto p-2 space-y-1">
            {lowStockItems.map((item) => (
              <div
                key={item.sku}
                onClick={() => onSelectSku(item.sku)}
                className="p-3 bg-red-50/30 hover:bg-red-50/70 rounded-lg cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">{item.sku}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 text-red-700 font-bold">
                    缺口 {item.safetyStock - item.available} 件
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">{item.productName}</div>
                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span>
                    现存: <strong className="text-red-600">{item.available}</strong> / 安全:{' '}
                    {item.safetyStock}
                  </span>
                  <span>在途: {item.inbound}</span>
                </div>
              </div>
            ))}

            {lowStockItems.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">所有 SKU 均在安全库存以上</div>
            )}
          </div>
        </div>

        {/* 2. Reorder Recommended */}
        <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-900">
                🟠 建议规划补货 (现货+在途不足)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-800">
              {reorderItems.length} 个
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto p-2 space-y-1">
            {reorderItems.map((item) => (
              <div
                key={item.sku}
                onClick={() => onSelectSku(item.sku)}
                className="p-3 bg-amber-50/30 hover:bg-amber-50/70 rounded-lg cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">{item.sku}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                    可售 {item.daysOfSupply ?? '—'} 天
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">{item.productName}</div>
                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span>
                    现货+在途: <strong>{item.available + item.inbound}</strong>
                  </span>
                  <span>目标: {item.targetStock || item.safetyStock * 2}</span>
                </div>
              </div>
            ))}

            {reorderItems.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">目前供应链总存量充裕</div>
            )}
          </div>
        </div>

        {/* 3. Overstock / Low Turnover */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800">⚪ 冗余积压/周转缓慢关注</span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700">
              {overstockItems.length} 个
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto p-2 space-y-1">
            {overstockItems.map((item) => (
              <div
                key={item.sku}
                onClick={() => onSelectSku(item.sku)}
                className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900">{item.sku}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                    库存偏多
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">{item.productName}</div>
                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span>可用: {item.available}</span>
                  <span>30天销: {item.sales30Days ?? '—'}</span>
                </div>
              </div>
            ))}

            {overstockItems.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">暂无积压过度 SKU</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
