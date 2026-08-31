import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Download,
  AlertTriangle,
  ExternalLink,
  Edit2,
  TrendingDown,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { InventoryItem } from '../types';
import { exportInventoryToExcel } from '../utils/excelExporter';

interface InventoryManagementViewProps {
  inventory: InventoryItem[];
  onSelectSku: (sku: string) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
}

export const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({
  inventory,
  onSelectSku,
  onUpdateInventoryItem,
}) => {
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');

  // Edit Safety Stock modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newSafetyStock, setNewSafetyStock] = useState<number>(50);

  const productTypes = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => {
      if (i.productType) set.add(i.productType);
    });
    return Array.from(set);
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (typeFilter !== 'all' && item.productType !== typeFilter) return false;

      const isLow = item.available < item.safetyStock;
      const isOver = item.maxStock ? item.available > item.maxStock : false;

      if (stockStatusFilter === 'low' && !isLow) return false;
      if (stockStatusFilter === 'normal' && (isLow || isOver)) return false;
      if (stockStatusFilter === 'over' && !isOver) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.sku.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          (item.itemId || '').toLowerCase().includes(q) ||
          (item.gtin || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [inventory, typeFilter, stockStatusFilter, search]);

  const totalAvailable = inventory.reduce((acc, curr) => acc + curr.available, 0);
  const totalInbound = inventory.reduce((acc, curr) => acc + curr.inbound, 0);
  const totalReceiving = inventory.reduce((acc, curr) => acc + curr.receiving, 0);
  const totalProjected = inventory.reduce((acc, curr) => acc + curr.totalProjected, 0);

  const handleSaveSafetyStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    onUpdateInventoryItem({
      ...editingItem,
      safetyStock: newSafetyStock,
      updatedAt: new Date().toISOString(),
    });
    setEditingItem(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Walmart 库存全维度实时看板
            <span className="text-xs font-mono font-normal text-slate-500">
              ({filteredInventory.length} / {inventory.length} 个 SKU)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            涵盖可用现货、在途运输、待收清点及预计可用总库存（Available + Inbound + Receiving）
          </p>
        </div>

        <button
          onClick={() => exportInventoryToExcel(filteredInventory)}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          导出库存报表 (Excel)
        </button>
      </div>

      {/* 4 Inventory Structure Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">当前可用现货总计</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {totalAvailable.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Available Units</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">在途发运总计</div>
          <div className="text-xl font-bold font-mono text-indigo-600 mt-1">
            {totalInbound.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Inbound Units</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">待收/清点中总计</div>
          <div className="text-xl font-bold font-mono text-amber-600 mt-1">
            {totalReceiving.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Receiving Units</div>
        </div>

        <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 shadow-xs">
          <div className="text-[11px] font-medium text-blue-800">预计可用总库存</div>
          <div className="text-xl font-bold font-mono text-blue-900 mt-1">
            {totalProjected.toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-600">Total Projected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索 SKU / 产品名称 / Item ID / GTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">类目:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部类目</option>
              {productTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">库存健康:</span>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="low">低于安全库存 (Low Stock)</option>
              <option value="normal">健康充足 (Normal)</option>
              <option value="over">可能冗余积压 (Overstock)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SKU Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">SKU 编号</th>
                <th className="p-3">产品名称 / Item ID</th>
                <th className="p-3">产品类目</th>
                <th className="p-3 text-right">可用现货</th>
                <th className="p-3 text-right">在途数量</th>
                <th className="p-3 text-right">待收清点</th>
                <th className="p-3 text-right">预计可用总计</th>
                <th className="p-3 text-right">安全库存阈值</th>
                <th className="p-3 text-right">30天销量</th>
                <th className="p-3 text-right">可售天数</th>
                <th className="p-3 text-center">状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInventory.map((item) => {
                const isLow = item.available < item.safetyStock;

                return (
                  <tr key={item.sku} className="hover:bg-slate-50 transition-colors">
                    {/* SKU */}
                    <td className="p-3 font-mono font-bold">
                      <button
                        onClick={() => onSelectSku(item.sku)}
                        className="text-blue-600 hover:underline flex items-center gap-1 text-left"
                      >
                        {item.sku}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>

                    {/* Product Name & Item ID */}
                    <td className="p-3">
                      <div className="font-medium text-slate-900 truncate max-w-[200px]">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.itemId || '—'}
                      </div>
                    </td>

                    {/* Product Type */}
                    <td className="p-3 text-slate-600">{item.productType || 'General'}</td>

                    {/* Available */}
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {item.available}
                    </td>

                    {/* Inbound */}
                    <td className="p-3 text-right font-mono font-semibold text-indigo-600">
                      {item.inbound}
                    </td>

                    {/* Receiving */}
                    <td className="p-3 text-right font-mono font-semibold text-amber-600">
                      {item.receiving}
                    </td>

                    {/* Total Projected */}
                    <td className="p-3 text-right font-mono font-bold text-blue-700 bg-blue-50/40">
                      {item.totalProjected}
                    </td>

                    {/* Safety Stock */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {item.safetyStock}
                    </td>

                    {/* 30 Day Sales */}
                    <td className="p-3 text-right font-mono text-slate-800">
                      {item.sales30Days ?? '—'}
                    </td>

                    {/* Days of supply */}
                    <td className="p-3 text-right font-mono">
                      {item.daysOfSupply !== undefined ? (
                        <span
                          className={`font-semibold ${
                            item.daysOfSupply < 15 ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {item.daysOfSupply} 天
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="p-3 text-center">
                      {isLow ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-red-100 text-red-800 border border-red-200">
                          低库存预警
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          充足
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setNewSafetyStock(item.safetyStock);
                          }}
                          title="修改安全库存"
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectSku(item.sku)}
                          className="text-[11px] text-blue-600 hover:underline font-medium"
                        >
                          明细流水
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-12 text-center text-xs text-slate-400">
                    暂无符合条件的库存记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Stock Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-900">
              调整 SKU 安全库存阈值: {editingItem.sku}
            </h3>
            <form onSubmit={handleSaveSafetyStock} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">安全库存值 (Safety Stock)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newSafetyStock}
                  onChange={(e) => setNewSafetyStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  保存更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
