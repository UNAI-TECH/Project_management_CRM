export interface Database {
  public: {
    Tables: {
      employees_cache: {
        Row: {
          employee_id: string;
          name: string;
          email: string;
          pm_crm_role: string;
          department: string;
          designation: string;
          is_active: boolean;
          last_synced_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employees_cache']['Row'], 'last_synced_at'>;
        Update: Partial<Database['public']['Tables']['employees_cache']['Row']>;
      };
      projects: {
        Row: {
          id: string;
          project_code: string;
          name: string;
          client: string;
          sponsor: string;
          status: string;
          priority: string;
          department: string;
          start_date: string;
          target_end_date: string;
          progress: number;
          pm_name: string;
          pm_id: string;
          description: string;
          lifecycle_phase: string;
          organization_id: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Row']>;
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          employee_id: string;
          project_role: string;
          reports_to: string | null;
          assigned_by: string;
          assigned_at: string;
          organization_id: string;
        };
        Insert: Omit<Database['public']['Tables']['project_members']['Row'], 'id' | 'assigned_at'>;
        Update: Partial<Database['public']['Tables']['project_members']['Row']>;
      };
      project_documents: {
        Row: {
          id: string;
          project_id: string;
          doc_type: number;
          doc_number: string;
          name: string;
          phase: string;
          version: string;
          status: string;
          completion: number;
          owner_id: string;
          owner_name: string;
          content: Record<string, any>;
          files: any;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['project_documents']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['project_documents']['Row']>;
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_no: string;
          snapshot: Record<string, any>;
          changed_by: string;
          changed_by_name: string;
          remarks: string;
          changed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['document_versions']['Row'], 'id' | 'changed_at'>;
        Update: Partial<Database['public']['Tables']['document_versions']['Row']>;
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          doc_id: string | null;
          title: string;
          description: string;
          assigned_by: string;
          assigned_by_name: string;
          assigned_by_role: string;
          assigned_to: string;
          assigned_to_name: string;
          assigned_to_role: string;
          assigned_to_designation: string;
          status: string;
          priority: string;
          due_date: string;
          progress: number;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tasks']['Row']>;
      };
      task_reference_files: {
        Row: {
          id: string;
          task_id: string;
          name: string;
          type: string;
          url: string;
          size: string;
          uploaded_by: string;
          uploaded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['task_reference_files']['Row'], 'id' | 'uploaded_at'>;
        Update: Partial<Database['public']['Tables']['task_reference_files']['Row']>;
      };
      task_submissions: {
        Row: {
          id: string;
          task_id: string;
          submitted_by: string;
          submitted_by_name: string;
          notes: string;
          file_urls: string[];
          reference_urls: string[];
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['task_submissions']['Row'], 'id' | 'submitted_at'>;
        Update: Partial<Database['public']['Tables']['task_submissions']['Row']>;
      };
      task_status_log: {
        Row: {
          id: string;
          task_id: string;
          from_status: string;
          to_status: string;
          changed_by: string;
          changed_by_name: string;
          remarks: string;
          changed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['task_status_log']['Row'], 'id' | 'changed_at'>;
        Update: Partial<Database['public']['Tables']['task_status_log']['Row']>;
      };
      audit_log: {
        Row: {
          id: string;
          timestamp: string;
          actor_id: string;
          actor_name: string;
          actor_role: string;
          action: string;
          entity_type: string;
          entity_id: string;
          details: string;
          organization_id: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'timestamp'>;
        Update: Partial<Database['public']['Tables']['audit_log']['Row']>;
      };
    };
  };
}
