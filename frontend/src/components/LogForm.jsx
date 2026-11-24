import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Footprints } from 'lucide-react';

const MIN_LOG_DATE = '2020-01-01';

function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function LogForm({ onSubmit, onCancel, saving }) {
  const todayDate = getTodayDateString();
  const [form, setForm] = useState(() => ({
    date: todayDate,
    distanceKm: '',
    durationMinutes: '',
    rpe: 5,
    notes: '',
  }));
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const distanceKm = Number(form.distanceKm);
    const durationMinutes = Number(form.durationMinutes);
    const rpe = Number(form.rpe);
    const trimmedNotes = form.notes.trim();

    if (!form.date || form.date < MIN_LOG_DATE || form.date > todayDate) {
      setError(`Tanggal latihan harus antara ${MIN_LOG_DATE} sampai hari ini.`);
      return;
    }
    if (!Number.isFinite(distanceKm) || distanceKm < 0.1 || distanceKm > 100) {
      setError('Jarak harus antara 0,1 km sampai 100 km.');
      return;
    }
    if (Math.abs(distanceKm * 100 - Math.round(distanceKm * 100)) > 1e-6) {
      setError('Jarak maksimal memiliki 2 angka di belakang koma.');
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1000) {
      setError('Durasi harus berupa bilangan bulat antara 1 sampai 1000 menit.');
      return;
    }
    const pace = durationMinutes / distanceKm;
    if (pace < 1.5 || pace > 30) {
      setError('Kombinasi jarak dan durasi tidak realistis (pace normal antara 1:30–30:00 /km).');
      return;
    }
    if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) {
      setError('RPE harus antara 1 sampai 10.');
      return;
    }
    if (trimmedNotes.length > 300) {
      setError('Catatan maksimal 300 karakter.');
      return;
    }
    if (/[<>]/.test(trimmedNotes)) {
      setError('Catatan tidak boleh mengandung karakter < atau >.');
      return;
    }

    try {
      await onSubmit({
        date: form.date,
        distanceKm,
        durationMinutes,
        rpe,
        notes: trimmedNotes,
      });
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="form-layout">
      <div className="form-intro">
        <button type="button" className="back-link" onClick={onCancel}><ArrowLeft size={16} />Kembali ke dashboard</button>
        <h1>Catat sesi <span>latihan baru.</span></h1>
        <p>Rekam jarak, durasi, dan tingkat usaha (RPE) agar progres mingguanmu tetap terpantau rapi.</p>
        <div className="form-quote"><Footprints size={18} /><span>Tidak harus cepat, yang penting konsisten.</span></div>
      </div>

      <form className="panel log-form" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Detail latihan</h2>
          <span className="form-badge"><Check size={14} />Tersimpan pribadi</span>
        </div>

        {error && <div className="alert error" role="alert">{error}</div>}

        <label className="field-label" htmlFor="run-date">Tanggal lari</label>
        <input id="run-date" className="form-input" type="date" min={MIN_LOG_DATE} max={todayDate} required value={form.date} onChange={(event) => update('date', event.target.value)} />

        <div className="field-row">
          <div>
            <label className="field-label" htmlFor="distance">Jarak <span>(0,1–100 km)</span></label>
            <div className="input-with-unit">
              <input id="distance" className="form-input" type="number" inputMode="decimal" min="0.1" max="100" step="0.01" placeholder="5.00" required value={form.distanceKm} onChange={(event) => update('distanceKm', event.target.value)} />
              <span>km</span>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="duration">Durasi <span>(1–1000 mnt)</span></label>
            <div className="input-with-unit">
              <input id="duration" className="form-input" type="number" inputMode="numeric" min="1" max="1000" step="1" placeholder="32" required value={form.durationMinutes} onChange={(event) => update('durationMinutes', event.target.value)} />
              <span>mnt</span>
            </div>
          </div>
        </div>

        <div className="rpe-section">
          <div className="rpe-label">
            <label className="field-label" htmlFor="rpe">Tingkat usaha (RPE)</label>
            <span className="rpe-value">{form.rpe}<small> / 10</small></span>
          </div>
          <input id="rpe" className="range-input" type="range" min="1" max="10" value={form.rpe} onChange={(event) => update('rpe', event.target.value)} style={{ '--range-progress': `${((form.rpe - 1) / 9) * 100}%` }} />
          <div className="range-ends"><span>Santai sekali</span><span>Maksimal</span></div>
        </div>

        <div className="field-label-row">
          <label className="field-label" htmlFor="notes">Catatan kecil <span>(opsional)</span></label>
          <span className="char-count">{form.notes.length}/300</span>
        </div>
        <textarea id="notes" className="form-input notes-input" rows="3" maxLength={300} placeholder="Rute favorit, suasana hati, atau kondisi tubuh..." value={form.notes} onChange={(event) => update('notes', event.target.value)} />

        <button className="button button-primary submit-button" type="submit" disabled={saving}>
          <span>{saving ? 'Menyimpan...' : 'Simpan sesi lari'}</span>
          <ArrowUpRight size={17} />
        </button>
        <p className="privacy-note">Hindari menuliskan data pribadi sensitif (KTP, alamat rumah, atau nomor telepon) pada catatan.</p>
      </form>
    </section>
  );
}
