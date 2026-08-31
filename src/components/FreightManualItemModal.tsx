import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Calculator, CheckCircle2, Building2, Calendar, Box, DollarSign } from 'lucide-react';
import { FreightShippingItem } from '../types';
import { calculateItemFreightMetrics, parseDimensions, extractMonthKey } from '../utils/freightCalculator';

interface FreightManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveItem: (item: FreightShippingItem) => void;
  initialItem?: FreightShippingItem | null;
}

export const FreightManualItemModal: React.FC<FreightManualItemModalProps> = ({
  isOpen,
  onClose,
  onSaveItem,
  initialItem,
}) => {
  const [shipmentId, setShipmentId] = useState('');
  const [warehouse, setWarehouse] = useState('PHX1');
  const [shipDate, setShipDate] = useState(new Date().toISOString().split('T')[0]);
  const [sku, setSku] = useState('');
  const [productName, setProductName] = useState('');
  const [actualQty, setActualQty] = useState(100);
  const [boxCount, setBoxCount] = useState(5);
  const [boxWeight, setBoxWeight] = useState(12.5);
  const [boxLength, setBoxLength] = useState(40);
  const [boxWidth, setBoxWidth] = useState(30);
  const [boxHeight, setBoxHeight] = useState(25);
  const [channel, setChannel] = useState('美森限时达');
  const [unitPrice, setUnitPrice] = useState(13.5);
  const [isMergedCustoms, setIsMergedCustoms] = useState(true);
  const [mixedBoxGroup, setMixedBoxGroup] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialItem) {
      setShipmentId(initialItem.shipmentId || '');
      setWarehouse(initialItem.warehouse || 'PHX1');
      setShipDate(initialItem.shipDate || new Date().toISOString().split('T')[0]);
      setSku(initialItem.sku || '');
      setProductName(initialItem.productName || '');
      setActualQty(initialItem.actualQty || 0);
      setBoxCount(initialItem.boxCount || 1);
      setBoxWeight(initialItem.boxWeight || 0);
      setBoxLength(initialItem.boxLength || 40);
      setBoxWidth(initialItem.boxWidth || 30);
      setBoxHeight(initialItem.boxHeight || 25);
      setChannel(initialItem.channel || '美森限时达');
      setUnitPrice(initialItem.unitPrice || 0);
      setIsMergedCustoms(initialItem.isMergedCustoms !== false);
      setMixedBoxGroup(initialItem.mixedBoxGroup || '');
      setNotes(initialItem.notes || '');
    } else {
      setShipmentId('');
      setWarehouse('PHX1');
      setShipDate(new Date().toISOString().split('T')[0]);
      setSku('');
      setProductName('');
      setActualQty(100);
      setBoxCount(5);
      setBoxWeight(12.5);
      setBoxLength(40);
      setBoxWidth(30);
      setBoxHeight(25);
      setChannel('美森限时达');
      setUnitPrice(13.5);
      setIsMergedCustoms(true);
      setMixedBoxGroup('');
      setNotes('');
    }
  }, [initialItem, isOpen]);

  // Live metrics calculation
  const calculatedMetrics = useMemo(() => {
    const volWeight = (boxLength * boxWidth * boxHeight) / 6000;
    const baseWeight = Math.max(boxWeight, volWeight);
    const chargeablePerBox = Math.max(12, baseWeight);
    const totalChargeable = chargeablePerBox * boxCount;
    const itemFreight = totalChargeable * unitPrice;
    return {
      volWeight: Number(volWeight.toFixed(2)),
      chargeablePerBox: Number(chargeablePerBox.toFixed(2)),
      totalChargeable: Number(totalChargeable.toFixed(2)),
      itemFreight: Number(itemFreight.toFixed(2)),
      appliedMinRule: chargeablePerBox === 12 && baseWeight < 12,
      appliedVolRule: volWeight > boxWeight,
    };
  }, [boxLength, boxWidth, boxHeight, boxWeight, boxCount, unitPrice]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentId.trim() || !sku.trim()) return;

    const item: FreightShippingItem = calculateItemFreightMetrics({
      id: initialItem?.id || `F-ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      shipmentId: shipmentId.trim().toUpperCase(),
      warehouse: warehouse.trim().toUpperCase(),
      shipDate,
      monthKey: extractMonthKey(shipDate),
      sku: sku.trim(),
      productName: productName.trim() || sku.trim(),
      actualQty: Number(actualQty) || 0,
      boxCount: Math.max(1, Number(boxCount) || 1),
      boxWeight: Number(boxWeight) || 0,
      boxLength: Number(boxLength) || 0,
      boxWidth: Number(boxWidth) || 0,
      boxHeight: Number(boxHeight) || 0,
      dimensionsText: `${boxLength}*${boxWidth}*${boxHeight}`,
      channel: channel.trim(),
      unitPrice: Number(unitPrice) || 0,
      isMergedCustoms,
      mixedBoxGroup: mixedBoxGroup.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onSaveItem(item);
    onClose();
  };

  return (
    <div
      id="freight-manual-item-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {initialItem ? '编辑头程出货明细' : '手工录入头程出货明细'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              填写出货货件、箱规重量、单价与报关方式，系统将自动核算单箱计费重与运费
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Row 1: Shipment & Warehouse & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shipment ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                placeholder="例如 6520194CAS"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                目的仓库 (FC) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                placeholder="例如 OAK4, PHX1"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                发货时间 (计入月份) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={shipDate}
                onChange={(e) => setShipDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: SKU & Product Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                商品 SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="例如 PET1005-B-M"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                标题/品名
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="例如 Pet Harness Medium"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Quantities & Box Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                实际出货数量 (件) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={actualQty}
                onChange={(e) => setActualQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                对应件数 (箱数) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                value={boxCount}
                onChange={(e) => setBoxCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                单箱实重 (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={boxWeight}
                onChange={(e) => setBoxWeight(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 4: Dimensions L*W*H */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              箱规尺寸 (cm 长 * 宽 * 高)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={boxLength}
                  onChange={(e) => setBoxLength(Number(e.target.value))}
                  placeholder="长"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg pr-8 focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">长cm</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={boxWidth}
                  onChange={(e) => setBoxWidth(Number(e.target.value))}
                  placeholder="宽"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg pr-8 focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">宽cm</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={boxHeight}
                  onChange={(e) => setBoxHeight(Number(e.target.value))}
                  placeholder="高"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg pr-8 focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">高cm</span>
              </div>
            </div>
          </div>

          {/* Row 5: Channel, Unit Price, Merged Customs, Mixed Box Group */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                物流渠道
              </label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="例如 美森限时达"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                单价 (元/kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                报关方式
              </label>
              <select
                value={isMergedCustoms ? 'yes' : 'no'}
                onChange={(e) => setIsMergedCustoms(e.target.value === 'yes')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-blue-500"
              >
                <option value="yes">合并报关 (175元)</option>
                <option value="no">独立报关 (350元)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                混箱组标识 (选填)
              </label>
              <input
                type="text"
                value={mixedBoxGroup}
                onChange={(e) => setMixedBoxGroup(e.target.value)}
                placeholder="如 MIX-01"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              备注说明
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如 混箱分摊或发货批次备注"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Real-time Calculation Summary Card */}
          <div className="p-4 bg-blue-50/60 rounded-lg border border-blue-100 space-y-2">
            <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                计费逻辑与预估核算
              </span>
              <span className="font-mono text-blue-800">
                计入月份：{extractMonthKey(shipDate)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="bg-white p-2 rounded border border-blue-100">
                <div className="text-[11px] text-slate-500">单箱体积重</div>
                <div className="font-bold text-slate-800 font-mono">
                  {calculatedMetrics.volWeight} kg
                </div>
                <div className="text-[10px] text-slate-400">长*宽*高/6000</div>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <div className="text-[11px] text-slate-500">单箱计费重</div>
                <div className="font-bold text-blue-700 font-mono">
                  {calculatedMetrics.chargeablePerBox} kg
                </div>
                <div className="text-[10px] text-blue-600 font-medium">
                  {calculatedMetrics.appliedMinRule
                    ? '触发12kg保底'
                    : calculatedMetrics.appliedVolRule
                    ? '按体积重大于实重'
                    : '按单箱实重'}
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <div className="text-[11px] text-slate-500">总计费重 ({boxCount}箱)</div>
                <div className="font-bold text-slate-900 font-mono">
                  {calculatedMetrics.totalChargeable} kg
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-blue-100">
                <div className="text-[11px] text-slate-500">该项预估运费</div>
                <div className="font-bold text-emerald-700 font-mono">
                  ¥{calculatedMetrics.itemFreight}
                </div>
                <div className="text-[10px] text-slate-400">计费重 * 单价</div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              保存出货明细
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
