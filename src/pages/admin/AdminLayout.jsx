import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronRight, Menu, Search, X } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/materi': 'Materi',
  '/admin/kuis': 'Kuis',
  '/admin/pengguna': 'Pengguna',
  '/admin/knowledge-base': 'Knowledge Base',
  '/admin/aktivitas': 'Aktivitas',
  '/admin/pengaturan': 'Pengaturan'
};

const searchablePages = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Materi', path: '/admin/materi' },
  { label: 'Kuis', path: '/admin/kuis' },
  { label: 'Pengguna', path: '/admin/pengguna' },
  { label: 'Knowledge Base', path: '/admin/knowledge-base' },
  { label: 'Aktivitas', path: '/admin/aktivitas' },
  { label: 'Pengaturan', path: '/admin/pengaturan' }
];

const notifications = [
  {
    id: 1,
    title: 'Selamat datang di CMS',
    message: 'Kelola materi dan aktivitas Nusa Bot dari dashboard ini.',
    time: 'Baru saja'
  },
  {
    id: 2,
    title: 'Sistem aktif',
    message: 'Backend dan database siap digunakan.',
    time: '5 menit lalu'
  }
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const pageTitle = pageTitles[location.pathname] || 'Admin CMS';

  const searchResults = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) return searchablePages.slice(0, 5);

    return searchablePages
      .filter((page) => page.label.toLowerCase().includes(query))
      .slice(0, 5);
  }, [searchValue]);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setNotificationOpen(false);
    setProfileOpen(false);
    setSearchValue('');
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => searchRef.current?.focus(), 50);
      }

      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchNavigate = (path) => {
    navigate(path);
    setSearchValue('');
    setSearchOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#F4ECEE] font-sans">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="h-screen min-w-0 overflow-y-auto overflow-x-hidden lg:ml-[260px]">
        <div className="min-h-full p-3 sm:p-4 lg:p-5">
          <div className="relative flex min-h-[calc(100vh-24px)] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(80,20,30,0.08)] sm:min-h-[calc(100vh-32px)]">
            <header className="sticky top-0 z-40 shrink-0 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => setMobileOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-[#7A1025] transition hover:border-[#E5C5CC] hover:bg-[#F6E5E8] lg:hidden" aria-label="Buka sidebar">
                    <Menu size={18} />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#9B5265]">
                      <span>Admin CMS</span>
                      <ChevronRight size={11} />
                      <span className="text-gray-400">{pageTitle}</span>
                    </div>

                    <motion.h1 key={pageTitle} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="truncate text-lg font-bold tracking-[-0.02em] text-[#0F172A] sm:text-xl">
                      {pageTitle}
                    </motion.h1>
                  </div>
                </div>

                <div className="relative flex items-center gap-2">
                  <div className="relative hidden md:block">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                    <input ref={searchRef} type="search" value={searchValue} onFocus={() => setSearchOpen(true)} onChange={(event) => setSearchValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && searchResults[0]) handleSearchNavigate(searchResults[0].path); }} placeholder="Cari halaman..." className="h-9 w-[210px] rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-16 text-[11px] text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:w-[250px] focus:border-[#D7A8B2] focus:bg-white focus:ring-4 focus:ring-[#F6E5E8]" />

                    <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[9px] font-medium text-gray-400 lg:block">
                      Ctrl K
                    </span>

                    <AnimatePresence>
                      {searchOpen && (
                        <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }} transition={{ duration: 0.16 }} className="absolute right-0 top-12 z-50 w-[280px] overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_20px_50px_rgba(40,15,25,0.12)]">
                          <div className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-400">
                            Quick navigation
                          </div>

                          {searchResults.length > 0 ? (
                            searchResults.map((page) => (
                              <button key={page.path} type="button" onClick={() => handleSearchNavigate(page.path)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-medium text-gray-600 transition hover:bg-[#F9EEF0] hover:text-[#7A1025]">
                                <span>{page.label}</span>
                                <ChevronRight size={14} />
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-xs text-gray-400">
                              Tidak ada halaman yang cocok.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button type="button" onClick={() => { setNotificationOpen((value) => !value); setProfileOpen(false); setSearchOpen(false); }} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-[#E5C5CC] hover:bg-[#F6E5E8] hover:text-[#7A1025]" aria-label="Notifikasi">
                    <Bell size={16} strokeWidth={1.8} />
                    <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#D4A017]" />
                  </button>

                  <AnimatePresence>
                    {notificationOpen && (
                      <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.16 }} className="absolute right-12 top-12 z-50 w-[310px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_20px_50px_rgba(40,15,25,0.12)]">
                        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">Notifikasi</p>
                            <p className="text-[10px] text-gray-400">Aktivitas terbaru</p>
                          </div>

                          <button type="button" onClick={() => setNotificationOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-2">
                          {notifications.map((notification) => (
                            <div key={notification.id} className="rounded-xl px-3 py-3 transition hover:bg-[#FCF7F8]">
                              <div className="flex items-start gap-3">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D4A017]" />

                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-800">
                                    {notification.title}
                                  </p>

                                  <p className="mt-1 text-[11px] leading-5 text-gray-500">
                                    {notification.message}
                                  </p>

                                  <p className="mt-1.5 text-[9px] font-medium text-gray-400">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative">
                    <button type="button" onClick={() => { setProfileOpen((value) => !value); setNotificationOpen(false); setSearchOpen(false); }} className="hidden items-center gap-2 rounded-xl border border-gray-200 px-2.5 py-1.5 transition hover:border-[#E5C5CC] hover:bg-[#FDF7F8] sm:flex">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F6E5E8] text-[9px] font-bold text-[#7A1025]">
                        A
                      </div>

                      <div className="text-left">
                        <p className="text-[11px] font-semibold leading-none text-gray-700">Admin</p>
                        <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#9B5265]">Administrator</p>
                      </div>
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.16 }} className="absolute right-0 top-12 z-50 w-[190px] overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_20px_50px_rgba(40,15,25,0.12)]">
                          <div className="mb-1 rounded-xl bg-[#FCF5F6] px-3 py-2.5">
                            <p className="text-xs font-semibold text-gray-800">Administrator</p>
                            <p className="mt-1 text-[10px] text-gray-400">Nusa Bot CMS</p>
                          </div>

                          <button type="button" onClick={() => navigate('/')} className="flex w-full items-center rounded-xl px-3 py-2.5 text-xs font-medium text-gray-600 transition hover:bg-[#F9EEF0] hover:text-[#7A1025]">
                            Kembali ke aplikasi
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="min-h-full">
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}