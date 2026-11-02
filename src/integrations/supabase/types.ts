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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bible_readings: {
        Row: {
          completed: boolean
          id: string
          reading_date: string
          reading_reference: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          id?: string
          reading_date: string
          reading_reference: string
          user_id: string
        }
        Update: {
          completed?: boolean
          id?: string
          reading_date?: string
          reading_reference?: string
          user_id?: string
        }
        Relationships: []
      }
      class_card_photos: {
        Row: {
          card_type: string
          class_id: string
          created_at: string
          id: string
          photo_url: string
          req_id: string
          section_id: string
          storage_path: string
          sub_id: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          card_type: string
          class_id: string
          created_at?: string
          id?: string
          photo_url: string
          req_id: string
          section_id: string
          storage_path: string
          sub_id?: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          card_type?: string
          class_id?: string
          created_at?: string
          id?: string
          photo_url?: string
          req_id?: string
          section_id?: string
          storage_path?: string
          sub_id?: string
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      class_card_progress: {
        Row: {
          card_type: string
          class_id: string
          completed: boolean
          completion_date: string | null
          created_at: string
          id: string
          instructor: string | null
          req_id: string
          section_id: string
          share_options: string[]
          sub_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_type: string
          class_id: string
          completed?: boolean
          completion_date?: string | null
          created_at?: string
          id?: string
          instructor?: string | null
          req_id: string
          section_id: string
          share_options?: string[]
          sub_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_type?: string
          class_id?: string
          completed?: boolean
          completion_date?: string | null
          created_at?: string
          id?: string
          instructor?: string | null
          req_id?: string
          section_id?: string
          share_options?: string[]
          sub_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conqui_kash_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          registered_by: string
          tx_date: string
          tx_type: Database["public"]["Enums"]["kash_tx_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          registered_by: string
          tx_date?: string
          tx_type?: Database["public"]["Enums"]["kash_tx_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          registered_by?: string
          tx_date?: string
          tx_type?: Database["public"]["Enums"]["kash_tx_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          has_today_interaction: boolean
          id: string
          last_interaction_date: string | null
          last_sender_id: string | null
          lives: number
          lives_floor: number
          streak_count: number
          today_date: string | null
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          has_today_interaction?: boolean
          id?: string
          last_interaction_date?: string | null
          last_sender_id?: string | null
          lives?: number
          lives_floor?: number
          streak_count?: number
          today_date?: string | null
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          has_today_interaction?: boolean
          id?: string
          last_interaction_date?: string | null
          last_sender_id?: string | null
          lives?: number
          lives_floor?: number
          streak_count?: number
          today_date?: string | null
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      dashboard_settings: {
        Row: {
          audience: string
          custom_description: string | null
          custom_icon_url: string | null
          custom_image_url: string | null
          custom_title: string | null
          desc_letter_spacing: number | null
          desc_line_height: number | null
          enabled: boolean
          id: string
          image_position: string | null
          image_scale: number | null
          section_key: string
          title_letter_spacing: number | null
          title_line_height: number | null
          updated_at: string
        }
        Insert: {
          audience?: string
          custom_description?: string | null
          custom_icon_url?: string | null
          custom_image_url?: string | null
          custom_title?: string | null
          desc_letter_spacing?: number | null
          desc_line_height?: number | null
          enabled?: boolean
          id?: string
          image_position?: string | null
          image_scale?: number | null
          section_key: string
          title_letter_spacing?: number | null
          title_line_height?: number | null
          updated_at?: string
        }
        Update: {
          audience?: string
          custom_description?: string | null
          custom_icon_url?: string | null
          custom_image_url?: string | null
          custom_title?: string | null
          desc_letter_spacing?: number | null
          desc_line_height?: number | null
          enabled?: boolean
          id?: string
          image_position?: string | null
          image_scale?: number | null
          section_key?: string
          title_letter_spacing?: number | null
          title_line_height?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          asistencia: number
          asistencia_ja: number
          created_at: string
          cuota: number
          evaluation_date: string
          excusa: string
          id: string
          matutina: number
          part_devocional: number
          puntualidad: number
          registered_by: string | null
          tareas: number
          total_score: number
          uniforme: number
          unit_id: string
          user_id: string
        }
        Insert: {
          asistencia?: number
          asistencia_ja?: number
          created_at?: string
          cuota?: number
          evaluation_date: string
          excusa?: string
          id?: string
          matutina?: number
          part_devocional?: number
          puntualidad?: number
          registered_by?: string | null
          tareas?: number
          total_score?: number
          uniforme?: number
          unit_id: string
          user_id: string
        }
        Update: {
          asistencia?: number
          asistencia_ja?: number
          created_at?: string
          cuota?: number
          evaluation_date?: string
          excusa?: string
          id?: string
          matutina?: number
          part_devocional?: number
          puntualidad?: number
          registered_by?: string | null
          tareas?: number
          total_score?: number
          uniforme?: number
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "feature_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          summary: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          summary?: string
          title?: string
        }
        Relationships: []
      }
      guia_mayor_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          req_id: string
          section_id: string
          storage_path: string
          sub_id: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          req_id: string
          section_id: string
          storage_path: string
          sub_id?: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          req_id?: string
          section_id?: string
          storage_path?: string
          sub_id?: string
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      guia_mayor_progress: {
        Row: {
          completed: boolean
          completion_date: string | null
          created_at: string
          id: string
          instructor: string | null
          req_id: string
          section_id: string
          share_options: string[]
          sub_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completion_date?: string | null
          created_at?: string
          id?: string
          instructor?: string | null
          req_id: string
          section_id: string
          share_options?: string[]
          sub_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completion_date?: string | null
          created_at?: string
          id?: string
          instructor?: string | null
          req_id?: string
          section_id?: string
          share_options?: string[]
          sub_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ideales: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["ideal_category"]
          created_at: string
          display_order: number
          icon_url: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          category: Database["public"]["Enums"]["ideal_category"]
          created_at?: string
          display_order?: number
          icon_url?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["ideal_category"]
          created_at?: string
          display_order?: number
          icon_url?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_duration_ms: number | null
          audio_path: string | null
          audio_url: string | null
          content: string
          created_at: string
          edited: boolean
          edited_at: string | null
          id: string
          message_type: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          audio_duration_ms?: number | null
          audio_path?: string | null
          audio_url?: string | null
          content: string
          created_at?: string
          edited?: boolean
          edited_at?: string | null
          id?: string
          message_type?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          audio_duration_ms?: number | null
          audio_path?: string | null
          audio_url?: string | null
          content?: string
          created_at?: string
          edited?: boolean
          edited_at?: string | null
          id?: string
          message_type?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      pin_login_attempts: {
        Row: {
          attempts: number
          created_at: string
          ip_hash: string
          last_attempt_at: string
          locked_until: string | null
          phone_hash: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          ip_hash: string
          last_attempt_at?: string
          locked_until?: string | null
          phone_hash: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          ip_hash?: string
          last_attempt_at?: string
          locked_until?: string | null
          phone_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      pin_records: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          pin: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          pin: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          pin?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_branding: {
        Row: {
          description: string
          icon_url: string
          id: string
          name: string
          singleton: boolean
          updated_at: string
          welcome_enabled: boolean
        }
        Insert: {
          description?: string
          icon_url?: string
          id?: string
          name?: string
          singleton?: boolean
          updated_at?: string
          welcome_enabled?: boolean
        }
        Update: {
          description?: string
          icon_url?: string
          id?: string
          name?: string
          singleton?: boolean
          updated_at?: string
          welcome_enabled?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_position_x: number
          avatar_position_y: number
          avatar_scale: number
          avatar_url: string | null
          banner_position_x: number
          banner_position_y: number
          banner_scale: number
          banner_url: string | null
          birthday: string | null
          created_at: string
          email: string
          first_last_name: string
          first_name: string
          id: string
          last_seen_at: string | null
          phone: string
          second_last_name: string
          second_name: string
          security_answer: string | null
          security_question: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_position_x?: number
          avatar_position_y?: number
          avatar_scale?: number
          avatar_url?: string | null
          banner_position_x?: number
          banner_position_y?: number
          banner_scale?: number
          banner_url?: string | null
          birthday?: string | null
          created_at?: string
          email: string
          first_last_name: string
          first_name: string
          id?: string
          last_seen_at?: string | null
          phone: string
          second_last_name?: string
          second_name?: string
          security_answer?: string | null
          security_question?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_position_x?: number
          avatar_position_y?: number
          avatar_scale?: number
          avatar_url?: string | null
          banner_position_x?: number
          banner_position_y?: number
          banner_scale?: number
          banner_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string
          first_last_name?: string
          first_name?: string
          id?: string
          last_seen_at?: string | null
          phone?: string
          second_last_name?: string
          second_name?: string
          security_answer?: string | null
          security_question?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      streak_support_messages: {
        Row: {
          audio_duration_ms: number | null
          audio_path: string | null
          audio_url: string | null
          content: string
          created_at: string
          id: string
          is_from_admin: boolean
          message_type: string
          read: boolean
          sender_id: string
          user_id: string
        }
        Insert: {
          audio_duration_ms?: number | null
          audio_path?: string | null
          audio_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_from_admin?: boolean
          message_type?: string
          read?: boolean
          sender_id: string
          user_id: string
        }
        Update: {
          audio_duration_ms?: number | null
          audio_path?: string | null
          audio_url?: string | null
          content?: string
          created_at?: string
          id?: string
          is_from_admin?: boolean
          message_type?: string
          read?: boolean
          sender_id?: string
          user_id?: string
        }
        Relationships: []
      }
      unit_members: {
        Row: {
          id: string
          position: Database["public"]["Enums"]["unit_position"]
          unit_id: string
          user_id: string
        }
        Insert: {
          id?: string
          position?: Database["public"]["Enums"]["unit_position"]
          unit_id: string
          user_id: string
        }
        Update: {
          id?: string
          position?: Database["public"]["Enums"]["unit_position"]
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          logo_url: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string
          name?: string
        }
        Relationships: []
      }
      user_class_enrollments: {
        Row: {
          assigned_by: string | null
          class_id: string | null
          created_at: string
          id: string
          track: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          track: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          track?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stickers: {
        Row: {
          created_at: string
          id: string
          sticker_url: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sticker_url: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sticker_url?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          kind: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_label: string
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[]
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_label?: string
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[]
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_label?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      my_security_qa: {
        Row: {
          security_answer: string | null
          security_question: string | null
          user_id: string | null
        }
        Insert: {
          security_answer?: string | null
          security_question?: string | null
          user_id?: string | null
        }
        Update: {
          security_answer?: string | null
          security_question?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_streak: {
        Args: {
          _conversation_id: string
          _lives: number
          _start_date: string
          _streak_count: number
        }
        Returns: undefined
      }
      admin_get_streak_activity: {
        Args: { _conversation_id: string }
        Returns: {
          day: string
          first_at: string
          last_at: string
          message_count: number
          user_id: string
        }[]
      }
      admin_get_support_threads: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          last_message: string
          last_message_at: string
          unread_count: number
          user_id: string
        }[]
      }
      admin_list_all_streaks: {
        Args: never
        Returns: {
          conversation_id: string
          last_interaction_date: string
          lives: number
          start_date: string
          streak_count: number
          user1_avatar: string
          user1_id: string
          user1_name: string
          user2_avatar: string
          user2_id: string
          user2_name: string
          week_has_issue: boolean
          week_report: string
        }[]
      }
      admin_reset_user_pin: {
        Args: { _new_pin: string; _user_id: string }
        Returns: undefined
      }
      cleanup_expired_streaks: { Args: never; Returns: undefined }
      current_streak_day: { Args: never; Returns: string }
      delete_my_streak: { Args: { _partner: string }; Returns: undefined }
      get_admin_role_counts: {
        Args: never
        Returns: {
          director_count: number
          subdirector_count: number
        }[]
      }
      get_global_streaks: {
        Args: never
        Returns: {
          conversation_id: string
          last_interaction_date: string
          streak_count: number
          user1_avatar: string
          user1_id: string
          user1_name: string
          user2_avatar: string
          user2_id: string
          user2_name: string
        }[]
      }
      get_my_streaks: {
        Args: never
        Returns: {
          conversation_id: string
          has_today_interaction: boolean
          last_interaction_date: string
          lives: number
          other_user_id: string
          streak_count: number
        }[]
      }
      get_or_create_conversation: {
        Args: { _a: string; _b: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_evaluable_member: { Args: { _user_id: string }; Returns: boolean }
      is_unit_leader: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
      message_streak_day: { Args: { _created_at: string }; Returns: string }
      recalculate_conversation_streak: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      use_streak_life: {
        Args: { _partner: string }
        Returns: {
          out_lives: number
          out_streak_count: number
        }[]
      }
      verify_security_answer: {
        Args: { _answer: string; _phone: string }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "director"
        | "subdirector"
        | "integrante"
        | "gm_investido"
      ideal_category: "guias_mayores" | "conquistadores" | "aventureros"
      kash_tx_type: "ingreso" | "egreso"
      unit_position: "capitan" | "secretario" | "miembro"
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
      app_role: [
        "super_admin",
        "director",
        "subdirector",
        "integrante",
        "gm_investido",
      ],
      ideal_category: ["guias_mayores", "conquistadores", "aventureros"],
      kash_tx_type: ["ingreso", "egreso"],
      unit_position: ["capitan", "secretario", "miembro"],
    },
  },
} as const
