import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDrugLabel } from '@/hooks/useOpenFda';
import { AdverseEventsPanel } from './AdverseEventsPanel';
import { FileText, AlertTriangle, BarChart3 } from 'lucide-react';

interface DrugInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drugName: string;
  genericName: string;
}

function LabelSection({ title, content }: { title: string; content?: string[] }) {
  if (!content || content.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-primary">{title}</h4>
      <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
        {content[0].slice(0, 1500)}
        {content[0].length > 1500 && '…'}
      </div>
    </div>
  );
}

export function DrugInfoDialog({ open, onOpenChange, drugName, genericName }: DrugInfoDialogProps) {
  const [tab, setTab] = useState('label');
  const { data: label, isLoading, isError } = useDrugLabel(genericName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            FDA Drug Information
          </DialogTitle>
          <DialogDescription>
            {drugName} ({genericName}) — openFDA Label Data
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="label" className="gap-1.5 flex-1">
              <FileText className="h-3.5 w-3.5" />Drug Label
            </TabsTrigger>
            <TabsTrigger value="adverse" className="gap-1.5 flex-1">
              <BarChart3 className="h-3.5 w-3.5" />Adverse Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="label">
            <ScrollArea className="h-[50vh] pr-4">
              {isLoading ? (
                <div className="space-y-4 py-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ))}
                </div>
              ) : isError || !label ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No FDA label data found</p>
                  <p className="text-xs mt-1">This medication may not be in the US FDA database.</p>
                </div>
              ) : (
                <div className="space-y-5 py-2">
                  {label.openfda?.brand_name && (
                    <div className="flex flex-wrap gap-1">
                      {label.openfda.brand_name.slice(0, 5).map(b => (
                        <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                      ))}
                      {label.openfda.manufacturer_name?.[0] && (
                        <Badge variant="secondary" className="text-xs">{label.openfda.manufacturer_name[0]}</Badge>
                      )}
                    </div>
                  )}
                  <LabelSection title="Indications & Usage" content={label.indications_and_usage} />
                  <LabelSection title="Dosage & Administration" content={label.dosage_and_administration} />
                  <LabelSection title="Contraindications" content={label.contraindications} />
                  <LabelSection title="Warnings & Precautions" content={label.warnings_and_cautions ?? label.warnings} />
                  <LabelSection title="Adverse Reactions" content={label.adverse_reactions} />
                  <LabelSection title="Drug Interactions" content={label.drug_interactions} />
                  <LabelSection title="Description" content={label.description} />
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="adverse">
            <ScrollArea className="h-[50vh] pr-4 py-2">
              <AdverseEventsPanel genericName={genericName} />
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center">
          Data from openFDA (api.fda.gov). For informational use only — not a substitute for clinical judgment.
        </p>
      </DialogContent>
    </Dialog>
  );
}
