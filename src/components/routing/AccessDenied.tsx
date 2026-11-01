import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AccessDeniedProps {
  area?: string;
}

export function AccessDenied({ area }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldX className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Access Denied</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {area ? `Your role does not include access to ${area}.` : 'Your role does not include access to this area.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Nothing from this area was loaded. If you need this access, ask an administrator to review your role.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/dashboard')} className="flex-1">
              Go to dashboard
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
              Go back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
