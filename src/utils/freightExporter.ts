import * as XLSX from 'xlsx';
import { MonthlyFreightSummary, FreightShippingItem } from '../types';

export function exportFreightSummaryToExcel(
  monthlySummaries: MonthlyFreightSummary[],
  freightItems: FreightShippingItem[],
  selectedMonth?: string
) {
  const wb = XLSX.utils.book_new();

  // Filter if selectedMonth is given
  const activeSummaries = selectedMonth && selectedMonth !== 'all'
    ? monthlySummaries.filter((m) => m.monthKey === selectedMonth)
    : monthlySummaries;

  // Sheet 1: 月度头程费用总表
  const monthSummaryRows = activeSummaries.map((m) => ({
    '月份 (Month)': m.monthDisplay,
    '发货票数 (Shipments)': m.shipmentCount,
    '总出货件数 (Units)': m.totalUnits,
    '总出货箱数 (Cartons)': m.totalCartons,
    '预估计费总重kg (Est Chargeable Weight)': Number(m.totalEstimatedChargeableWeight.toFixed(2)),
    '预估头程总费用元 (Est Total Cost)': Number(m.totalEstimatedCost.toFixed(2)),
    '实际收费总重kg (Actual Chargeable Weight)': m.totalActualChargeableWeight > 0 ? Number(m.totalActualChargeableWeight.toFixed(2)) : '未录入',
    '实际头程总费用元 (Actual Total Cost)': m.totalActualCost > 0 ? Number(m.totalActualCost.toFixed(2)) : '未录入',
    '费用差额元 (Actual - Est)': m.totalActualCost > 0 ? Number(m.costDifference.toFixed(2)) : '--',
    '费用差异比例 (Variance %)': m.totalActualCost > 0 ? `${m.costDifferencePercent.toFixed(2)}%` : '--',
    '对账状态 (Reconciliation)': m.unreconciledShipmentCount === 0 ? '已全部对账' : `待对账 ${m.unreconciledShipmentCount} 票`,
  }));

  const ws1 = XLSX.utils.json_to_sheet(monthSummaryRows);
  ws1['!cols'] = [
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 24 },
    { wch: 26 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '月度汇总总表');

  // Sheet 2: 货件明细汇总与对账
  const shipmentRows: any[] = [];
  activeSummaries.forEach((m) => {
    m.shipments.forEach((s) => {
      shipmentRows.push({
        '所属月份 (Month)': m.monthDisplay,
        '货件编号 (Shipment ID)': s.shipmentId,
        '目的仓库 (FC)': s.warehouse,
        '发货日期 (Ship Date)': s.shipDate,
        '渠道 (Channel)': s.items[0]?.channel || '',
        'SKU数量 (SKUs)': s.items.length,
        '出货总件数 (Units)': s.totalUnits,
        '总箱数 (Cartons)': s.totalCartons,
        '单箱实重合计 (kg)': Number(s.totalActualWeight.toFixed(2)),
        '单箱体积重合计 (kg)': Number(s.totalVolumetricWeight.toFixed(2)),
        '预估计费总重 (kg)': Number(s.totalEstimatedChargeableWeight.toFixed(2)),
        '计费重保底判断 (12kg保底)': s.appliedMinimumRule ? '已触发单箱12kg保底' : '正常计重',
        '预估运费金额 (元)': Number(s.estimatedFreightCost.toFixed(2)),
        '报关费 (元)': s.customsFee,
        '报关方式 (Customs)': s.isMergedCustoms ? '合并报关 (175元)' : '独立报关 (350元)',
        '预估头程总费用 (元)': Number(s.totalEstimatedCost.toFixed(2)),
        '实际收费重 (kg 对账)': s.actualChargeableWeight !== undefined ? s.actualChargeableWeight : '',
        '实际费用 (元 对账)': s.actualCost !== undefined ? s.actualCost : '',
        '费用差额 (元)': s.costDifference !== undefined ? Number(s.costDifference.toFixed(2)) : '',
        '差额比例 (%)': s.costDifferencePercent !== undefined ? `${s.costDifferencePercent.toFixed(2)}%` : '',
        '对账状态': s.isReconciled ? '已对账' : '待录入实际费用',
        '对账备注 (Notes)': s.reconciliationNotes || '',
      });
    });
  });

  const ws2 = XLSX.utils.json_to_sheet(shipmentRows);
  ws2['!cols'] = [
    { wch: 14 },
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '货件维度明细与对账');

  // Sheet 3: 商品 SKU 头程明细表
  const activeItems = selectedMonth && selectedMonth !== 'all'
    ? freightItems.filter((it) => it.monthKey === selectedMonth)
    : freightItems;

  const itemRows = activeItems.map((it) => ({
    '计入月份': it.monthKey,
    '货件编号 (Shipment ID)': it.shipmentId,
    '目的仓库 (Warehouse)': it.warehouse,
    '发货日期 (Ship Date)': it.shipDate,
    '商品SKU (Seller SKU)': it.sku,
    '标题品名 (Title)': it.productName,
    '实际出货数量 (Units)': it.actualQty,
    '对应件数 (Cartons)': it.boxCount,
    '单箱实重 (kg)': it.boxWeight,
    '箱规长*宽*高 (cm)': it.dimensionsText,
    '单箱体积重 (kg)': it.volumetricWeightPerBox,
    '单箱计费重 (kg)': it.chargeableWeightPerBox,
    '计重规则': it.chargeableType === 'MIN_12KG'
      ? '单箱<12kg 保底计12kg'
      : it.chargeableType === 'VOLUMETRIC'
      ? '体积重大于实重'
      : '按实重计费',
    '该项总计费重 (kg)': it.totalChargeableWeight,
    '渠道 (Channel)': it.channel,
    '单价 (元/kg)': it.unitPrice,
    '是否合并报关': it.isMergedCustoms ? '是 (175元/票)' : '否 (350元/票)',
    '混箱组 (Mixed Box)': it.mixedBoxGroup || '整箱',
    '该项预估运费 (元)': it.estimatedItemFreight,
    '备注 (Notes)': it.notes || '',
  }));

  const ws3 = XLSX.utils.json_to_sheet(itemRows);
  ws3['!cols'] = [
    { wch: 12 },
    { wch: 18 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, '出货商品SKU明细');

  const fileName = `Walmart_FirstLeg_Freight_Summary_${selectedMonth || 'All'}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
