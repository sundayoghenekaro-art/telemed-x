 import { useState } from 'react';
 import { format } from 'date-fns';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Badge } from '@/components/ui/badge';
 import { Checkbox } from '@/components/ui/checkbox';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { TestTube2, User, Clock, AlertTriangle, Zap } from 'lucide-react';
 import { Patient, LabOrder, LabTest } from '@/types/dhos';
 import { useToast } from '@/hooks/use-toast';
 import { cn } from '@/lib/utils';
 
 interface NewLabOrderDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   patients: Patient[];
   testCatalog: LabTest[];
   onCreateOrder: (order: Omit<LabOrder, 'id' | 'orderedAt'>) => void;
 }
 
 export function NewLabOrderDialog({
   open,
   onOpenChange,
   patients,
   testCatalog,
   onCreateOrder
 }: NewLabOrderDialogProps) {
   const { toast } = useToast();
   const [selectedPatient, setSelectedPatient] = useState('');
   const [selectedTests, setSelectedTests] = useState<string[]>([]);
   const [priority, setPriority] = useState<LabOrder['priority']>('routine');
   const [notes, setNotes] = useState('');
 
   const groupedTests = testCatalog.reduce((acc, test) => {
     if (!acc[test.category]) {
       acc[test.category] = [];
     }
     acc[test.category].push(test);
     return acc;
   }, {} as Record<string, LabTest[]>);
 
   const toggleTest = (code: string) => {
     setSelectedTests(prev => 
       prev.includes(code) 
         ? prev.filter(c => c !== code)
         : [...prev, code]
     );
   };
 
   const getTotalPrice = () => {
     return selectedTests.reduce((sum, code) => {
       const test = testCatalog.find(t => t.code === code);
       return sum + (test?.price || 0);
     }, 0);
   };
 
   const getMaxTurnaround = () => {
     return Math.max(
       ...selectedTests.map(code => {
         const test = testCatalog.find(t => t.code === code);
         return test?.turnaroundTime || 0;
       }),
       0
     );
   };
 
   const handleSubmit = () => {
     if (!selectedPatient) {
       toast({
         title: "No patient selected",
         description: "Please select a patient for the lab order",
         variant: "destructive"
       });
       return;
     }
 
     if (selectedTests.length === 0) {
       toast({
         title: "No tests selected",
         description: "Please select at least one test",
         variant: "destructive"
       });
       return;
     }
 
     const order: Omit<LabOrder, 'id' | 'orderedAt'> = {
       patientUpid: selectedPatient,
       orderedBy: 'Dr. Sarah Chen', // Would come from auth context
       tests: selectedTests,
       status: 'pending',
       priority,
     };
 
     onCreateOrder(order);
 
     const patient = patients.find(p => p.upid === selectedPatient);
     toast({
       title: "Lab Order Created",
       description: `${selectedTests.length} test(s) ordered for ${patient?.firstName} ${patient?.lastName}`,
     });
 
     // Reset form
     setSelectedPatient('');
     setSelectedTests([]);
     setPriority('routine');
     setNotes('');
     onOpenChange(false);
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <TestTube2 className="h-5 w-5 text-primary" />
             New Lab Order
           </DialogTitle>
           <DialogDescription>
             Order laboratory tests for a patient
           </DialogDescription>
         </DialogHeader>
 
         <div className="grid gap-4 py-4">
           {/* Patient Selection */}
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label className="flex items-center gap-2">
                 <User className="h-4 w-4" />
                 Patient
               </Label>
               <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select patient" />
                 </SelectTrigger>
                 <SelectContent>
                   {patients.map(patient => (
                     <SelectItem key={patient.upid} value={patient.upid}>
                       {patient.firstName} {patient.lastName}
                       <span className="text-muted-foreground ml-2 text-xs font-mono">
                         {patient.upid.slice(-8)}
                       </span>
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div className="space-y-2">
               <Label className="flex items-center gap-2">
                 <Clock className="h-4 w-4" />
                 Priority
               </Label>
               <Select value={priority} onValueChange={(v: LabOrder['priority']) => setPriority(v)}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="routine">Routine</SelectItem>
                   <SelectItem value="urgent">
                     <span className="flex items-center gap-2">
                       <AlertTriangle className="h-3 w-3 text-warning" />
                       Urgent
                     </span>
                   </SelectItem>
                   <SelectItem value="stat">
                     <span className="flex items-center gap-2">
                       <Zap className="h-3 w-3 text-destructive" />
                       STAT
                     </span>
                   </SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
 
           {/* Test Selection */}
           <div className="space-y-2">
             <Label>Select Tests</Label>
             <ScrollArea className="h-[280px] border border-border rounded-lg p-3">
               <div className="space-y-4">
                 {Object.entries(groupedTests).map(([category, tests]) => (
                   <div key={category}>
                     <h4 className="text-sm font-medium text-muted-foreground mb-2">
                       {category}
                     </h4>
                     <div className="grid grid-cols-2 gap-2">
                       {tests.map(test => (
                         <div
                           key={test.code}
                           className={cn(
                             "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                             selectedTests.includes(test.code)
                               ? "border-primary bg-primary/5"
                               : "border-border hover:bg-muted/50"
                           )}
                           onClick={() => toggleTest(test.code)}
                         >
                           <Checkbox 
                             checked={selectedTests.includes(test.code)}
                             onCheckedChange={() => toggleTest(test.code)}
                           />
                           <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium truncate">{test.name}</p>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <span>{test.code}</span>
                               <span>•</span>
                               <span>{test.turnaroundTime}h TAT</span>
                             </div>
                           </div>
                           <span className="text-xs font-mono text-muted-foreground">
                             ${test.price}
                           </span>
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             </ScrollArea>
           </div>
 
           {/* Order Summary */}
           {selectedTests.length > 0 && (
             <div className="bg-muted/50 rounded-lg p-3">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-muted-foreground">
                   {selectedTests.length} test(s) selected
                 </span>
                 <div className="flex items-center gap-4">
                   <span className="text-muted-foreground">
                     Max TAT: <strong>{getMaxTurnaround()}h</strong>
                   </span>
                   <span className="font-medium">
                     Total: ${getTotalPrice()}
                   </span>
                 </div>
               </div>
               <div className="flex flex-wrap gap-1 mt-2">
                 {selectedTests.map(code => {
                   const test = testCatalog.find(t => t.code === code);
                   return (
                     <Badge 
                       key={code} 
                       variant="secondary" 
                       className="cursor-pointer"
                       onClick={() => toggleTest(code)}
                     >
                       {test?.name || code} ×
                     </Badge>
                   );
                 })}
               </div>
             </div>
           )}
 
           {/* Notes */}
           <div className="space-y-2">
             <Label>Clinical Notes (optional)</Label>
             <Textarea
               placeholder="Add any relevant clinical information..."
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="h-16 resize-none"
             />
           </div>
         </div>
 
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Cancel
           </Button>
           <Button onClick={handleSubmit} disabled={!selectedPatient || selectedTests.length === 0}>
             Create Order
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }