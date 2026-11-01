import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StaffMember {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  department: string | null;
}

interface NewDirectMessageDialogProps {
  currentUserId: string;
  onStartDM: (targetUserId: string, targetName: string) => Promise<string | null>;
  trigger?: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  physician: 'Physician',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  radiologist: 'Radiologist',
  receptionist: 'Receptionist',
  billing: 'Billing',
};

export function NewDirectMessageDialog({ currentUserId, onStartDM, trigger }: NewDirectMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      // Fetch all profiles with their roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, department')
        .neq('user_id', currentUserId);

      if (!profiles) {
        setStaff([]);
        setLoading(false);
        return;
      }

      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      setStaff(profiles.map(p => ({
        userId: p.user_id,
        fullName: p.full_name,
        email: p.email,
        role: roleMap.get(p.user_id) || 'staff',
        department: p.department,
      })));
      setLoading(false);
    })();
  }, [open, currentUserId]);

  const filtered = staff.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (ROLE_LABELS[s.role] || s.role).toLowerCase().includes(q)
    );
  });

  const handleSelect = async (member: StaffMember) => {
    setStarting(member.userId);
    await onStartDM(member.userId, member.fullName);
    setStarting(null);
    setOpen(false);
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            New Message
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff by name, email, or role…"
            className="pl-9"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto -mx-1 mt-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {staff.length === 0 ? 'No other staff members found' : 'No matches'}
            </div>
          ) : (
            <div className="space-y-0.5 px-1">
              {filtered.map(member => (
                <button
                  key={member.userId}
                  onClick={() => handleSelect(member)}
                  disabled={starting === member.userId}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-muted flex items-center gap-3',
                    starting === member.userId && 'opacity-60'
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {member.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ROLE_LABELS[member.role] || member.role}
                      {member.department ? ` · ${member.department}` : ''}
                    </p>
                  </div>
                  {starting === member.userId && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
