import React from 'react';
import {
  Sparkles,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Boxes,
  Truck,
  ShieldAlert,
} from 'lucide-react';

export type DataActionType = 'load-demo' | 'clear-all' | null;

interface DataActionModalProps {
  actionType: DataActionType;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DataActionModal: React.FC<DataActionModalProps> = ({
  actionType,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !actionType) return null;

  const isLoadDemo = actionType === 'load-demo';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`p-5 flex items-center justify-between border-b ${
            isLoadDemo
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
              : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
                isLoadDemo ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {isLoadDemo ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isLoadDemo ? '运行 / 加载参考数据' : '清除全部业务数据'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLoadDemo
                  ? '一键注入标准沃尔玛业务模拟数据'
                  : '清空当前所有货件、库存与工单记录'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {isLoadDemo ? (
            <>
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-900 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  加载后您将立即体验 8 大经典业务场景：
                </div>
                <ul className="text-[11px] text-blue-800/90 space-y-1 pl-5 list-disc">
                  <li>
                    <strong>真实沃尔玛 Shipment ID</strong>：如 9741694WFA、8839201KDL 等
                  </li>
                  <li>
                    <strong>收货差异与 10 天 Case</strong>：涵盖到仓3天、到仓10天立案、严重超期等
                  </li>
                  <li>
                    <strong>多品类库存与流水</strong>：宠物、厨房、数码、户外商品及可用/在途/接收量
                  </li>
                  <li>
                    <strong>数据质量中心</strong>：自动检验负库存、无到仓日差异等异常
                  </li>
                </ul>
              </div>
              <p className="text-slate-600 leading-relaxed">
                提示：若当前已有您手动录入或导入的数据，加载参考数据将重置并覆盖为标准演示环境。
              </p>
            </>
          ) : (
            <>
              <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-red-900 space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  请确认清空操作（不可逆）：
                </div>
                <p className="text-[11px] text-red-700 leading-relaxed">
                  此操作将彻底清除浏览器中的所有 <strong>货件数据</strong>、<strong>商品库存</strong>、<strong>Case 索赔工单</strong>、<strong>流水账本</strong> 以及 <strong>审计日志</strong>。
                </p>
              </div>
              <p className="text-slate-600 leading-relaxed">
                清空后系统将恢复为<strong>空白就绪状态</strong>，方便您直接上传自己的真实 Walmart 报表（Excel / CSV）或手动新增货件。
              </p>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            取消
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 ${
              isLoadDemo
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
            }`}
          >
            {isLoadDemo ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                确认加载参考数据
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                确认清空所有数据
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
