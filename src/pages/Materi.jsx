import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Clock3,
  Coins,
  Droplets,
  Landmark,
  Moon,
  ScrollText,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { publicFetch } from '../lib/api';

const materiHero = '/assets/img/materi.png';
const ease = [0.22, 1, 0.36, 1];

const reveal = {
  hidden: {
    opacity: 0,
    y: 24
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease
    }
  }
};

const leftReveal = {
  hidden: {
    opacity: 0,
    x: -30
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease
    }
  }
};

const rightReveal = {
  hidden: {
    opacity: 0,
    x: 30,
    scale: 0.97
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease
    }
  }
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const getCategories = (material) => {
  return material?.categories
    ?.map((item) => item.category)
    .filter(Boolean) || [];
};

const getPrimaryCategory = (material) => {
  return getCategories(material)[0]?.name || 'Umum';
};

const getDescription = (material) => {
  return material?.excerpt ||
    material?.description ||
    'Belum ada deskripsi untuk materi ini.';
};

const getReadingTime = (material) => {
  return material?.readTimeMinutes
    ? `${material.readTimeMinutes} menit`
    : 'Bebas';
};

const getMaterialIcon = (material) => {
  const category = getPrimaryCategory(material).toLowerCase();
  const title = material?.title?.toLowerCase() || '';

  if (
    category.includes('siklus') ||
    title.includes('haid') ||
    title.includes('nifas') ||
    title.includes('istihadah')
  ) {
    return <Droplets size={21} />;
  }

  if (
    category.includes('shalat') ||
    category.includes('salat') ||
    title.includes('shalat') ||
    title.includes('salat')
  ) {
    return <ScrollText size={21} />;
  }

  if (
    category.includes('zakat') ||
    title.includes('zakat')
  ) {
    return <Coins size={21} />;
  }

  if (
    category.includes('ibadah') ||
    title.includes('puasa')
  ) {
    return <Moon size={21} />;
  }

  if (
    category.includes('fikih') ||
    category.includes('fiqih')
  ) {
    return <Landmark size={21} />;
  }

  return <BookOpen size={21} />;
};

function LoadingCard() {
  return (
    <div className="h-[290px] animate-pulse rounded-[22px] border border-white bg-white p-5 shadow-sm sm:p-6">
      <div className="h-11 w-11 rounded-[14px] bg-[#F7E7EA]" />
      <div className="mt-6 h-3 w-16 rounded-full bg-[#F7E7EA]" />
      <div className="mt-3 h-7 w-2/3 rounded-lg bg-gray-100" />
      <div className="mt-3 h-12 w-full rounded-lg bg-gray-100" />
      <div className="mt-8 h-8 w-full rounded-lg bg-gray-100" />
    </div>
  );
}

export default function Materi() {
  const reduceMotion = useReducedMotion();

  const [materials, setMaterials] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [mouse, setMouse] = useState({
    x: 50,
    y: 50
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMaterials = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const result = await publicFetch('/materials?limit=100', {
        signal
      });

      const items = result?.data?.items || [];

      setMaterials(items);

      setActiveId((current) => {
        if (current && items.some((item) => item.id === current)) {
          return current;
        }

        return items[0]?.id || null;
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }

      console.error('Load materials:', error);

      setMaterials([]);
      setActiveId(null);
      setError(
        error.message || 'Gagal memuat materi.'
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadMaterials(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadMaterials]);

  const filters = useMemo(() => {
    const categoryNames = materials
      .flatMap((material) =>
        getCategories(material).map(
          (category) => category.name
        )
      )
      .filter(Boolean)
      .filter(
        (value, index, array) =>
          array.indexOf(value) === index
      );

    return ['Semua', ...categoryNames];
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    if (activeFilter === 'Semua') {
      return materials;
    }

    return materials.filter((material) =>
      getCategories(material).some(
        (category) =>
          category.name === activeFilter
      )
    );
  }, [materials, activeFilter]);

  const selectedMaterial = useMemo(() => {
    return (
      filteredMaterials.find(
        (material) => material.id === activeId
      ) ||
      filteredMaterials[0] ||
      null
    );
  }, [filteredMaterials, activeId]);

  const handleMouseMove = (event) => {
    if (reduceMotion) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    setMouse({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    });
  };

  const handleSelect = (id) => {
    setActiveId(id);
  };

  const scrollToMaterials = () => {
    document
      .getElementById('explore')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
  };

  const topicCount = String(materials.length).padStart(2, '0');

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FAF7F5] text-[#171115] selection:bg-[#7A1025] selection:text-white">
      <Navbar />

      <main>
        <section onMouseMove={handleMouseMove} className="relative isolate min-h-[calc(100svh-68px)] overflow-hidden pt-[68px]">
          <img src={materiHero} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />

          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#FAF7F5] via-[#FAF7F5]/92 to-[#FAF7F5]/35 md:from-[#FAF7F5] md:via-[#FAF7F5]/85 md:to-transparent" />

          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#FAF7F5] via-transparent to-transparent" />

          <div className="absolute inset-0 -z-10 transition-all duration-700" style={{ background: `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, rgba(122,16,37,0.12), transparent 24%)` }} />

          <motion.div animate={reduceMotion ? undefined : { y: [0, -10, 0], x: [0, 8, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute right-[8%] top-[20%] hidden h-32 w-32 rounded-full bg-white/30 blur-3xl md:block" />

          <motion.div animate={reduceMotion ? undefined : { y: [0, 8, 0], x: [0, -6, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[20%] right-[28%] hidden h-20 w-20 rounded-full bg-[#7A1025]/10 blur-3xl md:block" />

          <div className="relative mx-auto flex min-h-[calc(100svh-68px)] max-w-7xl items-center px-4 py-10 sm:px-6 md:px-8">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10 max-w-[600px]">
              <motion.div variants={reveal} className="mb-5 flex items-center gap-2 text-[10px] font-semibold text-gray-500 sm:text-xs">
                <span>Home</span>
                <span className="text-[#7A1025]/40">/</span>
                <span className="text-[#7A1025]">Materi</span>
              </motion.div>

              <motion.div variants={reveal} className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8CDD2] bg-white/75 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#7A1025] shadow-sm backdrop-blur-md sm:text-[10px]">
                <Sparkles size={12} />
                Interactive Materi Explorer
              </motion.div>

              <motion.h1 variants={reveal} className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-[#151113] sm:text-5xl lg:text-[60px]">
                Pahami Ibadah,
                <br />
                <span className="text-[#7A1025]">Satu Materi</span> Demi Satu.
              </motion.h1>

              <motion.p variants={reveal} className="mt-5 max-w-[530px] text-sm leading-6 text-gray-600 sm:text-[15px]">
                Temukan materi yang paling sesuai dengan kebutuhanmu. Baca, pahami, lalu lanjutkan ke tahap berikutnya dengan cara belajar yang lebih interaktif.
              </motion.p>

              <motion.div variants={reveal} className="mt-6 flex flex-wrap gap-2.5">
                <button type="button" onClick={scrollToMaterials} className="group flex items-center gap-2 rounded-2xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#7A1025]/15 transition duration-300 hover:-translate-y-1 hover:bg-[#650D1F] hover:shadow-xl sm:text-sm">
                  <BookOpenCheck size={15} />
                  Mulai Eksplorasi
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/65 px-4 py-2.5 text-xs font-medium text-gray-600 shadow-sm backdrop-blur-md">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F6E5E8] text-[#7A1025]">
                    <BookOpen size={12} />
                  </span>

                  {loading
                    ? 'Memuat materi...'
                    : `${materials.length} topik pembelajaran`}
                </div>
              </motion.div>

              <motion.div variants={reveal} className="mt-7 flex items-center gap-4">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-[#7A1025]">
                    {topicCount}
                  </span>

                  <span className="pb-1 text-[9px] uppercase tracking-[0.16em] text-gray-500">
                    Topik
                  </span>
                </div>

                <span className="h-8 w-px bg-gray-300" />

                <div>
                  <p className="text-[10px] font-semibold text-gray-700">
                    Konten dari CMS
                  </p>

                  <p className="mt-0.5 text-[9px] text-gray-500">
                    Hanya materi yang sudah published.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section id="explore" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6 md:px-8 md:py-14">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={leftReveal} className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-0.5 w-7 rounded-full bg-[#7A1025]" />

              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#7A1025]">
                Materi Explorer
              </span>
            </div>

            <h2 className="font-display text-3xl font-bold leading-[1.02] tracking-tight text-[#171115] sm:text-4xl">
              Pilih yang ingin
              <br />
              kamu pahami.
            </h2>

            <p className="mt-3 max-w-xl text-xs leading-6 text-gray-500 sm:text-sm">
              Pilih topik yang paling relevan dengan kebutuhanmu saat ini.
            </p>
          </motion.div>

          {filters.length > 1 && (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} className="mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {filters.map((filter) => (
                <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-semibold transition-all duration-300 sm:text-xs ${activeFilter === filter ? 'bg-[#7A1025] text-white shadow-lg shadow-[#7A1025]/15' : 'border border-[#E6D9DB] bg-white text-gray-500 hover:border-[#CFAEB5] hover:text-[#7A1025]'}`}>
                  {filter}
                </button>
              ))}
            </motion.div>
          )}

          {error && (
            <div className="mt-6 rounded-[22px] border border-red-100 bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-700">
                Gagal memuat materi
              </p>

              <p className="mt-1 text-xs leading-5 text-red-500">
                {error}
              </p>

              <button type="button" onClick={() => loadMaterials()} className="mt-4 rounded-xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#650D1F]">
                Coba Lagi
              </button>
            </div>
          )}

          {!error && loading && (
            <div className="mt-6 grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingCard key={index} />
              ))}
            </div>
          )}

          {!loading && !error && filteredMaterials.length === 0 && (
            <div className="mt-6 rounded-[22px] border border-[#E8D5D9] bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7E7EA] text-[#7A1025]">
                <BookOpen size={22} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-[#171115]">
                Belum ada materi
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-500">
                Belum ada konten published dari CMS untuk kategori ini.
              </p>
            </div>
          )}

          {!loading && !error && filteredMaterials.length > 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.08 }} variants={stagger} className="mt-5 grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map((item, index) => {
                const selected = selectedMaterial?.id === item.id;
                const category = getPrimaryCategory(item);

                return (
                  <motion.article key={item.id} variants={reveal} whileHover={reduceMotion ? undefined : { y: -5 }} className={`group relative overflow-hidden rounded-[22px] border p-5 transition-all duration-300 sm:p-6 ${selected ? 'border-[#CFA9B1] bg-[#FFF9FA] shadow-[0_18px_45px_rgba(122,16,37,0.11)]' : 'border-white bg-white shadow-[0_10px_30px_rgba(65,25,35,0.06)] hover:border-[#E8D5D9] hover:shadow-[0_16px_40px_rgba(65,25,35,0.09)]'}`}>
                    <div className={`absolute inset-x-0 top-0 h-1 transition-all duration-300 ${selected ? 'bg-[#7A1025]' : 'bg-transparent group-hover:bg-[#E8CDD2]'}`} />

                    {item.coverImage && (
                      <div className="mb-4 overflow-hidden rounded-2xl border border-[#F0E2E5] bg-[#F8F0F2]">
                        <img src={item.coverImage} alt="" loading="lazy" className="h-28 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                      </div>
                    )}

                    <div className="relative z-10 flex items-start justify-between gap-4">
                      <button type="button" onClick={() => handleSelect(item.id)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-all duration-300 ${selected ? 'bg-[#7A1025] text-white shadow-lg shadow-[#7A1025]/20' : 'bg-[#F7E7EA] text-[#7A1025] group-hover:bg-[#F2DDE1]'}`}>
                        {getMaterialIcon(item)}
                      </button>

                      <span className={`font-mono text-[10px] font-semibold tracking-[0.14em] ${selected ? 'text-[#7A1025]' : 'text-gray-300'}`}>
                        {String(item.order || index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="relative z-10 mt-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#F7EBED] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#8D3146]">
                          {category}
                        </span>

                        {selected && (
                          <span className="rounded-full bg-[#7A1025]/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#7A1025]">
                            Dipilih
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 line-clamp-2 font-display text-[22px] font-bold leading-[1.03] text-[#171115]">
                        {item.title}
                      </h3>

                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                        {getDescription(item)}
                      </p>

                      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                        <div className="flex flex-wrap items-center gap-3 text-[9px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <BookOpen size={11} />
                            {item.quizRequired ? 'Kuis wajib' : 'Mandiri'}
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock3 size={11} />
                            {getReadingTime(item)}
                          </span>
                        </div>

                        <Link to={`/materi/${item.slug}`} onClick={() => handleSelect(item.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7E7EA] text-[#7A1025] transition-all duration-300 hover:bg-[#7A1025] hover:text-white">
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>

                    <motion.div animate={reduceMotion ? undefined : { rotate: [0, 4, 0, -4, 0], scale: [1, 1.03, 1] }} transition={{ duration: 8 + index, repeat: Infinity, ease: 'easeInOut' }} className={`absolute bottom-[-55px] right-[-45px] h-40 w-40 rounded-full blur-3xl ${selected ? 'bg-[#7A1025]/8' : 'bg-[#7A1025]/4'}`} />
                  </motion.article>
                );
              })}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {selectedMaterial && (
              <motion.div key={selectedMaterial.id} initial={{ opacity: 0, y: 15, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.99 }} transition={{ duration: 0.35, ease }} className="relative mt-5 overflow-hidden rounded-[22px] border border-[#E8D5D9] bg-[#FFF9FA] p-5 shadow-[0_14px_40px_rgba(65,25,35,0.06)] sm:p-6">
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[#7A1025]/5 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7A1025] text-white">
                      <BookOpenCheck size={18} />
                    </div>

                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7A1025]">
                        Materi Terpilih
                      </span>

                      <h3 className="mt-1 font-display text-xl font-bold text-[#171115] sm:text-2xl">
                        {selectedMaterial.title}
                      </h3>

                      <p className="mt-1 max-w-[600px] text-xs leading-5 text-gray-500 sm:text-sm">
                        {getDescription(selectedMaterial)}
                      </p>
                    </div>
                  </div>

                  <Link to={`/materi/${selectedMaterial.slug}`} className="group flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-[#7A1025]/10 transition duration-300 hover:-translate-y-1 hover:bg-[#650D1F] md:w-auto">
                    Baca Materi
                    <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="relative overflow-hidden border-t border-[#EEE2DE] bg-[#F8F3F0]">
          <motion.div animate={reduceMotion ? undefined : { x: [0, 10, 0], y: [0, -6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute -left-16 top-0 h-40 w-40 rounded-full bg-[#7A1025]/5 blur-3xl" />

          <motion.div animate={reduceMotion ? undefined : { x: [0, -8, 0], y: [0, 8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} className="absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-[#7A1025]/5 blur-3xl" />

          <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-4 py-9 sm:px-6 md:flex-row md:items-center md:justify-between md:px-8 md:py-11">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={leftReveal} className="max-w-xl">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#7A1025] sm:text-[10px]">
                NUSA BOT
              </span>

              <h2 className="mt-2 font-display text-2xl font-bold leading-[1.05] text-[#171115] sm:text-3xl">
                Belajar sesuai kebutuhanmu.
              </h2>

              <p className="mt-2.5 text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
                Pilih topik, baca materi, lalu lanjutkan ke pengalaman belajar berikutnya.
              </p>
            </motion.div>

            <motion.button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={rightReveal} whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.97 }} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A1025] px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-[#7A1025]/15 transition duration-300 hover:bg-[#650D1F] sm:w-auto">
              Kembali ke Atas
              <ArrowRight size={15} className="-rotate-90 transition-transform duration-300 group-hover:-translate-y-1" />
            </motion.button>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-[10px] text-gray-500 sm:px-6 sm:text-xs md:flex-row md:items-center md:justify-between md:px-8">
          <span>© 2026 Nusa Bot. Sahabat Belajar Ibadah.</span>
          <span>Literasi Fiqih • Belajar dengan teknologi</span>
        </div>
      </footer>
    </div>
  );
}