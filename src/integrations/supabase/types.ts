export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          canonical_url: string | null
          city: string | null
          created_at: string | null
          description: string | null
          embedding: string | null
          id: string
          kind: string | null
          name: string
          provider_id: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          kind?: string | null
          name: string
          provider_id?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          id?: string
          kind?: string | null
          name?: string
          provider_id?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
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
          created_at: string | null
          dob: string
          id: string
          name: string
          notes: string | null
          parent_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dob: string
          id?: string
          name: string
          notes?: string | null
          parent_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dob?: string
          id?: string
          name?: string
          notes?: string | null
          parent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      children_old: {
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
      fetch_audit: {
        Row: {
          content_length: number | null
          created_at: string
          delete_after: string
          fetch_duration_ms: number | null
          host: string
          id: string
          ip_address: unknown | null
          rate_limited: boolean | null
          reason: string | null
          response_code: number | null
          robots_allowed: boolean | null
          status: string
          url: string
          user_agent: string | null
        }
        Insert: {
          content_length?: number | null
          created_at?: string
          delete_after?: string
          fetch_duration_ms?: number | null
          host: string
          id?: string
          ip_address?: unknown | null
          rate_limited?: boolean | null
          reason?: string | null
          response_code?: number | null
          robots_allowed?: boolean | null
          status: string
          url: string
          user_agent?: string | null
        }
        Update: {
          content_length?: number | null
          created_at?: string
          delete_after?: string
          fetch_duration_ms?: number | null
          host?: string
          id?: string
          ip_address?: unknown | null
          rate_limited?: boolean | null
          reason?: string | null
          response_code?: number | null
          robots_allowed?: boolean | null
          status?: string
          url?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      geocode_cache: {
        Row: {
          created_at: string
          lat: number | null
          lng: number | null
          query: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          lat?: number | null
          lng?: number | null
          query: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          lat?: number | null
          lng?: number | null
          query?: string
          updated_at?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          delete_after: string
          endpoint: string
          key: string
          request_hash: string
          response_data: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delete_after?: string
          endpoint: string
          key: string
          request_hash: string
          response_data?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delete_after?: string
          endpoint?: string
          key?: string
          request_hash?: string
          response_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      open_detection_logs: {
        Row: {
          id: string
          note: string | null
          plan_id: string
          seen_at: string
          signal: string | null
        }
        Insert: {
          id?: string
          note?: string | null
          plan_id: string
          seen_at?: string
          signal?: string | null
        }
        Update: {
          id?: string
          note?: string | null
          plan_id?: string
          seen_at?: string
          signal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_detection_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "registration_plans"
            referencedColumns: ["id"]
          },
        ]
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
      parents: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      plan_children_map: {
        Row: {
          child_id: string
          conflict_resolution: string | null
          created_at: string | null
          id: string
          plan_id: string
          priority: number | null
          session_ids: string[]
          updated_at: string | null
        }
        Insert: {
          child_id: string
          conflict_resolution?: string | null
          created_at?: string | null
          id?: string
          plan_id: string
          priority?: number | null
          session_ids?: string[]
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          conflict_resolution?: string | null
          created_at?: string | null
          id?: string
          plan_id?: string
          priority?: number | null
          session_ids?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_children_map_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_old"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_children_map_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "registration_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          is_backup: boolean | null
          plan_id: string
          priority: number | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          is_backup?: boolean | null
          plan_id: string
          priority?: number | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          is_backup?: boolean | null
          plan_id?: string
          priority?: number | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_items_child_id"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_old"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_items_plan_id"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "registration_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_items_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "fk_plan_items_session_id"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "prewarm_jobs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_credentials: {
        Row: {
          amount_strategy: string | null
          camp_id: string | null
          id: string
          payment_type: string | null
          updated_at: string | null
          user_id: string
          vgs_password_alias: string
          vgs_payment_alias: string | null
          vgs_username_alias: string
        }
        Insert: {
          amount_strategy?: string | null
          camp_id?: string | null
          id?: string
          payment_type?: string | null
          updated_at?: string | null
          user_id: string
          vgs_password_alias?: string
          vgs_payment_alias?: string | null
          vgs_username_alias?: string
        }
        Update: {
          amount_strategy?: string | null
          camp_id?: string | null
          id?: string
          payment_type?: string | null
          updated_at?: string | null
          user_id?: string
          vgs_password_alias?: string
          vgs_payment_alias?: string | null
          vgs_username_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_credentials_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
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
          homepage: string | null
          id: string
          logo_url: string | null
          name: string | null
          platform_hint: string | null
          site_url: string | null
          stripe_connect_id: string | null
        }
        Insert: {
          created_at?: string
          homepage?: string | null
          id?: string
          logo_url?: string | null
          name?: string | null
          platform_hint?: string | null
          site_url?: string | null
          stripe_connect_id?: string | null
        }
        Update: {
          created_at?: string
          homepage?: string | null
          id?: string
          logo_url?: string | null
          name?: string | null
          platform_hint?: string | null
          site_url?: string | null
          stripe_connect_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          delete_after: string
          endpoint: string
          id: string
          ip_address: unknown | null
          request_count: number
          user_id: string | null
          window_start: string
        }
        Insert: {
          created_at?: string
          delete_after?: string
          endpoint: string
          id?: string
          ip_address?: unknown | null
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Update: {
          created_at?: string
          delete_after?: string
          endpoint?: string
          id?: string
          ip_address?: unknown | null
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      raw_pages: {
        Row: {
          content_length: number | null
          content_type: string | null
          created_at: string
          fetched_at: string
          hash: string | null
          html: string | null
          http_status: number | null
          id: string
          source_id: string
          url: string
        }
        Insert: {
          content_length?: number | null
          content_type?: string | null
          created_at?: string
          fetched_at?: string
          hash?: string | null
          html?: string | null
          http_status?: number | null
          id?: string
          source_id: string
          url: string
        }
        Update: {
          content_length?: number | null
          content_type?: string | null
          created_at?: string
          fetched_at?: string
          hash?: string | null
          html?: string | null
          http_status?: number | null
          id?: string
          source_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "children_old"
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
      registration_plans: {
        Row: {
          account_mode: string | null
          camp_id: string | null
          child_id: string | null
          created_at: string | null
          detect_url: string | null
          id: string
          manual_open_at: string | null
          open_strategy: string | null
          preflight_status: string | null
          rules: Json | null
          session_id: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_mode?: string | null
          camp_id?: string | null
          child_id?: string | null
          created_at?: string | null
          detect_url?: string | null
          id?: string
          manual_open_at?: string | null
          open_strategy?: string | null
          preflight_status?: string | null
          rules?: Json | null
          session_id?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_mode?: string | null
          camp_id?: string | null
          child_id?: string | null
          created_at?: string | null
          detect_url?: string | null
          id?: string
          manual_open_at?: string | null
          open_strategy?: string | null
          preflight_status?: string | null
          rules?: Json | null
          session_id?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_plans_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_plans_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_old"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_plans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "registration_plans_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          canonical_url: string | null
          child_id: string
          client_ip: string | null
          completed_at: string | null
          device_fingerprint: string | null
          error_recovery: string | null
          fallback_strategy: string | null
          id: string
          plan_id: string | null
          priority_opt_in: boolean
          processed_at: string | null
          provider_confirmation_id: string | null
          requested_at: string
          result_message: string | null
          retry_attempts: number | null
          retry_delay_ms: number | null
          review_flag: boolean
          scheduled_time: string | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          canonical_url?: string | null
          child_id: string
          client_ip?: string | null
          completed_at?: string | null
          device_fingerprint?: string | null
          error_recovery?: string | null
          fallback_strategy?: string | null
          id?: string
          plan_id?: string | null
          priority_opt_in?: boolean
          processed_at?: string | null
          provider_confirmation_id?: string | null
          requested_at?: string
          result_message?: string | null
          retry_attempts?: number | null
          retry_delay_ms?: number | null
          review_flag?: boolean
          scheduled_time?: string | null
          session_id: string
          status: string
          user_id: string
        }
        Update: {
          canonical_url?: string | null
          child_id?: string
          client_ip?: string | null
          completed_at?: string | null
          device_fingerprint?: string | null
          error_recovery?: string | null
          fallback_strategy?: string | null
          id?: string
          plan_id?: string | null
          priority_opt_in?: boolean
          processed_at?: string | null
          provider_confirmation_id?: string | null
          requested_at?: string
          result_message?: string | null
          retry_attempts?: number | null
          retry_delay_ms?: number | null
          review_flag?: boolean
          scheduled_time?: string | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children_old"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "registration_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
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
      reservation_audit: {
        Row: {
          action: string
          created_at: string
          delete_after: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          delete_after?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          delete_after?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      reservation_holds: {
        Row: {
          address_enc: string | null
          child_age_bracket:
            | Database["public"]["Enums"]["child_age_bracket"]
            | null
          child_birth_year: number | null
          child_initials: string | null
          child_name_enc: string | null
          created_at: string
          delete_after: string
          hold_expires_at: string
          hold_token: string | null
          id: string
          parent_email: string | null
          parent_name_enc: string | null
          parent_phone_e164: string | null
          priority_rank: number | null
          provider_session_key: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["hold_status"]
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_enc?: string | null
          child_age_bracket?:
            | Database["public"]["Enums"]["child_age_bracket"]
            | null
          child_birth_year?: number | null
          child_initials?: string | null
          child_name_enc?: string | null
          created_at?: string
          delete_after?: string
          hold_expires_at: string
          hold_token?: string | null
          id?: string
          parent_email?: string | null
          parent_name_enc?: string | null
          parent_phone_e164?: string | null
          priority_rank?: number | null
          provider_session_key?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["hold_status"]
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_enc?: string | null
          child_age_bracket?:
            | Database["public"]["Enums"]["child_age_bracket"]
            | null
          child_birth_year?: number | null
          child_initials?: string | null
          child_name_enc?: string | null
          created_at?: string
          delete_after?: string
          hold_expires_at?: string
          hold_token?: string | null
          id?: string
          parent_email?: string | null
          parent_name_enc?: string | null
          parent_phone_e164?: string | null
          priority_rank?: number | null
          provider_session_key?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["hold_status"]
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_holds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reservation_holds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          automation_job_id: string | null
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
          price_fee_cents: number
          provider_platform: string | null
          provider_response: Json | null
          provider_session_key: string | null
          requires_captcha: boolean | null
          session_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          automation_job_id?: string | null
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
          price_fee_cents?: number
          provider_platform?: string | null
          provider_response?: Json | null
          provider_session_key?: string | null
          requires_captcha?: boolean | null
          session_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          automation_job_id?: string | null
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
          price_fee_cents?: number
          provider_platform?: string | null
          provider_response?: Json | null
          provider_session_key?: string | null
          requires_captcha?: boolean | null
          session_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reservations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      search_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          query_hash: string
          query_params: Json
          results: Json
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          query_hash: string
          query_params: Json
          results: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          query_hash?: string
          query_params?: Json
          results?: Json
        }
        Relationships: []
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
      search_events: {
        Row: {
          action: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit: {
        Row: {
          created_at: string | null
          event: string
          id: string
          ip: unknown | null
          metadata: Json | null
          ua: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          ip?: unknown | null
          metadata?: Json | null
          ua?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          ip?: unknown | null
          metadata?: Json | null
          ua?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_candidates: {
        Row: {
          confidence: number | null
          created_at: string
          duplicate_of: string | null
          embedding: string | null
          extracted_json: Json
          id: string
          is_duplicate: boolean | null
          notes: string | null
          processed_at: string | null
          similarity_score: number | null
          source_id: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          duplicate_of?: string | null
          embedding?: string | null
          extracted_json: Json
          id?: string
          is_duplicate?: boolean | null
          notes?: string | null
          processed_at?: string | null
          similarity_score?: number | null
          source_id: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          duplicate_of?: string | null
          embedding?: string | null
          extracted_json?: Json
          id?: string
          is_duplicate?: boolean | null
          notes?: string | null
          processed_at?: string | null
          similarity_score?: number | null
          source_id?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_candidates_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "session_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_candidates_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          activity_id: string | null
          age_max: number | null
          age_min: number | null
          availability_status: string | null
          camp_location_id: string | null
          capacity: number | null
          created_at: string
          days_of_week: string[] | null
          embedding: string | null
          end_at: string | null
          end_date: string | null
          high_demand: boolean
          id: string
          last_verified_at: string | null
          lat: number | null
          lng: number | null
          location: string | null
          location_city: string | null
          location_state: string | null
          name: string | null
          open_time_exact: boolean
          platform: string | null
          price_max: number | null
          price_min: number | null
          provider_id: string | null
          provider_session_key: string | null
          registration_open_at: string | null
          signup_url: string | null
          source_id: string | null
          source_url: string | null
          spots_available: number | null
          start_at: string | null
          start_date: string | null
          title: string | null
          upfront_fee_cents: number | null
        }
        Insert: {
          activity_id?: string | null
          age_max?: number | null
          age_min?: number | null
          availability_status?: string | null
          camp_location_id?: string | null
          capacity?: number | null
          created_at?: string
          days_of_week?: string[] | null
          embedding?: string | null
          end_at?: string | null
          end_date?: string | null
          high_demand?: boolean
          id?: string
          last_verified_at?: string | null
          lat?: number | null
          lng?: number | null
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          open_time_exact?: boolean
          platform?: string | null
          price_max?: number | null
          price_min?: number | null
          provider_id?: string | null
          provider_session_key?: string | null
          registration_open_at?: string | null
          signup_url?: string | null
          source_id?: string | null
          source_url?: string | null
          spots_available?: number | null
          start_at?: string | null
          start_date?: string | null
          title?: string | null
          upfront_fee_cents?: number | null
        }
        Update: {
          activity_id?: string | null
          age_max?: number | null
          age_min?: number | null
          availability_status?: string | null
          camp_location_id?: string | null
          capacity?: number | null
          created_at?: string
          days_of_week?: string[] | null
          embedding?: string | null
          end_at?: string | null
          end_date?: string | null
          high_demand?: boolean
          id?: string
          last_verified_at?: string | null
          lat?: number | null
          lng?: number | null
          location?: string | null
          location_city?: string | null
          location_state?: string | null
          name?: string | null
          open_time_exact?: boolean
          platform?: string | null
          price_max?: number | null
          price_min?: number | null
          provider_id?: string | null
          provider_session_key?: string | null
          registration_open_at?: string | null
          signup_url?: string | null
          source_id?: string | null
          source_url?: string | null
          spots_available?: number | null
          start_at?: string | null
          start_date?: string | null
          title?: string | null
          upfront_fee_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions_mv"
            referencedColumns: ["activity_id"]
          },
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
          {
            foreignKeyName: "sessions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_clicks: {
        Row: {
          clicked_at: string
          created_at: string
          id: string
          ip_address: unknown | null
          referrer: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          referrer?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signup_reminders: {
        Row: {
          created_at: string
          email: string
          id: string
          reminder_type: string
          sent_at: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reminder_type?: string
          sent_at?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
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
      sms_verifications: {
        Row: {
          code_hash: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          reservation_id: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          reservation_id: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          reservation_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_verifications_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          base_url: string
          created_at: string
          id: string
          last_crawled_at: string | null
          notes: string | null
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          id?: string
          last_crawled_at?: string | null
          notes?: string | null
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          id?: string
          last_crawled_at?: string | null
          notes?: string | null
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      successful_signups: {
        Row: {
          amount_cents: number | null
          confirmed_at: string
          created_at: string
          id: string
          ip_address: unknown | null
          notes: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          confirmed_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          notes?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          confirmed_at?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          notes?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          recorded_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          recorded_at?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          recorded_at?: string
          value?: number
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
      activity_sessions_mv: {
        Row: {
          activity_id: string | null
          city: string | null
          embedding: string | null
          kind: string | null
          name: string | null
          search_tsv: unknown | null
          sessions_json: Json | null
          state: string | null
        }
        Relationships: []
      }
      mv_sessions_search: {
        Row: {
          activity_id: string | null
          activity_name: string | null
          age_max: number | null
          age_min: number | null
          availability_status: string | null
          capacity: number | null
          city: string | null
          embedding: string | null
          end_date: string | null
          last_verified_at: string | null
          location_name: string | null
          name: string | null
          platform: string | null
          price_max: number | null
          price_min: number | null
          provider_id: string | null
          session_end_date: string | null
          session_id: string | null
          session_start_date: string | null
          signup_url: string | null
          spots_available: number | null
          start_date: string | null
          state: string | null
          title: string | null
          tsv: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions_mv"
            referencedColumns: ["activity_id"]
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
    }
    Functions: {
      allocate_registrations: {
        Args: { p_max_sessions?: number }
        Returns: {
          accepted: string[]
          rejected: string[]
          session_id: string
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
        Args: { p_child_id: string; p_end: string; p_start: string }
        Returns: boolean
      }
      cleanup_expired_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_locks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_fetch_audit: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_search_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_session_duplicates: {
        Args: {
          p_candidate_id: string
          p_embedding: string
          p_threshold?: number
        }
        Returns: {
          duplicate_id: string
          reason: string
          similarity: number
        }[]
      }
      get_attempts_count_week: {
        Args: { p_child_id: string; p_tz?: string }
        Returns: number
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
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
      match_embeddings: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          kind: string
          ref_id: string
          similarity: number
          text: string
        }[]
      }
      refresh_activity_sessions_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_mv_sessions_search: {
        Args: { concurrent?: boolean }
        Returns: undefined
      }
      search_hybrid: {
        Args: {
          p_age_max: number
          p_age_min: number
          p_availability: string
          p_city: string
          p_date_from: string
          p_date_to: string
          p_limit: number
          p_offset: number
          p_price_max: number
          p_state: string
          q: string
          q_embedding: string
        }
        Returns: {
          activity_id: string
          city: string
          freshness_score: number
          keyword_score: number
          name: string
          score: number
          sessions: Json
          state: string
          vector_score: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
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
      child_age_bracket:
        | "under_5"
        | "5_to_8"
        | "9_to_12"
        | "13_to_17"
        | "18_plus"
      hold_status: "active" | "expired" | "converted" | "cancelled"
      provider_login_type: "none" | "email_password" | "account_required"
      provider_platform:
        | "jackrabbit_class"
        | "daysmart_recreation"
        | "shopify_product"
        | "playmetrics"
      reservation_status:
        | "pending"
        | "needs_user_action"
        | "confirmed"
        | "failed"
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
      child_age_bracket: [
        "under_5",
        "5_to_8",
        "9_to_12",
        "13_to_17",
        "18_plus",
      ],
      hold_status: ["active", "expired", "converted", "cancelled"],
      provider_login_type: ["none", "email_password", "account_required"],
      provider_platform: [
        "jackrabbit_class",
        "daysmart_recreation",
        "shopify_product",
        "playmetrics",
      ],
      reservation_status: [
        "pending",
        "needs_user_action",
        "confirmed",
        "failed",
      ],
    },
  },
} as const
