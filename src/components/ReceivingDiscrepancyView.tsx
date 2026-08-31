import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  FileCheck,
  Download,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Boxes,
  Truck,
} from 'lucide-react';
import { Shipment } from '../types';
import { getCaseTimeDisplay } from '../utils/dateUtils';
import { exportDiscrepanciesToExcel } from '../utils/excelExporter';

interface ReceivingDiscrepancyViewProps {
  shipments: Shipment[];
  onSelectShipment: (shipmentId: string) => void;
  onOpenCaseModal: (shipment: Shipment) => void;
  onOpenProductSupplement?: (shipment: Shipment) => void;
}

export const ReceivingDiscrepancyView: React.FC<ReceivingDiscrepancyViewProps> = ({
  shipments,
  onSelectShipment,
  onOpenCaseModal,
  onOpenProductSupplement,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const discrepancyList = useMemo(() => {
    return shipments.filter((s) => s.totalDiscrepancyQty > 0);
  }, [shipments]);

  const categorized = useMemo(() => {
    const eligibleOrOverdue: Shipment[] = [];
    const approaching: Shipment[] = [];
    const observing: Shipment[] = [];
    const noArrival: Shipment[] = [];

    discrepancyList.forEach((s) => {
      if (!s.arrivalDate) {
        noArrival.push(s);
      } else if (s.daysUntilCase !== undefined && s.daysUntilCase <= 0) {
        eligibleOrOverdue.push(s);
      } else if (s.daysUntilCase !== undefined && s.daysUntilCase <= 3) {
        approaching.push(s);
      } else {
        observing.push(s);
      }
    });

    return { eligibleOrOverdue, approaching, observing, noArrival };
  }, [discrepancyList]);

  const filtered = useMemo(() => {
    let list = discrepancyList;

    if (filterType === 'eligible') {
      list = categorized.eligibleOrOverdue;
    } else if (filterType === 'approaching') {
      list = categorized.approaching;
    } else if (filterType === 'observing') {
      list = categorized.observing;
    } else if (filterType === 'no_arrival') {
      list = categorized.noArrival;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.shipmentName.toLowerCase().includes(q) ||
          s.fc.toLowerCase().includes(q) ||
          s.items?.some((it) => it.sku.toLowerCase().includes(q) || it.productName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [discrepancyList, filterType, search, categorized]);

  const totalMissingUnits = discrepancyList.reduce((acc, curr) => acc + curr.totalDiscrepancyQty, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Walmart 收货差异与 10 天 Case 决策中心
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              共 {discrepancyList.length} 票异常 / 累计短少 {totalMissingUnits} 件
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            严格遵循 Walmart 规则：以实际到仓日 (Actual Arrival Date) + 10 天作为唯一合规 Case
            发起判定基准
          </p>
        </div>

        <button
          onClick={() => exportDiscrepanciesToExcel(filtered)}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          导出差异清单 (Excel)
        </button>
      </div>

      {/* 4 Classification Metric Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Tab 1: Eligible / Overdue */}
        <div
          onClick={() => setFilterType(filterType === 'eligible' ? 'all' : 'eligible')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            filterType === 'eligible'
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-red-50/80 border-red-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">🔴 满10天可开Case / 已超期</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">
            {categorized.eligibleOrOverdue.length} <span className="text-xs font-normal">票</span>
          </div>
          <div className={`text-[10px] mt-1 ${filterType === 'eligible' ? 'text-red-100' : 'text-red-600'}`}>
            建议立即在 Seller Center 提交索赔
          </div>
        </div>

        {/* Tab 2: Approaching */}
        <div
          onClick={() => setFilterType(filterType === 'approaching' ? 'all' : 'approaching')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            filterType === 'approaching'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-amber-50/80 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">🟠 即将达标 (1-3天内)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">
            {categorized.approaching.length} <span className="text-xs font-normal">票</span>
          </div>
          <div className={`text-[10px] mt-1 ${filterType === 'approaching' ? 'text-amber-100' : 'text-amber-700'}`}>
            密切观察，备齐发票与POD凭单
          </div>
        </div>

        {/* Tab 3: Observing */}
        <div
          onClick={() => setFilterType(filterType === 'observing' ? 'all' : 'observing')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            filterType === 'observing'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-blue-50/80 border-blue-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">🟡 10天观察期内 (4-10天)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">
            {categorized.observing.length} <span className="text-xs font-normal">票</span>
          </div>
          <div className={`text-[10px] mt-1 ${filterType === 'observing' ? 'text-blue-100' : 'text-blue-700'}`}>
            Walmart 仓库仍在接收清点中
          </div>
        </div>

        {/* Tab 4: No Arrival Date */}
        <div
          onClick={() => setFilterType(filterType === 'no_arrival' ? 'all' : 'no_arrival')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            filterType === 'no_arrival'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-slate-100 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">⚪ 无实际到仓日期</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1">
            {categorized.noArrival.length} <span className="text-xs font-normal">票</span>
          </div>
          <div className={`text-[10px] mt-1 ${filterType === 'no_arrival' ? 'text-slate-300' : 'text-slate-500'}`}>
            在途/仅有ETA，严禁以ETA开Case
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索差异货件编号 / SKU / 产品名称 / 仓库 FC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        {filterType !== 'all' && (
          <button
            onClick={() => setFilterType('all')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-medium"
          >
            显示全部差异 ({discrepancyList.length})
          </button>
        )}
      </div>

      {/* Discrepancy Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">货件编号 (Shipment ID)</th>
                <th className="p-3">SKU / 产品名称</th>
                <th className="p-3">FC 仓库</th>
                <th className="p-3 text-right">发货数量</th>
                <th className="p-3 text-right">Walmart接收</th>
                <th className="p-3 text-right">短少件数</th>
                <th className="p-3 text-center">箱数核对 (发/收/缺)</th>
                <th className="p-3">实际到仓日期</th>
                <th className="p-3">10天Case倒计时</th>
                <th className="p-3 text-center">Case 状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((shp) => {
                const firstItem = shp.items?.[0];
                const time = getCaseTimeDisplay(shp.arrivalDate);
                const isCartonMismatch = shp.missingCartons > 0;
                const isCartonEqualButShort =
                  shp.totalCartons > 0 &&
                  shp.missingCartons === 0 &&
                  shp.totalDiscrepancyQty > 0;

                return (
                  <tr key={shp.id} className="hover:bg-slate-50 transition-colors">
                    {/* Shipment ID */}
                    <td className="p-3">
                      <button
                        onClick={() => onSelectShipment(shp.id)}
                        className="font-mono font-bold text-blue-600 hover:underline block text-left"
                      >
                        {shp.id}
                      </button>
                      <span className="text-[11px] text-slate-500 truncate max-w-[150px] block">
                        {shp.shipmentName}
                      </span>
                    </td>

                    {/* SKU & Product */}
                    <td className="p-3">
                      <div className="font-mono font-semibold text-slate-900">
                        {firstItem?.sku || '多SKU'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {firstItem?.productName || `${shp.items?.length || 0} 个明细项`}
                      </div>
                    </td>

                    {/* FC */}
                    <td className="p-3 font-mono text-slate-700">{shp.fc}</td>

                    {/* Ship Qty */}
                    <td className="p-3 text-right font-mono font-medium text-slate-800">
                      {shp.totalShipQty}
                    </td>

                    {/* Received Qty */}
                    <td className="p-3 text-right font-mono font-bold text-blue-600">
                      {shp.totalReceivedQty}
                    </td>

                    {/* Discrepancy */}
                    <td className="p-3 text-right">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                        -{shp.totalDiscrepancyQty}
                      </span>
                    </td>

                    {/* Cartons Discrepancy */}
                    <td className="p-3 text-center font-mono">
                      <span>
                        {shp.totalCartons} / {shp.totalReceivedCartons}
                      </span>
                      {isCartonMismatch ? (
                        <span className="ml-1 text-[10px] text-red-600 font-bold">
                          (缺{shp.missingCartons}箱)
                        </span>
                      ) : isCartonEqualButShort ? (
                        <span className="ml-1 text-[10px] text-amber-600">
                          (箱足件少)
                        </span>
                      ) : null}
                    </td>

                    {/* Arrival Date */}
                    <td className="p-3 font-mono">
                      {shp.arrivalDate ? (
                        <span className="font-bold text-slate-900">{shp.arrivalDate}</span>
                      ) : (
                        <span className="text-slate-400">无实际到仓</span>
                      )}
                    </td>

                    {/* 10-Day Countdown Badge */}
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border inline-block ${time.badgeClass}`}>
                        {time.text}
                      </span>
                    </td>

                    {/* Case Status */}
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          shp.caseStatus === 'Resolved' || shp.caseStatus === 'Closed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : shp.caseStatus === 'In Review' || shp.caseStatus === 'Opened'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold'
                            : shp.caseStatus === 'Eligible'
                            ? 'bg-red-50 text-red-700 border border-red-200 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {shp.caseStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {onOpenProductSupplement && (
                          <button
                            onClick={() => onOpenProductSupplement(shp)}
                            title="标注SKU差异原因与设置跟进提醒"
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Boxes className="w-3 h-3 text-blue-600" />
                            SKU差异标注
                          </button>
                        )}

                        <button
                          onClick={() => onOpenCaseModal(shp)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <FileCheck className="w-3 h-3" />
                          {shp.caseId ? '更新Case' : '开Case'}
                        </button>

                        <button
                          onClick={() => onSelectShipment(shp.id)}
                          className="text-slate-600 hover:text-blue-600 text-[11px] font-medium px-1 py-1"
                        >
                          详情
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    当前无符合筛选条件的差异货件
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
