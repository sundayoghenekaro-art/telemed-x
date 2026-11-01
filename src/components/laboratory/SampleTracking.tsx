 import { useState } from 'react';
 import { format, parseISO, formatDistanceToNow } from 'date-fns';
 import { LabSample, SampleStatus } from '@/types/dhos';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Input } from '@/components/ui/input';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import { 
   Search,
   Barcode,
   MapPin,
   Clock,
   Thermometer,
   MoreVertical,
   ArrowRight,
   CheckCircle2,
   Package,
   Truck,
   FlaskConical,
   Microscope,
   FileCheck,
   Send
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface SampleTrackingProps {
   samples: LabSample[];
   onUpdateStatus: (sampleId: string, status: SampleStatus) => void;
 }
 
 const statusFlow: SampleStatus[] = [
   'collected',
   'in-transit',
   'received',
   'processing',
   'analyzed',
   'validated',
   'reported'
 ];
 
 const statusConfig: Record<SampleStatus, { icon: React.ReactNode; color: string; label: string }> = {
   collected: { icon: <Package className="h-4 w-4" />, color: 'bg-muted text-muted-foreground', label: 'Collected' },
   'in-transit': { icon: <Truck className="h-4 w-4" />, color: 'bg-warning/10 text-warning', label: 'In Transit' },
   received: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-info/10 text-info', label: 'Received' },
   processing: { icon: <FlaskConical className="h-4 w-4" />, color: 'bg-primary/10 text-primary', label: 'Processing' },
   analyzed: { icon: <Microscope className="h-4 w-4" />, color: 'bg-purple-500/10 text-purple-600', label: 'Analyzed' },
   validated: { icon: <FileCheck className="h-4 w-4" />, color: 'bg-success/10 text-success', label: 'Validated' },
   reported: { icon: <Send className="h-4 w-4" />, color: 'bg-success text-success-foreground', label: 'Reported' },
 };
 
 const sampleTypeIcons: Record<LabSample['sampleType'], string> = {
   blood: '🩸',
   urine: '🧪',
   stool: '💩',
   swab: '🧬',
   tissue: '🔬',
   csf: '💧',
   other: '📦',
 };
 
 export function SampleTracking({ samples, onUpdateStatus }: SampleTrackingProps) {
   const [searchQuery, setSearchQuery] = useState('');
 
   const filteredSamples = samples.filter(sample => {
     const query = searchQuery.toLowerCase();
     return (
       sample.barcode.toLowerCase().includes(query) ||
       sample.patientName.toLowerCase().includes(query) ||
       sample.id.toLowerCase().includes(query)
     );
   }).sort((a, b) => {
     // Sort by status (earlier in flow first), then by collection time
     const statusOrder = statusFlow.indexOf(a.status) - statusFlow.indexOf(b.status);
     if (statusOrder !== 0) return statusOrder;
     return new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime();
   });
 
   const getNextStatus = (current: SampleStatus): SampleStatus | null => {
     const currentIndex = statusFlow.indexOf(current);
     if (currentIndex < statusFlow.length - 1) {
       return statusFlow[currentIndex + 1];
     }
     return null;
   };
 
   const getStatusProgress = (status: SampleStatus) => {
     const index = statusFlow.indexOf(status);
     return ((index + 1) / statusFlow.length) * 100;
   };
 
   return (
     <Card className="h-full">
       <CardHeader className="pb-3">
         <div className="flex items-center justify-between gap-4">
           <CardTitle className="text-lg flex items-center gap-2">
             <Barcode className="h-5 w-5 text-primary" />
             Sample Tracking
           </CardTitle>
           <div className="relative flex-1 max-w-xs">
             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Search barcode or patient..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-9 h-9"
             />
           </div>
         </div>
       </CardHeader>
       <CardContent>
         <ScrollArea className="h-[500px]">
           <div className="space-y-3">
             {filteredSamples.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 <Barcode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                 <p>No samples found</p>
               </div>
             ) : (
               filteredSamples.map((sample) => {
                 const config = statusConfig[sample.status];
                 const nextStatus = getNextStatus(sample.status);
                 
                 return (
                   <div
                     key={sample.id}
                     className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                   >
                     {/* Progress bar */}
                     <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
                       <div 
                         className="h-full bg-primary transition-all duration-500"
                         style={{ width: `${getStatusProgress(sample.status)}%` }}
                       />
                     </div>
 
                     <div className="flex items-start justify-between gap-3">
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-lg">{sampleTypeIcons[sample.sampleType]}</span>
                           <span className="font-medium">{sample.patientName}</span>
                           <Badge className={cn("gap-1", config.color)}>
                             {config.icon}
                             {config.label}
                           </Badge>
                         </div>
 
                         <div className="flex items-center gap-2 mb-2">
                           <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                             {sample.barcode}
                           </code>
                           <Badge variant="outline" className="text-xs capitalize">
                             {sample.sampleType}
                           </Badge>
                         </div>
 
                         <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                           <span className="flex items-center gap-1">
                             <MapPin className="h-3 w-3" />
                             {sample.location}
                           </span>
                           <span className="flex items-center gap-1">
                             <Clock className="h-3 w-3" />
                             {formatDistanceToNow(parseISO(sample.collectedAt), { addSuffix: true })}
                           </span>
                           {sample.temperature !== undefined && (
                             <span className="flex items-center gap-1">
                               <Thermometer className="h-3 w-3" />
                               {sample.temperature}°C
                             </span>
                           )}
                         </div>
 
                         {sample.notes && (
                           <p className="text-xs text-muted-foreground mt-2 italic">
                             {sample.notes}
                           </p>
                         )}
                       </div>
 
                       {nextStatus && (
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                               <MoreVertical className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => onUpdateStatus(sample.id, nextStatus)}>
                               <ArrowRight className="h-4 w-4 mr-2" />
                               Move to {statusConfig[nextStatus].label}
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       )}
                     </div>
                   </div>
                 );
               })
             )}
           </div>
         </ScrollArea>
       </CardContent>
     </Card>
   );
 }