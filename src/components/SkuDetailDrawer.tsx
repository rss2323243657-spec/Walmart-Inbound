import React from 'react';
import {
  X,
  Boxes,
  Truck,
  TrendingUp,
  History,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { InventoryItem, Shipment, InventoryLedgerEntry } from '../types';

interface SkuDetailDrawerProps {
  sku: string | null;
  inventoryItem?: InventoryItem;
  linkedShipments: Shipment[];
  ledgerEntries: InventoryLedgerEntry[];
  onClose: () => void;
  onSelectShipment: (shipmentId: string) => void;
}

export const SkuDetailDrawer: React.FC<SkuDetailDrawerProps> = ({
  sku,
  inventoryItem,
  linkedShipments,
  ledgerEntries,
  onClose,
  onSelectShipment,
}) => {
  if (!sku) return null;

  // Calculate cumulative shipment metrics for this SKU
  let totalShipped = 0;
  let totalReceived = 0;
  let totalDiscrepancy = 0;

  linkedShipments.forEach((s) => {
    const item = s.items?.find((it) => it.sku === sku);
    if (item) {
      totalShipped += item.shipQty;
      totalReceived += item.receivedQty;
      totalDiscrepancy += item.discrepancyQty;
    }
  });

  const cumulativeDiscrepancyRate =
    totalShipped > 0 ? ((totalDiscrepancy / totalShipped) * 100).toFixed(1) : '0.0';

  const skuLedger = ledgerEntries.filter((l) => l.sku === sku);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-base font-bold text-white tracking-tight">
                {sku}
              </span>
              {inventoryItem?.productType && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {inventoryItem.productType}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-300 mt-1">
              {inventoryItem?.productName || 'Walmart Catalog Product'}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Inventory Breakdown Cards */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              当前库存全貌 (Real-time Inventory Structure)
            </h4>

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500 font-medium">可用现货库存</div>
                <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                  {inventoryItem?.available ?? '—'}
                </div>
                <div className="text-[10px] text-slate-400">Available</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500 font-medium">在途运输数量</div>
                <div className="text-lg font-bold text-blue-600 font-mono mt-1">
                  {inventoryItem?.inbound ?? '0'}
                </div>
                <div className="text-[10px] text-slate-400">Inbound</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500 font-medium">待接收/清点中</div>
                <div className="text-lg font-bold text-amber-600 font-mono mt-1">
                  {inventoryItem?.receiving ?? '0'}
                </div>
                <div className="text-[10px] text-slate-400">Receiving</div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-[11px] text-blue-800 font-medium">预计可用总库存</div>
                <div className="text-lg font-bold text-blue-900 font-mono mt-1">
                  {inventoryItem?.totalProjected ?? '—'}
                </div>
                <div className="text-[10px] text-blue-600">系统计算值</div>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <span>
                安全库存阈值:{' '}
                <strong className="text-slate-800 font-mono">{inventoryItem?.safetyStock ?? 50}</strong>
              </span>
              <span>
                近30天销量:{' '}
                <strong className="text-slate-800 font-mono">{inventoryItem?.sales30Days ?? '暂无数据'}</strong>
              </span>
              <span>
                预计可售天数:{' '}
                <strong className="text-slate-800 font-mono">
                  {inventoryItem?.daysOfSupply !== undefined
                    ? `${inventoryItem.daysOfSupply} 天`
                    : '无法计算'}
                </strong>
              </span>
            </div>
          </div>

          {/* Cumulative Shipment Discrepancy Statistics */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              该 SKU 历史发货与累计收货核对
            </h4>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">累计发货</div>
                <div className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {totalShipped}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">累计接收</div>
                <div className="text-base font-bold text-blue-600 font-mono mt-0.5">
                  {totalReceived}
                </div>
              </div>
              <div
                className={`p-2.5 rounded-lg border ${
                  totalDiscrepancy > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-[11px] text-slate-500">累计差异</div>
                <div
                  className={`text-base font-bold font-mono mt-0.5 ${
                    totalDiscrepancy > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {totalDiscrepancy > 0 ? `-${totalDiscrepancy}` : '0'}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] text-slate-500">累计差异率</div>
                <div className="text-base font-bold text-slate-800 font-mono mt-0.5">
                  {cumulativeDiscrepancyRate}%
                </div>
              </div>
            </div>
          </div>

          {/* Linked Shipments Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              关联货件明细 ({linkedShipments.length} 票)
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">货件编号</th>
                    <th className="p-2.5">到仓日期</th>
                    <th className="p-2.5 text-right">发货数</th>
                    <th className="p-2.5 text-right">接收数</th>
                    <th className="p-2.5 text-right">差异</th>
                    <th className="p-2.5 text-center">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {linkedShipments.map((shp) => {
                    const it = shp.items?.find((i) => i.sku === sku);
                    return (
                      <tr key={shp.id} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <button
                            onClick={() => {
                              onSelectShipment(shp.id);
                              onClose();
                            }}
                            className="font-mono font-semibold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {shp.id}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">
                          {shp.arrivalDate || '在途/未到仓'}
                        </td>
                        <td className="p-2.5 text-right font-mono">{it?.shipQty ?? shp.totalShipQty}</td>
                        <td className="p-2.5 text-right font-mono text-blue-600 font-medium">
                          {it?.receivedQty ?? shp.totalReceivedQty}
                        </td>
                        <td
                          className={`p-2.5 text-right font-mono font-bold ${
                            (it?.discrepancyQty ?? shp.totalDiscrepancyQty) > 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {(it?.discrepancyQty ?? shp.totalDiscrepancyQty) > 0
                            ? `-${it?.discrepancyQty ?? shp.totalDiscrepancyQty}`
                            : '0'}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {shp.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {linkedShipments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        暂无关联货件
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inventory Ledger Timeline */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              库存变动流水记录 (Inventory Ledger)
            </h4>
            <div className="space-y-2">
              {skuLedger.map((l) => (
                <div
                  key={l.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{l.changeType}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{l.date}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {l.source}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      单号/来源: <span className="font-mono text-slate-700">{l.reference}</span>
                      {l.notes && <span> ({l.notes})</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono font-bold ${
                        l.changeQty > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {l.changeQty > 0 ? `+${l.changeQty}` : l.changeQty}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {l.beforeQty} → {l.afterQty}
                    </div>
                  </div>
                </div>
              ))}
              {skuLedger.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  该 SKU 暂无历史变动流水
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
