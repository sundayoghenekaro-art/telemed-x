import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DefenseHealthAuth } from './DefenseHealthAuth';
import { DefenseHealthPortal } from './DefenseHealthPortal';
import { DefenseSuperAdminPage } from './DefenseSuperAdminPage';
import { DefensePersonnelAuth, type DefenseUserAccount } from './DefensePersonnelAuth';
import { DefensePersonnelPortal } from './DefensePersonnelPortal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Crosshair, Star, Building2, Activity, Lock, Heart,
  AlertTriangle, ChevronRight, ArrowLeft, Users, Radio, Ambulance,
  Plane, Anchor, MapPin, Stethoscope, FileText,
} from 'lucide-react';

interface DefenseStaffProfile {
  id: string;
  user_id: string;
  facility_id: string;
  full_name: string;
  rank: string | null;
  role: string;
  specialty: string | null;
  security_clearance: string;
  deployment_status: string;
  status: string;
}

interface DefenseFacility {
  id: string;
  name: string;
  type: string;
  branch: string;
  region: string | null;
  command_level: string | null;
  parent_facility_id: string | null;
  status: string;
}

interface DefensePersonnel {
  id: string;
  service_number: string;
  full_name: string;
  rank: string | null;
  branch: string;
  unit: string | null;
  deployment_status: string;
  blood_type: string | null;
  allergies: string | null;
  date_of_birth: string | null;
  security_clearance: string;
  facility_id: string | null;
  notes: string | null;
  created_at: string;
}

type LandingView = 'landing' | 'staff-auth' | 'super-admin' | 'personnel-auth';

export function DefenseHealthPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<LandingView>('landing');
  const [staff, setStaff] = useState<DefenseStaffProfile | null>(null);
  const [facility, setFacility] = useState<DefenseFacility | null>(null);
  const [personnelAccount, setPersonnelAccount] = useState<DefenseUserAccount | null>(null);
  const [personnel, setPersonnel] = useState<DefensePersonnel | null>(null);

  if (view === 'super-admin') {
    return <DefenseSuperAdminPage />;
  }

  if (view === 'personnel-auth' && (!personnelAccount || !personnel)) {
    return (
      <div>
        <DefensePersonnelAuth onAuthenticated={(acct, p) => { setPersonnelAccount(acct); setPersonnel(p); }} />
        <div className="fixed bottom-4 left-4 z-50">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setView('landing')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Defense Home
          </Button>
        </div>
      </div>
    );
  }

  if (personnelAccount && personnel) {
    return (
      <DefensePersonnelPortal
        account={personnelAccount}
        personnel={personnel}
        onLogout={() => {
          setPersonnelAccount(null);
          setPersonnel(null);
          setView('landing');
          supabase.auth.signOut();
        }}
      />
    );
  }

  if (view === 'staff-auth' && (!staff || !facility)) {
    return (
      <div>
        <DefenseHealthAuth onAuthenticated={(s, f) => { setStaff(s); setFacility(f); }} />
        <div className="fixed bottom-4 left-4 z-50">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setView('landing')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Defense Home
          </Button>
        </div>
      </div>
    );
  }

  if (staff && facility) {
    return (
      <DefenseHealthPortal
        staff={staff}
        facility={facility}
        onLogout={() => { setStaff(null); setFacility(null); setView('landing'); }}
      />
    );
  }

  return <DefenseLanding navigate={navigate} onSelectView={setView} />;
}

function DefenseLanding({ navigate, onSelectView }: { navigate: (path: string) => void; onSelectView: (v: LandingView) => void }) {
  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--gradient-hero)' }}>
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Defense Health Network</h1>
              <p className="text-xs text-white/50">Secure Military Medical Command System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/telemed-x')}>
              <Heart className="h-4 w-4 mr-2" /> Public Hospital Portal
            </Button>
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/')}>
              <Building2 className="h-4 w-4 mr-2" /> Hospital Staff Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]" style={{ background: 'hsl(40 90% 45%)' }} />
          <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]" style={{ background: 'hsl(202 57% 40%)' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 relative z-10">
          <div className="max-w-3xl">
            <Badge className="mb-6 border-amber-500/30 bg-amber-500/10 text-amber-400 px-4 py-1.5" variant="outline">
              <Shield className="h-3 w-3 mr-2" />
              Classified — Authorized Personnel Only
            </Badge>

            <h2 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
              Defense Health
              <span className="block mt-2 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, hsl(40 90% 55%), hsl(202 57% 54%))' }}>
                Command Network
              </span>
            </h2>

            <p className="mt-6 text-lg text-white/60 max-w-xl leading-relaxed">
              A secure military medical command system connecting tertiary command hospitals,
              secondary regional hospitals, and primary field clinics. Manage personnel health
              records, provide remote specialist support to deployed forces, and triage patients
              between military facilities — fully separated from the public healthcare system.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="text-white border-0 text-base px-8 py-6 rounded-xl font-semibold shadow-lg"
                  style={{ background: 'linear-gradient(135deg, hsl(40 90% 45%), hsl(30 85% 40%))' }}
                  onClick={() => onSelectView('staff-auth')}
                >
                  <Shield className="h-5 w-5 mr-2" />
                  Medical Staff Access
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>

                <Button
                  size="lg"
                  className="text-white border-0 text-base px-8 py-6 rounded-xl font-semibold shadow-lg"
                  style={{ background: 'linear-gradient(135deg, hsl(202 57% 45%), hsl(202 57% 38%))' }}
                  onClick={() => onSelectView('personnel-auth')}
                >
                  <Crosshair className="h-5 w-5 mr-2" />
                  Personnel & Family Access
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 text-base px-8 py-6 rounded-xl font-semibold"
                  onClick={() => onSelectView('super-admin')}
                >
                  <Star className="h-5 w-5 mr-2" />
                  Super Admin Command
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Separation Notice */}
      <section className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl border border-amber-500/20 p-6 flex items-start gap-4" style={{ background: 'hsl(40 90% 45% / 0.05)' }}>
            <div className="p-3 rounded-xl bg-amber-500/10 shrink-0">
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Classified Network — Separated from Public Healthcare</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                The Defense Health Network operates on a separate, secured database with independent
                access controls. Military medical records, personnel data, and field consultations are
                not accessible from the public hospital system. All data is protected by security clearance
                levels and defense-specific access policies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Access Roles */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold">Three Access Tiers</h3>
            <p className="mt-3 text-white/50 max-w-lg mx-auto">
              Choose your access level based on your role in the defense health network
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Medical Staff */}
            <div
              className="rounded-2xl border border-white/10 p-8 hover:border-amber-500/30 transition-all cursor-pointer group"
              style={{ background: 'var(--gradient-telemedx-card)' }}
              onClick={() => onSelectView('staff-auth')}
            >
              <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-6" style={{ background: 'hsl(202 57% 54% / 0.2)' }}>
                <Shield className="h-7 w-7 text-blue-400" />
              </div>
              <h4 className="font-semibold text-xl mb-2">Medical Staff Access</h4>
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                For command surgeons, specialists, field medics, nurses, and medical officers.
                Access your assigned facility, manage personnel health records, initiate field
                consultations, and coordinate inter-facility triage transfers.
              </p>
              <ul className="space-y-2 text-sm text-white/60 mb-6">
                <li className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /> View and manage personnel records</li>
                <li className="flex items-center gap-2"><Radio className="h-4 w-4 text-blue-400" /> Initiate and respond to field consultations</li>
                <li className="flex items-center gap-2"><Ambulance className="h-4 w-4 text-blue-400" /> Coordinate inter-facility triage transfers</li>
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-400" /> Track deployed personnel and field records</li>
              </ul>
              <Button className="w-full text-white" style={{ background: 'var(--gradient-telemedx)' }}>
                Access Medical Staff Portal <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Personnel & Family */}
            <div
              className="rounded-2xl border border-white/10 p-8 hover:border-blue-500/30 transition-all cursor-pointer group"
              style={{ background: 'var(--gradient-telemedx-card)' }}
              onClick={() => onSelectView('personnel-auth')}
            >
              <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-6" style={{ background: 'hsl(202 57% 54% / 0.2)' }}>
                <Crosshair className="h-7 w-7 text-blue-400" />
              </div>
              <h4 className="font-semibold text-xl mb-2">Personnel & Family Access</h4>
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                For service members and their families. Sign up using your defense ID number to view your
                medical records, consultation history, and linked family members.
              </p>
              <ul className="space-y-2 text-sm text-white/60 mb-6">
                <li className="flex items-center gap-2"><Heart className="h-4 w-4 text-blue-400" /> Sign up with your defense ID / service number</li>
                <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-400" /> View your medical records and field consultations</li>
                <li className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /> Family members can create accounts linked to you</li>
                <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-400" /> See your deployment status and health summary</li>
              </ul>
              <Button className="w-full text-white" style={{ background: 'linear-gradient(135deg, hsl(202 57% 45%), hsl(202 57% 38%))' }}>
                Access Personnel Portal <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Super Admin */}
            <div
              className="rounded-2xl border border-amber-500/20 p-8 hover:border-amber-500/40 transition-all cursor-pointer group"
              style={{ background: 'hsl(40 90% 45% / 0.05)' }}
              onClick={() => onSelectView('super-admin')}
            >
              <div className="h-14 w-14 rounded-xl flex items-center justify-center mb-6" style={{ background: 'hsl(40 90% 45% / 0.2)' }}>
                <Star className="h-7 w-7 text-amber-500" />
              </div>
              <h4 className="font-semibold text-xl mb-2">Super Admin Command</h4>
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                Network-wide oversight for defense health administrators. View all active medical
                personnel, facilities, and consultation analytics across the entire defense health
                network — including who was consulted for whom, by which physician, at which facility.
              </p>
              <ul className="space-y-2 text-sm text-white/60 mb-6">
                <li className="flex items-center gap-2"><Building2 className="h-4 w-4 text-amber-500" /> View all facilities and their staff</li>
                <li className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-500" /> See all active medical personnel by facility</li>
                <li className="flex items-center gap-2"><Activity className="h-4 w-4 text-amber-500" /> Track total consultations network-wide</li>
                <li className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-amber-500" /> View consulting physician, patient, and facility for each consultation</li>
              </ul>
              <Button className="w-full text-white" style={{ background: 'linear-gradient(135deg, hsl(40 90% 45%), hsl(30 85% 40%))' }}>
                Access Super Admin Dashboard <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Tier Hierarchy */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold">3-Tier Facility Hierarchy</h3>
            <p className="mt-3 text-white/50 max-w-lg mx-auto">
              A command structure connecting military medical facilities at every level
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Building2, title: 'Tertiary Command Hospitals', desc: 'Top-level specialist support and command coordination', color: 'hsl(202 57% 54%)', items: ['Specialist consultations', 'Advanced surgery', 'Command coordination'] },
              { icon: Activity, title: 'Secondary Regional Hospitals', desc: 'Regional medical support and intermediate care', color: 'hsl(141 39% 54%)', items: ['Regional support', 'Intermediate care', 'Support field clinics'] },
              { icon: Crosshair, title: 'Primary Field Clinics', desc: 'Smart clinics and deployed medical units in the field', color: 'hsl(40 90% 55%)', items: ['Field deployments', 'Smart clinics', 'Front-line care'] },
            ].map(tier => (
              <div key={tier.title} className="rounded-2xl border border-white/10 p-6" style={{ background: 'var(--gradient-telemedx-card)' }}>
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${tier.color}20` }}>
                  <tier.icon className="h-6 w-6" style={{ color: tier.color }} />
                </div>
                <h4 className="font-semibold text-lg mb-2">{tier.title}</h4>
                <p className="text-sm text-white/50 mb-4">{tier.desc}</p>
                <ul className="space-y-1.5 text-sm text-white/60">
                  {tier.items.map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branch Support */}
      <section className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { icon: Shield, label: 'Army' },
              { icon: Anchor, label: 'Navy' },
              { icon: Plane, label: 'Air Force' },
              { icon: Shield, label: 'Joint Operations' },
            ].map(branch => (
              <div key={branch.label} className="flex items-center gap-2 text-white/40">
                <branch.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{branch.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-white/30">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500/50" />
            <span>Defense Health Network — by TRIKA Health</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Authorized Personnel Only</span>
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Classified System</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
