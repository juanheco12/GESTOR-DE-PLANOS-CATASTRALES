"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";

interface Detalle { tipo: string; n: number; texto: string; url: string }

const RECORDAR_MS  = 3 * 60 * 1000;   // se insiste cada tres minutos estando fuera
const CLAVE_OCULTO = "catastro:permiso-oculto";

/**
 * Aviso de verificaciones sin atender.
 *
 * No dibuja nada mientras el usuario está en la pestaña del sistema: ahí ya
 * tiene el contador del botón flotante. Lo que hace es avisar **fuera** de
 * ella — notificación del escritorio, título parpadeante y sonido — para el
 * caso real: el digitalizador trabajando en otra pestaña o en otro programa.
 *
 * Lo único que puede mostrar es un recuadro para conceder el permiso del
 * navegador, sin el cual nada de lo anterior es posible.
 */
export default function AlertaPendientes() {
  const [total,   setTotal]   = useState(0);
  const [detalle, setDetalle] = useState<Detalle[]>([]);
  const [permiso, setPermiso] = useState<NotificationPermission | "no-soportado">("granted");
  const [ocultoPorUsuario, setOculto] = useState(true);

  const tituloOriginal = useRef("");
  const totalPrevio    = useRef(0);
  const ultimoAviso    = useRef(0);

  useEffect(() => {
    tituloOriginal.current = document.title;
    setPermiso(typeof Notification === "undefined" ? "no-soportado" : Notification.permission);
    setOculto(localStorage.getItem(CLAVE_OCULTO) === "1");
  }, []);

  // Notificación del sistema operativo, visible con el navegador de fondo
  const avisarEscritorio = async (titulo: string, cuerpo: string) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const opciones: NotificationOptions & { renotify?: boolean } = {
        body: cuerpo,
        tag:  "catastro-pendientes",   // reemplaza la anterior en vez de apilarlas
        renotify: true,
        requireInteraction: true,      // permanece hasta que el usuario la cierre
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

      // Solo se avisa fuera de la pestaña: dentro estorba y ya se ve el contador
      const fuera = document.visibilityState === "hidden";
      const subio = n > totalPrevio.current;
      const tocaInsistir = Date.now() - ultimoAviso.current > RECORDAR_MS;

      if (fuera && (subio || tocaInsistir)) {
        ultimoAviso.current = Date.now();
        avisarEscritorio(
          `🔔 ${n} plano${n === 1 ? "" : "s"} por verificar`,
          det[0]?.texto ?? "Tienes verificaciones pendientes"
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
      avisarEscritorio("Avisos activados", "Te avisaremos aquí cuando haya planos por verificar.");
    }
  };

  const noMostrarMas = () => {
    setOculto(true);
    localStorage.setItem(CLAVE_OCULTO, "1");
  };

  // Único caso en que se dibuja algo: falta el permiso que hace posible el aviso
  const pedirlo = permiso === "default" && !ocultoPorUsuario;
  if (!pedirlo) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[70] w-[min(92vw,22rem)]">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Activa los avisos del escritorio
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Para enterarte de un plano por verificar aunque estés en otra pestaña
              o en otro programa.
            </p>
          </div>
          <button
            onClick={noMostrarMas}
            title="No mostrar de nuevo"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={pedirPermiso}
          className="w-full mt-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Activar avisos
        </button>
      </div>
    </div>
  );
}
