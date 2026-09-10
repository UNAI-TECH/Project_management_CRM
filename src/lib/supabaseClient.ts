import { createClient } from '@supabase/supabase-js';

// Dedicated PM CRM Database URL
const PM_CRM_SUPABASE_URL = 
  import.meta.env.VITE_PM_CRM_SUPABASE_URL || 
  import.meta.env.VITE_SUPABASE_URL || 
  '';

const PM_CRM_SUPABASE_ANON_KEY = 
  import.meta.env.VITE_PM_CRM_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  '';

export const supabaseClient = createClient(PM_CRM_SUPABASE_URL, PM_CRM_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'unai_pm_crm_app_token',
  },
});

export const supabase = supabaseClient;

