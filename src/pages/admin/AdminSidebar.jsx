import { AnimatePresence, motion } from 'framer-motion';
import { Activity, BookOpen, VideoIcon, ChevronRight, Database, FileText, LayoutDashboard, LogOut, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const workspaceNavigation = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Materi', path: '/admin/materi', icon: BookOpen },
  { label: 'Video', path: '/admin/video', icon: VideoIcon },
  { label: 'Kuis', path: '/admin/kuis', icon: FileText },
  { label: 'Pengguna', path: '/admin/pengguna', icon: Users },
  { label: 'Knowledge Base', path: '/admin/knowledge-base', icon: Database }
];

const systemNavigation = [
  { label: 'Aktivitas', path: '/admin/aktivitas', icon: Activity },
  { label: 'Pengaturan', path: '/admin/pengaturan', icon: Settings }
];

const isActivePath = (currentPath, targetPath) => {
  if (targetPath === '/admin') return currentPath === '/admin';
  return currentPath.startsWith(targetPath);
};

export default function AdminSidebar({ mobileOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = path => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Admin logout error:', error);
      return;
    }

    navigate('/login', { replace: true });
  };

  const renderNavigation = items => (
    <nav className="space-y-0.5">
      {items.map(item => {
        const Icon = item.icon;
        const active = isActivePath(location.pathname, item.path);

        return (
          <motion.button key={item.path} type="button" onClick={() => handleNavigate(item.path)} whileTap={{ scale: 0.99 }} className={`group relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 ${active ? 'bg-white/[0.09] text-white' : 'text-white/48 hover:bg-white/[0.045] hover:text-white/85'}`}>
            {active && (
              <motion.span layoutId="admin-active-indicator" transition={{ type: 'spring', stiffness: 420, damping: 32 }} className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#D4A017]" />
            )}

            <Icon size={17} strokeWidth={active ? 2 : 1.7} className={`shrink-0 transition-colors ${active ? 'text-[#F0C95A]' : 'text-white/38 group-hover:text-white/70'}`} />

            <span className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[-0.01em]">
              {item.label}
            </span>

            <ChevronRight size={13} className={`shrink-0 transition-all duration-200 ${active ? 'translate-x-0 opacity-60' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-35'}`} />
          </motion.button>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col bg-[#68101F]">
      <div className="shrink-0 px-5 pb-6 pt-5">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => handleNavigate('/admin')} className="flex min-w-0 items-center gap-3.5 text-left">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-[#FCF8F5]">
              <img src="/assets/logo/logo.png" alt="Nusa Bot" className="h-[25px] w-[25px] object-contain" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-display text-[14px] font-semibold tracking-[-0.02em] text-white">
                  NISKA
                </p>

                <span className="rounded-full border border-[#F0C95A]/20 bg-[#F0C95A]/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-[#F0C95A]">
                  CMS
                </span>
              </div>

              <p className="mt-1 text-[9px] font-medium tracking-[0.01em] text-white/35">
                Content management workspace
              </p>
            </div>
          </button>

          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center text-white/40 transition hover:text-white lg:hidden" aria-label="Tutup sidebar">
            <X size={17} />
          </button>
        </div>
      </div>

      <div className="mx-5 border-t border-white/[0.08]" />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-6 scrollbar-none">
        <div>
          <p className="mb-2 px-3 text-[8px] font-bold uppercase tracking-[0.22em] text-white/25">
            Workspace
          </p>

          {renderNavigation(workspaceNavigation)}
        </div>

        <div className="mt-8">
          <p className="mb-2 px-3 text-[8px] font-bold uppercase tracking-[0.22em] text-white/25">
            System
          </p>

          {renderNavigation(systemNavigation)}
        </div>

        <div className="mt-9 px-3">
          <div className="flex items-center gap-2.5 border-t border-white/[0.08] pt-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F0C95A]/10 text-[#F0C95A]">
              <ShieldCheck size={13} strokeWidth={1.8} />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <p className="text-[9px] font-semibold text-white/75">
                  Administrator access
                </p>
              </div>

              <p className="mt-0.5 truncate text-[8px] text-white/30">
                Protected workspace
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
        <button type="button" onClick={handleLogout} className="group flex w-full items-center gap-3 px-3 py-2.5 text-left text-white/45 transition hover:text-white">
          <LogOut size={16} strokeWidth={1.7} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          <span className="text-[11px] font-medium">Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] overflow-hidden lg:block">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button type="button" aria-label="Tutup sidebar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden" />

            <motion.aside initial={{ x: -248 }} animate={{ x: 0 }} exit={{ x: -248 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }} className="fixed inset-y-0 left-0 z-50 w-[248px] overflow-hidden shadow-[10px_0_40px_rgba(0,0,0,0.16)] lg:hidden">
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}