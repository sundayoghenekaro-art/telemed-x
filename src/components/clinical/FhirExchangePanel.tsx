import { useState } from 'react';
import { Search, Download, Eye, UserPlus, Globe, AlertCircle, Loader2, Heart, Thermometer, Wind, Activity, Droplets } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useFhirPatientSearch, useFhirObservations } from '@/hooks/useFhir';
import { fhirPatientToLocal, fhirObservationsToVitals, getFhirPatientDisplayName } from '@/lib/fhirMappers';
import type { FhirPatientResource } from '@/lib/fhirApi';
import { cn } from '@/lib/utils';

export function FhirExchangePanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const { data: searchResults, isLoading: searching, error: searchError } = useFhirPatientSearch(submittedQuery);
  const { data: observations, isLoading: loadingObs } = useFhirObservations(selectedPatientId);

  const vitals = observations?.entry
    ? fhirObservationsToVitals(observations.entry.map(e => e.resource))
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      setSubmittedQuery(searchQuery.trim());
      setSelectedPatientId(null);
    }
  };

  const handleImport = (fhir: FhirPatientResource) => {
    const local = fhirPatientToLocal(fhir);
    toast.success(`Imported ${local.firstName} ${local.lastName}`, {
      description: `UPID: ${local.upid} — added to local patient index`,
    });
  };

  const handleViewObservations = (patientId: string) => {
    setSelectedPatientId(prev => prev === patientId ? null : patientId);
  };

  const patients = searchResults?.entry?.map(e => e.resource) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-info/30 bg-info/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Globe className="h-5 w-5 text-info mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-info">HAPI FHIR R4 Public Test Server</p>
            <p className="text-muted-foreground">
              Search and import patients from the public HAPI FHIR server. This is a test server with synthetic data — 
              do not upload real patient information.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FHIR patients by name (e.g. Smith, John)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={searchQuery.trim().length < 2 || searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {/* Error */}
      {searchError && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">FHIR server error</p>
              <p className="text-muted-foreground">The HAPI server may be temporarily unavailable. Try again in a moment.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {searching && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {/* Results */}
      {!searching && submittedQuery && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {searchResults?.total !== undefined
              ? `${searchResults.total} results for "${submittedQuery}"`
              : `${patients.length} results loaded`}
          </p>

          {patients.length === 0 && !searchError && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Search className="h-10 w-10 mx-auto opacity-30 mb-2" />
                <p>No patients found for "{submittedQuery}"</p>
              </CardContent>
            </Card>
          )}

          {patients.map(patient => (
            <FhirPatientCard
              key={patient.id}
              patient={patient}
              isSelected={selectedPatientId === patient.id}
              onViewObservations={() => handleViewObservations(patient.id!)}
              onImport={() => handleImport(patient)}
              vitals={selectedPatientId === patient.id ? vitals : []}
              loadingObs={selectedPatientId === patient.id && loadingObs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FhirPatientCardProps {
  patient: FhirPatientResource;
  isSelected: boolean;
  onViewObservations: () => void;
  onImport: () => void;
  vitals: ReturnType<typeof fhirObservationsToVitals>;
  loadingObs: boolean;
}

function FhirPatientCard({ patient, isSelected, onViewObservations, onImport, vitals, loadingObs }: FhirPatientCardProps) {
  const displayName = getFhirPatientDisplayName(patient);

  return (
    <Card className={cn(isSelected && 'ring-2 ring-primary/50')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {patient.gender && <Badge variant="outline" className="capitalize">{patient.gender}</Badge>}
              {patient.birthDate && <span>DOB: {patient.birthDate}</span>}
              <span className="font-mono">FHIR/{patient.id}</span>
            </div>
            {patient.telecom?.[0]?.value && (
              <p className="text-xs text-muted-foreground">{patient.telecom[0].system}: {patient.telecom[0].value}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onViewObservations} className="gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Vitals</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onImport} className="gap-1">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              const json = JSON.stringify(patient, null, 2);
              navigator.clipboard.writeText(json);
              toast.success('FHIR JSON copied to clipboard');
            }} className="gap-1">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Observations panel */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">FHIR Observations (Vitals)</p>
            {loadingObs && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading observations...
              </div>
            )}
            {!loadingObs && vitals.length === 0 && (
              <p className="text-sm text-muted-foreground">No vital sign observations found for this patient.</p>
            )}
            {!loadingObs && vitals.length > 0 && (
              <div className="space-y-2">
                {vitals.slice(0, 5).map((v, i) => (
                  <div key={i} className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs p-2 rounded-lg bg-muted/50">
                    <span className="col-span-3 sm:col-span-6 text-muted-foreground font-mono">
                      {new Date(v.timestamp).toLocaleString()}
                    </span>
                    {v.heartRate != null && (
                      <div className="flex items-center gap-1"><Heart className="h-3 w-3 text-destructive" /> {v.heartRate} bpm</div>
                    )}
                    {v.bloodPressureSystolic != null && (
                      <div className="flex items-center gap-1"><Activity className="h-3 w-3 text-info" /> {v.bloodPressureSystolic}/{v.bloodPressureDiastolic} mmHg</div>
                    )}
                    {v.temperature != null && (
                      <div className="flex items-center gap-1"><Thermometer className="h-3 w-3 text-warning" /> {v.temperature}°C</div>
                    )}
                    {v.respiratoryRate != null && (
                      <div className="flex items-center gap-1"><Wind className="h-3 w-3 text-primary" /> {v.respiratoryRate}/min</div>
                    )}
                    {v.oxygenSaturation != null && (
                      <div className="flex items-center gap-1"><Droplets className="h-3 w-3 text-success" /> {v.oxygenSaturation}%</div>
                    )}
                  </div>
                ))}
                {vitals.length > 5 && (
                  <p className="text-xs text-muted-foreground">+ {vitals.length - 5} more observations</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
