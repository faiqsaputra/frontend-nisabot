import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity, AlertCircle, ArrowRight, BrainCircuit, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, Droplets, Filter, Info, Plus, RefreshCw,
  Search, Sparkles, Trash2, X, Pencil, Sun, HeartPulse
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../lib/api';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const FORECAST_COUNT = 6;
const DAY_MS = 86400000;
const RECORD_TYPES = {
  HAID: { label: 'Haid', color: '#A41635', light: '#F9E7EC', text: '#7A1025' },
  NIFAS: { label: 'Nifas', color: '#BC8291', light: '#F7ECEF', text: '#75424F' },
  ISTIHADHAH: { label: 'Istihadhah', color: '#80616B', light: '#F0E9EC', text: '#62404A' }
};
const ease = [0.22, 1, 0.36, 1];

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDate(value) {
  if (!value) return null;
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}

function addDays(value, amount) {
  const date = typeof value === 'string' ? parseDate(value) : new Date(value);
  if (!date) return null;
  date.setDate(date.getDate() + amount);
  return formatDate(date);
}

function dayDifference(start, end) {
  const first = parseDate(start);
  const last = parseDate(end);
  if (!first || !last) return null;
  return Math.round((Date.UTC(last.getFullYear(), last.getMonth(), last.getDate()) - Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) / DAY_MS);
}

function formatLongDate(value) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) : '—';
}

function formatShortDate(value) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date) : '—';
}

function formatMonthYear(value) {
  const date = parseDate(value);
  return date ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}` : '—';
}

function normalizeRecord(record) {
  const type = String(record?.type || 'HAID').toUpperCase();
  return {
    ...record,
    id: record?.id,
    type: RECORD_TYPES[type] ? type : 'HAID',
    startDate: String(record?.startDate || '').slice(0, 10),
    endDate: record?.endDate ? String(record.endDate).slice(0, 10) : null
  };
}

function normalizePrediction(response) {
  const value = response?.data?.prediction || response?.prediction || response?.data || response || {};
  const nextPeriodStart = value.nextPeriodStart || value.predictedStart || null;
  const nextPeriodEnd = value.nextPeriodEnd || value.predictedEnd || null;
  const averageCycleLength = Number(value.averageCycleLength ?? value.predictedCycleLength) || null;
  const averagePeriodLength = Number(value.averagePeriodLength) || null;
  const available = Boolean(value.predictionsAvailable ?? value.available ?? (nextPeriodStart && Number(value.cycleCount) > 0));
  return {
    ...value,
    available,
    nextPeriodStart,
    nextPeriodEnd,
    averageCycleLength,
    averagePeriodLength,
    fertileWindowStart: value.fertileWindowStart || null,
    fertileWindowEnd: value.fertileWindowEnd || null,
    ovulationDate: value.ovulationDate || null,
    daysUntilNextPeriod: Number.isFinite(Number(value.daysUntilNextPeriod)) ? Number(value.daysUntilNextPeriod) : null,
    message: value.message || value.reason || 'Tambahkan tanggal mulai haid untuk membangun perkiraan siklus.'
  };
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const offset = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    const date = day < 1
      ? new Date(year, month - 1, new Date(year, month, 0).getDate() + day)
      : day > totalDays
        ? new Date(year, month + 1, day - totalDays)
        : new Date(year, month, day);
    return { date, currentMonth: date.getMonth() === month };
  });
}

function isDateInRange(date, start, end) {
  return Boolean(start && end && date >= start && date <= end);
}

function getRecordsForDate(date, records) {
  const today = formatDate(new Date());
  return records.filter(record => record.startDate && date >= record.startDate && date <= (record.endDate || today));
}

function calculateAverageCycle(records) {
  const starts = records.filter(record => record.type === 'HAID' && record.startDate).map(record => record.startDate).sort();
  const intervals = [];
  for (let index = 1; index < starts.length; index += 1) {
    const days = dayDifference(starts[index - 1], starts[index]);
    if (days >= 15 && days <= 60) intervals.push(days);
  }
  const recent = intervals.slice(-6);
  return { intervals, average: recent.length ? Math.round(recent.reduce((sum, value) => sum + value, 0) / recent.length) : null };
}

function calculateAveragePeriod(records) {
  const durations = records.filter(record => record.type === 'HAID' && record.startDate && record.endDate)
    .map(record => dayDifference(record.startDate, record.endDate) + 1)
    .filter(value => value >= 1 && value <= 15);
  const recent = durations.slice(-6);
  return recent.length ? Math.round(recent.reduce((sum, value) => sum + value, 0) / recent.length) : null;
}

function buildForecasts(records, prediction, averageCycleFromHistory, averagePeriodFromHistory) {
  const today = formatDate(new Date());
  const pastOrCurrentHaid = records.filter(record => record.type === 'HAID' && record.startDate && record.startDate <= today).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const latest = pastOrCurrentHaid[0];
  if (!latest) return { forecasts: [], cycleLength: null, periodLength: null, personalized: false };

  const personalized = Boolean(averageCycleFromHistory);
  const cycleLength = averageCycleFromHistory || (prediction?.averageCycleLength && prediction.available ? prediction.averageCycleLength : DEFAULT_CYCLE_LENGTH);
  const periodLength = prediction?.averagePeriodLength || averagePeriodFromHistory || DEFAULT_PERIOD_LENGTH;
  let nextStart = prediction?.nextPeriodStart || addDays(latest.startDate, cycleLength);
  if (!parseDate(nextStart)) nextStart = addDays(latest.startDate, cycleLength);

  // Move a stale estimate forward, without mutating the recorded history.
  let guard = 0;
  while (nextStart < today && guard < 24) {
    nextStart = addDays(nextStart, cycleLength);
    guard += 1;
  }

  const forecasts = Array.from({ length: FORECAST_COUNT }, (_, index) => {
    const start = addDays(nextStart, index * cycleLength);
    const end = addDays(start, periodLength - 1);
    const ovulation = addDays(start, -14);
    return {
      index: index + 1,
      start,
      end,
      ovulation,
      fertileStart: addDays(ovulation, -5),
      fertileEnd: addDays(ovulation, 1)
    };
  });
  return { forecasts, cycleLength, periodLength, personalized };
}

function IconButton({ children, onClick, label, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9DDE0] bg-white text-[#55444A] transition hover:border-[#C78D9A] hover:bg-[#FFF7F8] hover:text-[#7A1025] disabled:cursor-not-allowed disabled:opacity-40">{children}</button>;
}

function StatusBadge({ type }) {
  const status = RECORD_TYPES[type];
  if (!status) return null;
  return <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: status.light, color: status.text }}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />{status.label}</span>;
}

function StatCard({ label, value, caption, icon: Icon, accent = false }) {
  return <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }} className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${accent ? 'border-[#7A1025] bg-[#7A1025] text-white shadow-[0_12px_28px_rgba(122,16,37,0.15)]' : 'border-[#EEE4E5] bg-white text-[#211419]'}`}><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent ? 'bg-white/15 text-white' : 'bg-[#F9E9ED] text-[#7A1025]'}`}><Icon size={19} /></div><p className={`mt-4 text-xs font-semibold uppercase tracking-[0.12em] ${accent ? 'text-white/70' : 'text-[#8D7D82]'}`}>{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className={`mt-1 text-xs leading-5 ${accent ? 'text-white/75' : 'text-[#8D7D82]'}`}>{caption}</p></motion.div>;
}

function RecordForm({ initialData, saving, onClose, onSubmit }) {
  const [form, setForm] = useState({ type: initialData?.type || 'HAID', startDate: initialData?.startDate || formatDate(new Date()), endDate: initialData?.endDate || '' });
  const [error, setError] = useState('');
  const editing = Boolean(initialData?.id);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!parseDate(form.startDate)) return setError('Tanggal mulai tidak valid.');
    if (form.endDate && !parseDate(form.endDate)) return setError('Tanggal selesai tidak valid.');
    if (form.endDate && form.endDate < form.startDate) return setError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    if (form.endDate && ['HAID', 'NIFAS'].includes(form.type)) {
      const duration = dayDifference(form.startDate, form.endDate) + 1;
      const max = form.type === 'HAID' ? 15 : 60;
      if (duration > max) return setError(`Durasi ${RECORD_TYPES[form.type].label.toLowerCase()} tidak boleh melebihi ${max} hari. Periksa kembali aturan aplikasi yang digunakan.`);
    }
    try {
      await onSubmit({ type: form.type, startDate: form.startDate, endDate: form.endDate || null });
    } catch (submitError) {
      setError(submitError.message || 'Catatan gagal disimpan.');
    }
  }

  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-[#211419]/55 p-4 backdrop-blur-sm" onMouseDown={onClose}><motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }} onMouseDown={event => event.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#F1E8E9] px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#A41635]">Jurnal siklus</p><h2 className="mt-1 text-2xl font-bold text-[#211419]">{editing ? 'Edit catatan' : 'Catat siklus baru'}</h2><p className="mt-1 text-sm text-[#8D7D82]">Simpan tanggal agar kalender dan estimasi diperbarui.</p></div><IconButton onClick={onClose} label="Tutup form"><X size={18} /></IconButton></div><form onSubmit={handleSubmit} className="space-y-5 p-6"><div><label className="mb-2 block text-sm font-semibold text-[#4C3D42]">Jenis pencatatan</label><div className="grid grid-cols-3 gap-2">{Object.entries(RECORD_TYPES).map(([type, status]) => <button key={type} type="button" onClick={() => setForm(current => ({ ...current, type }))} aria-pressed={form.type === type} className="rounded-xl border px-2 py-3 text-sm font-semibold transition" style={{ borderColor: form.type === type ? status.color : '#E9E1E2', backgroundColor: form.type === type ? status.light : '#FFFFFF', color: form.type === type ? status.text : '#74666B' }}>{status.label}</button>)}</div></div><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="cycle-start" className="mb-2 block text-sm font-semibold text-[#4C3D42]">Tanggal mulai</label><input id="cycle-start" type="date" required value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value, endDate: current.endDate && current.endDate < event.target.value ? '' : current.endDate }))} className="w-full rounded-xl border border-[#E7DCDD] bg-[#FFFCFC] px-3 py-3 text-sm outline-none focus:border-[#B96B7A] focus:ring-2 focus:ring-[#7A1025]/10" /></div><div><label htmlFor="cycle-end" className="mb-2 block text-sm font-semibold text-[#4C3D42]">Tanggal selesai</label><input id="cycle-end" type="date" value={form.endDate} min={form.startDate} onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))} className="w-full rounded-xl border border-[#E7DCDD] bg-[#FFFCFC] px-3 py-3 text-sm outline-none focus:border-[#B96B7A] focus:ring-2 focus:ring-[#7A1025]/10" /><p className="mt-1.5 text-xs text-[#9A8B90]">Kosongkan jika masih berlangsung.</p></div></div>{error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}<p className="rounded-xl bg-[#FBF5F6] p-4 text-sm leading-6 text-[#76676C]">Pencatatan ini membantu mendokumentasikan tanggal. Kalender tidak otomatis menetapkan hukum fikih dari jenis darah.</p><div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#E7DCDD] px-4 py-3 text-sm font-semibold text-[#67585D] transition hover:bg-[#FCF8F8]">Batal</button><button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[#7A1025] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#650D1F] disabled:cursor-wait disabled:opacity-60">{saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan catatan'}</button></div></form></motion.div></motion.div>;
}

export default function Kalender() {
  const reduceMotion = useReducedMotion();
  const [records, setRecords] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [viewDate, setViewDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [showPredictions, setShowPredictions] = useState(true);
  const [notification, setNotification] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('ALL');
  const [historySearch, setHistorySearch] = useState('');
  const [historyError, setHistoryError] = useState('');

  const notify = useCallback((message, type = 'success') => setNotification({ message, type }), []);

  const loadRecords = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setHistoryError('');
    try {
      const [historyResult, predictionResult] = await Promise.allSettled([
        apiFetch('/cycles?limit=100&offset=0'),
        apiFetch('/cycles/prediction?limit=24')
      ]);
      if (historyResult.status === 'fulfilled') {
        const response = historyResult.value;
        const items = Array.isArray(response?.data) ? response.data : Array.isArray(response?.data?.items) ? response.data.items : Array.isArray(response?.items) ? response.items : [];
        setRecords(items.map(normalizeRecord));
      } else {
        const message = historyResult.reason?.message || 'Riwayat gagal dimuat dari backend.';
        setHistoryError(message);
        notify(message, 'error');
      }
      if (predictionResult.status === 'fulfilled') {
        setPrediction(normalizePrediction(predictionResult.value));
      } else {
        setPrediction(null);
        if (historyResult.status === 'fulfilled') notify('Riwayat berhasil dimuat, tetapi prediksi belum dapat diambil: ' + (predictionResult.reason?.message || 'koneksi API gagal.'), 'info');
      }
      return historyResult.status === 'fulfilled';
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.startDate.localeCompare(a.startDate)), [records]);
  const haidRecords = useMemo(() => sortedRecords.filter(record => record.type === 'HAID'), [sortedRecords]);
  const cycleStats = useMemo(() => calculateAverageCycle(haidRecords), [haidRecords]);
  const averagePeriodFromHistory = useMemo(() => calculateAveragePeriod(haidRecords), [haidRecords]);
  const forecastData = useMemo(() => buildForecasts(haidRecords, prediction, cycleStats.average, averagePeriodFromHistory), [haidRecords, prediction, cycleStats.average, averagePeriodFromHistory]);
  const forecasts = forecastData.forecasts;
  const hasPersonalPrediction = forecastData.personalized;
  const displayCycleLength = hasPersonalPrediction ? forecastData.cycleLength : cycleStats.average;
  const calendarDays = useMemo(() => getCalendarDays(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const selectedRecords = useMemo(() => getRecordsForDate(selectedDate, records), [selectedDate, records]);
  const selectedRecord = selectedRecords[0] || null;
  const selectedForecast = forecasts.find(item => isDateInRange(selectedDate, item.start, item.end));
  const selectedFertile = forecasts.some(item => isDateInRange(selectedDate, item.fertileStart, item.fertileEnd));
  const selectedOvulation = forecasts.some(item => item.ovulation === selectedDate);
  const typeCounts = useMemo(() => Object.fromEntries(Object.keys(RECORD_TYPES).map(type => [type, records.filter(record => record.type === type).length])), [records]);
  const filteredRecords = useMemo(() => sortedRecords.filter(record => (historyFilter === 'ALL' || record.type === historyFilter) && (!historySearch || `${RECORD_TYPES[record.type]?.label} ${record.startDate} ${record.endDate || ''}`.toLowerCase().includes(historySearch.toLowerCase().trim()))), [sortedRecords, historyFilter, historySearch]);
  const todayString = formatDate(new Date());

  function changeMonth(amount) { setViewDate(current => new Date(current.getFullYear(), current.getMonth() + amount, 1)); }
  function goToday() { const date = new Date(); setViewDate(new Date(date.getFullYear(), date.getMonth(), 1)); setSelectedDate(formatDate(date)); }
  function openCreateForm(type = 'HAID', date = selectedDate) { setEditingRecord({ type, startDate: date, endDate: null }); setModalOpen(true); }
  function openEditForm(record) { setEditingRecord(record); setModalOpen(true); }
  function closeForm() { if (!saving) { setModalOpen(false); setEditingRecord(null); } }
  function scrollToCalendar() { document.getElementById('calendar-dashboard')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }
  function jumpToForecast(item) { const date = parseDate(item.start); if (!date) return; setSelectedDate(item.start); setViewDate(new Date(date.getFullYear(), date.getMonth(), 1)); scrollToCalendar(); }

  async function handleSave(data) {
    setSaving(true);
    try {
      const payload = { type: data.type, startDate: data.startDate, endDate: data.endDate || null };
      if (editingRecord?.id) await apiFetch(`/cycles/${editingRecord.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await apiFetch('/cycles', { method: 'POST', body: JSON.stringify(payload) });
      const loaded = await loadRecords({ silent: true });
      if (!loaded) throw new Error('Catatan tersimpan, tetapi riwayat terbaru gagal dimuat. Muat ulang untuk memastikan perubahan.');
      setSelectedDate(data.startDate);
      const start = parseDate(data.startDate);
      if (start) setViewDate(new Date(start.getFullYear(), start.getMonth(), 1));
      setModalOpen(false);
      setEditingRecord(null);
      notify(editingRecord?.id ? 'Catatan berhasil diperbarui.' : 'Catatan berhasil disimpan. Estimasi diperbarui dari riwayat terbaru.');
    } catch (error) {
      notify(error.message || 'Gagal menyimpan catatan.', 'error');
      throw error;
    } finally { setSaving(false); }
  }

  async function handleDelete(record) {
    if (!window.confirm(`Hapus catatan ${RECORD_TYPES[record.type]?.label || record.type} tanggal ${formatLongDate(record.startDate)}?`)) return;
    try {
      await apiFetch(`/cycles/${record.id}`, { method: 'DELETE' });
      await loadRecords({ silent: true });
      notify('Catatan berhasil dihapus. Perkiraan telah dimuat ulang.');
    } catch (error) { notify(error.message || 'Gagal menghapus catatan.', 'error'); }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const result = await apiFetch('/cycles/prediction?limit=24');
      setPrediction(normalizePrediction(result));
      const normalized = normalizePrediction(result);
      notify(normalized.available ? 'Perkiraan personal diperbarui berdasarkan riwayat HAID.' : 'Perkiraan awal diperbarui. Catat lebih banyak awal haid untuk meningkatkan ketepatan.', normalized.available ? 'success' : 'info');
    } catch (error) { notify(error.message || 'Perkiraan gagal diperbarui.', 'error'); }
    finally { setAnalyzing(false); }
  }

  const recommendations = (() => {
    const items = [];
    if (!haidRecords.length) {
      items.push({ title: 'Mulai dari tanggal awal haid', body: 'Simpan tanggal hari pertama haid. Tanggal inilah yang dipakai untuk menghitung jarak antarsiklus.', action: 'Catat haid', onAction: () => openCreateForm('HAID'), icon: CalendarDays });
    } else if (cycleStats.intervals.length === 0) {
      items.push({ title: 'Perkiraan masih berupa pola awal', body: 'Saat ini kalender memakai asumsi awal 28 hari. Catat awal haid berikutnya agar interval personal mulai dapat dihitung.', action: 'Tambah catatan haid', onAction: () => openCreateForm('HAID'), icon: Activity });
    } else if (cycleStats.intervals.length < 3) {
      items.push({ title: 'Bangun riwayat yang lebih konsisten', body: 'Ada interval yang bisa dihitung, tetapi datanya masih terbatas. Catatan pada beberapa siklus berikutnya membantu memperbarui rata-rata.', action: 'Lihat riwayat', onAction: () => document.getElementById('cycle-history')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), icon: Sparkles });
    } else {
      items.push({ title: 'Lanjutkan pencatatan rutin', body: `Rata-rata dihitung dari interval HAID valid terbaru. Saat tanggal mulai baru dicatat, kalender akan menghitung ulang perkiraan berikutnya.`, action: 'Perbarui perkiraan', onAction: handleAnalyze, icon: CheckCircle2 });
    }
    if (haidRecords.some(record => !record.endDate)) {
      items.push({ title: 'Lengkapi tanggal selesai', body: 'Beberapa catatan HAID belum memiliki tanggal selesai. Lengkapi ketika periode selesai agar durasi rata-rata dapat dihitung.', action: 'Buka catatan terbaru', onAction: () => { const record = haidRecords.find(item => !item.endDate); if (record) openEditForm(record); }, icon: Droplets });
    } else {
      items.push({ title: 'Catatan jenis lain tetap manual', body: 'Nifas dan istihadhah tampil sebagai riwayat, tetapi tidak diproyeksikan seperti siklus haid karena tidak tepat diasumsikan berulang secara periodik.', action: 'Catat nifas', onAction: () => openCreateForm('NIFAS'), icon: HeartPulse });
    }
    return items.slice(0, 2);
  })();

  return <div className="min-h-screen overflow-x-hidden bg-[#FBF8F7] text-[#24191D]">
    <Navbar />
    <main>
      <section className="relative isolate overflow-hidden border-b border-[#EFDFE2] bg-gradient-to-br from-[#FFF8F9] via-[#FBF5F4] to-[#F2E2E6]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-80 w-80 rounded-full bg-[#A41635]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-[38%] h-44 w-44 rounded-full bg-[#D4A017]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8 lg:py-16">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }} className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E8CDD4] bg-white/85 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#7A1025]"><BrainCircuit size={15} /> Kalender siklus Nusa Bot</span>
              <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem]">Kenali ritme tubuhmu,<span className="block text-[#8F1731]">rencanakan dengan tenang.</span></h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#75656A] sm:text-lg">Satu ruang untuk mencatat haid, nifas, dan istihadhah, meninjau riwayat, dan melihat perkiraan siklus beberapa bulan ke depan.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button type="button" onClick={scrollToCalendar} className="inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(122,16,37,0.18)] transition hover:-translate-y-0.5 hover:bg-[#650D1F]"><CalendarDays size={17} />Buka kalender</button>
                <button type="button" onClick={() => openCreateForm('HAID')} className="inline-flex items-center gap-2 rounded-xl border border-[#DFC2C9] bg-white px-5 py-3.5 text-sm font-semibold text-[#7A1025] transition hover:border-[#BD8491] hover:bg-[#FFF9FA]"><Plus size={17} />Catat siklus</button>
                <button type="button" onClick={handleAnalyze} disabled={analyzing} className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-3.5 text-sm font-semibold text-[#7A1025] transition hover:bg-white/70 disabled:opacity-60"><RefreshCw size={16} className={analyzing ? 'animate-spin' : ''} />{analyzing ? 'Menghitung…' : 'Perbarui analisis'}</button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-3 rounded-[34px] bg-[#7A1025]/10 blur-2xl" />
              <div className="relative rounded-[30px] border border-white/80 bg-white/75 p-6 shadow-[0_20px_60px_rgba(87,25,41,0.10)] backdrop-blur">
                <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9B7B83]">Perkiraan berikutnya</p><p className="mt-2 text-2xl font-bold text-[#7A1025]">{forecasts[0] ? formatLongDate(forecasts[0].start) : 'Mulai catat siklus'}</p></div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9E7EC] text-[#A41635]"><Droplets size={22} /></span></div>
                <div className="mt-6 rounded-2xl bg-[#FBF4F5] p-4"><div className="flex items-center justify-between text-sm"><span className="text-[#7F6C72]">Panjang siklus</span><strong className="text-[#3C2A30]">{forecastData.cycleLength ? `${forecastData.cycleLength} hari` : 'Belum ada'}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EAD9DE]"><div className="h-full rounded-full bg-[#A41635]" style={{ width: `${Math.min(100, (forecastData.cycleLength || DEFAULT_CYCLE_LENGTH) / 40 * 100)}%` }} /></div><p className="mt-2 text-xs leading-5 text-[#89767C]">{hasPersonalPrediction ? 'Dihitung dari interval riwayat HAID.' : 'Proyeksi awal memakai asumsi 28 hari, belum personal.'}</p></div>
                <div className="mt-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6EFE0] text-[#9B7212]"><Sun size={18} /></span><div><p className="text-sm font-semibold text-[#3C2A30]">Perkiraan masa subur</p><p className="mt-0.5 text-xs text-[#89767C]">{forecasts[0] ? `${formatShortDate(forecasts[0].fertileStart)} – ${formatShortDate(forecasts[0].fertileEnd)}` : 'Tampil setelah ada catatan haid'}</p></div></div>
              </div>
            </div>
          </motion.div>
          <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={CalendarDays} label="Total catatan" value={loading ? '…' : records.length} caption="Riwayat akunmu" />
            <StatCard icon={Clock3} label="Rata-rata siklus" value={displayCycleLength ? `${displayCycleLength} hari` : '—'} caption={hasPersonalPrediction ? 'Berdasarkan riwayat HAID' : 'Menunggu interval personal'} />
            <StatCard icon={Droplets} label="Catatan haid" value={typeCounts.HAID || 0} caption="Awal haid tersimpan" />
            <StatCard icon={Sparkles} label="Proyeksi" value={forecasts.length ? `${forecasts.length} siklus` : '—'} caption={hasPersonalPrediction ? 'Perkiraan dari data personal' : forecasts.length ? 'Proyeksi awal 28 hari' : 'Tambahkan catatan HAID'} accent />
          </div>
        </div>
      </section>

      <section id="calendar-dashboard" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <AnimatePresence>{notification && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} role="status" className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${notification.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : notification.type === 'info' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-[#E8D5D9] bg-white text-[#7A1025]'}`}><span className="mt-0.5 shrink-0">{notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</span><p className="flex-1 leading-6">{notification.message}</p><button type="button" onClick={() => setNotification(null)} aria-label="Tutup notifikasi"><X size={16} /></button></motion.div>}</AnimatePresence>
          {historyError && <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Riwayat belum dapat dimuat</p><p className="mt-1">{historyError}</p></div><button type="button" onClick={() => loadRecords()} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white">Coba lagi</button></div>}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
            <section className="overflow-hidden rounded-[28px] border border-[#EFE3E5] bg-white shadow-[0_14px_42px_rgba(58,24,34,0.055)]">
              <div className="flex items-center justify-between bg-gradient-to-r from-[#741027] to-[#991B3A] px-4 py-5 text-white sm:px-6"><IconButton onClick={() => changeMonth(-1)} label="Bulan sebelumnya"><ChevronLeft size={19} /></IconButton><div className="text-center"><h2 className="text-xl font-bold sm:text-2xl">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</h2><button type="button" onClick={goToday} className="mt-1 text-xs text-white/75 transition hover:text-white">Kembali ke hari ini</button></div><IconButton onClick={() => changeMonth(1)} label="Bulan berikutnya"><ChevronRight size={19} /></IconButton></div>
              <div className="p-3 sm:p-6"><div className="mb-3 grid grid-cols-7">{WEEKDAYS.map((day, index) => <div key={day} className={`py-2 text-center text-xs font-semibold ${index === 0 ? 'text-[#A41635]' : 'text-[#9A898E]'}`}>{day}</div>)}</div>
                <div className="grid grid-cols-7 overflow-hidden rounded-2xl border-l border-t border-[#F0E8E9]">{calendarDays.map(({ date, currentMonth }) => {
                  const dateKey = formatDate(date);
                  const dayRecords = getRecordsForDate(dateKey, records);
                  const record = dayRecords[0];
                  const forecast = showPredictions ? forecasts.find(item => isDateInRange(dateKey, item.start, item.end)) : null;
                  const fertile = showPredictions && !record && forecasts.some(item => isDateInRange(dateKey, item.fertileStart, item.fertileEnd));
                  const ovulation = showPredictions && !record && forecasts.some(item => item.ovulation === dateKey);
                  const selected = selectedDate === dateKey;
                  const isToday = dateKey === todayString;
                  const status = record ? RECORD_TYPES[record.type] : null;
                  let background = currentMonth ? 'bg-white' : 'bg-[#FCFAFA]';
                  if (status) background = '';
                  else if (forecast) background = 'bg-[#F9E5EA]';
                  else if (ovulation) background = 'bg-[#FFF1C9]';
                  else if (fertile) background = 'bg-[#E7F4EF]';
                  return <button key={dateKey} type="button" onClick={() => setSelectedDate(dateKey)} aria-pressed={selected} aria-label={`${formatLongDate(dateKey)}${status ? `, ${RECORD_TYPES[record.type].label}` : forecast ? ', perkiraan haid' : fertile ? ', perkiraan masa subur' : ''}`} className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 border-b border-r border-[#F0E8E9] transition sm:min-h-[78px] ${background} ${selected ? 'z-10 ring-2 ring-inset ring-[#7A1025]' : 'hover:bg-[#FFF6F8]'} ${!currentMonth ? 'opacity-55' : ''}`} style={status ? { backgroundColor: status.light } : undefined}>
                    <span className={`text-sm font-semibold sm:text-base ${status ? '' : forecast ? 'text-[#7A1025]' : ovulation ? 'text-[#785600]' : currentMonth ? 'text-[#514047]' : 'text-[#B9AEB1]'}`} style={status ? { color: status.text } : undefined}>{date.getDate()}</span>
                    <span className="flex h-2 items-center justify-center gap-1">{status && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />}{!status && forecast && <span className="h-1.5 w-1.5 rounded-full bg-[#A41635]" />}{!status && !forecast && ovulation && <span className="h-1.5 w-1.5 rounded-full bg-[#D4A017]" />}{!status && !forecast && !ovulation && fertile && <span className="h-1.5 w-1.5 rounded-full bg-[#37836B]" />}{dayRecords.length > 1 && <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />}</span>
                    {isToday && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#7A1025]" />}
                  </button>;
                })}</div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-3 rounded-2xl bg-[#FCF8F8] p-4">{Object.entries(RECORD_TYPES).map(([type, status]) => <span key={type} className="flex items-center gap-2 text-xs text-[#76676C]"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />{status.label}</span>)}<span className="flex items-center gap-2 text-xs text-[#76676C]"><span className="h-2.5 w-2.5 rounded-full bg-[#A41635]" />Perkiraan haid</span><span className="flex items-center gap-2 text-xs text-[#76676C]"><span className="h-2.5 w-2.5 rounded-full bg-[#37836B]" />Masa subur</span><span className="flex items-center gap-2 text-xs text-[#76676C]"><span className="h-2.5 w-2.5 rounded-full bg-[#D4A017]" />Ovulasi</span></div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-[#74656A]"><input type="checkbox" checked={showPredictions} onChange={event => setShowPredictions(event.target.checked)} className="h-4 w-4 accent-[#7A1025]" />Tampilkan perkiraan</label><button type="button" onClick={() => openCreateForm('HAID', selectedDate)} className="inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#650D1F]"><Plus size={16} />Catat tanggal dipilih</button></div>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-[26px] border border-[#EFE3E5] bg-white p-5 shadow-[0_12px_35px_rgba(58,24,34,0.045)] sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A41635]">Tanggal dipilih</p><h2 className="mt-2 text-xl font-bold text-[#27191E]">{formatLongDate(selectedDate)}</h2></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F9E7EC] text-[#A41635]"><CalendarDays size={20} /></span></div><div className="mt-4">{selectedRecord ? <div className="flex flex-wrap items-center gap-2"><StatusBadge type={selectedRecord.type} /><span className="text-sm text-[#8B7B80]">{selectedRecord.endDate ? `${(dayDifference(selectedRecord.startDate, selectedRecord.endDate) ?? 0) + 1} hari tercatat` : 'Masih berlangsung'}</span></div> : selectedForecast ? <div className="space-y-2"><StatusBadge type="HAID" /><p className="text-sm text-[#64545A]">Tanggal ini berada dalam perkiraan HAID ke-{selectedForecast.index}.</p></div> : selectedOvulation ? <p className="rounded-xl bg-[#FFF8E3] p-3 text-sm text-[#775C10]">Perkiraan ovulasi. Ini hanya estimasi kalender.</p> : selectedFertile ? <p className="rounded-xl bg-[#ECF7F1] p-3 text-sm text-[#28644F]">Perkiraan rentang masa subur. Tidak dapat digunakan sebagai kontrasepsi.</p> : <p className="text-sm text-[#8B7B80]">Belum ada catatan atau perkiraan pada tanggal ini.</p>}</div>{selectedRecord && <div className="mt-4 flex gap-2"><button type="button" onClick={() => openEditForm(selectedRecord)} className="inline-flex items-center gap-2 rounded-xl border border-[#E9DDE0] px-4 py-2.5 text-sm font-semibold text-[#6D555D] hover:bg-[#FCF7F8]"><Pencil size={15} />Edit</button><button type="button" onClick={() => handleDelete(selectedRecord)} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={15} />Hapus</button></div>}</section>

              <section className="rounded-[26px] border border-[#EBD4DA] bg-gradient-to-br from-[#FFF6F8] to-white p-5 shadow-[0_12px_35px_rgba(58,24,34,0.04)] sm:p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F9E7EC] text-[#A41635]"><BrainCircuit size={20} /></span><div><h2 className="text-lg font-bold text-[#7A1025]">Analisis siklus</h2><p className="mt-0.5 text-sm text-[#8B7B80]">Perkiraan dari riwayat HAID</p></div></div>{forecasts[0] ? <><p className="mt-5 text-sm text-[#88777D]">Perkiraan HAID berikutnya</p><p className="mt-1 text-2xl font-bold tracking-tight text-[#7A1025]">{formatLongDate(forecasts[0].start)}</p><p className="mt-1 text-sm text-[#6E5D63]">Perkiraan selesai {formatLongDate(forecasts[0].end)}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white bg-white/90 p-3.5"><p className="text-xs text-[#8E7D83]">Panjang siklus</p><p className="mt-1 text-xl font-bold text-[#312329]">{forecastData.cycleLength} hari</p></div><div className="rounded-2xl border border-white bg-white/90 p-3.5"><p className="text-xs text-[#8E7D83]">Durasi perkiraan</p><p className="mt-1 text-xl font-bold text-[#312329]">{forecastData.periodLength} hari</p></div></div><div className={`mt-4 rounded-xl px-3.5 py-3 text-sm leading-6 ${hasPersonalPrediction ? 'bg-[#EAF5EF] text-[#2F6652]' : 'bg-[#FFF5DF] text-[#75591A]'}`}>{hasPersonalPrediction ? 'Perkiraan personal dihitung dari interval haid yang tercatat.' : 'Proyeksi awal memakai asumsi 28 hari dan belum dapat dianggap sebagai pola personal.'}</div>{forecasts[0].fertileStart && <div className="mt-4 space-y-2 text-sm text-[#6C5C62]"><p className="flex items-start gap-2"><Sun size={16} className="mt-0.5 shrink-0 text-[#B18413]" /><span>Masa subur perkiraan: <strong>{formatShortDate(forecasts[0].fertileStart)} – {formatShortDate(forecasts[0].fertileEnd)}</strong></span></p><p className="flex items-start gap-2"><Activity size={16} className="mt-0.5 shrink-0 text-[#8D6A15]" /><span>Ovulasi perkiraan: <strong>{formatLongDate(forecasts[0].ovulation)}</strong></span></p></div>}</> : <div className="mt-5 rounded-2xl bg-white p-4"><p className="font-semibold text-[#4C3D42]">Belum ada dasar proyeksi</p><p className="mt-1 text-sm leading-6 text-[#8B7B80]">Tambahkan minimal satu catatan HAID untuk menampilkan proyeksi awal. Dua tanggal mulai atau lebih diperlukan untuk menghitung interval personal.</p></div>}<button type="button" onClick={handleAnalyze} disabled={analyzing || loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#650D1F] disabled:cursor-wait disabled:opacity-60"><RefreshCw size={16} className={analyzing ? 'animate-spin' : ''} />{analyzing ? 'Memperbarui…' : 'Perbarui perkiraan'}</button><p className="mt-3 text-xs leading-5 text-[#8B7B80]">Perkiraan siklus, ovulasi, dan masa subur tidak pasti serta bukan diagnosis atau alat kontrasepsi.</p></section>

              <section className="rounded-[26px] border border-[#EFE3E5] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Ringkasan catatan</h2><p className="mt-1 text-sm text-[#8B7B80]">Jenis yang tersimpan</p></div><Activity size={19} className="text-[#A41635]" /></div><div className="mt-4 space-y-3">{Object.entries(RECORD_TYPES).map(([type, status]) => { const latest = sortedRecords.find(record => record.type === type); return <div key={type} className="flex items-center gap-3 rounded-xl border border-[#F2EAEB] p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: status.light, color: status.text }}><Droplets size={17} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#382930]">{status.label}</p><p className="mt-0.5 truncate text-xs text-[#8B7B80]">{latest ? `${formatShortDate(latest.startDate)}${latest.endDate ? ` – ${formatShortDate(latest.endDate)}` : ' · Berlangsung'}` : 'Belum ada catatan'}</p></div><span className="min-w-5 text-right text-sm font-bold">{typeCounts[type] || 0}</span><button type="button" onClick={() => openCreateForm(type)} className="rounded-lg border border-[#E9DDE0] px-3 py-2 text-xs font-semibold text-[#7A1025] transition hover:bg-[#FFF7F8]">Catat</button></div>; })}</div></section>
            </div>
          </div>

          <section className="mt-8 rounded-[28px] border border-[#EFE3E5] bg-white p-5 shadow-[0_12px_36px_rgba(65,25,35,0.035)] sm:p-7"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#A41635]">Jadwal ke depan</p><h2 className="mt-1 text-2xl font-bold">Proyeksi siklus beberapa bulan</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#827177]">Tanggal berikut dibangun dari rata-rata interval HAID. Pilih salah satu untuk melihat bulannya di kalender.</p></div><span className={`mt-2 inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${hasPersonalPrediction ? 'bg-[#EAF5EF] text-[#2F6652]' : 'bg-[#FFF5DF] text-[#75591A]'}`}>{hasPersonalPrediction ? 'Berdasarkan riwayat personal' : 'Proyeksi awal · 28 hari'}</span></div>
            {loading ? <div className="py-10 text-center text-sm text-[#8B7B80]">Memuat jadwal…</div> : forecasts.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{forecasts.map(item => <motion.button key={`${item.index}-${item.start}`} type="button" whileHover={reduceMotion ? undefined : { y: -3 }} onClick={() => jumpToForecast(item)} className="group rounded-2xl border border-[#EFE3E5] bg-gradient-to-br from-white to-[#FFFAFB] p-4 text-left transition hover:border-[#D6ADB6] hover:shadow-md sm:p-5"><div className="flex items-center justify-between gap-2"><span className="rounded-lg bg-[#F9E7EC] px-2.5 py-1.5 text-xs font-bold text-[#7A1025]">Siklus {item.index}</span><ArrowRight size={16} className="text-[#B89AA2] transition group-hover:translate-x-1 group-hover:text-[#7A1025]" /></div><p className="mt-4 text-lg font-bold text-[#322229]">{formatLongDate(item.start)}</p><p className="mt-1 text-sm text-[#837278]">sampai {formatLongDate(item.end)}</p><div className="mt-4 border-t border-[#F0E6E8] pt-3"><p className="text-xs text-[#8B7B80]">Masa subur (estimasi)</p><p className="mt-1 text-sm font-semibold text-[#386D59]">{formatShortDate(item.fertileStart)} – {formatShortDate(item.fertileEnd)}</p><p className="mt-1 text-xs text-[#8B7B80]">Ovulasi: {formatShortDate(item.ovulation)}</p></div></motion.button>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-[#E7D4D9] bg-[#FFFAFB] p-8 text-center"><CalendarDays size={27} className="mx-auto text-[#B78D98]" /><p className="mt-3 text-base font-semibold">Belum ada jadwal perkiraan</p><p className="mt-1 text-sm text-[#8B7B80]">Catat tanggal mulai HAID agar Nusa Bot dapat membuat proyeksi awal.</p><button type="button" onClick={() => openCreateForm('HAID')} className="mt-4 rounded-xl bg-[#7A1025] px-4 py-3 text-sm font-semibold text-white hover:bg-[#650D1F]">Tambah catatan HAID</button></div>}
          </section>

          <section className="mt-8"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#A41635]">Saran untukmu</p><h2 className="mt-1 text-2xl font-bold">Langkah berikutnya</h2><p className="mt-2 text-sm text-[#827177]">Rekomendasi pencatatan berdasarkan kelengkapan riwayatmu.</p></div><div className="mt-5 grid gap-4 md:grid-cols-2">{recommendations.map(item => { const Icon = item.icon; return <article key={item.title} className="rounded-[24px] border border-[#EFE3E5] bg-white p-5 shadow-sm sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F9E7EC] text-[#A41635]"><Icon size={20} /></span><h3 className="mt-4 text-lg font-bold text-[#302128]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#817177]">{item.body}</p><button type="button" onClick={item.onAction} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E7D3D9] px-4 py-2.5 text-sm font-semibold text-[#7A1025] transition hover:bg-[#FFF7F8]">{item.action}<ArrowRight size={15} /></button></article>; })}</div></section>

          <section id="cycle-history" className="mt-8 rounded-[28px] border border-[#EFE3E5] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#A41635]">Riwayat</p><h2 className="mt-1 text-2xl font-bold">Semua catatan siklus</h2><p className="mt-2 text-sm text-[#827177]">Catatan akunmu, diurutkan dari tanggal terbaru.</p></div><div className="grid gap-2 sm:grid-cols-[180px_minmax(200px,1fr)_auto]"><label className="relative"><span className="sr-only">Filter jenis catatan</span><Filter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8B90]" /><select aria-label="Filter jenis catatan" value={historyFilter} onChange={event => setHistoryFilter(event.target.value)} className="w-full appearance-none rounded-xl border border-[#E7DCDD] bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-[#B96B7A]"><option value="ALL">Semua jenis</option>{Object.entries(RECORD_TYPES).map(([type, status]) => <option key={type} value={type}>{status.label}</option>)}</select></label><label className="relative"><span className="sr-only">Cari riwayat</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8B90]" /><input value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Cari jenis atau tanggal…" className="w-full rounded-xl border border-[#E7DCDD] py-3 pl-9 pr-3 text-sm outline-none focus:border-[#B96B7A]" /></label><button type="button" onClick={() => loadRecords()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DCDD] px-4 py-3 text-sm font-semibold text-[#69575D] transition hover:bg-[#FCF8F8] disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Muat ulang</button></div></div>
            {loading ? <div className="py-14 text-center text-sm text-[#8B7B80]">Memuat riwayat…</div> : filteredRecords.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredRecords.map(record => <article key={record.id} className="overflow-hidden rounded-2xl border border-[#F0E7E8] bg-white transition hover:border-[#D6ADB6] hover:shadow-sm"><div className="h-1.5" style={{ backgroundColor: RECORD_TYPES[record.type]?.color || '#7A1025' }} /><div className="p-5"><div className="flex items-start justify-between gap-3"><StatusBadge type={record.type} /><span className="text-xs text-[#8B7B80]">{record.endDate ? `${(dayDifference(record.startDate, record.endDate) ?? 0) + 1} hari` : 'Berlangsung'}</span></div><h3 className="mt-4 text-base font-bold text-[#302128]">{formatLongDate(record.startDate)}</h3><p className="mt-1 text-sm text-[#837278]">{record.endDate ? `Selesai ${formatLongDate(record.endDate)}` : 'Tanggal selesai belum diisi'}</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => { setSelectedDate(record.startDate); const date = parseDate(record.startDate); if (date) setViewDate(new Date(date.getFullYear(), date.getMonth(), 1)); scrollToCalendar(); }} className="flex-1 rounded-xl border border-[#E7DCDD] px-3 py-2.5 text-sm font-semibold text-[#69575D] hover:bg-[#FCF8F8]">Lihat kalender</button><button type="button" onClick={() => openEditForm(record)} className="rounded-xl border border-[#E7DCDD] p-2.5 text-[#7A1025] hover:bg-[#FFF7F8]" aria-label="Edit catatan"><Pencil size={16} /></button><button type="button" onClick={() => handleDelete(record)} className="rounded-xl border border-red-100 p-2.5 text-red-600 hover:bg-red-50" aria-label="Hapus catatan"><Trash2 size={16} /></button></div></div></article>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[#E7D4D9] bg-[#FFFAFB] px-4 py-12 text-center"><CalendarDays size={30} className="mx-auto text-[#B78D98]" /><p className="mt-4 text-base font-semibold text-[#4C3D42]">{records.length ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan'}</p><p className="mt-1 text-sm text-[#8B7B80]">{records.length ? 'Coba kata pencarian atau filter lainnya.' : 'Simpan catatan pertama untuk mulai melihat riwayat dan proyeksi.'}</p>{!records.length && <button type="button" onClick={() => openCreateForm('HAID')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#7A1025] px-4 py-3 text-sm font-semibold text-white hover:bg-[#650D1F]"><Plus size={16} />Tambah catatan</button>}</div>}
          </section>

          <aside className="mt-6 flex items-start gap-3 rounded-2xl border border-[#EBD9DD] bg-white p-5"><Info size={19} className="mt-0.5 shrink-0 text-[#7A1025]" /><div><h3 className="text-sm font-bold text-[#7A1025]">Catatan tentang perkiraan</h3><p className="mt-1 text-sm leading-6 text-[#817177]">Proyeksi bulan berikutnya hanya untuk HAID. NIFAS dan ISTIHADHAH tetap dicatat sebagai riwayat dan tidak diprediksi sebagai siklus berulang. Semua tanggal, ovulasi, dan masa subur merupakan estimasi kalender, bukan kepastian medis atau kontrasepsi. Untuk penetapan hukum fikih dari suatu kasus, gunakan rujukan yang sesuai dan konsultasikan kepada ahli yang kompeten.</p></div></aside>
        </div>
      </section>
    </main>
    <footer className="border-t border-[#EFE3E5] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-[#8B7B80] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><span>© 2026 Nusa Bot · Sahabat Belajar Ibadah</span><span>Literasi fikih · Kalender siklus</span></div></footer>
    <AnimatePresence>{modalOpen && <RecordForm key={editingRecord?.id || `new-${editingRecord?.type}-${editingRecord?.startDate}`} initialData={editingRecord} saving={saving} onClose={closeForm} onSubmit={handleSave} />}</AnimatePresence>
  </div>;
}