import React, { useState, useMemo } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Truck,
  Download,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Shipment, FreightShippingItem } from '../types';
import { groupFreightItemsByShipment } from '../utils/freightCalculator';
import { downloadShipmentBatchTemplate } from '../utils/excelParser';
import { AppStorage } from '../utils/storage';

interface FreightSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  freightItems: FreightShippingItem[];
  existingShipments: Shipment[];
  onSyncToShipments: (newShipments: Shipment[]) => void;
}

export const FreightSyncModal: React.FC<FreightSyncModalProps> = ({
  isOpen,
  onClose,
  freightItems,
  existingShipments,
  onSyncToShipments,
}) => {
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [syncMode, setSyncMode] = useState<'create_direct' | 'download_template'>('create_direct');
  const [isSuccess, setIsSuccess] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ createdCount: number; updatedCount: number }>({
    createdCount: 0,
    updatedCount: 0,
  });

  // Group freight items by shipment
  const groupedShipments = useMemo(() => {
    return groupFreightItemsByShipment(freightItems);
  }, [freightItems]);

  const existingShipmentMap = useMemo(() => {
    const map = new Map<string, Shipment>();
    existingShipments.forEach((s) => {
      map.set(s.id.toUpperCase(), s);
    });
    return map;
  }, [existingShipments]);

  // Initial selection of all non-synced or all shipments
  React.useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      const allIds = groupedShipments.map((g) => g.shipmentId);
      setSelectedShipmentIds(allIds);
    }
  }, [isOpen, groupedShipments]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedShipmentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedShipmentIds.length === groupedShipments.length) {
      setSelectedShipmentIds([]);
    } else {
      setSelectedShipmentIds(groupedShipments.map((g) => g.shipmentId));
    }
  };

  const handleConfirmSync = () => {
    if (selectedShipmentIds.length === 0) return;

    const selectedGroups = groupedShipments.filter((g) =>
      selectedShipmentIds.includes(g.shipmentId)
    );

    if (syncMode === 'download_template') {
      const prefilled = selectedGroups.map((g) => ({
        shipmentId: g.shipmentId,
        fc: g.warehouse,
        shipDate: g.shipDate,
      }));
      downloadShipmentBatchTemplate('xlsx', prefilled);
      onClose();
      return;
    }

    // Direct create/update in shipments
    let created = 0;
    let updated = 0;
    const newOrUpdatedList: Shipment[] = [];

    selectedGroups.forEach((g) => {
      const existing = existingShipmentMap.get(g.shipmentId.toUpperCase());
      const firstItem = g.items[0];

      const mappedItems = g.items.map((it) => ({
        shipmentId: g.shipmentId,
        sku: it.sku,
        productName: it.productName || it.sku,
        shipQty: it.actualQty,
        cartons: it.boxCount,
        qtyPerCarton: it.boxCount > 0 ? Math.round(it.actualQty / it.boxCount) : it.actualQty,
        receivedQty: existing?.items?.find((ei) => ei.sku.toLowerCase() === it.sku.toLowerCase())?.receivedQty || 0,
        receivedCartons: existing?.items?.find((ei) => ei.sku.toLowerCase() === it.sku.toLowerCase())?.receivedCartons || 0,
        discrepancyQty: Math.max(
          0,
          it.actualQty -
            (existing?.items?.find((ei) => ei.sku.toLowerCase() === it.sku.toLowerCase())?.receivedQty || 0)
        ),
        discrepancyTag: 'VERIFIED' as const,
        source: 'Freight Summary Sync',
      }));

      if (existing) {
        updated++;
        newOrUpdatedList.push({
          ...existing,
          fc: g.warehouse || existing.fc,
          shipDate: g.shipDate || existing.shipDate,
          carrier: firstItem?.channel || existing.carrier,
          totalShipQty: g.totalUnits,
          totalCartons: g.totalCartons,
          items: mappedItems,
          updatedAt: new Date().toISOString(),
        });
      } else {
        created++;
        newOrUpdatedList.push({
          id: g.shipmentId,
          shipmentName: `Shipment_${g.shipmentId}`,
          fc: g.warehouse || 'PHX1',
          shipDate: g.shipDate || new Date().toISOString().split('T')[0],
          status: 'In Transit',
          carrier: firstItem?.channel || '美森快船',
          tracking: '',
          totalShipQty: g.totalUnits,
          totalCartons: g.totalCartons,
          totalReceivedQty: 0,
          totalReceivedCartons: 0,
          missingCartons: 0,
          totalDiscrepancyQty: 0,
          caseStatus: 'Not Eligible',
          items: mappedItems,
          notes: `从头程出货汇总表反向提取 (包含 ${g.items.length} 个SKU, 共 ${g.totalUnits} 件)`,
          source: 'Freight Sync',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    onSyncToShipments(newOrUpdatedList);
    AppStorage.saveSyncedShipmentIds(selectedShipmentIds);
    setSyncSummary({ createdCount: created, updatedCount: updated });
    setIsSuccess(true);
  };

  return (
    <div
      id="freight-sync-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                反向提取货件至货件管理
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
                  {groupedShipments.length} 票可用货件
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                从头程出货汇总表中提取 Shipment ID、发货仓库、出货时间及 SKU 明细，同步至货件管理全生命周期
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {isSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">同步操作已成功完成</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                已成功同步 {syncSummary.createdCount + syncSummary.updatedCount} 票货件至货件管理（新建{' '}
                {syncSummary.createdCount} 票，更新 {syncSummary.updatedCount} 票），相关出货数据及 SKU 均已就绪。
              </p>
              <div className="pt-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  完成并查看货件管理
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Sync Mode Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setSyncMode('create_direct')}
                  className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                    syncMode === 'create_direct'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="sync_mode"
                    checked={syncMode === 'create_direct'}
                    onChange={() => setSyncMode('create_direct')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">直接创建/更新系统货件</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      自动在“货件管理”模块中生成货件与商品明细，并设置为在途状态
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setSyncMode('download_template')}
                  className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                    syncMode === 'download_template'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="sync_mode"
                    checked={syncMode === 'download_template'}
                    onChange={() => setSyncMode('download_template')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">导出预填信息的批量导入模板</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      下载填入提取到的 Shipment ID 和仓库代码的 Excel 模板供人工核对
                    </div>
                  </div>
                </label>
              </div>

              {/* Shipment List for Confirmation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>待提取货件清单</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      (已勾选 {selectedShipmentIds.length} / {groupedShipments.length} 票)
                    </span>
                  </div>
                  <button
                    onClick={selectAll}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    {selectedShipmentIds.length === groupedShipments.length ? '取消全选' : '全选全部'}
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {groupedShipments.map((g) => {
                    const isSelected = selectedShipmentIds.includes(g.shipmentId);
                    const isExisting = existingShipmentMap.has(g.shipmentId.toUpperCase());
                    const skuCount = g.items.length;

                    return (
                      <div
                        key={g.shipmentId}
                        onClick={() => toggleSelect(g.shipmentId)}
                        className={`p-3 flex items-center justify-between text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-blue-50/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{g.shipmentId}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                {g.warehouse}
                              </span>
                              {isExisting ? (
                                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[10px] border border-amber-200">
                                  系统已存在 (将更新)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200">
                                  新货件
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {g.shipDate}
                              </span>
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3 text-slate-400" />
                                {skuCount} 个SKU ({g.totalUnits} 件 / {g.totalCartons} 箱)
                              </span>
                              <span>{g.items[0]?.channel || '快船'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-slate-700 font-medium">
                            计费重 {g.totalEstimatedChargeableWeight.toFixed(1)} kg
                          </div>
                          <div className="text-[11px] text-slate-400">
                            预估 ¥{g.totalEstimatedCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">确认机制：</span>
                  此操作会精准提取头程出货表中填写的 Shipment ID 及对应目的仓（如 OAK4, PHX1），并保留每票货件的所有 SKU 明细，便于在货件管理中无缝进行到仓跟踪与 10 天 Case 差异核对。
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isSuccess && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              取消
            </button>

            <button
              onClick={handleConfirmSync}
              disabled={selectedShipmentIds.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>
                {syncMode === 'create_direct'
                  ? `确认提取并同步 (${selectedShipmentIds.length} 票)`
                  : `导出预填模板 (${selectedShipmentIds.length} 票)`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
