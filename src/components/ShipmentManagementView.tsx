import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  FileCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit2,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  FileSpreadsheet,
  UploadCloud,
  Boxes,
  Tag,
  BellRing,
} from 'lucide-react';
import { Shipment, ShipmentStatus, CaseStatus } from '../types';
import { exportShipmentsToExcel } from '../utils/excelExporter';
import { getCaseTimeDisplay } from '../utils/dateUtils';
import { downloadShipmentBatchTemplate } from '../utils/excelParser';
import { ArrowRightLeft } from 'lucide-react';

interface ShipmentManagementViewProps {
  shipments: Shipment[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectShipment: (shipmentId: string) => void;
  onOpenNewShipmentModal: (shipment?: Shipment, mode?: 'manual' | 'batch') => void;
  onOpenCaseModal: (shipment: Shipment) => void;
  onOpenProductSupplement?: (shipment: Shipment) => void;
  onDeleteShipment: (shipmentId: string) => void;
  onBatchDeleteShipments: (shipmentIds: string[]) => void;
  onOpenFreightSync?: () => void;
}

export const ShipmentManagementView: React.FC<ShipmentManagementViewProps> = ({
  shipments,
  searchQuery,
  onSearchChange,
  onSelectShipment,
  onOpenNewShipmentModal,
  onOpenCaseModal,
  onOpenProductSupplement,
  onDeleteShipment,
  onBatchDeleteShipments,
  onOpenFreightSync,
}) => {
  // Filter tabs
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedFc, setSelectedFc] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [caseFilter, setCaseFilter] = useState<string>('all');
  const [hasDiscrepancyOnly, setHasDiscrepancyOnly] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Unique FCs
  const uniqueFcs = useMemo(() => {
    const set = new Set<string>();
    shipments.forEach((s) => {
      if (s.fc) set.add(s.fc);
    });
    return Array.from(set);
  }, [shipments]);

  // Filter logic
  const filteredShipments = useMemo(() => {
    return shipments.filter((shp) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = shp.id.toLowerCase().includes(q);
        const matchesName = shp.shipmentName.toLowerCase().includes(q);
        const matchesFc = shp.fc.toLowerCase().includes(q);
        const matchesTracking = (shp.tracking || '').toLowerCase().includes(q);
        const matchesCase = (shp.caseId || '').toLowerCase().includes(q);
        const matchesSku = shp.items?.some(
          (it) =>
            it.sku.toLowerCase().includes(q) ||
            it.productName.toLowerCase().includes(q) ||
            (it.itemId || '').toLowerCase().includes(q)
        );

        if (!matchesId && !matchesName && !matchesFc && !matchesTracking && !matchesCase && !matchesSku) {
          return false;
        }
      }

      // 2. Tab Filter
      if (activeTab === 'in_transit' && shp.status !== 'In Transit') return false;
      if (activeTab === 'receiving' && shp.status !== 'Receiving' && shp.status !== 'Arrived') return false;
      if (activeTab === 'partially' && shp.status !== 'Partially Received') return false;
      if (activeTab === 'fully' && shp.status !== 'Fully Received' && shp.status !== 'Resolved') return false;
      if (activeTab === 'discrepancy' && shp.totalDiscrepancyQty <= 0) return false;
      if (
        activeTab === 'case_eligible' &&
        (shp.totalDiscrepancyQty <= 0 || !shp.arrivalDate || (shp.daysUntilCase !== undefined && shp.daysUntilCase > 0))
      )
        return false;
      if (
        activeTab === 'case_processing' &&
        shp.caseStatus !== 'Opened' &&
        shp.caseStatus !== 'In Review' &&
        shp.caseStatus !== 'Partially Resolved'
      )
        return false;
      if (activeTab === 'resolved' && shp.caseStatus !== 'Resolved' && shp.status !== 'Resolved') return false;

      // 3. FC Filter
      if (selectedFc !== 'all' && shp.fc !== selectedFc) return false;

      // 4. Status Filter
      if (statusFilter !== 'all' && shp.status !== statusFilter) return false;

      // 5. Case Status Filter
      if (caseFilter !== 'all' && shp.caseStatus !== caseFilter) return false;

      // 6. Has Discrepancy toggle
      if (hasDiscrepancyOnly && shp.totalDiscrepancyQty <= 0) return false;

      return true;
    });
  }, [shipments, searchQuery, activeTab, selectedFc, statusFilter, caseFilter, hasDiscrepancyOnly]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredShipments.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`确定要删除选中的 ${selectedIds.length} 票货件吗？此操作无法撤销。`)) {
      onBatchDeleteShipments(selectedIds);
      setSelectedIds([]);
    }
  };

  const resetFilters = () => {
    onSearchChange('');
    setActiveTab('all');
    setSelectedFc('all');
    setStatusFilter('all');
    setCaseFilter('all');
    setHasDiscrepancyOnly(false);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header with Title & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Walmart 货件全生命周期管理
            <span className="text-xs font-normal text-slate-500 font-mono">
              ({filteredShipments.length} / {shipments.length} 票货件)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            涵盖备货、发货、到仓、接收清点、差异核对与 10 天 Case 全流程记录
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除 ({selectedIds.length})
            </button>
          )}

          {onOpenFreightSync && (
            <button
              onClick={onOpenFreightSync}
              title="从月头程费用汇总表中反向提取 Shipment ID 及仓库"
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
              从头程提取货件
            </button>
          )}

          <button
            onClick={() => downloadShipmentBatchTemplate('xlsx')}
            title="下载标准货件 Excel 填写模板"
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            下载导入模板
          </button>

          <button
            onClick={() => exportShipmentsToExcel(filteredShipments)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            导出数据
          </button>

          <button
            onClick={() => onOpenNewShipmentModal(undefined, 'batch')}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            批量表格导入
          </button>

          <button
            onClick={() => onOpenNewShipmentModal(undefined, 'manual')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            新增货件
          </button>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'all', label: '全部' },
          { id: 'in_transit', label: '在途运输中' },
          { id: 'receiving', label: '待接收/清点' },
          { id: 'partially', label: '部分接收' },
          { id: 'fully', label: '全部接收' },
          { id: 'discrepancy', label: '存在差异' },
          { id: 'case_eligible', label: '已达10天Case条件' },
          { id: 'case_processing', label: 'Case处理中' },
          { id: 'resolved', label: '已解决/闭环' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* FC Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">仓库 FC:</span>
            <select
              value={selectedFc}
              onChange={(e) => setSelectedFc(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部仓库 (All FCs)</option>
              {uniqueFcs.map((fc) => (
                <option key={fc} value={fc}>
                  {fc}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">货件状态:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="Draft">Draft (草稿)</option>
              <option value="Shipped">Shipped (已发货)</option>
              <option value="In Transit">In Transit (在途)</option>
              <option value="Arrived">Arrived (已到仓)</option>
              <option value="Receiving">Receiving (接收中)</option>
              <option value="Partially Received">Partially Received (部分接收)</option>
              <option value="Fully Received">Fully Received (全部接收)</option>
              <option value="Discrepancy">Discrepancy (存在差异)</option>
              <option value="Case Eligible">Case Eligible (达10天Case条件)</option>
              <option value="Case Processing">Case Processing (Case处理中)</option>
              <option value="Resolved">Resolved (已解决)</option>
            </select>
          </div>

          {/* Case Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Case 状态:</span>
            <select
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部 Case 状态</option>
              <option value="Not Eligible">Not Eligible (未达条件)</option>
              <option value="Eligible">Eligible (可以开Case)</option>
              <option value="Opened">Opened (已提交)</option>
              <option value="In Review">In Review (Walmart调查中)</option>
              <option value="Partially Resolved">Partially Resolved (部分解决)</option>
              <option value="Resolved">Resolved (已解决闭环)</option>
              <option value="Rejected">Rejected (已驳回)</option>
            </select>
          </div>

          {/* Discrepancy Only Checkbox */}
          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasDiscrepancyOnly}
              onChange={(e) => setHasDiscrepancyOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">仅看有差异货件</span>
          </label>
        </div>

        <button
          onClick={resetFilters}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          重置筛选
        </button>
      </div>

      {/* Main Full Shipment Table (Prompt Section VII compliant) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3 text-center w-8">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length > 0 &&
                      selectedIds.length === filteredShipments.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-600 text-blue-600"
                  />
                </th>
                <th className="p-3">货件编号 (Shipment ID)</th>
                <th className="p-3">SKU / 产品信息</th>
                <th className="p-3">目标 FC</th>
                <th className="p-3 text-right">发货数量 (Ship)</th>
                <th className="p-3 text-right">Walmart接收 (Recv)</th>
                <th className="p-3 text-right">差异 (Diff)</th>
                <th className="p-3 text-center">箱数 (发/收)</th>
                <th className="p-3">发货日期</th>
                <th className="p-3">实际到仓日期</th>
                <th className="p-3">10天Case状态</th>
                <th className="p-3 text-center">货件状态</th>
                <th className="p-3 text-center">Case 状态</th>
                <th className="p-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredShipments.map((shp) => {
                const firstItem = shp.items?.[0];
                const time = getCaseTimeDisplay(shp.arrivalDate);
                const isSelected = selectedIds.includes(shp.id);

                return (
                  <tr
                    key={shp.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Select Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(shp.id)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                    </td>

                    {/* Shipment ID & Name */}
                    <td className="p-3">
                      <button
                        onClick={() => onSelectShipment(shp.id)}
                        className="font-mono font-bold text-blue-600 hover:underline block text-left"
                      >
                        {shp.id}
                      </button>
                      <span className="text-[11px] text-slate-500 truncate max-w-[160px] block">
                        {shp.shipmentName}
                      </span>
                    </td>

                    {/* SKU & Product Name */}
                    <td className="p-3">
                      {shp.items && shp.items.length > 0 ? (
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-semibold text-slate-900">
                              {shp.items.length === 1 ? firstItem?.sku : `${firstItem?.sku} 等 ${shp.items.length}个SKU`}
                            </span>
                            {shp.items.some((it) => it.requiresFollowup) && (
                              <span className="p-0.5 text-red-500" title="包含重点跟进差异SKU">
                                <BellRing className="w-3 h-3 animate-pulse" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {shp.items.length === 1 ? firstItem?.productName : `${shp.items.length} 个商品项`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[11px] text-slate-400 block italic">未补充SKU明细</span>
                          {onOpenProductSupplement && (
                            <button
                              onClick={() => onOpenProductSupplement(shp)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 font-medium"
                            >
                              <Plus className="w-2.5 h-2.5" /> 补充SKU
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* FC Warehouse */}
                    <td className="p-3 font-mono text-slate-700">{shp.fc}</td>

                    {/* Ship Qty */}
                    <td className="p-3 text-right font-mono font-semibold text-slate-900">
                      {shp.totalShipQty}
                    </td>

                    {/* Received Qty */}
                    <td className="p-3 text-right font-mono font-bold text-blue-600">
                      {shp.totalReceivedQty}
                    </td>

                    {/* Discrepancy Qty */}
                    <td className="p-3 text-right">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          shp.totalDiscrepancyQty > 0
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'text-emerald-600 font-medium'
                        }`}
                      >
                        {shp.totalDiscrepancyQty > 0 ? `-${shp.totalDiscrepancyQty}` : '0'}
                      </span>
                    </td>

                    {/* Cartons */}
                    <td className="p-3 text-center font-mono text-slate-600">
                      {shp.totalCartons} / {shp.totalReceivedCartons}
                      {shp.missingCartons > 0 && (
                        <span className="text-red-500 ml-1 text-[10px]">
                          (-{shp.missingCartons})
                        </span>
                      )}
                    </td>

                    {/* Ship Date */}
                    <td className="p-3 font-mono text-slate-600">{shp.shipDate}</td>

                    {/* Arrival Date */}
                    <td className="p-3 font-mono">
                      {shp.arrivalDate ? (
                        <span className="font-semibold text-slate-900">{shp.arrivalDate}</span>
                      ) : (
                        <span className="text-slate-400">ETA: {shp.eta || '未填'}</span>
                      )}
                    </td>

                    {/* 10-Day Case Status */}
                    <td className="p-3">
                      {shp.totalDiscrepancyQty > 0 ? (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border inline-block ${time.badgeClass}`}
                        >
                          {time.text}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> 无差异
                        </span>
                      )}
                    </td>

                    {/* Shipment Status */}
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          shp.status === 'Fully Received' || shp.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : shp.status === 'Case Eligible'
                            ? 'bg-red-100 text-red-800 font-bold'
                            : shp.status === 'Case Processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {shp.status}
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

                    {/* Action Buttons */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectShipment(shp.id)}
                          title="查看详情"
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {onOpenProductSupplement && (
                          <button
                            onClick={() => onOpenProductSupplement(shp)}
                            title="补充/编辑商品明细与差异标注"
                            className="p-1 hover:bg-emerald-50 rounded text-emerald-600 hover:text-emerald-800 transition-colors"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {shp.totalDiscrepancyQty > 0 && (
                          <button
                            onClick={() => onOpenCaseModal(shp)}
                            title="开Case / 更新处理"
                            className="p-1 hover:bg-purple-100 rounded text-purple-600 hover:text-purple-800 transition-colors"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onOpenNewShipmentModal(shp)}
                          title="编辑货件主信息"
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`确定要删除货件 ${shp.id} 吗？`)) {
                              onDeleteShipment(shp.id);
                            }
                          }}
                          title="删除货件"
                          className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredShipments.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-xs text-slate-500">
                    <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-slate-700">暂无符合条件的 Walmart 货件记录</p>
                      <p className="text-[11px] text-slate-400">
                        您可以直接下载标准模板填写后批量导入，或通过表单手动录入。
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => downloadShipmentBatchTemplate('xlsx')}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                          下载模板
                        </button>
                        <button
                          onClick={() => onOpenNewShipmentModal(undefined, 'batch')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          批量表格导入
                        </button>
                        <button
                          onClick={() => onOpenNewShipmentModal(undefined, 'manual')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          单条录入
                        </button>
                      </div>
                    </div>
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
