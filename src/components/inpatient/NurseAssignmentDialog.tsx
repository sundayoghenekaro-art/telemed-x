import { useState, useMemo } from 'react';
import { Users, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Bed, availableNurses } from '@/data/inpatientMockData';

interface NurseAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beds: Bed[];
  onAssign: (assignments: { bedId: string; nurse: string | undefined }[]) => void;
}

export function NurseAssignmentDialog({ open, onOpenChange, beds, onAssign }: NurseAssignmentDialogProps) {
  const [selectedNurse, setSelectedNurse] = useState('');
  const [selectedBedIds, setSelectedBedIds] = useState<Set<string>>(new Set());
  const [wardFilter, setWardFilter] = useState<string>('all');

  const occupiedBeds = useMemo(() => beds.filter(b => b.status === 'occupied'), [beds]);

  const wards = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of occupiedBeds) map.set(b.wardId, b.wardName);
    return Array.from(map.entries());
  }, [occupiedBeds]);

  const filteredBeds = useMemo(() => {
    if (wardFilter === 'all') return occupiedBeds;
    return occupiedBeds.filter(b => b.wardId === wardFilter);
  }, [occupiedBeds, wardFilter]);

  // Group by current nurse assignment
  const nurseWorkload = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of occupiedBeds) {
      if (b.nurse) {
        map.set(b.nurse, (map.get(b.nurse) || 0) + 1);
      }
    }
    return map;
  }, [occupiedBeds]);

  const toggleBed = (bedId: string) => {
    setSelectedBedIds(prev => {
      const next = new Set(prev);
      if (next.has(bedId)) next.delete(bedId); else next.add(bedId);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedBedIds(prev => {
      const next = new Set(prev);
      for (const b of filteredBeds) next.add(b.id);
      return next;
    });
  };

  const deselectAll = () => setSelectedBedIds(new Set());

  const handleAssign = () => {
    if (!selectedNurse || selectedBedIds.size === 0) return;
    const assignments = Array.from(selectedBedIds).map(bedId => ({ bedId, nurse: selectedNurse }));
    onAssign(assignments);
    toast.success(`${selectedNurse} assigned to ${assignments.length} bed(s)`);
    resetForm();
    onOpenChange(false);
  };

  const handleUnassign = () => {
    if (selectedBedIds.size === 0) return;
    const assignments = Array.from(selectedBedIds).map(bedId => ({ bedId, nurse: undefined }));
    onAssign(assignments);
    toast.success(`Nurse unassigned from ${assignments.length} bed(s)`);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSelectedNurse('');
    setSelectedBedIds(new Set());
    setWardFilter('all');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Nurse Assignment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nurse selection + workload */}
          <div className="space-y-1.5">
            <Label className="text-xs">Assign Nurse</Label>
            <Select value={selectedNurse} onValueChange={setSelectedNurse}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select nurse" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {availableNurses.map(n => (
                  <SelectItem key={n} value={n}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{n}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {nurseWorkload.get(n) || 0} beds
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workload summary */}
          <div className="flex flex-wrap gap-1.5">
            {availableNurses.slice(0, 8).map(n => {
              const count = nurseWorkload.get(n) || 0;
              return (
                <Badge
                  key={n}
                  variant="outline"
                  className={cn(
                    "text-[10px] cursor-pointer transition-colors",
                    selectedNurse === n && "bg-primary/10 border-primary/30 text-primary",
                    count > 6 && "border-warning/30 text-warning",
                  )}
                  onClick={() => setSelectedNurse(n)}
                >
                  {n.replace('Nurse ', '')}: {count}
                </Badge>
              );
            })}
          </div>

          {/* Ward filter + bed selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Beds</Label>
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger className="h-7 text-[10px] w-[140px]">
                  <SelectValue placeholder="All wards" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All wards</SelectItem>
                  {wards.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={selectAllFiltered}>Select all</Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={deselectAll}>Clear</Button>
            </div>
          </div>

          <ScrollArea className="h-[240px] border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredBeds.map(bed => (
                <label
                  key={bed.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedBedIds.has(bed.id) && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={selectedBedIds.has(bed.id)}
                    onCheckedChange={() => toggleBed(bed.id)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{bed.bedNumber}</span>
                      <span className="text-[10px] text-muted-foreground">— {bed.patientName}</span>
                    </div>
                    {bed.nurse && (
                      <span className="text-[10px] text-muted-foreground">Currently: {bed.nurse}</span>
                    )}
                  </div>
                  {bed.acuity && (
                    <Badge variant="outline" className={cn(
                      "text-[9px]",
                      bed.acuity === 'critical' && 'text-destructive border-destructive/30',
                      bed.acuity === 'high' && 'text-warning border-warning/30',
                    )}>
                      {bed.acuity}
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          </ScrollArea>

          {selectedBedIds.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedBedIds.size} bed(s) selected
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleUnassign} disabled={selectedBedIds.size === 0} className="text-xs text-muted-foreground">
            Unassign
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!selectedNurse || selectedBedIds.size === 0} onClick={handleAssign}>
            <Check className="h-3.5 w-3.5 mr-1" />
            Assign ({selectedBedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
