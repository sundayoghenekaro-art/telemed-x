import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, FileText, Image, Grid3X3, ZoomIn, ZoomOut, RotateCw, Maximize2, Save, Send, Sun, Contrast, RotateCcw } from 'lucide-react';
import { RadiologyStudy, RadiologyReport, RadiologyModality } from '@/types/dhos';
import { modalityLabels } from '@/data/radiologyMockData';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import modalityCT from '@/assets/modality-ct.jpg';
import modalityMR from '@/assets/modality-mr.jpg';
import modalityUS from '@/assets/modality-us.jpg';
import modalityCR from '@/assets/modality-cr.jpg';
import modalityDX from '@/assets/modality-dx.jpg';
import modalityMG from '@/assets/modality-mg.jpg';

const modalityImages: Partial<Record<RadiologyModality, string>> = {
  CT: modalityCT,
  MR: modalityMR,
  US: modalityUS,
  CR: modalityCR,
  DX: modalityDX,
  MG: modalityMG,
};

// Generate simulated series thumbnails for a study
function generateThumbnails(study: RadiologyStudy): { id: number; label: string; image: string }[] {
  const baseImage = modalityImages[study.modality] || modalityCR;
  const count = Math.min(study.seriesCount, 6);
  return Array.from({ length: Math.max(count, 3) }, (_, i) => ({
    id: i + 1,
    label: `Series ${i + 1}`,
    image: baseImage,
  }));
}

interface Props {
  study: RadiologyStudy;
  report?: RadiologyReport;
  canWriteReport?: boolean;
  onBack: () => void;
  onSaveReport: (report: Omit<RadiologyReport, 'id' | 'createdAt'>) => void;
}

export function RadiologyStudyViewer({ study, report, canWriteReport = false, onBack, onSaveReport }: Props) {
  const [technique, setTechnique] = useState(report?.technique || '');
  const [comparison, setComparison] = useState(report?.comparison || '');
  const [findings, setFindings] = useState(report?.findings || '');
  const [impression, setImpression] = useState(report?.impression || '');
  const [reportStatus, setReportStatus] = useState<RadiologyReport['status']>(report?.status || 'draft');
  const [critical, setCritical] = useState(report?.critical || false);
  const [selectedSeries, setSelectedSeries] = useState(0);
  const [windowLevel, setWindowLevel] = useState(50); // 0-100, 50 = default brightness
  const [windowWidth, setWindowWidth] = useState(50); // 0-100, 50 = default contrast
  const [invert, setInvert] = useState(false);

  const imageFilter = useMemo(() => {
    const brightness = 0.2 + (windowLevel / 50) * 0.8; // 0.2 to 1.8
    const contrast = 0.2 + (windowWidth / 50) * 0.8;   // 0.2 to 1.8
    return `brightness(${brightness}) contrast(${contrast})${invert ? ' invert(1)' : ''}`;
  }, [windowLevel, windowWidth, invert]);

  const resetWL = () => { setWindowLevel(50); setWindowWidth(50); setInvert(false); };

  const thumbnails = generateThumbnails(study);
  const mainImage = modalityImages[study.modality] || modalityCR;

  const handleSave = (status: RadiologyReport['status']) => {
    if (status === 'final' && (!findings.trim() || !impression.trim())) {
      toast.error('Findings and Impression are required for final reports');
      return;
    }
    onSaveReport({
      studyId: study.id,
      orderId: study.orderId,
      patientUpid: study.patientUpid,
      patientName: study.patientName,
      modality: study.modality,
      bodyPart: study.bodyPart,
      technique,
      comparison,
      findings,
      impression,
      radiologist: study.assignedRadiologist || 'Dr. Olumide Balogun',
      status,
      critical,
      ...(status === 'final' ? { verifiedBy: study.assignedRadiologist || 'Dr. Olumide Balogun', verifiedAt: new Date().toISOString() } : {}),
    });
    toast.success(status === 'final' ? 'Report finalized' : 'Report saved as draft');
    if (status === 'final') onBack();
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{study.patientName}</h1>
            <Badge variant="secondary">{study.modality} — {study.bodyPart}</Badge>
            {study.status === 'reported' && <Badge className="bg-green-500/10 text-green-600">Reported</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {study.accessionNumber} • {format(new Date(study.studyDate), 'MMM d, yyyy HH:mm')} • {study.seriesCount} series, {study.imageCount} images
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Image Viewer */}
        <Card className="lg:row-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4" /> Study Images</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset W/L" onClick={resetWL}><RotateCcw className="h-4 w-4" /></Button>
                <Button variant={invert ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" title="Invert" onClick={() => setInvert(!invert)}><Contrast className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><RotateCw className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Grid3X3 className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Maximize2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Window/Level Controls */}
            <div className="flex items-center gap-4 px-1">
              <div className="flex items-center gap-2 flex-1">
                <Sun className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground w-8">W/L</span>
                <Slider
                  value={[windowLevel]}
                  onValueChange={([v]) => setWindowLevel(v)}
                  min={0} max={100} step={1}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">{windowLevel}</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Contrast className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground w-8">W/W</span>
                <Slider
                  value={[windowWidth]}
                  onValueChange={([v]) => setWindowWidth(v)}
                  min={0} max={100} step={1}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">{windowWidth}</span>
              </div>
            </div>

            {/* Main Image */}
            <div className="bg-black rounded-lg overflow-hidden relative min-h-[400px] flex items-center justify-center">
              <img
                src={mainImage}
                alt={`${study.modality} ${study.bodyPart}`}
                className="w-full h-full object-contain max-h-[450px] transition-[filter] duration-150"
                style={{ filter: imageFilter }}
              />
              {/* DICOM overlay info */}
              <div className="absolute top-2 left-3 text-white/60 text-xs font-mono space-y-0.5">
                <div>{study.patientName}</div>
                <div>{study.accessionNumber}</div>
                <div>{format(new Date(study.studyDate), 'yyyy-MM-dd HH:mm')}</div>
              </div>
              <div className="absolute top-2 right-3 text-white/60 text-xs font-mono text-right space-y-0.5">
                <div>{modalityLabels[study.modality]}</div>
                <div>{study.bodyPart}</div>
                <div>S: {selectedSeries + 1}/{study.seriesCount}</div>
              </div>
              <div className="absolute bottom-2 left-3 text-white/40 text-xs font-mono">
                UID: {study.studyInstanceUid}
              </div>
              <div className="absolute bottom-2 right-3 text-white/40 text-xs font-mono">
                Im: {study.imageCount}
              </div>
            </div>

            {/* Series Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {thumbnails.map((thumb, idx) => (
                <button
                  key={thumb.id}
                  onClick={() => setSelectedSeries(idx)}
                  className={cn(
                    "flex-shrink-0 w-20 rounded-md overflow-hidden border-2 transition-all",
                    selectedSeries === idx
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-transparent hover:border-muted-foreground/30 opacity-70 hover:opacity-100"
                  )}
                >
                  <div className="relative">
                    <img
                      src={thumb.image}
                      alt={thumb.label}
                      className="w-20 h-20 object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] text-center py-0.5 font-mono">
                      {thumb.label}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Structured Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Technique</Label>
              <Textarea value={technique} onChange={e => setTechnique(e.target.value)} placeholder="Describe imaging technique..." className="min-h-[60px] text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Comparison</Label>
              <Textarea value={comparison} onChange={e => setComparison(e.target.value)} placeholder="Prior studies for comparison..." className="min-h-[40px] text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Findings *</Label>
              <Textarea value={findings} onChange={e => setFindings(e.target.value)} placeholder="Describe findings..." className="min-h-[120px] text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Impression *</Label>
              <Textarea value={impression} onChange={e => setImpression(e.target.value)} placeholder="Summary impression..." className="min-h-[80px] text-sm" />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={critical} onChange={e => setCritical(e.target.checked)} className="rounded" />
                <span className="text-destructive font-medium">Critical Finding</span>
              </label>
            </div>

            {canWriteReport ? (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="gap-1.5 flex-1" onClick={() => handleSave('draft')}>
                  <Save className="h-4 w-4" /> Save Draft
                </Button>
                <Button className="gap-1.5 flex-1" onClick={() => handleSave('final')}>
                  <Send className="h-4 w-4" /> Finalize
                </Button>
              </div>
            ) : (
              <p className="pt-2 text-xs text-muted-foreground">
                Reporting is read-only for your role.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Study Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Study Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <dt className="text-muted-foreground">Modality</dt>
              <dd className="font-medium">{modalityLabels[study.modality]}</dd>
              <dt className="text-muted-foreground">Body Part</dt>
              <dd className="font-medium">{study.bodyPart}</dd>
              <dt className="text-muted-foreground">Study Date</dt>
              <dd>{format(new Date(study.studyDate), 'MMM d, yyyy HH:mm')}</dd>
              <dt className="text-muted-foreground">Radiologist</dt>
              <dd>{study.assignedRadiologist || 'Unassigned'}</dd>
              <dt className="text-muted-foreground">Series</dt>
              <dd>{study.seriesCount}</dd>
              <dt className="text-muted-foreground">Images</dt>
              <dd>{study.imageCount}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
