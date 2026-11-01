// Hand-pinned subset of the shared vtech-frontend schema (zero-DDL v1).
// Regenerate with `supabase gen types typescript --project-id ...` once a
// SUPABASE_ACCESS_TOKEN is available; until then keep this list in sync with
// `supabase/migrations`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PaymentMode =
  | "Cash"
  | "UPI"
  | "NEFT"
  | "Cheque"
  | "Bank Transfer"
  | "PhonePe/GPay";

export type PaymentType = "Full" | "Partial" | "Advance" | "On Account";

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        full_name: string | null;
        role: string | null;
        avatar_url: string | null;
        updated_at: string | null;
        mechanic_id: number | null;
        email: string | null;
        date_updated: string | null;
        client_id: number | null;
      }>;

      system_info: Table<{
        id: number;
        meta_field: string;
        meta_value: string;
      }>;

      client_list: Table<{
        id: number;
        firstname: string;
        middlename: string | null;
        lastname: string;
        contact: string;
        email: string | null;
        address: string;
        image_path: string | null;
        opening_balance: number | null;
        delete_flag: number;
        date_created: string;
        date_updated: string | null;
        payment_due_date: string | null;
        payment_due_remarks: string | null;
        login_allowed: boolean;
      }>;

      client_contacts: Table<{
        id: number;
        client_id: number;
        name: string | null;
        label: string;
        phone: string;
        is_primary: boolean;
        date_created: string;
        date_updated: string;
      }>;

      client_payments: Table<{
        id: number;
        client_id: number;
        job_id: string | null;
        loan_id: number | null;
        bill_no: string | null;
        payment_date: string | null;
        amount: number;
        discount: number | null;
        net_amount: number | null;
        payment_mode: PaymentMode | null;
        payment_type: PaymentType | null;
        remarks: string | null;
        created_at: string | null;
      }>;

      client_loans: Table<{
        id: number;
        client_id: number;
        principal_amount: number;
        interest_rate: number | null;
        loan_period: number;
        total_payable: number;
        emi_amount: number;
        remarks: string | null;
        loan_date: string;
        status: number | null;
        created_at: string | null;
      }>;

      mechanic_list: Table<{
        id: number;
        firstname: string;
        middlename: string | null;
        lastname: string;
        contact: string;
        designation: string | null;
        daily_salary: number | null;
        avatar: string | null;
        commission_percent: number | null;
        status: number;
        delete_flag: number;
        date_added: string;
        date_updated: string | null;
        salary_per_day: number;
        image_path: string | null;
      }>;

      service_list: Table<{
        id: number;
        name: string;
        description: string;
        price: number;
        status: number;
        delete_flag: number;
        date_created: string;
        date_updated: string;
        hsn: string;
      }>;

      product_list: Table<{
        id: number;
        name: string;
        description: string;
        cost_price: number;
        price: number;
        image_path: string | null;
        status: number;
        delete_flag: number;
        date_created: string;
        date_updated: string;
        hsn: string;
        alert_quantity: number;
        barcode: string | null;
      }>;

      locations: Table<{
        id: number;
        zone: string;
        rack: string;
        bin: string;
        box: string;
        label: string | null;
        status: number;
        delete_flag: number;
        created_at: string | null;
        code: string | null;
        zone_id: number | null;
        rack_id: number | null;
        bin_id: number | null;
        box_id: number | null;
        kind: string;
      }>;

      staff_duty_schedule: Table<{
        id: number;
        mechanic_id: number;
        duty_start: string;
        duty_end: string;
        break_minutes: number;
        effective_from: string;
        note: string | null;
        created_by: string | null;
        created_at: string;
      }>;

      transaction_list: Table<{
        id: number;
        user_id: number;
        mechanic_id: number | null;
        code: string;
        job_id: string | null;
        client_name: string | null;
        fault: string;
        remark: string;
        item: string;
        uniq_id: string;
        amount: number;
        mechanic_amount: number;
        mechanic_commission_amount: number | null;
        del_status: number;
        status: number;
        date_created: string;
        date_updated: string;
        date_completed: string | null;
        location_id: number | null;
      }>;

      transaction_services: Table<{
        transaction_id: number;
        service_id: number;
        service_name: string | null;
        price: number;
      }>;

      transaction_products: Table<{
        transaction_id: number;
        product_id: number | null;
        product_name: string | null;
        qty: number;
        price: number;
        id: number;
      }>;

      transaction_images: Table<{
        id: number;
        transaction_id: number;
        image_path: string;
        date_created: string;
      }>;

      direct_sales: Table<{
        id: number;
        sale_code: string;
        client_id: number | null;
        mechanic_id: number | null;
        total_amount: number;
        payment_mode: string;
        remarks: string | null;
        last_edited_by: number | null;
        last_edited_by_name: string | null;
        last_edited_date: string | null;
        date_created: string;
      }>;

      direct_sale_items: Table<{
        id: number;
        sale_id: number;
        product_id: number | null;
        qty: number;
        price: number;
      }>;

      attendance_list: Table<{
        id: number;
        mechanic_id: number;
        status: number;
        curr_date: string;
        time_in: string | null;
        time_out: string | null;
        lat_in: number | null;
        lng_in: number | null;
        lat_out: number | null;
        lng_out: number | null;
        worked_min: number | null;
        ot_min: number;
        duty_min: number | null;
        is_auto_closed: boolean;
      }>;

      job_id_counter: Table<{
        id: number;
        last_job_id: number | null;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_dashboard_stats: {
        Args: { p_today_start: string; p_today_end: string };
        Returns: Json;
      };
      get_monthly_revenue: {
        Args: { p_months?: number };
        Returns: Json;
      };
      get_clients_page_financials: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_financial_summary: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      get_technician_metrics: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      get_transactions_with_client_data: {
        Args: { date_from?: string | null; date_to?: string | null };
        Returns: Array<{
          id: number;
          job_id: string | null;
          code: string;
          client_name: number | null;
          item: string;
          fault: string;
          uniq_id: string;
          amount: number;
          status: number;
          date_created: string;
          date_updated: string;
          date_completed: string | null;
          del_status: number;
          client_firstname: string | null;
          client_middlename: string | null;
          client_lastname: string | null;
          client_contact: string | null;
          client_opening_balance: number | null;
          total_billed: number | null;
          total_paid: number | null;
          total_sale: number | null;
        }>;
      };
      get_inventory_stock: {
        Args: { p_product_ids?: number[] | null };
        Returns: Array<{
          product_id: number;
          total_in: number;
          total_sold_job: number;
          total_sold_sale: number;
          total_sold: number;
          available: number;
          oversold: number;
          avg_purchase_cost: number | null;
          last_stock_date: string | null;
          place: string | null;
        }>;
      };
      save_direct_sale: {
        Args: {
          p_sale_id?: number | null;
          p_sale_code?: string | null;
          p_client_id?: number | null;
          p_mechanic_id?: number | null;
          p_payment_mode?: string | null;
          p_remarks?: string | null;
          p_last_edited_by?: number | null;
          p_last_edited_by_name?: string | null;
          p_items?: Json | null;
        };
        Returns: number;
      };
      next_job_id: { Args: Record<PropertyKey, never>; Returns: number };
      peek_next_job_id: { Args: Record<PropertyKey, never>; Returns: number };
      get_my_role: { Args: Record<PropertyKey, never>; Returns: string | null };
      get_my_client_id: {
        Args: Record<PropertyKey, never>;
        Returns: number | null;
      };
      is_frontend_staff: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      payment_mode_type: PaymentMode;
      payment_type_type: PaymentType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
