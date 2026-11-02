export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      board_columns: {
        Row: {
          created_at: string;
          id: string;
          is_done: boolean;
          name: string;
          position: number;
          project_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_done?: boolean;
          name: string;
          position?: number;
          project_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_done?: boolean;
          name?: string;
          position?: number;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "board_columns_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_columns_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      environment_urls: {
        Row: {
          created_at: string;
          environment_id: string;
          id: string;
          label: string | null;
          position: number;
          project_id: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          environment_id: string;
          id?: string;
          label?: string | null;
          position?: number;
          project_id: string;
          url: string;
        };
        Update: {
          created_at?: string;
          environment_id?: string;
          id?: string;
          label?: string | null;
          position?: number;
          project_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "environment_urls_environment_id_project_id_fkey";
            columns: ["environment_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      environments: {
        Row: {
          branch: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["environment_kind"];
          name: string;
          position: number;
          project_id: string;
          repository_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          branch: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["environment_kind"];
          name: string;
          position?: number;
          project_id: string;
          repository_id: string;
          updated_at?: string;
        };
        Update: {
          branch?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["environment_kind"];
          name?: string;
          position?: number;
          project_id?: string;
          repository_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "environments_repository_id_project_id_fkey";
            columns: ["repository_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "repositories";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      invitations: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          invited_by: string;
          project_id: string;
          responded_at: string | null;
          role: Database["public"]["Enums"]["project_role"];
          status: Database["public"]["Enums"]["invitation_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          invited_by?: string;
          project_id: string;
          responded_at?: string | null;
          role?: Database["public"]["Enums"]["project_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string;
          project_id?: string;
          responded_at?: string | null;
          role?: Database["public"]["Enums"]["project_role"];
          status?: Database["public"]["Enums"]["invitation_status"];
        };
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      labels: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          name: string;
          project_id: string;
        };
        ComputedFields: never;
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          name: string;
          project_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "labels_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "labels_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          joined_at: string;
          project_id: string;
          role: Database["public"]["Enums"]["project_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          joined_at?: string;
          project_id: string;
          role: Database["public"]["Enums"]["project_role"];
          user_id: string;
        };
        Update: {
          joined_at?: string;
          project_id?: string;
          role?: Database["public"]["Enums"]["project_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_pins: {
        Row: {
          pinned_at: string;
          project_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          pinned_at?: string;
          project_id: string;
          user_id?: string;
        };
        Update: {
          pinned_at?: string;
          project_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_pins_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_pins_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_pins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          last_activity_at: string;
          name: string;
          owner_id: string;
          status: Database["public"]["Enums"]["project_status"];
          tech_tags: string[];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          last_activity_at?: string;
          name: string;
          owner_id?: string;
          status?: Database["public"]["Enums"]["project_status"];
          tech_tags?: string[];
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          last_activity_at?: string;
          name?: string;
          owner_id?: string;
          status?: Database["public"]["Enums"]["project_status"];
          tech_tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quick_links: {
        Row: {
          created_at: string;
          id: string;
          label: string;
          position: number;
          project_id: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          label: string;
          position?: number;
          project_id: string;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string;
          position?: number;
          project_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quick_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quick_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      releases: {
        Row: {
          created_at: string;
          created_by: string | null;
          environment_id: string;
          id: string;
          notes: string;
          project_id: string;
          released_at: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          environment_id: string;
          id?: string;
          notes?: string;
          project_id: string;
          released_at?: string;
          version: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          environment_id?: string;
          id?: string;
          notes?: string;
          project_id?: string;
          released_at?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "releases_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "releases_environment_id_project_id_fkey";
            columns: ["environment_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      repositories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          position: number;
          project_id: string;
          provider: Database["public"]["Enums"]["repo_provider"] | null;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          project_id: string;
          provider?: never;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          project_id?: string;
          provider?: never;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repositories_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repositories_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      task_labels: {
        Row: {
          label_id: string;
          project_id: string;
          task_id: string;
        };
        ComputedFields: never;
        Insert: {
          label_id: string;
          project_id: string;
          task_id: string;
        };
        Update: {
          label_id?: string;
          project_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_labels_label_id_project_id_fkey";
            columns: ["label_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "labels";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "task_labels_task_id_project_id_fkey";
            columns: ["task_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      tasks: {
        Row: {
          assignee_id: string | null;
          column_id: string;
          created_at: string;
          created_by: string | null;
          description: string;
          due_date: string | null;
          id: string;
          position: number;
          priority: Database["public"]["Enums"]["task_priority"];
          project_id: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          assignee_id?: string | null;
          column_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          due_date?: string | null;
          id?: string;
          position?: number;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          column_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          due_date?: string | null;
          id?: string;
          position?: number;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_column_id_project_id_fkey";
            columns: ["column_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "board_columns";
            referencedColumns: ["id", "project_id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      environment_versions: {
        Row: {
          environment_id: string;
          project_id: string;
          release_id: string;
          released_at: string;
          version: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "releases_environment_id_project_id_fkey";
            columns: ["environment_id", "project_id"];
            isOneToOne: false;
            referencedRelation: "environments";
            referencedColumns: ["id", "project_id"];
          },
        ];
      };
      project_cards: {
        Row: {
          description: string;
          id: string;
          last_activity_at: string;
          my_role: Database["public"]["Enums"]["project_role"];
          name: string;
          open_task_count: number | null;
          pinned_at: string | null;
          production_version: string | null;
          status: Database["public"]["Enums"]["project_status"];
          tech_tags: string[];
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      accept_invitation: { Args: { p_invitation_id: string }; Returns: string };
      check_invitee: {
        Args: { p_email: string; p_project_id: string };
        Returns: {
          display_name: string;
          has_pending_invitation: boolean;
          is_member: boolean;
          is_registered: boolean;
        }[];
      };
      create_repository: {
        Args: {
          p_development_branch?: string | null;
          p_name: string;
          p_production_branch: string;
          p_project_id: string;
          p_url: string;
        };
        Returns: string;
      };
      decline_invitation: { Args: { p_invitation_id: string }; Returns: undefined };
      my_pending_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          id: string;
          invited_by_name: string;
          project_id: string;
          project_name: string;
          role: Database["public"]["Enums"]["project_role"];
        }[];
      };
      project_pending_invitations: {
        Args: { p_project_id: string };
        Returns: {
          created_at: string;
          email: string;
          id: string;
          invitee_name: string;
          is_registered: boolean;
          role: Database["public"]["Enums"]["project_role"];
        }[];
      };
    };
    Enums: {
      environment_kind: "production" | "staging" | "development" | "preview" | "other";
      invitation_status: "pending" | "accepted" | "declined";
      project_role: "owner" | "editor" | "viewer";
      project_status: "active" | "inactive";
      repo_provider: "github" | "gitlab" | "bitbucket" | "other";
      task_priority: "low" | "medium" | "high" | "urgent";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      environment_kind: ["production", "staging", "development", "preview", "other"],
      invitation_status: ["pending", "accepted", "declined"],
      project_role: ["owner", "editor", "viewer"],
      project_status: ["active", "inactive"],
      repo_provider: ["github", "gitlab", "bitbucket", "other"],
      task_priority: ["low", "medium", "high", "urgent"],
    },
  },
} as const;
