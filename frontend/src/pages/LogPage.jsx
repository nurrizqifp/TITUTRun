import React from 'react';
import LogForm from '../components/LogForm.jsx';

export default function LogPage({ onSave, saving, onCancel }) {
  return (
    <div className="page-content log-page">
      <LogForm onSubmit={onSave} saving={saving} onCancel={onCancel} />
      <footer className="app-footer"><span>© 2026 TITUT Run</span><span>Dikembangkan dengan semangat <b>Kelompok 2-A · UMY</b></span></footer>
    </div>
  );
}
