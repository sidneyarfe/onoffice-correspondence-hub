export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contratacoes_clientes: {
        Row: {
          bairro: string | null
          cep: string
          cidade: string
          cnpj: string | null
          complemento_endereco: string | null
          cpf_responsavel: string
          created_at: string
          email: string
          endereco: string
          estado: string
          id: string
          mercadopago_customer_id: string | null
          mercadopago_paid_at: string | null
          mercadopago_payment_id: string | null
          mercadopago_payment_link: string | null
          nome_responsavel: string
          numero_endereco: string
          plano_selecionado: string
          razao_social: string | null
          status_contratacao: string
          telefone: string
          tipo_pessoa: string
          updated_at: string
          user_id: string | null
          zapsign_document_token: string | null
          zapsign_signed_at: string | null
          zapsign_signing_url: string | null
          zapsign_template_id: string | null
        }
        Insert: {
          bairro?: string | null
          cep: string
          cidade: string
          cnpj?: string | null
          complemento_endereco?: string | null
          cpf_responsavel: string
          created_at?: string
          email: string
          endereco: string
          estado: string
          id?: string
          mercadopago_customer_id?: string | null
          mercadopago_paid_at?: string | null
          mercadopago_payment_id?: string | null
          mercadopago_payment_link?: string | null
          nome_responsavel: string
          numero_endereco: string
          plano_selecionado: string
          razao_social?: string | null
          status_contratacao?: string
          telefone: string
          tipo_pessoa: string
          updated_at?: string
          user_id?: string | null
          zapsign_document_token?: string | null
          zapsign_signed_at?: string | null
          zapsign_signing_url?: string | null
          zapsign_template_id?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string
          cidade?: string
          cnpj?: string | null
          complemento_endereco?: string | null
          cpf_responsavel?: string
          created_at?: string
          email?: string
          endereco?: string
          estado?: string
          id?: string
          mercadopago_customer_id?: string | null
          mercadopago_paid_at?: string | null
          mercadopago_payment_id?: string | null
          mercadopago_payment_link?: string | null
          nome_responsavel?: string
          numero_endereco?: string
          plano_selecionado?: string
          razao_social?: string | null
          status_contratacao?: string
          telefone?: string
          tipo_pessoa?: string
          updated_at?: string
          user_id?: string | null
          zapsign_document_token?: string | null
          zapsign_signed_at?: string | null
          zapsign_signing_url?: string | null
          zapsign_template_id?: string | null
        }
        Relationships: []
      }
      form_submissions_rate_limit: {
        Row: {
          email: string | null
          first_submission_at: string | null
          id: string
          ip_address: unknown
          is_blocked: boolean | null
          last_submission_at: string | null
          submission_count: number | null
        }
        Insert: {
          email?: string | null
          first_submission_at?: string | null
          id?: string
          ip_address: unknown
          is_blocked?: boolean | null
          last_submission_at?: string | null
          submission_count?: number | null
        }
        Update: {
          email?: string | null
          first_submission_at?: string | null
          id?: string
          ip_address?: unknown
          is_blocked?: boolean | null
          last_submission_at?: string | null
          submission_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          password_changed: boolean | null
          role: string
          temporary_password_hash: string | null
          temporary_password_plain: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          password_changed?: boolean | null
          role?: string
          temporary_password_hash?: string | null
          temporary_password_plain?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          password_changed?: boolean | null
          role?: string
          temporary_password_hash?: string | null
          temporary_password_plain?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_ip_address: unknown
          p_email?: string
          p_max_submissions?: number
          p_time_window_hours?: number
        }
        Returns: boolean
      }
      generate_random_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_signing_url: {
        Args: { p_contratacao_id: string }
        Returns: string
      }
      get_user_contratacao_data: {
        Args: { p_user_id: string }
        Returns: Json
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      mark_password_changed: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      validate_cnpj: {
        Args: { cnpj_input: string }
        Returns: boolean
      }
      validate_cpf: {
        Args: { cpf_input: string }
        Returns: boolean
      }
      validate_temporary_password: {
        Args: { p_user_id: string; p_password: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
