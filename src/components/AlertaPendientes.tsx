"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, Volume2, VolumeX, ArrowRight, Clock } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";

interface Detalle { tipo: string; n: number; texto: string; url: string }

const POSPONER_MS   = 5 * 60 * 1000;   // el aviso vuelve a los 5 minutos
const SONIDO_MS     = 45 * 1000;       // recordatorio sonoro mientras haya pendientes
const RECORDAR_MS   = 3 * 60 * 1000;   // recordatorio del navegador con la pestaña de fondo
const CLAVE_MUDO    = "catastro:alerta-muda";

// Notificación del sistema operativo: se ve aunque el navegador esté
// minimizado o el usuario esté en otra aplicación.
async function notificarNavegador(titulo: string, cuerpo: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opciones: NotificationOptions & { renotify?: boolean } = {
      body: cuerpo,
      tag:  "catastro-pendientes",   // reemplaza la anterior en vez de apilarlas
      renotify: true,
      data: { url: "/dashboard" },
    };
    // Vía service worker cuando existe: permite reemplazar y reaccionar al clic
    if (reg) await reg.showNotification(titulo, opciones);
    else new Notification(titulo, opciones);
  } catch { /* la notificación es un extra; si falla, queda el aviso en pantalla */ }
}

// Dos notas cortas generadas en el momento: no hace falta archivo de audio
function pitido() {
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tocar = (freq: number, inicio: number, dur: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Envolvente suave: evita el chasquido de un corte abrupto
      gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
      gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + inicio + 0.03);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + inicio + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + dur);
    };
    tocar(880, 0, 0.18);
    tocar(1174, 0.2, 0.22);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch { /* el audio es un extra: si el navegador lo bloquea, no pasa nada */ }
}

export default function AlertaPendientes() {
  const [total,   setTotal]   = useState(0);
  const [detalle, setDetalle] = useState<Detalle[]>([]);
  const [mudo,    setMudo]    = useState(false);
  const [pospuestoHasta, setPospuesto] = useState(0);

  const tituloOriginal = useRef<string>("");
  const ultimoSonido   = useRef<number>(0);
  const totalPrevio    = useRef<number>(0);
  const ultimoAviso    = useRef<number>(0);

  const [permiso, setPermiso] = useState<NotificationPermission | "no-soportado">("default");

  useEffect(() => {
    tituloOriginal.current = document.title;
    setMudo(localStorage.getItem(CLAVE_MUDO) === "1");
    setPermiso(typeof Notification === "undefined" ? "no-soportado" : Notification.permission);
  }, []);

  const pedirPermiso = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setPermiso(r);
    if (r === "granted") {
      notificarNavegador("Avisos activados", "Te avisaremos aquí cuando tengas pendientes.");
    }
  };

  useRealtimeRefresh(async () => {
    try {
      const res  = await fetch("/api/pendientes");
      const data = await res.json();
      const n    = data?.total ?? 0;
      const det  = Array.isArray(data?.detalle) ? data.detalle : [];

      setTotal(n);
      setDetalle(det);

      if (n === 0) { totalPrevio.current = 0; return; }

      const texto  = det[0]?.texto ?? "Tienes trabajo pendiente";
      const subio  = n > totalPrevio.current;
      // Con la pestaña de fondo se insiste; si está a la vista basta el aviso en pantalla
      const tocaRecordar =
        document.visibilityState === "hidden" &&
        Date.now() - ultimoAviso.current > RECORDAR_MS;

      if (subio || tocaRecordar) {
        ultimoAviso.current = Date.now();
        notificarNavegador(`🔔 ${n} pendiente${n === 1 ? "" : "s"}`, texto);
      }
      totalPrevio.current = n;
    } catch { /* se reintenta en el siguiente ciclo */ }
  }, 20_000);

  const visible = total > 0 && Date.now() > pospuestoHasta;

  // El título de la pestaña parpadea: se ve aunque el usuario esté en otra
  useEffect(() => {
    if (total === 0) {
      if (tituloOriginal.current) document.title = tituloOriginal.current;
      return;
    }
    let alterno = false;
    const t = setInterval(() => {
      alterno = !alterno;
      document.title = alterno
        ? `🔔 (${total}) ¡Pendiente!`
        : tituloOriginal.current || "Catastro Montería";
    }, 1400);

    return () => {
      clearInterval(t);
      if (tituloOriginal.current) document.title = tituloOriginal.current;
    };
  }, [total]);

  // Recordatorio sonoro espaciado, solo con la alerta a la vista
  useEffect(() => {
    if (!visible || mudo) return;
    const t = setInterval(() => {
      if (Date.now() - ultimoSonido.current < SONIDO_MS - 500) return;
      ultimoSonido.current = Date.now();
      pitido();
    }, SONIDO_MS);
    return () => clearInterval(t);
  }, [visible, mudo]);

  const alternarSonido = () => {
    const nuevo = !mudo;
    setMudo(nuevo);
    localStorage.setItem(CLAVE_MUDO, nuevo ? "1" : "0");
    if (!nuevo) pitido();   // confirma que el sonido quedó activo
  };

  if (!visible) return null;

  const principal = detalle[0];

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] w-[min(94vw,30rem)] px-2 animate-[bajar_.35s_ease-out]">
      <style>{`
        @keyframes bajar { from { transform: translateY(-120%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes latido { 0%,100% { box-shadow: 0 8px 30px -6px rgba(217,119,6,.55) } 50% { box-shadow: 0 8px 42px 2px rgba(217,119,6,.85) } }
      `}</style>

      <div
        className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-3.5 border border-amber-300/50"
        style={{ animation: "latido 2.4s ease-in-out infinite" }}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
            <div className="relative w-10 h-10 rounded-full bg-white/25 flex items-center justify-center">
              <BellRing className="h-5 w-5" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm leading-tight">
              Tienes {total} pendiente{total === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-white/90 leading-snug truncate">
              {principal?.texto ?? "Revisa el panel"}
            </p>
            {detalle.length > 1 && (
              <p className="text-[11px] text-white/80 leading-snug truncate">
                {detalle.slice(1).map((d) => d.texto).join(" · ")}
              </p>
            )}
          </div>

          <button
            onClick={alternarSonido}
            title={mudo ? "Activar sonido" : "Silenciar sonido"}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors shrink-0"
          >
            {mudo ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Sin permiso el aviso no sale del navegador: se ofrece activarlo */}
        {permiso === "default" && (
          <button
            onClick={pedirPermiso}
            className="w-full mt-2.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <BellRing className="h-3.5 w-3.5" />
            Activar avisos en el escritorio
          </button>
        )}
        {permiso === "denied" && (
          <p className="mt-2.5 text-[11px] text-white/80 leading-snug">
            Los avisos del navegador están bloqueados. Actívalos desde el candado
            de la barra de direcciones para verlos fuera de esta pestaña.
          </p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Link
            href={principal?.url ?? "/dashboard"}
            onClick={() => setPospuesto(Date.now() + POSPONER_MS)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white text-amber-700 text-xs font-bold hover:bg-amber-50 transition-colors"
          >
            Atender ahora <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => setPospuesto(Date.now() + POSPONER_MS)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-medium transition-colors"
            title="Vuelve a avisar en 5 minutos"
          >
            <Clock className="h-3.5 w-3.5" /> 5 min
          </button>
        </div>
      </div>
    </div>
  );
}
