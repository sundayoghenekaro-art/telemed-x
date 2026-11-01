import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Loader2, CreditCard, Banknote, History, TrendingUp } from 'lucide-react';

const formatNaira = (amount: number) =>
  `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface WalletData {
  id: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  category: string;
  description: string | null;
  payment_method: string | null;
  status: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  top_up: { label: 'Top Up', color: 'text-emerald-600' },
  consultation: { label: 'Consultation', color: 'text-blue-600' },
  invoice: { label: 'Invoice Payment', color: 'text-orange-600' },
  referral: { label: 'Lab / Radiology', color: 'text-purple-600' },
  medication: { label: 'Medication', color: 'text-pink-600' },
  refund: { label: 'Refund', color: 'text-teal-600' },
};

export function PatientWallet({ patientUserId }: { patientUserId: string }) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchWallet = useCallback(async () => {
    const { data } = await supabase
      .from('patient_wallets')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .maybeSingle();

    if (data) {
      setWallet({ id: data.id, balance: Number(data.balance), currency: data.currency });
    } else {
      const { data: newWallet, error } = await supabase
        .from('patient_wallets')
        .insert({ patient_user_id: patientUserId, balance: 0, currency: 'NGN' })
        .select()
        .single();
      if (newWallet && !error) {
        setWallet({ id: newWallet.id, balance: 0, currency: newWallet.currency });
      }
    }
    setLoading(false);
  }, [patientUserId]);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('patient_user_id', patientUserId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setTransactions(data as Transaction[]);
  }, [patientUserId]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();

    const channel = supabase
      .channel(`wallet-${patientUserId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'patient_wallets',
        filter: `patient_user_id=eq.${patientUserId}`,
      }, () => fetchWallet())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'wallet_transactions',
        filter: `patient_user_id=eq.${patientUserId}`,
      }, () => { fetchWallet(); fetchTransactions(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [patientUserId, fetchWallet, fetchTransactions]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0 || amount > 10000000) {
      toast.error('Enter a valid amount between ₦1 and ₦10,000,000');
      return;
    }
    if (!wallet) return;

    setProcessing(true);
    try {
      const newBalance = wallet.balance + amount;

      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        patient_user_id: patientUserId,
        type: 'credit',
        amount,
        balance_after: newBalance,
        category: 'top_up',
        description: `Wallet top-up via manual deposit`,
        payment_method: 'manual',
        status: 'completed',
      });

      await supabase.from('patient_wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      toast.success(`${formatNaira(amount)} added to your wallet`);
      setTopUpOpen(false);
      setTopUpAmount('');
      fetchWallet();
      fetchTransactions();
    } catch {
      toast.error('Top-up failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCredits = transactions.filter(t => t.type === 'credit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0);
  const totalDebits = transactions.filter(t => t.type === 'debit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Wallet className="h-5 w-5" /> My Wallet
      </h2>

      {/* Balance Card */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-70">Available Balance</p>
              <p className="text-4xl font-bold mt-1">
                {formatNaira(wallet?.balance ?? 0)}
              </p>
              <p className="text-xs opacity-50 mt-1">{wallet?.currency || 'NGN'} — Nigerian Naira</p>
            </div>
            <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="gap-1">
                  <Plus className="h-4 w-4" /> Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Funds to Wallet</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[5000, 10000, 25000].map(amt => (
                      <Button key={amt} variant="outline" onClick={() => setTopUpAmount(String(amt))} className={topUpAmount === String(amt) ? 'border-primary' : ''}>
                        ₦{amt.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <Label>Custom Amount (₦)</Label>
                    <Input type="number" min="1" max="10000000" step="0.01" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="Enter amount" />
                  </div>
                  <Button onClick={handleTopUp} disabled={processing} className="w-full">
                    {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</> : <><CreditCard className="h-4 w-4 mr-2" /> Add {formatNaira(parseFloat(topUpAmount) || 0)}</>}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Funded</p>
                <p className="font-bold text-emerald-600">{formatNaira(totalCredits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Spent</p>
                <p className="font-bold text-orange-600">{formatNaira(totalDebits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
          <History className="h-4 w-4" /> Transaction History
        </h3>
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Wallet className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground">Add funds to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {transactions.map(tx => {
              const cat = CATEGORY_LABELS[tx.category] || { label: tx.category, color: 'text-muted-foreground' };
              const isCredit = tx.type === 'credit';
              return (
                <Card key={tx.id} className="hover:shadow-md transition-all">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg ${isCredit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                          {isCredit ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {tx.description || cat.label}
                            </p>
                            <Badge variant="outline" className={`text-[10px] ${cat.color}`}>
                              {cat.label}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {format(parseISO(tx.created_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-semibold text-sm ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '-'}{formatNaira(Number(tx.amount))}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Bal: {formatNaira(Number(tx.balance_after))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
