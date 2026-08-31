import * as XLSX from 'xlsx';
import { Shipment, InventoryItem, ImportPreviewResult, FreightShippingItem } from '../types';
import { calculateShipmentMetrics } from './statusCalculator';
import { calculateItemFreightMetrics, parseDimensions, extractMonthKey } from './freightCalculator';

export interface ColumnMapping {
  fileColumn: string;
  systemField: string;
  confidence: number;
}

export const SYSTEM_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'shipmentId', label: '货件编号 (Shipment ID)', required: true },
  { key: 'sku', label: '商品SKU (Seller SKU)', required: true },
  { key: 'shipQty', label: '发货数量 (Ship Qty)', required: true },
  { key: 'receivedQty', label: 'Walmart接收数量 (Received Qty)' },
  { key: 'shipmentName', label: '货件名称 (Shipment Name)' },
  { key: 'itemId', label: 'Walmart Item ID' },
  { key: 'gtin', label: 'GTIN / UPC' },
  { key: 'productName', label: '产品名称 (Product Name)' },
  { key: 'productType', label: '产品类型 (Category)' },
  { key: 'cartons', label: '总箱数 (Total Cartons)' },
  { key: 'receivedCartons', label: '接收箱数 (Received Cartons)' },
  { key: 'qtyPerCarton', label: '每箱数量 (Qty/Carton)' },
  { key: 'shipDate', label: '发货日期 (Ship Date)' },
  { key: 'eta', label: '预计到仓日期 (ETA)' },
  { key: 'arrivalDate', label: '实际到仓日期 (Arrival Date)' },
  { key: 'fc', label: 'Walmart FC 仓库' },
  { key: 'tracking', label: '物流单号 (Tracking #)' },
  { key: 'carrier', label: '承运商 (Carrier)' },
  { key: 'available', label: '当前可用库存 (Available)' },
  { key: 'inbound', label: '在途库存 (Inbound)' },
  { key: 'receiving', label: '接收中库存 (Receiving)' },
  { key: 'reserved', label: '预留库存 (Reserved)' },
];

const SYNONYMS: Record<string, string[]> = {
  shipmentId: [
    'shipment id',
    'shipment_id',
    'inbound shipment id',
    'inbound_shipment_id',
    'inbound order id',
    'inbound_order_id',
    'shipment number',
    'shipment #',
    'po number',
    'po #',
    'order id',
    'shipment',
    '货件编号',
    '货件id',
    '货件单号',
    '入库单号',
    '沃尔玛货件号',
  ],
  sku: [
    'sku',
    'seller sku',
    'seller_sku',
    'item sku',
    'item_sku',
    'sku id',
    'skuid',
    'merchant sku',
    'vendor sku',
    'product sku',
    '卖家sku',
    '商品编码',
    '商品sku',
  ],
  shipQty: [
    'ship qty',
    'ship_qty',
    'shipped qty',
    'shipped quantity',
    'units shipped',
    'quantity shipped',
    'ship quantity',
    'qty shipped',
    'send qty',
    'send quantity',
    'expected units',
    'expected qty',
    '发货数量',
    '出货数量',
    '发货件数',
    '申报数量',
    '预计发货量',
  ],
  receivedQty: [
    'received qty',
    'received_qty',
    'units received',
    'quantity received',
    'received quantity',
    'qty received',
    'actual received',
    'actual units',
    'walmart received qty',
    '接收数量',
    '到货数量',
    '签收数量',
    '实收数量',
  ],
  shipmentName: [
    'shipment name',
    'shipment_name',
    'name',
    'batch name',
    '货件名称',
    '货件备注',
    '批次名称',
  ],
  itemId: [
    'item id',
    'item_id',
    'itemid',
    'walmart item id',
    'walmart_item_id',
    'wpid',
    'item #',
    '沃尔玛商品id',
    '沃尔玛item id',
  ],
  gtin: ['gtin', 'upc', 'ean', 'isbn', 'barcode', '条形码', '商品条码', 'upc/gtin'],
  productName: [
    'product name',
    'product_name',
    'item name',
    'item title',
    'product title',
    'title',
    'description',
    'item description',
    '产品名称',
    '商品名称',
    '标题',
  ],
  productType: ['product type', 'category', 'item type', 'dept', 'department', '品类', '产品分类', '商品类型'],
  cartons: [
    'cartons',
    'total cartons',
    'boxes',
    'cases',
    'box count',
    'ctn',
    'total boxes',
    'case count',
    'total cases',
    '箱数',
    '总箱数',
    '总件数(箱)',
    '发货箱数',
  ],
  receivedCartons: [
    'received cartons',
    'received boxes',
    'received cases',
    'boxes received',
    'cases received',
    '接收箱数',
    '已收箱数',
    '实收箱数',
  ],
  qtyPerCarton: [
    'qty/carton',
    'qty per carton',
    'units per box',
    'units per carton',
    'units/box',
    'pack size',
    'case pack',
    '每箱数量',
    '单箱规格',
    '装箱量',
  ],
  shipDate: [
    'ship date',
    'ship_date',
    'shipped date',
    'dispatch date',
    'send date',
    'creation date',
    '发货日期',
    '出货日期',
    '创建日期',
  ],
  eta: [
    'eta',
    'estimated delivery',
    'estimated arrival',
    'expected date',
    'est delivery date',
    'expected delivery date',
    '预计到仓日期',
    '预计送达',
    '预计到货时间',
  ],
  arrivalDate: [
    'arrival date',
    'arrival_date',
    'actual arrival',
    'delivered date',
    'actual delivery',
    'delivery date',
    'received date',
    'dock date',
    'checkin date',
    '实际到仓日期',
    '签收日期',
    '到仓日期',
    '入库日期',
  ],
  fc: [
    'fc',
    'fulfillment center',
    'warehouse',
    'destination',
    'destination fc',
    'dc',
    'facility',
    'ship to',
    '目标仓库',
    'fc仓库',
    '配送中心',
    '收货仓库',
  ],
  tracking: [
    'tracking',
    'tracking number',
    'pro number',
    'pro #',
    'bol',
    'bol #',
    'awb',
    'freight tracking',
    '运单号',
    '物流单号',
    '跟踪号',
    '提单号',
  ],
  carrier: [
    'carrier',
    'shipper',
    'trucking company',
    'carrier name',
    'transport provider',
    '承运商',
    '物流商',
    '快递公司',
    '货代公司',
  ],
  available: ['available', 'available inventory', 'on hand', 'available qty', 'sellable qty', '可用库存', '现货库存'],
  inbound: ['inbound', 'inbound qty', 'in-transit', 'inbound inventory', '在途库存'],
  receiving: ['receiving', 'receiving qty', 'in receiving', '待接收库存', '接收中'],
  reserved: ['reserved', 'reserved qty', 'allocated', '预留库存', '锁定库存'],
};

export async function parseExcelOrCsv(
  file: File,
  existingShipments: Shipment[],
  existingInventory: InventoryItem[]
): Promise<ImportPreviewResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (rawJson.length === 0) {
          throw new Error('表格中没有找到有效数据行');
        }

        const rawHeaders = Object.keys(rawJson[0]);
        const { mappings, reportType } = matchColumns(rawHeaders);

        const columnMapping: Record<string, string> = {};
        mappings.forEach((m) => {
          if (m.systemField) {
            columnMapping[m.fileColumn] = m.systemField;
          }
        });

        const newShipments: Shipment[] = [];
        const updatedShipments: Shipment[] = [];
        const updatedInventory: InventoryItem[] = [];
        const anomalies: { type: string; message: string; row: number }[] = [];

        const existingShipmentMap = new Map<string, Shipment>();
        existingShipments.forEach((s) => existingShipmentMap.set(s.id, s));

        const existingInvMap = new Map<string, InventoryItem>();
        existingInventory.forEach((i) => existingInvMap.set(i.sku, i));

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          const mapped: Record<string, any> = {};
          Object.entries(row).forEach(([col, val]) => {
            const field = columnMapping[col];
            if (field) {
              mapped[field] = typeof val === 'string' ? val.trim() : val;
            }
          });

          const shipmentId = mapped.shipmentId || (mapped.sku ? `SHP-IMP-${Date.now()}-${idx}` : '');
          const sku = mapped.sku || '';

          if (!sku && !shipmentId) {
            anomalies.push({
              type: 'Missing Key',
              message: `第 ${rowNum} 行缺少 SKU 和货件编号`,
              row: rowNum,
            });
            return;
          }

          const shipQty = Number(mapped.shipQty) || 0;
          const receivedQty = mapped.receivedQty !== undefined && mapped.receivedQty !== '' ? Number(mapped.receivedQty) : 0;
          const arrivalDate = mapped.arrivalDate || undefined;

          if (shipmentId) {
            const existing = existingShipmentMap.get(shipmentId);
            if (existing) {
              // Update existing shipment
              const updatedItems = [...existing.items];
              const itemIdx = updatedItems.findIndex((it) => it.sku === sku);
              if (itemIdx >= 0) {
                updatedItems[itemIdx] = {
                  ...updatedItems[itemIdx],
                  receivedQty: mapped.receivedQty !== undefined && mapped.receivedQty !== '' ? receivedQty : updatedItems[itemIdx].receivedQty,
                  receivedDate: arrivalDate || updatedItems[itemIdx].receivedDate,
                };
              } else if (sku) {
                updatedItems.push({
                  shipmentId,
                  sku,
                  itemId: mapped.itemId,
                  gtin: mapped.gtin,
                  productName: mapped.productName || sku,
                  productType: mapped.productType,
                  shipQty,
                  cartons: Number(mapped.cartons) || 1,
                  qtyPerCarton: Number(mapped.qtyPerCarton) || shipQty,
                  receivedQty,
                  discrepancyQty: Math.max(0, shipQty - receivedQty),
                  receivedDate: arrivalDate,
                });
              }

              const merged: Shipment = calculateShipmentMetrics({
                ...existing,
                arrivalDate: arrivalDate || existing.arrivalDate,
                fc: mapped.fc || existing.fc,
                tracking: mapped.tracking || existing.tracking,
                carrier: mapped.carrier || existing.carrier,
                items: updatedItems,
                updatedAt: new Date().toISOString(),
                source: 'Walmart Shipment Report',
              });

              updatedShipments.push(merged);
            } else {
              // New shipment
              const newShipment: Shipment = calculateShipmentMetrics({
                id: shipmentId,
                shipmentName: mapped.shipmentName || `Imported ${shipmentId}`,
                shipDate: mapped.shipDate || new Date().toISOString().slice(0, 10),
                eta: mapped.eta,
                arrivalDate,
                fc: mapped.fc || 'PHX1',
                tracking: mapped.tracking,
                carrier: mapped.carrier || 'FedEx Freight',
                status: 'Draft',
                items: [
                  {
                    shipmentId,
                    sku: sku || 'SKU-UNKNOWN',
                    itemId: mapped.itemId,
                    gtin: mapped.gtin,
                    productName: mapped.productName || sku || 'Imported Product',
                    productType: mapped.productType || 'General',
                    shipQty,
                    cartons: Number(mapped.cartons) || 1,
                    qtyPerCarton: Number(mapped.qtyPerCarton) || shipQty,
                    receivedQty,
                    discrepancyQty: Math.max(0, shipQty - receivedQty),
                    receivedDate: arrivalDate,
                  },
                ],
                totalShipQty: shipQty,
                totalReceivedQty: receivedQty,
                totalDiscrepancyQty: Math.max(0, shipQty - receivedQty),
                totalCartons: Number(mapped.cartons) || 1,
                totalReceivedCartons: Number(mapped.receivedCartons) || (receivedQty > 0 ? 1 : 0),
                missingCartons: 0,
                caseStatus: 'Not Eligible',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: 'Walmart Shipment Report',
              });

              newShipments.push(newShipment);
            }
          }

          // Inventory item handling
          if (sku && (mapped.available !== undefined || mapped.reserved !== undefined)) {
            const existingInv = existingInvMap.get(sku);
            const inv: InventoryItem = {
              sku,
              itemId: mapped.itemId || existingInv?.itemId,
              gtin: mapped.gtin || existingInv?.gtin,
              productName: mapped.productName || existingInv?.productName || sku,
              productType: mapped.productType || existingInv?.productType || 'General',
              available: mapped.available !== undefined ? Number(mapped.available) : (existingInv?.available ?? 0),
              reserved: mapped.reserved !== undefined ? Number(mapped.reserved) : (existingInv?.reserved ?? 0),
              inbound: existingInv?.inbound ?? 0,
              receiving: existingInv?.receiving ?? 0,
              totalProjected: (mapped.available !== undefined ? Number(mapped.available) : (existingInv?.available ?? 0)),
              safetyStock: existingInv?.safetyStock ?? 50,
              minStock: existingInv?.minStock ?? 20,
              maxStock: existingInv?.maxStock ?? 300,
              targetStock: existingInv?.targetStock ?? 100,
              lastUpdated: new Date().toISOString().slice(0, 10),
              source: 'Report Import',
            };
            updatedInventory.push(inv);
          }
        });

        resolve({
          reportType,
          rawHeaders,
          columnMapping,
          totalRows: rawJson.length,
          newShipments,
          updatedShipments,
          updatedInventory,
          anomalies,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function matchColumns(headers: string[]): {
  mappings: ColumnMapping[];
  reportType: string;
} {
  const mappings: ColumnMapping[] = [];
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    cleaned: h.trim().toLowerCase().replace(/[_\s-]+/g, ' '),
  }));

  let hasReceivingHints = false;
  let hasShipmentHints = false;
  let hasInventoryHints = false;

  normalizedHeaders.forEach(({ original, cleaned }) => {
    let matchedKey: string | null = null;
    let maxScore = 0;

    for (const [sysKey, synonymList] of Object.entries(SYNONYMS)) {
      for (const syn of synonymList) {
        const synClean = syn.toLowerCase();
        if (cleaned === synClean) {
          matchedKey = sysKey;
          maxScore = 1.0;
          break;
        } else if (cleaned.includes(synClean) || synClean.includes(cleaned)) {
          if (maxScore < 0.7) {
            matchedKey = sysKey;
            maxScore = 0.7;
          }
        }
      }
      if (maxScore === 1.0) break;
    }

    if (matchedKey) {
      mappings.push({
        fileColumn: original,
        systemField: matchedKey,
        confidence: maxScore,
      });

      if (matchedKey === 'receivedQty' || matchedKey === 'arrivalDate') hasReceivingHints = true;
      if (matchedKey === 'shipQty' || matchedKey === 'tracking') hasShipmentHints = true;
      if (matchedKey === 'available' || matchedKey === 'reserved') hasInventoryHints = true;
    } else {
      mappings.push({
        fileColumn: original,
        systemField: '',
        confidence: 0,
      });
    }
  });

  let reportType = 'Walmart Comprehensive Report (Walmart综合报表)';
  if (hasReceivingHints && hasShipmentHints) {
    reportType = 'Walmart Inbound & Receiving Report (综合发运收货报表)';
  } else if (hasReceivingHints) {
    reportType = 'Walmart Receiving Discrepancy Report (Walmart收货差异报表)';
  } else if (hasShipmentHints) {
    reportType = 'Walmart Shipment Inbound Report (Walmart在途发货报表)';
  } else if (hasInventoryHints) {
    reportType = 'Walmart Inventory Ledger Report (Walmart库存台账报表)';
  }

  return { mappings, reportType };
}

export function downloadTemplateExcel() {
  downloadShipmentBatchTemplate('xlsx');
}

export function downloadShipmentBatchTemplate(
  format: 'xlsx' | 'csv' = 'xlsx',
  prefilledShipments?: { shipmentId: string; fc?: string; shipDate?: string }[]
) {
  let sampleHeaders: any[] = [];

  if (prefilledShipments && prefilledShipments.length > 0) {
    sampleHeaders = prefilledShipments.map((s) => ({
      '货件编号 (Shipment ID)': s.shipmentId,
      '发货日期 (Ship Date)': s.shipDate || '2026-08-20',
      '预计到仓 (ETA)': '',
      '实际到仓 (Arrival Date)': '',
      '目标仓库 (FC)': s.fc || 'PHX1',
      '承运商 (Carrier)': '美森快船/UPS',
      '物流单号 (Tracking #)': '',
      '发货总件数 (Ship Qty)': 100,
      '总箱数 (Cartons)': 5,
      '接收数量 (Received Qty)': 0,
      '接收箱数 (Received Cartons)': 0,
      '备注 (Notes)': '由头程出货汇总表同步生成',
    }));
  } else {
    sampleHeaders = [
      {
        '货件编号 (Shipment ID)': '9741694WFA',
        '发货日期 (Ship Date)': '2026-08-20',
        '预计到仓 (ETA)': '2026-08-26',
        '实际到仓 (Arrival Date)': '2026-08-26',
        '目标仓库 (FC)': 'PHX1',
        '承运商 (Carrier)': 'FedEx Freight',
        '物流单号 (Tracking #)': '984201948201',
        '发货总件数 (Ship Qty)': 500,
        '总箱数 (Cartons)': 25,
        '接收数量 (Received Qty)': 480,
        '接收箱数 (Received Cartons)': 24,
        '备注 (Notes)': '首批秋季补货',
      },
      {
        '货件编号 (Shipment ID)': '8839201KDL',
        '发货日期 (Ship Date)': '2026-08-22',
        '预计到仓 (ETA)': '2026-08-28',
        '实际到仓 (Arrival Date)': '',
        '目标仓库 (FC)': 'IND1',
        '承运商 (Carrier)': 'UPS Ground',
        '物流单号 (Tracking #)': '1Z9999999999999999',
        '发货总件数 (Ship Qty)': 350,
        '总箱数 (Cartons)': 20,
        '接收数量 (Received Qty)': 0,
        '接收箱数 (Received Cartons)': 0,
        '备注 (Notes)': '在途中',
      },
    ];
  }

  const ws = XLSX.utils.json_to_sheet(sampleHeaders);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 22 }, // Shipment ID
    { wch: 18 }, // Ship Date
    { wch: 16 }, // ETA
    { wch: 18 }, // Actual Arrival Date
    { wch: 14 }, // FC
    { wch: 16 }, // Carrier
    { wch: 22 }, // Tracking
    { wch: 18 }, // Total Ship Qty
    { wch: 14 }, // Total Cartons
    { wch: 18 }, // Received Qty
    { wch: 16 }, // Received Cartons
    { wch: 28 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Walmart_货件导入模板');

  if (format === 'csv') {
    XLSX.writeFile(wb, 'Walmart_Inbound_Shipment_Upload_Template.csv', { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, 'Walmart_Inbound_Shipment_Upload_Template.xlsx');
  }
}

/**
 * Download product SKU supplement template aligned with Walmart inbound-order-template + Shipment ID
 */
export function downloadShipmentItemTemplate(
  shipmentId: string = '9741694WFA',
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  const sampleHeaders = [
    {
      '货件编号 (Shipment ID)': shipmentId,
      '商品SKU (Seller SKU)': 'WMT-KTC-001',
      '产品名称 (Product Name)': 'Stainless Steel Chef Knife 8 Inch',
      '沃尔玛ID (Walmart Item ID)': '984210041',
      '条码 (GTIN/UPC)': '0085002148201',
      '发货数量 (Ship Qty)': 300,
      '箱数 (Cartons)': 15,
      '每箱数量 (Qty/Carton)': 20,
      '接收数量 (Received Qty)': 280,
      '差异标签 (Discrepancy Tag)': 'FC漏扫/少收',
      '差异说明 (Discrepancy Note)': 'FC拆箱扫描少20件，已发起10天Case核实',
      '重点提醒 (Requires Followup)': '是',
    },
    {
      '货件编号 (Shipment ID)': shipmentId,
      '商品SKU (Seller SKU)': 'WMT-KTC-002',
      '产品名称 (Product Name)': 'Paring Knife Set 3-Piece',
      '沃尔玛ID (Walmart Item ID)': '984210042',
      '条码 (GTIN/UPC)': '0085002148202',
      '发货数量 (Ship Qty)': 200,
      '箱数 (Cartons)': 10,
      '每箱数量 (Qty/Carton)': 20,
      '接收数量 (Received Qty)': 200,
      '差异标签 (Discrepancy Tag)': '核对正常',
      '差异说明 (Discrepancy Note)': '清点无差异',
      '重点提醒 (Requires Followup)': '否',
    },
    {
      '货件编号 (Shipment ID)': '8839201KDL',
      '商品SKU (Seller SKU)': 'KITCH-SIL-6P',
      '产品名称 (Product Name)': 'Heat-Resistant Silicone Cooking Utensils Set',
      '沃尔玛ID (Walmart Item ID)': '612849102',
      '条码 (GTIN/UPC)': '008100523406',
      '发货数量 (Ship Qty)': 100,
      '箱数 (Cartons)': 10,
      '每箱数量 (Qty/Carton)': 10,
      '接收数量 (Received Qty)': 80,
      '差异标签 (Discrepancy Tag)': 'FC漏扫/少收',
      '差异说明 (Discrepancy Note)': 'FC接收80件，待剩余20件清点',
      '重点提醒 (Requires Followup)': '是',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleHeaders);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 30 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'inbound-order-template');

  const fileName = `Walmart_inbound_order_template_${shipmentId || 'Batch'}.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName);
  }
}

/**
 * Download First-Leg Freight Cost Summary Template (头程出货明细与对账模板)
 */
export function downloadFreightTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const sampleHeaders = [
    {
      '货件编号 (Shipment ID)': '6520194CAS',
      '目的仓库 (Warehouse)': 'OAK4',
      '发货时间 (Ship Date)': '2026-07-26',
      '商品SKU (Seller SKU)': 'PET1005-B-M',
      '标题品名 (Title)': 'Pet Ergonomic Mesh Dog Harness (Medium / Blue)',
      '实际出货数量 (Actual Qty)': 40,
      '对应件数 (Cartons)': 1,
      '单箱实重kg (Box Weight)': 13.56,
      '箱规cm长*宽*高 (Dimensions)': '43*25*37',
      '渠道 (Channel)': '美森限时达',
      '单价元/kg (Unit Price)': 13.5,
      '是否合并报关 (Merged Customs 是/否)': '是',
      '混箱组标识 (Mixed Box Group 选填)': 'MIX-01',
      '实际收费重kg (选填 对账)': 103.56,
      '实际费用元 (选填 对账)': 1573.06,
      '对账备注 (Notes)': '混箱1箱+独立箱6箱，核对无误',
    },
    {
      '货件编号 (Shipment ID)': '6520194CAS',
      '目的仓库 (Warehouse)': 'OAK4',
      '发货时间 (Ship Date)': '2026-07-26',
      '商品SKU (Seller SKU)': 'TECH-CAB-09',
      '标题品名 (Title)': 'Braided USB-C Fast Charging Cable',
      '实际出货数量 (Actual Qty)': 80,
      '对应件数 (Cartons)': 1,
      '单箱实重kg (Box Weight)': 13.56,
      '箱规cm长*宽*高 (Dimensions)': '43*25*37',
      '渠道 (Channel)': '美森限时达',
      '单价元/kg (Unit Price)': 13.5,
      '是否合并报关 (Merged Customs 是/否)': '是',
      '混箱组标识 (Mixed Box Group 选填)': 'MIX-01',
      '实际收费重kg (选填 对账)': '',
      '实际费用元 (选填 对账)': '',
      '对账备注 (Notes)': '同MIX-01混箱',
    },
    {
      '货件编号 (Shipment ID)': '6520194CAS',
      '目的仓库 (Warehouse)': 'OAK4',
      '发货时间 (Ship Date)': '2026-07-26',
      '商品SKU (Seller SKU)': 'HOME-ORG-302',
      '标题品名 (Title)': 'Stackable Acrylic Closet Storage Bins 4-Pack',
      '实际出货数量 (Actual Qty)': 120,
      '对应件数 (Cartons)': 6,
      '单箱实重kg (Box Weight)': 15.0,
      '箱规cm长*宽*高 (Dimensions)': '50*40*30',
      '渠道 (Channel)': '美森限时达',
      '单价元/kg (Unit Price)': 13.5,
      '是否合并报关 (Merged Customs 是/否)': '是',
      '混箱组标识 (Mixed Box Group 选填)': '',
      '实际收费重kg (选填 对账)': '',
      '实际费用元 (选填 对账)': '',
      '对账备注 (Notes)': '独立整箱',
    },
    {
      '货件编号 (Shipment ID)': '5410982JFK',
      '目的仓库 (Warehouse)': 'EWR4',
      '发货时间 (Ship Date)': '2026-07-15',
      '商品SKU (Seller SKU)': 'TECH-CAB-09',
      '标题品名 (Title)': 'Braided USB-C Fast Charging Cable',
      '实际出货数量 (Actual Qty)': 300,
      '对应件数 (Cartons)': 15,
      '单箱实重kg (Box Weight)': 8.5,
      '箱规cm长*宽*高 (Dimensions)': '38*28*22',
      '渠道 (Channel)': '空运专线',
      '单价元/kg (Unit Price)': 38.0,
      '是否合并报关 (Merged Customs 是/否)': '否',
      '混箱组标识 (Mixed Box Group 选填)': '',
      '实际收费重kg (选填 对账)': 180.0,
      '实际费用元 (选填 对账)': 7190.0,
      '对账备注 (Notes)': '单箱8.5kg按12kg保底计费，独立报关350元',
    },
    {
      '货件编号 (Shipment ID)': '9741694WFA',
      '目的仓库 (Warehouse)': 'PHX1',
      '发货时间 (Ship Date)': '2026-08-11',
      '商品SKU (Seller SKU)': 'PET1005-B-M',
      '标题品名 (Title)': 'Pet Ergonomic Mesh Dog Harness (Medium / Blue)',
      '实际出货数量 (Actual Qty)': 100,
      '对应件数 (Cartons)': 5,
      '单箱实重kg (Box Weight)': 11.2,
      '箱规cm长*宽*高 (Dimensions)': '45*35*30',
      '渠道 (Channel)': '美森限时达',
      '单价元/kg (Unit Price)': 14.5,
      '是否合并报关 (Merged Customs 是/否)': '是',
      '混箱组标识 (Mixed Box Group 选填)': '',
      '实际收费重kg (选填 对账)': 60.0,
      '实际费用元 (选填 对账)': 1045.0,
      '对账备注 (Notes)': '11.2kg按保底12kg计费，合并报关175元',
    },
    {
      '货件编号 (Shipment ID)': '8839201KDL',
      '目的仓库 (Warehouse)': 'IND1',
      '发货时间 (Ship Date)': '2026-08-23',
      '商品SKU (Seller SKU)': 'KITCH-SIL-6P',
      '标题品名 (Title)': 'Heat-Resistant Silicone Cooking Utensils Set',
      '实际出货数量 (Actual Qty)': 100,
      '对应件数 (Cartons)': 10,
      '单箱实重kg (Box Weight)': 14.0,
      '箱规cm长*宽*高 (Dimensions)': '40*30*35',
      '渠道 (Channel)': '以星快船',
      '单价元/kg (Unit Price)': 12.0,
      '是否合并报关 (Merged Customs 是/否)': '否',
      '混箱组标识 (Mixed Box Group 选填)': '',
      '实际收费重kg (选填 对账)': 148.0,
      '实际费用元 (选填 对账)': 2126.0,
      '对账备注 (Notes)': '实际称重多8kg托盘重',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleHeaders);
  ws['!cols'] = [
    { wch: 22 }, // Shipment ID
    { wch: 14 }, // Warehouse
    { wch: 16 }, // Ship Date
    { wch: 18 }, // Seller SKU
    { wch: 32 }, // Title
    { wch: 16 }, // Actual Qty
    { wch: 14 }, // Cartons
    { wch: 16 }, // Box Weight
    { wch: 20 }, // Dimensions
    { wch: 16 }, // Channel
    { wch: 16 }, // Unit Price
    { wch: 18 }, // Merged Customs
    { wch: 18 }, // Mixed Box Group
    { wch: 18 }, // Actual Weight
    { wch: 16 }, // Actual Cost
    { wch: 28 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '头程出货汇总明细');

  const fileName = `Walmart_FirstLeg_Freight_Template.${format}`;
  if (format === 'csv') {
    XLSX.writeFile(wb, fileName, { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, fileName);
  }
}

export interface BatchShipmentParseResult {
  shipments: Shipment[];
  errors: { row: number; field: string; message: string }[];
  warnings: { row: number; field: string; message: string }[];
  totalRows: number;
  totalShipments: number;
  totalUnits: number;
  totalCartons: number;
}

export async function parseShipmentBatchFile(
  file: File,
  products: { sku: string; productName?: string; itemId?: string; gtin?: string; productType?: string }[] = []
): Promise<BatchShipmentParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('表格为空或没有读取到有效的数据行，请检查文件内容');
        }

        const rawHeaders = Object.keys(rawJson[0]);
        const { mappings } = matchColumns(rawHeaders);
        const columnMap: Record<string, string> = {};
        mappings.forEach((m) => {
          if (m.systemField) {
            columnMap[m.fileColumn] = m.systemField;
          }
        });

        const errors: { row: number; field: string; message: string }[] = [];
        const warnings: { row: number; field: string; message: string }[] = [];

        // Group rows by shipmentId
        const shipmentGroups = new Map<string, { headerInfo: any; items: any[] }>();
        const productMap = new Map<string, any>();
        products.forEach((p) => productMap.set(p.sku.toLowerCase(), p));

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // Excel 1-based row with header
          const mapped: Record<string, any> = {};
          Object.entries(row).forEach(([col, val]) => {
            const field = columnMap[col];
            if (field) {
              mapped[field] = typeof val === 'string' ? val.trim() : val;
            }
          });

          const rawShipmentId = (mapped.shipmentId || '').toString().trim();
          const rawSku = (mapped.sku || '').toString().trim();
          const rawShipQty = Number(mapped.shipQty);

          if (!rawShipmentId && !rawSku) {
            // Entirely empty line
            return;
          }

          if (!rawShipmentId) {
            errors.push({
              row: rowNum,
              field: 'Shipment ID',
              message: `第 ${rowNum} 行缺少货件编号 (Shipment ID)`,
            });
            return;
          }

          if (isNaN(rawShipQty) || rawShipQty <= 0) {
            errors.push({
              row: rowNum,
              field: 'Ship Qty',
              message: `第 ${rowNum} 行发货数量必须为大于 0 的有效数字`,
            });
            return;
          }

          // Date format sanitation
          const shipDate = mapped.shipDate ? String(mapped.shipDate).trim().slice(0, 10) : new Date().toISOString().slice(0, 10);
          const eta = mapped.eta ? String(mapped.eta).trim().slice(0, 10) : undefined;
          const arrivalDate = mapped.arrivalDate ? String(mapped.arrivalDate).trim().slice(0, 10) : undefined;

          if (arrivalDate && !/^\d{4}-\d{2}-\d{2}$/.test(arrivalDate)) {
            warnings.push({
              row: rowNum,
              field: 'Arrival Date',
              message: `第 ${rowNum} 行实际到仓日期格式异常 (${mapped.arrivalDate})，建议为 YYYY-MM-DD`,
            });
          }

          const cartons = Number(mapped.cartons) > 0 ? Number(mapped.cartons) : Math.max(1, Math.ceil(rawShipQty / 20));
          const qtyPerCarton = Number(mapped.qtyPerCarton) > 0 ? Number(mapped.qtyPerCarton) : (cartons > 0 ? Math.round(rawShipQty / cartons) : rawShipQty);
          const receivedQty = Number(mapped.receivedQty) >= 0 ? Number(mapped.receivedQty) : 0;
          const receivedCartons = Number(mapped.receivedCartons) >= 0 ? Number(mapped.receivedCartons) : (receivedQty > 0 ? Math.min(cartons, Math.ceil(receivedQty / (qtyPerCarton || 1))) : 0);

          let itemObj: any = null;
          if (rawSku) {
            const matchedProd = productMap.get(rawSku.toLowerCase());
            const productName = mapped.productName || matchedProd?.productName || rawSku;
            const itemId = mapped.itemId || matchedProd?.itemId || '';
            const gtin = mapped.gtin || matchedProd?.gtin || '';
            const productType = mapped.productType || matchedProd?.productType || 'General';

            itemObj = {
              shipmentId: rawShipmentId,
              sku: rawSku,
              itemId,
              gtin,
              productName,
              productType,
              shipQty: rawShipQty,
              cartons,
              qtyPerCarton,
              receivedQty,
              receivedCartons,
              discrepancyQty: Math.max(0, rawShipQty - receivedQty),
              receivedDate: arrivalDate,
              source: 'Batch Excel Upload',
            };
          }

          if (!shipmentGroups.has(rawShipmentId)) {
            shipmentGroups.set(rawShipmentId, {
              headerInfo: {
                id: rawShipmentId,
                shipmentName: mapped.shipmentName || `Inbound_${rawShipmentId}`,
                shipDate,
                eta,
                arrivalDate: arrivalDate || undefined,
                fc: mapped.fc || 'PHX1',
                tracking: mapped.tracking || '',
                carrier: mapped.carrier || 'UPS Freight',
                notes: mapped.notes || '',
                totalShipQty: rawSku ? 0 : rawShipQty,
                totalCartons: rawSku ? 0 : cartons,
                totalReceivedQty: rawSku ? 0 : receivedQty,
                totalReceivedCartons: rawSku ? 0 : receivedCartons,
              },
              items: itemObj ? [itemObj] : [],
            });
          } else {
            const grp = shipmentGroups.get(rawShipmentId)!;
            // Merge header info if previous was empty
            if (!grp.headerInfo.arrivalDate && arrivalDate) {
              grp.headerInfo.arrivalDate = arrivalDate;
            }
            if (!grp.headerInfo.tracking && mapped.tracking) {
              grp.headerInfo.tracking = mapped.tracking;
            }
            if (!grp.headerInfo.carrier && mapped.carrier) {
              grp.headerInfo.carrier = mapped.carrier;
            }
            if (!grp.headerInfo.fc && mapped.fc) {
              grp.headerInfo.fc = mapped.fc;
            }

            if (!rawSku) {
              // Pure shipment row addition
              grp.headerInfo.totalShipQty = (grp.headerInfo.totalShipQty || 0) + rawShipQty;
              grp.headerInfo.totalCartons = (grp.headerInfo.totalCartons || 0) + cartons;
              grp.headerInfo.totalReceivedQty = (grp.headerInfo.totalReceivedQty || 0) + receivedQty;
              grp.headerInfo.totalReceivedCartons = (grp.headerInfo.totalReceivedCartons || 0) + receivedCartons;
            } else if (itemObj) {
              // Check for duplicate SKU in same shipment
              const existItemIdx = grp.items.findIndex((it) => it.sku.toLowerCase() === rawSku.toLowerCase());
              if (existItemIdx >= 0) {
                // Combine quantities
                grp.items[existItemIdx].shipQty += rawShipQty;
                grp.items[existItemIdx].cartons += cartons;
                grp.items[existItemIdx].receivedQty += receivedQty;
                grp.items[existItemIdx].receivedCartons = (grp.items[existItemIdx].receivedCartons || 0) + receivedCartons;
                grp.items[existItemIdx].discrepancyQty = Math.max(0, grp.items[existItemIdx].shipQty - grp.items[existItemIdx].receivedQty);
                warnings.push({
                  row: rowNum,
                  field: 'Duplicate SKU',
                  message: `第 ${rowNum} 行货件 ${rawShipmentId} 中重复出现 SKU ${rawSku}，已自动累加合并发货数量`,
                });
              } else {
                grp.items.push(itemObj);
              }
            }
          }
        });

        // Convert grouped shipments into full calculated Shipment objects
        const shipments: Shipment[] = [];
        let totalUnits = 0;
        let totalCartons = 0;

        shipmentGroups.forEach(({ headerInfo, items }) => {
          const hasItems = items.length > 0;
          const base: Shipment = {
            id: headerInfo.id,
            shipmentName: headerInfo.shipmentName,
            shipDate: headerInfo.shipDate,
            eta: headerInfo.eta,
            arrivalDate: headerInfo.arrivalDate,
            fc: headerInfo.fc,
            tracking: headerInfo.tracking,
            carrier: headerInfo.carrier,
            status: 'Draft',
            items,
            totalShipQty: hasItems ? items.reduce((s, it) => s + it.shipQty, 0) : headerInfo.totalShipQty || 0,
            totalReceivedQty: hasItems ? items.reduce((s, it) => s + it.receivedQty, 0) : headerInfo.totalReceivedQty || 0,
            totalDiscrepancyQty: 0,
            totalCartons: hasItems ? items.reduce((s, it) => s + it.cartons, 0) : headerInfo.totalCartons || 0,
            totalReceivedCartons: hasItems ? items.reduce((s, it) => s + (it.receivedCartons || 0), 0) : headerInfo.totalReceivedCartons || 0,
            missingCartons: 0,
            caseStatus: 'Not Eligible',
            notes: headerInfo.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'Batch Excel Upload',
          };

          const calculated = calculateShipmentMetrics(base);
          shipments.push(calculated);

          totalUnits += calculated.totalShipQty;
          totalCartons += calculated.totalCartons;
        });

        resolve({
          shipments,
          errors,
          warnings,
          totalRows: rawJson.length,
          totalShipments: shipments.length,
          totalUnits,
          totalCartons,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败，请重试'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse SKU Items supplement file specifically for shipments
 */
export async function parseShipmentItemSupplementFile(
  file: File,
  targetShipmentId?: string,
  products: { sku: string; productName?: string; itemId?: string; gtin?: string; productType?: string }[] = []
): Promise<{
  items: any[];
  errors: { row: number; field: string; message: string }[];
  warnings: { row: number; field: string; message: string }[];
  totalUnits: number;
  totalCartons: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('表格为空或没有读取到商品明细数据');
        }

        const rawHeaders = Object.keys(rawJson[0]);
        const { mappings } = matchColumns(rawHeaders);
        const columnMap: Record<string, string> = {};
        mappings.forEach((m) => {
          if (m.systemField) {
            columnMap[m.fileColumn] = m.systemField;
          }
        });

        const productMap = new Map<string, any>();
        products.forEach((p) => productMap.set(p.sku.toLowerCase(), p));

        const items: any[] = [];
        const errors: { row: number; field: string; message: string }[] = [];
        const warnings: { row: number; field: string; message: string }[] = [];
        let totalUnits = 0;
        let totalCartons = 0;

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          const mapped: Record<string, any> = {};
          let rawDiscrepancyTag = '';
          let rawDiscrepancyNote = '';
          let rawFollowup = false;

          Object.entries(row).forEach(([col, val]) => {
            const lowCol = col.toLowerCase();
            const strVal = typeof val === 'string' ? val.trim() : String(val || '');
            if (lowCol.includes('tag') || lowCol.includes('标签') || lowCol.includes('差异类型')) {
              rawDiscrepancyTag = strVal;
            } else if (lowCol.includes('note') || lowCol.includes('说明') || lowCol.includes('处置') || lowCol.includes('跟进') || lowCol.includes('原因')) {
              rawDiscrepancyNote = strVal;
            } else if (lowCol.includes('follow') || lowCol.includes('提醒') || lowCol.includes('重点')) {
              rawFollowup = strVal.includes('是') || strVal.toLowerCase() === 'yes' || strVal === 'true' || strVal === '1';
            }

            const field = columnMap[col];
            if (field) {
              mapped[field] = strVal;
            }
          });

          const rawSku = (mapped.sku || '').toString().trim();
          const rawShipmentId = (mapped.shipmentId || targetShipmentId || '').toString().trim();
          const rawShipQty = Number(mapped.shipQty);

          if (!rawSku && !rawShipQty) return;

          if (!rawSku) {
            errors.push({
              row: rowNum,
              field: 'Seller SKU',
              message: `第 ${rowNum} 行缺少商品 SKU`,
            });
            return;
          }

          if (isNaN(rawShipQty) || rawShipQty <= 0) {
            errors.push({
              row: rowNum,
              field: 'Ship Qty',
              message: `第 ${rowNum} 行 SKU ${rawSku} 发货数量必须为有效正整数`,
            });
            return;
          }

          const matchedProd = productMap.get(rawSku.toLowerCase());
          const productName = mapped.productName || matchedProd?.productName || rawSku;
          const itemId = mapped.itemId || matchedProd?.itemId || '';
          const gtin = mapped.gtin || matchedProd?.gtin || '';
          const productType = mapped.productType || matchedProd?.productType || 'General';

          const cartons = Number(mapped.cartons) > 0 ? Number(mapped.cartons) : Math.max(1, Math.ceil(rawShipQty / 20));
          const qtyPerCarton = Number(mapped.qtyPerCarton) > 0 ? Number(mapped.qtyPerCarton) : (cartons > 0 ? Math.round(rawShipQty / cartons) : rawShipQty);
          const receivedQty = Number(mapped.receivedQty) >= 0 ? Number(mapped.receivedQty) : 0;
          const receivedCartons = Number(mapped.receivedCartons) >= 0 ? Number(mapped.receivedCartons) : (receivedQty > 0 ? Math.min(cartons, Math.ceil(receivedQty / (qtyPerCarton || 1))) : 0);
          const discrepancyQty = Math.max(0, rawShipQty - receivedQty);

          const existIdx = items.findIndex((it) => it.sku.toLowerCase() === rawSku.toLowerCase());
          if (existIdx >= 0) {
            items[existIdx].shipQty += rawShipQty;
            items[existIdx].cartons += cartons;
            items[existIdx].receivedQty += receivedQty;
            items[existIdx].receivedCartons = (items[existIdx].receivedCartons || 0) + receivedCartons;
            items[existIdx].discrepancyQty = Math.max(0, items[existIdx].shipQty - items[existIdx].receivedQty);
            if (rawDiscrepancyNote && !items[existIdx].discrepancyReason) {
              items[existIdx].discrepancyReason = rawDiscrepancyNote;
            }
            warnings.push({
              row: rowNum,
              field: 'Duplicate SKU',
              message: `第 ${rowNum} 行 SKU ${rawSku} 重复，已自动合并`,
            });
          } else {
            items.push({
              shipmentId: rawShipmentId,
              sku: rawSku,
              itemId,
              gtin,
              productName,
              productType,
              shipQty: rawShipQty,
              cartons,
              qtyPerCarton,
              receivedQty,
              receivedCartons,
              discrepancyQty,
              discrepancyTag: rawDiscrepancyTag || (discrepancyQty > 0 ? 'FC_SHORTAGE' : 'VERIFIED'),
              discrepancyReason: rawDiscrepancyNote,
              requiresFollowup: rawFollowup || discrepancyQty > 0,
              isReconciled: discrepancyQty === 0,
              source: 'Item Supplement Upload',
            });
          }

          totalUnits += rawShipQty;
          totalCartons += cartons;
        });

        resolve({
          items,
          errors,
          warnings,
          totalUnits,
          totalCartons,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export interface FreightFileParseResult {
  items: FreightShippingItem[];
  actuals: Record<string, {
    actualChargeableWeight?: number;
    actualCost?: number;
    reconciliationNotes?: string;
  }>;
  errors: { row: number; field: string; message: string }[];
  warnings: { row: number; field: string; message: string }[];
  totalRows: number;
  totalUnits: number;
  totalCartons: number;
  shipmentCount: number;
}

/**
 * Parse First-Leg Freight Excel or CSV file
 */
export async function parseFreightExcelOrCsv(file: File): Promise<FreightFileParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('表格为空或没有读取到有效的数据行，请检查文件内容');
        }

        const items: FreightShippingItem[] = [];
        const actuals: Record<string, any> = {};
        const errors: { row: number; field: string; message: string }[] = [];
        const warnings: { row: number; field: string; message: string }[] = [];
        const shipmentSet = new Set<string>();
        let totalUnits = 0;
        let totalCartons = 0;

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          let shipmentId = '';
          let warehouse = 'PHX1';
          let shipDate = '2026-08-01';
          let sku = '';
          let productName = '';
          let actualQty = 0;
          let boxCount = 1;
          let boxWeight = 0;
          let dimensionsText = '40*30*25';
          let channel = '美森限时达';
          let unitPrice = 0;
          let isMergedCustoms = true;
          let mixedBoxGroup = '';
          let actualChargeableWeight: number | undefined;
          let actualCost: number | undefined;
          let notes = '';

          Object.entries(row).forEach(([col, val]) => {
            const lowCol = col.toLowerCase().replace(/\s+/g, '');
            const strVal = typeof val === 'string' ? val.trim() : String(val || '').trim();

            if (
              lowCol.includes('shipmentid') ||
              lowCol.includes('货件编号') ||
              lowCol.includes('货件id') ||
              lowCol.includes('shipment')
            ) {
              shipmentId = strVal;
            } else if (
              lowCol.includes('warehouse') ||
              lowCol.includes('仓库') ||
              lowCol.includes('fc') ||
              lowCol.includes('目的仓')
            ) {
              warehouse = strVal.toUpperCase();
            } else if (
              lowCol.includes('shipdate') ||
              lowCol.includes('发货时间') ||
              lowCol.includes('发货日期') ||
              lowCol.includes('出货时间')
            ) {
              shipDate = strVal.replace(/\//g, '-');
            } else if (
              lowCol.includes('sku') ||
              lowCol.includes('sellersku') ||
              lowCol.includes('商品sku')
            ) {
              sku = strVal;
            } else if (
              lowCol.includes('title') ||
              lowCol.includes('productname') ||
              lowCol.includes('标题') ||
              lowCol.includes('品名') ||
              lowCol.includes('产品名称')
            ) {
              productName = strVal;
            } else if (
              lowCol.includes('actualqty') ||
              lowCol.includes('shipqty') ||
              lowCol.includes('实际出货数量') ||
              lowCol.includes('出货数量') ||
              lowCol.includes('发货数量')
            ) {
              actualQty = Number(strVal) || 0;
            } else if (
              lowCol.includes('cartons') ||
              lowCol.includes('boxcount') ||
              lowCol.includes('件数') ||
              lowCol.includes('箱数')
            ) {
              boxCount = Number(strVal) || 1;
            } else if (
              lowCol.includes('boxweight') ||
              lowCol.includes('weight') ||
              lowCol.includes('单箱实重') ||
              lowCol.includes('单箱重') ||
              lowCol.includes('实重')
            ) {
              boxWeight = Number(strVal) || 0;
            } else if (
              lowCol.includes('dimension') ||
              lowCol.includes('箱规') ||
              lowCol.includes('尺寸') ||
              lowCol.includes('size')
            ) {
              dimensionsText = strVal;
            } else if (
              lowCol.includes('channel') ||
              lowCol.includes('渠道') ||
              lowCol.includes('物流渠道')
            ) {
              channel = strVal;
            } else if (
              lowCol.includes('unitprice') ||
              lowCol.includes('price') ||
              lowCol.includes('单价')
            ) {
              unitPrice = Number(strVal) || 0;
            } else if (
              lowCol.includes('customs') ||
              lowCol.includes('报关') ||
              lowCol.includes('合并报关')
            ) {
              isMergedCustoms =
                !strVal.includes('不') &&
                !strVal.includes('否') &&
                strVal.toLowerCase() !== 'no' &&
                strVal.toLowerCase() !== 'false';
            } else if (
              lowCol.includes('mixed') ||
              lowCol.includes('混箱')
            ) {
              mixedBoxGroup = strVal;
            } else if (
              lowCol.includes('actualcharge') ||
              lowCol.includes('实际收费重') ||
              lowCol.includes('实际计费重')
            ) {
              if (strVal && !isNaN(Number(strVal))) {
                actualChargeableWeight = Number(strVal);
              }
            } else if (
              lowCol.includes('actualcost') ||
              lowCol.includes('实际费用') ||
              lowCol.includes('实际金额') ||
              lowCol.includes('账单金额')
            ) {
              if (strVal && !isNaN(Number(strVal))) {
                actualCost = Number(strVal);
              }
            } else if (
              lowCol.includes('note') ||
              lowCol.includes('备注') ||
              lowCol.includes('对账')
            ) {
              notes = strVal;
            }
          });

          if (!shipmentId && !sku && actualQty === 0) return;

          if (!shipmentId) {
            errors.push({
              row: rowNum,
              field: 'Shipment ID',
              message: `第 ${rowNum} 行缺少货件编号 (Shipment ID)`,
            });
            return;
          }

          if (!sku) {
            errors.push({
              row: rowNum,
              field: 'Seller SKU',
              message: `第 ${rowNum} 行缺少商品 SKU`,
            });
            return;
          }

          const parsedDims = parseDimensions(dimensionsText);
          const item = calculateItemFreightMetrics({
            id: `F-ITEM-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            shipmentId,
            warehouse: warehouse || 'PHX1',
            shipDate: shipDate || '2026-08-01',
            monthKey: extractMonthKey(shipDate),
            sku,
            productName: productName || sku,
            actualQty,
            boxCount: Math.max(1, boxCount),
            boxWeight,
            boxLength: parsedDims.length,
            boxWidth: parsedDims.width,
            boxHeight: parsedDims.height,
            dimensionsText: parsedDims.text,
            channel: channel || '美森限时达',
            unitPrice,
            isMergedCustoms,
            mixedBoxGroup: mixedBoxGroup || undefined,
            notes,
          });

          items.push(item);
          shipmentSet.add(shipmentId);
          totalUnits += actualQty;
          totalCartons += boxCount;

          if (actualCost !== undefined || actualChargeableWeight !== undefined) {
            actuals[shipmentId] = {
              actualChargeableWeight,
              actualCost,
              reconciliationNotes: notes,
            };
          }
        });

        resolve({
          items,
          actuals,
          errors,
          warnings,
          totalRows: rawJson.length,
          totalUnits,
          totalCartons,
          shipmentCount: shipmentSet.size,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };

    reader.readAsArrayBuffer(file);
  });
}

