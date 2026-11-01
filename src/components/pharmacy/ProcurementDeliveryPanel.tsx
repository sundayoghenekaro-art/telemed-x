import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  PackagePlus,
  Send,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DeliveryStatus,
  PurchaseOrder,
  PurchaseOrderStatus,
  mockPrescriptionDeliveries,
  mockPurchaseOrders,
  mockSuppliers,
} from '@/data/programmeOpsMockData';
import type { PharmacyInventoryItem } from '@/types/dhos';
import { cn } from '@/lib/utils';

interface ProcurementDeliveryPanelProps {
  inventory: PharmacyInventoryItem[];
  canManage?: boolean;
}

const PO_STATUS_STYLE: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  submitted: 'bg-info/10 text-info border-info/30',
  'in-transit': 'bg-warning/10 text-warning border-warning/30',
  received: 'bg-success/10 text-success border-success/30',
};

const DELIVERY_STYLE: Record<DeliveryStatus, string> = {
  preparing: 'bg-muted text-muted-foreground border-border',
  dispatched: 'bg-info/10 text-info border-info/30',
  'in-transit': 'bg-warning/10 text-warning border-warning/30',
  delivered: 'bg-success/10 text-success border-success/30',
};

const DELIVERY_STEPS: DeliveryStatus[] = ['preparing', 'dispatched', 'in-transit', 'delivered'];

const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

export function ProcurementDeliveryPanel({ inventory, canManage = false }: ProcurementDeliveryPanelProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [deliveries, setDeliveries] = useState(mockPrescriptionDeliveries);
  const [reorderSupplier, setReorderSupplier] = useState(mockSuppliers[0].id);

  const lowStock = useMemo(
    () => inventory.filter((item) => item.stockQuantity <= item.reorderLevel),
    [inventory],
  );

  const openOrders = orders.filter((order) => order.status !== 'received').length;
  const inTransit = orders.filter((order) => order.status === 'in-transit').length;
  const pendingPricing = orders.filter((order) => !order.centralPriceApplied).length;
  const activeDeliveries = deliveries.filter((delivery) => delivery.status !== 'delivered').length;

  const supplier = mockSuppliers.find((entry) => entry.id === reorderSupplier) ?? mockSuppliers[0];

  const advanceOrder = (order: PurchaseOrder) => {
    const next: Record<PurchaseOrderStatus, PurchaseOrderStatus | null> = {
      draft: 'submitted',
      submitted: 'in-transit',
      'in-transit': 'received',
      received: null,
    };
    const target = next[order.status];
    if (!target) return;
    if (order.status === 'draft' && !order.centralPriceApplied) {
      toast.error('Central price required', {
        description: `${order.id} needs a central formulary price before it can be submitted.`,
      });
      return;
    }
    setOrders((prev) =>
      prev.map((entry) => (entry.id === order.id ? { ...entry, status: target } : entry)),
    );
    const messages: Record<PurchaseOrderStatus, string> = {
      submitted: 'Order submitted to supplier',
      'in-transit': 'Supplier marked order in transit',
      received: 'Goods received and booked into stock',
      draft: 'Order saved as draft',
    };
    toast.success(messages[target], {
      description: `${order.id} · ${order.supplierName}`,
    });
  };

  const createReorder = (item: PharmacyInventoryItem) => {
    const order: PurchaseOrder = {
      id: `PO-${new Date().getFullYear()}-${String(orders.length + 10).padStart(4, '0')}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      items: [
        {
          medicationName: item.name,
          quantity: Math.max(item.reorderLevel * 2, 100),
          unitPrice: item.unitPrice,
        },
      ],
      status: 'draft',
      createdAt: new Date().toISOString(),
      expectedAt: addDays(new Date(), supplier.leadTimeDays).toISOString(),
      centralPriceApplied: false,
    };
    setOrders((prev) => [order, ...prev]);
    toast.success('Purchase order drafted', {
      description: `${order.id} · ${item.name} × ${order.items[0].quantity} from ${supplier.name}`,
    });
  };

  const advanceDelivery = (id: string) => {
    setDeliveries((prev) =>
      prev.map((delivery) => {
        if (delivery.id !== id) return delivery;
        const index = DELIVERY_STEPS.indexOf(delivery.status);
        const next = DELIVERY_STEPS[Math.min(index + 1, DELIVERY_STEPS.length - 1)];
        return next === delivery.status ? delivery : { ...delivery, status: next };
      }),
    );
    toast.success('Delivery status updated', { description: 'The patient is notified by SMS at every step.' });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Procurement &amp; delivery
        </h2>
        <p className="text-sm text-muted-foreground">
          Reorder from low stock, supplier catalogue, central pricing and last-mile prescription delivery
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Open purchase orders', value: openOrders, tone: 'text-foreground' },
          { label: 'In transit', value: inTransit, tone: 'text-warning' },
          { label: 'Awaiting central price', value: pendingPricing, tone: 'text-info' },
          { label: 'Active deliveries', value: activeDeliveries, tone: 'text-primary' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <p className={cn('text-xl font-bold leading-tight', stat.tone)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Purchase orders
          </TabsTrigger>
          <TabsTrigger value="reorder" className="gap-2">
            <PackagePlus className="h-4 w-4" /> Reorder
            {lowStock.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">
                {lowStock.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Building2 className="h-4 w-4" /> Suppliers
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="gap-2">
            <Truck className="h-4 w-4" /> Deliveries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4 space-y-2">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {order.id}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {order.supplierName}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {order.items.map((item) => `${item.medicationName} × ${item.quantity}`).join(', ')}
                      {' · '}
                      {naira.format(order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Created {format(new Date(order.createdAt), 'dd MMM')} · expected{' '}
                      {format(new Date(order.expectedAt), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {order.centralPriceApplied ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <BadgeCheck className="h-3 w-3" /> central price
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">price pending</Badge>
                    )}
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', PO_STATUS_STYLE[order.status])}>
                      {order.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                {canManage && order.status !== 'received' && (
                  <div className="border-t border-border pt-2">
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => advanceOrder(order)}>
                      {order.status === 'draft' && (<><Send className="mr-1 h-3 w-3" /> Submit order</>)}
                      {order.status === 'submitted' && (<><Truck className="mr-1 h-3 w-3" /> Mark in transit</>)}
                      {order.status === 'in-transit' && (<><CheckCircle2 className="mr-1 h-3 w-3" /> Receive goods</>)}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reorder" className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Items at or below reorder level. Orders use the central negotiated price.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Supplier</span>
              <Select value={reorderSupplier} onValueChange={setReorderSupplier}>
                <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockSuppliers.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.name} · {entry.leadTimeDays}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">All stock levels are healthy.</p>
          ) : (
            lowStock.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.genericName} · stock {item.stockQuantity} / reorder {item.reorderLevel} ·{' '}
                    {naira.format(item.unitPrice)} per unit
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!canManage}
                  onClick={() => createReorder(item)}
                >
                  <PackagePlus className="mr-1 h-3 w-3" /> Create PO
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {mockSuppliers.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="space-y-1.5 pt-4">
                <p className="text-sm font-semibold">{entry.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {entry.categories.join(' · ')}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 text-warning" /> {entry.rating.toFixed(1)}
                  </span>
                  <span>Lead time {entry.leadTimeDays} days</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4 space-y-2">
          {deliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      {delivery.patientName}
                      <span className="ml-1.5 font-normal text-muted-foreground">· {delivery.prescriptionId}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{delivery.address}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {delivery.courier} · {delivery.trackingCode} · ETA{' '}
                      {format(new Date(delivery.eta), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', DELIVERY_STYLE[delivery.status])}>
                      {delivery.status.replace('-', ' ')}
                    </span>
                    {canManage && delivery.status !== 'delivered' && (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => advanceDelivery(delivery.id)}>
                        Advance
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {DELIVERY_STEPS.map((step, index) => {
                    const reached = index <= DELIVERY_STEPS.indexOf(delivery.status);
                    return (
                      <div key={step} className="flex-1">
                        <div className={cn('h-1.5 rounded-full', reached ? 'bg-primary' : 'bg-muted')} />
                        <p className={cn('mt-1 text-[10px] capitalize', reached ? 'text-foreground' : 'text-muted-foreground')}>
                          {step.replace('-', ' ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-4 w-4 text-primary" /> Central pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Supplier prices are validated against the central formulary price list before an order can be submitted.
            Orders marked <span className="font-medium text-foreground">price pending</span> need a central price
            before submission.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
