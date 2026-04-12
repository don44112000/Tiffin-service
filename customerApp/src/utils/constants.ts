export const CACHE_KEYS = {
  USER: 'tiffin_user',
  ORDERS: (year: number, month: number) =>
    `tiffin_orders_${year}_${String(month).padStart(2, '0')}`,
  REPORT: (year: number, month: number) =>
    `tiffin_report_${year}_${String(month).padStart(2, '0')}`,
  TIMESTAMPS: 'tiffin_cache_timestamps',
};

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/',
  ORDERS: '/orders',
  ADD_MEAL: '/add-meal',
  EXTEND_PLAN: '/extend-plan',
  REPORT: '/report',
  PROFILE: '/profile',
  CREDIT_HISTORY: '/credit-history',
  WEEKLY_MENU: '/weekly-menu',
};
