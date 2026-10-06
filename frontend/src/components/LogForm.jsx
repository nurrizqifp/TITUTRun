import React, { useState } from 'react';
import { ArrowLeft, Check, Footprints } from 'lucide-react';

const today = new Date();
const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export default function LogForm({ onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    date: localDate,
    distanceKm: '',
    durationMinutes: '',
    rpe: 5,
    notes: '',
  });
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({
        ...form,
        distanceKm: Number(form.distanceKm),
        durationMinutes: Number(form.durationMinutes),
        rpe: Number(form.rpe),
      });
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="form-layout">
      <div className="form-intro">
        <button className="back-link" onClick={onCancel}><ArrowLeft size={16} />Kembali ke dashboard</button>
        <span className="eyebrow">JURNAL LARI</span>
        <h1>Satu lari lagi,<br /><span>satu langkah maju.</span></h1>
        <p>Catat bagaimana sesi hari ini terasa. Progres besar dimulai dari langkah-langkah kecil.</p>
        <div className="form-quote"><Footprints size={19} /><span>“Tidak harus cepat. Cukup terus bergerak.”</span></div>
      </div>
      <form className="panel log-form" onSubmit={handleSubmit}>
        <div className="form-heading"><div><span className="eyebrow">SESI BARU</span><h2>Detail latihan</h2></div><span className="form-badge"><Check size={13} />Disimpan pribadi</span></div>
        {error && <div className="alert error" role="alert">{error}</div>}
        <label className="field-label" htmlFor="run-date">Tanggal lari</label>
        <input id="run-date" className="form-input" type="date" required value={form.date} onChange={(event) => update('date', event.target.value)} />
        <div className="field-row">
          <div><label className="field-label" htmlFor="distance">Jarak <span>(kilometer)</span></label><div className="input-with-unit"><input id="distance" className="form-input" type="number" min="0.1" max="100" step="0.1" placeholder="5.0" required value={form.distanceKm} onChange={(event) => update('distanceKm', event.target.value)} /><span>km</span></div></div>
          <div><label className="field-label" htmlFor="duration">Durasi <span>(menit)</span></label><div className="input-with-unit"><input id="duration" className="form-input" type="number" min="1" max="1000" step="1" placeholder="32" required value={form.durationMinutes} onChange={(event) => update('durationMinutes', event.target.value)} /><span>menit</span></div></div>
        </div>
        <div className="rpe-section">
          <div className="rpe-label"><label className="field-label" htmlFor="rpe">Seberapa berat rasanya?</label><span className="rpe-value">{form.rpe}<small> / 10</small></span></div>
          <input id="rpe" className="range-input" type="range" min="1" max="10" value={form.rpe} onChange={(event) => update('rpe', event.target.value)} style={{ '--range-progress': `${((form.rpe - 1) / 9) * 100}%` }} />
          <div className="range-ends"><span>Santai sekali</span><span>Maksimal</span></div>
        </div>
        <label className="field-label" htmlFor="notes">Catatan kecil <span>(opsional)</span></label>
        <textarea id="notes" className="form-input notes-input" rows="3" maxLength="500" placeholder="Rute favorit, suasana hati, atau apa pun yang ingin diingat..." value={form.notes} onChange={(event) => update('notes', event.target.value)} />
        <button className="button button-primary submit-button" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan sesi lari'}<span>↗</span></button>
        <p className="privacy-note">Datamu tersimpan aman di database latihanmu.</p>
      </form>
    </section>
  );
}
