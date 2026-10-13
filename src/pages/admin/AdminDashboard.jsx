import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  Plus,
  Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const statCards = [
  { key: 'users', label: 'Pengguna', description: 'Total pengguna', icon: Users },
  { key: 'materials', label: 'Materi', description: 'Konten pembelajaran', icon: BookOpen },
  { key: 'quizzes', label: 'Kuis', description: 'Kuis tersedia', icon: ClipboardList },
  { key: 'questions', label: 'Pertanyaan', description: 'Soal tersimpan', icon: FileText }
];

const quickActions = [
  { label: 'Tambah Materi', description: 'Buat materi pembelajaran baru', path: '/admin/materi', icon: BookOpen },
  { label: 'Buat Kuis', description: 'Kelola soal dan evaluasi', path: '/admin/kuis', icon: ClipboardList },
  { label: 'Kelola Pengguna', description: 'Lihat pengguna Nusa Bot', path: '/admin/pengguna', icon: Users },
  { label: 'Knowledge Base', description: 'Kelola sumber pengetahuan', path: '/admin/knowledge-base', icon: Database }
];

const statusClass = {
  DRAFT: 'bg-gray-100 text-gray-500',
  REVIEW: 'bg-amber-50 text-amber-700',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  ARCHIVED: 'bg-red-50 text-red-600'
};

function StatCard({ label, value, description, icon: Icon, index, loading }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_25px_rgba(80,20,30,0.035)] transition-all duration-300 hover:-translate-y-1 hover:border-[#E8CDD2] hover:shadow-[0_15px_30px_rgba(80,20,30,0.07)]">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F6E5E8] text-[#7A1025]">
          <Icon size={18} strokeWidth={1.8} />
        </div>

        <ArrowUpRight size={15} className="text-gray-300 transition-colors duration-200 group-hover:text-[#7A1025]" />
      </div>

      {loading ? (
        <div className="mt-5">
          <div className="h-7 w-14 animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-3 w-20 animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-2 w-28 animate-pulse rounded bg-gray-100" />
        </div>
      ) : (
        <>
          <p className="mt-5 text-2xl font-bold tracking-tight text-[#0F172A]">{value}</p>
          <p className="mt-1 text-[12px] font-semibold text-gray-800">{label}</p>
          <p className="mt-0.5 text-[10px] text-gray-400">{description}</p>
        </>
      )}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, materials: 0, quizzes: 0, questions: 0 });
  const [recentMaterials, setRecentMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (error || !token) return;

        const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/dashboard`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || 'Gagal memuat dashboard.');
        }

        if (!mounted) return;

        setStats(result.stats || { users: 0, materials: 0, quizzes: 0, questions: 0 });
        setRecentMaterials(result.recentMaterials || []);
      } catch (error) {
        console.error('Admin dashboard:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-7 p-4 sm:p-6 lg:p-8">
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4A017]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9B5265]">Nusa Bot CMS</span>
          </div>

          <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#0F172A] sm:text-3xl">Selamat datang, Admin.</h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Pantau dan kelola ekosistem pembelajaran Nusa Bot dari satu ruang kerja.
          </p>
        </div>

        <Link to="/admin/materi" className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(122,16,37,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#670D20] hover:shadow-[0_12px_25px_rgba(122,16,37,0.2)]">
          <Plus size={15} />
          Tambah Konten
          <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </motion.section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, label, description, icon }, index) => (
          <StatCard key={key} label={label} value={stats[key]} description={description} icon={icon} index={index} loading={loading} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.18 }} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_25px_rgba(80,20,30,0.035)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Materi Terbaru</h3>
              <p className="mt-0.5 text-[10px] text-gray-400">Konten yang terakhir diperbarui.</p>
            </div>

            <Link to="/admin/materi" className="flex items-center gap-1 text-[10px] font-semibold text-[#7A1025] transition hover:text-[#5F0C1D]">
              Lihat semua
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
                    <div className="min-w-0 flex-1">
                      <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
                      <div className="mt-2 h-2 w-24 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>

                  <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
                </div>
              ))
            ) : recentMaterials.length ? (
              recentMaterials.map((material, index) => (
                <motion.div key={material.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: index * 0.04 }} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-200 hover:bg-[#FCF8F9]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FBF8F6] text-[#7A1025]">
                      <BookOpen size={15} strokeWidth={1.8} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-gray-800">{material.title}</p>
                      <p className="mt-1 text-[10px] text-gray-400">{new Date(material.updatedAt).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold ${statusClass[material.status] || 'bg-gray-100 text-gray-500'}`}>
                    {material.status}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#F6E5E8] text-[#7A1025]">
                  <BookOpen size={18} />
                </div>

                <p className="mt-3 text-xs font-semibold text-gray-600">Belum ada materi</p>
                <p className="mt-1 text-[10px] text-gray-400">Mulai dengan membuat materi pertama.</p>

                <Link to="/admin/materi" className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#7A1025]">
                  Buat materi
                  <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.24 }} className="relative overflow-hidden rounded-2xl bg-[#7A1025] shadow-[0_15px_35px_rgba(122,16,37,0.14)]">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
          <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full border border-white/10" />
          <div className="absolute right-12 top-16 h-12 w-12 rounded-full border border-[#D4A017]/20" />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-semibold text-white/70">System overview</span>
              <CheckCircle2 size={18} className="text-[#D4A017]" />
            </div>

            <h3 className="mt-5 text-xl font-bold leading-tight text-white">Workspace Nusa Bot</h3>

            <p className="mt-2 text-[11px] leading-5 text-white/60">
              Ringkasan sistem dan modul utama yang sedang digunakan dalam CMS.
            </p>

            <div className="mt-6 space-y-2">
              {[
                { label: 'Authentication', status: 'Active' },
                { label: 'Database', status: 'Connected' },
                { label: 'Admin access', status: 'Protected' }
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/8 px-3.5 py-3">
                  <span className="text-[10px] text-white/60">{item.label}</span>
                  <span className="text-[10px] font-semibold text-white">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#0F172A]">Quick Actions</h3>
          <p className="mt-0.5 text-[10px] text-gray-400">Akses cepat ke pekerjaan utama admin.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ label, description, path, icon: Icon }, index) => (
            <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 + index * 0.05 }}>
              <Link to={path} className="group flex h-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_6px_20px_rgba(80,20,30,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E8CDD2] hover:bg-[#FCF8F9] hover:shadow-[0_10px_25px_rgba(80,20,30,0.06)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F6E5E8] text-[#7A1025] transition-all duration-200 group-hover:bg-[#7A1025] group-hover:text-white">
                  <Icon size={17} strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-gray-800">{label}</p>
                  <p className="mt-1 text-[9px] leading-4 text-gray-400">{description}</p>
                </div>

                <ArrowRight size={14} className="shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#7A1025]" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}