 import { useState } from 'react';
 import { format, parseISO, formatDistanceToNow } from 'date-fns';
 import { LabOrder, LabTest } from '@/types/dhos';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import { 
   Clock, 
   User, 
   TestTube2, 
   MoreVertical, 
   Play, 
   CheckCircle,
   AlertTriangle,
   Zap
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface OrdersQueueProps {
   orders: LabOrder[];
   testCatalog: LabTest[];
   patientNames: Record<string, string>;
   onUpdateStatus: (orderId: string, status: LabOrder['status']) => void;
 }
 
 export function OrdersQueue({ 
   orders, 
   testCatalog,
   patientNames,
   onUpdateStatus 
 }: OrdersQueueProps) {
   const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress'>('all');
 
   const filteredOrders = orders
     .filter(order => {
       if (filter === 'all') return order.status !== 'completed' && order.status !== 'cancelled';
       return order.status === filter;
     })
     .sort((a, b) => {
       // Sort by priority first (stat > urgent > routine)
       const priorityOrder = { stat: 0, urgent: 1, routine: 2 };
       if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
         return priorityOrder[a.priority] - priorityOrder[b.priority];
       }
       // Then by order time
       return new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime();
     });
 
   const getPriorityBadge = (priority: LabOrder['priority']) => {
     const styles = {
       stat: 'bg-destructive text-destructive-foreground',
       urgent: 'bg-warning text-warning-foreground',
       routine: 'bg-muted text-muted-foreground',
     };
     const icons = {
       stat: <Zap className="h-3 w-3" />,
       urgent: <AlertTriangle className="h-3 w-3" />,
       routine: null,
     };
     return (
       <Badge className={cn("gap-1 uppercase text-xs", styles[priority])}>
         {icons[priority]}
         {priority}
       </Badge>
     );
   };
 
   const getStatusBadge = (status: LabOrder['status']) => {
     const styles = {
       pending: 'bg-muted text-muted-foreground',
       'in-progress': 'bg-info/10 text-info border-info/20',
       completed: 'bg-success/10 text-success border-success/20',
       cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
     };
     return (
       <Badge variant="outline" className={cn("capitalize", styles[status])}>
         {status.replace('-', ' ')}
       </Badge>
     );
   };
 
   const getTestNames = (testCodes: string[]) => {
     return testCodes.map(code => {
       const test = testCatalog.find(t => t.code === code);
       return test?.name || code;
     });
   };
 
   return (
     <Card className="h-full">
       <CardHeader className="pb-3">
         <div className="flex items-center justify-between">
           <CardTitle className="text-lg flex items-center gap-2">
             <TestTube2 className="h-5 w-5 text-primary" />
             Orders Queue
           </CardTitle>
           <div className="flex gap-1">
             {(['all', 'pending', 'in-progress'] as const).map((f) => (
               <Button
                 key={f}
                 variant={filter === f ? 'secondary' : 'ghost'}
                 size="sm"
                 onClick={() => setFilter(f)}
                 className="text-xs h-7"
               >
                 {f === 'all' ? 'Active' : f.replace('-', ' ')}
               </Button>
             ))}
           </div>
         </div>
       </CardHeader>
       <CardContent>
         <ScrollArea className="h-[500px]">
           <div className="space-y-3">
             {filteredOrders.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 <TestTube2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                 <p>No orders in queue</p>
               </div>
             ) : (
               filteredOrders.map((order) => (
                 <div
                   key={order.id}
                   className={cn(
                     "border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors",
                     order.priority === 'stat' && "border-l-4 border-l-destructive",
                     order.priority === 'urgent' && "border-l-4 border-l-warning"
                   )}
                 >
                   <div className="flex items-start justify-between gap-3">
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-medium truncate">
                           {patientNames[order.patientUpid] || order.patientUpid}
                         </span>
                         {getPriorityBadge(order.priority)}
                         {getStatusBadge(order.status)}
                       </div>
                       
                       <div className="flex flex-wrap gap-1 mb-2">
                         {getTestNames(order.tests).map((name, i) => (
                           <Badge key={i} variant="outline" className="text-xs font-normal">
                             {name}
                           </Badge>
                         ))}
                       </div>
 
                       <div className="flex items-center gap-3 text-xs text-muted-foreground">
                         <span className="flex items-center gap-1">
                           <User className="h-3 w-3" />
                           {order.orderedBy}
                         </span>
                         <span className="flex items-center gap-1">
                           <Clock className="h-3 w-3" />
                           {formatDistanceToNow(parseISO(order.orderedAt), { addSuffix: true })}
                         </span>
                       </div>
                     </div>
 
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                           <MoreVertical className="h-4 w-4" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         {order.status === 'pending' && (
                           <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'in-progress')}>
                             <Play className="h-4 w-4 mr-2" />
                             Start Processing
                           </DropdownMenuItem>
                         )}
                         {order.status === 'in-progress' && (
                           <DropdownMenuItem onClick={() => onUpdateStatus(order.id, 'completed')}>
                             <CheckCircle className="h-4 w-4 mr-2" />
                             Mark Complete
                           </DropdownMenuItem>
                         )}
                       </DropdownMenuContent>
                     </DropdownMenu>
                   </div>
                 </div>
               ))
             )}
           </div>
         </ScrollArea>
       </CardContent>
     </Card>
   );
 }