import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Loader2, Lock, AlertTriangle, Star } from 'lucide-react';

interface DefenseSuperAdmin {
  id: string;
  user_id: string;
  full_name: string;
  status: string;
}

export function DefenseSuperAdminAuth({ onAuthenticated }: { onAuthenticated: (admin: DefenseSuperAdmin) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Enter email and password');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Invalid credentials');
      setLoading(false);
      return;
    }
    const { data: adminData } = await supabase
      .from('defense_super_admins')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!adminData) {
      toast.error('You do not have defense super admin privileges.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    toast.success('Defense Super Admin access granted');
    onAuthenticated(adminData as DefenseSuperAdmin);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/20 mb-3">
            <Star className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-sidebar-foreground">Defense Health Super Admin</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Network-Wide Command & Oversight</p>
        </div>

        <Card className="border-sidebar-border bg-card">
          <CardHeader>
            <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-amber-500" /> Classified Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Super Admin Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@defense.mil"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
              Authenticate
            </Button>
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-sidebar-foreground/40">
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Top Secret Clearance Required</span>
          <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Defense Health Network</span>
        </div>
      </div>
    </div>
  );
}
