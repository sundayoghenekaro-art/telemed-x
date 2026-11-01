import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, FileText, AlertTriangle, Search } from 'lucide-react';
import { RadiologyStudy, RadiologyReport } from '@/types/dhos';
import { format } from 'date-fns';

interface Props {
  studies: RadiologyStudy[];
  reports: RadiologyReport[];
  onViewStudy: (study: RadiologyStudy) => void;
  onSaveReport: (report: Omit<RadiologyReport, 'id' | 'createdAt'>) => void;
}

const reportStatusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  preliminary: 'bg-amber-500/10 text-amber-600',
  final: 'bg-green-500/10 text-green-600',
  amended: 'bg-blue-500/10 text-blue-600',
};

export function RadiologyReporting({ studies, reports, onViewStudy }: Props) {
  const [search, setSearch] = useState('');

  const unreportedStudies = useMemo(() => {
    return studies.filter(s => s.status === 'completed' && !reports.find(r => r.studyId === s.id));
  }, [studies, reports]);

  const filteredReports = useMemo(() => {
    if (!search) return reports;
    return reports.filter(r =>
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.bodyPart.toLowerCase().includes(search.toLowerCase())
    );
  }, [reports, search]);

  return (
    <div className="space-y-6">
      {/* Unreported Studies */}
      {unreportedStudies.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> Pending Reports ({unreportedStudies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unreportedStudies.map(study => (
                <div key={study.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <span className="font-medium">{study.patientName}</span>
                    <span className="text-muted-foreground mx-2">•</span>
                    <Badge variant="secondary" className="text-xs">{study.modality}</Badge>
                    <span className="text-muted-foreground mx-2">•</span>
                    <span className="text-sm text-muted-foreground">{study.bodyPart}</span>
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => onViewStudy(study)}>
                    <FileText className="h-3 w-3" /> Report
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reports</CardTitle>
          <div className="relative mt-2 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Modality</TableHead>
                <TableHead>Body Part</TableHead>
                <TableHead>Impression</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Radiologist</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reports found</TableCell></TableRow>
              ) : filteredReports.map(report => {
                const study = studies.find(s => s.id === report.studyId);
                return (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.patientName}</TableCell>
                    <TableCell><Badge variant="secondary">{report.modality}</Badge></TableCell>
                    <TableCell>{report.bodyPart}</TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm text-muted-foreground truncate">{report.impression.split('\n')[0]}</p>
                      {report.critical && <Badge variant="destructive" className="text-xs mt-1">Critical</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={reportStatusColor[report.status]}>{report.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{report.radiologist}</TableCell>
                    <TableCell className="text-right">
                      {study && (
                        <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => onViewStudy(study)}>
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
