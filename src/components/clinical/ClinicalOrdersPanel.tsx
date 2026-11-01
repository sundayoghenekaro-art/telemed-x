import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlaskConical, ImageIcon, ArrowRight, Syringe, Pill, Clock, CheckCircle2, AlertTriangle, Activity, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClinicalOrder, ClinicalOrderType } from '@/data/clinicalMockData';
import { NewClinicalOrderDialog } from './NewClinicalOrderDialog';

interface ClinicalOrdersPanelProps {
  orders: ClinicalOrder[];
}

const typeIcons: Record<ClinicalOrderType, React.ElementType> = {
  lab: FlaskConical,
  imaging: ImageIcon,
  referral: ArrowRight,
  procedure: Syringe,
  medication: Pill,
};

const typeLabels: Record<ClinicalOrderType, string> = {
  lab: 'Laboratory',
  imaging: 'Imaging',
  referral: 'Referral',
  procedure: 'Procedure',
  medication: 'Medication',
};

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'bg-info/10 text-info border-info/20', icon: Activity },
  completed: { label: 'Completed', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground border-muted', icon: AlertTriangle },
};

const priorityConfig = {
  routine: 'bg-muted text-muted-foreground',
  urgent: 'bg-warning text-warning-foreground',
  stat: 'bg-destructive text-destructive-foreground',
};

export function ClinicalOrdersPanel({ orders }: ClinicalOrdersPanelProps) {
  const [localOrders, setLocalOrders] = useState<ClinicalOrder[]>(orders);
  const [showNew, setShowNew] = useState(false);

  const handleCreated = (order: ClinicalOrder) => {
    setLocalOrders(prev => [order, ...prev]);
  };

  const sorted = [...localOrders].sort((a, b) => {
    const pOrder = { stat: 0, urgent: 1, routine: 2 };
    if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
    return new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime();
  });

  const pending = sorted.filter(o => o.status === 'pending' || o.status === 'in-progress');
  const completed = sorted.filter(o => o.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['lab', 'imaging', 'referral', 'procedure', 'medication'] as ClinicalOrderType[]).map(type => {
          const Icon = typeIcons[type];
          const count = localOrders.filter(o => o.type === type).length;
          const pendingCount = localOrders.filter(o => o.type === type && (o.status === 'pending' || o.status === 'in-progress')).length;
          return (
            <Card key={type}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[type]}{pendingCount > 0 && ` (${pendingCount} active)`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="all">All ({localOrders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <OrdersList orders={pending} />
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <OrdersList orders={completed} />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <OrdersList orders={sorted} />
        </TabsContent>
      </Tabs>

      <NewClinicalOrderDialog open={showNew} onOpenChange={setShowNew} onCreated={handleCreated} />
    </div>
  );
}

function OrdersList({ orders }: { orders: ClinicalOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No orders in this category</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3">
        {orders.map(order => {
          const Icon = typeIcons[order.type];
          const sCfg = statusConfig[order.status];
          return (
            <div key={order.id} className={cn("border rounded-lg p-4 space-y-2", order.priority === 'stat' && "border-destructive/30 bg-destructive/5")}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-muted"><Icon className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium text-sm">{order.description}</p>
                    <p className="text-xs text-muted-foreground">{order.patientName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", priorityConfig[order.priority])}>{order.priority.toUpperCase()}</Badge>
                  <Badge variant="outline" className={cn("text-xs", sCfg.color)}>{sCfg.label}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Ordered by {order.orderedBy}</span>
                <span>{format(new Date(order.orderedAt), 'h:mm a')}</span>
              </div>
              {order.notes && <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-1">{order.notes}</p>}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
