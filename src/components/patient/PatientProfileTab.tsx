import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  User, Camera, Loader2, Save, X, Plus, Trash2, AlertTriangle, Heart,
  Activity, Pill, FolderOpen, Shield, Phone, MapPin, Calendar, Droplet,
  Ruler, Briefcase, Flag, HeartHandshake, Edit3, Check,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface PatientAccount {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  photo_url: string | null;
  blood_type: string | null;
  height_cm: number | null;
  nationality: string | null;
  occupation: string | null;
  marital_status: string | null;
}

interface Allergy {
  id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction_type: string | null;
  notes: string | null;
  noted_date: string | null;
  created_at: string;
}

interface PatientProfileTabProps {
  patientUserId: string;
  accountId: string;
  onProfileUpdate?: (updates: { patientName: string }) => void;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SEVERITY_COLORS: Record<string, string> = {
  mild: 'border-green-500/40 bg-green-500/10 text-green-600',
  moderate: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-600',
  severe: 'border-red-500/40 bg-red-500/10 text-red-600',
};

export function PatientProfileTab({ patientUserId, accountId, onProfileUpdate }: PatientProfileTabProps) {
  const [profile, setProfile] = useState<PatientAccount | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [allergyDialogOpen, setAllergyDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Partial<PatientAccount>>({});
  const [allergyForm, setAllergyForm] = useState({
    allergen: '', severity: 'moderate' as 'mild' | 'moderate' | 'severe',
    reaction_type: '', notes: '', noted_date: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchAllergies();
  }, [accountId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patient_accounts')
      .select('*')
      .eq('id', accountId)
      .maybeSingle();
    if (error) {
      toast.error('Could not load your profile.');
    } else if (data) {
      setProfile(data as PatientAccount);
      setForm(data as PatientAccount);
    }
    setLoading(false);
  };

  const fetchAllergies = async () => {
    const { data } = await supabase
      .from('patient_allergies')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false });
    if (data) setAllergies(data as Allergy[]);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${patientUserId}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updErr } = await supabase
        .from('patient_accounts')
        .update({ photo_url: photoUrl })
        .eq('id', accountId);
      if (updErr) throw updErr;

      setProfile(prev => prev ? { ...prev, photo_url: photoUrl } : prev);
      toast.success('Profile photo updated.');
    } catch {
      toast.error('Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updates = {
        full_name: form.full_name,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        address: form.address || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        blood_type: form.blood_type || null,
        height_cm: form.height_cm ? parseFloat(String(form.height_cm)) : null,
        nationality: form.nationality || null,
        occupation: form.occupation || null,
        marital_status: form.marital_status || null,
      };

      const { error } = await supabase
        .from('patient_accounts')
        .update(updates)
        .eq('id', accountId);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } as PatientAccount : prev);
      setEditing(false);
      toast.success('Profile saved.');
      if (onProfileUpdate && form.full_name) {
        onProfileUpdate({ patientName: form.full_name });
      }
    } catch {
      toast.error('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllergy = async () => {
    if (!allergyForm.allergen.trim()) {
      toast.error('Please enter what you are allergic to.');
      return;
    }
    try {
      const { error } = await supabase
        .from('patient_allergies')
        .insert({
          patient_user_id: patientUserId,
          allergen: allergyForm.allergen.trim(),
          severity: allergyForm.severity,
          reaction_type: allergyForm.reaction_type || null,
          notes: allergyForm.notes || null,
          noted_date: allergyForm.noted_date || null,
        });
      if (error) throw error;
      toast.success('Allergy added.');
      setAllergyDialogOpen(false);
      setAllergyForm({ allergen: '', severity: 'moderate', reaction_type: '', notes: '', noted_date: '' });
      fetchAllergies();
    } catch {
      toast.error('Could not add allergy.');
    }
  };

  const handleDeleteAllergy = async (id: string) => {
    const { error } = await supabase.from('patient_allergies').delete().eq('id', id);
    if (error) {
      toast.error('Could not remove allergy.');
      return;
    }
    toast.success('Allergy removed.');
    fetchAllergies();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16 space-y-2">
        <User className="h-12 w-12 mx-auto text-muted-foreground/40" />
        <p className="font-medium text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const initials = profile.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Card with Photo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Profile Photo */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-border bg-muted flex items-center justify-center">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">{initials}</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                title="Change photo"
              >
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>

            {/* Name & Quick Info */}
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h2 className="text-2xl font-bold">{profile.full_name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
                {profile.blood_type && (
                  <Badge variant="outline" className="gap-1">
                    <Droplet className="h-3 w-3 text-red-500" /> {profile.blood_type}
                  </Badge>
                )}
                {profile.height_cm && (
                  <Badge variant="outline" className="gap-1">
                    <Ruler className="h-3 w-3" /> {profile.height_cm} cm
                  </Badge>
                )}
                {profile.date_of_birth && (
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" /> {format(parseISO(profile.date_of_birth), 'MMM d, yyyy')}
                  </Badge>
                )}
                {profile.gender && (
                  <Badge variant="outline" className="capitalize">{profile.gender}</Badge>
                )}
              </div>
            </div>

            {/* Edit Button */}
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => { setForm(profile); setEditing(true); }}>
                <Edit3 className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allergies Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Allergies
            {allergies.length > 0 && (
              <Badge variant="secondary" className="ml-1">{allergies.length}</Badge>
            )}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAllergyDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Allergy
          </Button>
        </CardHeader>
        <CardContent>
          {allergies.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No known allergies on file</p>
              <p className="text-xs text-muted-foreground">Add any drug, food, or environmental allergies to keep your care team informed</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allergies.map(a => (
                <div
                  key={a.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-all"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{a.allergen}</p>
                      <Badge variant="outline" className={SEVERITY_COLORS[a.severity]}>
                        {a.severity}
                      </Badge>
                    </div>
                    {a.reaction_type && (
                      <p className="text-sm text-muted-foreground">Reaction: {a.reaction_type}</p>
                    )}
                    {a.notes && (
                      <p className="text-xs text-muted-foreground">{a.notes}</p>
                    )}
                    {a.noted_date && (
                      <p className="text-xs text-muted-foreground">Noted: {format(parseISO(a.noted_date), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDeleteAllergy(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Details — View or Edit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Personal & Medical Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-5">
              {/* Personal */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Personal</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth || ''} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gender</Label>
                    <Select value={form.gender || ''} onValueChange={v => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Address</Label>
                    <Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Your home address" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nationality</Label>
                    <Input value={form.nationality || ''} onChange={e => setForm({ ...form, nationality: e.target.value })} placeholder="e.g. Nigerian" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Occupation</Label>
                    <Input value={form.occupation || ''} onChange={e => setForm({ ...form, occupation: e.target.value })} placeholder="e.g. Teacher" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Marital Status</Label>
                    <Select value={form.marital_status || ''} onValueChange={v => setForm({ ...form, marital_status: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Medical */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Medical</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Blood Type</Label>
                    <Select value={form.blood_type || ''} onValueChange={v => setForm({ ...form, blood_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Height (cm)</Label>
                    <Input type="number" min="0" max="300" value={form.height_cm || ''} onChange={e => setForm({ ...form, height_cm: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 175" />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Emergency Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Contact Name</Label>
                    <Input value={form.emergency_contact_name || ''} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} placeholder="Who should we call?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Phone</Label>
                    <Input value={form.emergency_contact_phone || ''} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} placeholder="Their phone number" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                </Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(profile); }}>
                  <X className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <InfoSection title="Personal" items={[
                { icon: User, label: 'Full Name', value: profile.full_name },
                { icon: Calendar, label: 'Date of Birth', value: profile.date_of_birth ? format(parseISO(profile.date_of_birth), 'MMM d, yyyy') : null },
                { icon: User, label: 'Gender', value: profile.gender },
                { icon: Phone, label: 'Phone', value: profile.phone },
                { icon: MapPin, label: 'Address', value: profile.address },
                { icon: Flag, label: 'Nationality', value: profile.nationality },
                { icon: Briefcase, label: 'Occupation', value: profile.occupation },
                { icon: HeartHandshake, label: 'Marital Status', value: profile.marital_status },
              ]} />
              <InfoSection title="Medical" items={[
                { icon: Droplet, label: 'Blood Type', value: profile.blood_type },
                { icon: Ruler, label: 'Height', value: profile.height_cm ? `${profile.height_cm} cm` : null },
              ]} />
              <InfoSection title="Emergency Contact" items={[
                { icon: User, label: 'Name', value: profile.emergency_contact_name },
                { icon: Phone, label: 'Phone', value: profile.emergency_contact_phone },
              ]} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access to Other Health Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickCard icon={Activity} title="Vitals" description="Weight, blood pressure, heart rate & more" />
        <QuickCard icon={Pill} title="Medications" description="Current and past medication history" />
        <QuickCard icon={FolderOpen} title="Medical Records" description="Lab tests, scans, and documents" />
      </div>

      {/* Add Allergy Dialog */}
      <Dialog open={allergyDialogOpen} onOpenChange={setAllergyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Add Allergy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Allergen *</Label>
              <Input
                value={allergyForm.allergen}
                onChange={e => setAllergyForm({ ...allergyForm, allergen: e.target.value })}
                placeholder="e.g. Penicillin, Peanuts, Latex"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={allergyForm.severity} onValueChange={v => setAllergyForm({ ...allergyForm, severity: v as 'mild' | 'moderate' | 'severe' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe (life-threatening)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reaction Type</Label>
              <Input
                value={allergyForm.reaction_type}
                onChange={e => setAllergyForm({ ...allergyForm, reaction_type: e.target.value })}
                placeholder="e.g. Hives, Anaphylaxis, Rash"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date Noted</Label>
              <Input
                type="date"
                value={allergyForm.noted_date}
                onChange={e => setAllergyForm({ ...allergyForm, noted_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={allergyForm.notes}
                onChange={e => setAllergyForm({ ...allergyForm, notes: e.target.value })}
                placeholder="Any additional details"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAllergyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAllergy}>
              <Check className="h-4 w-4 mr-2" /> Add Allergy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoSection({ title, items }: {
  title: string;
  items: { icon: typeof User; label: string; value: string | null }[];
}) {
  const filled = items.filter(i => i.value);
  if (filled.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {filled.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium truncate capitalize">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickCard({ icon: Icon, title, description }: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-xl border border-border hover:border-primary/30 transition-all bg-card">
      <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-3">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
