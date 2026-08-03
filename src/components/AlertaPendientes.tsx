"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, ArrowRight, Clock, MonitorSmartphone } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";

interface Detalle { tipo: string; n: number; texto: string; url: string }

const POSPONER_MS = 5 * 60 * 1000;   // el aviso en pantalla vuelve a los 5 minutos
const RECORDAR_MS = 3 * 60 * 1000;   // se insiste en el escritorio estando fuera
const IMAGEN      = "/aviso-verificacion.png";

/**
 * Aviso de planos esperando verificación, para digitalizador y administrador.
 *
 * Dos frentes, porque ninguna página web puede dibujarse encima de otra
 * pestaña:
 *   - dentro de la aplicación, el recuadro naranja de esta misma vista
 *   - fuera de ella, la notificación del escritorio (con el mismo banner
 *     naranja como imagen) y el título de la pestaña parpadeando
 */
export default function AlertaPendientes() {
  const [total,   setTotal]   = useState(0);
  const [detalle, setDetalle] = useState<Detalle[]>([]);
  const [permiso, setPermiso] = useState<NotificationPermission | "no-soportado">("granted");
  const [pospuestoHasta, setPospuesto] = useState(0);

  const tituloOriginal = useRef("");
  const totalPrevio    = useRef(0);
  const ultimoAviso    = useRef(0);

  useEffect(() => {
    tituloOriginal.current = document.title;
    setPermiso(typeof Notification === "undefined" ? "no-soportado" : Notification.permission);
  }, []);

  // Notificación del sistema operativo: lo único visible con el navegador de fondo
  const avisarEscritorio = async (titulo: string, cuerpo: string) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const opciones: NotificationOptions & { renotify?: boolean; image?: string } = {
        body: cuerpo,
        tag:  "catastro-pendientes",   // reemplaza la anterior en vez de apilarlas
        renotify: true,
        requireInteraction: true,      // permanece hasta que el usuario la cierre
        image: IMAGEN,                 // banner naranja dentro de la notificación
        icon:  IMAGEN,
        data: { url: "/dashboard" },
      };
      if (reg) await reg.showNotification(titulo, opciones);
      else new Notification(titulo, opciones);
    } catch { /* el aviso es un extra; si falla queda el título parpadeando */ }
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

      // Fuera de la pestaña se insiste; dentro ya está el recuadro a la vista
      const fuera = document.visibilityState === "hidden";
      const subio = n > totalPrevio.current;
      const tocaInsistir = Date.now() - ultimoAviso.current > RECORDAR_MS;

      if (fuera && (subio || tocaInsistir)) {
        ultimoAviso.current = Date.now();
        avisarEscritorio(
          `${n} plano${n === 1 ? "" : "s"} por verificar`,
          det[0]?.texto ?? "Ventanilla está esperando"
        );
      }
      totalPrevio.current = n;
    } catch { /* se reintenta en el siguiente ciclo */ }
  }, 20_000);

  // El título parpadea: se lee desde la barra de pestañas del navegador
  useEffect(() => {
    if (total === 0) {
      if (tituloOriginal.current) document.title = tituloOriginal.current;
      return;
    }
    let alterno = false;
    const t = setInterval(() => {
      alterno = !alterno;
      document.title = alterno
        ? `🔔 (${total}) Plano por verificar`
        : tituloOriginal.current || "Catastro Montería";
    }, 1400);

    return () => {
      clearInterval(t);
      if (tituloOriginal.current) document.title = tituloOriginal.current;
    };
  }, [total]);

  const pedirPermiso = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setPermiso(r);
    if (r === "granted") {
      avisarEscritorio("Avisos activados", "Así te avisaremos cuando haya un plano por verificar.");
    }
  };

  if (total === 0 || Date.now() < pospuestoHasta) return null;

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
              Tienes {total} plano{total === 1 ? "" : "s"} por verificar
            </p>
            <p className="text-xs text-white/90 leading-snug truncate">
              {principal?.texto ?? "Ventanilla está esperando"}
            </p>
          </div>
        </div>

        {/* Sin permiso el aviso no sale de esta pestaña */}
        {permiso === "default" && (
          <button
            onClick={pedirPermiso}
            className="w-full mt-2.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <MonitorSmartphone className="h-3.5 w-3.5" />
            Avisarme también estando en otra pestaña
          </button>
        )}
        {permiso === "denied" && (
          <p className="mt-2.5 text-[11px] text-white/85 leading-snug">
            Para que este aviso te llegue estando en otra pestaña, desbloquea las
            notificaciones desde el candado de la barra de direcciones.
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
