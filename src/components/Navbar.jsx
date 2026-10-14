import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, UserRound, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const navItems = [
  { label: 'Home', href: '/', type: 'route' },
  { label: 'Materi', href: '/materi', type: 'route' },
  { label: 'Video', href: '/video', type: 'route' },
  { label: 'Kuis', href: '/kuis', type: 'route' },
  { label: 'Kalender', href: '/kalender', type: 'route' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const [active, setActive] = useState('Home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to get session:', error);
        setUser(null);
      } else {
        setUser(data.session?.user ?? null);
      }

      setAuthLoading(false);
    };

    loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);

      if (location.pathname !== '/') {
        const routeItem = navItems.find(item => item.type === 'route' && item.href === location.pathname);
        if (routeItem) setActive(routeItem.label);
        return;
      }

      const sections = navItems.map(item => ({
        ...item,
        id: item.href.replace('#', ''),
        el: item.type === 'section' ? document.getElementById(item.href.replace('#', '')) : null
      })).filter(item => item.el);

      if (window.scrollY < 160) {
        setActive('Home');
        return;
      }

      if (!sections.length) return;

      const current = sections.reduce((best, section) => {
        const currentDistance = Math.abs(section.el.getBoundingClientRect().top - 120);
        const bestDistance = Math.abs(best.el.getBoundingClientRect().top - 120);
        return currentDistance < bestDistance ? section : best;
      });

      setActive(current.label);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = item => {
    setMenuOpen(false);

    if (item.type === 'route') {
      setActive(item.label);
      navigate(item.href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (location.pathname !== '/') {
      navigate(`/${item.href.replace('#', '')}`);
      return;
    }

    const target = document.getElementById(item.href.replace('#', ''));

    if (target) {
      setActive(item.label);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', item.href);
    }
  };

  const handleHomeClick = () => {
    setActive('Home');
    setMenuOpen(false);

    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    setMenuOpen(false);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout failed:', error);
      return;
    }

    setUser(null);
    navigate('/login', { replace: true });
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Pengguna';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} className={`fixed inset-x-0 top-0 z-[100] w-full border-b transition-all duration-300 ${scrolled ? 'border-gray-200/80 bg-white/95 shadow-[0_4px_24px_rgba(80,20,30,0.06)] backdrop-blur-xl' : 'border-gray-100/90 bg-white'}`}>
      <div className={`mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 transition-all duration-300 sm:px-7 lg:px-10 ${scrolled ? 'h-[58px]' : 'h-[68px]'}`}>
        <button onClick={handleHomeClick} className="flex shrink-0 items-center gap-2.5 text-left" aria-label="NISQA Home">
          <img src="/assets/logo/logo.png" alt="NISQA" className="h-9 w-9 object-contain" />

          <div className="leading-none">
            <p className="font-display text-[18px] font-bold tracking-[-0.03em] text-[#7A1025]">NISQA</p>
            <p className="mt-1 text-[9px] font-medium text-gray-500">Sahabat Belajar Ibadah</p>
          </div>
        </button>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex" aria-label="Navigasi utama">
          {navItems.map(item => (
            <button key={item.label} onClick={() => handleNavClick(item)} className={`group relative py-1 text-[13px] font-medium transition-colors duration-200 ${active === item.label ? 'text-[#7A1025]' : 'text-gray-600 hover:text-[#7A1025]'}`}>
              {item.label}

              <motion.span initial={false} animate={{ scaleX: active === item.label ? 1 : 0, opacity: active === item.label ? 1 : 0 }} transition={{ duration: 0.2 }} className="absolute bottom-[-7px] left-0 h-[2px] w-full origin-center rounded-full bg-[#7A1025]" />
            </button>
          ))}
        </nav>

        <div ref={profileRef} className="relative hidden md:flex">
          {authLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-[10px] bg-gray-100" />
          ) : user ? (
            <>
              <button type="button" onClick={() => setProfileOpen(value => !value)} className="group flex items-center gap-2 rounded-[10px] border border-[#7A1025]/10 bg-white px-3 py-1.5 text-left shadow-[0_4px_14px_rgba(122,16,37,0.06)] transition-all duration-200 hover:border-[#7A1025]/20 hover:bg-[#FBF8F6]" aria-expanded={profileOpen} aria-haspopup="menu">
                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#F6E5E8] text-[11px] font-bold text-[#7A1025]">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt={userName} className="h-full w-full object-cover" />
                  ) : (
                    userInitial
                  )}
                </div>

                <span className="max-w-[120px] truncate text-[12px] font-semibold text-[#0F172A]">{userName}</span>

                <ChevronDown size={14} className={`text-[#7A1025] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.18 }} className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-[0_15px_40px_rgba(80,20,30,0.12)]" role="menu">
                    <div className="border-b border-gray-100 px-3 py-3">
                      <p className="truncate text-[13px] font-semibold text-[#0F172A]">{userName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-500">{user.email}</p>
                    </div>

                    <button type="button" onClick={handleLogout} className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-medium text-gray-600 transition hover:bg-[#F6E5E8] hover:text-[#7A1025]" role="menuitem">
                      <LogOut size={15} />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <Link to="/login" className="group flex items-center gap-2 rounded-[10px] bg-[#7A1025] px-5 py-2 text-[12px] font-semibold text-white shadow-[0_6px_18px_rgba(122,16,37,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#670d20] hover:shadow-[0_10px_22px_rgba(122,16,37,0.22)] active:translate-y-0">
              <UserRound size={15} strokeWidth={2} />
              Login
            </Link>
          )}
        </div>

        <button onClick={() => setMenuOpen(value => !value)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-[#7A1025] transition duration-200 hover:bg-red-50 md:hidden" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={menuOpen ? 'close' : 'open'} initial={{ opacity: 0, rotate: -45, scale: 0.8 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 45, scale: 0.8 }} transition={{ duration: 0.16 }} className="flex">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden border-t border-gray-100 bg-white md:hidden">
            <div className="mx-auto w-full max-w-[1440px] space-y-1 px-5 py-3 sm:px-7">
              {navItems.map((item, index) => (
                <motion.button key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, delay: index * 0.04 }} onClick={() => handleNavClick(item)} className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${active === item.label ? 'bg-red-50 text-[#7A1025]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#7A1025]'}`}>
                  <span className="flex items-center justify-between">
                    {item.label}
                    {active === item.label && <span className="h-1.5 w-1.5 rounded-full bg-[#7A1025]" />}
                  </span>
                </motion.button>
              ))}

              {!authLoading && (
                user ? (
                  <div className="mt-1 border-t border-gray-100 pt-2">
                    <div className="mb-2 flex items-center gap-3 rounded-lg bg-[#FBF8F6] px-3 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F6E5E8] text-[11px] font-bold text-[#7A1025]">
                        {user.user_metadata?.avatar_url ? (
                          <img src={user.user_metadata.avatar_url} alt={userName} className="h-full w-full object-cover" />
                        ) : (
                          userInitial
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-[#0F172A]">{userName}</p>
                        <p className="truncate text-[10px] text-gray-500">{user.email}</p>
                      </div>
                    </div>

                    <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F6E5E8] px-4 py-2.5 text-[13px] font-semibold text-[#7A1025] transition duration-200 hover:bg-[#EFD3D9]">
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                ) : (
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#7A1025] px-4 py-2.5 text-[13px] font-semibold text-white transition duration-200 hover:bg-[#670d20]">
                    <UserRound size={15} />
                    Login
                  </Link>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}