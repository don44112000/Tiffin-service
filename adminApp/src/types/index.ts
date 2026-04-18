// ── Data Models ─────────────────────────────────────────────────────────

export interface Customer {
  user_id: string;
  name: string;
  mobile: string;
  password: string;
  address_1: string;
  address_2: string;
  address_3: string;
  credit_balance: number;
  created_at: string;
  is_active: boolean;
}

export interface Order {
  order_id: string;
  user_id: string;
  date: string;
  slot: 'lunch' | 'dinner';
  type: 'veg' | 'non-veg';
  address: string;
  quantity_ordered: number;
  quantity_delivered: number;
  credits_used: number;
  is_delivered: boolean;
  delivered_at: string;
  created_at: string;
  is_skipped: boolean;
}

export interface GroupedOrders {
  user_id: string;
  customer_name: string;
  orders: Order[];
}

export interface SlotSummary {
  total_demand: number;
  total_ordered: number;
  total_delivered: number;
  veg_demand?: number;       // total veg demand (ordered + skipped); added in v2
  non_veg_demand?: number;   // total non-veg demand (ordered + skipped); added in v2
  veg_ordered: number;
  non_veg_ordered: number;
  veg_delivered: number;
  non_veg_delivered: number;
  skipped: number;
  veg_skipped?: number;
  non_veg_skipped?: number;
}

export interface DaySummary {
  date: string;
  lunch: SlotSummary;
  dinner: SlotSummary;
}

export interface MenuItem {
  menu_id: string;
  day: string;
  slot: 'lunch' | 'dinner';
  dish_name: string;
  description: string;
}

export interface CreditHistoryItem {
  history_id: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  created_at: string;
}

export interface MonthlyReportSummary {
  user_id: string;
  from: string;
  to: string;
  total_ordered: number;
  total_delivered: number;
  total_skipped: number;
  total_credits_deducted: number;
}

export interface MonthlyReportOrder {
  order_id: string;
  date: string;
  slot: string;
  quantity_ordered: number;
  quantity_delivered: number;
  credits_deducted: number;
  is_delivered: boolean;
  is_skipped: boolean;
}

// ── API Responses ───────────────────────────────────────────────────────

export interface DashboardResponse {
  success: boolean;
  yesterday: DaySummary;
  today: DaySummary;
  tomorrow: DaySummary;
}

export interface AllUsersResponse {
  success: boolean;
  total: number;
  users: Customer[];
}

export interface OrdersByDateSlotResponse {
  success: boolean;
  total: number;
  total_users: number;
  grouped: GroupedOrders[];
}

export interface NegativeCreditsResponse {
  success: boolean;
  total: number;
  users: Pick<Customer, 'user_id' | 'name' | 'mobile' | 'credit_balance'>[];
}

export interface MonthlyReportResponse {
  success: boolean;
  summary: MonthlyReportSummary;
  orders: MonthlyReportOrder[];
}

export interface CreditHistoryResponse {
  success: boolean;
  summary: { total_credited: number; total_debited: number; net: number };
  total: number;
  history: CreditHistoryItem[];
}

export interface MenuResponse {
  success: boolean;
  total: number;
  menu: MenuItem[];
}

export interface MarkDeliveredResponse {
  success: boolean;
  message: string;
  credits_used: number;
}

export interface RechargeResponse {
  success: boolean;
  message: string;
  user_id: string;
  added: number;
  previous_balance: number;
  new_balance: number;
}

export interface ReconcileResponse {
  success: boolean;
  message: string;
  date: string;
  total_credits_deducted: number;
  users_affected: number;
}

export interface UpsertMenuResponse {
  success: boolean;
  message: string;
  menu_id: string;
}

export interface ReduceCreditsResponse {
  success: boolean;
  message: string;
  order_id: string;
  previous_credits: number;
  new_credits: number;
  day_completed: boolean;
}

export interface GenericResponse {
  success: boolean;
  message: string;
}
