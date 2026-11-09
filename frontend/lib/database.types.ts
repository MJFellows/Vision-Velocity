// Generated from the live Supabase schema (project kajhrbwxlzulqqissvwl, schema public)
// on 2026-11-09. Regenerate with: npm run db:types (see claude/data-model.md).
// Do not edit by hand.

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_action_log: {
        Row: {
          action: string
          admin_user_id: string | null
          changes: Json | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          error_detail: string | null
          id: string
          ip_address: unknown
          record_ids: Json
          request_params: Json | null
          status: Database["public"]["Enums"]["admin_action_status"]
          timestamp: string
          user_agent: string | null
          user_email: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          changes?: Json | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_detail?: string | null
          id?: string
          ip_address?: unknown
          record_ids?: Json
          request_params?: Json | null
          status?: Database["public"]["Enums"]["admin_action_status"]
          timestamp?: string
          user_agent?: string | null
          user_email: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          changes?: Json | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_detail?: string | null
          id?: string
          ip_address?: unknown
          record_ids?: Json
          request_params?: Json | null
          status?: Database["public"]["Enums"]["admin_action_status"]
          timestamp?: string
          user_agent?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_deleted: boolean
          mobile_access_enabled: boolean
          name: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          is_deleted?: boolean
          mobile_access_enabled?: boolean
          name?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          mobile_access_enabled?: boolean
          name?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          changes_after: Json | null
          changes_before: Json | null
          id: string
          ip_address: unknown
          performed_by: string
          reason: string | null
          record_id: string
          table_name: string
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          changes_after?: Json | null
          changes_before?: Json | null
          id?: string
          ip_address?: unknown
          performed_by: string
          reason?: string | null
          record_id: string
          table_name: string
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          changes_after?: Json | null
          changes_before?: Json | null
          id?: string
          ip_address?: unknown
          performed_by?: string
          reason?: string | null
          record_id?: string
          table_name?: string
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      automated_emails: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          kind: string
          recipients: string
          record_id: string | null
          run_date: string | null
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          recipients: string
          record_id?: string | null
          run_date?: string | null
          status: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          recipients?: string
          record_id?: string | null
          run_date?: string | null
          status?: string
        }
        Relationships: []
      }
      bunnings_ao_magic_links: {
        Row: {
          activities_officer_email: string
          bunnings_store_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          activities_officer_email: string
          bunnings_store_id: string
          created_at?: string
          expires_at: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          activities_officer_email?: string
          bunnings_store_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bunnings_ao_magic_links_bunnings_store_id_fkey"
            columns: ["bunnings_store_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["bunnings_store_id"]
          },
          {
            foreignKeyName: "bunnings_ao_magic_links_bunnings_store_id_fkey"
            columns: ["bunnings_store_id"]
            isOneToOne: false
            referencedRelation: "bunnings_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      bunnings_stores: {
        Row: {
          activities_officer_email: string | null
          activities_officer_name: string | null
          activities_officer_phone: string | null
          bunnings_store_id: string | null
          created_at: string
          discovered_by: Database["public"]["Enums"]["owner_person"] | null
          discovered_date: string | null
          id: string
          interaction_notes: string | null
          is_active: boolean
          is_deleted: boolean
          latitude: number | null
          location: string
          longitude: number | null
          map_url: string | null
          opening_hours: Json | null
          opening_hours_raw: string | null
          postcode: string | null
          services: string[]
          source: string
          state: string | null
          store_address: string | null
          store_email: string | null
          store_fax: string | null
          store_manager_email: string | null
          store_manager_name: string | null
          store_manager_phone: string | null
          store_phone: string | null
          suburb: string | null
          updated_at: string
        }
        Insert: {
          activities_officer_email?: string | null
          activities_officer_name?: string | null
          activities_officer_phone?: string | null
          bunnings_store_id?: string | null
          created_at?: string
          discovered_by?: Database["public"]["Enums"]["owner_person"] | null
          discovered_date?: string | null
          id?: string
          interaction_notes?: string | null
          is_active?: boolean
          is_deleted?: boolean
          latitude?: number | null
          location: string
          longitude?: number | null
          map_url?: string | null
          opening_hours?: Json | null
          opening_hours_raw?: string | null
          postcode?: string | null
          services?: string[]
          source?: string
          state?: string | null
          store_address?: string | null
          store_email?: string | null
          store_fax?: string | null
          store_manager_email?: string | null
          store_manager_name?: string | null
          store_manager_phone?: string | null
          store_phone?: string | null
          suburb?: string | null
          updated_at?: string
        }
        Update: {
          activities_officer_email?: string | null
          activities_officer_name?: string | null
          activities_officer_phone?: string | null
          bunnings_store_id?: string | null
          created_at?: string
          discovered_by?: Database["public"]["Enums"]["owner_person"] | null
          discovered_date?: string | null
          id?: string
          interaction_notes?: string | null
          is_active?: boolean
          is_deleted?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          map_url?: string | null
          opening_hours?: Json | null
          opening_hours_raw?: string | null
          postcode?: string | null
          services?: string[]
          source?: string
          state?: string | null
          store_address?: string | null
          store_email?: string | null
          store_fax?: string | null
          store_manager_email?: string | null
          store_manager_name?: string | null
          store_manager_phone?: string | null
          store_phone?: string | null
          suburb?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      charities: {
        Row: {
          annual_membership_fee_paid: boolean
          auth_user_id: string | null
          bunnings_store_id: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          internal_notes: string | null
          is_deleted: boolean
          location: string | null
          name: string
          phone: string | null
          postcode: string | null
          subscription_status: Database["public"]["Enums"]["charity_subscription_status"]
          tags: Json
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          annual_membership_fee_paid?: boolean
          auth_user_id?: string | null
          bunnings_store_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          location?: string | null
          name: string
          phone?: string | null
          postcode?: string | null
          subscription_status?: Database["public"]["Enums"]["charity_subscription_status"]
          tags?: Json
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          annual_membership_fee_paid?: boolean
          auth_user_id?: string | null
          bunnings_store_id?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          location?: string | null
          name?: string
          phone?: string | null
          postcode?: string | null
          subscription_status?: Database["public"]["Enums"]["charity_subscription_status"]
          tags?: Json
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charities_bunnings_store_id_fkey"
            columns: ["bunnings_store_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["bunnings_store_id"]
          },
          {
            foreignKeyName: "charities_bunnings_store_id_fkey"
            columns: ["bunnings_store_id"]
            isOneToOne: false
            referencedRelation: "bunnings_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      charity_users: {
        Row: {
          auth_user_id: string
          charity_id: string
          created_at: string
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          is_active: boolean
          last_sign_in_at: string | null
          name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          charity_id: string
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          last_sign_in_at?: string | null
          name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          charity_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean
          last_sign_in_at?: string | null
          name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charity_users_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["charity_id"]
          },
          {
            foreignKeyName: "charity_users_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
        ]
      }
      component_units: {
        Row: {
          display_order: number
          name: string
        }
        Insert: {
          display_order?: number
          name: string
        }
        Update: {
          display_order?: number
          name?: string
        }
        Relationships: []
      }
      components: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          image_path: string | null
          is_active: boolean
          is_deleted: boolean
          name: string
          pack_size: string | null
          packaging_material: string | null
          quantity: number | null
          size_litres: number | null
          storage: Database["public"]["Enums"]["component_storage"] | null
          target_buy_cost_aud: number | null
          target_sell_price_aud: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_deleted?: boolean
          name: string
          pack_size?: string | null
          packaging_material?: string | null
          quantity?: number | null
          size_litres?: number | null
          storage?: Database["public"]["Enums"]["component_storage"] | null
          target_buy_cost_aud?: number | null
          target_sell_price_aud?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          image_path?: string | null
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          pack_size?: string | null
          packaging_material?: string | null
          quantity?: number | null
          size_litres?: number | null
          storage?: Database["public"]["Enums"]["component_storage"] | null
          target_buy_cost_aud?: number | null
          target_sell_price_aud?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "components_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "component_units"
            referencedColumns: ["name"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          charity_id: string
          created_at: string
          created_by: string | null
          details: string | null
          direction: Database["public"]["Enums"]["interaction_direction"]
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          is_deleted: boolean
          next_action: string | null
          next_action_date: string | null
          outcome: Database["public"]["Enums"]["interaction_outcome"] | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          charity_id: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          direction: Database["public"]["Enums"]["interaction_direction"]
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          is_deleted?: boolean
          next_action?: string | null
          next_action_date?: string | null
          outcome?: Database["public"]["Enums"]["interaction_outcome"] | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          charity_id?: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          direction?: Database["public"]["Enums"]["interaction_direction"]
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          is_deleted?: boolean
          next_action?: string | null
          next_action_date?: string | null
          outcome?: Database["public"]["Enums"]["interaction_outcome"] | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["charity_id"]
          },
          {
            foreignKeyName: "customer_interactions_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          created_at: string
          html_content: string | null
          id: string
          is_deleted: boolean
          name: string
          recipient_count: number
          sent_at: string | null
          sent_by: Database["public"]["Enums"]["owner_person"] | null
          subject: string
          type: Database["public"]["Enums"]["email_campaign_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          recipient_count?: number
          sent_at?: string | null
          sent_by?: Database["public"]["Enums"]["owner_person"] | null
          subject: string
          type?: Database["public"]["Enums"]["email_campaign_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          recipient_count?: number
          sent_at?: string | null
          sent_by?: Database["public"]["Enums"]["owner_person"] | null
          subject?: string
          type?: Database["public"]["Enums"]["email_campaign_type"]
          updated_at?: string
        }
        Relationships: []
      }
      email_link_clicks: {
        Row: {
          campaign_id: string
          clicked_at: string
          created_at: string
          id: string
          is_deleted: boolean
          link_text: string | null
          link_url: string
          recipient_id: string
          updated_at: string
          utm_params: Json
        }
        Insert: {
          campaign_id: string
          clicked_at?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          link_text?: string | null
          link_url: string
          recipient_id: string
          updated_at?: string
          utm_params?: Json
        }
        Update: {
          campaign_id?: string
          clicked_at?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          link_text?: string | null
          link_url?: string
          recipient_id?: string
          updated_at?: string
          utm_params?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_link_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_link_clicks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "email_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_recipients: {
        Row: {
          bounce_status: Database["public"]["Enums"]["email_bounce_status"]
          campaign_id: string
          charity_id: string | null
          created_at: string
          id: string
          is_deleted: boolean
          open_count: number
          opened: boolean
          opened_at: string | null
          recipient_email: string
          tracking_pixel_id: string
          updated_at: string
        }
        Insert: {
          bounce_status?: Database["public"]["Enums"]["email_bounce_status"]
          campaign_id: string
          charity_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          open_count?: number
          opened?: boolean
          opened_at?: string | null
          recipient_email: string
          tracking_pixel_id?: string
          updated_at?: string
        }
        Update: {
          bounce_status?: Database["public"]["Enums"]["email_bounce_status"]
          campaign_id?: string
          charity_id?: string | null
          created_at?: string
          id?: string
          is_deleted?: boolean
          open_count?: number
          opened?: boolean
          opened_at?: string | null
          recipient_email?: string
          tracking_pixel_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_recipients_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["charity_id"]
          },
          {
            foreignKeyName: "email_recipients_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
        ]
      }
      event_packages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          package_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          package_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          package_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_packages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_suppliers: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_active: boolean
          is_deleted: boolean
          notes: string | null
          status: Database["public"]["Enums"]["event_supplier_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          notes?: string | null
          status?: Database["public"]["Enums"]["event_supplier_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          notes?: string | null
          status?: Database["public"]["Enums"]["event_supplier_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_suppliers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actual_hotdogs_sold: number | null
          bunnings_store_id: string
          charity_id: string
          cover_type: Database["public"]["Enums"]["event_cover_type"] | null
          created_at: string
          estimated_hotdogs: number | null
          estimated_staff: number | null
          event_date: string
          event_name: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          notes: string | null
          number_of_sales: number | null
          number_of_shifts: number | null
          requested_by_charity: boolean
          sales_value_aud: number | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          actual_hotdogs_sold?: number | null
          bunnings_store_id: string
          charity_id: string
          cover_type?: Database["public"]["Enums"]["event_cover_type"] | null
          created_at?: string
          estimated_hotdogs?: number | null
          estimated_staff?: number | null
          event_date: string
          event_name?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          notes?: string | null
          number_of_sales?: number | null
          number_of_shifts?: number | null
          requested_by_charity?: boolean
          sales_value_aud?: number | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          actual_hotdogs_sold?: number | null
          bunnings_store_id?: string
          charity_id?: string
          cover_type?: Database["public"]["Enums"]["event_cover_type"] | null
          created_at?: string
          estimated_hotdogs?: number | null
          estimated_staff?: number | null
          event_date?: string
          event_name?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          notes?: string | null
          number_of_sales?: number | null
          number_of_shifts?: number | null
          requested_by_charity?: boolean
          sales_value_aud?: number | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_bunnings_store_id_fkey"
            columns: ["bunnings_store_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["bunnings_store_id"]
          },
          {
            foreignKeyName: "events_bunnings_store_id_fkey"
            columns: ["bunnings_store_id"]
            isOneToOne: false
            referencedRelation: "bunnings_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["charity_id"]
          },
          {
            foreignKeyName: "events_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          email_sent: boolean
          id: string
          message: string
          page: string | null
          status: string
          user_email: string | null
          user_id: string | null
          user_type: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          id?: string
          message: string
          page?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_type: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          id?: string
          message?: string
          page?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_type?: string
        }
        Relationships: []
      }
      invoice_settings: {
        Row: {
          abn: string | null
          address: string | null
          business_name: string
          email: string | null
          footer_note: string | null
          gst_registered: boolean
          id: number
          payment_instructions: string | null
          payment_terms_days: number
          phone: string | null
          updated_at: string
          updated_by_email: string | null
        }
        Insert: {
          abn?: string | null
          address?: string | null
          business_name?: string
          email?: string | null
          footer_note?: string | null
          gst_registered?: boolean
          id?: number
          payment_instructions?: string | null
          payment_terms_days?: number
          phone?: string | null
          updated_at?: string
          updated_by_email?: string | null
        }
        Update: {
          abn?: string | null
          address?: string | null
          business_name?: string
          email?: string | null
          footer_note?: string | null
          gst_registered?: boolean
          id?: number
          payment_instructions?: string | null
          payment_terms_days?: number
          phone?: string | null
          updated_at?: string
          updated_by_email?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_aud: number
          buyer: Json
          charity_id: string
          created_at: string
          created_by_email: string | null
          description: string
          due_date: string
          emailed_at: string | null
          id: string
          invoice_number: string
          issue_date: string
          order_id: string
          paid_at: string | null
          seller: Json
          status: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_aud: number
          buyer: Json
          charity_id: string
          created_at?: string
          created_by_email?: string | null
          description: string
          due_date: string
          emailed_at?: string | null
          id?: string
          invoice_number: string
          issue_date: string
          order_id: string
          paid_at?: string | null
          seller: Json
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_aud?: number
          buyer?: Json
          charity_id?: string
          created_at?: string
          created_by_email?: string | null
          description?: string
          due_date?: string
          emailed_at?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          order_id?: string
          paid_at?: string | null
          seller?: Json
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["charity_id"]
          },
          {
            foreignKeyName: "invoices_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: Database["public"]["Enums"]["owner_person"] | null
          charity_name: string | null
          contact_name: string | null
          converted_to_charity_id: string | null
          created_at: string
          email: string | null
          id: string
          inquiry_type: Database["public"]["Enums"]["lead_inquiry_type"] | null
          is_deleted: boolean
          location: string | null
          message: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: Database["public"]["Enums"]["owner_person"] | null
          charity_name?: string | null
          contact_name?: string | null
          converted_to_charity_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inquiry_type?: Database["public"]["Enums"]["lead_inquiry_type"] | null
          is_deleted?: boolean
          location?: string | null
          message?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: Database["public"]["Enums"]["owner_person"] | null
          charity_name?: string | null
          contact_name?: string | null
          converted_to_charity_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inquiry_type?: Database["public"]["Enums"]["lead_inquiry_type"] | null
          is_deleted?: boolean
          location?: string | null
          message?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_charity_id_fkey"
            columns: ["converted_to_charity_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["charity_id"]
          },
          {
            foreignKeyName: "leads_converted_to_charity_id_fkey"
            columns: ["converted_to_charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          charity_id: string
          completed_at: string | null
          created_at: string
          delivery_address: string
          delivery_contact_name: string | null
          delivery_phone: string | null
          event_date: string
          id: string
          is_deleted: boolean
          package_id: string
          special_requests: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price_aud: number
          updated_at: string
        }
        Insert: {
          charity_id: string
          completed_at?: string | null
          created_at?: string
          delivery_address: string
          delivery_contact_name?: string | null
          delivery_phone?: string | null
          event_date: string
          id?: string
          is_deleted?: boolean
          package_id: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price_aud: number
          updated_at?: string
        }
        Update: {
          charity_id?: string
          completed_at?: string | null
          created_at?: string
          delivery_address?: string
          delivery_contact_name?: string | null
          delivery_phone?: string | null
          event_date?: string
          id?: string
          is_deleted?: boolean
          package_id?: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price_aud?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "bunnings_store_charities"
            referencedColumns: ["charity_id"]
          },
          {
            foreignKeyName: "orders_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_components: {
        Row: {
          component_id: string
          created_at: string
          id: string
          package_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          package_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          package_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_components_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          base_price_aud: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          items: Json
          name: string
          updated_at: string
        }
        Insert: {
          base_price_aud: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          items?: Json
          name: string
          updated_at?: string
        }
        Update: {
          base_price_aud?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          items?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          is_deleted: boolean
          page_url: string
          referrer: string | null
          session_id: string | null
          timestamp: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          is_deleted?: boolean
          page_url: string
          referrer?: string | null
          session_id?: string | null
          timestamp?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          is_deleted?: boolean
          page_url?: string
          referrer?: string | null
          session_id?: string | null
          timestamp?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      record_emails: {
        Row: {
          created_at: string
          document: string
          error: string | null
          id: string
          include_prices: boolean
          note: string | null
          recipient_email: string
          recipient_name: string | null
          record_id: string
          record_type: string
          sent_by_email: string | null
          sent_by_type: string
          sent_by_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          document: string
          error?: string | null
          id?: string
          include_prices?: boolean
          note?: string | null
          recipient_email: string
          recipient_name?: string | null
          record_id: string
          record_type: string
          sent_by_email?: string | null
          sent_by_type: string
          sent_by_user_id?: string | null
          status: string
        }
        Update: {
          created_at?: string
          document?: string
          error?: string | null
          id?: string
          include_prices?: boolean
          note?: string | null
          recipient_email?: string
          recipient_name?: string | null
          record_id?: string
          record_type?: string
          sent_by_email?: string | null
          sent_by_type?: string
          sent_by_user_id?: string | null
          status?: string
        }
        Relationships: []
      }
      supplier_chains: {
        Row: {
          created_at: string
          display_order: number
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      supplier_contact: {
        Row: {
          commercial_agreement_status: string | null
          contact_email: string | null
          contact_person_name: string
          contact_phone: string | null
          contact_role: Database["public"]["Enums"]["supplier_contact_role"] | null
          created_at: string
          delivery_logistics_status: string | null
          discussion_summary: string | null
          id: string
          internal_notes: string | null
          is_deleted: boolean
          last_contact_date: string | null
          natalie_owner: boolean
          next_contact_date: string | null
          status: Database["public"]["Enums"]["supplier_relationship_status"]
          supplier_chain: string
          supply_pricing_status: string | null
          updated_at: string
        }
        Insert: {
          commercial_agreement_status?: string | null
          contact_email?: string | null
          contact_person_name: string
          contact_phone?: string | null
          contact_role?: Database["public"]["Enums"]["supplier_contact_role"] | null
          created_at?: string
          delivery_logistics_status?: string | null
          discussion_summary?: string | null
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          last_contact_date?: string | null
          natalie_owner?: boolean
          next_contact_date?: string | null
          status?: Database["public"]["Enums"]["supplier_relationship_status"]
          supplier_chain?: string
          supply_pricing_status?: string | null
          updated_at?: string
        }
        Update: {
          commercial_agreement_status?: string | null
          contact_email?: string | null
          contact_person_name?: string
          contact_phone?: string | null
          contact_role?: Database["public"]["Enums"]["supplier_contact_role"] | null
          created_at?: string
          delivery_logistics_status?: string | null
          discussion_summary?: string | null
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          last_contact_date?: string | null
          natalie_owner?: boolean
          next_contact_date?: string | null
          status?: Database["public"]["Enums"]["supplier_relationship_status"]
          supplier_chain?: string
          supply_pricing_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contact_supplier_chain_fkey"
            columns: ["supplier_chain"]
            isOneToOne: false
            referencedRelation: "supplier_chains"
            referencedColumns: ["name"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_mobile: string | null
          contact_name: string | null
          created_at: string
          facilities: string[]
          id: string
          is_active: boolean
          is_deleted: boolean
          latitude: number | null
          longitude: number | null
          opening_hours: Json | null
          opening_hours_raw: string | null
          phone: string | null
          postcode: string
          source_store_id: string | null
          state: string
          store_name: string
          suburb: string | null
          supplier_chain: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          contact_name?: string | null
          created_at?: string
          facilities?: string[]
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          opening_hours_raw?: string | null
          phone?: string | null
          postcode: string
          source_store_id?: string | null
          state: string
          store_name: string
          suburb?: string | null
          supplier_chain: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          contact_name?: string | null
          created_at?: string
          facilities?: string[]
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          opening_hours_raw?: string | null
          phone?: string | null
          postcode?: string
          source_store_id?: string | null
          state?: string
          store_name?: string
          suburb?: string | null
          supplier_chain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_supplier_chain_fkey"
            columns: ["supplier_chain"]
            isOneToOne: false
            referencedRelation: "supplier_chains"
            referencedColumns: ["name"]
          },
        ]
      }
      usage_events: {
        Row: {
          device: string
          event_type: string
          id: number
          occurred_at: string
          page: string
          target: string | null
          user_id: string | null
          user_type: string
        }
        Insert: {
          device?: string
          event_type: string
          id?: never
          occurred_at?: string
          page: string
          target?: string | null
          user_id?: string | null
          user_type: string
        }
        Update: {
          device?: string
          event_type?: string
          id?: never
          occurred_at?: string
          page?: string
          target?: string | null
          user_id?: string | null
          user_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      bunnings_store_charities: {
        Row: {
          bunnings_store_id: string | null
          charity_id: string | null
          charity_name: string | null
          location: string | null
        }
        Relationships: []
      }
      postcode_centroids: {
        Row: {
          latitude: number | null
          longitude: number | null
          postcode: string | null
          store_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _audit_ip_address: { Args: never; Returns: unknown }
      _audit_performed_by: { Args: never; Returns: string }
      _audit_user_agent: { Args: never; Returns: string }
      current_charity_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      next_invoice_number: { Args: never; Returns: string }
    }
    Enums: {
      admin_action_status: "success" | "error" | "pending"
      admin_role: "admin" | "support" | "viewer"
      audit_action: "create" | "update" | "delete"
      charity_subscription_status: "trial" | "active" | "inactive"
      component_storage: "shelf" | "refrigerated" | "frozen"
      device_type: "mobile" | "tablet" | "desktop" | "unknown"
      email_bounce_status: "delivered" | "bounced" | "complained" | "pending"
      email_campaign_type: "newsletter" | "order_confirmation" | "marketing" | "promotional"
      event_cover_type: "inside" | "outside_covered" | "outside_uncovered"
      event_status: "requested" | "planned" | "confirmed" | "completed" | "cancelled"
      event_supplier_status: "possible" | "confirmed" | "declined"
      interaction_direction: "inbound" | "outbound"
      interaction_outcome: "inquiry" | "order_placed" | "issue_resolved" | "follow_up_needed" | "no_outcome"
      interaction_type: "phone_call" | "email" | "sms" | "meeting" | "note"
      lead_inquiry_type: "looking_to_order" | "partnership" | "feedback" | "other"
      lead_source: "website_form" | "email" | "phone" | "other"
      lead_status: "new" | "contacted" | "qualified" | "converted_to_order" | "rejected"
      order_status: "pending" | "confirmed" | "scheduled" | "delivered" | "cancelled"
      owner_person: "rita" | "natalie"
      supplier_contact_role: "category_manager" | "store_manager" | "supply_manager" | "other"
      supplier_relationship_status: "interested" | "meeting_scheduled" | "proposal_submitted" | "negotiating" | "agreed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      admin_action_status: ["success", "error", "pending"],
      admin_role: ["admin", "support", "viewer"],
      audit_action: ["create", "update", "delete"],
      charity_subscription_status: ["trial", "active", "inactive"],
      component_storage: ["shelf", "refrigerated", "frozen"],
      device_type: ["mobile", "tablet", "desktop", "unknown"],
      email_bounce_status: ["delivered", "bounced", "complained", "pending"],
      email_campaign_type: ["newsletter", "order_confirmation", "marketing", "promotional"],
      event_cover_type: ["inside", "outside_covered", "outside_uncovered"],
      event_status: ["requested", "planned", "confirmed", "completed", "cancelled"],
      event_supplier_status: ["possible", "confirmed", "declined"],
      interaction_direction: ["inbound", "outbound"],
      interaction_outcome: ["inquiry", "order_placed", "issue_resolved", "follow_up_needed", "no_outcome"],
      interaction_type: ["phone_call", "email", "sms", "meeting", "note"],
      lead_inquiry_type: ["looking_to_order", "partnership", "feedback", "other"],
      lead_source: ["website_form", "email", "phone", "other"],
      lead_status: ["new", "contacted", "qualified", "converted_to_order", "rejected"],
      order_status: ["pending", "confirmed", "scheduled", "delivered", "cancelled"],
      owner_person: ["rita", "natalie"],
      supplier_contact_role: ["category_manager", "store_manager", "supply_manager", "other"],
      supplier_relationship_status: ["interested", "meeting_scheduled", "proposal_submitted", "negotiating", "agreed"],
    },
  },
} as const
