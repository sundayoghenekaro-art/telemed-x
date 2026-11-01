import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Banknote, ShieldCheck, BarChart3, ReceiptText, HeartHandshake, Layers } from 'lucide-react';
import { InvoiceManagement } from './InvoiceManagement';
import { PaymentTracking } from './PaymentTracking';
import { InsuranceClaims } from './InsuranceClaims';
import { RevenueDashboard } from './RevenueDashboard';
import { InsuranceSettlementPanel } from './InsuranceSettlementPanel';
import { EntitlementPanel } from './EntitlementPanel';
import { CaseMixPanel } from './CaseMixPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mockInvoices, mockPayments, mockInsuranceClaims, type Invoice, type Payment } from '@/data/billingMockData';

export function BillingPage({
  canManage = false,
  canCheckInsurance = false,
  canSettleInsurance = false,
  canRecordPayment = false,
}: {
  canManage?: boolean;
  canCheckInsurance?: boolean;
  canSettleInsurance?: boolean;
  canRecordPayment?: boolean;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [payments, setPayments] = useState<Payment[]>(mockPayments);

  const handleAddInvoice = async (invoice: Invoice) => {
    // Optimistic local update
    setInvoices(prev => [invoice, ...prev]);

    // Persist invoice to database
    try {
      const { data: dbInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoice.invoice_number,
          patient_id: invoice.patient_id,
          patient_name: invoice.patient_name,
          department: invoice.department,
          status: invoice.status,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          discount: invoice.discount,
          total: invoice.total,
          amount_paid: invoice.amount_paid,
          balance_due: invoice.balance_due,
          notes: invoice.notes ?? null,
        })
        .select('id')
        .single();

      if (invoiceError) {
        console.warn('Invoice DB insert failed:', invoiceError.message);
        return;
      }

      // Update local state with DB-generated ID so payments can reference it
      const dbId = dbInvoice.id;
      setInvoices(prev => prev.map(inv =>
        inv.id === invoice.id ? { ...inv, id: dbId } : inv
      ));

      // Persist line items
      if (invoice.items.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(
          invoice.items.map(item => ({
            invoice_id: dbId,
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          }))
        );

        if (itemsError) {
          console.warn('Invoice items DB insert failed:', itemsError.message);
        }
      }
    } catch (err) {
      console.warn('Invoice DB persistence failed:', err);
    }
  };

  const handleRecordPayment = async (payment: Payment, invoiceId: string) => {
    // Optimistic local update
    const targetInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!targetInvoice) return;

    const newPaid = targetInvoice.amount_paid + payment.amount;
    const newBalance = Math.max(0, targetInvoice.total - newPaid);
    const newStatus: Invoice['status'] = newBalance <= 0 ? 'paid' : 'partial';

    setPayments(prev => [payment, ...prev]);
    setInvoices(prev => prev.map(inv =>
      inv.id === invoiceId
        ? { ...inv, amount_paid: newPaid, balance_due: newBalance, status: newStatus }
        : inv
    ));

    // Persist to database
    try {
      const { error: paymentError } = await supabase.from('payments').insert({
        invoice_id: invoiceId,
        amount: payment.amount,
        method: payment.method,
        reference_number: payment.reference_number ?? null,
        received_by: payment.received_by ?? null,
        notes: payment.notes ?? null,
        payment_date: payment.payment_date,
      });

      if (paymentError) {
        console.warn('Payment DB insert failed (may be using mock data):', paymentError.message);
        return;
      }

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newPaid,
          balance_due: newBalance,
          status: newStatus,
        })
        .eq('id', invoiceId);

      if (invoiceError) {
        console.warn('Invoice DB update failed:', invoiceError.message);
      }
    } catch (err) {
      console.warn('DB persistence skipped:', err);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Revenue</h1>
        <p className="text-muted-foreground">Invoice management, payments, insurance claims, and revenue analytics</p>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="invoices" className="gap-2"><FileText className="h-4 w-4 hidden sm:block" />Invoices</TabsTrigger>
          <TabsTrigger value="payments" className="gap-2"><Banknote className="h-4 w-4 hidden sm:block" />Payments</TabsTrigger>
          <TabsTrigger value="claims" className="gap-2"><ShieldCheck className="h-4 w-4 hidden sm:block" />Insurance</TabsTrigger>
          <TabsTrigger value="settlement" className="gap-2"><ReceiptText className="h-4 w-4 hidden sm:block" />Settlement</TabsTrigger>
          <TabsTrigger value="entitlement" className="gap-2"><HeartHandshake className="h-4 w-4 hidden sm:block" />Entitlement</TabsTrigger>
          <TabsTrigger value="case-mix" className="gap-2"><Layers className="h-4 w-4 hidden sm:block" />Case-mix</TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4 hidden sm:block" />Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoiceManagement invoices={invoices} canManage={canManage} onAddInvoice={handleAddInvoice} onRecordPayment={handleRecordPayment} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentTracking payments={payments} />
        </TabsContent>
        <TabsContent value="claims">
          <InsuranceClaims claims={mockInsuranceClaims} />
        </TabsContent>
        <TabsContent value="settlement">
          <InsuranceSettlementPanel
            invoices={invoices}
            canCheckInsurance={canCheckInsurance}
            canSettleInsurance={canSettleInsurance}
            canRecordPayment={canRecordPayment}
            onRecordPayment={handleRecordPayment}
          />
        </TabsContent>
        <TabsContent value="entitlement">
          <EntitlementPanel
            canCheckInsurance={canCheckInsurance}
            canSettleInsurance={canSettleInsurance}
          />
        </TabsContent>
        <TabsContent value="case-mix">
          <CaseMixPanel canManage={canManage} canSettleInsurance={canSettleInsurance} />
        </TabsContent>
        <TabsContent value="dashboard">
          <RevenueDashboard invoices={invoices} payments={payments} claims={mockInsuranceClaims} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
