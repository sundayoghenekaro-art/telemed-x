import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, UserPlus, CheckCircle2, Search } from 'lucide-react';
import { RadiologyOrder, RadiologyStudy, RadiologyModality } from '@/types/dhos';
import { modalityLabels } from '@/data/radiologyMockData';
import { format } from 'date-fns';

interface Props {
  orders: RadiologyOrder[];
  studies: RadiologyStudy[];
  onAssign: (orderId: string, radiologist: string) => void;
  onComplete: (orderId: string) => void;
  onViewStudy: (study: RadiologyStudy) => void;
}

const priorityColor: Record<string, string> = {
  routine: 'bg-muted text-muted-foreground',
  urgent: 'bg-amber-500/10 text-amber-600 border-amber-200',
  stat: 'bg-destructive/10 text-destructive border-destructive/30',
  asap: 'bg-orange-500/10 text-orange-600 border-orange-200',
};

const statusColor: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600',
  'in-progress': 'bg-amber-500/10 text-amber-600',
  completed: 'bg-purple-500/10 text-purple-600',
  reported: 'bg-green-500/10 text-green-600',
  verified: 'bg-green-600/10 text-green-700',
  cancelled: 'bg-muted text-muted-foreground',
};

export function RadiologyWorklist({ orders, studies, onAssign, onComplete, onViewStudy }: Props) {
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (search && !o.patientName.toLowerCase().includes(search.toLowerCase()) && !o.accessionNumber.toLowerCase().includes(search.toLowerCase())) return false;
      if (modalityFilter !== 'all' && o.modality !== modalityFilter) return false;
      if (statusFilter === 'active' && (o.status === 'reported' || o.status === 'verified' || o.status === 'cancelled')) return false;
      if (statusFilter !== 'all' && statusFilter !== 'active' && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, search, modalityFilter, statusFilter]);

  // Sort: stat first, then urgent, then by date
  const sorted = useMemo(() => {
    const priorityOrder = { stat: 0, asap: 1, urgent: 2, routine: 3 };
    return [...filtered].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 3;
      const pb = priorityOrder[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime();
    });
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Radiology Worklist</CardTitle>
        <div className="flex flex-wrap gap-3 mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patient or accession..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={modalityFilter} onValueChange={setModalityFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Modality" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modalities</SelectItem>
              {(Object.keys(modalityLabels) as RadiologyModality[]).map(m => (
                <SelectItem key={m} value={m}>{m} — {modalityLabels[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="reported">Reported</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Modality</TableHead>
              <TableHead>Body Part</TableHead>
              <TableHead>Ordered</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Radiologist</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
            ) : sorted.map(order => {
              const study = studies.find(s => s.orderId === order.id);
              return (
                <TableRow key={order.id} className={order.priority === 'stat' ? 'bg-destructive/5' : ''}>
                  <TableCell>
                    <Badge variant="outline" className={priorityColor[order.priority]}>
                      {order.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.patientName}</div>
                    <div className="text-xs text-muted-foreground">{order.accessionNumber}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{order.modality}</Badge>
                  </TableCell>
                  <TableCell>{order.bodyPart}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.orderedAt), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor[order.status]}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.assignedRadiologist || <span className="text-muted-foreground italic">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {!order.assignedRadiologist && order.status === 'scheduled' && (
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => onAssign(order.id, 'Dr. Olumide Balogun')}>
                          <UserPlus className="h-3 w-3" /> Assign
                        </Button>
                      )}
                      {order.status === 'in-progress' && (
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => onComplete(order.id)}>
                          <CheckCircle2 className="h-3 w-3" /> Complete
                        </Button>
                      )}
                      {study && (
                        <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => onViewStudy(study)}>
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
