 import { useState } from 'react';
 import { format, parseISO } from 'date-fns';
 import { LabSample, LabOrder, LabResult } from '@/types/dhos';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Textarea } from '@/components/ui/textarea';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { 
   FileCheck,
   CheckCircle2,
   XCircle,
   AlertTriangle,
   ArrowUp,
   ArrowDown,
   Minus,
   User,
   Clock
 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { useToast } from '@/hooks/use-toast';
 
 interface PendingValidation {
   sample: LabSample;
   order: LabOrder;
   results: LabResult[];
 }
 
 interface ResultsValidationProps {
   pendingResults: PendingValidation[];
   canValidate?: boolean;
   onValidate: (sampleId: string, approved: boolean, comments?: string) => void;
 }
 
 export function ResultsValidation({ pendingResults, canValidate = false, onValidate }: ResultsValidationProps) {
   const { toast } = useToast();
   const [selectedItem, setSelectedItem] = useState<PendingValidation | null>(null);
   const [comments, setComments] = useState('');
 
   const getFlagIcon = (flag?: LabResult['flag']) => {
     switch (flag) {
       case 'high':
         return <ArrowUp className="h-4 w-4 text-warning" />;
       case 'low':
         return <ArrowDown className="h-4 w-4 text-info" />;
       case 'critical':
         return <AlertTriangle className="h-4 w-4 text-destructive" />;
       default:
         return <Minus className="h-4 w-4 text-muted-foreground" />;
     }
   };
 
   const getFlagBadge = (flag?: LabResult['flag']) => {
     const styles = {
       normal: 'bg-success/10 text-success',
       high: 'bg-warning/10 text-warning',
       low: 'bg-info/10 text-info',
       critical: 'bg-destructive text-destructive-foreground',
     };
     return (
       <Badge className={cn("text-xs", styles[flag || 'normal'])}>
         {flag || 'normal'}
       </Badge>
     );
   };
 
   const handleApprove = () => {
     if (selectedItem) {
       onValidate(selectedItem.sample.id, true, comments);
       toast({
         title: "Results Validated",
         description: `Results for ${selectedItem.sample.patientName} have been approved.`,
       });
       setSelectedItem(null);
       setComments('');
     }
   };
 
   const handleReject = () => {
     if (selectedItem) {
       onValidate(selectedItem.sample.id, false, comments);
       toast({
         title: "Results Rejected",
         description: `Results for ${selectedItem.sample.patientName} have been rejected for re-analysis.`,
         variant: "destructive"
       });
       setSelectedItem(null);
       setComments('');
     }
   };
 
   const criticalCount = pendingResults.filter(p => 
     p.results.some(r => r.flag === 'critical')
   ).length;
 
   return (
     <>
       <Card className="h-full">
         <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
             <CardTitle className="text-lg flex items-center gap-2">
               <FileCheck className="h-5 w-5 text-primary" />
               Results Validation
             </CardTitle>
             {criticalCount > 0 && (
               <Badge variant="destructive" className="gap-1">
                 <AlertTriangle className="h-3 w-3" />
                 {criticalCount} Critical
               </Badge>
             )}
           </div>
         </CardHeader>
         <CardContent>
           <ScrollArea className="h-[500px]">
             {pendingResults.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                 <p>No results pending validation</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {pendingResults.map((item) => {
                   const hasCritical = item.results.some(r => r.flag === 'critical');
                   const hasAbnormal = item.results.some(r => r.flag === 'high' || r.flag === 'low');
                   
                   return (
                     <div
                       key={item.sample.id}
                       className={cn(
                         "border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors",
                         hasCritical && "border-l-4 border-l-destructive",
                         !hasCritical && hasAbnormal && "border-l-4 border-l-warning"
                       )}
                       onClick={() => setSelectedItem(item)}
                     >
                       <div className="flex items-start justify-between mb-3">
                         <div>
                           <h4 className="font-medium">{item.sample.patientName}</h4>
                           <p className="text-xs text-muted-foreground">
                             {item.order.tests.join(', ')}
                           </p>
                         </div>
                         <div className="flex gap-1">
                           {hasCritical && (
                             <Badge variant="destructive" className="text-xs">Critical</Badge>
                           )}
                           {hasAbnormal && !hasCritical && (
                             <Badge className="bg-warning/10 text-warning text-xs">Abnormal</Badge>
                           )}
                         </div>
                       </div>
 
                       {/* Results preview */}
                       <div className="grid grid-cols-2 gap-2">
                         {item.results.slice(0, 4).map((result, i) => (
                           <div key={i} className="flex items-center gap-2 text-sm">
                             {getFlagIcon(result.flag)}
                             <span className="truncate">{result.testName}</span>
                             <span className="font-mono text-xs ml-auto">
                               {result.value} {result.unit}
                             </span>
                           </div>
                         ))}
                       </div>
                       {item.results.length > 4 && (
                         <p className="text-xs text-muted-foreground mt-2">
                           +{item.results.length - 4} more results
                         </p>
                       )}
 
                       <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                         <span className="flex items-center gap-1">
                           <User className="h-3 w-3" />
                           {item.order.orderedBy}
                         </span>
                         <span className="flex items-center gap-1">
                           <Clock className="h-3 w-3" />
                           Analyzed {format(parseISO(item.sample.analyzedAt || item.sample.collectedAt), 'h:mm a')}
                         </span>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </ScrollArea>
         </CardContent>
       </Card>
 
       {/* Validation Dialog */}
       <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
         <DialogContent className="sm:max-w-[600px]">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <FileCheck className="h-5 w-5 text-primary" />
               Validate Results
             </DialogTitle>
             <DialogDescription>
               Review and validate lab results for {selectedItem?.sample.patientName}
             </DialogDescription>
           </DialogHeader>
 
           {selectedItem && (
             <div className="space-y-4">
               {/* Patient & Order Info */}
               <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                 <div>
                   <p className="text-muted-foreground text-xs">Patient</p>
                   <p className="font-medium">{selectedItem.sample.patientName}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground text-xs">Sample</p>
                   <p className="font-mono text-xs">{selectedItem.sample.barcode}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground text-xs">Ordered By</p>
                   <p>{selectedItem.order.orderedBy}</p>
                 </div>
                 <div>
                   <p className="text-muted-foreground text-xs">Priority</p>
                   <Badge variant="outline" className="capitalize mt-0.5">
                     {selectedItem.order.priority}
                   </Badge>
                 </div>
               </div>
 
               {/* Results Table */}
               <div className="border border-border rounded-lg overflow-hidden">
                 <div className="grid grid-cols-12 gap-2 p-2 bg-muted text-xs font-medium text-muted-foreground">
                   <div className="col-span-4">Test</div>
                   <div className="col-span-2 text-right">Result</div>
                   <div className="col-span-2 text-right">Unit</div>
                   <div className="col-span-3">Reference</div>
                   <div className="col-span-1">Flag</div>
                 </div>
                 <div className="divide-y divide-border">
                   {selectedItem.results.map((result, i) => (
                     <div 
                       key={i} 
                       className={cn(
                         "grid grid-cols-12 gap-2 p-2 text-sm",
                         result.flag === 'critical' && "bg-destructive/5",
                         result.flag === 'high' && "bg-warning/5",
                         result.flag === 'low' && "bg-info/5"
                       )}
                     >
                       <div className="col-span-4 font-medium">{result.testName}</div>
                       <div className="col-span-2 text-right font-mono">{result.value}</div>
                       <div className="col-span-2 text-right text-muted-foreground">{result.unit}</div>
                       <div className="col-span-3 text-muted-foreground">{result.referenceRange}</div>
                       <div className="col-span-1">{getFlagBadge(result.flag)}</div>
                     </div>
                   ))}
                 </div>
               </div>
 
               {/* Comments */}
               <div className="space-y-2">
                 <label className="text-sm font-medium">Validation Comments (optional)</label>
                 <Textarea
                   placeholder="Add any comments or notes about these results..."
                   value={comments}
                   onChange={(e) => setComments(e.target.value)}
                   className="h-20 resize-none"
                 />
               </div>
             </div>
           )}
 
           <DialogFooter className="gap-2">
             <Button variant="outline" onClick={() => setSelectedItem(null)}>
               Cancel
             </Button>
             {canValidate && (
               <>
                 <Button variant="destructive" onClick={handleReject} className="gap-2">
                   <XCircle className="h-4 w-4" />
                   Reject
                 </Button>
                 <Button onClick={handleApprove} className="gap-2">
                   <CheckCircle2 className="h-4 w-4" />
                   Approve & Release
                 </Button>
               </>
             )}
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </>
   );
 }