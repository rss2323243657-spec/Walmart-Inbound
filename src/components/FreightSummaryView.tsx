import React, { useState, useMemo, useRef } from 'react';
import {
  Calculator,
  UploadCloud,
  Download,
  Plus,
  ArrowRightLeft,
  Search,
  Filter,
  Calendar,
  Building2,
  Truck,
  Box,
  Layers,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Trash2,
  Edit2,
  FileCheck,
  RotateCcw,
  Sparkles,
  Info,
  Scale,
} from 'lucide-react';
import {
  FreightShippingItem,
  MonthlyFreightSummary,
  ShipmentFreightSummary,
  Shipment,
} from '../types';
import {
  aggregateMonthlySummaries,
  extractMonthKey,
  formatMonthDisplay,
} from '../utils/freightCalculator';
import {
  downloadFreightTemplate,
  parseFreightExcelOrCsv,
} from '../utils/excelParser';
import { exportFreightSummaryToExcel } from '../utils/freightExporter';
import { AppStorage } from '../utils/storage';
import { FreightManualItemModal } from './FreightManualItemModal';
import { FreightSyncModal } from './FreightSyncModal';

interface FreightSummaryViewProps {
  freightItems: FreightShippingItem[];
  actuals: Record<
    string,
    {
      actualChargeableWeight?: number;
      actualCost?: number;
      reconciliationNotes?: string;
    }
  >;
  onUpdateFreightItems: (items: FreightShippingItem[]) => void;
  onUpdateActuals: (
    actuals: Record<
      string,
      {
        actualChargeableWeight?: number;
        actualCost?: number;
        reconciliationNotes?: string;
      }
    >
  ) => void;
  shipments: Shipment[];
  onSyncToShipments: (shipments: Shipment[]) => void;
}

export const FreightSummaryView: React.FC<FreightSummaryViewProps> = ({
  freightItems,
  actuals,
  onUpdateFreightItems,
  onUpdateActuals,
  shipments,
  onSyncToShipments,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [reconcileFilter, setReconcileFilter] = useState('all'); // all, reconciled, pending, variance
  const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());

  // Modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FreightShippingItem | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Aggregate monthly summaries
  const monthlySummaries = useMemo(() => {
    return aggregateMonthlySummaries(freightItems, actuals);
  }, [freightItems, actuals]);

  // Available month tabs
  const availableMonths = useMemo(() => {
    return monthlySummaries.map((m) => ({
      key: m.monthKey,
      display: m.monthDisplay,
      count: m.shipmentCount,
      cost: m.totalEstimatedCost,
    }));
  }, [monthlySummaries]);

  // Active monthly data
  const currentMonthData = useMemo(() => {
    if (selectedMonth === 'all') {
      // Aggregate across all months
      const allShipments: ShipmentFreightSummary[] = [];
      monthlySummaries.forEach((m) => {
        allShipments.push(...m.shipments);
      });

      const totalUnits = allShipments.reduce((sum, s) => sum + s.totalUnits, 0);
      const totalCartons = allShipments.reduce((sum, s) => sum + s.totalCartons, 0);
      const totalEstWeight = allShipments.reduce(
        (sum, s) => sum + s.totalEstimatedChargeableWeight,
        0
      );
      const totalEstCost = allShipments.reduce((sum, s) => sum + s.totalEstimatedCost, 0);
      const totalActualWeight = allShipments.reduce(
        (sum, s) => sum + (s.actualChargeableWeight || 0),
        0
      );
      const totalActualCost = allShipments.reduce((sum, s) => sum + (s.actualCost || 0), 0);
      const costDiff = totalActualCost > 0 ? totalActualCost - totalEstCost : 0;
      const costDiffPct = totalEstCost > 0 ? (costDiff / totalEstCost) * 100 : 0;

      return {
        monthKey: 'all',
        monthDisplay: '全部月份出货汇总',
        shipments: allShipments,
        shipmentCount: allShipments.length,
        totalUnits,
        totalCartons,
        totalEstimatedChargeableWeight: totalEstWeight,
        totalEstimatedCost: totalEstCost,
        totalActualChargeableWeight: totalActualWeight,
        totalActualCost,
        costDifference: costDiff,
        costDifferencePercent: costDiffPct,
        reconciledShipmentCount: allShipments.filter((s) => s.isReconciled).length,
        unreconciledShipmentCount: allShipments.filter((s) => !s.isReconciled).length,
      };
    }

    return (
      monthlySummaries.find((m) => m.monthKey === selectedMonth) || {
        monthKey: selectedMonth,
        monthDisplay: formatMonthDisplay(selectedMonth),
        shipments: [],
        shipmentCount: 0,
        totalUnits: 0,
        totalCartons: 0,
        totalEstimatedChargeableWeight: 0,
        totalEstimatedCost: 0,
        totalActualChargeableWeight: 0,
        totalActualCost: 0,
        costDifference: 0,
        costDifferencePercent: 0,
        reconciledShipmentCount: 0,
        unreconciledShipmentCount: 0,
      }
    );
  }, [monthlySummaries, selectedMonth]);

  // Unique channels
  const uniqueChannels = useMemo(() => {
    const set = new Set<string>();
    freightItems.forEach((it) => {
      if (it.channel) set.add(it.channel);
    });
    return Array.from(set);
  }, [freightItems]);

  // Filtered shipments in current view
  const filteredShipments = useMemo(() => {
    return currentMonthData.shipments.filter((s) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = s.shipmentId.toLowerCase().includes(q);
        const matchWh = s.warehouse.toLowerCase().includes(q);
        const matchSku = s.items.some(
          (it) =>
            it.sku.toLowerCase().includes(q) ||
            it.productName.toLowerCase().includes(q)
        );
        const matchNotes = (s.reconciliationNotes || '').toLowerCase().includes(q);
        if (!matchId && !matchWh && !matchSku && !matchNotes) return false;
      }

      // 2. Channel Filter
      if (channelFilter !== 'all') {
        const hasChannel = s.items.some((it) => it.channel === channelFilter);
        if (!hasChannel) return false;
      }

      // 3. Reconcile Filter
      if (reconcileFilter === 'reconciled' && !s.isReconciled) return false;
      if (reconcileFilter === 'pending' && s.isReconciled) return false;
      if (
        reconcileFilter === 'variance' &&
        (!s.isReconciled || Math.abs(s.costDifference || 0) < 0.01)
      ) {
        return false;
      }

      return true;
    });
  }, [currentMonthData.shipments, searchQuery, channelFilter, reconcileFilter]);

  // Toggle expansion of a shipment
  const toggleExpand = (shipmentId: string) => {
    setExpandedShipments((prev) => {
      const next = new Set(prev);
      if (next.has(shipmentId)) {
        next.delete(shipmentId);
      } else {
        next.add(shipmentId);
      }
      return next;
    });
  };

  // Expand or collapse all
  const toggleExpandAll = () => {
    if (expandedShipments.size === filteredShipments.length) {
      setExpandedShipments(new Set());
    } else {
      setExpandedShipments(new Set(filteredShipments.map((s) => s.shipmentId)));
    }
  };

  // Handle actual input update for a shipment
  const handleUpdateShipmentActual = (
    shipmentId: string,
    field: 'actualChargeableWeight' | 'actualCost' | 'reconciliationNotes',
    value: string
  ) => {
    const existing = actuals[shipmentId] || {};
    let updatedField: any = value;
    if (field === 'actualChargeableWeight' || field === 'actualCost') {
      updatedField = value.trim() === '' ? undefined : Number(value);
    }

    const updatedActuals = {
      ...actuals,
      [shipmentId]: {
        ...existing,
        [field]: updatedField,
      },
    };

    onUpdateActuals(updatedActuals);
    AppStorage.saveFreightActuals(updatedActuals);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadFeedback(null);

    try {
      const result = await parseFreightExcelOrCsv(file);
      if (result.items.length === 0) {
        throw new Error('未在文件中读取到有效出货记录');
      }

      // Merge new items (replace items with same ID or append)
      const existingItemsMap = new Map<string, FreightShippingItem>();
      freightItems.forEach((it) => existingItemsMap.set(it.id, it));

      result.items.forEach((it) => {
        existingItemsMap.set(it.id, it);
      });

      const mergedItems = Array.from(existingItemsMap.values());
      onUpdateFreightItems(mergedItems);
      AppStorage.saveFreightItems(mergedItems);

      // Merge actuals if provided in upload
      if (Object.keys(result.actuals).length > 0) {
        const mergedActuals = {
          ...actuals,
          ...result.actuals,
        };
        onUpdateActuals(mergedActuals);
        AppStorage.saveFreightActuals(mergedActuals);
      }

      AppStorage.logAudit({
        targetType: 'Import',
        targetId: file.name,
        action: 'Freight Upload',
        details: `上传头程出货表：成功导入 ${result.items.length} 条明细，涉及 ${result.shipmentCount} 票货件，总件数 ${result.totalUnits}`,
      });

      setUploadFeedback(
        `成功导入 ${result.items.length} 条出货明细（${result.shipmentCount} 票货件，共 ${result.totalUnits} 件）`
      );

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadFeedback(`导入失败：${err.message || '文件解析错误'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadFeedback(null), 6000);
    }
  };

  // Handle saving a manual item
  const handleSaveManualItem = (item: FreightShippingItem) => {
    const existingIndex = freightItems.findIndex((it) => it.id === item.id);
    let updated: FreightShippingItem[];
    if (existingIndex >= 0) {
      updated = [...freightItems];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...freightItems];
    }
    onUpdateFreightItems(updated);
    AppStorage.saveFreightItems(updated);

    AppStorage.logAudit({
      targetType: 'Freight',
      targetId: item.shipmentId,
      action: existingIndex >= 0 ? 'Update Item' : 'Add Item',
      details: `头程明细：${item.shipmentId} SKU ${item.sku}，出货 ${item.actualQty} 件，计费重 ${item.totalChargeableWeight}kg`,
    });
  };

  // Delete single SKU item
  const handleDeleteItem = (itemId: string) => {
    const updated = freightItems.filter((it) => it.id !== itemId);
    onUpdateFreightItems(updated);
    AppStorage.saveFreightItems(updated);
  };

  // Delete entire shipment from freight list
  const handleDeleteShipment = (shipmentId: string) => {
    if (!confirm(`确定删除货件 ${shipmentId} 的全部头程出货明细吗？`)) return;
    const updated = freightItems.filter((it) => it.shipmentId !== shipmentId);
    onUpdateFreightItems(updated);
    AppStorage.saveFreightItems(updated);

    const updatedActuals = { ...actuals };
    delete updatedActuals[shipmentId];
    onUpdateActuals(updatedActuals);
    AppStorage.saveFreightActuals(updatedActuals);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto select-text">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            月度头程出货费用汇总与对账
            <span className="text-xs font-normal text-slate-500 font-mono">
              ({currentMonthData.shipmentCount} 票货件 / {currentMonthData.totalUnits} 件出货)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            根据发货时间归属月份，按箱规实重与体积重（长*宽*高/6000，取大者且单箱不足12kg按12kg计）精准测算与对账
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => downloadFreightTemplate('xlsx')}
            title="下载头程出货明细与对账填写模板"
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            下载出货模板
          </button>

          <button
            onClick={() => exportFreightSummaryToExcel(monthlySummaries, freightItems, selectedMonth)}
            title="导出当前月度头程费用报表与对账数据"
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            导出汇总报表
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            {isUploading ? '正在解析...' : '上传头程出货表'}
          </button>

          <button
            onClick={() => setIsSyncModalOpen(true)}
            disabled={freightItems.length === 0}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
            反向同步至货件管理
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsManualModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            录入出货明细
          </button>
        </div>
      </div>

      {/* Upload Feedback Toast */}
      {uploadFeedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
            uploadFeedback.includes('成功')
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {uploadFeedback.includes('成功') ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* Month Navigation Tab Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setSelectedMonth('all')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedMonth === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <span>全部月份汇总</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedMonth === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {freightItems.length}
          </span>
        </button>

        {availableMonths.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelectedMonth(m.key)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedMonth === m.key
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <span>{m.display}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedMonth === m.key ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {m.count} 票
            </span>
          </button>
        ))}
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            汇总出货货件
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {currentMonthData.shipmentCount}
            <span className="text-xs font-normal text-slate-400 ml-1">票</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {currentMonthData.monthDisplay}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            出货总件数 / 箱数
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {currentMonthData.totalUnits}
            <span className="text-xs font-normal text-slate-400 ml-1">件</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            共计 {currentMonthData.totalCartons} 箱
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            预估计费总重
          </div>
          <div className="text-xl font-bold text-blue-700 mt-1 font-mono">
            {currentMonthData.totalEstimatedChargeableWeight.toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">kg</span>
          </div>
          <div className="text-[11px] text-blue-600/80 mt-0.5">
            含 12kg 保底与体积重
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            预估头程总费用
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            ¥{currentMonthData.totalEstimatedCost.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            运费 + 报关费(175/350)
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            实际头程总费用
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {currentMonthData.totalActualCost > 0 ? (
              `¥${currentMonthData.totalActualCost.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ) : (
              <span className="text-sm font-normal text-slate-400">待录入账单</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            已对账 {currentMonthData.reconciledShipmentCount} / {currentMonthData.shipmentCount} 票
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            费用差额 (实际-预估)
          </div>
          <div className="text-xl font-bold mt-1 font-mono">
            {currentMonthData.totalActualCost > 0 ? (
              <span
                className={
                  currentMonthData.costDifference > 0
                    ? 'text-red-600'
                    : currentMonthData.costDifference < 0
                    ? 'text-emerald-600'
                    : 'text-slate-700'
                }
              >
                {currentMonthData.costDifference > 0 ? '+' : ''}
                ¥{currentMonthData.costDifference.toFixed(2)}
              </span>
            ) : (
              <span className="text-sm font-normal text-slate-400">--</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {currentMonthData.totalActualCost > 0 ? (
              <span>偏差比例 {currentMonthData.costDifferencePercent > 0 ? '+' : ''}{currentMonthData.costDifferencePercent.toFixed(1)}%</span>
            ) : (
              '录入后自动核对'
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 Shipment ID / SKU / 仓库 / 渠道..."
              className="w-full pl-8.5 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">全部渠道</option>
            {uniqueChannels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={reconcileFilter}
            onChange={(e) => setReconcileFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
          >
            <option value="all">全部对账状态</option>
            <option value="reconciled">已录入实际费用</option>
            <option value="pending">待录入对账</option>
            <option value="variance">存在费用偏差</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleExpandAll}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {expandedShipments.size === filteredShipments.length ? '收起全部明细' : '展开全部明细'}
          </button>
        </div>
      </div>

      {/* Shipment Breakdown Cards */}
      <div className="space-y-4">
        {filteredShipments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">暂无出货明细数据</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              您可以直接点击右上角“上传头程出货表”批量导入 Excel，或点击“录入出货明细”手工添加
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                上传出货表
              </button>
            </div>
          </div>
        ) : (
          filteredShipments.map((shipment) => {
            const isExpanded = expandedShipments.has(shipment.shipmentId);
            const actualEntry = actuals[shipment.shipmentId] || {};
            const hasActual = shipment.actualCost !== undefined;
            const isOvercharged = (shipment.costDifference || 0) > 10;
            const isUndercharged = (shipment.costDifference || 0) < -10;

            return (
              <div
                key={shipment.shipmentId}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* Shipment Header Bar */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => toggleExpand(shipment.shipmentId)}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-0.5"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div className="font-mono font-bold text-sm text-slate-900">
                      {shipment.shipmentId}
                    </div>

                    <span className="px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 font-mono text-xs font-semibold">
                      {shipment.warehouse}
                    </span>

                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {shipment.shipDate}
                    </span>

                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                      {shipment.items[0]?.channel || '快船'}
                    </span>

                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${
                        shipment.isMergedCustoms
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {shipment.isMergedCustoms ? '合并报关 (175元)' : '独立报关 (350元)'}
                    </span>

                    {shipment.appliedMinimumRule && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        触发12kg保底
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">出货：</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {shipment.totalUnits} 件 / {shipment.totalCartons} 箱
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500">计费重：</span>
                      <span className="font-bold text-blue-700 font-mono">
                        {shipment.totalEstimatedChargeableWeight.toFixed(1)} kg
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500">预估总额：</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ¥{shipment.totalEstimatedCost.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteShipment(shipment.shipmentId)}
                      title="删除此货件头程明细"
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Actual vs Estimated Reconciliation Section */}
                <div className="p-4 bg-slate-50/30 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">实际收费重:</span>
                      <div className="relative w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="如 103.5"
                          value={actualEntry.actualChargeableWeight ?? ''}
                          onChange={(e) =>
                            handleUpdateShipmentActual(
                              shipment.shipmentId,
                              'actualChargeableWeight',
                              e.target.value
                            )
                          }
                          className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                        <span className="absolute right-2 top-1 text-[10px] text-slate-400">
                          kg
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">实际费用:</span>
                      <div className="relative w-32">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="如 1573.06"
                          value={actualEntry.actualCost ?? ''}
                          onChange={(e) =>
                            handleUpdateShipmentActual(
                              shipment.shipmentId,
                              'actualCost',
                              e.target.value
                            )
                          }
                          className="w-full pl-5 pr-2.5 py-1 text-xs font-mono border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white font-semibold text-slate-900"
                        />
                        <span className="absolute left-2 top-1 text-[10px] text-slate-400">
                          ¥
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">对账备注:</span>
                      <input
                        type="text"
                        placeholder="如 货代账单核对无误"
                        value={actualEntry.reconciliationNotes || ''}
                        onChange={(e) =>
                          handleUpdateShipmentActual(
                            shipment.shipmentId,
                            'reconciliationNotes',
                            e.target.value
                          )
                        }
                        className="w-48 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Variance Indicators */}
                  <div className="flex items-center gap-3 text-xs">
                    {hasActual ? (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-500">费用偏差 (实际 - 预估)</div>
                          <div
                            className={`font-mono font-bold ${
                              isOvercharged
                                ? 'text-red-600'
                                : isUndercharged
                                ? 'text-emerald-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {(shipment.costDifference || 0) > 0 ? '+' : ''}
                            ¥{(shipment.costDifference || 0).toFixed(2)} (
                            {(shipment.costDifferencePercent || 0) > 0 ? '+' : ''}
                            {(shipment.costDifferencePercent || 0).toFixed(1)}%)
                          </div>
                        </div>

                        {shipment.weightDifference !== undefined && (
                          <div className="text-right pl-3 border-l border-slate-200">
                            <div className="text-[11px] text-slate-500">重量偏差</div>
                            <div className="font-mono text-slate-700 font-medium">
                              {shipment.weightDifference > 0 ? '+' : ''}
                              {shipment.weightDifference.toFixed(1)} kg
                            </div>
                          </div>
                        )}

                        <span
                          className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                            Math.abs(shipment.costDifference || 0) < 1
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isOvercharged
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {Math.abs(shipment.costDifference || 0) < 1
                            ? '费用一致'
                            : isOvercharged
                            ? '实际费用偏高'
                            : '实际费用低于预估'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        请在左侧输入货代账单实际收费重与费用完成对账
                      </span>
                    )}
                  </div>
                </div>

                {/* Collapsible SKU Breakdown Table */}
                {isExpanded && (
                  <div className="p-4 overflow-x-auto">
                    <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                      <span>包含商品 SKU 明细 ({shipment.items.length} 项)</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        单箱体积重 = 长*宽*高/6000 | 计费重 = Max(实重, 体积重, 12kg)
                      </span>
                    </div>

                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold">
                          <th className="py-2 px-2.5">商品 SKU</th>
                          <th className="py-2 px-2.5">品名标题</th>
                          <th className="py-2 px-2 text-right">出货数量</th>
                          <th className="py-2 px-2 text-right">件数/箱数</th>
                          <th className="py-2 px-2 text-right">单箱实重(kg)</th>
                          <th className="py-2 px-2 text-center">箱规长*宽*高(cm)</th>
                          <th className="py-2 px-2 text-right">单箱体积重(kg)</th>
                          <th className="py-2 px-2 text-right">单箱计费重(kg)</th>
                          <th className="py-2 px-2 text-center">计重方式</th>
                          <th className="py-2 px-2 text-center">混箱组</th>
                          <th className="py-2 px-2 text-right">单价(元/kg)</th>
                          <th className="py-2 px-2.5 text-right">该项预估运费(元)</th>
                          <th className="py-2 px-2 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {shipment.items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2 px-2.5 font-mono font-bold text-slate-900">
                              {item.sku}
                            </td>
                            <td className="py-2 px-2.5 max-w-xs truncate text-slate-700" title={item.productName}>
                              {item.productName}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-800">
                              {item.actualQty}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-800">
                              {item.boxCount}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-800">
                              {item.boxWeight.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-600">
                              {item.dimensionsText}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {item.volumetricWeightPerBox.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-blue-700">
                              {item.chargeableWeightPerBox.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {item.chargeableType === 'MIN_12KG' ? (
                                <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-semibold">
                                  12kg保底
                                </span>
                              ) : item.chargeableType === 'VOLUMETRIC' ? (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                  体积重大
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]">
                                  实重大
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-600">
                              {item.mixedBoxGroup ? (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 text-[10px]">
                                  {item.mixedBoxGroup}
                                </span>
                              ) : (
                                '--'
                              )}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-700">
                              ¥{item.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                              ¥{item.estimatedItemFreight.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setIsManualModalOpen(true);
                                  }}
                                  title="编辑"
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  title="删除"
                                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual Item Add/Edit Modal */}
      {isManualModalOpen && (
        <FreightManualItemModal
          isOpen={isManualModalOpen}
          onClose={() => {
            setIsManualModalOpen(false);
            setEditingItem(null);
          }}
          onSaveItem={handleSaveManualItem}
          initialItem={editingItem}
        />
      )}

      {/* Reverse Sync to Shipment Management Modal */}
      {isSyncModalOpen && (
        <FreightSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          freightItems={freightItems}
          existingShipments={shipments}
          onSyncToShipments={onSyncToShipments}
        />
      )}
    </div>
  );
};
