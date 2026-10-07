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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_generations: {
        Row: {
          cost_usd: number | null
          created_at: string
          error: string | null
          goal_id: string | null
          id: string
          input_tokens: number | null
          kind: string
          model: string | null
          output_tokens: number | null
          prompt_version: string | null
          status: string
          user_id: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          goal_id?: string | null
          id?: string
          input_tokens?: number | null
          kind: string
          model?: string | null
          output_tokens?: number | null
          prompt_version?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          goal_id?: string | null
          id?: string
          input_tokens?: number | null
          kind?: string
          model?: string | null
          output_tokens?: number | null
          prompt_version?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          description: string
          key: string
          position: number
          rule: Json
          title: string
          xp_bonus: number
        }
        Insert: {
          description: string
          key: string
          position?: number
          rule: Json
          title: string
          xp_bonus?: number
        }
        Update: {
          description?: string
          key?: string
          position?: number
          rule?: Json
          title?: string
          xp_bonus?: number
        }
        Relationships: []
      }
      blocks: {
        Row: {
          completed_at: string | null
          created_at: string
          day_plan_id: string
          end_local: string
          id: string
          intent: string | null
          kind: Database["public"]["Enums"]["block_kind"]
          position: number
          rounds_planned: number
          skill: string | null
          skipped_at: string | null
          start_local: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_plan_id: string
          end_local: string
          id?: string
          intent?: string | null
          kind?: Database["public"]["Enums"]["block_kind"]
          position?: number
          rounds_planned?: number
          skill?: string | null
          skipped_at?: string | null
          start_local: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_plan_id?: string
          end_local?: string
          id?: string
          intent?: string | null
          kind?: Database["public"]["Enums"]["block_kind"]
          position?: number
          rounds_planned?: number
          skill?: string | null
          skipped_at?: string | null
          start_local?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_day_plan_id_fkey"
            columns: ["day_plan_id"]
            isOneToOne: false
            referencedRelation: "day_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      character_lines: {
        Row: {
          approved: boolean
          body: string
          cooldown_minutes: number
          created_at: string
          domain: Database["public"]["Enums"]["goal_domain"] | null
          event: string
          humour_level: number
          id: string
          persona: Database["public"]["Enums"]["persona"]
          source: string
          user_id: string | null
          weight: number
        }
        Insert: {
          approved?: boolean
          body: string
          cooldown_minutes?: number
          created_at?: string
          domain?: Database["public"]["Enums"]["goal_domain"] | null
          event: string
          humour_level?: number
          id?: string
          persona: Database["public"]["Enums"]["persona"]
          source?: string
          user_id?: string | null
          weight?: number
        }
        Update: {
          approved?: boolean
          body?: string
          cooldown_minutes?: number
          created_at?: string
          domain?: Database["public"]["Enums"]["goal_domain"] | null
          event?: string
          humour_level?: number
          id?: string
          persona?: Database["public"]["Enums"]["persona"]
          source?: string
          user_id?: string | null
          weight?: number
        }
        Relationships: []
      }
      commute_legs: {
        Row: {
          created_at: string
          day_plan_id: string
          depart_local: string
          duration_s: number | null
          from_place_id: string | null
          id: string
          mode: string
          to_place_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day_plan_id: string
          depart_local: string
          duration_s?: number | null
          from_place_id?: string | null
          id?: string
          mode?: string
          to_place_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day_plan_id?: string
          depart_local?: string
          duration_s?: number | null
          from_place_id?: string | null
          id?: string
          mode?: string
          to_place_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commute_legs_day_plan_id_fkey"
            columns: ["day_plan_id"]
            isOneToOne: false
            referencedRelation: "day_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commute_legs_from_place_id_fkey"
            columns: ["from_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commute_legs_to_place_id_fkey"
            columns: ["to_place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      day_plans: {
        Row: {
          closed_at: string | null
          feasibility: Json | null
          generated_at: string
          generator: string
          id: string
          local_date: string
          plan_id: string | null
          timezone: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          feasibility?: Json | null
          generated_at?: string
          generator?: string
          id?: string
          local_date: string
          plan_id?: string | null
          timezone: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          feasibility?: Json | null
          generated_at?: string
          generator?: string
          id?: string
          local_date?: string
          plan_id?: string | null
          timezone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          id: number
          name: string
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          away_ms: number
          block_id: string
          created_at: string
          drift_count: number
          ended_at: string | null
          focus_ms: number
          id: string
          paused_at: string | null
          paused_ms: number
          preflight_passed: boolean
          round_ends_at: string | null
          round_index: number
          round_minutes: number
          rounds_planned: number
          started_at: string
          state: Database["public"]["Enums"]["session_state"]
          suspicion: number
          trip_ms: number
          user_id: string
        }
        Insert: {
          away_ms?: number
          block_id: string
          created_at?: string
          drift_count?: number
          ended_at?: string | null
          focus_ms?: number
          id?: string
          paused_at?: string | null
          paused_ms?: number
          preflight_passed?: boolean
          round_ends_at?: string | null
          round_index?: number
          round_minutes?: number
          rounds_planned?: number
          started_at?: string
          state?: Database["public"]["Enums"]["session_state"]
          suspicion?: number
          trip_ms?: number
          user_id: string
        }
        Update: {
          away_ms?: number
          block_id?: string
          created_at?: string
          drift_count?: number
          ended_at?: string | null
          focus_ms?: number
          id?: string
          paused_at?: string | null
          paused_ms?: number
          preflight_passed?: boolean
          round_ends_at?: string | null
          round_index?: number
          round_minutes?: number
          rounds_planned?: number
          started_at?: string
          state?: Database["public"]["Enums"]["session_state"]
          suspicion?: number
          trip_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          constraints: Json
          created_at: string
          domain: Database["public"]["Enums"]["goal_domain"]
          horizon: Database["public"]["Enums"]["goal_horizon"]
          id: string
          is_active: boolean
          raw_input: string
          title: string
          updated_at: string
          user_id: string
          why: string | null
        }
        Insert: {
          constraints?: Json
          created_at?: string
          domain?: Database["public"]["Enums"]["goal_domain"]
          horizon?: Database["public"]["Enums"]["goal_horizon"]
          id?: string
          is_active?: boolean
          raw_input: string
          title: string
          updated_at?: string
          user_id: string
          why?: string | null
        }
        Update: {
          constraints?: Json
          created_at?: string
          domain?: Database["public"]["Enums"]["goal_domain"]
          horizon?: Database["public"]["Enums"]["goal_horizon"]
          id?: string
          is_active?: boolean
          raw_input?: string
          title?: string
          updated_at?: string
          user_id?: string
          why?: string | null
        }
        Relationships: []
      }
      interruptions: {
        Row: {
          away_ms: number | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["interruption_kind"]
          note: string | null
          self_reported: boolean
          session_id: string
          source: string | null
          user_id: string
        }
        Insert: {
          away_ms?: number | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["interruption_kind"]
          note?: string | null
          self_reported?: boolean
          session_id: string
          source?: string | null
          user_id: string
        }
        Update: {
          away_ms?: number | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["interruption_kind"]
          note?: string | null
          self_reported?: boolean
          session_id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interruptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      line_history: {
        Row: {
          line_id: string
          shown_at: string
          user_id: string
        }
        Insert: {
          line_id: string
          shown_at?: string
          user_id: string
        }
        Update: {
          line_id?: string
          shown_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_history_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "character_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          coach_note: string | null
          completed_at: string | null
          created_at: string
          detail: string | null
          id: string
          is_keystone: boolean
          plan_id: string
          position: number
          skill: string | null
          target_date: string | null
          target_label: string | null
          title: string
          token_value: number
          user_id: string
          xp_value: number
        }
        Insert: {
          coach_note?: string | null
          completed_at?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          is_keystone?: boolean
          plan_id: string
          position?: number
          skill?: string | null
          target_date?: string | null
          target_label?: string | null
          title: string
          token_value?: number
          user_id: string
          xp_value?: number
        }
        Update: {
          coach_note?: string | null
          completed_at?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          is_keystone?: boolean
          plan_id?: string
          position?: number
          skill?: string | null
          target_date?: string | null
          target_label?: string | null
          title?: string
          token_value?: number
          user_id?: string
          xp_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "milestones_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_default_origin: boolean
          label: string
          lat: number
          lng: number
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_default_origin?: boolean
          label: string
          lat: number
          lng: number
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_default_origin?: boolean
          label?: string
          lat?: number
          lng?: number
          user_id?: string
        }
        Relationships: []
      }
      plan_templates: {
        Row: {
          blurb: string
          domain: Database["public"]["Enums"]["goal_domain"]
          key: string
          payload: Json
          position: number
          title: string
        }
        Insert: {
          blurb: string
          domain: Database["public"]["Enums"]["goal_domain"]
          key: string
          payload: Json
          position?: number
          title: string
        }
        Update: {
          blurb?: string
          domain?: Database["public"]["Enums"]["goal_domain"]
          key?: string
          payload?: Json
          position?: number
          title?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          clarifying_question: string | null
          created_at: string
          generated_by: string
          goal_id: string
          id: string
          is_active: boolean
          model: string | null
          north_star: string | null
          skills: Json
          summary: string | null
          user_id: string
          version: number
        }
        Insert: {
          clarifying_question?: string | null
          created_at?: string
          generated_by?: string
          goal_id: string
          id?: string
          is_active?: boolean
          model?: string | null
          north_star?: string | null
          skills?: Json
          summary?: string | null
          user_id: string
          version?: number
        }
        Update: {
          clarifying_question?: string | null
          created_at?: string
          generated_by?: string
          goal_id?: string
          id?: string
          is_active?: boolean
          model?: string | null
          north_star?: string | null
          skills?: Json
          summary?: string | null
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plans_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          onboarded_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          onboarded_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_coverage: {
        Row: {
          avg_actual_minutes: number | null
          last_done_on: string | null
          quest_item_id: string
          times_done: number
          user_id: string
        }
        Insert: {
          avg_actual_minutes?: number | null
          last_done_on?: string | null
          quest_item_id: string
          times_done?: number
          user_id: string
        }
        Update: {
          avg_actual_minutes?: number | null
          last_done_on?: string | null
          quest_item_id?: string
          times_done?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_coverage_quest_item_id_fkey"
            columns: ["quest_item_id"]
            isOneToOne: false
            referencedRelation: "quest_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_items: {
        Row: {
          created_at: string
          default_priority: Database["public"]["Enums"]["task_priority"]
          detail: string | null
          estimate_minutes: number
          id: string
          kind: Database["public"]["Enums"]["quest_kind"]
          plan_id: string | null
          repeatable: boolean
          retired_at: string | null
          review_after_days: number
          skill: string | null
          source: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_priority?: Database["public"]["Enums"]["task_priority"]
          detail?: string | null
          estimate_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["quest_kind"]
          plan_id?: string | null
          repeatable?: boolean
          retired_at?: string | null
          review_after_days?: number
          skill?: string | null
          source?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_priority?: Database["public"]["Enums"]["task_priority"]
          detail?: string | null
          estimate_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["quest_kind"]
          plan_id?: string | null
          repeatable?: boolean
          retired_at?: string | null
          review_after_days?: number
          skill?: string | null
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          body: string
          created_at: string
          id: string
          session_id: string | null
          skill: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          session_id?: string | null
          skill?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          session_id?: string | null
          skill?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_claims: {
        Row: {
          claimed_at: string
          id: string
          label: string
          reward_id: string | null
          tokens_spent: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          label: string
          reward_id?: string | null
          tokens_spent?: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          label?: string
          reward_id?: string | null
          tokens_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      stages: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          position: number
          requires_milestones: string[] | null
          requires_skill: string | null
          requires_skill_xp: number | null
          title: string
          track_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          requires_milestones?: string[] | null
          requires_skill?: string | null
          requires_skill_xp?: number | null
          title: string
          track_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          requires_milestones?: string[] | null
          requires_skill?: string | null
          requires_skill_xp?: number | null
          title?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tangents: {
        Row: {
          body: string
          id: string
          parked_at: string
          promoted_task_id: string | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          id?: string
          parked_at?: string
          promoted_task_id?: string | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          id?: string
          parked_at?: string
          promoted_task_id?: string | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tangents_promoted_task_id_fkey"
            columns: ["promoted_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          block_id: string
          completed_at: string | null
          created_at: string
          estimate_minutes: number | null
          id: string
          is_rescue: boolean
          is_review: boolean
          parent_task_id: string | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"]
          quest_item_id: string | null
          skill: string | null
          title: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          block_id: string
          completed_at?: string | null
          created_at?: string
          estimate_minutes?: number | null
          id?: string
          is_rescue?: boolean
          is_review?: boolean
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          quest_item_id?: string | null
          skill?: string | null
          title: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          block_id?: string
          completed_at?: string | null
          created_at?: string
          estimate_minutes?: number | null
          id?: string
          is_rescue?: boolean
          is_review?: boolean
          parent_task_id?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"]
          quest_item_id?: string | null
          skill?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_quest_item_id_fkey"
            columns: ["quest_item_id"]
            isOneToOne: false
            referencedRelation: "quest_items"
            referencedColumns: ["id"]
          },
        ]
      }
      token_ledger: {
        Row: {
          amount: number
          created_at: string
          id: number
          idempotency_key: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          idempotency_key: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          idempotency_key?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      tracks: {
        Row: {
          color: string | null
          goal_line: string | null
          id: string
          key: string
          plan_id: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          color?: string | null
          goal_line?: string | null
          id?: string
          key: string
          plan_id: string
          position?: number
          title: string
          user_id: string
        }
        Update: {
          color?: string | null
          goal_line?: string | null
          id?: string
          key?: string
          plan_id?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_cache: {
        Row: {
          depart_bucket: string
          dest_cell: string
          duration_s: number
          duration_traffic_s: number | null
          fetched_at: string
          id: number
          mode: string
          origin_cell: string
        }
        Insert: {
          depart_bucket: string
          dest_cell: string
          duration_s: number
          duration_traffic_s?: number | null
          fetched_at?: string
          id?: number
          mode: string
          origin_cell: string
        }
        Update: {
          depart_bucket?: string
          dest_cell?: string
          duration_s?: number
          duration_traffic_s?: number | null
          fetched_at?: string
          id?: number
          mode?: string
          origin_cell?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_on: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_on?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["key"]
          },
        ]
      }
      user_settings: {
        Row: {
          attention_checks_on: boolean
          break_minutes: number
          commute_assist_on: boolean
          daily_capacity_minutes: number
          humour_level: number
          notifications_on: boolean
          pace_factor: number
          ramp_up_minutes: number
          rest_days: number[]
          round_minutes: number
          snitch_intensity: number
          updated_at: string
          user_id: string
          workday_end: string
          workday_start: string
        }
        Insert: {
          attention_checks_on?: boolean
          break_minutes?: number
          commute_assist_on?: boolean
          daily_capacity_minutes?: number
          humour_level?: number
          notifications_on?: boolean
          pace_factor?: number
          ramp_up_minutes?: number
          rest_days?: number[]
          round_minutes?: number
          snitch_intensity?: number
          updated_at?: string
          user_id: string
          workday_end?: string
          workday_start?: string
        }
        Update: {
          attention_checks_on?: boolean
          break_minutes?: number
          commute_assist_on?: boolean
          daily_capacity_minutes?: number
          humour_level?: number
          notifications_on?: boolean
          pace_factor?: number
          ramp_up_minutes?: number
          rest_days?: number[]
          round_minutes?: number
          snitch_intensity?: number
          updated_at?: string
          user_id?: string
          workday_end?: string
          workday_start?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          combo: number
          focus_ms_total: number
          last_active_on: string | null
          max_combo: number
          updated_at: string
          user_id: string
        }
        Insert: {
          combo?: number
          focus_ms_total?: number
          last_active_on?: string | null
          max_combo?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          combo?: number
          focus_ms_total?: number
          last_active_on?: string | null
          max_combo?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_ledger: {
        Row: {
          amount: number
          created_at: string
          id: number
          idempotency_key: string
          local_date: string
          meta: Json
          reason: Database["public"]["Enums"]["xp_reason"]
          skill: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          idempotency_key: string
          local_date: string
          meta?: Json
          reason: Database["public"]["Enums"]["xp_reason"]
          skill?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          idempotency_key?: string
          local_date?: string
          meta?: Json
          reason?: Database["public"]["Enums"]["xp_reason"]
          skill?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_skill_xp: {
        Row: {
          skill: string | null
          user_id: string | null
          xp: number | null
          xp_7d: number | null
        }
        Relationships: []
      }
      v_token_balance: {
        Row: {
          tokens: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_xp_totals: {
        Row: {
          user_id: string | null
          xp: number | null
          xp_today: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _award_tokens: {
        Args: {
          p_amount: number
          p_key: string
          p_reason: string
          p_user: string
        }
        Returns: number
      }
      _award_xp: {
        Args: {
          p_amount: number
          p_key: string
          p_meta?: Json
          p_reason: Database["public"]["Enums"]["xp_reason"]
          p_skill: string
          p_user: string
        }
        Returns: number
      }
      fn_apply_template: {
        Args: { p_goal: string; p_template: string }
        Returns: {
          clarifying_question: string | null
          created_at: string
          generated_by: string
          goal_id: string
          id: string
          is_active: boolean
          model: string | null
          north_star: string | null
          skills: Json
          summary: string | null
          user_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_autocomplete_stages: { Args: { p_user?: string }; Returns: number }
      fn_check_badges: { Args: { p_user?: string }; Returns: string[] }
      fn_complete_block: { Args: { p_block: string }; Returns: Json }
      fn_complete_milestone: { Args: { p_milestone: string }; Returns: Json }
      fn_complete_task: {
        Args: { p_actual_minutes?: number; p_task: string }
        Returns: Json
      }
      fn_end_round: {
        Args: { p_session: string }
        Returns: {
          away_ms: number
          block_id: string
          created_at: string
          drift_count: number
          ended_at: string | null
          focus_ms: number
          id: string
          paused_at: string | null
          paused_ms: number
          preflight_passed: boolean
          round_ends_at: string | null
          round_index: number
          round_minutes: number
          rounds_planned: number
          started_at: string
          state: Database["public"]["Enums"]["session_state"]
          suspicion: number
          trip_ms: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "focus_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_feasibility: { Args: { p_date?: string }; Returns: Json }
      fn_generate_day: {
        Args: { p_date?: string; p_force?: boolean }
        Returns: {
          closed_at: string | null
          feasibility: Json | null
          generated_at: string
          generator: string
          id: string
          local_date: string
          plan_id: string | null
          timezone: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "day_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_learn_pace: { Args: { p_user: string }; Returns: number }
      fn_level: { Args: { p_xp: number }; Returns: number }
      fn_local_date: { Args: { p_user?: string }; Returns: string }
      fn_log_interruption: {
        Args: {
          p_away_ms?: number
          p_kind: Database["public"]["Enums"]["interruption_kind"]
          p_note?: string
          p_session: string
          p_source?: string
        }
        Returns: Json
      }
      fn_log_receipt: {
        Args: {
          p_body: string
          p_session: string
          p_skill?: string
          p_source?: string
        }
        Returns: Json
      }
      fn_neglected_skill: {
        Args: { p_plan: string; p_user: string }
        Returns: string
      }
      fn_open_crate: { Args: never; Returns: Json }
      fn_pace: { Args: { p_date?: string }; Returns: Json }
      fn_resume_round: {
        Args: { p_session: string }
        Returns: {
          away_ms: number
          block_id: string
          created_at: string
          drift_count: number
          ended_at: string | null
          focus_ms: number
          id: string
          paused_at: string | null
          paused_ms: number
          preflight_passed: boolean
          round_ends_at: string | null
          round_index: number
          round_minutes: number
          rounds_planned: number
          started_at: string
          state: Database["public"]["Enums"]["session_state"]
          suspicion: number
          trip_ms: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "focus_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_start_session: {
        Args: { p_block: string; p_preflight?: boolean }
        Returns: {
          away_ms: number
          block_id: string
          created_at: string
          drift_count: number
          ended_at: string | null
          focus_ms: number
          id: string
          paused_at: string | null
          paused_ms: number
          preflight_passed: boolean
          round_ends_at: string | null
          round_index: number
          round_minutes: number
          rounds_planned: number
          started_at: string
          state: Database["public"]["Enums"]["session_state"]
          suspicion: number
          trip_ms: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "focus_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_streak: { Args: { p_user?: string }; Returns: number }
      fn_suggest_cuts: {
        Args: { p_date?: string }
        Returns: {
          minutes: number
          reason: string
          task_id: string
          title: string
        }[]
      }
      fn_uncomplete_task: { Args: { p_task: string }; Returns: undefined }
    }
    Enums: {
      block_kind:
        | "study"
        | "lab"
        | "review"
        | "admin"
        | "break"
        | "commute"
        | "buffer"
      goal_domain:
        | "software"
        | "exams"
        | "business"
        | "fitness"
        | "creative"
        | "academic"
        | "career"
        | "admin"
        | "other"
      goal_horizon: "weeks" | "months" | "year" | "multi_year"
      interruption_kind:
        | "drift"
        | "study_trip"
        | "attention_check"
        | "snap_out"
        | "pause"
      persona: "nimbus" | "snitch" | "system"
      quest_kind:
        | "learn"
        | "practice"
        | "lab"
        | "review"
        | "build"
        | "outreach"
        | "admin"
        | "rest"
      session_state: "running" | "paused" | "break" | "completed" | "abandoned"
      task_priority: "side" | "main" | "boss"
      xp_reason:
        | "task"
        | "block"
        | "round"
        | "clean_block"
        | "day"
        | "milestone"
        | "stage"
        | "receipt"
        | "park"
        | "comeback"
        | "urge_surfed"
        | "attention_check"
        | "preflight"
        | "badge"
        | "streak"
        | "adjustment"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      block_kind: [
        "study",
        "lab",
        "review",
        "admin",
        "break",
        "commute",
        "buffer",
      ],
      goal_domain: [
        "software",
        "exams",
        "business",
        "fitness",
        "creative",
        "academic",
        "career",
        "admin",
        "other",
      ],
      goal_horizon: ["weeks", "months", "year", "multi_year"],
      interruption_kind: [
        "drift",
        "study_trip",
        "attention_check",
        "snap_out",
        "pause",
      ],
      persona: ["nimbus", "snitch", "system"],
      quest_kind: [
        "learn",
        "practice",
        "lab",
        "review",
        "build",
        "outreach",
        "admin",
        "rest",
      ],
      session_state: ["running", "paused", "break", "completed", "abandoned"],
      task_priority: ["side", "main", "boss"],
      xp_reason: [
        "task",
        "block",
        "round",
        "clean_block",
        "day",
        "milestone",
        "stage",
        "receipt",
        "park",
        "comeback",
        "urge_surfed",
        "attention_check",
        "preflight",
        "badge",
        "streak",
        "adjustment",
      ],
    },
  },
} as const
