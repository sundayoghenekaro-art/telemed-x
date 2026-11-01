import { useState, useMemo } from 'react';
import { Building, User, AlertTriangle, Wrench, Clock, Sparkles, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Bed, BedStatus } from '@/data/inpatientMockData';
import { mockBedOccupancy } from '@/data/mockData';

interface BedManagementBoardProps {
  beds: Bed[];
  onSelectBed?: (bed: Bed) => void;
}

const statusConfig: Record<BedStatus, { label: string; color: string; icon: React.ElementType }> = {
  occupied: { label: 'Occupied', color: 'bg-primary', icon: User },
  available: { label: 'Available', color: 'bg-success', icon: Sparkles },
  reserved: { label: 'Reserved', color: 'bg-warning', icon: Clock },
  maintenance: { label: 'Maintenance', color: 'bg-muted-foreground', icon: Wrench },
  cleaning: { label: 'Cleaning', color: 'bg-info', icon: Sparkles },
};

const acuityColors: Record<string, string> = {
  low: 'ring-success/40',
  medium: 'ring-info/40',
  high: 'ring-warning/40',
  critical: 'ring-destructive/60 animate-pulse',
};

export function BedManagementBoard({ beds, onSelectBed }: BedManagementBoardProps) {
  const [wardFilter, setWardFilter] = useState<string>('all');

  const wards = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of beds) map.set(b.wardId, b.wardName);
    return Array.from(map.entries());
  }, [beds]);

  const filteredBeds = useMemo(() => {
    if (wardFilter === 'all') return beds;
    return beds.filter(b => b.wardId === wardFilter);
  }, [beds, wardFilter]);

  const groupedByWard = useMemo(() => {
    const map = new Map<string, Bed[]>();
    for (const b of filteredBeds) {
      const list = map.get(b.wardId) || [];
      list.push(b);
      map.set(b.wardId, list);
    }
    return map;
  }, [filteredBeds]);

  const stats = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter(b => b.status === 'occupied').length;
    const available = beds.filter(b => b.status === 'available').length;
    const critical = beds.filter(b => b.acuity === 'critical').length;
    return { total, occupied, available, critical, rate: Math.round((occupied / total) * 100) };
  }, [beds]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Occupancy</div>
          <div className="text-2xl font-bold">{stats.rate}%</div>
          <div className="text-xs text-muted-foreground">{stats.occupied}/{stats.total} beds</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Available</div>
          <div className="text-2xl font-bold text-success">{stats.available}</div>
          <div className="text-xs text-muted-foreground">beds free</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Critical</div>
          <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
          <div className="text-xs text-muted-foreground">patients</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Wards</div>
          <div className="text-2xl font-bold">{wards.length}</div>
          <div className="text-xs text-muted-foreground">active</div>
        </Card>
      </div>

      {/* Filter + Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={wardFilter} onValueChange={setWardFilter}>
            <SelectTrigger className="h-8 text-xs w-[180px]">
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
        <div className="flex items-center gap-3 text-[10px]">
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={cn("h-2.5 w-2.5 rounded-sm", cfg.color)} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Bed Grid by Ward */}
      <ScrollArea className="h-[520px]">
        <div className="space-y-5">
          {Array.from(groupedByWard.entries()).map(([wardId, wardBeds]) => {
            const occ = mockBedOccupancy.find(b => b.wardId === wardId);
            const wardName = wardBeds[0]?.wardName || wardId;
            const occupiedCount = wardBeds.filter(b => b.status === 'occupied').length;
            const availCount = wardBeds.filter(b => b.status === 'available').length;

            return (
              <div key={wardId}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{wardName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{occupiedCount} occupied</span>
                    <span>·</span>
                    <span className="text-success">{availCount} available</span>
                  </div>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                  {wardBeds.map(bed => {
                    const cfg = statusConfig[bed.status];
                    return (
                      <Tooltip key={bed.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onSelectBed?.(bed)}
                            className={cn(
                              "h-10 rounded-md text-[9px] font-medium flex flex-col items-center justify-center transition-all border",
                              bed.status === 'occupied' && "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20",
                              bed.status === 'available' && "bg-success/10 border-success/20 text-success hover:bg-success/20",
                              bed.status === 'reserved' && "bg-warning/10 border-warning/20 text-warning hover:bg-warning/20",
                              bed.status === 'maintenance' && "bg-muted border-border text-muted-foreground",
                              bed.status === 'cleaning' && "bg-info/10 border-info/20 text-info",
                              bed.acuity && acuityColors[bed.acuity] && `ring-1 ${acuityColors[bed.acuity]}`,
                            )}
                          >
                            <span>{bed.bedNumber.split('-').pop()}</span>
                            {bed.nurse && bed.status === 'occupied' && (
                              <span className="text-[7px] leading-none text-muted-foreground truncate max-w-full">
                                {bed.nurse.replace('Nurse ', '').slice(0, 3)}
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[200px]">
                          <p className="font-semibold">{bed.bedNumber}</p>
                          <p className="text-muted-foreground">{cfg.label}</p>
                          {bed.patientName && <p>{bed.patientName}</p>}
                          {bed.physician && <p className="text-muted-foreground">{bed.physician}</p>}
                          {bed.nurse && <p className="text-info">{bed.nurse}</p>}
                          {bed.acuity && (
                            <Badge variant="outline" className="text-[9px] mt-1">{bed.acuity}</Badge>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
