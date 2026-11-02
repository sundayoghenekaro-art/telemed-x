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
import { Plus, FileText, Download, Trash2, Search, Upload, Loader2, Image, File, Syringe, ClipboardList, ExternalLink } from 'lucide-react';
import { PAGE_SIZE, afterCursor, hasNextPage, pageCursor, type PageCursor } from '@/lib/pagination';
import { signedUrl, storagePathFrom } from '@/lib/storage';

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

const BUCKET = 'medical-records';
const MAX_FILE_BYTES = 25 * 1024 * 1024;

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

/** PostgREST `or()` splits on commas, so strip the characters that would break it. */
function orTerm(value: string) {
  return value.replace(/[,()%*]/g, ' ').trim();
}

export function MedicalRecordsTab({ patientUserId }: { patientUserId: string }) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<PageCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
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

  useEffect(() => {
    const delay = search ? 300 : 0;
    const timer = setTimeout(() => { void loadPage('replace'); }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientUserId, search, filterType]);

  const loadPage = async (mode: 'replace' | 'append') => {
    const cursorForPage = mode === 'append' ? cursor : null;
    if (mode === 'append' && !cursorForPage) return;

    if (mode === 'append') setLoadingMore(true);
    else setLoading(true);

    let query = supabase
      .from('patient_medical_records')
      .select('*')
      .eq('patient_user_id', patientUserId);

    if (filterType !== 'all') query = query.eq('record_type', filterType);

    const term = orTerm(search);
    if (term) query = query.or(`title.ilike.%${term}%,provider_name.ilike.%${term}%`);

    const ordered = afterCursor(
      query.order('created_at', { ascending: false }).order('id', { ascending: false }),
      cursorForPage,
      'created_at',
    );

    const { data, error } = await ordered.limit(PAGE_SIZE + 1);

    if (error) {
      toast.error('Could not load medical records.');
      if (mode === 'replace') setRecords([]);
    } else {
      const rows = (data ?? []) as MedicalRecord[];
      const page = rows.slice(0, PAGE_SIZE);
      setRecords(prev => (mode === 'append' ? [...prev, ...page] : page));
      setHasMore(hasNextPage(rows));
      setCursor(pageCursor(page, 'created_at'));
    }

    if (mode === 'append') setLoadingMore(false);
    else setLoading(false);
  };

  const handleUpload = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (file && file.size > MAX_FILE_BYTES) {
      toast.error('File must be under 25 MB. Compress or split the document first.');
      return;
    }
    setUploading(true);

    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      filePath = `${patientUserId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(filePath, file);
      if (error) { toast.error('File upload failed'); setUploading(false); return; }
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
      file_url: filePath,
      file_name: fileName,
      file_size: fileSize,
    });

    if (error) { toast.error('Failed to save record'); }
    else {
      toast.success('Record uploaded');
      setDialogOpen(false);
      resetForm();
      await loadPage('replace');
    }
    setUploading(false);
  };

  const handleDelete = async (record: MedicalRecord) => {
    const path = storagePathFrom(record.file_url, BUCKET);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from('patient_medical_records').delete().eq('id', record.id);
    toast.success('Record deleted');
    await loadPage('replace');
  };

  const handleOpen = async (record: MedicalRecord) => {
    const url = await signedUrl(BUCKET, record.file_url);
    if (!url) { toast.error('Could not open this file.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (record: MedicalRecord) => {
    const url = await signedUrl(BUCKET, record.file_url, undefined, record.file_name || 'record');
    if (!url) { toast.error('Download failed'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = record.file_name || 'record';
    a.click();
  };

  const resetForm = () => {
    setTitle(''); setRecordType('other'); setProviderName(''); setRecordDate(''); setNotes(''); setFile(null);
  };

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
                <Label>File (PDF, Image, DICOM · max 25 MB)</Label>
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
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <FileText className="h-12 w-12 mx-auto opacity-50" />
          <p className="font-medium">No medical records</p>
          <p className="text-sm">Upload lab reports, imaging results, and other documents</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(record => {
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
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleOpen(record)} title="Open">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(record)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
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
          {hasMore && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" onClick={() => loadPage('append')} disabled={loadingMore}>
                {loadingMore ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</> : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
