export const ROUTES = {
  DELIVERY: '/',
  ADMIN_LOGIN: '/admin/login',
  DASHBOARD: '/admin/dashboard',
  CUSTOMERS: '/admin/customers',
  CUSTOMER_DETAIL: '/admin/customers/:userId',
  MENU: '/admin/menu',
  RECONCILIATION: '/admin/reconciliation',
  ADMIN_DELIVERY: '/admin/delivery',
} as const;

export const CACHE_KEYS = {
  AUTH: 'tiffin_admin_auth',
  USERS: 'tiffin_admin_users',
  NEGATIVE: 'tiffin_admin_negative',
  MENU: 'tiffin_admin_menu',
  TIMESTAMPS: 'tiffin_admin_cache_timestamps',
  DASHBOARD: (date: string) => `tiffin_admin_dashboard_${date}`,
  ORDERS: (date: string, slot: string) => `tiffin_admin_orders_${date}_${slot}`,
  REPORT: (userId: string, year: number, month: number) =>
    `tiffin_admin_report_${userId}_${year}_${String(month).padStart(2, '0')}`,
  HISTORY: (userId: string, year: number, month: number) =>
    `tiffin_admin_history_${userId}_${year}_${String(month).padStart(2, '0')}`,
} as const;

export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
export const CACHE_TTL_SHORT = 2 * 60 * 1000; // 2 minutes for orders
export const CACHE_TTL_LONG = 10 * 60 * 1000; // 10 minutes for menu

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export const SLOTS = ['lunch', 'dinner'] as const;
