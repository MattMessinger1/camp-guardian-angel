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
      ai_extract_logs: {
        Row: {
          created_at: string
          id: string
          model: string
          raw_output: string | null
          retry_count: number
          schema_ok: boolean
          tokens_in: number | null
          tokens_out: number | null
          trap_hit: string[] | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          model: string
          raw_output?: string | null
          retry_count?: number
          schema_ok?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          trap_hit?: string[] | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          raw_output?: string | null
          retry_count?: number
          schema_ok?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          trap_hit?: string[] | null
          url?: string
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
      approval_audit_trail: {
        Row: {
          action_data: Json | null
          action_type: string
          actor_id: string | null
          actor_type: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          new_state: string | null
          previous_state: string | null
          user_agent: string | null
          workflow_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_state?: string | null
          previous_state?: string | null
          user_agent?: string | null
          workflow_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          new_state?: string | null
          previous_state?: string | null
          user_agent?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_audit_trail_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_operations_metrics: {
        Row: {
          approval_rate: number | null
          approved_workflows: number | null
          avg_response_time_minutes: number | null
          captcha_solving_count: number | null
          created_at: string
          declined_workflows: number | null
          expired_workflows: number | null
          form_completion_count: number | null
          id: string
          metric_date: string
          notification_success_rate: number | null
          payment_confirmation_count: number | null
          pending_workflows: number | null
          total_workflows: number | null
        }
        Insert: {
          approval_rate?: number | null
          approved_workflows?: number | null
          avg_response_time_minutes?: number | null
          captcha_solving_count?: number | null
          created_at?: string
          declined_workflows?: number | null
          expired_workflows?: number | null
          form_completion_count?: number | null
          id?: string
          metric_date: string
          notification_success_rate?: number | null
          payment_confirmation_count?: number | null
          pending_workflows?: number | null
          total_workflows?: number | null
        }
        Update: {
          approval_rate?: number | null
          approved_workflows?: number | null
          avg_response_time_minutes?: number | null
          captcha_solving_count?: number | null
          created_at?: string
          declined_workflows?: number | null
          expired_workflows?: number | null
          form_completion_count?: number | null
          id?: string
          metric_date?: string
          notification_success_rate?: number | null
          payment_confirmation_count?: number | null
          pending_workflows?: number | null
          total_workflows?: number | null
        }
        Relationships: []
      }
      approval_workflows: {
        Row: {
          approval_criteria: Json | null
          approval_token: string | null
          approved_at: string | null
          approved_by: string | null
          context_data: Json | null
          created_at: string
          decision_reason: string | null
          declined_at: string | null
          declined_by: string | null
          description: string | null
          expires_at: string
          id: string
          manual_override: boolean | null
          notification_attempts: number | null
          notification_method: string | null
          notification_sent_at: string | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          priority: string
          reservation_id: string | null
          secure_hash: string | null
          session_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          workflow_type: string
        }
        Insert: {
          approval_criteria?: Json | null
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          context_data?: Json | null
          created_at?: string
          decision_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          expires_at: string
          id?: string
          manual_override?: boolean | null
          notification_attempts?: number | null
          notification_method?: string | null
          notification_sent_at?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          priority?: string
          reservation_id?: string | null
          secure_hash?: string | null
          session_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          workflow_type: string
        }
        Update: {
          approval_criteria?: Json | null
          approval_token?: string | null
          approved_at?: string | null
          approved_by?: string | null
          context_data?: Json | null
          created_at?: string
          decision_reason?: string | null
          declined_at?: string | null
          declined_by?: string | null
          description?: string | null
          expires_at?: string
          id?: string
          manual_override?: boolean | null
          notification_attempts?: number | null
          notification_method?: string | null
          notification_sent_at?: string | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          priority?: string
          reservation_id?: string | null
          secure_hash?: string | null
          session_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          workflow_type?: string
        }
        Relationships: []
      }
      attempt_events: {
        Row: {
          created_at: string
          error_type: string | null
          event_category: string | null
          event_type: string
          failure_reason: string | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          provider: string | null
          queue_wait_ms: number | null
          reservation_id: string
          success_indicator: boolean | null
          t0_offset_ms: number | null
        }
        Insert: {
          created_at?: string
          error_type?: string | null
          event_category?: string | null
          event_type: string
          failure_reason?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          provider?: string | null
          queue_wait_ms?: number | null
          reservation_id: string
          success_indicator?: boolean | null
          t0_offset_ms?: number | null
        }
        Update: {
          created_at?: string
          error_type?: string | null
          event_category?: string | null
          event_type?: string
          failure_reason?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          provider?: string | null
          queue_wait_ms?: number | null
          reservation_id?: string
          success_indicator?: boolean | null
          t0_offset_ms?: number | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action: string
          condition: string
          confidence_score: number | null
          created_at: string | null
          enabled: boolean | null
          id: string
          last_updated: string | null
          last_used: string | null
          parameters: Json | null
          priority: number | null
          provider_hostname: string
          rule_type: string
          success_rate: number | null
        }
        Insert: {
          action: string
          condition: string
          confidence_score?: number | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_updated?: string | null
          last_used?: string | null
          parameters?: Json | null
          priority?: number | null
          provider_hostname: string
          rule_type: string
          success_rate?: number | null
        }
        Update: {
          action?: string
          condition?: string
          confidence_score?: number | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_updated?: string | null
          last_used?: string | null
          parameters?: Json | null
          priority?: number | null
          provider_hostname?: string
          rule_type?: string
          success_rate?: number | null
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
      browser_sessions: {
        Row: {
          browser_id: string
          camp_provider_id: string | null
          closed_at: string | null
          compliance_status: string
          created_at: string
          current_url: string | null
          error_count: number
          id: string
          last_activity: string
          metadata: Json | null
          parent_id: string | null
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          browser_id: string
          camp_provider_id?: string | null
          closed_at?: string | null
          compliance_status?: string
          created_at?: string
          current_url?: string | null
          error_count?: number
          id?: string
          last_activity?: string
          metadata?: Json | null
          parent_id?: string | null
          session_id: string
          status: string
          updated_at?: string
        }
        Update: {
          browser_id?: string
          camp_provider_id?: string | null
          closed_at?: string | null
          compliance_status?: string
          created_at?: string
          current_url?: string | null
          error_count?: number
          id?: string
          last_activity?: string
          metadata?: Json | null
          parent_id?: string | null
          session_id?: string
          status?: string
          updated_at?: string
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
      camp_provider_partnerships: {
        Row: {
          api_endpoint: string | null
          confidence_score: number | null
          contact_email: string | null
          created_at: string
          hostname: string
          id: string
          last_contact: string | null
          notes: string | null
          organization_name: string | null
          partnership_type: string | null
          provider_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          confidence_score?: number | null
          contact_email?: string | null
          created_at?: string
          hostname: string
          id?: string
          last_contact?: string | null
          notes?: string | null
          organization_name?: string | null
          partnership_type?: string | null
          provider_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          confidence_score?: number | null
          contact_email?: string | null
          created_at?: string
          hostname?: string
          id?: string
          last_contact?: string | null
          notes?: string | null
          organization_name?: string | null
          partnership_type?: string | null
          provider_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      camp_watch_requests: {
        Row: {
          camp_id: string | null
          camp_name: string
          camp_website: string | null
          created_at: string
          expected_announcement_timeframe: string | null
          id: string
          notification_preferences: Json
          status: string
          updated_at: string
          user_id: string
          user_notes: string | null
        }
        Insert: {
          camp_id?: string | null
          camp_name: string
          camp_website?: string | null
          created_at?: string
          expected_announcement_timeframe?: string | null
          id?: string
          notification_preferences?: Json
          status?: string
          updated_at?: string
          user_id: string
          user_notes?: string | null
        }
        Update: {
          camp_id?: string | null
          camp_name?: string
          camp_website?: string | null
          created_at?: string
          expected_announcement_timeframe?: string | null
          id?: string
          notification_preferences?: Json
          status?: string
          updated_at?: string
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camp_watch_requests_camp_id_fkey"
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
      captcha_cascade_notifications: {
        Row: {
          cancelled_at: string | null
          captcha_event_id: string
          created_at: string
          error_message: string | null
          id: string
          message: string
          notification_type: string
          priority: string
          scheduled_at: string
          sent_at: string | null
          skipped_at: string | null
          skipped_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          captcha_event_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          priority: string
          scheduled_at: string
          sent_at?: string | null
          skipped_at?: string | null
          skipped_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          captcha_event_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          priority?: string
          scheduled_at?: string
          sent_at?: string | null
          skipped_at?: string | null
          skipped_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_captcha_cascade_notifications_captcha_event_id"
            columns: ["captcha_event_id"]
            isOneToOne: false
            referencedRelation: "captcha_events"
            referencedColumns: ["id"]
          },
        ]
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
      cascade_patterns_v2: {
        Row: {
          confidence_score: number | null
          context: Json | null
          created_at: string
          direct_effect: number
          discovery_velocity: number | null
          exploitation_velocity: number | null
          id: string
          improvement_type: string
          last_validated: string | null
          multiplier: number
          pattern_name: string
          total_cascade_effect: number | null
          trigger_description: string
          validation_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          context?: Json | null
          created_at?: string
          direct_effect: number
          discovery_velocity?: number | null
          exploitation_velocity?: number | null
          id?: string
          improvement_type: string
          last_validated?: string | null
          multiplier?: number
          pattern_name: string
          total_cascade_effect?: number | null
          trigger_description: string
          validation_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          context?: Json | null
          created_at?: string
          direct_effect?: number
          discovery_velocity?: number | null
          exploitation_velocity?: number | null
          id?: string
          improvement_type?: string
          last_validated?: string | null
          multiplier?: number
          pattern_name?: string
          total_cascade_effect?: number | null
          trigger_description?: string
          validation_count?: number | null
        }
        Relationships: []
      }
      children: {
        Row: {
          admin_override_reason: string | null
          created_at: string | null
          dob: string
          duplicate_of_child_id: string | null
          fingerprint: string
          id: string
          name: string
          notes: string | null
          parent_id: string
          updated_at: string | null
        }
        Insert: {
          admin_override_reason?: string | null
          created_at?: string | null
          dob: string
          duplicate_of_child_id?: string | null
          fingerprint: string
          id?: string
          name: string
          notes?: string | null
          parent_id: string
          updated_at?: string | null
        }
        Update: {
          admin_override_reason?: string | null
          created_at?: string | null
          dob?: string
          duplicate_of_child_id?: string | null
          fingerprint?: string
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
          {
            foreignKeyName: "fk_children_duplicate_of"
            columns: ["duplicate_of_child_id"]
            isOneToOne: false
            referencedRelation: "children"
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
      clock_sync_events: {
        Row: {
          created_at: string
          drift_ms: number | null
          error_message: string | null
          id: string
          local_time: string
          network_latency_ms: number | null
          parsed_server_time: string | null
          provider_url: string
          request_end_ms: number
          request_start_ms: number
          reservation_id: string
          server_date_header: string | null
          status: string
          sync_type: string
        }
        Insert: {
          created_at?: string
          drift_ms?: number | null
          error_message?: string | null
          id?: string
          local_time?: string
          network_latency_ms?: number | null
          parsed_server_time?: string | null
          provider_url: string
          request_end_ms: number
          request_start_ms: number
          reservation_id: string
          server_date_header?: string | null
          status?: string
          sync_type?: string
        }
        Update: {
          created_at?: string
          drift_ms?: number | null
          error_message?: string | null
          id?: string
          local_time?: string
          network_latency_ms?: number | null
          parsed_server_time?: string | null
          provider_url?: string
          request_end_ms?: number
          request_start_ms?: number
          reservation_id?: string
          server_date_header?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      compliance_audit: {
        Row: {
          created_at: string | null
          delete_after: string | null
          event_data: Json
          event_type: string
          id: string
          ip_address: unknown | null
          payload_summary: string | null
          reservation_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          delete_after?: string | null
          event_data: Json
          event_type: string
          id?: string
          ip_address?: unknown | null
          payload_summary?: string | null
          reservation_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          delete_after?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          ip_address?: unknown | null
          payload_summary?: string | null
          reservation_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      emergency_backups: {
        Row: {
          backup_data: string
          backup_reason: string
          created_at: string | null
          expires_at: string
          id: string
          session_id: string
        }
        Insert: {
          backup_data: string
          backup_reason: string
          created_at?: string | null
          expires_at: string
          id: string
          session_id: string
        }
        Update: {
          backup_data?: string
          backup_reason?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          session_id?: string
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
      hipaa_avoidance_log: {
        Row: {
          compliance_cost_saved: number | null
          created_at: string
          detection_accuracy: number | null
          false_positive_rate: number | null
          id: string
          learning_iteration: number
          provider_domain: string
          risk_level: string
          risky_fields: string[]
          safe_alternatives: Json | null
          sessions_avoided: number
        }
        Insert: {
          compliance_cost_saved?: number | null
          created_at?: string
          detection_accuracy?: number | null
          false_positive_rate?: number | null
          id?: string
          learning_iteration?: number
          provider_domain: string
          risk_level: string
          risky_fields?: string[]
          safe_alternatives?: Json | null
          sessions_avoided?: number
        }
        Update: {
          compliance_cost_saved?: number | null
          created_at?: string
          detection_accuracy?: number | null
          false_positive_rate?: number | null
          id?: string
          learning_iteration?: number
          provider_domain?: string
          risk_level?: string
          risky_fields?: string[]
          safe_alternatives?: Json | null
          sessions_avoided?: number
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
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          priority: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      observability_metrics: {
        Row: {
          created_at: string
          dimensions: Json | null
          id: string
          metric_name: string
          metric_type: string
          recorded_at: string
          value: number
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string
          dimensions?: Json | null
          id?: string
          metric_name: string
          metric_type: string
          recorded_at?: string
          value: number
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string
          dimensions?: Json | null
          id?: string
          metric_name?: string
          metric_type?: string
          recorded_at?: string
          value?: number
          window_end?: string | null
          window_start?: string | null
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
      parent_notification_preferences: {
        Row: {
          approval_timeout_minutes: number | null
          auto_approve_captcha: boolean | null
          auto_approve_form_completion: boolean | null
          auto_approve_payment: boolean | null
          created_at: string
          email_enabled: boolean | null
          id: string
          primary_email: string | null
          primary_phone: string | null
          require_2fa: boolean | null
          secondary_email: string | null
          secondary_phone: string | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_timeout_minutes?: number | null
          auto_approve_captcha?: boolean | null
          auto_approve_form_completion?: boolean | null
          auto_approve_payment?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          primary_email?: string | null
          primary_phone?: string | null
          require_2fa?: boolean | null
          secondary_email?: string | null
          secondary_phone?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_timeout_minutes?: number | null
          auto_approve_captcha?: boolean | null
          auto_approve_form_completion?: boolean | null
          auto_approve_payment?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          primary_email?: string | null
          primary_phone?: string | null
          require_2fa?: boolean | null
          secondary_email?: string | null
          secondary_phone?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
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
      partnership_interactions: {
        Row: {
          contact_email: string | null
          contact_person: string | null
          contact_role: string | null
          created_at: string
          created_by: string | null
          documents_exchanged: string[] | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          interaction_date: string
          interaction_summary: string
          interaction_type: string
          outcome: string | null
          partnership_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_person?: string | null
          contact_role?: string | null
          created_at?: string
          created_by?: string | null
          documents_exchanged?: string[] | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          interaction_date?: string
          interaction_summary: string
          interaction_type: string
          outcome?: string | null
          partnership_id: string
        }
        Update: {
          contact_email?: string | null
          contact_person?: string | null
          contact_role?: string | null
          created_at?: string
          created_by?: string | null
          documents_exchanged?: string[] | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          interaction_date?: string
          interaction_summary?: string
          interaction_type?: string
          outcome?: string | null
          partnership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_interactions_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "camp_provider_partnerships"
            referencedColumns: ["id"]
          },
        ]
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
      preparation_reminders: {
        Row: {
          camp_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string
          reminder_type: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camp_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string
          reminder_type: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camp_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string
          reminder_type?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_reminders_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
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
      provider_intelligence: {
        Row: {
          compliance_status: string
          confidence_score: number | null
          created_at: string | null
          hostname: string
          id: string
          intelligence_data: Json
          last_analyzed: string | null
          provider_id: string | null
          relationship_status: string
        }
        Insert: {
          compliance_status: string
          confidence_score?: number | null
          created_at?: string | null
          hostname: string
          id?: string
          intelligence_data: Json
          last_analyzed?: string | null
          provider_id?: string | null
          relationship_status: string
        }
        Update: {
          compliance_status?: string
          confidence_score?: number | null
          created_at?: string | null
          hostname?: string
          id?: string
          intelligence_data?: Json
          last_analyzed?: string | null
          provider_id?: string | null
          relationship_status?: string
        }
        Relationships: []
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
      queue_events: {
        Row: {
          created_at: string
          estimated_wait: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          position: number | null
          queue_type: string | null
          reservation_id: string
        }
        Insert: {
          created_at?: string
          estimated_wait?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          position?: number | null
          queue_type?: string | null
          reservation_id: string
        }
        Update: {
          created_at?: string
          estimated_wait?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          position?: number | null
          queue_type?: string | null
          reservation_id?: string
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
      readiness_assessments: {
        Row: {
          assessment_data: Json
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assessment_data: Json
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assessment_data?: Json
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "readiness_assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "readiness_assessments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_logs: {
        Row: {
          created_at: string | null
          estimated_data_loss: number | null
          id: string
          next_steps: string[] | null
          scenario_type: string
          session_id: string
          success: boolean
          warnings: string[] | null
        }
        Insert: {
          created_at?: string | null
          estimated_data_loss?: number | null
          id?: string
          next_steps?: string[] | null
          scenario_type: string
          session_id: string
          success: boolean
          warnings?: string[] | null
        }
        Update: {
          created_at?: string | null
          estimated_data_loss?: number | null
          id?: string
          next_steps?: string[] | null
          scenario_type?: string
          session_id?: string
          success?: boolean
          warnings?: string[] | null
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
      reminders: {
        Row: {
          created_at: string
          id: string
          reminder_type: string
          reservation_id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_type: string
          reservation_id: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_type?: string
          reservation_id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_defaults: {
        Row: {
          camp_type: string | null
          common_requirements: Json | null
          confidence_score: number | null
          created_at: string | null
          id: string
          provider_platform: string | null
          typical_deposit_cents: number | null
          updated_at: string | null
        }
        Insert: {
          camp_type?: string | null
          common_requirements?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          provider_platform?: string | null
          typical_deposit_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          camp_type?: string | null
          common_requirements?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          provider_platform?: string | null
          typical_deposit_cents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      research_reminders: {
        Row: {
          call_to_action: string | null
          confidence_level: string | null
          created_at: string | null
          days_until_signup: number | null
          dismissed_at: string | null
          id: string
          message: string
          metadata: Json | null
          priority: number | null
          reminder_type: string
          sent_at: string | null
          session_id: string
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          call_to_action?: string | null
          confidence_level?: string | null
          created_at?: string | null
          days_until_signup?: number | null
          dismissed_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: number | null
          reminder_type: string
          sent_at?: string | null
          session_id: string
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          call_to_action?: string | null
          confidence_level?: string | null
          created_at?: string | null
          days_until_signup?: number | null
          dismissed_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: number | null
          reminder_type?: string
          sent_at?: string | null
          session_id?: string
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reservation_attempts: {
        Row: {
          attempt_no: number
          captcha_pause_ended_at: string | null
          captcha_pause_started_at: string | null
          clock_sync_attempts: number | null
          confirmation_number: string | null
          confirmation_url: string | null
          created_at: string
          detection_patterns_matched: string[] | null
          drift_ms: number | null
          error_message: string | null
          final_classification: string | null
          id: string
          locator_resolution_ms: number | null
          measured_network_latency_ms: number | null
          metadata: Json | null
          pending_review: boolean | null
          preconnect_at: string | null
          proof_screenshot_path: string | null
          provider_clock_synced_at: string | null
          queue_detected: boolean | null
          queue_duration_ms: number | null
          queue_heartbeat_count: number | null
          queue_position: number | null
          reservation_id: string
          started_at: string
          status: string
          submission_nonce: string
          submit_latency_ms: number | null
          submitted_at: string | null
          success_detection_score: number | null
          t0_provider_tz: string | null
          t0_skew_ms: number | null
          t0_user_tz: string | null
          t0_utc: string | null
          total_captcha_pause_ms: number | null
        }
        Insert: {
          attempt_no?: number
          captcha_pause_ended_at?: string | null
          captcha_pause_started_at?: string | null
          clock_sync_attempts?: number | null
          confirmation_number?: string | null
          confirmation_url?: string | null
          created_at?: string
          detection_patterns_matched?: string[] | null
          drift_ms?: number | null
          error_message?: string | null
          final_classification?: string | null
          id?: string
          locator_resolution_ms?: number | null
          measured_network_latency_ms?: number | null
          metadata?: Json | null
          pending_review?: boolean | null
          preconnect_at?: string | null
          proof_screenshot_path?: string | null
          provider_clock_synced_at?: string | null
          queue_detected?: boolean | null
          queue_duration_ms?: number | null
          queue_heartbeat_count?: number | null
          queue_position?: number | null
          reservation_id: string
          started_at?: string
          status?: string
          submission_nonce: string
          submit_latency_ms?: number | null
          submitted_at?: string | null
          success_detection_score?: number | null
          t0_provider_tz?: string | null
          t0_skew_ms?: number | null
          t0_user_tz?: string | null
          t0_utc?: string | null
          total_captcha_pause_ms?: number | null
        }
        Update: {
          attempt_no?: number
          captcha_pause_ended_at?: string | null
          captcha_pause_started_at?: string | null
          clock_sync_attempts?: number | null
          confirmation_number?: string | null
          confirmation_url?: string | null
          created_at?: string
          detection_patterns_matched?: string[] | null
          drift_ms?: number | null
          error_message?: string | null
          final_classification?: string | null
          id?: string
          locator_resolution_ms?: number | null
          measured_network_latency_ms?: number | null
          metadata?: Json | null
          pending_review?: boolean | null
          preconnect_at?: string | null
          proof_screenshot_path?: string | null
          provider_clock_synced_at?: string | null
          queue_detected?: boolean | null
          queue_duration_ms?: number | null
          queue_heartbeat_count?: number | null
          queue_position?: number | null
          reservation_id?: string
          started_at?: string
          status?: string
          submission_nonce?: string
          submit_latency_ms?: number | null
          submitted_at?: string | null
          success_detection_score?: number | null
          t0_provider_tz?: string | null
          t0_skew_ms?: number | null
          t0_user_tz?: string | null
          t0_utc?: string | null
          total_captcha_pause_ms?: number | null
        }
        Relationships: []
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
      reservation_forms: {
        Row: {
          agent_consent_given: boolean | null
          child_dob: string
          child_first_name: string
          child_last_name: string
          consented_at: string | null
          created_at: string
          id: string
          parent_email: string
          parent_first_name: string
          parent_last_name: string
          parent_phone: string
          payment_consent_given: boolean | null
          session_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_consent_given?: boolean | null
          child_dob: string
          child_first_name: string
          child_last_name: string
          consented_at?: string | null
          created_at?: string
          id?: string
          parent_email: string
          parent_first_name: string
          parent_last_name: string
          parent_phone: string
          payment_consent_given?: boolean | null
          session_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_consent_given?: boolean | null
          child_dob?: string
          child_first_name?: string
          child_last_name?: string
          consented_at?: string | null
          created_at?: string
          id?: string
          parent_email?: string
          parent_first_name?: string
          parent_last_name?: string
          parent_phone?: string
          payment_consent_given?: boolean | null
          session_id?: string
          status?: string
          updated_at?: string
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
          last_clock_sync_at: string | null
          parent_id: string
          prereqs: Json | null
          price_fee_cents: number
          provider_clock_drift_ms: number | null
          provider_network_latency_ms: number | null
          provider_platform: string | null
          provider_response: Json | null
          provider_session_key: string | null
          reminder_plan: Json | null
          requires_captcha: boolean | null
          session_id: string
          signup_open_at: string | null
          signup_timezone: string | null
          state: Database["public"]["Enums"]["reservation_state"] | null
          status: Database["public"]["Enums"]["reservation_status"]
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          stripe_setup_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          automation_job_id?: string | null
          child_id: string
          created_at?: string | null
          id?: string
          last_clock_sync_at?: string | null
          parent_id: string
          prereqs?: Json | null
          price_fee_cents?: number
          provider_clock_drift_ms?: number | null
          provider_network_latency_ms?: number | null
          provider_platform?: string | null
          provider_response?: Json | null
          provider_session_key?: string | null
          reminder_plan?: Json | null
          requires_captcha?: boolean | null
          session_id: string
          signup_open_at?: string | null
          signup_timezone?: string | null
          state?: Database["public"]["Enums"]["reservation_state"] | null
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_setup_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          automation_job_id?: string | null
          child_id?: string
          created_at?: string | null
          id?: string
          last_clock_sync_at?: string | null
          parent_id?: string
          prereqs?: Json | null
          price_fee_cents?: number
          provider_clock_drift_ms?: number | null
          provider_network_latency_ms?: number | null
          provider_platform?: string | null
          provider_response?: Json | null
          provider_session_key?: string | null
          reminder_plan?: Json | null
          requires_captcha?: boolean | null
          session_id?: string
          signup_open_at?: string | null
          signup_timezone?: string | null
          state?: Database["public"]["Enums"]["reservation_state"] | null
          status?: Database["public"]["Enums"]["reservation_status"]
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_setup_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      reservations_preflight: {
        Row: {
          alert_sent: boolean | null
          changed_fields: string[] | null
          created_at: string
          diff_summary: Json | null
          error_message: string | null
          id: string
          load_ms: number | null
          login_required: boolean | null
          login_success: boolean | null
          metadata: Json | null
          missing_fields: string[] | null
          previous_snapshot_path: string | null
          reservation_id: string
          run_at: string
          selectors_verified: Json | null
          snapshot_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alert_sent?: boolean | null
          changed_fields?: string[] | null
          created_at?: string
          diff_summary?: Json | null
          error_message?: string | null
          id?: string
          load_ms?: number | null
          login_required?: boolean | null
          login_success?: boolean | null
          metadata?: Json | null
          missing_fields?: string[] | null
          previous_snapshot_path?: string | null
          reservation_id: string
          run_at?: string
          selectors_verified?: Json | null
          snapshot_path?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          alert_sent?: boolean | null
          changed_fields?: string[] | null
          created_at?: string
          diff_summary?: Json | null
          error_message?: string | null
          id?: string
          load_ms?: number | null
          login_required?: boolean | null
          login_success?: boolean | null
          metadata?: Json | null
          missing_fields?: string[] | null
          previous_snapshot_path?: string | null
          reservation_id?: string
          run_at?: string
          selectors_verified?: Json | null
          snapshot_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservations_preflight_reservation_id"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
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
      session_checkpoints: {
        Row: {
          checkpoint_data: Json
          created_at: string | null
          id: string
          queue_position: number | null
          session_id: string
          step_name: string
        }
        Insert: {
          checkpoint_data: Json
          created_at?: string | null
          id?: string
          queue_position?: number | null
          session_id: string
          step_name: string
        }
        Update: {
          checkpoint_data?: Json
          created_at?: string | null
          id?: string
          queue_position?: number | null
          session_id?: string
          step_name?: string
        }
        Relationships: []
      }
      session_requirements: {
        Row: {
          confidence_level: string | null
          created_at: string | null
          custom_requirements: Json | null
          deposit_amount_cents: number | null
          discovery_method: string | null
          last_verified_at: string | null
          needs_verification: boolean | null
          required_child_fields: Json | null
          required_documents: Json | null
          required_parent_fields: Json | null
          research_notes: string | null
          session_id: string
          source_urls: string[] | null
          updated_at: string | null
          verified_by_user_id: string | null
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string | null
          custom_requirements?: Json | null
          deposit_amount_cents?: number | null
          discovery_method?: string | null
          last_verified_at?: string | null
          needs_verification?: boolean | null
          required_child_fields?: Json | null
          required_documents?: Json | null
          required_parent_fields?: Json | null
          research_notes?: string | null
          session_id: string
          source_urls?: string[] | null
          updated_at?: string | null
          verified_by_user_id?: string | null
        }
        Update: {
          confidence_level?: string | null
          created_at?: string | null
          custom_requirements?: Json | null
          deposit_amount_cents?: number | null
          discovery_method?: string | null
          last_verified_at?: string | null
          needs_verification?: boolean | null
          required_child_fields?: Json | null
          required_documents?: Json | null
          required_parent_fields?: Json | null
          research_notes?: string | null
          session_id?: string
          source_urls?: string[] | null
          updated_at?: string | null
          verified_by_user_id?: string | null
        }
        Relationships: []
      }
      session_states: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          provider_id: string | null
          provider_url: string
          session_id: string
          state_data: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          provider_id?: string | null
          provider_url: string
          session_id: string
          state_data: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          provider_id?: string | null
          provider_url?: string
          session_id?: string
          state_data?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          evidence_snippet: string | null
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
          queue_estimated_wait: string | null
          queue_joined_at: string | null
          queue_position: number | null
          queue_status: string | null
          queue_type: string | null
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
          evidence_snippet?: string | null
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
          queue_estimated_wait?: string | null
          queue_joined_at?: string | null
          queue_position?: number | null
          queue_status?: string | null
          queue_type?: string | null
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
          evidence_snippet?: string | null
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
          queue_estimated_wait?: string | null
          queue_joined_at?: string | null
          queue_position?: number | null
          queue_status?: string | null
          queue_type?: string | null
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
      signup_learnings: {
        Row: {
          accuracy_score: number | null
          actual_deposit_cents: number | null
          actual_requirements: Json | null
          created_at: string | null
          difficulty_rating: number | null
          discovery_method: string | null
          id: string
          missing_predictions: Json | null
          session_id: string | null
          signup_success: boolean | null
          unexpected_requirements: Json | null
          user_feedback: string | null
          user_id: string | null
        }
        Insert: {
          accuracy_score?: number | null
          actual_deposit_cents?: number | null
          actual_requirements?: Json | null
          created_at?: string | null
          difficulty_rating?: number | null
          discovery_method?: string | null
          id?: string
          missing_predictions?: Json | null
          session_id?: string | null
          signup_success?: boolean | null
          unexpected_requirements?: Json | null
          user_feedback?: string | null
          user_id?: string | null
        }
        Update: {
          accuracy_score?: number | null
          actual_deposit_cents?: number | null
          actual_requirements?: Json | null
          created_at?: string | null
          difficulty_rating?: number | null
          discovery_method?: string | null
          id?: string
          missing_predictions?: Json | null
          session_id?: string | null
          signup_success?: boolean | null
          unexpected_requirements?: Json | null
          user_feedback?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signup_learnings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "signup_learnings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
      text_verification_reminders: {
        Row: {
          camp_name: string
          created_at: string
          error_message: string | null
          id: string
          phone_e164: string
          reminder_type: string
          scheduled_at: string
          sent_at: string | null
          session_id: string
          signup_datetime: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          camp_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          phone_e164: string
          reminder_type: string
          scheduled_at: string
          sent_at?: string | null
          session_id: string
          signup_datetime: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          camp_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          phone_e164?: string
          reminder_type?: string
          scheduled_at?: string
          sent_at?: string | null
          session_id?: string
          signup_datetime?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "text_verification_reminders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "text_verification_reminders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tos_change_log: {
        Row: {
          change_analysis: Json | null
          change_detected_at: string
          created_at: string
          hostname: string
          id: string
          impact_on_automation: string | null
          new_analysis: Json | null
          previous_analysis: Json | null
          recommended_action: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          significance: string | null
          url: string
        }
        Insert: {
          change_analysis?: Json | null
          change_detected_at?: string
          created_at?: string
          hostname: string
          id?: string
          impact_on_automation?: string | null
          new_analysis?: Json | null
          previous_analysis?: Json | null
          recommended_action?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          significance?: string | null
          url: string
        }
        Update: {
          change_analysis?: Json | null
          change_detected_at?: string
          created_at?: string
          hostname?: string
          id?: string
          impact_on_automation?: string | null
          new_analysis?: Json | null
          previous_analysis?: Json | null
          recommended_action?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          significance?: string | null
          url?: string
        }
        Relationships: []
      }
      tos_compliance_cache: {
        Row: {
          analysis_result: Json
          created_at: string
          expires_at: string
          hostname: string | null
          id: string
          url: string
        }
        Insert: {
          analysis_result: Json
          created_at?: string
          expires_at: string
          hostname?: string | null
          id?: string
          url: string
        }
        Update: {
          analysis_result?: Json
          created_at?: string
          expires_at?: string
          hostname?: string | null
          id?: string
          url?: string
        }
        Relationships: []
      }
      tos_monitoring_schedule: {
        Row: {
          created_at: string
          error_count: number
          frequency: string
          hostname: string
          id: string
          last_change_detected: string | null
          last_checked: string | null
          metadata: Json | null
          next_check: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          error_count?: number
          frequency: string
          hostname: string
          id?: string
          last_change_detected?: string | null
          last_checked?: string | null
          metadata?: Json | null
          next_check: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          error_count?: number
          frequency?: string
          hostname?: string
          id?: string
          last_change_detected?: string | null
          last_checked?: string | null
          metadata?: Json | null
          next_check?: string
          status?: string
          updated_at?: string
          url?: string
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
      user_requirement_research: {
        Row: {
          confidence_rating: number | null
          created_at: string | null
          deposit_amount_cents: number | null
          found_requirements: Json | null
          id: string
          research_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          source_urls: string[] | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          confidence_rating?: number | null
          created_at?: string | null
          deposit_amount_cents?: number | null
          found_requirements?: Json | null
          id?: string
          research_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          source_urls?: string[] | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          confidence_rating?: number | null
          created_at?: string | null
          deposit_amount_cents?: number | null
          found_requirements?: Json | null
          id?: string
          research_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          source_urls?: string[] | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_requirement_research_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "user_requirement_research_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_session_readiness: {
        Row: {
          blocked_items: Json | null
          collected_data: Json | null
          communication_cadence: string | null
          completed_items: Json | null
          completion_percentage: number | null
          confidence_in_requirements: string | null
          created_at: string | null
          id: string
          last_reminder_sent: string | null
          last_reminder_sent_at: string | null
          next_reminder_due_at: string | null
          ready_for_signup: boolean | null
          reminder_count: number | null
          required_items: Json | null
          research_completed_at: string | null
          research_requested_at: string | null
          session_id: string
          updated_at: string | null
          user_id: string
          user_researched: boolean | null
        }
        Insert: {
          blocked_items?: Json | null
          collected_data?: Json | null
          communication_cadence?: string | null
          completed_items?: Json | null
          completion_percentage?: number | null
          confidence_in_requirements?: string | null
          created_at?: string | null
          id?: string
          last_reminder_sent?: string | null
          last_reminder_sent_at?: string | null
          next_reminder_due_at?: string | null
          ready_for_signup?: boolean | null
          reminder_count?: number | null
          required_items?: Json | null
          research_completed_at?: string | null
          research_requested_at?: string | null
          session_id: string
          updated_at?: string | null
          user_id: string
          user_researched?: boolean | null
        }
        Update: {
          blocked_items?: Json | null
          collected_data?: Json | null
          communication_cadence?: string | null
          completed_items?: Json | null
          completion_percentage?: number | null
          confidence_in_requirements?: string | null
          created_at?: string | null
          id?: string
          last_reminder_sent?: string | null
          last_reminder_sent_at?: string | null
          next_reminder_due_at?: string | null
          ready_for_signup?: boolean | null
          reminder_count?: number | null
          required_items?: Json | null
          research_completed_at?: string | null
          research_requested_at?: string | null
          session_id?: string
          updated_at?: string | null
          user_id?: string
          user_researched?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_session_readiness_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mv_sessions_search"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "user_session_readiness_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      velocity_metrics: {
        Row: {
          acceleration: number | null
          cascade_multiplier: number | null
          created_at: string
          current_value: number
          downstream_effects: Json | null
          id: string
          measurement_time: string
          metric_name: string
          projected_12w: number | null
          projected_1w: number | null
          projected_4w: number | null
          provider_domain: string | null
          velocity: number | null
          velocity_confidence: number | null
        }
        Insert: {
          acceleration?: number | null
          cascade_multiplier?: number | null
          created_at?: string
          current_value: number
          downstream_effects?: Json | null
          id?: string
          measurement_time?: string
          metric_name: string
          projected_12w?: number | null
          projected_1w?: number | null
          projected_4w?: number | null
          provider_domain?: string | null
          velocity?: number | null
          velocity_confidence?: number | null
        }
        Update: {
          acceleration?: number | null
          cascade_multiplier?: number | null
          created_at?: string
          current_value?: number
          downstream_effects?: Json | null
          id?: string
          measurement_time?: string
          metric_name?: string
          projected_12w?: number | null
          projected_1w?: number | null
          projected_4w?: number | null
          provider_domain?: string | null
          velocity?: number | null
          velocity_confidence?: number | null
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
          name: string | null
          search_tsv: unknown | null
          sessions_json: Json | null
          state: string | null
        }
        Relationships: []
      }
      attempt_analytics_mv: {
        Row: {
          avg_latency_ms: number | null
          event_count: number | null
          event_type: string | null
          failure_count: number | null
          median_latency_ms: number | null
          minute_bucket: string | null
          p95_latency_ms: number | null
          provider: string | null
          success_count: number | null
          success_rate: number | null
        }
        Relationships: []
      }
      metrics_dashboard: {
        Row: {
          avg_latency_ms: number | null
          avg_queue_wait_ms: number | null
          failure_events: number | null
          fees_captured_count: number | null
          fees_failed_count: number | null
          p95_latency_ms: number | null
          pm_coverage_pct: number | null
          pm_missing_count: number | null
          pm_present_count: number | null
          success_events: number | null
          success_fee_capture_rate_pct: number | null
          time_bucket: string | null
          total_events: number | null
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
      registration_funnels_mv: {
        Row: {
          attempt_success_rate: number | null
          failed_attempts: number | null
          failed_registrations: number | null
          funnel_date: string | null
          last_refreshed: string | null
          pending_registrations: number | null
          provider_domain: string | null
          registration_success_rate: number | null
          session_to_registration_rate: number | null
          stages: Json | null
          successful_attempts: number | null
          successful_registrations: number | null
          total_attempts: number | null
          total_registrations: number | null
          unique_children: number | null
          unique_sessions: number | null
        }
        Relationships: []
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
      calculate_communication_cadence: {
        Args: { days_until_signup: number }
        Returns: string
      }
      calculate_partnership_effectiveness: {
        Args: { p_partnership_id: string }
        Returns: number
      }
      calculate_pattern_effectiveness: {
        Args: { p_pattern_id: string }
        Returns: number
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
      collect_automated_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      compute_child_fingerprint: {
        Args: { p_dob: string; p_name: string }
        Returns: string
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
      get_next_reminder_time: {
        Args: { cadence: string; last_sent?: string }
        Returns: string
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
      log_compliance_event: {
        Args: {
          p_event_data: Json
          p_event_type: string
          p_ip_address?: unknown
          p_reservation_id?: string
          p_session_id?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
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
      record_metric: {
        Args: {
          p_dimensions?: Json
          p_metric_name: string
          p_metric_type: string
          p_value: number
          p_window_end?: string
          p_window_start?: string
        }
        Returns: string
      }
      record_observability_event: {
        Args: {
          p_event_category?: string
          p_event_type: string
          p_failure_reason?: string
          p_latency_ms?: number
          p_metadata?: Json
          p_queue_wait_ms?: number
          p_reservation_id: string
          p_success?: boolean
          p_t0_offset_ms?: number
        }
        Returns: string
      }
      refresh_activity_sessions_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_attempt_analytics_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_mv_sessions_search: {
        Args: { concurrent?: boolean }
        Returns: undefined
      }
      refresh_registration_funnels_mv: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      register_session_legacy: {
        Args: { registration_id: string }
        Returns: Json
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
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
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
      reservation_state:
        | "info_collected"
        | "account_setup"
        | "scheduled"
        | "action_required"
        | "success"
        | "failed"
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
      reservation_state: [
        "info_collected",
        "account_setup",
        "scheduled",
        "action_required",
        "success",
        "failed",
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
