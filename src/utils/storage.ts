import {
  Shipment,
  InventoryItem,
  InventoryLedgerEntry,
  CaseRecord,
  Product,
  AuditLog,
  AnomalyItem,
  AppSettings,
  FreightShippingItem,
} from '../types';
import { generateDemoData, generateDemoFreightData } from './demoData';
import { calculateShipmentMetrics } from './statusCalculator';
import { getTodayString } from './dateUtils';

const STORAGE_KEYS = {
  SHIPMENTS: 'wmt_shipments_v1',
  INVENTORY: 'wmt_inventory_v1',
  LEDGER: 'wmt_ledger_v1',
  CASES: 'wmt_cases_v1',
  PRODUCTS: 'wmt_products_v1',
  AUDIT_LOGS: 'wmt_audit_logs_v1',
  ANOMALIES: 'wmt_anomalies_v1',
  SETTINGS: 'wmt_settings_v1',
  IS_DEMO: 'wmt_is_demo_mode_v1',
  FREIGHT_ITEMS: 'wmt_freight_items_v1',
  FREIGHT_ACTUALS: 'wmt_freight_actuals_v1',
  FREIGHT_SYNCED_SHIPMENTS: 'wmt_freight_synced_shipments_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  caseRuleDays: 10,
  caseEligibilityDays: 10,
  approachingAlertDays: 3,
  approachingDaysWarning: 3,
  autoStatusCalculation: true,
  autoCalculateCase: true,
  autoCloseCaseOnReceipt: true,
  allowNegativeInventory: false,
  strictArrivalDateRequired: true,
};

export class AppStorage {
  private static isInitialized = false;

  public static initialize(): {
    shipments: Shipment[];
    inventory: InventoryItem[];
    ledger: InventoryLedgerEntry[];
    cases: CaseRecord[];
    products: Product[];
    auditLogs: AuditLog[];
    settings: AppSettings;
    isDemo: boolean;
  } {
    try {
      const storedShipments = localStorage.getItem(STORAGE_KEYS.SHIPMENTS);
      const storedInventory = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      const storedLedger = localStorage.getItem(STORAGE_KEYS.LEDGER);
      const storedCases = localStorage.getItem(STORAGE_KEYS.CASES);
      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const storedAuditLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const storedIsDemo = localStorage.getItem(STORAGE_KEYS.IS_DEMO);

      if (!storedShipments && !storedInventory) {
        // First-time load -> Initialize with authentic Demo Data
        const demo = generateDemoData();
        const initialAudit: AuditLog[] = [
          {
            id: `AUD-${Date.now()}-init`,
            timestamp: new Date().toISOString(),
            targetType: 'Import',
            targetId: 'INIT-DEMO',
            field: 'ALL',
            beforeValue: null,
            afterValue: 'Demo Data Loaded',
            source: 'System Initialization',
            operator: 'System',
            details: '系统初始化，载入 Walmart 真实业务场景演示数据',
          },
        ];

        this.saveAll({
          shipments: demo.shipments,
          inventory: demo.inventory,
          ledger: demo.ledger,
          cases: demo.cases,
          products: demo.products,
          auditLogs: initialAudit,
          settings: DEFAULT_SETTINGS,
          isDemo: true,
        });

        this.isInitialized = true;
        return {
          shipments: demo.shipments,
          inventory: demo.inventory,
          ledger: demo.ledger,
          cases: demo.cases,
          products: demo.products,
          auditLogs: initialAudit,
          settings: DEFAULT_SETTINGS,
          isDemo: true,
        };
      }

      const settings: AppSettings = storedSettings
        ? JSON.parse(storedSettings)
        : DEFAULT_SETTINGS;
      const shipments: Shipment[] = storedShipments ? JSON.parse(storedShipments) : [];
      const inventory: InventoryItem[] = storedInventory ? JSON.parse(storedInventory) : [];
      const ledger: InventoryLedgerEntry[] = storedLedger ? JSON.parse(storedLedger) : [];
      const cases: CaseRecord[] = storedCases ? JSON.parse(storedCases) : [];
      const products: Product[] = storedProducts ? JSON.parse(storedProducts) : [];
      const auditLogs: AuditLog[] = storedAuditLogs ? JSON.parse(storedAuditLogs) : [];
      const isDemo = storedIsDemo === 'true';

      // Recalculate dynamic values based on current date
      const refreshedShipments = shipments.map((s) =>
        calculateShipmentMetrics(s, getTodayString(settings.customTodayDate || settings.currentSimulatedDate), settings.caseRuleDays || settings.caseEligibilityDays)
      );

      this.isInitialized = true;
      return {
        shipments: refreshedShipments,
        inventory,
        ledger,
        cases,
        products,
        auditLogs,
        settings,
        isDemo,
      };
    } catch (e) {
      console.error('Failed to load from storage:', e);
      const demo = generateDemoData();
      return {
        shipments: demo.shipments,
        inventory: demo.inventory,
        ledger: demo.ledger,
        cases: demo.cases,
        products: demo.products,
        auditLogs: [],
        settings: DEFAULT_SETTINGS,
        isDemo: true,
      };
    }
  }

  public static getShipments(): Shipment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHIPMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getInventory(): InventoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getCases(): CaseRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CASES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getLedger(): InventoryLedgerEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEDGER);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getAnomalies(): AnomalyItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANOMALIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveShipments(shipments: Shipment[]): void {
    localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify(shipments));
  }

  public static saveInventory(inventory: InventoryItem[]): void {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  }

  public static saveLedger(ledger: InventoryLedgerEntry[]): void {
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));
  }

  public static saveCases(cases: CaseRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));
  }

  public static saveProducts(products: Product[]): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  public static saveAuditLogs(auditLogs: AuditLog[]): void {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }

  public static saveAnomalies(anomalies: AnomalyItem[]): void {
    localStorage.setItem(STORAGE_KEYS.ANOMALIES, JSON.stringify(anomalies));
  }

  public static saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  public static getIsDemo(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true';
    } catch {
      return false;
    }
  }

  public static saveIsDemo(isDemo: boolean): void {
    localStorage.setItem(STORAGE_KEYS.IS_DEMO, isDemo ? 'true' : 'false');
  }

  public static getFreightItems(): FreightShippingItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FREIGHT_ITEMS);
      if (data) return JSON.parse(data);
      // If demo mode or not set, return demo freight items
      const isDemo = this.getIsDemo();
      if (isDemo) {
        const demo = generateDemoFreightData();
        return demo.items;
      }
      return [];
    } catch {
      return [];
    }
  }

  public static saveFreightItems(items: FreightShippingItem[]): void {
    localStorage.setItem(STORAGE_KEYS.FREIGHT_ITEMS, JSON.stringify(items));
  }

  public static getFreightActuals(): Record<string, any> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FREIGHT_ACTUALS);
      if (data) return JSON.parse(data);
      const isDemo = this.getIsDemo();
      if (isDemo) {
        const demo = generateDemoFreightData();
        return demo.actuals;
      }
      return {};
    } catch {
      return {};
    }
  }

  public static saveFreightActuals(actuals: Record<string, any>): void {
    localStorage.setItem(STORAGE_KEYS.FREIGHT_ACTUALS, JSON.stringify(actuals));
  }

  public static getSyncedShipmentIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FREIGHT_SYNCED_SHIPMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveSyncedShipmentIds(ids: string[]): void {
    localStorage.setItem(STORAGE_KEYS.FREIGHT_SYNCED_SHIPMENTS, JSON.stringify(ids));
  }

  public static logAudit(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const existing = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const updated = [newLog, ...existing].slice(0, 500);
    this.saveAuditLogs(updated);
  }

  public static saveAll(data: {
    shipments: Shipment[];
    inventory: InventoryItem[];
    ledger: InventoryLedgerEntry[];
    cases: CaseRecord[];
    products: Product[];
    auditLogs: AuditLog[];
    settings: AppSettings;
    isDemo: boolean;
    freightItems?: FreightShippingItem[];
    freightActuals?: Record<string, any>;
  }): void {
    this.saveShipments(data.shipments);
    this.saveInventory(data.inventory);
    this.saveLedger(data.ledger);
    this.saveCases(data.cases);
    this.saveProducts(data.products);
    this.saveAuditLogs(data.auditLogs);
    this.saveSettings(data.settings);
    this.saveIsDemo(data.isDemo);
    if (data.freightItems !== undefined) {
      this.saveFreightItems(data.freightItems);
    }
    if (data.freightActuals !== undefined) {
      this.saveFreightActuals(data.freightActuals);
    }
  }

  public static resetDemoData(simulatedToday?: string): void {
    this.resetToDemoData(simulatedToday);
  }

  public static resetToDemoData(simulatedToday?: string): {
    shipments: Shipment[];
    inventory: InventoryItem[];
    ledger: InventoryLedgerEntry[];
    cases: CaseRecord[];
    products: Product[];
    auditLogs: AuditLog[];
    settings: AppSettings;
    isDemo: boolean;
  } {
    const demo = generateDemoData(simulatedToday);
    const demoFreight = generateDemoFreightData();
    const initialAudit: AuditLog[] = [
      {
        id: `AUD-${Date.now()}-reset`,
        timestamp: new Date().toISOString(),
        targetType: 'Import',
        targetId: 'RESET-DEMO',
        field: 'ALL',
        beforeValue: 'User Data',
        afterValue: 'Standard Demo Data Loaded',
        source: 'User Action',
        operator: 'User',
        details: '用户手动重置系统演示数据（含月头程出货汇总与对账）',
      },
    ];

    const data = {
      shipments: demo.shipments,
      inventory: demo.inventory,
      ledger: demo.ledger,
      cases: demo.cases,
      products: demo.products,
      auditLogs: initialAudit,
      settings: DEFAULT_SETTINGS,
      isDemo: true,
      freightItems: demoFreight.items,
      freightActuals: demoFreight.actuals,
    };

    this.saveAll(data);
    return data;
  }

  public static clearAllData(): {
    shipments: Shipment[];
    inventory: InventoryItem[];
    ledger: InventoryLedgerEntry[];
    cases: CaseRecord[];
    products: Product[];
    auditLogs: AuditLog[];
    settings: AppSettings;
    isDemo: boolean;
  } {
    const data = {
      shipments: [],
      inventory: [],
      ledger: [],
      cases: [],
      products: [],
      auditLogs: [
        {
          id: `AUD-${Date.now()}-clear`,
          timestamp: new Date().toISOString(),
          targetType: 'Import',
          targetId: 'CLEAR-ALL',
          field: 'ALL',
          beforeValue: 'Existing Data',
          afterValue: 'Cleared',
          source: 'User Action',
          operator: 'User',
          details: '清空全部业务与头程数据',
        },
      ],
      settings: DEFAULT_SETTINGS,
      isDemo: false,
      freightItems: [],
      freightActuals: {},
    };

    this.saveAll(data);
    return data;
  }

  public static exportAllDataAsJson(): string {
    return this.exportAllToJson();
  }

  public static exportAllToJson(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      shipments: JSON.parse(localStorage.getItem(STORAGE_KEYS.SHIPMENTS) || '[]'),
      inventory: JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY) || '[]'),
      ledger: JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER) || '[]'),
      cases: JSON.parse(localStorage.getItem(STORAGE_KEYS.CASES) || '[]'),
      products: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]'),
      auditLogs: JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]'),
      settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS)),
      freightItems: JSON.parse(localStorage.getItem(STORAGE_KEYS.FREIGHT_ITEMS) || '[]'),
      freightActuals: JSON.parse(localStorage.getItem(STORAGE_KEYS.FREIGHT_ACTUALS) || '{}'),
      isDemo: localStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true',
    };
    return JSON.stringify(data, null, 2);
  }

  public static importDataFromJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.shipments && Array.isArray(parsed.shipments)) {
        this.saveShipments(parsed.shipments);
      }
      if (parsed.inventory && Array.isArray(parsed.inventory)) {
        this.saveInventory(parsed.inventory);
      }
      if (parsed.ledger && Array.isArray(parsed.ledger)) {
        this.saveLedger(parsed.ledger);
      }
      if (parsed.cases && Array.isArray(parsed.cases)) {
        this.saveCases(parsed.cases);
      }
      if (parsed.products && Array.isArray(parsed.products)) {
        this.saveProducts(parsed.products);
      }
      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) {
        this.saveAuditLogs(parsed.auditLogs);
      }
      if (parsed.settings) {
        this.saveSettings(parsed.settings);
      }
      if (parsed.freightItems && Array.isArray(parsed.freightItems)) {
        this.saveFreightItems(parsed.freightItems);
      }
      if (parsed.freightActuals && typeof parsed.freightActuals === 'object') {
        this.saveFreightActuals(parsed.freightActuals);
      }
      this.logAudit({
        targetType: 'Import',
        targetId: 'JSON-BACKUP-RESTORE',
        action: 'Restore Backup',
        details: '从 JSON 备份中成功还原数据',
      });
      return true;
    } catch (e) {
      console.error('Failed to import JSON backup:', e);
      return false;
    }
  }
}

