"use client";

import { useEffect, useRef } from "react";

/**
 * Ejecuta `refrescar` en tiempo real ante cualquier señal de novedad:
 *
 *  - mensaje del service worker cuando llega una notificación push
 *  - la pestaña vuelve a estar visible o recupera el foco
 *  - sondeo de respaldo, por si el push no llega (permiso denegado,
 *    navegador sin soporte, red intermitente)
 *
 * El push es la vía instantánea; el sondeo solo cubre el hueco.
 */
export function useRealtimeRefresh(refrescar: () => void, intervaloMs = 20_000) {
  // La referencia evita re-suscribir los listeners en cada render
  const cb = useRef(refrescar);
  cb.current = refrescar;

  useEffect(() => {
    const ejecutar = () => cb.current();

    const onMensajeSW = (e: MessageEvent) => {
      if (e.data?.type === "catastro-push") ejecutar();
    };
    const onVisibilidad = () => {
      if (document.visibilityState === "visible") ejecutar();
    };

    navigator.serviceWorker?.addEventListener("message", onMensajeSW);
    document.addEventListener("visibilitychange", onVisibilidad);
    window.addEventListener("focus", ejecutar);

    ejecutar();
    const id = setInterval(ejecutar, intervaloMs);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMensajeSW);
      document.removeEventListener("visibilitychange", onVisibilidad);
      window.removeEventListener("focus", ejecutar);
      clearInterval(id);
    };
  }, [intervaloMs]);
}
