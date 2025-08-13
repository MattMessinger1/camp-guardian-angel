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
      camp_locations: {
        Row: {
          address: string | null
          camp_id: string
          city: string | null
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          location_name: string
          postal_code: string | null
          state: string | null
        }
        Insert: {
          address?: string | null
          camp_id: string
          city?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_name: string
          postal_code?: string | null
          state?: string | null
        }
        Update: {
          address?: string | null
          camp_id?: string
          city?: string | null
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_name?: string
          postal_code?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_locations_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_sources: {
        Row: {
          camp_id: string
          crawl_error: string | null
          crawl_status: string | null
          created_at: string | null
          id: string
          last_crawled_at: string | null
          location_id: string | null
          provider: string | null
          source_url: string
        }
        Insert: {
          camp_id: string
          crawl_error?: string | null
          crawl_status?: string | null
          created_at?: string | null
          id?: string
          last_crawled_at?: string | null
          location_id?: string | null
          provider?: string | null
          source_url: string
        }
        Update: {
          camp_id?: string
          crawl_error?: string | null
          crawl_status?: string | null
          created_at?: string | null
          id?: string
          last_crawled_at?: string | null
          location_id?: string | null
          provider?: string | null
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_sources_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camp_sources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "camp_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      camp_synonyms: {
        Row: {
          alias: string
          camp_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          alias: string
          camp_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          alias?: string
          camp_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_synonyms_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          created_at: string | null
          id: string
          name: string
          normalized_name: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          normalized_name?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          normalized_name?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      captcha_events: {
        Row: {
          challenge_url: string | null
          created_at: string
          detected_at: string
          expires_at: string
          id: string
          last_sms_sent_at: string | null
          magic_url: string | null
          meta: Json | null
          provider: string | null
          registration_id: string | null
          resume_token: string | null
          session_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_url?: string | null
          created_at?: string
          detected_at?: string
          expires_at: string
          id?: string
          last_sms_sent_at?: string | null
          magic_url?: string | null
          meta?: Json | null
          provider?: string | null
          registration_id?: string | null
          resume_token?: string | null
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_url?: string | null
          created_at?: string
          detected_at?: string
          expires_at?: string
          id?: string
          last_sms_sent_at?: string | null
          magic_url?: string | null
          meta?: Json | null
          provider?: string | null
          registration_id?: string | null
          resume_token?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_captcha_events_registration"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_captcha_events_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
      otp_attempts: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone_e164: string
          user_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone_e164: string
          user_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_e164?: string
          user_id?: string
          verified?: boolean
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
      provider_profiles: {
        Row: {
          captcha_expected: boolean
          created_at: string
          domain_patterns: string[]
          id: string
          login_type: Database["public"]["Enums"]["provider_login_type"]
          name: string
          notes: string | null
          platform: Database["public"]["Enums"]["provider_platform"]
          updated_at: string
        }
        Insert: {
          captcha_expected?: boolean
          created_at?: string
          domain_patterns?: string[]
          id?: string
          login_type?: Database["public"]["Enums"]["provider_login_type"]
          name: string
          notes?: string | null
          platform: Database["public"]["Enums"]["provider_platform"]
          updated_at?: string
        }
        Update: {
          captcha_expected?: boolean
          created_at?: string
          domain_patterns?: string[]
          id?: string
          login_type?: Database["public"]["Enums"]["provider_login_type"]
          name?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["provider_platform"]
          updated_at?: string
        }
        Relationships: []
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
      registration_locks: {
        Row: {
          expires_at: string
          locked_at: string
          locked_by: string
          registration_id: string
        }
        Insert: {
          expires_at?: string
          locked_at?: string
          locked_by: string
          registration_id: string
        }
        Update: {
          expires_at?: string
          locked_at?: string
          locked_by?: string
          registration_id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          canonical_url: string | null
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
          canonical_url?: string | null
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
          canonical_url?: string | null
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
      search_embeddings: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          kind: string
          ref_id: string
          text: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          kind: string
          ref_id: string
          text: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          kind?: string
          ref_id?: string
          text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          camp_location_id: string | null
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
          camp_location_id?: string | null
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
          camp_location_id?: string | null
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
            foreignKeyName: "sessions_camp_location_id_fkey"
            columns: ["camp_location_id"]
            isOneToOne: false
            referencedRelation: "camp_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_opt_ins: {
        Row: {
          carrier_metadata: Json | null
          created_at: string
          last_opt_in_at: string
          opted_in: boolean
          phone_e164: string
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier_metadata?: Json | null
          created_at?: string
          last_opt_in_at?: string
          opted_in?: boolean
          phone_e164: string
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier_metadata?: Json | null
          created_at?: string
          last_opt_in_at?: string
          opted_in?: boolean
          phone_e164?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_rate_limits: {
        Row: {
          created_at: string
          sent_at: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sent_at?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          sent_at?: string
          template_id?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_sends: {
        Row: {
          created_at: string
          id: string
          message_content: string
          message_sid: string | null
          phone_e164: string
          sent_at: string
          template_id: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_content: string
          message_sid?: string | null
          phone_e164: string
          sent_at?: string
          template_id: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          message_content?: string
          message_sid?: string | null
          phone_e164?: string
          sent_at?: string
          template_id?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          assisted_signup_consent_at: string | null
          backup_email: string | null
          created_at: string
          id: string
          phone_e164: string | null
          phone_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          assisted_signup_consent_at?: string | null
          backup_email?: string | null
          created_at?: string
          id?: string
          phone_e164?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          assisted_signup_consent_at?: string | null
          backup_email?: string | null
          created_at?: string
          id?: string
          phone_e164?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
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
      cleanup_expired_locks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_attempts_count_week: {
        Args: { p_child_id: string; p_tz?: string }
        Returns: number
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      provider_login_type: "none" | "email_password" | "account_required"
      provider_platform:
        | "jackrabbit_class"
        | "daysmart_recreation"
        | "shopify_product"
        | "playmetrics"
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
    Enums: {
      provider_login_type: ["none", "email_password", "account_required"],
      provider_platform: [
        "jackrabbit_class",
        "daysmart_recreation",
        "shopify_product",
        "playmetrics",
      ],
    },
  },
} as const
