import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Plus, FileText, Download, Trash2, Search, Upload, Loader2, Image, File, Syringe, ClipboardList } from 'lucide-react';

interface MedicalRecord {
  id: string;
  title: string;
  record_type: string;
  provider_name: string | null;
  record_date: string | null;
  notes: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

const RECORD_TYPES = [
  { value: 'lab_test', label: 'Lab Test', icon: ClipboardList },
  { value: 'lab_report', label: 'Lab Report', icon: ClipboardList },
  { value: 'radiology_test', label: 'Radiology Test', icon: Image },
  { value: 'radiology_report', label: 'Radiology Report', icon: Image },
  { value: 'discharge_summary', label: 'Discharge Summary', icon: FileText },
  { value: 'prescription', label: 'Prescription', icon: File },
  { value: 'vaccination', label: 'Vaccination', icon: Syringe },
  { value: 'other', label: 'Other', icon: FileText },
];

export function MedicalRecordsTab({ patientUserId }: { patientUserId: string }) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState('other');
  const [providerName, setProviderName] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { fetchRecords(); }, [patientUserId]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_medical_records')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false });
    if (data) setRecords(data as MedicalRecord[]);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setUploading(true);

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      const filePath = `${patientUserId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('medical-records').upload(filePath, file);
      if (error) { toast.error('File upload failed'); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from('medical-records').getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
      fileName = file.name;
      fileSize = file.size;
    }

    const { error } = await supabase.from('patient_medical_records').insert({
      patient_user_id: patientUserId,
      title,
      record_type: recordType,
      provider_name: providerName || null,
      record_date: recordDate || null,
      notes: notes || null,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
    });

    if (error) { toast.error('Failed to save record'); }
    else {
      toast.success('Record uploaded');
      setDialogOpen(false);
      resetForm();
      fetchRecords();
    }
    setUploading(false);
  };

  const handleDelete = async (record: MedicalRecord) => {
    if (record.file_url) {
      const path = record.file_url.split('/medical-records/')[1];
      if (path) await supabase.storage.from('medical-records').remove([path]);
    }
    await supabase.from('patient_medical_records').delete().eq('id', record.id);
    toast.success('Record deleted');
    fetchRecords();
  };

  const handleDownload = async (record: MedicalRecord) => {
    if (!record.file_url) return;
    const path = record.file_url.split('/medical-records/')[1];
    if (!path) return;
    const { data, error } = await supabase.storage.from('medical-records').download(path);
    if (error || !data) { toast.error('Download failed'); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.file_name || 'file';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setTitle(''); setRecordType('other'); setProviderName(''); setRecordDate(''); setNotes(''); setFile(null);
  };

  const filtered = records.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.provider_name || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || r.record_type === filterType;
    return matchSearch && matchType;
  });

  const typeConfig = Object.fromEntries(RECORD_TYPES.map(t => [t.value, t]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search records…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {RECORD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Upload Record</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Medical Record</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Blood Test Results" /></div>
              <div><Label>Record Type</Label>
                <Select value={recordType} onValueChange={setRecordType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECORD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Provider / Facility</Label><Input value={providerName} onChange={e => setProviderName(e.target.value)} placeholder="Hospital or doctor name" /></div>
              <div><Label>Record Date</Label><Input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} /></div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes…" rows={2} /></div>
              <div>
                <Label>File (PDF, Image, DICOM)</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={handleUpload} disabled={uploading} className="w-full">
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-2" /> Save Record</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <FileText className="h-12 w-12 mx-auto opacity-50" />
          <p className="font-medium">No medical records</p>
          <p className="text-sm">Upload lab reports, imaging results, and other documents</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(record => {
            const tc = typeConfig[record.record_type] || typeConfig.other;
            const Icon = tc.icon;
            return (
              <Card key={record.id} className="hover:border-primary/30 transition-all">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0"><Icon className="h-4 w-4 text-primary" /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{record.title}</p>
                          <Badge variant="outline" className="text-xs">{tc.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {record.provider_name && `${record.provider_name} • `}
                          {record.record_date ? format(parseISO(record.record_date), 'MMM d, yyyy') : format(parseISO(record.created_at), 'MMM d, yyyy')}
                          {record.file_name && ` • ${record.file_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {record.file_url && (
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(record)} title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(record)} title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
