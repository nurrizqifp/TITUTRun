import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const monthFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

function getMonday(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Calendar({ logs }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const todayKey = dateKey(new Date());

  const days = dayNames.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label, date, count: logs.filter((log) => log.date === dateKey(date)).length };
  });

  const weekRuns = logs.filter((log) => days.some((day) => dateKey(day.date) === log.date)).length;
  const headingText = weekOffset === 0
    ? 'Konsistensi minggu ini'
    : `${monthFormat.format(monday)} – ${monthFormat.format(sunday)}`;

  return (
    <section className="panel calendar-panel">
      <div className="panel-heading">
        <h2>{headingText}</h2>
        <div className="calendar-arrows">
          {weekOffset !== 0 && (
            <button
              type="button"
              className="calendar-reset"
              onClick={() => setWeekOffset(0)}
              aria-label="Kembali ke minggu ini"
            >
              Minggu ini
            </button>
          )}
          <button
            type="button"
            aria-label="Minggu sebelumnya"
            onClick={() => setWeekOffset((current) => current - 1)}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Minggu berikutnya"
            disabled={weekOffset >= 0}
            onClick={() => setWeekOffset((current) => Math.min(0, current + 1))}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="week-calendar">
        {days.map(({ label, date, count }) => (
          <div className={`week-day ${count ? 'has-run' : ''} ${dateKey(date) === todayKey ? 'today' : ''}`} key={label}>
            <span className="week-label">{label}</span>
            <span className="week-date">{date.getDate()}</span>
            <span className="day-status">{count ? <Check size={14} strokeWidth={2.75} /> : <span className="day-dot" />}</span>
          </div>
        ))}
      </div>
      <div className="calendar-foot">
        <span><span className="legend-dot done" />Sesi tercatat</span>
        <span>{weekRuns} sesi {weekOffset === 0 ? 'minggu ini' : 'pada minggu ini'}</span>
      </div>
    </section>
  );
}
