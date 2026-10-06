import React from 'react';
import { Activity, ChartNoAxesCombined, LayoutDashboard, Plus, Timer } from 'lucide-react';

const links = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'log', label: 'Catat lari', icon: Plus },
  { id: 'history', label: 'Riwayat', icon: ChartNoAxesCombined },
];

export default function Navbar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#" onClick={(event) => { event.preventDefault(); onNavigate('dashboard'); }}>
        <span className="brand-mark"><Activity size={22} strokeWidth={2.6} /></span>
        <span className="brand-name">titut<span>run</span></span>
      </a>
      <div className="nav-caption">MENU UTAMA</div>
      <nav className="nav-links" aria-label="Navigasi utama">
        {links.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`nav-link ${activePage === id ? 'active' : ''}`} onClick={() => onNavigate(id)}>
            <Icon size={19} strokeWidth={1.9} />
            <span>{label}</span>
            {id === 'log' && <span className="nav-add"><Plus size={15} /></span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <span className="tip-icon"><Timer size={18} /></span>
          <p>Pelan-pelan saja.<br /><strong>Yang penting mulai.</strong></p>
          <span className="tip-spark">✳</span>
        </div>
        <div className="sidebar-credit">
          <span className="credit-avatar">2A</span>
          <span><strong>Kelompok 2-A</strong><small>Manajemen Proyek TI</small></span>
          <span className="credit-dot" />
        </div>
      </div>
    </aside>
  );
}
