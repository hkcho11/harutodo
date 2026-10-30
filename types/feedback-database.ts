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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          event_name: string
          id: string
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_name: string
          id?: string
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_name?: string
          id?: string
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      couple_document_spaces: {
        Row: {
          connected_by: string
          couple_id: string
          created_at: string
          external_folder_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          connected_by: string
          couple_id: string
          created_at?: string
          external_folder_id: string
          provider?: string
          updated_at?: string
        }
        Update: {
          connected_by?: string
          couple_id?: string
          created_at?: string
          external_folder_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_document_spaces_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_document_spaces_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: true
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couples_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couples_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_groups: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_groups_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          assignee_id: string | null
          couple_id: string
          created_at: string
          created_by: string
          date: string
          end_date: string | null
          end_time: string | null
          id: string
          location_address: string | null
          location_latitude: number | null
          location_longitude: number | null
          location_name: string | null
          location_provider: string | null
          location_provider_id: string | null
          location_url: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          date: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          location_address?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_name?: string | null
          location_provider?: string | null
          location_provider_id?: string | null
          location_url?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          date?: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          location_address?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_name?: string | null
          location_provider?: string | null
          location_provider_id?: string | null
          location_url?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          read_reply_revision: number
          reply_author_id: string | null
          reply_content: string | null
          reply_revision: number
          reply_updated_at: string | null
          request_id: string
          revision: number
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          read_reply_revision?: number
          reply_author_id?: string | null
          reply_content?: string | null
          reply_revision?: number
          reply_updated_at?: string | null
          request_id: string
          revision?: number
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          read_reply_revision?: number
          reply_author_id?: string | null
          reply_content?: string | null
          reply_revision?: number
          reply_updated_at?: string | null
          request_id?: string
          revision?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      feedback_attachments: {
        Row: {
          byte_size: number
          cleanup_ready: boolean
          created_at: string
          feedback_id: string | null
          id: string
          media_type: string
          original_name: string
          owner_id: string | null
          storage_path: string
          verified: boolean
        }
        Insert: {
          byte_size: number
          cleanup_ready?: boolean
          created_at?: string
          feedback_id?: string | null
          id?: string
          media_type: string
          original_name: string
          owner_id?: string | null
          storage_path: string
          verified?: boolean
        }
        Update: {
          byte_size?: number
          cleanup_ready?: boolean
          created_at?: string
          feedback_id?: string | null
          id?: string
          media_type?: string
          original_name?: string
          owner_id?: string | null
          storage_path?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feedback_attachments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_notification_outbox: {
        Row: {
          attempts: number
          created_at: string
          delivered_endpoints: string[]
          feedback_id: string
          id: string
          kind: string
          lease_token: string | null
          lease_until: string | null
          next_attempt_at: string
          recipient_id: string
          reply_revision: number
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_endpoints?: string[]
          feedback_id: string
          id?: string
          kind: string
          lease_token?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          recipient_id: string
          reply_revision?: number
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_endpoints?: string[]
          feedback_id?: string
          id?: string
          kind?: string
          lease_token?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          recipient_id?: string
          reply_revision?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_notification_outbox_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_preferences: {
        Row: {
          enabled: boolean
          prompt_seen: boolean
          user_id: string
        }
        Insert: {
          enabled?: boolean
          prompt_seen?: boolean
          user_id: string
        }
        Update: {
          enabled?: boolean
          prompt_seen?: boolean
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      korean_holidays: {
        Row: {
          holiday_date: string
          is_substitute: boolean
          names: string[]
          source: string
          synced_at: string
        }
        Insert: {
          holiday_date: string
          is_substitute?: boolean
          names: string[]
          source?: string
          synced_at?: string
        }
        Update: {
          holiday_date?: string
          is_substitute?: boolean
          names?: string[]
          source?: string
          synced_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          notification_id: string
          scheduled_date: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string
          scheduled_date: string
          status: string
          type: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string
          scheduled_date?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_schedules: {
        Row: {
          cancelled_at: string | null
          created_at: string
          event_id: string
          id: string
          scheduled_at: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          scheduled_at: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          evening_enabled: boolean
          evening_time: string
          event_enabled: boolean
          event_lead_min: number
          id: string
          morning_enabled: boolean
          morning_time: string
          partner_enabled: boolean
          show_content: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          evening_enabled?: boolean
          evening_time?: string
          event_enabled?: boolean
          event_lead_min?: number
          id?: string
          morning_enabled?: boolean
          morning_time?: string
          partner_enabled?: boolean
          show_content?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          evening_enabled?: boolean
          evening_time?: string
          event_enabled?: boolean
          event_lead_min?: number
          id?: string
          morning_enabled?: boolean
          morning_time?: string
          partner_enabled?: boolean
          show_content?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_cycles: {
        Row: {
          couple_id: string
          created_at: string
          end_date: string | null
          id: string
          note: string | null
          share_level: string
          start_date: string
          symptom_tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          note?: string | null
          share_level?: string
          start_date: string
          symptom_tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          note?: string | null
          share_level?: string
          start_date?: string
          symptom_tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_cycles_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          avatar_url: string | null
          created_at: string
          cycle_enabled: boolean
          display_name: string
          id: string
        }
        Insert: {
          avatar_color?: string
          avatar_url?: string | null
          created_at?: string
          cycle_enabled?: boolean
          display_name: string
          id: string
        }
        Update: {
          avatar_color?: string
          avatar_url?: string | null
          created_at?: string
          cycle_enabled?: boolean
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      todo_items: {
        Row: {
          assignee_id: string | null
          couple_id: string
          created_at: string
          created_by: string
          custom_group_id: string | null
          date: string | null
          group: Database["public"]["Enums"]["todo_group"]
          id: string
          is_completed: boolean
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          couple_id: string
          created_at?: string
          created_by: string
          custom_group_id?: string | null
          date?: string | null
          group?: Database["public"]["Enums"]["todo_group"]
          id?: string
          is_completed?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          couple_id?: string
          created_at?: string
          created_by?: string
          custom_group_id?: string | null
          date?: string | null
          group?: Database["public"]["Enums"]["todo_group"]
          id?: string
          is_completed?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_custom_group_id_fkey"
            columns: ["custom_group_id"]
            isOneToOne: false
            referencedRelation: "custom_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todo_items_user_id_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_feedback_attachment_cleanup: {
        Args: never
        Returns: {
          byte_size: number
          cleanup_ready: boolean
          created_at: string
          feedback_id: string | null
          id: string
          media_type: string
          original_name: string
          owner_id: string | null
          storage_path: string
          verified: boolean
        }[]
        SetofOptions: {
          from: "*"
          to: "feedback_attachments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_feedback_notifications: {
        Args: never
        Returns: {
          attempts: number
          created_at: string
          delivered_endpoints: string[]
          feedback_id: string
          id: string
          kind: string
          lease_token: string | null
          lease_until: string | null
          next_attempt_at: string
          recipient_id: string
          reply_revision: number
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "feedback_notification_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_invite_code: { Args: never; Returns: Json }
      delete_feedback: {
        Args: { p_id: string; p_revision: number }
        Returns: undefined
      }
      discard_feedback_attachment: {
        Args: { p_id: string }
        Returns: undefined
      }
      feedback_context: { Args: never; Returns: Json }
      feedback_json: { Args: { p_id: string }; Returns: Json }
      feedback_preferences_get: { Args: never; Returns: Json }
      feedback_preferences_set: {
        Args: { p_enabled?: boolean; p_prompt_seen?: boolean }
        Returns: Json
      }
      feedback_storage_access: {
        Args: { p_path: string; p_upload: boolean }
        Returns: boolean
      }
      is_feedback_admin: { Args: never; Returns: boolean }
      link_feedback_attachments: {
        Args: { p_attachments: string[]; p_id: string }
        Returns: undefined
      }
      list_feedback: {
        Args: { p_cursor?: Json; p_status?: string }
        Returns: Json
      }
      mark_feedback_reply_read: {
        Args: { p_id: string; p_revision: number }
        Returns: undefined
      }
      prepare_feedback_attachment: {
        Args: { p_name: string; p_size: number; p_type: string }
        Returns: Json
      }
      replace_korean_holidays: {
        Args: { p_holidays: Json; p_year: number }
        Returns: number
      }
      save_feedback_reply: {
        Args: {
          p_content: string
          p_id: string
          p_reply_revision: number
          p_revision: number
        }
        Returns: Json
      }
      submit_feedback: {
        Args: {
          p_attachments?: string[]
          p_content: string
          p_request_id: string
          p_title: string
        }
        Returns: Json
      }
      update_feedback: {
        Args: {
          p_attachments?: string[]
          p_content: string
          p_id: string
          p_revision: number
          p_title: string
        }
        Returns: Json
      }
      use_invite_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      todo_group: "together" | "individual" | "other" | "custom"
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
      todo_group: ["together", "individual", "other", "custom"],
    },
  },
} as const
