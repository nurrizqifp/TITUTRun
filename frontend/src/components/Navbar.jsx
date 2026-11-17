import React from 'react';
import { Activity, ChartNoAxesCombined, LayoutDashboard, LogOut, Plus, Timer } from 'lucide-react';

const links = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'log', label: 'Catat lari', icon: Plus },
  { id: 'history', label: 'Riwayat', icon: ChartNoAxesCombined },
];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'TR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Navbar({ activePage, onNavigate, user, onLogout }) {
  return (
    <aside className="sidebar">
      <button type="button" className="brand brand-button" onClick={() => onNavigate('dashboard')}>
        <span className="brand-mark"><Activity size={22} strokeWidth={2.6} /></span>
        <span className="brand-name">titut<span>run</span></span>
      </button>
      <div className="nav-caption">MENU UTAMA</div>
      <nav className="nav-links" aria-label="Navigasi utama">
        {links.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-link ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={19} strokeWidth={1.9} />
            <span>{label}</span>
            {id === 'log' && <span className="nav-add"><Plus size={15} /></span>}
          </button>
        ))}
        <button
          type="button"
          className="nav-link nav-link-mobile-logout"
          onClick={onLogout}
          aria-label="Keluar dari akun"
        >
          <LogOut size={19} strokeWidth={1.9} />
          <span>Keluar</span>
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <span className="tip-icon"><Timer size={18} /></span>
          <p>Pelan-pelan saja.<br /><strong>Yang penting mulai.</strong></p>
          <span className="tip-spark" aria-hidden="true">✳</span>
        </div>
        <div className="sidebar-user">
          <span className="credit-avatar">{getInitials(user?.name)}</span>
          <span className="sidebar-user-meta">
            <strong>{user?.name || 'Pelari'}</strong>
            <small>{user?.email || ''}</small>
          </span>
          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
            aria-label="Keluar dari akun"
            title="Keluar"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
