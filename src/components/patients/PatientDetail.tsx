import { 
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  Heart,
  Thermometer,
  Wind,
  Activity,
  Droplets,
  FileText,
  Pill,
  FlaskConical,
  Radio,
  Clock,
  Edit,
  Share2,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Patient, VitalSigns } from '@/types/dhos';
import { cn } from '@/lib/utils';
import { localPatientToFhir } from '@/lib/fhirMappers';
import { exportPatientToFhir } from '@/lib/fhirApi';
import { toast } from 'sonner';

interface PatientDetailProps {
  patient: Patient;
  vitals: VitalSigns[];
  onBack: () => void;
}

export function PatientDetail({ patient, vitals, onBack }: PatientDetailProps) {
  const age = calculateAge(patient.dateOfBirth);
  const latestVitals = vitals[vitals.length - 1];

  const statusConfig = {
    stable: { bg: 'bg-success/10', text: 'text-success', label: 'Stable' },
    monitoring: { bg: 'bg-warning/10', text: 'text-warning', label: 'Monitoring' },
    critical: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Critical' },
    discharged: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Discharged' },
  };

  const config = statusConfig[patient.status];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {patient.firstName} {patient.lastName}
            </h1>
            <span className={cn(
              "text-sm font-medium px-3 py-1 rounded-full",
              config.bg, config.text
            )}>
              {config.label}
            </span>
          </div>
          <p className="text-muted-foreground font-mono text-sm">{patient.upid}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => {
              const fhir = localPatientToFhir(patient);
              const json = JSON.stringify(fhir, null, 2);
              navigator.clipboard.writeText(json);
              toast.success('FHIR R4 Patient JSON copied to clipboard');
            }}
          >
            <Share2 className="h-4 w-4" />
            Export FHIR
          </Button>
          <Button variant="outline" size="sm" className="gap-2"
            onClick={async () => {
              try {
                const fhir = localPatientToFhir(patient);
                const result = await exportPatientToFhir(fhir);
                toast.success(`Uploaded to HAPI FHIR server`, {
                  description: `Server ID: ${result.id}`,
                });
              } catch {
                toast.error('Failed to upload to FHIR server');
              }
            }}
          >
            <Globe className="h-4 w-4" />
            Upload to FHIR
          </Button>
          <Button variant="medical" size="sm" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age / DOB</p>
                <p className="font-medium">{age} years</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(patient.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Droplets className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blood Type</p>
                <p className="font-medium text-xl">{patient.bloodType || 'Unknown'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{patient.wardLocation || 'Outpatient'}</p>
                {patient.bedNumber && (
                  <p className="text-xs text-muted-foreground">Bed {patient.bedNumber}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          patient.allergies.length > 0 && "border-warning/50 bg-warning/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                patient.allergies.length > 0 ? "bg-warning/10" : "bg-muted"
              )}>
                <AlertTriangle className={cn(
                  "h-5 w-5",
                  patient.allergies.length > 0 ? "text-warning" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Allergies</p>
                {patient.allergies.length > 0 ? (
                  <p className="font-medium text-warning">{patient.allergies.join(', ')}</p>
                ) : (
                  <p className="font-medium text-muted-foreground">None known</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Vitals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Current Vitals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestVitals ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <VitalCard
                  icon={Heart}
                  label="Heart Rate"
                  value={latestVitals.heartRate?.toString() || '--'}
                  unit="bpm"
                  color="destructive"
                  status={getVitalStatus('heartRate', latestVitals.heartRate)}
                />
                <VitalCard
                  icon={Activity}
                  label="Blood Pressure"
                  value={`${latestVitals.bloodPressureSystolic || '--'}/${latestVitals.bloodPressureDiastolic || '--'}`}
                  unit="mmHg"
                  color="info"
                  status={getVitalStatus('bp', latestVitals.bloodPressureSystolic)}
                />
                <VitalCard
                  icon={Thermometer}
                  label="Temperature"
                  value={latestVitals.temperature?.toFixed(1) || '--'}
                  unit="°C"
                  color="warning"
                  status={getVitalStatus('temp', latestVitals.temperature)}
                />
                <VitalCard
                  icon={Wind}
                  label="Resp. Rate"
                  value={latestVitals.respiratoryRate?.toString() || '--'}
                  unit="/min"
                  color="primary"
                  status={getVitalStatus('respRate', latestVitals.respiratoryRate)}
                />
                <VitalCard
                  icon={Droplets}
                  label="SpO₂"
                  value={latestVitals.oxygenSaturation?.toString() || '--'}
                  unit="%"
                  color="success"
                  status={getVitalStatus('spo2', latestVitals.oxygenSaturation)}
                />
                <VitalCard
                  icon={Activity}
                  label="Pain Level"
                  value={latestVitals.painLevel?.toString() || '--'}
                  unit="/10"
                  color="muted"
                  status={getVitalStatus('pain', latestVitals.painLevel)}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto opacity-30 mb-3" />
                <p>No vital signs recorded</p>
              </div>
            )}
            {latestVitals && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Last updated: {new Date(latestVitals.timestamp).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-3">
              <FileText className="h-4 w-4 text-primary" />
              View Medical Records
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3">
              <Pill className="h-4 w-4 text-success" />
              Medications
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3">
              <FlaskConical className="h-4 w-4 text-info" />
              Lab Orders
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3">
              <Radio className="h-4 w-4 text-warning" />
              Imaging
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Appointment History
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for more info */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto opacity-30 mb-3" />
              <p>Patient timeline will appear here</p>
              <p className="text-sm">Showing encounters, orders, and key events</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="medications" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Pill className="h-12 w-12 mx-auto opacity-30 mb-3" />
              <p>Active medications will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="labs" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto opacity-30 mb-3" />
              <p>Lab results will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto opacity-30 mb-3" />
              <p>Clinical notes will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface VitalCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  color: 'primary' | 'destructive' | 'warning' | 'success' | 'info' | 'muted';
  status?: 'normal' | 'high' | 'low' | 'critical';
}

function VitalCard({ icon: Icon, label, value, unit, color, status }: VitalCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      status === 'critical' && "border-destructive/50 bg-destructive/5",
      status === 'high' && "border-warning/50 bg-warning/5",
      status === 'low' && "border-info/50 bg-info/5"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
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

function getVitalStatus(type: string, value?: number): 'normal' | 'high' | 'low' | 'critical' | undefined {
  if (value === undefined) return undefined;
  
  const ranges: Record<string, { low: number; high: number; criticalLow: number; criticalHigh: number }> = {
    heartRate: { low: 60, high: 100, criticalLow: 40, criticalHigh: 150 },
    bp: { low: 90, high: 140, criticalLow: 70, criticalHigh: 180 },
    temp: { low: 36, high: 37.5, criticalLow: 35, criticalHigh: 39 },
    respRate: { low: 12, high: 20, criticalLow: 8, criticalHigh: 30 },
    spo2: { low: 95, high: 100, criticalLow: 90, criticalHigh: 101 },
    pain: { low: 0, high: 3, criticalLow: -1, criticalHigh: 7 },
  };

  const range = ranges[type];
  if (!range) return 'normal';

  if (value <= range.criticalLow || value >= range.criticalHigh) return 'critical';
  if (value < range.low) return 'low';
  if (value > range.high) return 'high';
  return 'normal';
}
