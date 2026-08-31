import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Boxes,
  Truck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Shipment, ShipmentItem, Product } from '../types';
import { getTodayString, isValidDate, getCaseTimeDisplay } from '../utils/dateUtils';
import { calculateShipmentMetrics } from '../utils/statusCalculator';
import {
  downloadShipmentBatchTemplate,
  parseShipmentBatchFile,
  BatchShipmentParseResult,
} from '../utils/excelParser';

interface ManualShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shipment: Shipment) => void;
  onSaveBatch?: (shipments: Shipment[], overwrite?: boolean) => void;
  existingShipment?: Shipment | null;
  products: Product[];
  initialMode?: 'manual' | 'batch';
}

export const ManualShipmentModal: React.FC<ManualShipmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveBatch,
  existingShipment,
  products,
  initialMode = 'manual',
}) => {
  if (!isOpen) return null;

  const [activeMode, setActiveMode] = useState<'manual' | 'batch'>(
    existingShipment ? 'manual' : initialMode
  );

  // Helper to generate authentic Walmart-style Shipment ID (e.g., 9741694WFA)
  const generateWalmartShipmentId = () => {
    const num = Math.floor(1000000 + Math.random() * 9000000);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const suffix =
      chars[Math.floor(Math.random() * chars.length)] +
      chars[Math.floor(Math.random() * chars.length)] +
      chars[Math.floor(Math.random() * chars.length)];
    return `${num}${suffix}`;
  };

  // ---------------- Single Shipment Form State ----------------
  const [id, setId] = useState(
    existingShipment?.id || generateWalmartShipmentId()
  );
  const [shipmentName, setShipmentName] = useState(
    existingShipment?.shipmentName || ''
  );
  const [shipDate, setShipDate] = useState(existingShipment?.shipDate || getTodayString());
  const [eta, setEta] = useState(existingShipment?.eta || '');
  const [arrivalDate, setArrivalDate] = useState(existingShipment?.arrivalDate || '');
  const [fc, setFc] = useState(existingShipment?.fc || 'PHX1 (Phoenix, AZ)');
  const [tracking, setTracking] = useState(existingShipment?.tracking || '');
  const [carrier, setCarrier] = useState(existingShipment?.carrier || 'UPS Freight');
  const [notes, setNotes] = useState(existingShipment?.notes || '');

  const [items, setItems] = useState<ShipmentItem[]>(
    existingShipment?.items && existingShipment.items.length > 0
      ? existingShipment.items
      : [
          {
            shipmentId: id,
            sku: products[0]?.sku || 'PET1005-B-M',
            itemId: products[0]?.itemId || 'WMT-ITEM-550192',
            gtin: products[0]?.gtin || '008100523401',
            productName: products[0]?.productName || 'Pet Ergonomic Mesh Dog Harness',
            productType: products[0]?.productType || 'Pet Supplies',
            shipQty: 100,
            cartons: 5,
            qtyPerCarton: 20,
            receivedQty: 0,
            receivedCartons: 0,
            discrepancyQty: 100,
            source: 'Manual Input',
          },
        ]
  );

  const [formError, setFormError] = useState<string | null>(null);

  // ---------------- Batch Upload State ----------------
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [batchParseResult, setBatchParseResult] = useState<BatchShipmentParseResult | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [expandedShipmentIds, setExpandedShipmentIds] = useState<Set<string>>(new Set());
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Form Handlers
  const handleProductSelect = (index: number, selectedSku: string) => {
    const prod = products.find((p) => p.sku === selectedSku);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      sku: selectedSku,
      itemId: prod?.itemId || '',
      gtin: prod?.gtin || '',
      productName: prod?.productName || 'Custom Product',
      productType: prod?.productType || 'General',
    };
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof ShipmentItem, val: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: val };

    if (field === 'shipQty' || field === 'cartons') {
      const sQty = Number(field === 'shipQty' ? val : current.shipQty) || 0;
      const ctn = Number(field === 'cartons' ? val : current.cartons) || 0;
      current.qtyPerCarton = ctn > 0 ? Math.round(sQty / ctn) : 0;
      current.discrepancyQty = sQty - (Number(current.receivedQty) || 0);
    } else if (field === 'receivedQty') {
      const sQty = Number(current.shipQty) || 0;
      const rQty = Number(val) || 0;
      current.discrepancyQty = sQty - rQty;
    }

    updated[index] = current;
    setItems(updated);
  };

  const addItemRow = () => {
    const defaultProd = products[0];
    setItems([
      ...items,
      {
        shipmentId: id,
        sku: defaultProd?.sku || `SKU-NEW-${items.length + 1}`,
        itemId: defaultProd?.itemId || '',
        gtin: defaultProd?.gtin || '',
        productName: defaultProd?.productName || 'New Item',
        productType: defaultProd?.productType || 'General',
        shipQty: 50,
        cartons: 5,
        qtyPerCarton: 10,
        receivedQty: 0,
        receivedCartons: 0,
        discrepancyQty: 50,
        source: 'Manual Input',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      setFormError('货件至少需包含 1 个商品明细');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!id.trim()) {
      setFormError('货件编号 (Shipment ID) 不能为空');
      return;
    }
    if (!shipDate) {
      setFormError('发货日期 (Ship Date) 不能为空');
      return;
    }
    if (arrivalDate && !isValidDate(arrivalDate)) {
      setFormError('实际到仓日期格式不正确，应为 YYYY-MM-DD');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].sku.trim()) {
        setFormError(`第 ${i + 1} 项 SKU 不能为空`);
        return;
      }
      if (items[i].shipQty <= 0) {
        setFormError(`第 ${i + 1} 项发货数量必须大于 0`);
        return;
      }
    }

    const finalShipmentName =
      shipmentName.trim() || `${id.trim()}_${fc.split(' ')[0] || 'FC'}_${shipDate.slice(0, 7)}`;

    const baseShipment: Shipment = {
      id: id.trim(),
      shipmentName: finalShipmentName,
      shipDate,
      eta: eta || undefined,
      arrivalDate: arrivalDate || undefined,
      fc,
      tracking: tracking.trim() || undefined,
      carrier,
      status: 'Draft',
      items: items.map((it) => ({ ...it, shipmentId: id.trim() })),
      totalShipQty: 0,
      totalReceivedQty: 0,
      totalDiscrepancyQty: 0,
      totalCartons: 0,
      totalReceivedCartons: 0,
      missingCartons: 0,
      caseStatus: existingShipment?.caseStatus || 'Not Eligible',
      caseId: existingShipment?.caseId,
      notes: notes.trim() || undefined,
      createdAt: existingShipment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: existingShipment?.source || 'Manual',
    };

    const calculated = calculateShipmentMetrics(baseShipment);
    onSave(calculated);
    onClose();
  };

  // Batch Upload File Handlers
  const handleFileProcess = async (file: File) => {
    setUploadedFile(file);
    setIsParsing(true);
    setBatchError(null);

    try {
      const result = await parseShipmentBatchFile(file, products);
      setBatchParseResult(result);
    } catch (err: any) {
      setBatchError(err?.message || '文件解析失败，请检查文件格式是否为标准的 Excel 或 CSV 表格');
      setBatchParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const toggleExpandShipment = (shipmentId: string) => {
    const next = new Set(expandedShipmentIds);
    if (next.has(shipmentId)) {
      next.delete(shipmentId);
    } else {
      next.add(shipmentId);
    }
    setExpandedShipmentIds(next);
  };

  const handleConfirmBatchImport = () => {
    if (!batchParseResult || batchParseResult.shipments.length === 0) return;

    if (onSaveBatch) {
      onSaveBatch(batchParseResult.shipments, overwriteExisting);
    } else {
      // Fallback: save one by one
      batchParseResult.shipments.forEach((s) => onSave(s));
    }
    onClose();
  };

  const timeDisplay = getCaseTimeDisplay(arrivalDate);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {existingShipment ? '编辑 Walmart 货件信息' : '创建 / 录入 Walmart 货件'}
              </h3>
              <p className="text-[11px] text-slate-400">
                支持单票手动录入与批量 Excel/CSV 表格模板上传导入
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

        {/* Mode Switcher Tabs (Only if not editing existing) */}
        {!existingShipment && (
          <div className="px-6 pt-3 pb-0 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveMode('manual')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all ${
                activeMode === 'manual'
                  ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Boxes className="w-4 h-4" />
              单条手动录入 (Single Entry)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('batch')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all ${
                activeMode === 'batch'
                  ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              批量表格上传 (Bulk Excel / CSV)
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                推荐
              </span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* ===================== MODE 1: SINGLE FORM ENTRY ===================== */}
          {activeMode === 'manual' && (
            <form onSubmit={handleSingleSubmit} className="space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Shipment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-medium">
                      货件编号 (Shipment ID) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setId(generateWalmartShipmentId())}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      随机生成
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="例如: 9741694WFA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    支持任意真实 Walmart 格式 (如 9741694WFA)
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    系统标识名称 (选填，自动生成)
                  </label>
                  <input
                    type="text"
                    value={shipmentName}
                    onChange={(e) => setShipmentName(e.target.value)}
                    placeholder={id ? `${id}_${fc.split(' ')[0] || 'PHX1'}_${shipDate.slice(0, 7)}` : '系统自动生成标识'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Walmart后台无需此字段，仅作为本系统内部批次标识
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Walmart 目标仓库 (FC) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fc}
                    onChange={(e) => setFc(e.target.value)}
                    placeholder="例如: PHX1 (Phoenix, AZ)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates & Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    发货日期 (Ship Date) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={shipDate}
                    onChange={(e) => setShipDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">预计到仓日期 (ETA)</label>
                  <input
                    type="date"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    实际到仓日期 (Arrival Date)
                  </label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">10天Case计时基准</span>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">承运商 (Carrier)</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="例如: UPS Freight"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1">
                  物流追踪运单号 (Tracking #)
                </label>
                <input
                  type="text"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="例如: 1Z999AA10123456781 或 PRO 9841289"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* 10-day case preview banner */}
              <div className={`p-3 rounded-lg border text-xs ${timeDisplay.badgeClass}`}>
                <strong>10天Case倒计时预测:</strong> {timeDisplay.text}
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-blue-600" />
                    商品明细与收发数量
                  </h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加商品项
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">
                          商品 #{idx + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-slate-500 text-[11px] mb-1">选择/输入 SKU</label>
                          <input
                            type="text"
                            list={`sku-list-${idx}`}
                            value={item.sku}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleProductSelect(idx, val);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <datalist id={`sku-list-${idx}`}>
                            {products.map((p) => (
                              <option key={p.sku} value={p.sku}>
                                {p.productName}
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-slate-500 text-[11px] mb-1">产品名称</label>
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 text-[11px] mb-1">Item ID</label>
                          <input
                            type="text"
                            value={item.itemId || ''}
                            onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-1 border-t border-slate-200">
                        <div>
                          <label className="block text-slate-600 text-[11px] font-medium mb-1">
                            发货数量 (Ship Qty) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.shipQty}
                            onChange={(e) =>
                              handleItemChange(idx, 'shipQty', Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-medium mb-1">
                            总箱数 (Cartons)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.cartons}
                            onChange={(e) =>
                              handleItemChange(idx, 'cartons', Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-medium mb-1">
                            Walmart 接收数量
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.receivedQty}
                            onChange={(e) =>
                              handleItemChange(idx, 'receivedQty', Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-blue-600 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-medium mb-1">
                            接收箱数
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.receivedCartons ?? item.cartons}
                            onChange={(e) =>
                              handleItemChange(idx, 'receivedCartons', Number(e.target.value))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-600 text-[11px] font-medium mb-1">
                            计算差异 (Discrepancy)
                          </label>
                          <div
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold ${
                              item.discrepancyQty > 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {item.discrepancyQty > 0 ? `-${item.discrepancyQty}` : '0'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium text-xs mb-1">
                  备注说明 (Notes)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="例如: 第1批次补货，包含托盘打带包装信息..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Single Form Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  保存并生效货件
                </button>
              </div>
            </form>
          )}

          {/* ===================== MODE 2: BATCH SPREADSHEET UPLOAD ===================== */}
          {activeMode === 'batch' && (
            <div className="space-y-6">
              {/* Step 1: Template Download Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        第 1 步：下载标准货件导入模板
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                      已为您预置<strong>货件级标准字段</strong>。上传货件时<strong>无需强制绑定商品SKU</strong>（单件数与箱数可作为货件总数导入）；后续可在货件列表中单独补充多 SKU 拆分与差异标注提醒。
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadShipmentBatchTemplate('xlsx')}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      下载 Excel 模板 (.xlsx)
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadShipmentBatchTemplate('csv')}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 shadow-xs flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      CSV 模板
                    </button>
                  </div>
                </div>

                {/* Column Guidance Details */}
                <div className="mt-3.5 pt-3 border-t border-blue-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] text-slate-600">
                  <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                    <span className="font-semibold text-slate-800 block">货件编号 (Shipment ID) *</span>
                    唯一标识，同ID多行自动归集
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                    <span className="font-semibold text-slate-800 block">发货总件数与箱数 *</span>
                    填写该货件发货总件数与箱数
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                    <span className="font-semibold text-slate-800 block">商品SKU (可选)</span>
                    可留空，或作为后续补充明细
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                    <span className="font-semibold text-slate-800 block">实际到仓日期 (Arrival)</span>
                    填写后自动开启10天Case倒计时
                  </div>
                </div>
              </div>

              {/* Step 2: Upload Zone */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  第 2 步：上传填写完成的表格文件
                </h4>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    uploadedFile
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/20'
                  }`}
                >
                  {isParsing ? (
                    <div className="py-4 flex flex-col items-center gap-2 text-slate-600 text-xs">
                      <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                      <span>正在智能解析表格并校验货件结构与SKU...</span>
                    </div>
                  ) : uploadedFile ? (
                    <div className="py-2 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{uploadedFile.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB · 点击可重新选择或替换文件
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          setBatchParseResult(null);
                          setBatchError(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        清空重新选择
                      </button>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        点击此处上传 或 将填写好的 Excel / CSV 文件拖拽至此
                      </p>
                      <p className="text-[11px] text-slate-500">
                        支持 .xlsx, .xls, .csv 格式表格文件
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Box */}
              {batchError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">解析错误:</strong>
                    <span>{batchError}</span>
                  </div>
                </div>
              )}

              {/* Step 3: Parsing Results & Live Preview */}
              {batchParseResult && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      第 3 步：数据预览与校验确认
                    </h4>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={overwriteExisting}
                          onChange={(e) => setOverwriteExisting(e.target.checked)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>若货件已存在则覆盖更新</span>
                      </label>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                      <span className="text-slate-500 text-[11px] block">解析货件票数</span>
                      <strong className="text-base text-blue-700 font-mono">
                        {batchParseResult.totalShipments} 票
                      </strong>
                    </div>
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                      <span className="text-slate-500 text-[11px] block">商品明细项数</span>
                      <strong className="text-base text-indigo-700 font-mono">
                        {batchParseResult.shipments.reduce((sum, s) => sum + s.items.length, 0)} 项
                      </strong>
                    </div>
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                      <span className="text-slate-500 text-[11px] block">发货总数量</span>
                      <strong className="text-base text-emerald-700 font-mono">
                        {batchParseResult.totalUnits.toLocaleString()} 件
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                      <span className="text-slate-500 text-[11px] block">总箱数</span>
                      <strong className="text-base text-slate-800 font-mono">
                        {batchParseResult.totalCartons.toLocaleString()} 箱
                      </strong>
                    </div>
                  </div>

                  {/* Errors / Warnings List if any */}
                  {batchParseResult.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        发现 {batchParseResult.errors.length} 处必填错误，请修正后重新上传:
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                        {batchParseResult.errors.map((err, i) => (
                          <li key={i}>{err.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {batchParseResult.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        提示与自动处理说明 ({batchParseResult.warnings.length} 条):
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                        {batchParseResult.warnings.map((w, i) => (
                          <li key={i}>{w.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Shipments Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="p-2.5">货件编号</th>
                            <th className="p-2.5">发货日期</th>
                            <th className="p-2.5">实际到仓</th>
                            <th className="p-2.5">目标仓库</th>
                            <th className="p-2.5">承运商/单号</th>
                            <th className="p-2.5 text-center">商品SKU数</th>
                            <th className="p-2.5 text-right">总发货件数</th>
                            <th className="p-2.5 text-center">状态</th>
                            <th className="p-2.5 text-center">明细</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {batchParseResult.shipments.map((s) => {
                            const isExpanded = expandedShipmentIds.has(s.id);
                            return (
                              <React.Fragment key={s.id}>
                                <tr className="hover:bg-slate-50 transition-colors">
                                  <td className="p-2.5 font-mono font-bold text-blue-600">
                                    {s.id}
                                    {s.shipmentName && (
                                      <span className="block text-[10px] font-normal text-slate-500 font-sans">
                                        {s.shipmentName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-slate-700">{s.shipDate}</td>
                                  <td className="p-2.5 text-slate-700">
                                    {s.arrivalDate ? (
                                      <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        {s.arrivalDate}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">未到仓</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-slate-700 font-medium">{s.fc}</td>
                                  <td className="p-2.5 text-slate-600">
                                    <div>{s.carrier || '-'}</div>
                                    {s.tracking && (
                                      <div className="font-mono text-[10px] text-slate-400">
                                        {s.tracking}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center font-mono">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">
                                      {s.items.length} 个
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                    {s.totalShipQty} 件
                                    <span className="block text-[10px] text-slate-400 font-normal">
                                      ({s.totalCartons} 箱)
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium whitespace-nowrap">
                                      {s.status}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandShipment(s.id)}
                                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                                      title="展开/收起商品SKU列表"
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )}
                                    </button>
                                  </td>
                                </tr>

                                {/* Expanded Item Rows */}
                                {isExpanded && (
                                  <tr className="bg-slate-50/80">
                                    <td colSpan={9} className="p-3 border-t border-slate-200">
                                      <div className="text-[11px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                        <Boxes className="w-3.5 h-3.5 text-blue-600" />
                                        货件 {s.id} 包含的商品明细 ({s.items.length} 项):
                                      </div>
                                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                        <table className="w-full text-[11px] text-left">
                                          <thead className="bg-slate-100 text-slate-600">
                                            <tr>
                                              <th className="p-1.5">SKU</th>
                                              <th className="p-1.5">商品名称</th>
                                              <th className="p-1.5 text-right">发货数量</th>
                                              <th className="p-1.5 text-right">箱数</th>
                                              <th className="p-1.5 text-right">单箱规格</th>
                                              <th className="p-1.5 text-right">已接收</th>
                                              <th className="p-1.5 text-right">差异</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {s.items.map((it, idx) => (
                                              <tr key={idx}>
                                                <td className="p-1.5 font-mono font-medium text-slate-900">
                                                  {it.sku}
                                                </td>
                                                <td className="p-1.5 text-slate-600 truncate max-w-[200px]">
                                                  {it.productName}
                                                </td>
                                                <td className="p-1.5 text-right font-mono font-bold">
                                                  {it.shipQty}
                                                </td>
                                                <td className="p-1.5 text-right font-mono text-slate-600">
                                                  {it.cartons}
                                                </td>
                                                <td className="p-1.5 text-right font-mono text-slate-500">
                                                  {it.qtyPerCarton}
                                                </td>
                                                <td className="p-1.5 text-right font-mono text-blue-600">
                                                  {it.receivedQty}
                                                </td>
                                                <td className="p-1.5 text-right font-mono font-bold">
                                                  {it.discrepancyQty > 0 ? (
                                                    <span className="text-red-600">
                                                      -{it.discrepancyQty}
                                                    </span>
                                                  ) : (
                                                    <span className="text-emerald-600">0</span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Batch Upload Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {batchParseResult
                    ? `已成功解析 ${batchParseResult.totalShipments} 票货件，共 ${batchParseResult.totalUnits} 件商品`
                    : '请先下载模板填写并回传表格'}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={
                      !batchParseResult ||
                      batchParseResult.shipments.length === 0 ||
                      batchParseResult.errors.length > 0
                    }
                    onClick={handleConfirmBatchImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    一键确认导入全部 (
                    {batchParseResult ? batchParseResult.shipments.length : 0} 票货件)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
