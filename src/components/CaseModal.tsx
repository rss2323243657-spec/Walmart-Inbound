import React, { useState } from 'react';
import {
  X,
  FileCheck,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { Shipment, CaseRecord, CaseStatus } from '../types';
import { getTodayString } from '../utils/dateUtils';

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment | null;
  existingCase?: CaseRecord | null;
  onSaveCase: (caseRecord: CaseRecord) => void;
}

export const CaseModal: React.FC<CaseModalProps> = ({
  isOpen,
  onClose,
  shipment,
  existingCase,
  onSaveCase,
}) => {
  if (!isOpen || !shipment) return null;

  const firstItem = shipment.items?.[0];
  const defaultDiscrepancy = shipment.totalDiscrepancyQty || 0;

  const [caseId, setCaseId] = useState(
    existingCase?.id ||
      shipment.caseId ||
      `WMT-CASE-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`
  );
  const [sku, setSku] = useState(existingCase?.sku || firstItem?.sku || '');
  const [status, setStatus] = useState<CaseStatus>(
    existingCase?.status || (shipment.caseStatus !== 'Not Eligible' ? shipment.caseStatus : 'Opened')
  );
  const [caseOpenDate, setCaseOpenDate] = useState(
    existingCase?.caseOpenDate || getTodayString()
  );
  const [walmartResponse, setWalmartResponse] = useState(
    existingCase?.walmartResponse || ''
  );
  const [resolutionQty, setResolutionQty] = useState<number>(
    existingCase?.resolutionQty || 0
  );
  const [closedDate, setClosedDate] = useState(existingCase?.closedDate || '');
  const [notes, setNotes] = useState(existingCase?.notes || '');

  const finalDiff = Math.max(0, defaultDiscrepancy - resolutionQty);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const record: CaseRecord = {
      id: caseId.trim(),
      shipmentId: shipment.id,
      sku: sku || 'MULTI-SKU',
      itemId: firstItem?.itemId,
      productName: firstItem?.productName || shipment.shipmentName,
      discrepancyQty: defaultDiscrepancy,
      shipQty: shipment.totalShipQty,
      receivedQty: shipment.totalReceivedQty,
      arrivalDate: shipment.arrivalDate || '',
      eligibleDate: shipment.caseEligibleDate || '',
      caseOpenDate,
      status,
      walmartResponse: walmartResponse.trim() || undefined,
      resolutionQty,
      finalDifference: finalDiff,
      closedDate: status === 'Resolved' || status === 'Closed' ? closedDate || getTodayString() : undefined,
      notes: notes.trim() || undefined,
      createdAt: existingCase?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveCase(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCheck className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-sm">
              {existingCase ? '更新 Walmart Case 处理进展' : '开立 / 登记 Walmart 差异 Case'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Shipment Reference Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                关联货件:{' '}
                <strong className="font-mono text-slate-900">{shipment.id}</strong>
              </span>
              <span className="text-slate-500">
                目标FC: <strong className="text-slate-800">{shipment.fc}</strong>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>
                实际到仓日期:{' '}
                <strong className="font-mono text-slate-800">
                  {shipment.arrivalDate || '未到仓'}
                </strong>
              </span>
              <span>
                短少差异件数:{' '}
                <strong className="font-mono text-red-600 font-bold">
                  {defaultDiscrepancy} 件
                </strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Case 编号 (Case ID) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="例如: WMT-CASE-98124"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Case 处理状态 (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CaseStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Eligible">Eligible (可以开Case / 待提交)</option>
                <option value="Opened">Opened (已提交至Walmart后台)</option>
                <option value="In Review">In Review (Walmart调查审核中)</option>
                <option value="Partially Resolved">Partially Resolved (部分解决/补收)</option>
                <option value="Resolved">Resolved (已全额补录/赔偿结案)</option>
                <option value="Rejected">Rejected (被Walmart驳回拒绝)</option>
                <option value="Closed">Closed (已关闭归档)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">提交开Case日期</label>
              <input
                type="date"
                value={caseOpenDate}
                onChange={(e) => setCaseOpenDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Walmart 已补收/赔偿件数
              </label>
              <input
                type="number"
                min="0"
                max={defaultDiscrepancy}
                value={resolutionQty}
                onChange={(e) => setResolutionQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-600 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Final difference indicator */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">最终未结案差异件数:</span>
            <span className="font-mono font-bold text-slate-900">
              {finalDiff === 0 ? (
                <span className="text-emerald-600">已完全闭环 (0 件)</span>
              ) : (
                <span className="text-red-600">剩余 {finalDiff} 件待解决</span>
              )}
            </span>
          </div>

          <div>
            <label className="block text-slate-700 font-medium text-xs mb-1">
              Walmart 官方客服反馈记录 (Walmart Response)
            </label>
            <textarea
              rows={2}
              value={walmartResponse}
              onChange={(e) => setWalmartResponse(e.target.value)}
              placeholder="例如: Support team is investigating with FC dock lead; POD requested..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium text-xs mb-1">内部处理备注 (Notes)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如: 已提供清关提货POD文件，第2次跟进..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Footer */}
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
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              保存 Case 状态
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
