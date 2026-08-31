import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Download,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Tag,
  AlertTriangle,
  FileText,
  Boxes,
  BellRing,
  HelpCircle,
} from 'lucide-react';
import { Shipment, ShipmentItem, Product, DiscrepancyTag } from '../types';
import { downloadShipmentItemTemplate, parseShipmentItemSupplementFile } from '../utils/excelParser';
import { calculateShipmentMetrics } from '../utils/statusCalculator';

interface ProductSupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment | null;
  products: Product[];
  onSaveItems: (shipmentId: string, updatedItems: ShipmentItem[]) => void;
}

const DISCREPANCY_TAG_OPTIONS: { value: DiscrepancyTag; label: string; color: string }[] = [
  { value: 'FC_SHORTAGE', label: 'FC漏扫 / 库房少收', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'DAMAGED_CARTON', label: '外箱破损 / 途中丢件', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'LABEL_ISSUE', label: '条码模糊 / 标签异常', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'SUPPLIER_MISCOUNT', label: '出厂装箱少发', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'PENDING_INVESTIGATION', label: '已提Case / FC核实中', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'VERIFIED', label: '数量一致 / 已核实无误', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'OTHER', label: '其他差异类型', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export const ProductSupplementModal: React.FC<ProductSupplementModalProps> = ({
  isOpen,
  onClose,
  shipment,
  products,
  onSaveItems,
}) => {
  if (!isOpen || !shipment) return null;

  const [items, setItems] = useState<ShipmentItem[]>(
    shipment.items && shipment.items.length > 0
      ? JSON.parse(JSON.stringify(shipment.items))
      : []
  );

  const [activeTab, setActiveTab] = useState<'table' | 'upload'>('table');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Totals calculations
  const totalItemShipQty = items.reduce((s, it) => s + (Number(it.shipQty) || 0), 0);
  const totalItemReceivedQty = items.reduce((s, it) => s + (Number(it.receivedQty) || 0), 0);
  const totalItemDiscrepancy = items.reduce((s, it) => s + (Number(it.discrepancyQty) || 0), 0);
  const totalItemCartons = items.reduce((s, it) => s + (Number(it.cartons) || 0), 0);

  // Product Selection handler
  const handleProductSelect = (index: number, selectedSku: string) => {
    const prod = products.find((p) => p.sku === selectedSku);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      sku: selectedSku,
      itemId: prod?.itemId || updated[index].itemId || '',
      gtin: prod?.gtin || updated[index].gtin || '',
      productName: prod?.productName || selectedSku,
      productType: prod?.productType || 'General',
    };
    setItems(updated);
  };

  // Item Field Change
  const handleFieldChange = (index: number, field: keyof ShipmentItem, val: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: val };

    if (field === 'shipQty' || field === 'cartons') {
      const sQty = Number(field === 'shipQty' ? val : current.shipQty) || 0;
      const ctn = Number(field === 'cartons' ? val : current.cartons) || 0;
      current.qtyPerCarton = ctn > 0 ? Math.round(sQty / ctn) : 0;
      current.discrepancyQty = Math.max(0, sQty - (Number(current.receivedQty) || 0));
    } else if (field === 'receivedQty') {
      const sQty = Number(current.shipQty) || 0;
      const rQty = Number(val) || 0;
      current.discrepancyQty = Math.max(0, sQty - rQty);
    }

    if (current.discrepancyQty > 0 && !current.discrepancyTag) {
      current.discrepancyTag = 'FC_SHORTAGE';
      current.requiresFollowup = true;
    } else if (current.discrepancyQty === 0 && current.discrepancyTag === 'FC_SHORTAGE') {
      current.discrepancyTag = 'VERIFIED';
      current.requiresFollowup = false;
    }

    updated[index] = current;
    setItems(updated);
  };

  // Add Item Row
  const handleAddRow = () => {
    const defaultProd = products[0];
    const newShipQty = Math.max(1, shipment.totalShipQty - totalItemShipQty);
    const newCartons = Math.max(1, Math.ceil(newShipQty / 20));

    setItems([
      ...items,
      {
        shipmentId: shipment.id,
        sku: defaultProd?.sku || `SKU-ITEM-${items.length + 1}`,
        itemId: defaultProd?.itemId || '',
        gtin: defaultProd?.gtin || '',
        productName: defaultProd?.productName || 'New Product Item',
        productType: defaultProd?.productType || 'General',
        shipQty: newShipQty > 0 ? newShipQty : 50,
        cartons: newCartons,
        qtyPerCarton: newCartons > 0 ? Math.round((newShipQty > 0 ? newShipQty : 50) / newCartons) : 10,
        receivedQty: 0,
        receivedCartons: 0,
        discrepancyQty: newShipQty > 0 ? newShipQty : 50,
        discrepancyTag: 'FC_SHORTAGE',
        discrepancyReason: '',
        requiresFollowup: true,
        source: 'Manual Supplement',
      },
    ]);
  };

  // Remove Row
  const handleRemoveRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Auto-fill from Product Catalog
  const handleAutoPopulate = () => {
    if (products.length === 0) return;
    const remainingQty = Math.max(1, shipment.totalShipQty);
    const qtyEach = Math.floor(remainingQty / Math.min(3, products.length));

    const generated: ShipmentItem[] = products.slice(0, 3).map((p, idx) => {
      const isLast = idx === Math.min(3, products.length) - 1;
      const sQty = isLast ? remainingQty - qtyEach * (Math.min(3, products.length) - 1) : qtyEach;
      const ctns = Math.max(1, Math.ceil(sQty / 20));
      return {
        shipmentId: shipment.id,
        sku: p.sku,
        itemId: p.itemId,
        gtin: p.gtin,
        productName: p.productName,
        productType: p.productType,
        shipQty: sQty,
        cartons: ctns,
        qtyPerCarton: Math.round(sQty / ctns),
        receivedQty: 0,
        receivedCartons: 0,
        discrepancyQty: sQty,
        discrepancyTag: 'FC_SHORTAGE',
        requiresFollowup: true,
        source: 'Auto Populated',
      };
    });

    setItems(generated);
  };

  // File Upload Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);
    setUploadError(null);
    setUploadWarnings([]);
    setSuccessMsg(null);

    try {
      const parsed = await parseShipmentItemSupplementFile(file, shipment.id, products);
      if (parsed.errors.length > 0) {
        setUploadError(`文件校验未通过: ${parsed.errors[0].message}`);
        return;
      }

      setItems(parsed.items);
      if (parsed.warnings.length > 0) {
        setUploadWarnings(parsed.warnings.map((w) => w.message));
      }
      setSuccessMsg(`成功导入 ${parsed.items.length} 个商品明细项！总数量: ${parsed.totalUnits}`);
      setActiveTab('table');
    } catch (err: any) {
      setUploadError(err?.message || '解析商品明细表格失败，请检查文件格式');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save All
  const handleSave = () => {
    onSaveItems(shipment.id, items);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2">
                货件商品明细与差异标注
                <span className="px-2 py-0.5 bg-blue-600/30 border border-blue-400/30 text-blue-300 font-mono text-xs rounded">
                  {shipment.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                可后续独立补充多 SKU 拆分、数量核对、差异原因分类与重点跟进提醒
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shipment Overview KPI Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs flex-shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500 block text-[11px]">货件总发货数</span>
              <strong className="text-slate-900 font-mono text-sm">{shipment.totalShipQty} 件</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">货件总接收数</span>
              <strong className="text-blue-600 font-mono text-sm">{shipment.totalReceivedQty} 件</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">货件总差异数</span>
              <strong
                className={`font-mono text-sm ${
                  shipment.totalDiscrepancyQty > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {shipment.totalDiscrepancyQty > 0 ? `-${shipment.totalDiscrepancyQty}` : '0'} 件
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">目的仓 (FC)</span>
              <strong className="text-slate-700 font-mono">{shipment.fc}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">SKU分摊对比:</span>
              <span
                className={`font-mono font-bold ${
                  totalItemShipQty === shipment.totalShipQty ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {totalItemShipQty} / {shipment.totalShipQty}
              </span>
              {totalItemShipQty !== shipment.totalShipQty && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                  {totalItemShipQty < shipment.totalShipQty ? '少分摊' : '超额'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              在线编辑明细 ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              表格批量上传
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadShipmentItemTemplate(shipment.id)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors"
              title="下载该货件专用商品明细填报模板"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              下载SKU填报模板
            </button>
            {items.length === 0 && (
              <button
                onClick={handleAutoPopulate}
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors"
              >
                从商品库自动填充
              </button>
            )}
            <button
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium flex items-center gap-1 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加商品项
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {uploadWarnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                表格解析提示:
              </div>
              {uploadWarnings.map((w, idx) => (
                <div key={idx} className="text-[11px] pl-5">• {w}</div>
              ))}
            </div>
          )}

          {/* TAB 1: Online Table Editor */}
          {activeTab === 'table' && (
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/60">
                  <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">
                    当前货件暂未关联具体商品 SKU 明细
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                    货件主单已登记 {shipment.totalShipQty} 件商品。您可以点击下方按钮手动添加商品项，或直接上传 Excel 表格快速录入。
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleAddRow}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      手动添加第一项商品
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      批量上传 Excel 表格
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const isDiff = item.discrepancyQty > 0;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isDiff
                            ? 'bg-red-50/40 border-red-200 shadow-xs'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {/* Row Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {item.sku || '未命名 SKU'}
                            </span>
                            {isDiff ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                数量差异: -{item.discrepancyQty} 件
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                数量相符
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={!!item.requiresFollowup}
                                onChange={(e) =>
                                  handleFieldChange(idx, 'requiresFollowup', e.target.checked)
                                }
                                className="rounded text-red-600 focus:ring-red-500"
                              />
                              <BellRing
                                className={`w-3.5 h-3.5 ${
                                  item.requiresFollowup ? 'text-red-500' : 'text-slate-400'
                                }`}
                              />
                              <span>重点跟进提醒</span>
                            </label>
                            <button
                              onClick={() => handleRemoveRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除此行"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Product Basic Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs mb-3">
                          <div>
                            <label className="block text-slate-500 text-[11px] mb-1">
                              商品 SKU <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              list={`sku-dropdown-${idx}`}
                              value={item.sku}
                              onChange={(e) => handleProductSelect(idx, e.target.value)}
                              placeholder="选择或输入 SKU"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <datalist id={`sku-dropdown-${idx}`}>
                              {products.map((p) => (
                                <option key={p.sku} value={p.sku}>
                                  {p.productName} ({p.itemId || '无ID'})
                                </option>
                              ))}
                            </datalist>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-slate-500 text-[11px] mb-1">产品名称</label>
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleFieldChange(idx, 'productName', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-500 text-[11px] mb-1">Item ID</label>
                            <input
                              type="text"
                              value={item.itemId || ''}
                              onChange={(e) => handleFieldChange(idx, 'itemId', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Quantities & Cartons Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3 p-2.5 bg-white rounded-lg border border-slate-200">
                          <div>
                            <label className="block text-slate-600 text-[11px] font-medium mb-1">
                              发货件数 (Ship Qty) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.shipQty}
                              onChange={(e) => handleFieldChange(idx, 'shipQty', Number(e.target.value))}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-600 text-[11px] font-medium mb-1">
                              已接收数 (Received Qty)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.receivedQty}
                              onChange={(e) =>
                                handleFieldChange(idx, 'receivedQty', Number(e.target.value))
                              }
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-blue-600"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-600 text-[11px] font-medium mb-1">
                              发货总箱数
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.cartons}
                              onChange={(e) => handleFieldChange(idx, 'cartons', Number(e.target.value))}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-600 text-[11px] font-medium mb-1">
                              单箱规格 (件/箱)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.qtyPerCarton || 1}
                              onChange={(e) =>
                                handleFieldChange(idx, 'qtyPerCarton', Number(e.target.value))
                              }
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700"
                            />
                          </div>
                        </div>

                        {/* Discrepancy Annotation & Notes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-600 text-[11px] font-semibold mb-1 flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5 text-blue-600" />
                              差异类型标签 (Discrepancy Tag)
                            </label>
                            <select
                              value={item.discrepancyTag || (isDiff ? 'FC_SHORTAGE' : 'VERIFIED')}
                              onChange={(e) =>
                                handleFieldChange(idx, 'discrepancyTag', e.target.value as DiscrepancyTag)
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              {DISCREPANCY_TAG_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-600 text-[11px] font-semibold mb-1 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              差异原因与处置标注 (Discrepancy Note)
                            </label>
                            <input
                              type="text"
                              value={item.discrepancyReason || ''}
                              onChange={(e) => handleFieldChange(idx, 'discrepancyReason', e.target.value)}
                              placeholder="例如: 第3箱少装10件已登记，待FC再次上架核对"
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Excel / CSV Batch Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <div className="font-semibold">关于商品明细表格补充说明</div>
                  <p className="text-blue-800/90 leading-relaxed">
                    您可以下载基于 Walmart 官方 <strong className="font-semibold">inbound-order-template</strong> 格式并附加货件号 <strong className="font-mono">{shipment.id}</strong> 的 SKU 明细模板，填入商品 SKU、发货数、接收数、箱数规格以及差异说明标签后上传，系统将自动合并更新。
                  </p>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Template Download & Upload Action Section */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    下载沃尔玛标准 inbound-order-template 模板
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    已预填当前货件 ID 与示例 SKU，可直接填写回传
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadShipmentItemTemplate(shipment.id, 'xlsx')}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    下载 Excel 模板 (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadShipmentItemTemplate(shipment.id, 'csv')}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    CSV 格式
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-8 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1">
                  {isUploading ? '正在解析表格中...' : '点击或将填写好的 inbound-order-template 表格拖入此处'}
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  支持 .xlsx, .xls, .csv 格式，包含 Shipment ID、Seller SKU、Ship Qty、Received Qty 等
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs">
                  <UploadCloud className="w-3.5 h-3.5" />
                  选择文件上传回传
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-500">
            共 <strong className="text-slate-800 font-mono">{items.length}</strong> 个商品项 |
            累计发货: <strong className="text-slate-800 font-mono">{totalItemShipQty}</strong> 件 |
            累计接收: <strong className="text-blue-600 font-mono">{totalItemReceivedQty}</strong> 件 |
            总差异: <strong className={`font-mono ${totalItemDiscrepancy > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {totalItemDiscrepancy > 0 ? `-${totalItemDiscrepancy}` : '0'}
            </strong> 件
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              保存商品明细与标注
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
