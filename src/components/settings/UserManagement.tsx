import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Upload, Loader2, CheckCircle2, XCircle, Download, Users, RefreshCw, Search, Clock, ShieldCheck, Mail } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'physician', label: 'Physician' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'radiologist', label: 'Radiologist' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'billing', label: 'Billing' },
];

const DEPARTMENTS = [
  'Internal Medicine', 'Surgery', 'Pediatrics', 'Obstetrics', 'Emergency',
  'Radiology', 'Laboratory', 'Pharmacy', 'Administration', 'Reception',
  'General Ward', 'ICU', 'Billing',
];

interface CreateResult {
  email: string;
  success: boolean;
  error?: string;
}

export function UserManagement() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<CreateResult[]>([]);
  const [csvData, setCsvData] = useState<Array<{email: string; full_name: string; role: string; department: string; phone: string}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('directory');

  // Staff directory state
  interface StaffMember {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    department: string | null;
    phone: string | null;
    roles: string[];
    confirmed: boolean;
    last_sign_in: string | null;
    created_at: string;
  }
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [staffFilter, setStaffFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchStaff = useCallback(async () => {
    setIsLoadingStaff(true);
    try {
      const response = await supabase.functions.invoke('list-staff');
      if (response.error) {
        toast.error('Failed to load staff directory');
        return;
      }
      if (response.data?.staff) {
        setStaffList(response.data.staff);
      }
    } catch {
      toast.error('Failed to load staff directory');
    } finally {
      setIsLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = !staffFilter || 
      s.full_name.toLowerCase().includes(staffFilter.toLowerCase()) ||
      s.email.toLowerCase().includes(staffFilter.toLowerCase()) ||
      (s.department || '').toLowerCase().includes(staffFilter.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Individual form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: '',
    department: '',
    phone: '',
  });

  const handleCreateSingle = async () => {
    if (!formData.email || !formData.full_name || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-staff-account', {
        body: {
          accounts: [{
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            department: formData.department || undefined,
            phone: formData.phone || undefined,
          }],
        },
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to create account');
        return;
      }

      const data = response.data;
      setResults(data.results);

      if (data.summary.success > 0) {
        toast.success(`Account created for ${formData.email}. An invitation email has been sent.`);
        setFormData({ email: '', full_name: '', role: '', department: '', phone: '' });
        fetchStaff();
      } else {
        toast.error(data.results[0]?.error || 'Failed to create account');
      }
    } catch (err) {
      toast.error('Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const emailIdx = headers.indexOf('email');
      const nameIdx = headers.indexOf('full_name') !== -1 ? headers.indexOf('full_name') : headers.indexOf('name');
      const roleIdx = headers.indexOf('role');
      const deptIdx = headers.indexOf('department');
      const phoneIdx = headers.indexOf('phone');

      if (emailIdx === -1 || nameIdx === -1 || roleIdx === -1) {
        toast.error('CSV must have email, full_name (or name), and role columns');
        return;
      }

      const parsed = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim());
        return {
          email: cols[emailIdx] || '',
          full_name: cols[nameIdx] || '',
          role: cols[roleIdx] || '',
          department: deptIdx !== -1 ? cols[deptIdx] || '' : '',
          phone: phoneIdx !== -1 ? cols[phoneIdx] || '' : '',
        };
      }).filter(row => row.email && row.full_name && row.role);

      if (parsed.length === 0) {
        toast.error('No valid rows found in CSV');
        return;
      }

      if (parsed.length > 50) {
        toast.error('Maximum 50 accounts per upload');
        return;
      }

      setCsvData(parsed);
      toast.info(`${parsed.length} staff accounts ready to import`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBulkCreate = async () => {
    if (csvData.length === 0) return;

    setIsSubmitting(true);
    setResults([]);

    try {
      const response = await supabase.functions.invoke('create-staff-account', {
        body: { accounts: csvData },
      });

      if (response.error) {
        toast.error(response.error.message || 'Failed to create accounts');
        return;
      }

      const data = response.data;
      setResults(data.results);

      if (data.summary.success > 0) {
        toast.success(`${data.summary.success} account(s) created successfully. Invitation emails sent.`);
        fetchStaff();
      }
      if (data.summary.failed > 0) {
        toast.warning(`${data.summary.failed} account(s) failed to create.`);
      }
      setCsvData([]);
    } catch (err) {
      toast.error('Failed to create accounts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'email,full_name,role,department,phone\njohn@hospital.org,Dr. John Smith,physician,Internal Medicine,08012345678\njane@hospital.org,Jane Doe,nurse,General Ward,08098765432';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Staff Account Management</h2>
          <p className="text-sm text-muted-foreground">Create login accounts for hospital staff. They will receive an email invitation to set their password.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="directory" className="gap-2">
            <Users className="h-4 w-4" />
            Staff Directory
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Individual
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Upload className="h-4 w-4" />
            CSV Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Staff Directory</CardTitle>
                  <CardDescription>{staffList.length} staff account{staffList.length !== 1 ? 's' : ''} registered</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchStaff} disabled={isLoadingStaff} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoadingStaff ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or department..."
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoadingStaff ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {staffList.length === 0 ? (
                    <div className="space-y-2">
                      <Users className="h-10 w-10 mx-auto opacity-40" />
                      <p>No staff accounts created yet.</p>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('individual')} className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Create First Account
                      </Button>
                    </div>
                  ) : (
                    <p>No staff matching your filters.</p>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Sign In</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">{staff.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {staff.roles.map(role => (
                                <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs">
                                  {role === 'admin' && <ShieldCheck className="h-3 w-3 mr-1" />}
                                  {role.replace('_', ' ')}
                                </Badge>
                              ))}
                              {staff.roles.length === 0 && <span className="text-xs text-muted-foreground">No role</span>}
                            </div>
                          </TableCell>
                          <TableCell>{staff.department || '—'}</TableCell>
                          <TableCell>
                            {staff.confirmed ? (
                              <Badge variant="outline" className="gap-1 text-xs border-success/30 text-success">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs border-warning/30 text-warning">
                                <Mail className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {staff.last_sign_in ? (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(staff.last_sign_in)}
                              </span>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Staff Account</CardTitle>
              <CardDescription>Add a new staff member. An invitation email will be sent to set their password.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="Dr. John Smith"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@hospital.org"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.department} onValueChange={(v) => setFormData(prev => ({ ...prev, department: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="08012345678"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleCreateSingle} disabled={isSubmitting} className="mt-6">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Create Account & Send Invite
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bulk CSV Import</CardTitle>
              <CardDescription>Upload a CSV file with staff details to create multiple accounts at once (max 50).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload CSV
                  </Button>
                </div>
              </div>

              {csvData.length > 0 && (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Department</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.full_name}</TableCell>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {row.role.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.department || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button onClick={handleBulkCreate} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    Create {csvData.length} Account{csvData.length > 1 ? 's' : ''} & Send Invites
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.email}</p>
                    {result.error && <p className="text-xs text-destructive">{result.error}</p>}
                  </div>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? 'Created' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
