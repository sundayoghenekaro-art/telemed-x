import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { User, Trash2, Save, RotateCcw, Loader2, Pencil, MousePointer, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PainPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  severity: 'mild' | 'moderate' | 'severe';
}

interface DrawPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
}

interface PainBodyMapProps {
  patientUserId: string;
  gender?: string | null;
}

const SEVERITY_COLORS = {
  mild: { dot: 'hsl(50 90% 50%)', label: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  moderate: { dot: 'hsl(30 90% 50%)', label: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  severe: { dot: 'hsl(0 80% 50%)', label: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

// Body region detection shared across genders — coordinates are in the 340x580 viewBox.
// Layout is identical for both genders (head, shoulders, arms, torso, legs in same positions),
// only the torso SHAPE differs, so one detectRegion works for both.
const detectRegion = (x: number, y: number, view: 'front' | 'back'): string => {
  // Hands
  if (y >= 318 && y <= 375) {
    if (x < 100) return 'Right Hand';
    if (x > 240) return 'Left Hand';
  }
  // Feet
  if (y >= 520) {
    if (x < 170) return 'Right Foot';
    return 'Left Foot';
  }
  // Head
  if (y < 72) return 'Head';
  // Neck
  if (y < 92) return 'Neck';
  // Shoulder / chest area
  if (y >= 92 && y < 195) {
    if (x < 115) return 'Right Shoulder';
    if (x > 225) return 'Left Shoulder';
    return view === 'front' ? 'Chest' : 'Upper Back';
  }
  // Arms (forearm area) + abdomen
  if (y >= 195 && y < 310) {
    if (x < 100) return 'Right Arm';
    if (x > 240) return 'Left Arm';
    return view === 'front' ? 'Abdomen' : 'Lower Back';
  }
  // Hip area
  if (y >= 280 && y < 310) {
    if (x >= 130 && x < 170) return 'Right Hip';
    if (x >= 170 && x <= 210) return 'Left Hip';
  }
  // Thigh
  if (y >= 300 && y < 410) {
    if (x < 170) return 'Right Leg';
    return 'Left Leg';
  }
  // Knee
  if (y >= 410 && y < 430) {
    if (x < 170) return 'Right Knee';
    return 'Left Knee';
  }
  // Lower leg
  if (y >= 430 && y < 520) {
    if (x < 170) return 'Right Leg';
    return 'Left Leg';
  }
  return 'Body';
};

export function PainBodyMap({ patientUserId, gender }: PainBodyMapProps) {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [mode, setMode] = useState<'tap' | 'draw'>('tap');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<PainPoint | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [bodyGender, setBodyGender] = useState<'male' | 'female'>(
    gender === 'female' ? 'female' : gender === 'male' ? 'male' : 'male'
  );
  const [showLabels, setShowLabels] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  const getSvgCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return null;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * 340;
    const y = ((clientY - rect.top) / rect.height) * 580;
    return { x, y };
  }, []);

  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    if (mode !== 'tap') return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    const region = detectRegion(coords.x, coords.y, view);
    const newPoint: PainPoint = {
      id: `p-${Date.now()}`,
      x: coords.x,
      y: coords.y,
      label: region,
      severity,
    };
    setPainPoints(prev => [...prev, newPoint]);
  }, [mode, severity, getSvgCoords, view]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const coords = getSvgCoords(e);
    if (!coords) return;
    setDrawing(true);
    setCurrentPath([coords]);
  }, [mode, getSvgCoords]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || mode !== 'draw') return;
    e.preventDefault();
    const coords = getSvgCoords(e);
    if (!coords) return;
    setCurrentPath(prev => [...prev, coords]);
  }, [drawing, mode, getSvgCoords]);

  const handlePointerUp = useCallback(() => {
    if (!drawing || currentPath.length < 2) {
      setDrawing(false);
      setCurrentPath([]);
      return;
    }
    const newPath: DrawPath = {
      id: `d-${Date.now()}`,
      points: currentPath,
      color: SEVERITY_COLORS[severity].dot,
    };
    setDrawPaths(prev => [...prev, newPath]);
    setDrawing(false);
    setCurrentPath([]);
  }, [drawing, currentPath, severity]);

  const clearAll = () => {
    setPainPoints([]);
    setDrawPaths([]);
    setNotes('');
  };

  const removePainPoint = (id: string) => {
    setPainPoints(prev => prev.filter(p => p.id !== id));
    setSelectedPoint(null);
  };

  const saveReport = async () => {
    if (painPoints.length === 0 && drawPaths.length === 0) {
      toast.error('Please mark at least one pain area on the body map');
      return;
    }
    setSaving(true);
    try {
      await supabase.from('patient_medical_records').insert({
        patient_user_id: patientUserId,
        title: `Pain Report — ${new Date().toLocaleDateString()}`,
        record_type: 'other',
        notes: `Pain Body Map Report (${bodyGender}, ${view} view)\n\nMarked areas:\n${painPoints.map(p => `• ${p.label} (${p.severity})`).join('\n')}\n\nAdditional notes: ${notes || 'None'}`,
        provider_name: 'Self-reported',
        record_date: new Date().toISOString().split('T')[0],
      });

      toast.success('Pain report saved to your medical records');
      clearAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const pathToSvg = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
          <User className="h-5 w-5 text-rose-600" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-foreground">Pain Body Map</h2>
          <p className="text-xs text-muted-foreground">Tap or draw on the body to mark where you feel pain</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setMode('tap')}
            className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition ${
              mode === 'tap' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MousePointer className="h-3 w-3" /> Tap
          </button>
          <button
            onClick={() => setMode('draw')}
            className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition ${
              mode === 'draw' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil className="h-3 w-3" /> Draw
          </button>
        </div>

        <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mild">Mild</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="severe">Severe</SelectItem>
          </SelectContent>
        </Select>

        {/* Gender toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setBodyGender('male')}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              bodyGender === 'male' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Male
          </button>
          <button
            onClick={() => setBodyGender('female')}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              bodyGender === 'female' ? 'bg-pink-500 text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Female
          </button>
        </div>

        {/* Front / Back toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setView('front')}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              view === 'front' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setView('back')}
            className={`px-3 py-1.5 text-xs font-medium transition ${
              view === 'back' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Back
          </button>
        </div>

        <button
          onClick={() => setShowLabels(!showLabels)}
          className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
          title="Toggle region labels"
        >
          {showLabels ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>

        <Button size="sm" variant="ghost" onClick={clearAll} className="text-muted-foreground hover:text-foreground ml-auto">
          <RotateCcw className="h-3 w-3 mr-1" /> Clear
        </Button>
      </div>

      {/* Body Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 flex flex-col items-center">
          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
            {bodyGender === 'male' ? 'Male' : 'Female'} • {view === 'front' ? 'Front View' : 'Back View'}
          </p>
          <svg
            ref={svgRef}
            viewBox="0 0 340 580"
            className="w-full max-w-[300px] cursor-crosshair select-none"
            style={{ touchAction: 'none' }}
            onClick={handleSvgClick}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            {/* Body silhouette fill */}
            <BodySilhouette gender={bodyGender} view={view} />

            {/* Body outline */}
            <BodyOutline gender={bodyGender} view={view} />

            {/* Body details */}
            <BodyDetails gender={bodyGender} view={view} />

            {/* Region labels */}
            {showLabels && (
              <g fill="hsl(0 0% 0%)" fontSize="7" textAnchor="middle" opacity="0.5" fontWeight="600">
                <text x="170" y="42">Head</text>
                <text x="170" y="155">{view === 'front' ? 'Chest' : 'Upper Back'}</text>
                <text x="170" y="245">{view === 'front' ? (bodyGender === 'female' ? 'Abdomen' : 'Abdomen') : 'Lower Back'}</text>
                <text x="72" y="280">R. Hand</text>
                <text x="268" y="280">L. Hand</text>
                <text x="151" y="548">R. Foot</text>
                <text x="189" y="548">L. Foot</text>
              </g>
            )}

            {/* Draw paths */}
            {drawPaths.map(path => (
              <path
                key={path.id}
                d={pathToSvg(path.points)}
                fill="none"
                stroke={path.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
            ))}

            {/* Current drawing path */}
            {currentPath.length > 1 && (
              <path
                d={pathToSvg(currentPath)}
                fill="none"
                stroke={SEVERITY_COLORS[severity].dot}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.5"
                strokeDasharray="6 3"
              />
            )}

            {/* Pain points */}
            {painPoints.map(point => (
              <g key={point.id} onClick={(e) => { e.stopPropagation(); setSelectedPoint(point); }} className="cursor-pointer">
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill={SEVERITY_COLORS[point.severity].dot}
                  opacity="0.25"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={SEVERITY_COLORS[point.severity].dot}
                  stroke="white"
                  strokeWidth="1.5"
                  opacity="0.9"
                />
                <text
                  x={point.x}
                  y={point.y - 16}
                  textAnchor="middle"
                  fill="white"
                  fontSize="8"
                  fontWeight="bold"
                  opacity="0.8"
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
        </CardContent>
      </Card>

      {/* Pain points summary */}
      {painPoints.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium text-foreground mb-2">Marked Pain Areas ({painPoints.length})</p>
            <div className="flex flex-wrap gap-2">
              {painPoints.map(p => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className={`${SEVERITY_COLORS[p.severity].bg} ${SEVERITY_COLORS[p.severity].label} text-xs cursor-pointer`}
                  onClick={() => removePainPoint(p.id)}
                >
                  {p.label} ({p.severity}) ✕
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes & Save */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-muted-foreground text-sm">Additional Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the pain (e.g., sharp, dull, throbbing, constant, intermittent)..."
            rows={3}
          />
          <Button onClick={saveReport} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Pain Report
          </Button>
        </CardContent>
      </Card>

      {/* Point detail dialog */}
      <Dialog open={!!selectedPoint} onOpenChange={(open) => !open && setSelectedPoint(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{selectedPoint?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Severity: <span className={SEVERITY_COLORS[selectedPoint?.severity || 'mild'].label}>{selectedPoint?.severity}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={() => selectedPoint && removePainPoint(selectedPoint.id)}>
              <Trash2 className="h-3 w-3 mr-1" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Body SVG Components
// ============================================================

const SKIN_TONE_FRONT = 'hsl(35 45% 88%)';
const SKIN_TONE_BACK = 'hsl(35 40% 84%)';
const OUTLINE_COLOR = 'hsl(210 60% 45%)';
const DETAIL_COLOR = 'hsl(210 50% 55%)';

export function BodySilhouette({ gender, view }: { gender: 'male' | 'female'; view: 'front' | 'back' }) {
  const fill = view === 'front' ? SKIN_TONE_FRONT : SKIN_TONE_BACK;
  const fillOpacity = 0.45;

  if (gender === 'male') {
    return (
      <g fill={fill} fillOpacity={fillOpacity} stroke="none">
        {/* Head */}
        <ellipse cx="170" cy="40" rx="27" ry="33" />
        {/* Neck */}
        <path d="M 158 70 L 158 88 Q 158 92 162 92 L 178 92 Q 182 92 182 88 L 182 70 Z" />
        {/* Torso — male: broad shoulders, relatively straight down to hips */}
        <path d="M 108 118 Q 105 175 103 230 Q 102 260 108 270 L 125 285 L 135 290 L 135 300 L 205 300 L 205 290 L 215 285 Q 232 270 237 230 Q 235 175 232 118 Q 210 95 182 92 L 158 92 Q 130 95 108 118 Z" />
        {/* Left arm (viewer's right) */}
        <path d="M 232 118 Q 255 130 260 175 Q 265 250 268 310 Q 268 318 255 318 L 256 345 Q 255 350 262 355 L 272 365 Q 270 370 265 365 L 255 355 Q 250 345 248 330 Q 245 270 246 215 Q 240 150 232 118 Z" />
        {/* Right arm (viewer's left) */}
        <path d="M 108 118 Q 85 130 80 175 Q 75 250 72 310 Q 72 318 85 318 L 84 345 Q 85 350 78 355 L 68 365 Q 70 370 75 365 L 85 355 Q 90 345 92 330 Q 95 270 94 215 Q 100 150 108 118 Z" />
        {/* Left leg (viewer's right) */}
        <path d="M 175 300 Q 200 320 200 380 Q 200 440 195 520 Q 195 530 185 545 L 180 550 Q 175 555 175 545 L 175 500 Q 178 400 175 300 Z" />
        {/* Right leg (viewer's left) */}
        <path d="M 165 300 Q 140 320 140 380 Q 140 440 145 520 Q 145 530 155 545 L 160 550 Q 165 555 165 545 L 165 500 Q 162 400 165 300 Z" />
        {/* Left foot */}
        <path d="M 180 540 Q 175 548 178 555 Q 180 560 195 558 Q 205 556 205 545 Q 200 538 195 538 Z" />
        {/* Right foot */}
        <path d="M 160 540 Q 165 548 162 555 Q 160 560 145 558 Q 135 556 135 545 Q 140 538 145 538 Z" />
      </g>
    );
  }

  // Female silhouette — narrower shoulders, defined waist, wider hips
  return (
    <g fill={fill} fillOpacity={fillOpacity} stroke="none">
      {/* Head */}
      <ellipse cx="170" cy="40" rx="25" ry="31" />
      {/* Neck — slightly more slender */}
      <path d="M 160 68 L 160 88 Q 160 92 164 92 L 176 92 Q 180 92 180 88 L 180 68 Z" />
      {/* Torso — female: narrower shoulders, defined waist, wider hips/pelvis */}
      <path d="M 115 118 Q 112 160 110 200 Q 108 215 115 225 L 122 235 Q 120 250 130 265 Q 140 280 155 290 L 165 295 L 165 300 L 175 300 L 175 295 L 185 290 Q 200 280 210 265 Q 220 250 218 235 L 225 225 Q 232 215 230 200 Q 228 160 225 118 Q 205 95 180 92 L 160 92 Q 135 95 115 118 Z" />
      {/* Left arm — slightly more slender */}
      <path d="M 225 118 Q 245 135 250 175 Q 255 250 258 310 Q 258 318 246 318 L 247 345 Q 248 350 254 355 L 263 363 Q 261 367 256 363 L 247 355 Q 242 345 240 330 Q 238 270 239 215 Q 233 150 225 118 Z" />
      {/* Right arm */}
      <path d="M 115 118 Q 95 135 90 175 Q 85 250 82 310 Q 82 318 94 318 L 93 345 Q 92 350 86 355 L 77 363 Q 79 367 84 363 L 93 355 Q 98 345 100 330 Q 102 270 101 215 Q 107 150 115 118 Z" />
      {/* Left leg — slightly more slender, wider at hip */}
      <path d="M 175 300 Q 198 325 196 380 Q 195 440 192 520 Q 192 530 184 545 L 180 550 Q 176 554 176 545 L 176 500 Q 178 400 175 300 Z" />
      {/* Right leg */}
      <path d="M 165 300 Q 142 325 144 380 Q 145 440 148 520 Q 148 530 156 545 L 160 550 Q 164 554 164 545 L 164 500 Q 162 400 165 300 Z" />
      {/* Left foot */}
      <path d="M 182 540 Q 178 548 180 555 Q 182 560 194 558 Q 203 556 203 546 Q 198 539 193 539 Z" />
      {/* Right foot */}
      <path d="M 158 540 Q 162 548 160 555 Q 158 560 146 558 Q 137 556 137 546 Q 142 539 147 539 Z" />
    </g>
  );
}

export function BodyOutline({ gender, view }: { gender: 'male' | 'female'; view: 'front' | 'back' }) {
  if (gender === 'male') {
    return (
      <g fill="none" stroke={OUTLINE_COLOR} strokeWidth="1.8" opacity="0.5" strokeLinejoin="round" strokeLinecap="round">
        {/* Head */}
        <ellipse cx="170" cy="40" rx="27" ry="33" />
        {/* Ears */}
        {view === 'front' && (
          <>
            <ellipse cx="141" cy="40" rx="4" ry="7" />
            <ellipse cx="199" cy="40" rx="4" ry="7" />
          </>
        )}
        {/* Neck */}
        <path d="M 158 70 L 158 88 Q 158 92 162 92 L 178 92 Q 182 92 182 88 L 182 70" />
        {/* Shoulder line */}
        <path d="M 158 92 Q 130 96 108 118" />
        <path d="M 182 92 Q 210 96 232 118" />
        {/* Torso outline — male: broad, relatively straight */}
        <path d="M 108 118 Q 105 175 103 230 Q 102 260 108 270 L 125 285 L 135 290 L 135 300 L 205 300 L 205 290 L 215 285 Q 232 270 237 230 Q 235 175 232 118" />
        {/* Center line */}
        <line x1="170" y1="92" x2="170" y2="300" stroke={DETAIL_COLOR} strokeWidth="0.5" opacity="0.15" />

        {/* Left arm (viewer's right) */}
        <path d="M 232 118 Q 255 130 260 175 Q 265 250 268 310" />
        <path d="M 232 118 Q 240 125 246 170 Q 250 240 255 310" />
        {/* Left hand */}
        <path d="M 255 310 Q 254 320 256 325 L 255 345 Q 254 352 262 358 L 272 365" />
        <path d="M 268 310 Q 269 320 268 325 L 268 345 Q 269 355 265 360" />
        {/* Left fingers */}
        <path d="M 262 358 Q 264 365 266 368" strokeWidth="1" />
        <path d="M 258 358 Q 258 366 260 370" strokeWidth="1" />
        <path d="M 255 357 Q 254 365 256 369" strokeWidth="1" />
        <path d="M 252 355 Q 250 362 252 366" strokeWidth="1" />

        {/* Right arm (viewer's left) */}
        <path d="M 108 118 Q 85 130 80 175 Q 75 250 72 310" />
        <path d="M 108 118 Q 100 125 94 170 Q 90 240 85 310" />
        {/* Right hand */}
        <path d="M 85 310 Q 86 320 84 325 L 85 345 Q 86 352 78 358 L 68 365" />
        <path d="M 72 310 Q 71 320 72 325 L 72 345 Q 71 355 75 360" />
        {/* Right fingers */}
        <path d="M 78 358 Q 76 365 74 368" strokeWidth="1" />
        <path d="M 82 358 Q 82 366 80 370" strokeWidth="1" />
        <path d="M 85 357 Q 86 365 84 369" strokeWidth="1" />
        <path d="M 88 355 Q 90 362 88 366" strokeWidth="1" />

        {/* Left leg (viewer's right) */}
        <path d="M 175 300 Q 200 320 200 380 Q 200 440 195 520 Q 195 530 185 545 L 180 550" />
        <path d="M 175 300 L 178 380 Q 178 440 176 520 L 176 545" />
        {/* Right leg */}
        <path d="M 165 300 Q 140 320 140 380 Q 140 440 145 520 Q 145 530 155 545 L 160 550" />
        <path d="M 165 300 L 162 380 Q 162 440 164 520 L 164 545" />
        {/* Left foot */}
        <path d="M 180 550 Q 175 555 178 558 Q 185 562 200 558 Q 206 555 205 548 Q 200 540 195 540 Z" />
        {/* Right foot */}
        <path d="M 160 550 Q 165 555 162 558 Q 155 562 140 558 Q 134 555 135 548 Q 140 540 145 540 Z" />
        {/* Left toes */}
        <path d="M 195 555 L 196 560 M 198 556 L 199 561 M 201 556 L 202 560 M 203 555 L 204 558" strokeWidth="0.8" />
        {/* Right toes */}
        <path d="M 145 555 L 144 560 M 142 556 L 141 561 M 139 556 L 138 561 M 137 555 L 136 558" strokeWidth="0.8" />
      </g>
    );
  }

  // Female outline
  return (
    <g fill="none" stroke={OUTLINE_COLOR} strokeWidth="1.8" opacity="0.5" strokeLinejoin="round" strokeLinecap="round">
      {/* Head — slightly smaller, rounder */}
      <ellipse cx="170" cy="40" rx="25" ry="31" />
      {/* Ears */}
      {view === 'front' && (
        <>
          <ellipse cx="142" cy="40" rx="3.5" ry="6.5" />
          <ellipse cx="198" cy="40" rx="3.5" ry="6.5" />
        </>
      )}
      {/* Hair suggestion (front view only) */}
      {view === 'front' && (
        <path d="M 145 28 Q 150 12 170 10 Q 190 12 195 28 Q 198 22 196 15 Q 185 5 170 5 Q 155 5 144 15 Q 142 22 145 28" strokeWidth="1" opacity="0.3" />
      )}
      {/* Neck — more slender */}
      <path d="M 160 68 L 160 88 Q 160 92 164 92 L 176 92 Q 180 92 180 88 L 180 68" />
      {/* Shoulder line — narrower than male */}
      <path d="M 160 92 Q 135 98 115 118" />
      <path d="M 180 92 Q 205 98 225 118" />
      {/* Torso — female: waist curve, wider hips */}
      <path d="M 115 118 Q 112 160 110 200 Q 108 215 115 225 L 122 235 Q 120 250 130 265 Q 140 280 155 290 L 165 295 L 165 300 L 175 300 L 175 295 L 185 290 Q 200 280 210 265 Q 220 250 218 235 L 225 225 Q 232 215 230 200 Q 228 160 225 118" />
      {/* Waist indent lines */}
      <path d="M 112 195 Q 120 210 115 225" strokeWidth="0.8" opacity="0.2" />
      <path d="M 228 195 Q 220 210 225 225" strokeWidth="0.8" opacity="0.2" />
      {/* Center line */}
      <line x1="170" y1="92" x2="170" y2="300" stroke={DETAIL_COLOR} strokeWidth="0.5" opacity="0.15" />

      {/* Left arm — slightly more slender */}
      <path d="M 225 118 Q 245 135 250 175 Q 255 250 258 310" />
      <path d="M 225 118 Q 232 128 237 170 Q 242 240 246 310" />
      {/* Left hand */}
      <path d="M 246 310 Q 245 320 247 325 L 247 345 Q 248 352 254 358 L 263 363" />
      <path d="M 258 310 Q 259 320 258 325 L 259 345 Q 260 355 256 360" />
      {/* Left fingers */}
      <path d="M 254 358 Q 256 365 258 368" strokeWidth="1" />
      <path d="M 250 358 Q 250 366 252 370" strokeWidth="1" />
      <path d="M 247 357 Q 246 365 248 369" strokeWidth="1" />
      <path d="M 244 355 Q 242 362 244 366" strokeWidth="1" />

      {/* Right arm */}
      <path d="M 115 118 Q 95 135 90 175 Q 85 250 82 310" />
      <path d="M 115 118 Q 108 128 103 170 Q 98 240 94 310" />
      {/* Right hand */}
      <path d="M 94 310 Q 95 320 93 325 L 93 345 Q 92 352 86 358 L 77 363" />
      <path d="M 82 310 Q 81 320 82 325 L 82 345 Q 81 355 85 360" />
      {/* Right fingers */}
      <path d="M 86 358 Q 84 365 82 368" strokeWidth="1" />
      <path d="M 90 358 Q 90 366 88 370" strokeWidth="1" />
      <path d="M 93 357 Q 94 365 92 369" strokeWidth="1" />
      <path d="M 96 355 Q 98 362 96 366" strokeWidth="1" />

      {/* Left leg — wider at hip, slender */}
      <path d="M 175 300 Q 198 325 196 380 Q 195 440 192 520 Q 192 530 184 545 L 180 550" />
      <path d="M 175 300 L 178 380 Q 178 440 176 520 L 176 545" />
      {/* Right leg */}
      <path d="M 165 300 Q 142 325 144 380 Q 145 440 148 520 Q 148 530 156 545 L 160 550" />
      <path d="M 165 300 L 162 380 Q 162 440 164 520 L 164 545" />
      {/* Left foot */}
      <path d="M 182 550 Q 178 555 180 558 Q 186 562 198 558 Q 204 555 203 548 Q 198 540 193 540 Z" />
      {/* Right foot */}
      <path d="M 158 550 Q 162 555 160 558 Q 154 562 142 558 Q 136 555 137 548 Q 142 540 147 540 Z" />
      {/* Left toes */}
      <path d="M 193 555 L 194 560 M 196 556 L 197 561 M 199 556 L 200 560 M 201 555 L 202 558" strokeWidth="0.8" />
      {/* Right toes */}
      <path d="M 147 555 L 146 560 M 144 556 L 143 561 M 141 556 L 140 561 M 139 555 L 138 558" strokeWidth="0.8" />
    </g>
  );
}

export function BodyDetails({ gender, view }: { gender: 'male' | 'female'; view: 'front' | 'back' }) {
  if (view === 'back') {
    return (
      <g fill="none" stroke={DETAIL_COLOR} strokeWidth="0.7" opacity="0.2">
        {/* Spine line */}
        <line x1="170" y1="95" x2="170" y2="295" />
        {/* Shoulder blade hints */}
        <path d="M 125 115 Q 145 130 160 120" opacity="0.15" />
        <path d="M 215 115 Q 195 130 180 120" opacity="0.15" />
        {/* Gluteal crease hints */}
        {gender === 'male' ? (
          <>
            <path d="M 140 285 Q 155 295 165 295" opacity="0.12" />
            <path d="M 200 285 Q 185 295 175 295" opacity="0.12" />
          </>
        ) : (
          <>
            <path d="M 140 280 Q 155 295 165 295" opacity="0.12" />
            <path d="M 200 280 Q 185 295 175 295" opacity="0.12" />
          </>
        )}
        {/* Calf muscle hint */}
        <path d="M 180 470 Q 188 475 190 490" opacity="0.1" />
        <path d="M 160 470 Q 152 475 150 490" opacity="0.1" />
      </g>
    );
  }

  // Front view details
  if (gender === 'male') {
    return (
      <g fill="none" stroke={DETAIL_COLOR} strokeWidth="0.7" opacity="0.2">
        {/* Collarbone */}
        <path d="M 158 100 Q 140 105 120 112" />
        <path d="M 182 100 Q 200 105 220 112" />
        {/* Chest muscle hints */}
        <path d="M 120 115 Q 150 135 165 135" opacity="0.12" />
        <path d="M 220 115 Q 190 135 175 135" opacity="0.12" />
        {/* Sternum line */}
        <line x1="170" y1="105" x2="170" y2="155" opacity="0.1" />
        {/* Abdominal muscle hints */}
        <line x1="155" y1="160" x2="155" y2="285" opacity="0.08" />
        <line x1="185" y1="160" x2="185" y2="285" opacity="0.08" />
        <path d="M 145 200 Q 170 205 195 200" opacity="0.08" />
        <path d="M 145 235 Q 170 240 195 235" opacity="0.08" />
        <path d="M 145 265 Q 170 270 195 265" opacity="0.08" />
        {/* Navel */}
        <circle cx="170" cy="245" r="2.5" strokeWidth="0.8" opacity="0.3" />
        {/* Knee caps */}
        <ellipse cx="189" cy="415" rx="10" ry="8" strokeWidth="1" opacity="0.25" />
        <ellipse cx="151" cy="415" rx="10" ry="8" strokeWidth="1" opacity="0.25" />
        {/* Facial features */}
        <g opacity="0.15">
          <circle cx="160" cy="38" r="2" fill={DETAIL_COLOR} stroke="none" />
          <circle cx="180" cy="38" r="2" fill={DETAIL_COLOR} stroke="none" />
          <path d="M 165 52 Q 170 55 175 52" strokeWidth="0.6" />
          <path d="M 163 48 Q 170 50 177 48" strokeWidth="0.5" opacity="0.1" />
        </g>
      </g>
    );
  }

  // Female front details
  return (
    <g fill="none" stroke={DETAIL_COLOR} strokeWidth="0.7" opacity="0.2">
    {/* Collarbone */}
    <path d="M 160 100 Q 142 106 122 113" />
    <path d="M 180 100 Q 198 106 218 113" />
    {/* Bust hints */}
    <ellipse cx="148" cy="140" rx="14" ry="12" strokeWidth="0.6" opacity="0.1" />
    <ellipse cx="192" cy="140" rx="14" ry="12" strokeWidth="0.6" opacity="0.1" />
    {/* Sternum line */}
    <line x1="170" y1="105" x2="170" y2="150" opacity="0.08" />
    {/* Waist definition */}
    <path d="M 112 195 Q 125 210 120 230" opacity="0.1" />
    <path d="M 228 195 Q 215 210 220 230" opacity="0.1" />
    {/* Pelvic hint */}
    <path d="M 135 270 Q 170 285 205 270" opacity="0.08" />
    {/* Navel */}
    <circle cx="170" cy="250" r="2.5" strokeWidth="0.8" opacity="0.3" />
    {/* Knee caps */}
    <ellipse cx="188" cy="415" rx="9" ry="7" strokeWidth="1" opacity="0.25" />
    <ellipse cx="152" cy="415" rx="9" ry="7" strokeWidth="1" opacity="0.25" />
    {/* Facial features */}
    <g opacity="0.15">
      <circle cx="161" cy="38" r="1.8" fill={DETAIL_COLOR} stroke="none" />
      <circle cx="179" cy="38" r="1.8" fill={DETAIL_COLOR} stroke="none" />
      <path d="M 165 52 Q 170 54 175 52" strokeWidth="0.6" />
      <path d="M 163 48 Q 170 50 177 48" strokeWidth="0.5" opacity="0.1" />
    </g>
  </g>
  );
}
