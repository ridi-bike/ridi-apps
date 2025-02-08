export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      plans: {
        Row: {
          bearing: number | null
          created_at: string
          distance: number
          error: string | null
          finish_desc: string | null
          finish_lat: number | null
          finish_lon: number | null
          id: string
          modified_at: string | null
          name: string
          rule_set_id: string
          start_desc: string
          start_lat: number
          start_lon: number
          state: Database["public"]["Enums"]["plan_state"]
          trip_type: Database["public"]["Enums"]["plan_type"]
          user_id: string
        }
        Insert: {
          bearing?: number | null
          created_at?: string
          distance: number
          error?: string | null
          finish_desc?: string | null
          finish_lat?: number | null
          finish_lon?: number | null
          id?: string
          modified_at?: string | null
          name: string
          rule_set_id: string
          start_desc: string
          start_lat: number
          start_lon: number
          state?: Database["public"]["Enums"]["plan_state"]
          trip_type: Database["public"]["Enums"]["plan_type"]
          user_id: string
        }
        Update: {
          bearing?: number | null
          created_at?: string
          distance?: number
          error?: string | null
          finish_desc?: string | null
          finish_lat?: number | null
          finish_lon?: number | null
          id?: string
          modified_at?: string | null
          name?: string
          rule_set_id?: string
          start_desc?: string
          start_lat?: number
          start_lon?: number
          state?: Database["public"]["Enums"]["plan_state"]
          trip_type?: Database["public"]["Enums"]["plan_type"]
          user_id?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          geojson: Json
          id: string
          pbf_md5: string
          polygon: unknown | null
          region: string
          version: Database["public"]["Enums"]["regions_version"]
        }
        Insert: {
          geojson: Json
          id?: string
          pbf_md5: string
          polygon?: unknown | null
          region: string
          version: Database["public"]["Enums"]["regions_version"]
        }
        Update: {
          geojson?: Json
          id?: string
          pbf_md5?: string
          polygon?: unknown | null
          region?: string
          version?: Database["public"]["Enums"]["regions_version"]
        }
        Relationships: []
      }
      route_breakdown_stats: {
        Row: {
          id: string
          len_m: number
          percentage: number
          route_id: string
          stat_name: string
          stat_type: Database["public"]["Enums"]["route_stat_type"]
          user_id: string
        }
        Insert: {
          id?: string
          len_m: number
          percentage: number
          route_id: string
          stat_name: string
          stat_type: Database["public"]["Enums"]["route_stat_type"]
          user_id: string
        }
        Update: {
          id?: string
          len_m?: number
          percentage?: number
          route_id?: string
          stat_name?: string
          stat_type?: Database["public"]["Enums"]["route_stat_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_breakdown_stats_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          id: string
          linestring: unknown | null
          name: string
          plan_id: string
          stats_junction_count: number
          stats_len_m: number
          stats_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linestring?: unknown | null
          name: string
          plan_id: string
          stats_junction_count: number
          stats_len_m: number
          stats_score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linestring?: unknown | null
          name?: string
          plan_id?: string
          stats_junction_count?: number
          stats_len_m?: number
          stats_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_set_road_tags: {
        Row: {
          rule_set_id: string
          tag_key: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          rule_set_id: string
          tag_key: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          rule_set_id?: string
          tag_key?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_set_road_tags_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_sets: {
        Row: {
          id: string
          is_default: boolean
          name: string
          user_id: string | null
        }
        Insert: {
          id?: string
          is_default: boolean
          name: string
          user_id?: string | null
        }
        Update: {
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ksuid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      plan_state: "new" | "planning" | "done" | "error"
      plan_type: "round-trip" | "start-finish"
      regions_version: "previous" | "current" | "next" | "discarded"
      route_stat_type: "type" | "surface" | "smoothness"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

