import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Loader2 } from 'lucide-react';
import { BodySilhouette, BodyOutline, BodyDetails } from './PainBodyMap';

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

interface SessionPainMapViewerProps {
  sessionId: string;
}

const SEVERITY_COLORS: Record<string, { dot: string; label: string; bg: string }> = {
  mild: { dot: 'hsl(50 90% 50%)', label: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  moderate: { dot: 'hsl(30 90% 50%)', label: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  severe: { dot: 'hsl(0 80% 50%)', label: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

export function SessionPainMapViewer({ sessionId }: SessionPainMapViewerProps) {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);
  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  const fetchPainMap = useCallback(async () => {
    const { data } = await supabase
      .from('session_pain_maps' as any)
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (data) {
      const d = data as any;
      setPainPoints(d.pain_points || []);
      setDrawPaths(d.draw_paths || []);
      setBodyView(d.body_view || 'front');
      setNotes(d.notes || '');
      setHasData(true);
    } else {
      setHasData(false);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchPainMap();

    const channel = supabase
      .channel(`pain-map-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_pain_maps',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchPainMap())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchPainMap]);

  const pathToSvg = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <User className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">Patient has not marked any pain areas yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Patient Pain Map
          <Badge variant="outline" className="text-[10px] ml-auto">
            {bodyView === 'front' ? 'Front' : 'Back'} • {painPoints.length} point(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <svg viewBox="0 0 340 580" className="w-full max-w-[200px]">
          {/* Body — gender-aware */}
          <BodySilhouette gender="male" view={bodyView} />
          <BodyOutline gender="male" view={bodyView} />
          <BodyDetails gender="male" view={bodyView} />

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

          {/* Pain points */}
          {painPoints.map(point => (
            <g key={point.id}>
              <circle cx={point.x} cy={point.y} r="12" fill={SEVERITY_COLORS[point.severity]?.dot || 'orange'} opacity="0.25" />
              <circle cx={point.x} cy={point.y} r="6" fill={SEVERITY_COLORS[point.severity]?.dot || 'orange'} stroke="white" strokeWidth="1.5" opacity="0.9" />
              <text x={point.x} y={point.y - 16} textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="bold" opacity="0.7">
                {point.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        {painPoints.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 justify-center">
            {painPoints.map(p => (
              <Badge key={p.id} variant="outline" className={`text-[10px] ${SEVERITY_COLORS[p.severity]?.bg || ''} ${SEVERITY_COLORS[p.severity]?.label || ''}`}>
                {p.label} ({p.severity})
              </Badge>
            ))}
          </div>
        )}

        {notes && (
          <p className="text-xs text-muted-foreground mt-2 text-center italic">"{notes}"</p>
        )}
      </CardContent>
    </Card>
  );
}
