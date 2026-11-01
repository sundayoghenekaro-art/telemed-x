import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  UserPlus,
  ChevronRight,
  Calendar,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Patient, PatientStatus } from '@/types/dhos';
import { cn } from '@/lib/utils';

interface PatientIndexProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  canRegister?: boolean;
}

export function PatientIndex({ patients, onSelectPatient, canRegister = false }: PatientIndexProps) {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'all'>('all');

  useEffect(() => {
    const query = searchParams.get('q') ?? '';
    if (query) setSearchQuery(query);
  }, [searchParams]);

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.upid.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: patients.length,
    stable: patients.filter(p => p.status === 'stable').length,
    monitoring: patients.filter(p => p.status === 'monitoring').length,
    critical: patients.filter(p => p.status === 'critical').length,
    discharged: patients.filter(p => p.status === 'discharged').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patient Index</h1>
          <p className="text-muted-foreground">Master patient registry with UPID lookup</p>
        </div>
        {canRegister && (
          <Button variant="medical" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Register Patient
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or UPID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {(['all', 'stable', 'monitoring', 'critical'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'medical' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "whitespace-nowrap",
                    status === 'critical' && statusFilter !== status && "border-destructive/50 text-destructive hover:bg-destructive/10"
                  )}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-1.5 text-xs opacity-70">({statusCounts[status]})</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        {filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground">No patients found</h3>
              <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <PatientCard 
              key={patient.upid} 
              patient={patient} 
              onClick={() => onSelectPatient(patient)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
}

function PatientCard({ patient, onClick }: PatientCardProps) {
  const statusConfig = {
    stable: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
    monitoring: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
    critical: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
    discharged: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  };

  const config = statusConfig[patient.status];
  const age = calculateAge(patient.dateOfBirth);

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all hover:shadow-medical-lg",
        patient.status === 'critical' && "border-destructive/30 bg-destructive/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={cn(
            "h-14 w-14 rounded-xl flex items-center justify-center flex-shrink-0",
            config.bg
          )}>
            <span className={cn("text-lg font-semibold", config.text)}>
              {patient.firstName[0]}{patient.lastName[0]}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {patient.firstName} {patient.lastName}
              </h3>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                config.bg, config.text, config.border, "border"
              )}>
                {patient.status}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                {patient.upid}
              </span>
              <span className="mx-2">•</span>
              {age} yrs, {patient.gender}
              {patient.bloodType && (
                <>
                  <span className="mx-2">•</span>
                  <span className="font-medium">{patient.bloodType}</span>
                </>
              )}
            </p>

            {/* Additional Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              {patient.wardLocation && (
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {patient.wardLocation} {patient.bedNumber && `• Bed ${patient.bedNumber}`}
                </span>
              )}
              {patient.lastVisit && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Last: {new Date(patient.lastVisit).toLocaleDateString()}
                </span>
              )}
              {patient.allergies.length > 0 && (
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="h-3 w-3" />
                  {patient.allergies.length} allergi{patient.allergies.length > 1 ? 'es' : 'y'}
                </span>
              )}
            </div>
          </div>

          {/* Action */}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
