"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Eye, EyeOff, MapPin, Mail, Lock, User, Sun, Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

/* ── tiny inline theme toggle ── */
function ThemeBtn() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      title="Cambiar tema"
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/* ── Animation helpers ── */
function _clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }
function _ph(t: number, s: number, e: number) { return _clamp((t - s) / (e - s), 0, 1); }
function _eio(t: number) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

/* ── Animated feature card icons (RAF + direct setAttribute — no CSS/SMIL) ── */
function FolderDocIcon() {
  const gRef = useRef<SVGGElement>(null);
  useEffect(() => {
    const DUR = 2600;
    const t0 = performance.now();
    let id: number;
    const tick = (now: number) => {
      const t = ((now - t0) % DUR) / DUR;
      const g = gRef.current;
      if (g) {
        let ty: number, op: number;
        if      (t < 0.08) { ty = -7; op = 0; }
        else if (t < 0.24) { const p = _eio(_ph(t, 0.08, 0.24)); ty = -7 + 7*p; op = p; }
        else if (t < 0.52) { ty = 0; op = 1; }
        else if (t < 0.68) { const p = _eio(_ph(t, 0.52, 0.68)); ty = 4*p; op = 1-p; }
        else               { ty = -7; op = 0; }
        g.setAttribute("transform", `translate(0,${ty.toFixed(2)})`);
        g.setAttribute("opacity", op.toFixed(3));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" overflow="visible">
      <path d="M3 9a2 2 0 012-2h3l2 2h10a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        fill="rgba(52,211,153,.18)" stroke="rgba(52,211,153,.85)" strokeWidth="1.5" strokeLinejoin="round"/>
      <g ref={gRef} opacity="0">
        <rect x="9" y="6" width="6" height="7.5" rx="1"
          fill="rgba(255,255,255,.88)" stroke="rgba(52,211,153,.9)" strokeWidth="1.2"/>
        <line x1="10.5" y1="8.3"  x2="13.5" y2="8.3"  stroke="rgba(52,211,153,.65)" strokeWidth=".8"/>
        <line x1="10.5" y1="9.9"  x2="13.5" y2="9.9"  stroke="rgba(52,211,153,.45)" strokeWidth=".8"/>
        <line x1="10.5" y1="11.5" x2="12.5" y2="11.5" stroke="rgba(52,211,153,.35)" strokeWidth=".8"/>
      </g>
    </svg>
  );
}

function TraceNetworkIcon() {
  const r1 = useRef<SVGLineElement>(null);
  const r2 = useRef<SVGLineElement>(null);
  const r3 = useRef<SVGLineElement>(null);
  useEffect(() => {
    const DUR = 3000, DASH = 20;
    const t0 = performance.now();
    let id: number;
    const anim = (el: SVGLineElement | null, t: number, ds: number, de: number, he: number, fe: number) => {
      if (!el) return;
      let d: number, op: number;
      if      (t < ds) { d = DASH; op = 0; }
      else if (t < de) { const p = _eio(_ph(t,ds,de)); d = DASH*(1-p); op = p; }
      else if (t < he) { d = 0; op = 1; }
      else if (t < fe) { const p = _eio(_ph(t,he,fe)); d = DASH*p; op = 1-p; }
      else             { d = DASH; op = 0; }
      el.setAttribute("stroke-dashoffset", d.toFixed(2));
      el.setAttribute("opacity", op.toFixed(3));
    };
    const tick = (now: number) => {
      const t = ((now - t0) % DUR) / DUR;
      anim(r1.current, t, 0.05, 0.28, 0.70, 0.88);
      anim(r2.current, t, 0.22, 0.44, 0.70, 0.88);
      anim(r3.current, t, 0.38, 0.58, 0.70, 0.88);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <line ref={r1} x1="5"  y1="19" x2="12" y2="5"  strokeDasharray="20" opacity="0" stroke="rgba(52,211,153,.75)" strokeWidth="1.3"/>
      <line ref={r2} x1="12" y1="5"  x2="19" y2="19" strokeDasharray="20" opacity="0" stroke="rgba(52,211,153,.75)" strokeWidth="1.3"/>
      <line ref={r3} x1="5"  y1="19" x2="19" y2="19" strokeDasharray="20" opacity="0" stroke="rgba(52,211,153,.55)" strokeWidth="1.3"/>
      <circle cx="12" cy="5"  r="2.5" fill="rgba(52,211,153,.9)"/>
      <circle cx="5"  cy="19" r="2.5" fill="rgba(52,211,153,.9)"/>
      <circle cx="19" cy="19" r="2.5" fill="rgba(52,211,153,.9)"/>
    </svg>
  );
}

function BarsAnimIcon() {
  const r1 = useRef<SVGRectElement>(null);
  const r2 = useRef<SVGRectElement>(null);
  const r3 = useRef<SVGRectElement>(null);
  useEffect(() => {
    const DUR = 2800;
    const t0 = performance.now();
    let id: number;
    // [fullHeight, growStart, growEnd, shrinkStart, shrinkEnd]
    const bars: [number, number, number, number, number][] = [
      [7,  0.08, 0.35, 0.68, 0.88],
      [12, 0.20, 0.47, 0.68, 0.88],
      [10, 0.32, 0.58, 0.68, 0.88],
    ];
    const refs = [r1, r2, r3];
    const tick = (now: number) => {
      const t = ((now - t0) % DUR) / DUR;
      bars.forEach(([fh, gs, ge, ss, se], i) => {
        const el = refs[i].current; if (!el) return;
        let h: number;
        if      (t < gs) h = 0;
        else if (t < ge) h = fh * _eio(_ph(t, gs, ge));
        else if (t < ss) h = fh;
        else if (t < se) h = fh * (1 - _eio(_ph(t, ss, se)));
        else             h = 0;
        el.setAttribute("y", (21 - h).toFixed(2));
        el.setAttribute("height", h.toFixed(2));
      });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <line x1="3" y1="21" x2="21" y2="21" stroke="rgba(52,211,153,.4)" strokeWidth="1.2"/>
      <rect ref={r1} x="4"    y="21" width="4.5" height="0" rx=".8" fill="rgba(52,211,153,.9)"/>
      <rect ref={r2} x="9.75" y="21" width="4.5" height="0" rx=".8" fill="rgba(52,211,153,.7)"/>
      <rect ref={r3} x="15.5" y="21" width="4.5" height="0" rx=".8" fill="rgba(52,211,153,.8)"/>
    </svg>
  );
}

function ShieldCheckAnimIcon() {
  const sr = useRef<SVGPathElement>(null);
  const cr = useRef<SVGPathElement>(null);
  useEffect(() => {
    const DUR = 3000, DASH = 12;
    const t0 = performance.now();
    let id: number;
    const tick = (now: number) => {
      const t = ((now - t0) % DUR) / DUR;
      const s = sr.current, c = cr.current;
      if (s) {
        let sop: number;
        if      (t < 0.05) sop = 0;
        else if (t < 0.22) sop = _eio(_ph(t, 0.05, 0.22));
        else if (t < 0.75) sop = 1;
        else if (t < 0.90) sop = 1 - _eio(_ph(t, 0.75, 0.90));
        else               sop = 0;
        s.setAttribute("opacity", sop.toFixed(3));
      }
      if (c) {
        let cop: number, cd: number;
        if      (t < 0.28) { cop = 0; cd = DASH; }
        else if (t < 0.52) { const p = _eio(_ph(t, 0.28, 0.52)); cop = p; cd = DASH*(1-p); }
        else if (t < 0.75) { cop = 1; cd = 0; }
        else if (t < 0.90) { cop = 1 - _eio(_ph(t, 0.75, 0.90)); cd = 0; }
        else               { cop = 0; cd = DASH; }
        c.setAttribute("opacity", cop.toFixed(3));
        c.setAttribute("stroke-dashoffset", cd.toFixed(2));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
      <path ref={sr} opacity="0"
        d="M12 2L4 6v6c0 5.25 3.5 9.74 8 10.93C16.5 21.74 20 17.25 20 12V6L12 2z"
        fill="rgba(52,211,153,.2)" stroke="rgba(52,211,153,.85)" strokeWidth="1.5" strokeLinejoin="round"/>
      <path ref={cr} opacity="0" fill="none"
        d="M8.5 12.5l2.5 2.5 4.5-5"
        strokeDasharray="12" strokeDashoffset="12"
        stroke="rgba(52,211,153,.95)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const FEATURE_CARDS = [
  { Icon: FolderDocIcon,       label: "Control de Planos",      desc: "Registro y consulta" },
  { Icon: TraceNetworkIcon,    label: "Trazabilidad Completa",  desc: "Historial de cada plano" },
  { Icon: BarsAnimIcon,        label: "Reportes e Indicadores", desc: "Análisis en tiempo real" },
  { Icon: ShieldCheckAnimIcon, label: "Accesos por Roles",      desc: "Seguridad granular" },
];

export default function LoginForm() {
  const searchParams  = useSearchParams();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [remember,    setRemember]    = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [forgotMsg,   setForgotMsg]   = useState(false);

  useEffect(() => {
    fetch("/api/ping").catch(() => {});
    fetch("/api/auth/csrf").catch(() => {});
  }, []);

  const getDestination = () => {
    const raw = searchParams.get("callbackUrl") ?? "";
    return raw.startsWith("/") ? raw : "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { redirect: false, email, password });
    if (result?.error) {
      setError("Usuario o contraseña incorrectos. Intenta de nuevo.");
      setLoading(false);
    } else {
      sessionStorage.setItem("nxa-alive", "1");
      window.location.href = getDestination();
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950">

      {/* ══ LEFT PANEL ══ */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden
                      bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-900
                      dark:from-slate-900 dark:via-teal-950 dark:to-slate-900">

        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/2 -right-16 w-48 h-48 rounded-full bg-teal-400/10 blur-2xl" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Header */}
          <div className="flex items-center justify-between mb-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium tracking-wide">Conservación Catastral</span>
            </div>
            <ThemeBtn />
          </div>

          {/* Main branding */}
          <div className="py-12 xl:py-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/80 text-xs font-medium">Sistema activo · Montería, Córdoba</span>
            </div>

            <h1 className="text-5xl xl:text-6xl font-black text-white leading-none tracking-tight mb-3">
              CATASTRO<br />
              <span className="text-emerald-300">MONTERÍA</span>
            </h1>
            <p className="text-white/60 text-base font-medium tracking-widest uppercase mb-6">
              Gestión de Planos
            </p>
            <p className="text-white/80 text-lg font-semibold leading-snug mb-3 max-w-sm">
              Organizamos lo que construye el territorio
            </p>
            <p className="text-white/55 text-sm leading-relaxed max-w-sm">
              Sistema integral de gestión y control de planos catastrales para una administración eficiente, segura y transparente.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            {FEATURE_CARDS.map(({ Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-4 rounded-2xl bg-white/8 border border-white/10 backdrop-blur-sm hover:bg-white/12 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold leading-tight">{label}</p>
                  <p className="text-white/45 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Abstract map decoration */}
          <div className="relative h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
            <svg viewBox="0 0 400 96" className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="400" height="96" fill="url(#grid)" />
              <path d="M0,60 Q80,20 160,50 T320,30 T400,45" fill="none" stroke="rgba(52,211,153,0.6)" strokeWidth="2"/>
              <path d="M0,75 Q100,40 200,65 T400,55" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="1.5"/>
              <circle cx="160" cy="50" r="5" fill="rgba(52,211,153,0.8)"/>
              <circle cx="280" cy="35" r="3" fill="rgba(255,255,255,0.6)"/>
              <circle cx="80"  cy="38" r="3" fill="rgba(255,255,255,0.4)"/>
            </svg>
            <div className="absolute inset-0 flex items-center px-5">
              <MapPin className="h-5 w-5 text-emerald-300 mr-2 shrink-0" />
              <p className="text-white/60 text-xs">Montería · Córdoba · Colombia</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative
                      bg-white dark:bg-slate-900">

        {/* Mobile theme toggle */}
        <div className="lg:hidden absolute top-4 right-4">
          <ThemeBtn2 />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-black text-slate-900 dark:text-white text-lg leading-none">CATASTRO MONTERÍA</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Gestión de Planos</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Avatar + greeting */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border-2 border-teal-200 dark:border-teal-700 flex items-center justify-center mb-4 shadow-sm">
              <User className="h-8 w-8 text-teal-700 dark:text-teal-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bienvenido</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Inicia sesión para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="correo@catastro.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700
                             bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             placeholder-slate-400 dark:placeholder-slate-500
                             focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                             transition-colors text-sm"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700
                             bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             placeholder-slate-400 dark:placeholder-slate-500
                             focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                             transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Recuérdame + ¿Olvidaste? */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => setRemember(!remember)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer
                    ${remember ? "bg-teal-600 border-teal-600" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}
                >
                  {remember && (
                    <svg viewBox="0 0 12 10" className="w-2.5 h-2 fill-none stroke-white stroke-2">
                      <polyline points="1,5 4.5,8.5 11,1" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400 select-none">Recuérdame</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotMsg(!forgotMsg)}
                className="text-sm text-teal-700 dark:text-teal-400 hover:underline font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Forgot hint */}
            {forgotMsg && (
              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                Contacta al administrador del sistema para restablecer tu contraseña.
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl font-semibold text-sm text-white
                         bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all shadow-sm hover:shadow-teal-200 dark:hover:shadow-teal-900/40 hover:shadow-md
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 block border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Iniciando sesión…
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  Iniciar sesión
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
            © {new Date().getFullYear()} Conservación Catastral. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Mobile-only theme toggle (no teal bg) */
function ThemeBtn2() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
