export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      billing_profiles: {
        Row: {
          created_at: string
          default_payment_method_id: string | null
          id: string
          pm_brand: string | null
          pm_exp_month: number | null
          pm_exp_year: number | null
          pm_last4: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_payment_method_id?: string | null
          id?: string
          pm_brand?: string | null
          pm_exp_month?: number | null
          pm_exp_year?: number | null
          pm_last4?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_payment_method_id?: string | null
          id?: string
          pm_brand?: string | null
          pm_exp_month?: number | null
          pm_exp_year?: number | null
          pm_last4?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          created_at: string
          id: string
          info_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          info_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          info_token?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          provider_id: string | null
          registration_id: string | null
          session_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          provider_id?: string | null
          registration_id?: string | null
          session_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          provider_id?: string | null
          registration_id?: string | null
          session_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prewarm_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          prewarm_at: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          prewarm_at: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          prewarm_at?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prewarm_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          created_at: string
          id: string
          name: string | null
          site_url: string | null
          stripe_connect_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          site_url?: string | null
          stripe_connect_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          site_url?: string | null
          stripe_connect_id?: string | null
        }
        Relationships: []
      }
      registration_attempts: {
        Row: {
          attempted_at: string
          child_id: string
          id: string
          meta: Json | null
          outcome: string
          registration_id: string | null
        }
        Insert: {
          attempted_at?: string
          child_id: string
          id?: string
          meta?: Json | null
          outcome: string
          registration_id?: string | null
        }
        Update: {
          attempted_at?: string
          child_id?: string
          id?: string
          meta?: Json | null
          outcome?: string
          registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_attempts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_attempts_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          child_id: string
          client_ip: string | null
          device_fingerprint: string | null
          id: string
          priority_opt_in: boolean
          processed_at: string | null
          provider_confirmation_id: string | null
          requested_at: string
          review_flag: boolean
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          child_id: string
          client_ip?: string | null
          device_fingerprint?: string | null
          id?: string
          priority_opt_in?: boolean
          processed_at?: string | null
          provider_confirmation_id?: string | null
          requested_at?: string
          review_flag?: boolean
          session_id: string
          status: string
          user_id: string
        }
        Update: {
          child_id?: string
          client_ip?: string | null
          device_fingerprint?: string | null
          id?: string
          priority_opt_in?: boolean
          processed_at?: string | null
          provider_confirmation_id?: string | null
          requested_at?: string
          review_flag?: boolean
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity: number | null
          created_at: string
          end_at: string | null
          high_demand: boolean
          id: string
          location: string | null
          open_time_exact: boolean
          provider_id: string | null
          registration_open_at: string | null
          start_at: string | null
          title: string | null
          upfront_fee_cents: number | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          end_at?: string | null
          high_demand?: boolean
          id?: string
          location?: string | null
          open_time_exact?: boolean
          provider_id?: string | null
          registration_open_at?: string | null
          start_at?: string | null
          title?: string | null
          upfront_fee_cents?: number | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          end_at?: string | null
          high_demand?: boolean
          id?: string
          location?: string | null
          open_time_exact?: boolean
          provider_id?: string | null
          registration_open_at?: string | null
          start_at?: string | null
          title?: string | null
          upfront_fee_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_registrations: {
        Args: { p_max_sessions?: number }
        Returns: {
          session_id: string
          accepted: string[]
          rejected: string[]
        }[]
      }
      check_and_resolve_duplicate_registrations: {
        Args: Record<PropertyKey, never>
        Returns: {
          resolved_count: number
        }[]
      }
      child_session_overlap_exists: {
        Args: { p_child_id: string; p_start: string; p_end: string }
        Returns: boolean
      }
      get_attempts_count_week: {
        Args: { p_child_id: string; p_tz?: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
