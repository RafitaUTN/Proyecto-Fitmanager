import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Users, BadgeCheck, Wallet, ClipboardCheck, Dumbbell,
  BarChart3, ArrowRight, ChevronDown,
  TrendingUp, Globe, Shield, Menu, X, LayoutDashboard,
  Building2, Sparkles, LineChart, Settings,
  ExternalLink, MessageCircle, Code2, AtSign, Lock,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Características', href: '#caracteristicas' },
  { label: 'Módulos', href: '#modulos' },
  { label: 'Beneficios', href: '#beneficios' },
  { label: 'Precios', href: '#precios' },
  { label: 'Contacto', href: '#contacto' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

function Section({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      className={`py-20 lg:py-28 px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </motion.section>
  )
}

function SectionHeader({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <motion.div variants={fadeUp} className="text-center mb-16 space-y-4">
      <span className="inline-block text-xs font-semibold tracking-[0.2em] text-primary uppercase">{tag}</span>
      <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-wider">{title}</h2>
      <p className="text-muted text-base max-w-2xl mx-auto">{desc}</p>
    </motion.div>
  )
}

function AnimatedCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let frame = 0
    const dur = 1500
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1)
      setCount(Math.floor(p * to))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, to])
  return <span ref={ref}>{count}{suffix}</span>
}

/* ==================== NAVBAR ==================== */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-xl shadow-lg shadow-black/10' : 'bg-transparent'
      }`}
      style={{ borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img src="/assets/logo-minimalista.png" alt="FitManager" className="h-9 w-auto transition-transform duration-300 group-hover:scale-105" />
            <span className="font-heading text-2xl tracking-[0.15em] text-foreground hidden sm:inline">FITMANAGER</span>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm text-muted hover:text-foreground rounded-button transition-all duration-200 hover:bg-white/5"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex text-sm text-muted hover:text-foreground transition-colors px-4 py-2 rounded-button hover:bg-white/5"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              className="text-sm bg-primary text-white px-5 py-2.5 rounded-button font-semibold hover:brightness-110 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Comenzar gratis
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden ml-1 p-2.5 text-muted hover:text-foreground rounded-button hover:bg-white/5 transition-colors"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="pb-4 pt-2 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm text-muted hover:text-foreground rounded-button hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-muted hover:text-foreground rounded-button hover:bg-white/5 transition-colors"
                >
                  Iniciar sesión
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}

/* ==================== HERO MOCKUP ==================== */
const chartBars = [35, 52, 40, 68, 45, 72, 58, 82, 60, 74]
const recentClients = [
  { name: 'Juan Pérez', plan: 'Premium', status: 'Activo', initial: 'JP' },
  { name: 'María González', plan: 'Básica', status: 'Activo', initial: 'MG' },
  { name: 'Luis Solís', plan: 'Trimestral', status: 'Activo', initial: 'LS' },
]

function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative w-full max-w-[580px] mx-auto"
    >
      <motion.div
        whileHover={{ rotateY: -2, rotateX: 1 }}
        transition={{ duration: 0.5 }}
        className="relative bg-surface rounded-card border border-border shadow-2xl overflow-hidden backdrop-blur-sm"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="flex h-[380px] sm:h-[420px]">
          <div className="hidden sm:flex w-[160px] bg-background/50 p-3 flex-col gap-1 border-r border-border">
            <div className="flex items-center gap-2 mb-3 px-2 pt-1">
              <img src="/assets/logo-minimalista.png" alt="" className="h-5 w-auto" />
              <span className="font-heading text-[11px] tracking-wider text-foreground/70">FITMANAGER</span>
            </div>
            <p className="text-[10px] font-semibold tracking-[1.5px] text-muted-dark uppercase px-2 mb-1">MENÚ</p>
            {[
              { label: 'Dashboard', icon: LayoutDashboard, active: true },
              { label: 'Clientes', icon: Users, active: false },
              { label: 'Membresías', icon: BadgeCheck, active: false },
              { label: 'Pagos', icon: Wallet, active: false },
            ].map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  active ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
                }`}
              >
                <Icon size={13} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 p-4 space-y-3 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-lg text-foreground tracking-wider leading-none">PANEL</p>
                <p className="text-[10px] text-muted mt-0.5">Resumen del gimnasio</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-surface-light border border-border flex items-center justify-center"><Settings size={11} className="text-muted-dark" /></div>
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"><span className="text-white font-bold text-[9px]">AD</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Clientes activos', value: '128', icon: Users, color: 'text-primary' },
                { label: 'Membresías activas', value: '94', icon: BadgeCheck, color: 'text-secondary' },
                { label: 'Ingresos del mes', value: '₡2.4M', icon: Wallet, color: 'text-foreground' },
                { label: 'Asistencias hoy', value: '42', icon: ClipboardCheck, color: 'text-muted' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-surface-light/50 rounded-lg p-2.5 border border-border/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted">{label}</p>
                    <Icon size={11} className="text-muted-dark" />
                  </div>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-muted font-medium">Ingresos semanales</p>
                <span className="text-[10px] text-secondary flex items-center gap-0.5 font-medium"><TrendingUp size={10} />+12%</span>
              </div>
              <div className="flex items-end gap-[3px] h-10">
                {chartBars.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${(h / 82) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.6 + i * 0.05 }}
                    className="flex-1 rounded-t-sm"
                    style={{
                      background: i >= 6 ? 'linear-gradient(to top, #F97316, #fb923c)' : 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-muted font-medium">Clientes recientes</p>
                <span className="text-[10px] text-primary font-medium">Ver todos</span>
              </div>
              <div className="space-y-1">
                {recentClients.map((m) => (
                  <div key={m.name} className="flex items-center justify-between bg-surface-light/30 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[8px] text-primary font-bold">{m.initial}</span>
                      </div>
                      <span className="text-[11px] text-foreground truncate">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted">{m.plan}</span>
                      <span className="text-[9px] text-secondary font-medium">{m.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="absolute -bottom-3 -right-3 w-full h-full bg-primary/5 rounded-card -z-10 blur-2xl" />
      <div className="absolute -top-2 -left-2 w-full h-full bg-secondary/5 rounded-card -z-10 blur-2xl" />
    </motion.div>
  )
}

/* ==================== STATS CARDS ==================== */
const stats = [
  { icon: Building2, value: 100, suffix: '+', label: 'Gimnasios activos', delay: 0 },
  { icon: Users, value: 5000, suffix: '+', label: 'Clientes gestionados', delay: 0.1 },
  { icon: TrendingUp, value: 99, suffix: '%', label: 'Uptime garantizado', delay: 0.2 },
  { icon: Wallet, value: 50, suffix: 'M+', label: 'Facturado', prefix: '₡', delay: 0.3 },
]

/* ==================== BENEFITS ==================== */
const benefits = [
  {
    icon: Users,
    title: 'Gestión de Clientes',
    desc: 'Registra, organiza y segmenta tus clientes con perfiles completos, historial de membresías y control de asistencias.',
  },
  {
    icon: BadgeCheck,
    title: 'Membresías Automáticas',
    desc: 'Crea planes ilimitados, asigna y renueva membresías con un clic. Alertas automáticas de vencimiento.',
  },
  {
    icon: Wallet,
    title: 'Control de Pagos',
    desc: 'Registra pagos manuales, consulta historial completo y mantén tus finanzas al día con reportes detallados.',
  },
  {
    icon: ClipboardCheck,
    title: 'Asistencia y Rutinas',
    desc: 'Valida entrada y salida de clientes, asigna rutinas personalizadas. Todo sincronizado en tiempo real.',
  },
]

/* ==================== MODULES ==================== */
const modules = [
  { icon: Users, name: 'Clientes', desc: 'Perfiles completos, historial y segmentación avanzada.' },
  { icon: BadgeCheck, name: 'Membresías', desc: 'Planes, asignación, renovación y alertas inteligentes.' },
  { icon: Wallet, name: 'Pagos', desc: 'Registro, historial y control financiero detallado.' },
  { icon: ClipboardCheck, name: 'Asistencia', desc: 'Registro de entrada/salida con estadísticas.' },
  { icon: Dumbbell, name: 'Rutinas', desc: 'Planes de entrenamiento personalizados por cliente.' },
  { icon: BarChart3, name: 'Reportes', desc: 'Dashboard con métricas clave y exportación de datos.' },
]

/* ==================== WHY CHOOSE ==================== */
const whys = [
  { icon: Shield, title: 'Administración centralizada', desc: 'Todos los datos de tu gimnasio en un solo lugar. Clientes, membresías, pagos y asistencia sin necesidad de múltiples herramientas.' },
  { icon: Sparkles, title: 'Automatización inteligente', desc: 'Alertas de vencimiento, renovaciones automáticas y notificaciones para que nunca pierdas el control de tus membresías.' },
  { icon: LineChart, title: 'Reportes en tiempo real', desc: 'Dashboard interactivo con indicadores clave, gráficas de ingresos y métricas de desempeño actualizadas al instante.' },
  { icon: Globe, title: 'Acceso desde cualquier lugar', desc: 'Plataforma 100% web. Funciona en desktop, tablet y móvil. Tu gimnasio siempre disponible, sin instalaciones.' },
]

/* ==================== FAQ ==================== */
const faqs = [
  { q: '¿Necesito instalar algún software?', a: 'No. FitManager es 100% web. Solo necesitas un navegador y conexión a internet. Funciona en Windows, Mac, Linux, tablet y celular.' },
  { q: '¿Funciona desde el celular?', a: 'Sí. La plataforma es completamente responsive y se adapta a cualquier tamaño de pantalla. Puedes gestionar tu gimnasio desde cualquier lugar.' },
  { q: '¿Tiene algún costo?', a: 'Actualmente FitManager es completamente gratuito mientras desarrollamos nuevos módulos. Próximamente lanzaremos planes flexibles.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Al no haber contratos ni facturación, puedes dejar de usar la plataforma en cualquier momento sin penalizaciones.' },
  { q: '¿Cómo respaldo mi información?', a: 'Tus datos se almacenan de forma segura en la nube con respaldos automáticos diarios y cifrado de extremo a extremo.' },
]

function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = openIdx === i
        return (
          <div key={i} className="bg-surface/50 backdrop-blur-sm border border-border rounded-card overflow-hidden transition-all duration-200 hover:border-primary/20">
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="flex items-center justify-between w-full text-left px-6 py-4 cursor-pointer text-foreground hover:text-primary transition-colors"
              aria-expanded={isOpen}
              aria-controls={`faq-${i}`}
            >
              <span className="text-sm font-medium pr-4">{faq.q}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0"
              >
                <ChevronDown size={16} className="text-muted" />
              </motion.div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  id={`faq-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm text-muted px-6 pb-4 leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

/* ==================== SYSTEM PREVIEW ==================== */
const previews = [
  { title: 'Dashboard', icon: LayoutDashboard, desc: 'Panel principal con KPIs, gráficas y métricas en tiempo real.' },
  { title: 'Clientes', icon: Users, desc: 'Gestión completa de perfiles, historial y membresías.' },
  { title: 'Pagos', icon: Wallet, desc: 'Registro de pagos y control financiero detallado.' },
]

/* ==================== FOOTER LINKS ==================== */
const footerLinks: Record<string, { label: string; href: string }[]> = {
  Producto: [
    { label: 'Características', href: '#caracteristicas' },
    { label: 'Módulos', href: '#modulos' },
    { label: 'Precios', href: '#precios' },
    { label: 'API', href: '#' },
  ],
  Empresa: [
    { label: 'Sobre nosotros', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contacto', href: '#contacto' },
    { label: 'Términos', href: '#' },
  ],
  Soporte: [
    { label: 'Centro de ayuda', href: '#' },
    { label: 'Documentación', href: '#' },
    { label: 'Estado', href: '#' },
    { label: 'FAQ', href: '#faq' },
  ],
  Legal: [
    { label: 'Privacidad', href: '#' },
    { label: 'Términos', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
}

/* ==================== MAIN LANDING ==================== */
export function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-primary/4 rounded-full blur-[150px]" />
        <div className="absolute top-[35%] right-[-8%] w-[500px] h-[500px] bg-secondary/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] bg-primary/2 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ===== HERO ===== */}
      <section className="relative pt-28 lg:pt-36 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8 max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-primary-light border border-primary/25 text-primary text-xs font-semibold px-4 py-2 rounded-badge"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                PLATAFORMA SAAS PARA GIMNASIOS
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-1"
              >
                <span className="block font-heading text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.9] text-foreground">
                  ADMINISTRA
                </span>
                <span className="block font-heading text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.9]">
                  TU <span className="text-primary">GIMNASIO</span>
                </span>
                <span className="block font-heading text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.9] text-foreground">
                  SIN ESFUERZO
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-muted text-base sm:text-lg leading-relaxed max-w-lg"
              >
                Centraliza clientes, membresías, pagos y asistencia en un solo lugar.
                La plataforma todo-en-uno para gimnasios pequeños y medianos.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center bg-primary text-white px-8 py-3.5 rounded-button font-bold text-sm tracking-wider hover:brightness-110 transition-all duration-200 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 group"
                >
                  COMENZAR GRATIS
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center text-muted hover:text-foreground transition-colors text-sm font-medium gap-2 group"
                >
                  <span className="w-6 h-px bg-muted group-hover:w-10 group-hover:bg-foreground transition-all duration-300" />
                  Ya tengo cuenta
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex items-center gap-6 sm:gap-10 pt-2"
              >
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                  >
                    <p className="font-heading text-2xl sm:text-3xl text-foreground leading-none">
                      <AnimatedCounter to={s.value} suffix={s.suffix} />
                    </p>
                    <p className="text-muted text-[10px] sm:text-[11px] tracking-widest font-medium mt-1">{s.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ===== BENEFICIOS ===== */}
      <Section id="caracteristicas">
        <SectionHeader tag="Características" title="TODO LO QUE NECESITAS" desc="Una plataforma completa para gestionar tu gimnasio sin complicaciones." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -6, transition: { duration: 0.25 } }}
              className="group relative bg-surface/50 backdrop-blur-sm border border-border rounded-card p-6 h-full transition-colors duration-300 hover:bg-surface/80 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 flex flex-col"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <b.icon size={22} />
              </div>
              <h3 className="font-heading text-xl text-foreground tracking-wider mb-2">{b.title}</h3>
              <p className="text-sm text-muted leading-relaxed flex-1">{b.desc}</p>
              <div className="mt-4 pt-4 border-t border-border/50">
                <span className="text-xs text-primary font-semibold inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-200">
                  Conocer más <ArrowRight size={12} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== MÓDULOS ===== */}
      <Section id="modulos" className="bg-gradient-to-b from-transparent via-surface/[0.02] to-transparent">
        <SectionHeader tag="Módulos" title="CADA ÁREA, UN MÓDULO" desc="Funcionalidades especializadas para cada aspecto de tu negocio." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m, i) => (
            <motion.div
              key={m.name}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group bg-surface/30 backdrop-blur-sm border border-border rounded-card p-5 transition-all duration-300 hover:bg-surface/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-default"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <m.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-xl text-foreground tracking-wider">{m.name}</h3>
                    <ArrowRight size={14} className="text-muted-dark group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                  </div>
                  <p className="text-xs text-muted mt-0.5">{m.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== VISTA PREVIA DEL SISTEMA ===== */}
      <Section id="preview">
        <SectionHeader tag="Vista previa" title="ASÍ FUNCIONA FITMANAGER" desc="Interfaz moderna e intuitiva diseñada para la gestión diaria de tu gimnasio." />
        <div className="grid sm:grid-cols-3 gap-6">
          {previews.map((p, i) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              custom={i}
              className="relative bg-surface/50 backdrop-blur-sm border border-border rounded-card overflow-hidden group"
            >
              <div className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                  <p.icon size={20} />
                </div>
                <h3 className="font-heading text-xl text-foreground tracking-wider">{p.title}</h3>
                <p className="text-sm text-muted">{p.desc}</p>
              </div>
              <div className="h-28 bg-surface-light/50 border-t border-border p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-destructive/60" />
                    <div className="w-2 h-2 rounded-full bg-primary/60" />
                    <div className="w-2 h-2 rounded-full bg-secondary/60" />
                  </div>
                  <div className="flex-1 h-4 bg-surface-lighter/50 rounded ml-2" />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="h-3 bg-surface-lighter/30 rounded" />
                  <div className="h-3 bg-surface-lighter/30 rounded" />
                </div>
                <div className="h-8 bg-surface-lighter/20 rounded" />
              </div>
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== MÉTRICAS ===== */}
      <Section>
        <div className="relative bg-gradient-to-b from-surface/50 to-background border border-border rounded-card overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative p-8 sm:p-12 lg:p-16">
            <SectionHeader tag="Métricas" title="RESULTADOS REALES" desc="Números que respaldan nuestra plataforma." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -3 }}
                  className="bg-surface-light/30 backdrop-blur-sm border border-border rounded-card p-6 text-center space-y-3 group hover:bg-surface-light/50 hover:border-primary/20 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                    <s.icon size={22} />
                  </div>
                  <p className="font-heading text-4xl sm:text-5xl text-primary leading-none">
                    <span className="text-muted-dark text-xl align-top">{s.prefix || ''}</span>
                    <AnimatedCounter to={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-sm text-muted font-medium">{s.label}</p>
                </motion.div>
              ))}
            </div>
            <motion.div variants={fadeUp} className="mt-12 text-center">
              <div className="inline-flex items-center gap-3 bg-surface-light/50 border border-border rounded-button px-6 py-3">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-sm text-muted">Sin contratos mensuales — Todos los sistemas operativos</span>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ===== WHY CHOOSE ===== */}
      <Section id="beneficios">
        <SectionHeader tag="Beneficios" title="¿POR QUÉ ELEGIR FITMANAGER?" desc="Cuatro razones por las que los gimnasios confían en nosotros." />
        <div className="grid sm:grid-cols-2 gap-5">
          {whys.map((w, i) => (
            <motion.div
              key={w.title}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -4 }}
              className="relative bg-surface/50 backdrop-blur-sm border border-border rounded-card p-6 hover:bg-surface/80 hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="flex gap-5">
                <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                  <w.icon size={24} />
                </div>
                <div>
                  <h3 className="font-heading text-xl text-foreground tracking-wider mb-1.5">{w.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{w.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ===== FAQ ===== */}
      <Section id="faq">
        <SectionHeader tag="FAQ" title="PREGUNTAS FRECUENTES" desc="Resolvemos tus dudas antes de que las tengas." />
        <FAQ />
      </Section>

      {/* ===== PRECIOS TEASER ===== */}
      <Section id="precios">
        <motion.div variants={fadeUp} className="text-center space-y-6 max-w-2xl mx-auto">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] text-primary uppercase">Precios</span>
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-wider">PRÓXIMAMENTE</h2>
          <p className="text-muted text-base">Estamos preparando planes flexibles para todo tipo de gimnasio.</p>
          <div className="inline-flex items-center gap-2 text-sm text-muted bg-surface-light/50 border border-border rounded-button px-5 py-2.5">
            <Lock size={14} className="text-primary" />
            <span>Mientras tanto, usa FitManager completamente gratis</span>
          </div>
        </motion.div>
      </Section>

      {/* ===== CTA FINAL ===== */}
      <Section>
        <motion.div variants={fadeUp}>
          <div className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/5 border border-border rounded-card overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="relative px-8 sm:px-12 lg:px-16 py-16 sm:py-20 text-center space-y-8">
              <h2 className="font-heading text-4xl sm:text-5xl lg:text-7xl text-foreground tracking-wider leading-[1.1]">
                TRANSFORMA TU <span className="text-primary">GIMNASIO</span>
                <br />
                HOY
              </h2>
              <p className="text-muted text-base sm:text-lg max-w-xl mx-auto">
                Únete a los cientos de gimnasios que ya confían en FitManager. Sin riesgos, sin contratos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/registro"
                  className="inline-flex items-center justify-center bg-primary text-white px-10 py-4 rounded-button font-bold text-sm tracking-wider hover:brightness-110 transition-all duration-200 shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 group"
                >
                  COMENZAR GRATIS
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center text-muted hover:text-foreground transition-colors text-sm font-medium group gap-2"
                >
                  <span className="w-6 h-px bg-muted group-hover:w-10 group-hover:bg-foreground transition-all duration-300" />
                  Iniciar sesión
                </Link>
              </div>
              <p className="text-xs text-muted-dark">Sin tarjeta de crédito · Sin compromiso · Cancela cuando quieras</p>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* ===== FOOTER ===== */}
      <footer id="contacto" className="border-t border-border px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto py-12 lg:py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
            <div className="lg:col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-3 group">
                <img src="/assets/logo-minimalista.png" alt="FitManager" className="h-8 w-auto transition-transform duration-300 group-hover:scale-105" />
                <span className="font-heading text-2xl tracking-[0.15em] text-foreground">FITMANAGER</span>
              </Link>
              <p className="text-sm text-muted max-w-sm leading-relaxed">
                La plataforma todo-en-uno para gestionar tu gimnasio. Clientes, membresías, pagos y más.
              </p>
              <div className="flex items-center gap-2.5 pt-2">
                {[
                  { icon: Code2, href: '#', label: 'GitHub' },
                  { icon: ExternalLink, href: '#', label: 'LinkedIn' },
                  { icon: AtSign, href: '#', label: 'Instagram' },
                  { icon: MessageCircle, href: '#', label: 'Facebook' },
                ].map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-9 h-9 rounded-lg bg-surface-light border border-border flex items-center justify-center text-muted hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category} className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{category}</p>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-muted hover:text-foreground transition-colors duration-200">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-dark">&copy; {new Date().getFullYear()} FitManager. Todos los derechos reservados.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-muted-dark hover:text-muted transition-colors">Privacidad</a>
              <a href="#" className="text-xs text-muted-dark hover:text-muted transition-colors">Términos</a>
              <a href="#" className="text-xs text-muted-dark hover:text-muted transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
