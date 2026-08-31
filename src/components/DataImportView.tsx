import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Download,
  Boxes,
  Truck,
  Check,
} from 'lucide-react';
import { parseExcelOrCsv, downloadTemplateExcel } from '../utils/excelParser';
import { ImportPreviewResult, Shipment, InventoryItem } from '../types';

interface DataImportViewProps {
  existingShipments: Shipment[];
  existingInventory: InventoryItem[];
  onExecuteImport: (result: ImportPreviewResult) => void;
  onDone: () => void;
  onResetDemo?: () => void;
  onClearAllData?: () => void;
}

export const DataImportView: React.FC<DataImportViewProps> = ({
  existingShipments,
  existingInventory,
  onExecuteImport,
  onDone,
  onResetDemo,
  onClearAllData,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await parseExcelOrCsv(selectedFile, existingShipments, existingInventory);
      setPreviewResult(result);
      setCurrentStep(2);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '文件解析失败，请检查文件格式是否为标准 Excel (.xlsx/.xls) 或 CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleMappingFieldChange = (fileHeader: string, targetField: string) => {
    if (!previewResult) return;
    const updatedMapping = { ...previewResult.columnMapping, [fileHeader]: targetField };
    setPreviewResult({
      ...previewResult,
      columnMapping: updatedMapping,
    });
  };

  const handleConfirmImport = () => {
    if (!previewResult) return;
    onExecuteImport(previewResult);
    onDone();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Walmart 数据导入与智能映射中心
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            支持 Walmart Seller Center 导出的货件、收货与库存报表，自动识别字段并执行数据校验
          </p>
        </div>

        <button
          onClick={() => downloadTemplateExcel()}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          下载标准导入模板 (Template.xlsx)
        </button>
      </div>

      {/* 3 Step Indicator */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            1
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">上传 Walmart 报表</div>
            <div className="text-[11px] text-slate-400">Excel / CSV 拖拽解析</div>
          </div>
        </div>

        <div className="w-12 h-0.5 bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            2
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">智能字段映射确认</div>
            <div className="text-[11px] text-slate-400">自动对齐系统标准字段</div>
          </div>
        </div>

        <div className="w-12 h-0.5 bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            3
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">校验预览与写入</div>
            <div className="text-[11px] text-slate-400">异常侦测与数据合并</div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Upload Dropzone */}
      {currentStep === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div>
              <div className="text-sm font-bold text-slate-800">
                点击选择文件 或 将报表拖拽至此处
              </div>
              <p className="text-xs text-slate-500 mt-1">
                支持 .xlsx / .xls / .csv 格式（包含 Walmart Inbound / Receiving / Inventory Reports）
              </p>
            </div>

            {isLoading && (
              <div className="text-xs text-blue-600 font-semibold flex items-center gap-2 mt-2">
                <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                正在深度解析文件结构与字段...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                入库发货报表 (Inbound)
              </div>
              <p className="text-[11px] text-slate-500">
                导入发运单号、SKU、发货件数、总箱数、预计到仓 ETA 与物流承运商
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                收货差异报表 (Receiving)
              </div>
              <p className="text-[11px] text-slate-500">
                更新 FC 实际到仓日期、实际接收数量、接收箱数与自动计算 10 天 Case 倒计时
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                当前库存报表 (Inventory)
              </div>
              <p className="text-[11px] text-slate-500">
                同步更新 Walmart Available 现货与 Reserved 预留库存
              </p>
            </div>
          </div>

          {/* Quick Demo Reference Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-50/80 via-blue-50/50 to-slate-50 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800">想要快速体验系统全生命周期？</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  一键注入包含 8 票经典场景的参考数据，体验完毕可随时一键清空并导入您的真实报表。
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onResetDemo && (
                <button
                  type="button"
                  onClick={onResetDemo}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  运行参考数据
                </button>
              )}
              {onClearAllData && (
                <button
                  type="button"
                  onClick={onClearAllData}
                  className="px-3 py-1.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 font-medium rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  清空数据
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Smart Column Mapping */}
      {currentStep === 2 && previewResult && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                识别报表类型: {previewResult.reportType}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                已识别 {previewResult.rawHeaders.length} 个文件表头字段，请核对与系统标准字段的映射关系
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
              文件: {file?.name} ({previewResult.totalRows} 行)
            </span>
          </div>

          {/* Mapping Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">文件原始表头 (Source Column)</th>
                  <th className="p-3 text-center">映射状态</th>
                  <th className="p-3">系统标准字段 (Target System Field)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {previewResult.rawHeaders.map((header) => {
                  const mapped = previewResult.columnMapping[header];
                  return (
                    <tr key={header} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800 font-mono">{header}</td>
                      <td className="p-3 text-center">
                        {mapped ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1 w-fit mx-auto">
                            <Check className="w-3 h-3" /> 已自动匹配
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                            未匹配/忽略
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <select
                          value={mapped || ''}
                          onChange={(e) => handleMappingFieldChange(header, e.target.value)}
                          className="w-full max-w-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">-- 忽略该字段 (Ignore) --</option>
                          <option value="id">货件编号 (Shipment ID)</option>
                          <option value="shipmentName">货件名称 (Shipment Name)</option>
                          <option value="sku">商品 SKU</option>
                          <option value="itemId">Item ID</option>
                          <option value="gtin">GTIN / UPC</option>
                          <option value="productName">产品名称 (Product Name)</option>
                          <option value="productType">产品类型 (Product Type)</option>
                          <option value="shipQty">发货数量 (Ship Qty)</option>
                          <option value="cartons">总箱数 (Cartons)</option>
                          <option value="qtyPerCarton">每箱数量 (Qty/Carton)</option>
                          <option value="shipDate">发货日期 (Ship Date)</option>
                          <option value="eta">预计到仓日期 (ETA)</option>
                          <option value="arrivalDate">实际到仓日期 (Arrival Date)</option>
                          <option value="fc">目标仓库 (FC)</option>
                          <option value="tracking">物流追踪号 (Tracking)</option>
                          <option value="carrier">承运商 (Carrier)</option>
                          <option value="receivedQty">Walmart 接收数量 (Received Qty)</option>
                          <option value="receivedCartons">接收箱数 (Received Cartons)</option>
                          <option value="available">可用现货库存 (Available)</option>
                          <option value="reserved">预留库存 (Reserved)</option>
                          <option value="notes">备注说明 (Notes)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              重新选择文件
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              下一步：预览校验数据
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validation & Execution */}
      {currentStep === 3 && previewResult && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              导入数据深度校验与合并预览
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              系统将根据货件编号与 SKU 自动识别新增货件与已存在货件的状态合并更新
            </p>
          </div>

          {/* Metric Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500">报表总解析行数</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {previewResult.totalRows} 行
              </div>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
              <div className="text-[11px] text-emerald-800">拟新增货件 (New)</div>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                {previewResult.newShipments.length} 票
              </div>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
              <div className="text-[11px] text-blue-800">拟更新货件 (Update)</div>
              <div className="text-lg font-bold font-mono text-blue-700 mt-1">
                {previewResult.updatedShipments.length} 票
              </div>
            </div>

            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <div className="text-[11px] text-amber-800">待同步库存 SKU</div>
              <div className="text-lg font-bold font-mono text-amber-700 mt-1">
                {previewResult.updatedInventory.length} 个
              </div>
            </div>
          </div>

          {/* Detected Anomalies */}
          {previewResult.anomalies.length > 0 && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                发现 {previewResult.anomalies.length} 项数据逻辑异常或提示:
              </div>
              <div className="space-y-1 text-xs">
                {previewResult.anomalies.slice(0, 5).map((a, i) => (
                  <div key={i} className="text-amber-800 flex items-start gap-2">
                    <span className="font-mono font-semibold">[{a.type}]</span>
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Rows Preview */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
              拟入库货件数据预览 (前 5 票)
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">货件编号</th>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5 text-right">发货数</th>
                    <th className="p-2.5 text-right">接收数</th>
                    <th className="p-2.5 text-right">差异</th>
                    <th className="p-2.5">到仓日期</th>
                    <th className="p-2.5 text-center">状态计算</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[...previewResult.newShipments, ...previewResult.updatedShipments]
                    .slice(0, 5)
                    .map((shp) => (
                      <tr key={shp.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-blue-600">{shp.id}</td>
                        <td className="p-2.5 font-mono">{shp.items?.[0]?.sku || '—'}</td>
                        <td className="p-2.5 text-right font-mono font-semibold">
                          {shp.totalShipQty}
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-600 font-bold">
                          {shp.totalReceivedQty}
                        </td>
                        <td
                          className={`p-2.5 text-right font-mono font-bold ${
                            shp.totalDiscrepancyQty > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {shp.totalDiscrepancyQty > 0 ? `-${shp.totalDiscrepancyQty}` : '0'}
                        </td>
                        <td className="p-2.5 font-mono">{shp.arrivalDate || '在途/未到仓'}</td>
                        <td className="p-2.5 text-center font-medium text-slate-700">
                          {shp.status}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回调整映射
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              确认导入并写入系统数据库
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
