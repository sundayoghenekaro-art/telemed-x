import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Invoice, InvoiceItem } from '@/data/billingMockData';

interface NewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (invoice: Invoice) => void;
}

const TAX_RATE = 0.075; // 7.5% VAT

const categories = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'lab', label: 'Laboratory' },
  { value: 'radiology', label: 'Radiology' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'room', label: 'Room & Board' },
  { value: 'service', label: 'Service' },
];

const departments = ['Clinical', 'Radiology', 'Laboratory', 'Pharmacy', 'In-Patient', 'Emergency'];

interface LineItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unit_price: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function NewInvoiceDialog({ open, onOpenChange, onSave }: NewInvoiceDialogProps) {
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [department, setDepartment] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', category: 'consultation', quantity: 1, unit_price: 0 },
  ]);

  const resetForm = useCallback(() => {
    setPatientName('');
    setPatientId('');
    setDepartment('');
    setDiscount(0);
    setNotes('');
    setItems([{ id: crypto.randomUUID(), description: '', category: 'consultation', quantity: 1, unit_price: 0 }]);
  }, []);

  const addItem = () => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', category: 'service', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax - discount;
  const balanceDue = Math.max(0, total);

  const handleSubmit = () => {
    // Validation
    const trimmedName = patientName.trim();
    const trimmedId = patientId.trim();
    if (!trimmedName) { toast.error('Patient name is required'); return; }
    if (trimmedName.length > 100) { toast.error('Patient name must be under 100 characters'); return; }
    if (!trimmedId) { toast.error('Patient ID is required'); return; }
    if (!department) { toast.error('Department is required'); return; }

    const validItems = items.filter(i => i.description.trim() && i.unit_price > 0);
    if (validItems.length === 0) { toast.error('Add at least one line item with description and price'); return; }

    for (const item of validItems) {
      if (item.description.trim().length > 200) { toast.error('Item description must be under 200 characters'); return; }
      if (item.quantity < 1 || item.quantity > 9999) { toast.error('Quantity must be between 1 and 9999'); return; }
      if (item.unit_price < 0 || item.unit_price > 99999999) { toast.error('Price must be between 0 and 99,999,999'); return; }
    }

    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}-${String(Date.now()).slice(-4)}`;

    const invoiceItems: InvoiceItem[] = validItems.map(i => ({
      id: crypto.randomUUID(),
      invoice_id: '',
      description: i.description.trim(),
      category: i.category as InvoiceItem['category'],
      quantity: i.quantity,
      unit_price: i.unit_price,
      total: i.quantity * i.unit_price,
    }));

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      invoice_number: invoiceNumber,
      patient_id: trimmedId,
      patient_name: trimmedName,
      department,
      status: 'draft',
      issue_date: now.toISOString(),
      due_date: new Date(now.getTime() + 30 * 86400000).toISOString(),
      subtotal,
      tax,
      discount,
      total,
      amount_paid: 0,
      balance_due: balanceDue,
      notes: notes.trim() || undefined,
      items: invoiceItems,
    };

    onSave(invoice);
    resetForm();
    onOpenChange(false);
    toast.success(`Invoice ${invoiceNumber} created`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Patient Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Patient Name *</Label>
              <Input id="patient-name" placeholder="e.g. Amina Ibrahim" value={patientName} onChange={e => setPatientName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-id">Patient ID *</Label>
              <Input id="patient-id" placeholder="e.g. P-001" value={patientId} onChange={e => setPatientId(e.target.value)} maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            {items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                  <Input placeholder="Description" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} maxLength={200} />
                </div>
                <div className="col-span-3">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Category</Label>}
                  <Select value={item.category} onValueChange={v => updateItem(item.id, 'category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                  <Input type="number" min={1} max={9999} value={item.quantity} onChange={e => updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                </div>
                <div className="col-span-3">
                  {idx === 0 && <Label className="text-xs text-muted-foreground">Unit Price (₦)</Label>}
                  <Input type="number" min={0} step={100} value={item.unit_price} onChange={e => updateItem(item.id, 'unit_price', Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length <= 1} className="h-9 w-9">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Discount & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (₦)</Label>
              <Input id="discount" type="number" min={0} value={discount} onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} rows={2} />
            </div>
          </div>

          {/* Totals */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax (7.5%)</span><span>{formatCurrency(tax)}</span></div>
            {discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(discount)}</span></div>}
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button variant="medical" onClick={handleSubmit}>Create Invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
