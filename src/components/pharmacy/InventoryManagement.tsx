import { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { DrugInfoDialog } from './DrugInfoDialog';
import { PharmacyInventoryItem } from '@/types/dhos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  AlertTriangle,
  Search,
  Snowflake,
  Shield,
  TrendingDown,
  ArrowUpDown,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryManagementProps {
  inventory: PharmacyInventoryItem[];
}

export function InventoryManagement({ inventory }: InventoryManagementProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'expiry'>('name');
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'expiring' | 'controlled'>('all');
  const [fdaDrug, setFdaDrug] = useState<{ name: string; generic: string } | null>(null);

  const stats = useMemo(() => {
    const lowStock = inventory.filter(i => i.stockQuantity <= i.reorderLevel).length;
    const expiringSoon = inventory.filter(i => {
      const daysToExpiry = differenceInDays(parseISO(i.expiryDate), new Date());
      return daysToExpiry <= 90 && daysToExpiry > 0;
    }).length;
    const expired = inventory.filter(i => isPast(parseISO(i.expiryDate))).length;
    const totalValue = inventory.reduce((s, i) => s + i.stockQuantity * i.unitPrice, 0);
    const controlled = inventory.filter(i => i.controlled).length;
    return { lowStock, expiringSoon, expired, totalValue, controlled };
  }, [inventory]);

  const filtered = useMemo(() => {
    let list = [...inventory];
    if (filter === 'low-stock') list = list.filter(i => i.stockQuantity <= i.reorderLevel);
    else if (filter === 'expiring') list = list.filter(i => {
      const days = differenceInDays(parseISO(i.expiryDate), new Date());
      return days <= 90;
    });
    else if (filter === 'controlled') list = list.filter(i => i.controlled);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.genericName.toLowerCase().includes(q) || i.batchNumber.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === 'stock') return a.stockQuantity - b.stockQuantity;
      if (sortBy === 'expiry') return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [inventory, filter, search, sortBy]);

  const getStockStatus = (item: PharmacyInventoryItem) => {
    const ratio = item.stockQuantity / item.reorderLevel;
    if (item.stockQuantity === 0) return { label: 'Out of Stock', color: 'text-destructive', bgColor: 'bg-destructive' };
    if (ratio <= 1) return { label: 'Low Stock', color: 'text-warning', bgColor: 'bg-warning' };
    return { label: 'In Stock', color: 'text-success', bgColor: 'bg-success' };
  };

  const getExpiryStatus = (item: PharmacyInventoryItem) => {
    const days = differenceInDays(parseISO(item.expiryDate), new Date());
    if (days <= 0) return { label: 'Expired', color: 'bg-destructive text-destructive-foreground' };
    if (days <= 30) return { label: `${days}d`, color: 'bg-destructive/10 text-destructive' };
    if (days <= 90) return { label: `${days}d`, color: 'bg-warning/10 text-warning' };
    return { label: format(parseISO(item.expiryDate), 'MMM yyyy'), color: 'bg-muted text-muted-foreground' };
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{inventory.length}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowStock > 0 ? 'border-warning/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><TrendingDown className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.lowStock}</p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.expiringSoon > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon + stats.expired}</p>
                <p className="text-xs text-muted-foreground">Expiring</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10"><Shield className="h-5 w-5 text-info" /></div>
              <div>
                <p className="text-2xl font-bold">{stats.controlled}</p>
                <p className="text-xs text-muted-foreground">Controlled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><Package className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Inventory
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input placeholder="Search medications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-52 h-9" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {(['all', 'low-stock', 'expiring', 'controlled'] as const).map(f => (
              <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} className="text-xs capitalize">
                {f.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => setSortBy('name')}>
                    <div className="flex items-center gap-1">Medication <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortBy('stock')}>
                    <div className="flex items-center gap-1">Stock <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSortBy('expiry')}>
                    <div className="flex items-center gap-1">Expiry <ArrowUpDown className="h-3 w-3" /></div>
                  </TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center w-16">FDA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => {
                  const stock = getStockStatus(item);
                  const expiry = getExpiryStatus(item);
                  const stockPct = Math.min((item.stockQuantity / (item.reorderLevel * 3)) * 100, 100);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.genericName} · {item.batchNumber}</p>
                          </div>
                          {item.controlled && <Shield className="h-3.5 w-3.5 text-destructive" />}
                          {item.requiresColdChain && <Snowflake className="h-3.5 w-3.5 text-info" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 w-24">
                          <div className="flex items-center justify-between text-xs">
                            <span className={cn('font-medium', stock.color)}>{item.stockQuantity}</span>
                            <span className="text-muted-foreground">/ {item.reorderLevel * 3}</span>
                          </div>
                          <Progress value={stockPct} className={cn("h-1.5", item.stockQuantity <= item.reorderLevel && "[&>div]:bg-warning")} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', expiry.color)}>{expiry.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.location}</TableCell>
                      <TableCell className="text-right font-mono text-sm">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon-sm" onClick={() => setFdaDrug({ name: item.name, generic: item.genericName })} title="FDA Info">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {fdaDrug && (
        <DrugInfoDialog
          open={!!fdaDrug}
          onOpenChange={(open) => !open && setFdaDrug(null)}
          drugName={fdaDrug.name}
          genericName={fdaDrug.generic}
        />
      )}
    </div>
  );
}
