'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, BarChart3, TrendingUp, Fuel, DollarSign } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { createClient } from '@/lib/supabase/client';
import type { VehicleCostSummary } from '@/types';
import { formatCurrency, formatKmL, formatPercent, downloadCsv, arrayToCsv } from '@/lib/utils';
import { calculateVehicleROI } from '@/lib/business-rules';
import { toast } from 'sonner';

// ─── 3D BAR CHART ─────────────────────────────────────────────
function Bar3D({ x, height, color, label, value }: { x: number; height: number; color: string; label: string; value: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={[x, 0, 0]}>
      <mesh
        position={[0, height / 2, 0]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered ? [1.05, 1, 1.05] : [1, 1, 1]}
      >
        <boxGeometry args={[0.6, height, 0.6]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.4} emissive={color} emissiveIntensity={hovered ? 0.3 : 0.1} />
      </mesh>
      <Text position={[0, -0.4, 0]} fontSize={0.15} color="#9090b0" anchorX="center" maxWidth={1}>
        {label}
      </Text>
      {hovered && (
        <Text position={[0, height + 0.3, 0]} fontSize={0.18} color="#f0f0ff" anchorX="center">
          {value}
        </Text>
      )}
    </group>
  );
}

function FuelEfficiencyChart3D({ data }: { data: { name: string; efficiency: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.efficiency), 1);
  const spacing = 1.2;
  const totalWidth = (data.length - 1) * spacing;

  return (
    <group position={[-totalWidth / 2, 0, 0]}>
      {data.map((d, i) => (
        <Bar3D
          key={d.name}
          x={i * spacing}
          height={Math.max(0.1, (d.efficiency / max) * 3)}
          color={d.efficiency > 12 ? '#22c55e' : d.efficiency > 8 ? '#f59e0b' : '#ef4444'}
          label={d.name.slice(0, 8)}
          value={`${d.efficiency.toFixed(1)} km/L`}
        />
      ))}
      {/* Grid base */}
      <mesh position={[totalWidth / 2, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalWidth + 2, 2]} />
        <meshStandardMaterial color="#1e2035" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ─── 3D ROI BARS ──────────────────────────────────────────────
function ROIChart3D({ data }: { data: { name: string; roi: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Math.abs(d.roi)), 1);
  const spacing = 1.4;
  const totalWidth = (data.length - 1) * spacing;

  return (
    <group position={[-totalWidth / 2, 0, 0]}>
      {data.map((d, i) => {
        const h = Math.max(0.05, (Math.abs(d.roi) / max) * 2.5);
        const positive = d.roi >= 0;
        return (
          <group key={d.name} position={[i * spacing, 0, 0]}>
            <mesh position={[0, positive ? h / 2 : -(h / 2), 0]}>
              <boxGeometry args={[0.7, h, 0.7]} />
              <meshStandardMaterial
                color={positive ? '#22c55e' : '#ef4444'}
                roughness={0.2}
                metalness={0.3}
                emissive={positive ? '#22c55e' : '#ef4444'}
                emissiveIntensity={0.15}
              />
            </mesh>
            <Text position={[0, -0.4, 0]} fontSize={0.13} color="#9090b0" anchorX="center" maxWidth={1.2}>
              {d.name.slice(0, 8)}
            </Text>
            <Text position={[0, positive ? h + 0.25 : -(h + 0.25), 0]} fontSize={0.16} color={positive ? '#22c55e' : '#ef4444'} anchorX="center">
              {d.roi.toFixed(1)}%
            </Text>
          </group>
        );
      })}
    </group>
  );
}

export default function ReportsPage() {
  const supabase = createClient();
  const [costData, setCostData] = useState<VehicleCostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<'fuel' | 'roi'>('fuel');

  useEffect(() => {
    supabase.from('vehicle_cost_summary').select('*').order('total_operational_cost', { ascending: false })
      .then(({ data }) => {
        setCostData((data || []) as VehicleCostSummary[]);
        setLoading(false);
      });
  }, []);

  const fuelEffData = costData
    .filter(v => v.total_fuel_liters > 0 && v.total_distance > 0)
    .map(v => ({
      name: v.registration_number,
      efficiency: v.total_distance / v.total_fuel_liters,
    }));

  const roiData = costData.map(v => ({
    name: v.registration_number,
    roi: calculateVehicleROI(v.total_revenue, v.total_maintenance_cost, v.total_fuel_cost, v.acquisition_cost),
  }));

  const totals = {
    revenue: costData.reduce((s, v) => s + v.total_revenue, 0),
    fuel: costData.reduce((s, v) => s + v.total_fuel_cost, 0),
    maintenance: costData.reduce((s, v) => s + v.total_maintenance_cost, 0),
    distance: costData.reduce((s, v) => s + v.total_distance, 0),
  };

  const exportCSV = () => {
    const rows = costData.map(v => ({
      'Vehicle': v.name,
      'Registration': v.registration_number,
      'Type': v.type,
      'Status': v.status,
      'Total Distance (km)': v.total_distance,
      'Total Fuel Cost (₹)': v.total_fuel_cost,
      'Total Maintenance Cost (₹)': v.total_maintenance_cost,
      'Total Revenue (₹)': v.total_revenue,
      'Total Op. Cost (₹)': v.total_operational_cost,
      'ROI (%)': calculateVehicleROI(v.total_revenue, v.total_maintenance_cost, v.total_fuel_cost, v.acquisition_cost).toFixed(2),
    }));
    downloadCsv(arrayToCsv(rows), `transitops-report-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV exported!');
  };

  return (
    <div className="space-y-6 animate-fadein">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">3D visualizations powered by Three.js</p>
        </div>
        <button onClick={exportCSV} className="btn btn-secondary">
          <FileSpreadsheet size={16} /> Export CSV
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totals.revenue), color: '#22c55e', icon: TrendingUp },
          { label: 'Fuel Costs', value: formatCurrency(totals.fuel), color: '#f59e0b', icon: Fuel },
          { label: 'Maintenance', value: formatCurrency(totals.maintenance), color: '#ef4444', icon: BarChart3 },
          { label: 'Total Distance', value: `${totals.distance.toLocaleString()} km`, color: '#3b82f6', icon: BarChart3 },
        ].map(card => (
          <div key={card.label} className="card">
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={14} style={{ color: card.color }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{card.label}</span>
            </div>
            <div className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* 3D Charts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {activeChart === 'fuel' ? '⛽ Fuel Efficiency by Vehicle (km/L)' : '📈 Vehicle ROI (%)'}
          </h3>
          <div className="tab-nav w-64">
            <button className={`tab-item ${activeChart === 'fuel' ? 'active' : ''}`} onClick={() => setActiveChart('fuel')}>
              Fuel Efficiency
            </button>
            <button className={`tab-item ${activeChart === 'roi' ? 'active' : ''}`} onClick={() => setActiveChart('roi')}>
              Vehicle ROI
            </button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton h-72 rounded-xl" />
        ) : costData.length === 0 ? (
          <div className="empty-state h-72">
            <div className="empty-state-icon"><BarChart3 size={24} /></div>
            <div className="empty-state-title">No data yet</div>
            <div className="empty-state-desc">Complete some trips to see analytics</div>
          </div>
        ) : (
          <div style={{ height: 320 }} className="canvas-wrapper">
            <Canvas camera={{ position: [0, 3, 8], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 5]} intensity={1.5} color="#f59e0b" />
              <pointLight position={[-10, -5, -5]} intensity={0.4} color="#3b82f6" />
              <Suspense fallback={null}>
                {activeChart === 'fuel' ? (
                  <FuelEfficiencyChart3D data={fuelEffData} />
                ) : (
                  <ROIChart3D data={roiData} />
                )}
              </Suspense>
              <OrbitControls enableZoom={true} enablePan={false} autoRotate autoRotateSpeed={0.5} />
            </Canvas>
          </div>
        )}

        <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
          Hover bars for details Â· Drag to rotate Â· Scroll to zoom
        </p>
      </div>

      {/* Data table */}
      <div className="card">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Vehicle Cost Breakdown</h3>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Trips</th>
                <th>Distance</th>
                <th>Fuel Cost</th>
                <th>Maintenance</th>
                <th>Revenue</th>
                <th>Op. Cost</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {costData.map(v => {
                const roi = calculateVehicleROI(v.total_revenue, v.total_maintenance_cost, v.total_fuel_cost, v.acquisition_cost);
                return (
                  <tr key={v.id}>
                    <td>
                      <div className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{v.name}</div>
                      <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{v.registration_number}</div>
                    </td>
                    <td><span className="text-xs">{v.completed_trips}</span></td>
                    <td><span className="text-xs font-mono">{v.total_distance.toLocaleString()} km</span></td>
                    <td><span className="text-xs">{formatCurrency(v.total_fuel_cost)}</span></td>
                    <td><span className="text-xs">{formatCurrency(v.total_maintenance_cost)}</span></td>
                    <td><span className="text-xs font-semibold" style={{ color: '#22c55e' }}>{formatCurrency(v.total_revenue)}</span></td>
                    <td><span className="text-xs">{formatCurrency(v.total_operational_cost)}</span></td>
                    <td>
                      <span className="text-xs font-bold" style={{ color: roi >= 0 ? '#22c55e' : '#ef4444' }}>
                        {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

