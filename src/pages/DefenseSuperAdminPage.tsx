import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DefenseSuperAdminAuth } from './DefenseSuperAdminAuth';
import { DefenseSuperAdminDashboard } from './DefenseSuperAdminDashboard';

interface DefenseSuperAdmin {
  id: string;
  user_id: string;
  full_name: string;
  status: string;
}

export function DefenseSuperAdminPage() {
  const [admin, setAdmin] = useState<DefenseSuperAdmin | null>(null);

  if (!admin) {
    return <DefenseSuperAdminAuth onAuthenticated={setAdmin} />;
  }

  return (
    <DefenseSuperAdminDashboard
      admin={admin}
      onLogout={() => {
        setAdmin(null);
        supabase.auth.signOut();
      }}
    />
  );
}
