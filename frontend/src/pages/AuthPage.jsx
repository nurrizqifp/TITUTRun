import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u;
const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}$/;

function getPasswordChecks(password) {
  return [
    { key: 'length', label: '10–72 karakter', ok: password.length >= 10 && password.length <= 72 },
    { key: 'upper', label: 'Huruf besar (A–Z)', ok: /[A-Z]/.test(password) },
    { key: 'lower', label: 'Huruf kecil (a–z)', ok: /[a-z]/.test(password) },
    { key: 'digit', label: 'Angka (0–9)', ok: /[0-9]/.test(password) },
    { key: 'symbol', label: 'Simbol (!@#$...)', ok: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export default function AuthPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = useMemo(() => getPasswordChecks(form.password), [form.password]);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setForm((current) => ({ ...current, password: '', confirmPassword: '' }));
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedName = form.name.trim().replace(/\s+/g, ' ');

    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.includes('..') || normalizedEmail.length > 120) {
      setError('Format email tidak valid. Gunakan alamat email lengkap (maks. 120 karakter).');
      return;
    }

    if (mode === 'register') {
      if (normalizedName.length < 2 || normalizedName.length > 60) {
        setError('Nama harus terdiri dari 2 sampai 60 karakter.');
        return;
      }
      if (!NAME_PATTERN.test(normalizedName) || (normalizedName.match(/\p{L}/gu) || []).length < 2) {
        setError('Nama hanya boleh berisi huruf, spasi, titik, apostrof, atau tanda hubung.');
        return;
      }
      if (form.password !== form.password.trim()) {
        setError('Kata sandi tidak boleh diawali atau diakhiri spasi.');
        return;
      }
      if (passwordChecks.some((rule) => !rule.ok)) {
        setError('Kata sandi belum memenuhi seluruh kombinasi keamanan yang diwajibkan.');
        return;
      }
      const loweredPassword = form.password.toLowerCase();
      const emailLocalPart = normalizedEmail.split('@')[0] || '';
      if (emailLocalPart.length >= 3 && loweredPassword.includes(emailLocalPart)) {
        setError('Kata sandi tidak boleh mengandung bagian dari alamat email Anda.');
        return;
      }
      const nameTokens = normalizedName.toLowerCase().split(/\s+/).filter((token) => token.length >= 3);
      if (nameTokens.some((token) => loweredPassword.includes(token))) {
        setError('Kata sandi tidak boleh mengandung nama Anda.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Konfirmasi kata sandi tidak cocok.');
        return;
      }
    } else if (!form.password || form.password.length > 72) {
      setError('Kata sandi wajib diisi (maks. 72 karakter).');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin({ email: normalizedEmail, password: form.password });
      } else {
        await onRegister({ name: normalizedName, email: normalizedEmail, password: form.password });
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-intro">
          <div className="brand auth-brand">
            <span className="brand-mark"><Activity size={22} strokeWidth={2.6} /></span>
            <span className="brand-name">titut<span>run</span></span>
          </div>
          <h1>Lari lebih konsisten, <span>satu sesi setiap waktu.</span></h1>
          <p>
            Simpan catatan latihan pribadimu, pantau ritme mingguan, dan susun jadwal lari yang sesuai dengan levelmu.
          </p>
          <div className="auth-highlights">
            <div>
              <strong>Catatan Pribadi</strong>
              <span>Setiap pelari punya ruang data dan riwayat latihannya sendiri.</span>
            </div>
            <div>
              <strong>Jadwal Adaptif</strong>
              <span>Susun rencana mingguan sesuai target 5K, 10K, atau kebugaran.</span>
            </div>
          </div>
        </section>

        <section className="panel auth-card" aria-label={mode === 'login' ? 'Masuk ke akun' : 'Daftar akun baru'}>
          <div className="auth-tabs" role="tablist" aria-label="Pilih mode autentikasi">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Masuk
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              Daftar
            </button>
          </div>

          <div className="auth-card-head">
            <h2>{mode === 'login' ? 'Selamat datang kembali' : 'Buat akun pelari'}</h2>
            <p>
              {mode === 'login'
                ? 'Masuk untuk membuka jurnal latihanmu.'
                : 'Daftar gratis untuk mulai mencatat progres larimu.'}
            </p>
          </div>

          {error && <div className="alert error" role="alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="auth-field">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="auth-name">Nama lengkap</label>
                  <span className="char-count">{form.name.trim().length}/60</span>
                </div>
                <div className="input-with-icon">
                  <User size={16} aria-hidden="true" />
                  <input
                    id="auth-name"
                    className="form-input"
                    type="text"
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={60}
                    required
                    placeholder="Contoh: Nadia Pratama"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <div className="field-label-row">
                <label className="field-label" htmlFor="auth-email">Email</label>
                <span className="char-count">{form.email.trim().length}/120</span>
              </div>
              <div className="input-with-icon">
                <Mail size={16} aria-hidden="true" />
                <input
                  id="auth-email"
                  className="form-input"
                  type="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  minLength={5}
                  maxLength={120}
                  required
                  placeholder="nama@domain.com"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="field-label-row">
                <label className="field-label" htmlFor="auth-password">
                  Kata sandi {mode === 'register' && <span>(10–72 karakter)</span>}
                </label>
                {mode === 'register' && <span className="char-count">{form.password.length}/72</span>}
              </div>
              <div className="input-with-icon password-wrap">
                <Lock size={16} aria-hidden="true" />
                <input
                  id="auth-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'register' ? 10 : 1}
                  maxLength={72}
                  required
                  placeholder={mode === 'register' ? 'Kombinasi huruf, angka & simbol' : 'Masukkan kata sandi'}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'register' && (
                <ul className="password-rules" aria-label="Syarat kata sandi">
                  {passwordChecks.map(({ key, label, ok }) => (
                    <li key={key} className={ok ? 'met' : ''}>
                      <Check size={12} aria-hidden="true" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {mode === 'register' && (
              <div className="auth-field">
                <label className="field-label" htmlFor="auth-confirm-password">Konfirmasi kata sandi</label>
                <div className="input-with-icon">
                  <Lock size={16} aria-hidden="true" />
                  <input
                    id="auth-confirm-password"
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    minLength={10}
                    maxLength={72}
                    required
                    placeholder="Ulangi kata sandi"
                    value={form.confirmPassword}
                    onChange={(event) => updateField('confirmPassword', event.target.value)}
                  />
                </div>
              </div>
            )}

            <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
              <span>{submitting ? 'Memproses...' : mode === 'login' ? 'Masuk ke jurnal' : 'Buat akun'}</span>
              <ArrowRight size={16} />
            </button>

            {mode === 'register' && (
              <p className="privacy-note">
                Data akun Anda hanya digunakan untuk menyimpan jurnal latihan pribadi Anda di TITUT Run.
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
