import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Pencil, MousePointer, RotateCcw, Loader2 } from 'lucide-react';
import { BodySilhouette, BodyOutline, BodyDetails } from './PainBodyMap';
import { toast } from 'sonner';

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

interface SessionPainMapEditorProps {
  sessionId: string;
  patientUserId: string;
  gender?: string | null;
}

const SEVERITY_COLORS = {
  mild: { dot: 'hsl(50 90% 50%)', label: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  moderate: { dot: 'hsl(30 90% 50%)', label: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  severe: { dot: 'hsl(0 80% 50%)', label: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

export function SessionPainMapEditor({ sessionId, patientUserId, gender }: SessionPainMapEditorProps) {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [mode, setMode] = useState<'tap' | 'draw'>('tap');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [drawing, setDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [saving, setSaving] = useState(false);
  const [bodyGender, setBodyGender] = useState<'male' | 'female'>(
    gender === 'female' ? 'female' : gender === 'male' ? 'male' : 'male'
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Load existing data on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('session_pain_maps' as any)
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setPainPoints(d.pain_points || []);
        setDrawPaths(d.draw_paths || []);
        setView(d.body_view || 'front');
      }
    })();
  }, [sessionId]);

  // Auto-save with debounce
  const persistToDb = useCallback(async (points: PainPoint[], paths: DrawPath[], bodyView: string) => {
    setSaving(true);
    try {
      // Upsert via delete + insert (simple for unique constraint)
      const payload = {
        session_id: sessionId,
        patient_user_id: patientUserId,
        pain_points: points,
        draw_paths: paths,
        body_view: bodyView,
        updated_at: new Date().toISOString(),
      };

      // Try update first
      const { data: existing } = await supabase
        .from('session_pain_maps' as any)
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existing) {
        await supabase.from('session_pain_maps' as any)
          .update(payload as any)
          .eq('session_id', sessionId);
      } else {
        await supabase.from('session_pain_maps' as any)
          .insert(payload as any);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [sessionId, patientUserId]);

  const scheduleSave = useCallback((points: PainPoint[], paths: DrawPath[], bodyView: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => persistToDb(points, paths, bodyView), 600);
  }, [persistToDb]);

  const getSvgCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: ((clientX - rect.left) / rect.width) * 340,
      y: ((clientY - rect.top) / rect.height) * 580,
    };
  }, []);

  const detectRegion = (x: number, y: number): string => {
    if (y >= 310 && y <= 370) {
      if (x < 100) return 'Right Hand';
      if (x > 240) return 'Left Hand';
    }
    if (y >= 520) {
      if (x < 170) return 'Right Foot';
      return 'Left Foot';
    }
    if (y < 72) return 'Head';
    if (y < 92) return 'Neck';
    if (y < 195) {
      if (x < 115) return 'Right Shoulder';
      if (x > 225) return 'Left Shoulder';
      return view === 'front' ? 'Chest' : 'Upper Back';
    }
    if (y < 310) {
      if (x < 100) return 'Right Arm';
      if (x > 240) return 'Left Arm';
      return view === 'front' ? 'Abdomen' : 'Lower Back';
    }
    if (y < 410) return x < 170 ? 'Right Leg' : 'Left Leg';
    if (y < 430) return x < 170 ? 'Right Knee' : 'Left Knee';
    if (y < 520) return x < 170 ? 'Right Leg' : 'Left Leg';
    return 'Body';
  };

  const handleSvgClick = useCallback((e: React.MouseEvent) => {
    if (mode !== 'tap') return;
    const coords = getSvgCoords(e);
    if (!coords) return;
    const newPoint: PainPoint = { id: `p-${Date.now()}`, x: coords.x, y: coords.y, label: detectRegion(coords.x, coords.y), severity };
    const next = [...painPoints, newPoint];
    setPainPoints(next);
    scheduleSave(next, drawPaths, view);
  }, [mode, severity, getSvgCoords, painPoints, drawPaths, view, scheduleSave]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const coords = getSvgCoords(e);
    if (!coords) return;
    setDrawing(true);
    setCurrentPath([coords]);
  }, [mode, getSvgCoords]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const coords = getSvgCoords(e);
    if (!coords) return;
    setCurrentPath(prev => [...prev, coords]);
  }, [drawing, getSvgCoords]);

  const handlePointerUp = useCallback(() => {
    if (!drawing || currentPath.length < 2) {
      setDrawing(false);
      setCurrentPath([]);
      return;
    }
    const newPath: DrawPath = { id: `d-${Date.now()}`, points: currentPath, color: SEVERITY_COLORS[severity].dot };
    const next = [...drawPaths, newPath];
    setDrawPaths(next);
    setDrawing(false);
    setCurrentPath([]);
    scheduleSave(painPoints, next, view);
  }, [drawing, currentPath, severity, drawPaths, painPoints, view, scheduleSave]);

  const clearAll = () => {
    setPainPoints([]);
    setDrawPaths([]);
    scheduleSave([], [], view);
  };

  const removePainPoint = (id: string) => {
    const next = painPoints.filter(p => p.id !== id);
    setPainPoints(next);
    scheduleSave(next, drawPaths, view);
  };

  const pathToSvg = (points: { x: number; y: number }[]) =>
    points.length < 2 ? '' : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-white">
        <User className="h-4 w-4 text-rose-400" />
        <span className="text-sm font-semibold">Mark Pain Areas</span>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-white/40 ml-auto" />}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex rounded-md overflow-hidden border border-white/20 text-[11px]">
          <button onClick={() => setMode('tap')} className={`px-2 py-1 flex items-center gap-1 ${mode === 'tap' ? 'bg-white/20 text-white' : 'text-white/50'}`}>
            <MousePointer className="h-3 w-3" /> Tap
          </button>
          <button onClick={() => setMode('draw')} className={`px-2 py-1 flex items-center gap-1 ${mode === 'draw' ? 'bg-white/20 text-white' : 'text-white/50'}`}>
            <Pencil className="h-3 w-3" /> Draw
          </button>
        </div>
        <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
          <SelectTrigger className="w-24 h-7 text-[11px] bg-white/5 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mild">🟡 Mild</SelectItem>
            <SelectItem value="moderate">🟠 Moderate</SelectItem>
            <SelectItem value="severe">🔴 Severe</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md overflow-hidden border border-white/20 text-[11px]">
          <button onClick={() => setBodyGender('male')} className={`px-2 py-1 ${bodyGender === 'male' ? 'bg-blue-500/30 text-white' : 'text-white/50'}`}>M</button>
          <button onClick={() => setBodyGender('female')} className={`px-2 py-1 ${bodyGender === 'female' ? 'bg-pink-500/30 text-white' : 'text-white/50'}`}>F</button>
        </div>
        <div className="flex rounded-md overflow-hidden border border-white/20 text-[11px]">
          <button onClick={() => { setView('front'); scheduleSave(painPoints, drawPaths, 'front'); }} className={`px-2 py-1 ${view === 'front' ? 'bg-white/20 text-white' : 'text-white/50'}`}>Front</button>
          <button onClick={() => { setView('back'); scheduleSave(painPoints, drawPaths, 'back'); }} className={`px-2 py-1 ${view === 'back' ? 'bg-white/20 text-white' : 'text-white/50'}`}>Back</button>
        </div>
        <button onClick={clearAll} className="text-[11px] text-white/30 hover:text-white/70 ml-auto flex items-center gap-1">
          <RotateCcw className="h-3 w-3" /> Clear
        </button>
      </div>

      {/* SVG Body */}
      <div className="bg-white/5 rounded-lg border border-white/10 p-2 flex justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 340 580"
          className="w-full max-w-[180px] cursor-crosshair select-none"
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
          {/* Body — gender-aware, more human-like */}
          <BodySilhouette gender={bodyGender} view={view} />
          <BodyOutline gender={bodyGender} view={view} />
          <BodyDetails gender={bodyGender} view={view} />

          {/* Draw paths */}
          {drawPaths.map(path => (
            <path key={path.id} d={pathToSvg(path.points)} fill="none" stroke={path.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          ))}
          {currentPath.length > 1 && (
            <path d={pathToSvg(currentPath)} fill="none" stroke={SEVERITY_COLORS[severity].dot} strokeWidth="4" strokeLinecap="round" opacity="0.5" strokeDasharray="6 3" />
          )}

          {/* Pain points */}
          {painPoints.map(point => (
            <g key={point.id} onClick={(e) => { e.stopPropagation(); removePainPoint(point.id); }} className="cursor-pointer">
              <circle cx={point.x} cy={point.y} r="12" fill={SEVERITY_COLORS[point.severity].dot} opacity="0.25" />
              <circle cx={point.x} cy={point.y} r="6" fill={SEVERITY_COLORS[point.severity].dot} stroke="white" strokeWidth="1.5" opacity="0.9" />
              <text x={point.x} y={point.y - 14} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" opacity="0.8">{point.label}</text>
            </g>
          ))}
        </svg>
      </div>

      {painPoints.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {painPoints.map(p => (
            <Badge key={p.id} variant="outline" className={`text-[10px] cursor-pointer ${SEVERITY_COLORS[p.severity].bg} ${SEVERITY_COLORS[p.severity].label}`} onClick={() => removePainPoint(p.id)}>
              {p.label} ✕
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
