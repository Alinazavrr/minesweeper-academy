/**
 * Generated from the Supabase schema via `mcp__supabase__generate_typescript_types`.
 * Regenerate with: ask Claude to run the MCP tool and overwrite this file.
 * DO NOT hand-edit; changes will be lost on the next regen.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coach_conversations: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          kind: Database["public"]["Enums"]["coach_conversation_kind"]
          last_message_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["coach_conversation_kind"]
          last_message_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["coach_conversation_kind"]
          last_message_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_conversations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          role: Database["public"]["Enums"]["coach_message_role"]
          token_count_input: number | null
          token_count_output: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          role: Database["public"]["Enums"]["coach_message_role"]
          token_count_input?: number | null
          token_count_output?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: Database["public"]["Enums"]["coach_message_role"]
          token_count_input?: number | null
          token_count_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "coach_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_usage_daily: {
        Row: {
          date: string
          message_count: number
          token_count: number
          user_id: string
        }
        Insert: {
          date: string
          message_count?: number
          token_count?: number
          user_id: string
        }
        Update: {
          date?: string
          message_count?: number
          token_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_usage_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_challenges: {
        Row: {
          cols: number
          created_at: string
          date: string
          difficulty: Database["public"]["Enums"]["game_difficulty"]
          mine_count: number
          rows: number
          seed: string
          three_bv: number
        }
        Insert: {
          cols: number
          created_at?: string
          date: string
          difficulty: Database["public"]["Enums"]["game_difficulty"]
          mine_count: number
          rows: number
          seed: string
          three_bv: number
        }
        Update: {
          cols?: number
          created_at?: string
          date?: string
          difficulty?: Database["public"]["Enums"]["game_difficulty"]
          mine_count?: number
          rows?: number
          seed?: string
          three_bv?: number
        }
        Relationships: []
      }
      daily_results: {
        Row: {
          date: string
          game_id: string
          hints_used: number
          mistakes: number
          submitted_at: string
          time_ms: number
          user_id: string
          validated: boolean
        }
        Insert: {
          date: string
          game_id: string
          hints_used?: number
          mistakes?: number
          submitted_at?: string
          time_ms: number
          user_id: string
          validated?: boolean
        }
        Update: {
          date?: string
          game_id?: string
          hints_used?: number
          mistakes?: number
          submitted_at?: string
          time_ms?: number
          user_id?: string
          validated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "daily_results_date_fkey"
            columns: ["date"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["date"]
          },
          {
            foreignKeyName: "daily_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_share_cards: {
        Row: {
          created_at: string
          date: string
          image_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          image_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_share_cards_date_fkey"
            columns: ["date"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["date"]
          },
          {
            foreignKeyName: "daily_share_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          arena_match_id: string | null
          cols: number
          created_at: string
          daily_date: string | null
          difficulty: Database["public"]["Enums"]["game_difficulty"]
          engine_version: string
          finished_at: string
          flags_correct: number
          flags_placed: number
          hints_used: number
          id: string
          mine_count: number
          mistakes: number
          no_guess: boolean
          replay_blob: string | null
          result: Database["public"]["Enums"]["game_result"]
          rows: number
          seed: string
          source_mode: Database["public"]["Enums"]["game_source_mode"]
          three_bv: number
          three_bvs: number
          time_ms: number
          user_id: string
        }
        Insert: {
          arena_match_id?: string | null
          cols: number
          created_at?: string
          daily_date?: string | null
          difficulty: Database["public"]["Enums"]["game_difficulty"]
          engine_version: string
          finished_at: string
          flags_correct?: number
          flags_placed?: number
          hints_used?: number
          id?: string
          mine_count: number
          mistakes?: number
          no_guess?: boolean
          replay_blob?: string | null
          result: Database["public"]["Enums"]["game_result"]
          rows: number
          seed: string
          source_mode: Database["public"]["Enums"]["game_source_mode"]
          three_bv: number
          three_bvs?: number
          time_ms: number
          user_id: string
        }
        Update: {
          arena_match_id?: string | null
          cols?: number
          created_at?: string
          daily_date?: string | null
          difficulty?: Database["public"]["Enums"]["game_difficulty"]
          engine_version?: string
          finished_at?: string
          flags_correct?: number
          flags_placed?: number
          hints_used?: number
          id?: string
          mine_count?: number
          mistakes?: number
          no_guess?: boolean
          replay_blob?: string | null
          result?: Database["public"]["Enums"]["game_result"]
          rows?: number
          seed?: string
          source_mode?: Database["public"]["Enums"]["game_source_mode"]
          three_bv?: number
          three_bvs?: number
          time_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          best_time_ms: number | null
          completed_at: string | null
          lesson_id: string
          stars: number
          user_id: string
          viewed_at: string
        }
        Insert: {
          best_time_ms?: number | null
          completed_at?: string | null
          lesson_id: string
          stars?: number
          user_id: string
          viewed_at?: string
        }
        Update: {
          best_time_ms?: number | null
          completed_at?: string | null
          lesson_id?: string
          stars?: number
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          category: Database["public"]["Enums"]["lesson_category"]
          concept_md: string
          created_at: string
          demo_board: Json
          difficulty: Database["public"]["Enums"]["lesson_difficulty"]
          id: string
          order_in_category: number
          practice_board_config: Json
          published: boolean
          seo_meta: Json
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["lesson_category"]
          concept_md: string
          created_at?: string
          demo_board?: Json
          difficulty: Database["public"]["Enums"]["lesson_difficulty"]
          id?: string
          order_in_category?: number
          practice_board_config?: Json
          published?: boolean
          seo_meta?: Json
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["lesson_category"]
          concept_md?: string
          created_at?: string
          demo_board?: Json
          difficulty?: Database["public"]["Enums"]["lesson_difficulty"]
          id?: string
          order_in_category?: number
          practice_board_config?: Json
          published?: boolean
          seo_meta?: Json
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mines_transactions: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          reason: Database["public"]["Enums"]["mines_transaction_reason"]
          source_id: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          reason: Database["public"]["Enums"]["mines_transaction_reason"]
          source_id?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          reason?: Database["public"]["Enums"]["mines_transaction_reason"]
          source_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mines_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          granted_at: string | null
          granted_via: Database["public"]["Enums"]["subscription_granted_via"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          granted_at?: string | null
          granted_via?: Database["public"]["Enums"]["subscription_granted_via"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          granted_at?: string | null
          granted_via?: Database["public"]["Enums"]["subscription_granted_via"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_currency: {
        Row: {
          daily_earn_cap_reset_at: string | null
          last_earn_at: string | null
          mines_balance: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_earn_cap_reset_at?: string | null
          last_earn_at?: string | null
          mines_balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_earn_cap_reset_at?: string | null
          last_earn_at?: string | null
          mines_balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_currency_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          high_contrast: boolean
          long_press_to_flag: boolean
          tap_mode: Database["public"]["Enums"]["tap_mode"]
          theme: Database["public"]["Enums"]["theme_pref"]
          updated_at: string
          user_id: string
          zoom_on_expert: boolean
        }
        Insert: {
          high_contrast?: boolean
          long_press_to_flag?: boolean
          tap_mode?: Database["public"]["Enums"]["tap_mode"]
          theme?: Database["public"]["Enums"]["theme_pref"]
          updated_at?: string
          user_id: string
          zoom_on_expert?: boolean
        }
        Update: {
          high_contrast?: boolean
          long_press_to_flag?: boolean
          tap_mode?: Database["public"]["Enums"]["tap_mode"]
          theme?: Database["public"]["Enums"]["theme_pref"]
          updated_at?: string
          user_id?: string
          zoom_on_expert?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          country: string | null
          created_at: string
          display_name: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      coach_conversation_kind: "post_game_review" | "free_chat"
      coach_message_role: "user" | "assistant" | "system"
      game_difficulty: "beginner" | "intermediate" | "expert" | "custom"
      game_result: "win" | "loss" | "abandoned"
      game_source_mode:
        | "quick_play"
        | "daily"
        | "arena"
        | "practice"
        | "lesson_practice"
      lesson_category:
        | "patterns"
        | "probability"
        | "technique"
        | "opening"
        | "endgame"
      lesson_difficulty: "beginner" | "intermediate" | "advanced"
      mines_transaction_reason:
        | "game_finish"
        | "daily_finish"
        | "season_reward"
        | "shop_purchase"
        | "admin"
      subscription_granted_via: "free_default" | "fake_purchase" | "admin_grant"
      subscription_tier: "free" | "pro_lite" | "pro"
      tap_mode: "reveal" | "flag"
      theme_pref: "light" | "dark" | "system"
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
      coach_conversation_kind: ["post_game_review", "free_chat"],
      coach_message_role: ["user", "assistant", "system"],
      game_difficulty: ["beginner", "intermediate", "expert", "custom"],
      game_result: ["win", "loss", "abandoned"],
      game_source_mode: [
        "quick_play",
        "daily",
        "arena",
        "practice",
        "lesson_practice",
      ],
      lesson_category: [
        "patterns",
        "probability",
        "technique",
        "opening",
        "endgame",
      ],
      lesson_difficulty: ["beginner", "intermediate", "advanced"],
      mines_transaction_reason: [
        "game_finish",
        "daily_finish",
        "season_reward",
        "shop_purchase",
        "admin",
      ],
      subscription_granted_via: [
        "free_default",
        "fake_purchase",
        "admin_grant",
      ],
      subscription_tier: ["free", "pro_lite", "pro"],
      tap_mode: ["reveal", "flag"],
      theme_pref: ["light", "dark", "system"],
    },
  },
} as const
