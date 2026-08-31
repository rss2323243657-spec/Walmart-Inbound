import * as XLSX from 'xlsx';
import { Shipment, CaseRecord, InventoryItem, InventoryLedgerEntry, AnomalyItem } from '../types';

export function exportShipmentsToExcel(shipments: Shipment[], filename: string = 'Walmart_Shipments_Export') {
  const flatData: any[] = shipments.flatMap((s) => {
    if (s.items && s.items.length > 0) {
      return s.items.map((it) => ({
        'Shipment ID (货件编号)': s.id,
        'Shipment Name (货件名称)': s.shipmentName,
        'SKU (卖家SKU)': it.sku,
        'Item ID': it.itemId || '',
        'GTIN': it.gtin || '',
        'Product Name (产品名称)': it.productName,
        'Product Type (产品类型)': it.productType || '',
        'Ship Qty (发货数量)': it.shipQty,
        'Total Cartons (总箱数)': it.cartons,
        'Qty/Carton (每箱数量)': it.qtyPerCarton,
        'Received Qty (Walmart接收数量)': it.receivedQty,
        'Received Cartons (接收箱数)': it.receivedCartons ?? it.cartons,
        'Discrepancy Qty (差异数量)': it.discrepancyQty,
        'Ship Date (发货日期)': s.shipDate,
        'ETA (预计到仓)': s.eta || '',
        'Arrival Date (实际到仓日期)': s.arrivalDate || '',
        'Days Since Arrival (已到仓天数)': s.daysSinceArrival ?? '',
        'Case Eligible Date (Case可开日期)': s.caseEligibleDate || '',
        'Days Until Case (距Case天数)': s.daysUntilCase ?? '',
        'FC (仓库)': s.fc,
        'Tracking (运单号)': s.tracking || '',
        'Carrier (承运商)': s.carrier || '',
        'Shipment Status (货件状态)': s.status,
        'Case ID': s.caseId || '',
        'Case Status (Case状态)': s.caseStatus,
        'Notes (备注)': s.notes || '',
        'Data Source (数据来源)': s.source,
      }));
    }
    return [
      {
        'Shipment ID (货件编号)': s.id,
        'Shipment Name (货件名称)': s.shipmentName,
        'SKU (卖家SKU)': '',
        'Item ID': '',
        'GTIN': '',
        'Product Name (产品名称)': '',
        'Product Type (产品类型)': '',
        'Ship Qty (发货数量)': s.totalShipQty,
        'Total Cartons (总箱数)': s.totalCartons,
        'Qty/Carton (每箱数量)': 0,
        'Received Qty (Walmart接收数量)': s.totalReceivedQty,
        'Received Cartons (接收箱数)': s.totalReceivedCartons,
        'Discrepancy Qty (差异数量)': s.totalDiscrepancyQty,
        'Ship Date (发货日期)': s.shipDate,
        'ETA (预计到仓)': s.eta || '',
        'Arrival Date (实际到仓日期)': s.arrivalDate || '',
        'Days Since Arrival (已到仓天数)': s.daysSinceArrival ?? '',
        'Case Eligible Date (Case可开日期)': s.caseEligibleDate || '',
        'Days Until Case (距Case天数)': s.daysUntilCase ?? '',
        'FC (仓库)': s.fc,
        'Tracking (运单号)': s.tracking || '',
        'Carrier (承运商)': s.carrier || '',
        'Shipment Status (货件状态)': s.status,
        'Case ID': s.caseId || '',
        'Case Status (Case状态)': s.caseStatus,
        'Notes (备注)': s.notes || '',
        'Data Source (数据来源)': s.source,
      },
    ];
  });

  const ws = XLSX.utils.json_to_sheet(flatData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Shipments');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportDiscrepanciesToExcel(shipments: Shipment[], filename: string = 'Walmart_Discrepancies_Export') {
  const discrepancyShipments = shipments.filter((s) => s.totalDiscrepancyQty > 0);
  exportShipmentsToExcel(discrepancyShipments, filename);
}

export function exportCasesToExcel(cases: CaseRecord[], filename: string = 'Walmart_Cases_Export') {
  const flatData = cases.map((c) => ({
    'Case ID': c.id,
    'Shipment ID': c.shipmentId,
    'SKU': c.sku,
    'Item ID': c.itemId || '',
    'Product Name': c.productName,
    'Ship Qty': c.shipQty,
    'Received Qty': c.receivedQty,
    'Discrepancy Qty (索赔件数)': c.discrepancyQty,
    'Actual Arrival Date (实际到仓)': c.arrivalDate,
    '10-Day Eligible Date (达到条件日期)': c.eligibleDate,
    'Case Open Date (提交日期)': c.caseOpenDate || '',
    'Case Status (当前状态)': c.status,
    'Walmart Response (Walmart反馈)': c.walmartResponse || '',
    'Resolution Qty (已补录/赔偿数量)': c.resolutionQty || 0,
    'Final Difference (最终未结差异)': c.finalDifference ?? c.discrepancyQty,
    'Closed Date (结案日期)': c.closedDate || '',
    'Notes (备注)': c.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(flatData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cases');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportInventoryToExcel(inventory: InventoryItem[], filename: string = 'Walmart_Inventory_Export') {
  const flatData = inventory.map((inv) => ({
    'SKU': inv.sku,
    'Item ID': inv.itemId || '',
    'GTIN': inv.gtin || '',
    'Product Name': inv.productName,
    'Product Type': inv.productType || '',
    'Available Inventory (可用库存)': inv.available,
    'Reserved Inventory (预留库存)': inv.reserved,
    'Inbound (在途库存)': inv.inbound,
    'Receiving (接收中库存)': inv.receiving,
    'Projected Inventory (预计可用总库存)': inv.totalProjected,
    'Safety Stock (安全库存)': inv.safetyStock,
    'Min Stock (最低库存)': inv.minStock ?? 0,
    'Target Stock (目标库存)': inv.targetStock ?? 0,
    '30 Days Sales (近30天销量)': inv.sales30Days ?? '暂无数据',
    'Daily Avg Sales (日均销量)': inv.dailyAvgSales ?? '无法计算',
    'Days of Supply (可售天数)': inv.daysOfSupply ?? '无法计算',
    'Last Updated': inv.lastUpdated,
    'Data Source': inv.source,
  }));

  const ws = XLSX.utils.json_to_sheet(flatData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportLedgerToExcel(ledger: InventoryLedgerEntry[], filename: string = 'Walmart_Inventory_Ledger_Export') {
  const flatData = ledger.map((l) => ({
    'Ledger ID': l.id,
    'Date (日期)': l.date,
    'SKU': l.sku,
    'Product Name': l.productName || '',
    'Before Qty (变动前)': l.beforeQty,
    'Change Qty (变动数量)': typeof l.changeQty === 'number' && l.changeQty > 0 ? `+${l.changeQty}` : l.changeQty,
    'After Qty (变动后)': l.afterQty,
    'Change Type (变动类型)': l.changeType,
    'Reference (关联单号/货件)': l.reference,
    'Data Source (数据来源)': l.source,
    'Notes (备注)': l.notes || '',
    'Timestamp (发生时间)': l.timestamp,
  }));

  const ws = XLSX.utils.json_to_sheet(flatData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory_Ledger');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAnomaliesToExcel(anomalies: AnomalyItem[], filename: string = 'Walmart_Data_Anomalies_Export') {
  const flatData = anomalies.map((a) => ({
    'Anomaly ID': a.id,
    'Severity (等级)': a.level.toUpperCase(),
    'Type (异常类型)': a.type,
    'Title (标题)': a.title || a.message || '',
    'Description (详情)': a.description || a.message || '',
    'Reference ID (关联对象)': a.referenceId || a.shipmentId || '',
    'Reference Type': a.referenceType || 'Shipment',
    'Detected At (检出时间)': a.detectedAt || '',
  }));

  const ws = XLSX.utils.json_to_sheet(flatData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data_Quality');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
