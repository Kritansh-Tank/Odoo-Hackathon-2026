'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Truck, ArrowRight, ShieldCheck, Cpu, BarChart3, Wrench,
  Fuel, ExternalLink, Lock, AlertCircle, Users, Settings, Mail
} from 'lucide-react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState<'admin' | 'manager' | 'safety' | 'finance' | 'driver'>('admin');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const rolesShowcase = {
    admin: {
      title: 'Administrator (Owner)',
      desc: 'Full system oversight. Promotes user roles, changes organizational definitions, and configures core multipliers (e.g. rate per km, safety thresholds).',
      privileges: ['User Role Promotion', 'System Configuration', 'Full CRUD Operations', 'All Reports Access'],
      color: 'var(--color-amber-500)'
    },
    manager: {
      title: 'Fleet Manager',
      desc: 'Controls daily logistics. Registers vehicles, creates trips, initiates AI dispatch advisories, and manages maintenance work orders.',
      privileges: ['Vehicle & Driver CRUD', 'Trip Dispatching Wizard', 'AI Risk Assessment', 'Maintenance Actions'],
      color: '#10b981'
    },
    safety: {
      title: 'Safety Officer',
      desc: 'Monitors driver compliance. Tracks safety scores, audits licenses, and triggers automated AI-drafted renewal alerts via email.',
      privileges: ['Driver Safety Scoring', 'License Expiry Alerts', 'AI Reminder Drafting', 'Email Dispatches'],
      color: '#3b82f6'
    },
    finance: {
      title: 'Financial Analyst',
      desc: 'Tracks profitability. Manages operating expenses, monitors fuel costs, views operational ROI charts, and exports detailed data.',
      privileges: ['Fuel Cost Auditing', 'Expense Ledger CRUD', 'Operational ROI Analytics', 'CSV/PDF Reporting'],
      color: '#8b5cf6'
    },
    driver: {
      title: 'Driver',
      desc: 'Handles localized logging. Accesses personal assigned routes, checks trip parameters, and registers fuel consumption on the go.',
      privileges: ['View Assigned Trips', 'Trip Status Updates', 'Personal Fuel Logging', 'Expense Declarations'],
      color: '#ec4899'
    }
  };

  return (
    <div className="min-h-screen text-[var(--color-text-primary)] flex flex-col font-sans selection:bg-[rgba(245,158,11,0.3)]" style={{ background: '#05050a' }}>
      
      {/* ─── GLOW BACKGROUND ARTIFACTS ─────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full filter blur-[120px] opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, var(--color-amber-500) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full filter blur-[150px] opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
      </div>

      {/* ─── NAVIGATION BAR ────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'py-4 backdrop-blur-md border-b bg-[rgba(8,8,16,0.7)]'
            : 'py-6 bg-transparent border-b border-transparent'
        }`}
        style={{ borderColor: scrolled ? 'var(--color-border-subtle)' : 'transparent' }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Truck size={18} className="text-black" />
            </div>
            <div>
              <div className="font-bold text-sm leading-none">TransitOps</div>
              <div className="text-[10px] leading-none mt-1" style={{ color: 'var(--color-text-muted)' }}>Fleet Platform</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            <a href="#features" className="hover:text-[var(--color-text-primary)] transition-colors">Features</a>
            <a href="#rbac" className="hover:text-[var(--color-text-primary)] transition-colors">Roles</a>
            <a href="#stats" className="hover:text-[var(--color-text-primary)] transition-colors">Metrics</a>
            <a href="https://github.com/Kritansh-Tank/Odoo-Hackathon-2026" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors">
              Repository <ExternalLink size={12} />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000'
              }}
            >
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-36 z-10 max-w-7xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <span
            className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border"
            style={{
              borderColor: 'rgba(245,158,11,0.25)',
              background: 'rgba(245,158,11,0.05)',
              color: 'var(--color-amber-400)'
            }}
          >
            🚀 Odoo Hackathon 2026 Solo Project
          </span>

          <h1
            className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight"
            style={{ letterSpacing: '-0.03em' }}
          >
            Fleet Operations, <br className="hidden md:inline" />
            <span className="gradient-text font-black">Reimagined.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm md:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Digitize logistics, manage drivers, track maintenance, and perform AI-powered dispatch risk assessments on a highly-secure, role-governed platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-97 transition-all cursor-pointer shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000',
                boxShadow: '0 4px 20px rgba(245,158,11,0.2)'
              }}
            >
              Enter Dashboard
              <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 hover:bg-[rgba(255,255,255,0.03)] active:scale-97 transition-all cursor-pointer"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-text-primary)'
              }}
            >
              Explore Features
            </a>
          </div>
        </motion.div>

        {/* Dashboard Preview Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-16 md:mt-24 p-2 rounded-2xl border"
          style={{
            borderColor: 'rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(14,14,26,0.6) 0%, rgba(8,8,16,0.9) 100%)'
          }}
        >
          <div className="rounded-xl overflow-hidden border shadow-2xl relative" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <div className="bg-[#0b0b14] h-7 w-full flex items-center gap-2 px-4 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <div className="text-[10px] mx-auto" style={{ color: 'var(--color-text-muted)' }}>transitops-dusky.vercel.app/dashboard</div>
            </div>
            
            {/* Visual Bento Grid Mock layout placeholder inside the browser wrapper */}
            <div className="bg-[#08080f] p-4 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left pointer-events-none select-none">
              <div className="card space-y-2 border" style={{ borderColor: 'rgba(255,255,255,0.03)', background: '#0e0e1a' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Fleet Status Overview</div>
                <div className="text-2xl font-black text-[var(--color-amber-400)]">6 Active Vehicles</div>
                <div className="text-[10px]" style={{ color: '#10b981' }}>🟢 4 Available · 1 In Shop · 0 On Trip</div>
              </div>
              <div className="card space-y-2 border" style={{ borderColor: 'rgba(255,255,255,0.03)', background: '#0e0e1a' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Safety & Risk Compliance</div>
                <div className="text-2xl font-black text-blue-400">92% Avg Safety Score</div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>1 Expiring license alert generated</div>
              </div>
              <div className="card space-y-2 border" style={{ borderColor: 'rgba(255,255,255,0.03)', background: '#0e0e1a' }}>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Operating Revenue</div>
                <div className="text-2xl font-black text-green-400">₹8,92,400</div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Standard rate: ₹40 / km applied</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── FEATURES SECTION (Bento Grid) ─────────────────────────── */}
      <section id="features" className="py-24 border-t border-[rgba(255,255,255,0.04)] bg-[#07070d] z-10 relative">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Core Features & Modules
            </h2>
            <p className="text-xs max-w-xl mx-auto" style={{ color: 'var(--color-text-muted)' }}>
              Every module is designed to provide high-fidelity tracking, beautiful dark layouts, and atomic validations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* AI Advisor Card */}
            <div className="card border p-6 flex flex-col justify-between hover:translate-y-[-4px] transition-transform duration-300" style={{ background: '#0e0e1a', borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--color-amber-400)]" style={{ background: 'rgba(245,158,11,0.08)' }}>
                  <Cpu size={20} />
                </div>
                <h3 className="font-bold text-lg">AI Dispatch Advisor</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Leverages Groq Cloud LLM to crosscheck driver safety scores, road categories, route details, and vehicle cargo parameters before generating atomic dispatch advisories.
                </p>
              </div>
              <span className="text-[10px] mt-6 font-bold" style={{ color: 'var(--color-amber-400)' }}>Powered by Groq Cloud API</span>
            </div>

            {/* 3D Fiber Charts Card */}
            <div className="card border p-6 flex flex-col justify-between hover:translate-y-[-4px] transition-transform duration-300" style={{ background: '#0e0e1a', borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-green-400" style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <BarChart3 size={20} />
                </div>
                <h3 className="font-bold text-lg">3D Fiber Visualizations</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Renders gorgeous 3D interactive fuel efficiency bars and ROI graphs directly inside the browser using Three.js/Fiber, complete with hover interactions and custom camera configurations.
                </p>
              </div>
              <span className="text-[10px] mt-6 font-bold text-green-400">Powered by React Three Fiber</span>
            </div>

            {/* RLS Guard Card */}
            <div className="card border p-6 flex flex-col justify-between hover:translate-y-[-4px] transition-transform duration-300" style={{ background: '#0e0e1a', borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-blue-400" style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-lg">Robust Security Rules</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Enforces 10 mandatory logistical business rules at database and API thresholds (e.g. odometer increments, cargo thresholds, and automatic vehicle/driver dispatch statuses).
                </p>
              </div>
              <span className="text-[10px] mt-6 font-bold text-blue-400">Strictly Enforced Integrity</span>
            </div>

            {/* Expiring Licenses Card */}
            <div className="card border p-6 md:col-span-2 flex flex-col md:flex-row justify-between gap-6 hover:translate-y-[-4px] transition-transform duration-300" style={{ background: '#0e0e1a', borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="space-y-4 max-w-md">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-pink-400" style={{ background: 'rgba(236,72,153,0.08)' }}>
                  <Mail size={20} />
                </div>
                <h3 className="font-bold text-lg">AI-Powered License Renewals</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Identifies expired licenses or licenses approaching expiry and drafts custom reminder alerts. Integrated with Resend, safety officers can mail drivers details instantly.
                </p>
              </div>
              <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l pl-0 md:pl-6 pt-4 md:pt-0" style={{ borderColor: 'var(--color-border-subtle)' }}>
                <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Integration Stack</div>
                <div className="text-sm font-bold text-pink-400 mt-1">Resend + Groq LLM</div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-2">Draft templates, check variables, and send reminder emails instantly.</div>
              </div>
            </div>

            {/* Maintenance Workorders Card */}
            <div className="card border p-6 flex flex-col justify-between hover:translate-y-[-4px] transition-transform duration-300" style={{ background: '#0e0e1a', borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-orange-400" style={{ background: 'rgba(249,115,22,0.08)' }}>
                  <Wrench size={20} />
                </div>
                <h3 className="font-bold text-lg">Closed-Loop Maintenance</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Log repairs, automatically restrict vehicles into In Shop status, and fetch summarized AI work logs upon closing tickets, restoring the vehicle status instantly.
                </p>
              </div>
              <span className="text-[10px] mt-6 font-bold text-orange-400">Integrated Auto-Transitions</span>
            </div>

          </div>
        </div>
      </section>

      {/* ─── ROLE PRIVILEGES ACCORDION SECTION ───────────────────── */}
      <section id="rbac" className="py-24 max-w-7xl mx-auto px-6 z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Enterprise Role-Based Access Control
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Our platform features granular, role-based authorization. Change user states in the Admin console, and the platform adjusts UI links and filters databases automatically.
            </p>
            <div className="flex flex-col gap-2">
              {Object.keys(rolesShowcase).map((r) => {
                const isActive = activeRoleTab === r;
                return (
                  <button
                    key={r}
                    onClick={() => setActiveRoleTab(r as any)}
                    className="text-left px-4 py-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer"
                    style={{
                      background: isActive ? 'rgba(245,158,11,0.05)' : 'transparent',
                      borderColor: isActive ? 'var(--color-amber-500)' : 'var(--color-border)',
                      color: isActive ? 'var(--color-amber-400)' : 'var(--color-text-secondary)'
                    }}
                  >
                    {rolesShowcase[r as keyof typeof rolesShowcase].title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3 card border p-8 space-y-6" style={{ background: '#0e0e1a', borderColor: 'rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-black"
                style={{ background: rolesShowcase[activeRoleTab].color }}
              >
                {activeRoleTab.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg">{rolesShowcase[activeRoleTab].title}</h3>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Authorization Scope</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              {rolesShowcase[activeRoleTab].desc}
            </p>

            <div className="border-t pt-6" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <div className="text-[10px] uppercase font-bold tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Granted Permissions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rolesShowcase[activeRoleTab].privileges.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── METRICS & STATS SECTION ─────────────────────────────── */}
      <section id="stats" className="py-16 border-t border-[rgba(255,255,255,0.04)] bg-[#07070d] z-10 relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Validated Business Rules', value: '10+' },
            { label: 'Built From Scratch', value: '8 Hours' },
            { label: 'Supabase SSR Integration', value: '100%' },
            { label: 'Granular Access Roles', value: '5 Roles' },
          ].map((stat, i) => (
            <div key={i} className="space-y-2">
              <div className="text-3xl md:text-4xl font-black text-[var(--color-amber-400)]">{stat.value}</div>
              <div className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="mt-auto py-12 border-t z-10 relative" style={{ borderColor: 'var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Truck size={15} className="text-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs leading-none">TransitOps</span>
              <span className="text-[9px] leading-none mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Fleet Platform
              </span>
            </div>
          </div>

          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            © {new Date().getFullYear()} TransitOps · Solo Hackathon Build · Designed with Premium Aesthetics.
          </div>
        </div>
      </footer>

    </div>
  );
}
