import React from 'react';
import {
  Boxes,
  Truck,
  Clock,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingDown,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
  UploadCloud,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { Shipment, InventoryItem, CaseRecord, AnomalyItem } from '../types';
import { NavTab } from './Sidebar';
import { getCaseTimeDisplay } from '../utils/dateUtils';

interface DashboardViewProps {
  shipments: Shipment[];
  inventory: InventoryItem[];
  cases: CaseRecord[];
  anomalies: AnomalyItem[];
  onSelectTab: (tab: NavTab) => void;
  onSelectShipment: (shipmentId: string) => void;
  onSelectSku: (sku: string) => void;
  onOpenNewShipmentModal: () => void;
  onOpenCaseModal: (shipment: Shipment) => void;
  onResetDemo?: () => void;
  onClearAllData?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  shipments,
  inventory,
  cases,
  anomalies,
  onSelectTab,
  onSelectShipment,
  onSelectSku,
  onOpenNewShipmentModal,
  onOpenCaseModal,
  onResetDemo,
  onClearAllData,
}) => {
  // Metric Calculations
  const totalAvailableInventory = inventory.reduce((acc, curr) => acc + curr.available, 0);
  const totalInbound = inventory.reduce((acc, curr) => acc + curr.inbound, 0);
  const totalReceiving = inventory.reduce((acc, curr) => acc + curr.receiving, 0);

  // Shipments with Discrepancy
  const discrepancyShipments = shipments.filter((s) => s.totalDiscrepancyQty > 0);
  const totalDiscrepancyUnits = discrepancyShipments.reduce(
    (acc, curr) => acc + curr.totalDiscrepancyQty,
    0
  );

  // 10-Day Case Required (DaysUntilCase <= 0 and not opened/in review/resolved)
  const caseRequiredShipments = shipments.filter(
    (s) =>
      s.totalDiscrepancyQty > 0 &&
      s.arrivalDate &&
      s.daysUntilCase !== undefined &&
      s.daysUntilCase <= 0 &&
      s.caseStatus !== 'Opened' &&
      s.caseStatus !== 'In Review' &&
      s.caseStatus !== 'Resolved' &&
      s.caseStatus !== 'Closed'
  );

  // Approaching 10-Day (1 <= daysUntilCase <= 3)
  const approachingShipments = shipments.filter(
    (s) =>
      s.totalDiscrepancyQty > 0 &&
      s.arrivalDate &&
      s.daysUntilCase !== undefined &&
      s.daysUntilCase > 0 &&
      s.daysUntilCase <= 3
  );

  // Case Processing
  const caseProcessingCount = cases.filter(
    (c) => c.status === 'Opened' || c.status === 'In Review' || c.status === 'Partially Resolved'
  ).length;

  // Case Resolved
  const caseResolvedCount = cases.filter(
    (c) => c.status === 'Resolved' || c.status === 'Closed'
  ).length;

  // Overdue (>10 days without case)
  const overdueShipments = caseRequiredShipments.filter(
    (s) => s.daysUntilCase !== undefined && s.daysUntilCase < 0
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Empty State Onboarding Banner */}
      {shipments.length === 0 && inventory.length === 0 && (
        <div className="p-8 bg-gradient-to-br from-blue-50/80 via-white to-amber-50/60 rounded-2xl border border-blue-200/80 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-xl mx-auto">
            <h2 className="text-lg font-bold text-slate-900">
              欢迎使用 Walmart 卖家入库与库存管理系统
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              当前暂无业务数据。您可以一键运行参考数据快速体验完整 8 大业务流转场景，或直接导入您从 Walmart 后台导出的报表文件。
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onResetDemo && (
              <button
                type="button"
                onClick={onResetDemo}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                运行参考数据 (体验 8 大典型场景)
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectTab('data-import')}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-blue-600" />
              导入 Walmart 报表 (Excel/CSV)
            </button>
            <button
              type="button"
              onClick={onOpenNewShipmentModal}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              手动新增单票货件
            </button>
          </div>
        </div>
      )}

      {/* 7 Core Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Available */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">当前可用库存</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-2">
            {totalAvailableInventory.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Available Inventory</div>
        </div>

        {/* 2. Inbound / In Transit */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">在途发运数量</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-2">
            {totalInbound.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">In Transit</div>
        </div>

        {/* 3. Receiving */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">待接收/清点中</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600 font-mono mt-2">
            {totalReceiving.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Receiving</div>
        </div>

        {/* 4. Receiving Discrepancy */}
        <div
          onClick={() => onSelectTab('discrepancies')}
          className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition-all ${
            discrepancyShipments.length > 0
              ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">存在数量差异</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-700 font-mono mt-2">
            {discrepancyShipments.length}{' '}
            <span className="text-xs font-normal text-amber-600">
              ({totalDiscrepancyUnits}件)
            </span>
          </div>
          <div className="text-[10px] text-amber-600/80 mt-1">Receiving Discrepancy</div>
        </div>

        {/* 5. 10-Day Case Required */}
        <div
          onClick={() => onSelectTab('discrepancies')}
          className={`p-3.5 rounded-xl border shadow-xs cursor-pointer transition-all ${
            caseRequiredShipments.length > 0
              ? 'bg-red-50/80 border-red-200 hover:border-red-300 ring-1 ring-red-300/50'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-800">已达10天Case条件</span>
            <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-red-700 font-mono mt-2">
            {caseRequiredShipments.length}{' '}
            <span className="text-xs font-normal text-red-600">票货件</span>
          </div>
          <div className="text-[10px] text-red-600/80 mt-1">Case Required</div>
        </div>

        {/* 6. Case Processing */}
        <div
          onClick={() => onSelectTab('cases')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Case 处理中</span>
            <FileCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-purple-700 font-mono mt-2">
            {caseProcessingCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Case Processing</div>
        </div>

        {/* 7. Resolved */}
        <div
          onClick={() => onSelectTab('cases')}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">已闭环 / 解决</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 font-mono mt-2">
            {caseResolvedCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Resolved</div>
        </div>
      </div>

      {/* Warning & Urgent Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 🔴 紧急处理: 10天Case达成 & 超期未处理 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-red-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-red-50/70 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-xs font-bold text-red-900">
                🔴 紧急处理：已达到 10 天 Walmart Case 索赔条件
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-red-700">
              共 {caseRequiredShipments.length} 票货件 / 合计短少{' '}
              {caseRequiredShipments.reduce((acc, curr) => acc + curr.totalDiscrepancyQty, 0)} 件
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {caseRequiredShipments.map((shp) => {
              const time = getCaseTimeDisplay(shp.arrivalDate);
              return (
                <div
                  key={shp.id}
                  className="p-3.5 hover:bg-slate-50 flex items-center justify-between transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectShipment(shp.id)}
                        className="font-mono text-xs font-bold text-blue-600 hover:underline"
                      >
                        {shp.id}
                      </button>
                      <span className="text-xs text-slate-700">{shp.shipmentName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {shp.fc}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>
                        到仓日期:{' '}
                        <strong className="font-mono text-slate-800">{shp.arrivalDate}</strong>
                      </span>
                      <span>•</span>
                      <span className="text-red-600 font-semibold">{time.text}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-red-600">
                        短少 -{shp.totalDiscrepancyQty} 件
                      </div>
                      <div className="text-[10px] text-slate-400">
                        发 {shp.totalShipQty} / 收 {shp.totalReceivedQty}
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenCaseModal(shp)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      开Case
                    </button>
                  </div>
                </div>
              );
            })}

            {caseRequiredShipments.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                暂无已达到10天Case条件的未处理货件
              </div>
            )}
          </div>
        </div>

        {/* 🟠 即将达到Case条件 (3天内) */}
        <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-900">
                🟠 即将达到 Case 条件 (1-3天内)
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-amber-800">
              {approachingShipments.length} 票
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto p-1">
            {approachingShipments.map((shp) => (
              <div
                key={shp.id}
                onClick={() => onSelectShipment(shp.id)}
                className="p-3 hover:bg-amber-50/40 rounded-lg cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-800">{shp.id}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                    还剩 {shp.daysUntilCase} 天
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>到仓日: {shp.arrivalDate}</span>
                  <span className="font-mono text-red-600 font-semibold">
                    差异: {shp.totalDiscrepancyQty} 件
                  </span>
                </div>
              </div>
            ))}

            {approachingShipments.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                暂无将在3天内达到条件的货件
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discrepancy & SKU Inventory Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 🟡 收货异常与高差异货件 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              收货异常与短少明细 (Top Discrepancies)
            </h4>
            <button
              onClick={() => onSelectTab('discrepancies')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              查看全部差异 <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {discrepancyShipments.slice(0, 5).map((shp) => (
              <div
                key={shp.id}
                onClick={() => onSelectShipment(shp.id)}
                className="p-3.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{shp.id}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {shp.fc}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {shp.items?.[0]?.productName || shp.shipmentName}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-red-600">
                    -{shp.totalDiscrepancyQty} 件
                  </span>
                  <div className="text-[10px] text-slate-400">
                    {shp.arrivalDate ? `到仓: ${shp.arrivalDate}` : '未到仓/ETA中'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SKU Stock Levels & Safety Stock Snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              SKU 库存状态与补货预警 (Inventory Health)
            </h4>
            <button
              onClick={() => onSelectTab('inventory')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              库存明细 <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {inventory.slice(0, 5).map((inv) => {
              const isLow = inv.available < inv.safetyStock;
              return (
                <div
                  key={inv.sku}
                  onClick={() => onSelectSku(inv.sku)}
                  className="p-3.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600">{inv.sku}</span>
                      {isLow && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                          库存不足
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                      {inv.productName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">
                      可用: {inv.available}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      在途: {inv.inbound} | 接收中: {inv.receiving}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div className="p-4 bg-slate-900 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <div className="text-sm font-semibold">Walmart 货件与库存智能中心</div>
            <div className="text-xs text-slate-400">
              数据源自动校验 • 10天Case防漏检 • 箱数件数双重核对
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('data-import')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            上传 Walmart 报表
          </button>

          <button
            onClick={onOpenNewShipmentModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            手动新增货件
          </button>
        </div>
      </div>
    </div>
  );
};
