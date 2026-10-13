import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BarChart3, BookOpen, CalendarDays, Gamepad2, MessageCircle, Play } from 'lucide-react';
import Navbar from '../components/Navbar';

const heroImage = '/assets/img/hero.png';
const maskotImage = '/assets/img/maskot.png';
const ctaImage = '/assets/img/image.png';
const ease = [0.22, 1, 0.36, 1];

const reveal = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease } } };
const leftReveal = { hidden: { opacity: 0, x: -26 }, visible: { opacity: 1, x: 0, transition: { duration: 0.65, ease } } };
const rightReveal = { hidden: { opacity: 0, x: 26, scale: 0.98 }, visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.7, ease } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } } };

const features = [
  { id: 'materi', title: 'Nusa Bot', desc: 'Tanya jawab seputar ibadah dengan AI', icon: <MessageCircle size={20} />, link: '#chat' },
  { id: 'video', title: 'Video Pembelajaran', desc: 'Belajar dengan video interaktif', icon: <Play size={20} />, link: '#video' },
  { id: 'kuis', title: 'Materi dan Kuis', desc: 'Materi lengkap dan kuis untuk menguji pemahaman', icon: <Gamepad2 size={20} />, link: '#kuis' },
  { id: 'kalender', title: 'Kalender Siklus', desc: 'Catat dan pantau siklus ibadah khusus haid', icon: <CalendarDays size={20} />, link: '#kalender' },
];

const statuses = [
  { label: 'Normal', className: 'bg-[#E9C8CF]' },
  { label: 'Haid', className: 'bg-[#C76679]' },
  { label: 'Nifas', className: 'bg-[#971432]' },
  { label: 'Istihadah', className: 'bg-[#731024]' },
];

function SectionHeading({ eyebrow, title, description, children }) {
  return (
    <div className="max-w-xl">
      <div className="mb-3 flex items-center gap-3"><span className="h-0.5 w-8 rounded-full bg-[#7A1025]" /><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{eyebrow}</span></div>
      <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-[#171115] sm:text-4xl lg:text-[44px]">{title}</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-gray-600 sm:text-[15px]">{description}</p>
      {children}
    </div>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBF8F6] text-gray-800 selection:bg-[#7A1025] selection:text-white">
      <Navbar />

      <main>
        <section id="home" className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden bg-[#FDF8F5]">
          <img src={heroImage} alt="" className="absolute inset-y-0 right-0 -z-10 hidden h-full w-[52%] object-cover object-center md:block" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="absolute inset-y-0 right-0 -z-[5] hidden w-[52%] bg-gradient-to-r from-[#FDF8F5] via-transparent to-transparent md:block" />

          <div className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-4 px-4 py-6 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-5 md:px-8 md:py-6 lg:gap-6">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-20 max-w-[500px]">
              <motion.div variants={reveal} className="font-display mb-3 inline-flex items-center gap-2 rounded-full bg-[#F6E5E8] px-3 py-1.5 text-[11px] font-semibold text-[#7A1025] shadow-sm">
                <BookOpen size={14} />
                Sahabat Belajar Ibadah
              </motion.div>

              <motion.h1 variants={reveal} className="font-display text-4xl font-bold leading-[0.98] tracking-tight text-[#131012] sm:text-5xl lg:text-[56px]">
                Good Morning
                <br />
                <span className="text-[#7A1025]">Sahabat Nusa!</span>
              </motion.h1>

              <motion.p variants={reveal} className="mt-4 max-w-[480px] text-sm leading-6 text-gray-600 sm:text-[15px]">
                Ayo mulai belajar dan berdiskusi tentang fiqih ibadah dengan Nusa Bot. Temukan jawaban, pelajari materi, dan tingkatkan pemahaman ibadahmu bersama kami!
              </motion.p>

              <motion.div variants={reveal} className="mt-6 flex flex-wrap gap-2.5">
                <a href="https://muslimah-consultan.streamlit.app/" className="group flex items-center gap-2 rounded-2xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#7A1025]/15 transition duration-300 hover:-translate-y-1 hover:bg-[#650D1F] hover:shadow-xl sm:text-sm">
                  <MessageCircle size={16} />
                  Tanya Nusa Bot
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>

                <a href="/materi" className="group flex items-center gap-2 rounded-2xl border border-[#7A1025] bg-white/70 px-4 py-2.5 text-xs font-semibold text-[#7A1025] transition duration-300 hover:-translate-y-1 hover:bg-white sm:text-sm">
                  Pelajari Lebih Lanjut
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </motion.div>

              <motion.div variants={reveal} className="mt-5 hidden items-center gap-2.5 text-xs text-gray-500 sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#F6ECEE] text-[#7A1025]">
                  <MessageCircle size={12} />
                </span>
                <span>Teman belajar ibadah dalam satu tempat</span>
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={rightReveal} className="relative z-20 hidden h-[480px] items-center justify-center md:flex lg:h-[540px]">
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#FDF8F5]/40 via-transparent to-transparent" />
              <motion.img src={maskotImage} alt="Nusa Bot" className="relative z-10 h-full w-full object-contain object-center drop-shadow-2xl" animate={{ y: [0, -14, 0, 10, 0], rotate: [0, 1.2, 0, -1.2, 0], scale: [1, 1.015, 1, 1.01, 1] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </motion.div>
          </div>
        </section>

        <motion.section variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} className="relative z-20 mx-auto -mt-2 grid max-w-7xl grid-cols-1 gap-3 px-4 pb-5 sm:px-6 md:-mt-7 md:grid-cols-2 md:px-8 lg:grid-cols-4">
          {features.map((item) => <motion.a key={item.id} href={item.link} variants={reveal} whileHover={reduceMotion ? undefined : { y: -5, scale: 1.012 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }} className="group rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_12px_32px_rgba(60,20,30,0.07)] backdrop-blur-md"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E4E8] text-[#7A1025] transition duration-300 group-hover:rotate-3 group-hover:scale-105">{item.icon}</div><h3 className="font-display text-base font-bold leading-tight text-[#1D171A]">{item.title}</h3><p className="mt-1.5 max-w-[220px] text-xs leading-5 text-gray-500">{item.desc}</p><div className="mt-4 flex h-7 w-7 items-center justify-center rounded-full bg-[#F7E4E8] text-[#7A1025] transition duration-300 group-hover:translate-x-1 group-hover:bg-[#7A1025] group-hover:text-white"><ArrowRight size={13} /></div></motion.a>)}
        </motion.section>

        <section id="materi" className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:px-8 lg:gap-12 lg:py-14">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={leftReveal}>
            <SectionHeading eyebrow="Analisis Siklus" title={<>Pantau Siklus <span className="text-[#7A1025]">Ibadah</span><br />Dengan Lebih <span className="text-[#7A1025]">Mudah</span></>} description="Fitur analisis siklus membantu kamu memantau kondisi haid, masa suci, dan masa nifas dengan jelas melalui grafik yang mudah dipahami."><a href="#kalender" className="group mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#7A1025] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#7A1025]/10 transition duration-300 hover:-translate-y-1 hover:bg-[#650D1F] sm:text-sm">Mulai Catat Sekarang <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></a></SectionHeading>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={rightReveal} className="relative overflow-hidden rounded-[24px] border border-gray-200/80 bg-white p-4 shadow-[0_18px_50px_rgba(60,20,30,0.08)] sm:p-5"><div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[#F7E4E8] blur-3xl" /><div className="relative"><div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E4E8] text-[#7A1025]"><BarChart3 size={18} /></div><div><h3 className="font-display text-base font-bold text-[#1D171A]">Status Saat Ini</h3><p className="text-[10px] text-gray-500">Lihat kondisi siklus ibadahmu</p></div></div><div className="grid items-center gap-5 sm:grid-cols-[190px_1fr]"><div className="relative mx-auto h-44 w-44 rounded-full" style={{ background: 'conic-gradient(#C76679 0deg 72deg, #E9C8CF 72deg 208deg, #971432 208deg 278deg, #731024 278deg 360deg)' }}><div className="absolute inset-[23px] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner"><span className="font-display text-lg font-bold text-[#171115]">Normal</span><span className="text-[10px] text-gray-500">Hari ke-12</span></div><motion.div animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 16, ease: 'linear' }} className="absolute inset-0 rounded-full border border-white/50" /></div><div className="space-y-3">{statuses.map((status, index) => <div key={status.label} className="flex items-center gap-2.5"><span className={`h-2.5 w-2.5 rounded-full ${status.className}`} /><span className="text-xs text-gray-600">{status.label}</span>{index === 0 && <span className="ml-auto rounded-full bg-[#F8ECEE] px-2 py-0.5 text-[9px] font-semibold text-[#7A1025]">Aktif</span>}</div>)}</div></div></div></motion.div>
        </section>

        <section id="video" className="border-y border-[#EFE5E2] bg-[#FCFAF8] px-4 py-12 sm:px-6 md:px-8 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-3"><span className="h-0.5 w-8 rounded-full bg-[#7A1025]" /><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Belajar Lebih Interaktif</span></div><h2 className="font-display text-2xl font-bold text-[#171115] sm:text-3xl">Materi, Video, dan Kuis</h2></div><a href="#kuis" className="group text-xs font-semibold text-[#7A1025] sm:text-sm">Lihat semua <ArrowRight size={14} className="ml-1 inline transition-transform group-hover:translate-x-1" /></a></motion.div>
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }} className="grid gap-3 md:grid-cols-3">
              {[{ title: 'Video Pembelajaran', desc: 'Pahami materi lewat video singkat dan mudah diikuti.', icon: <Play size={19} /> }, { title: 'Materi Fiqih', desc: 'Baca ringkasan materi dengan bahasa yang sederhana.', icon: <BookOpen size={19} /> }, { title: 'Kuis Interaktif', desc: 'Uji pemahaman dengan pertanyaan yang interaktif.', icon: <Gamepad2 size={19} /> }].map((item) => <motion.div key={item.title} variants={reveal} whileHover={reduceMotion ? undefined : { y: -4 }} className="group rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg"><div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7E4E8] text-[#7A1025] transition duration-300 group-hover:scale-105">{item.icon}</div><h3 className="font-display text-lg font-bold text-[#171115]">{item.title}</h3><p className="mt-1.5 text-xs leading-5 text-gray-500">{item.desc}</p><button className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#7A1025]">Mulai <ArrowRight size={14} /></button></motion.div>)}
            </motion.div>
          </div>
        </section>

        <section id="kalender" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-8 lg:py-12">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={reveal} className="relative min-h-[260px] overflow-visible rounded-[26px] bg-[#7A1025] shadow-[0_18px_50px_rgba(122,16,37,0.16)]">
            <div className="absolute inset-0 overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(255,255,255,0.08),transparent_24%)]" />

            <div className="relative z-10 min-h-[260px] md:grid md:grid-cols-[0.95fr_1.05fr]">
              <motion.div initial={{ opacity: 0, x: -25, y: 15 }} whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1, ease }} className="relative hidden h-[260px] items-end md:flex lg:h-[300px]">
                <motion.img src={ctaImage} alt="Ilustrasi belajar ibadah" className="absolute -bottom-1 -left-8 z-20 h-96 w-[112%] max-w-none object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,0.2)]" animate={reduceMotion ? undefined : { y: [0, -5, 0], rotate: [0, 0.35, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
              </motion.div>

              <div className="relative z-30 flex min-h-[260px] items-center px-6 py-7 sm:px-8 md:px-8 lg:px-10">
                <div className="max-w-lg text-white">
                  <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-red-200 sm:text-[10px]">NUSA BOT</span>
                  <h2 className="mt-2 font-display text-2xl font-bold leading-[1.02] sm:text-3xl">Teman Belajar Ibadah<br />Setiap Hari</h2>
                  <p className="mt-3 max-w-md text-xs leading-5 text-red-100 sm:text-sm">Dapatkan pemahaman fiqih ibadah yang benar, akurat, dan mudah dipahami bersama Nusa Bot.</p>
                  <a href="#chat" className="group mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-[#7A1025] shadow-md transition duration-300 hover:-translate-y-1 hover:bg-[#FFF9FA] sm:text-sm"><MessageCircle size={15} /> Tanya Sekarang <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" /></a>
                </div>
              </div>
            </div>

            <motion.div animate={reduceMotion ? undefined : { x: [0, 8, 0], y: [0, -4, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="relative z-40 mt-[-90px] flex justify-center px-4 md:hidden">
            <motion.img src={ctaImage} alt="Ilustrasi belajar ibadah" className="h-[190px] w-full rounded-2xl object-cover object-center shadow-[0_16px_35px_rgba(60,20,30,0.18)]" animate={reduceMotion ? undefined : { y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white/70"><div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-4 text-[10px] text-gray-500 sm:px-6 md:flex-row md:items-center md:justify-between md:px-8 sm:text-xs"><span>© 2026 Nusa Bot. Sahabat Belajar Ibadah.</span><span>Belajar dengan lebih mudah, kapan saja.</span></div></footer>
    </div>
  );
}
