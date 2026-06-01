"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

interface Notif {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  plan?: { id: string; radicado: string } | null;
}

const COL = "America/Bogota";
const fmt = (d: string) =>
  new Date(d).toLocaleString("es-CO", { timeZone: COL, dateStyle: "short", timeStyle: "short" });

export default function NotificationBell() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [open, setOpen]       = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.isRead).length;

  const fetchNotifs = () =>
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setNotifs(data))
      .catch(() => {});

  useEffect(() => {
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(id);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (!open) {
            setOpen(true);
            if (unread > 0) markAllRead();
          } else {
            setOpen(false);
          }
        }}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notificaciones</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                Sin notificaciones
              </p>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 transition-colors ${
                    n.isRead
                      ? "bg-white dark:bg-slate-900"
                      : "bg-blue-50 dark:bg-blue-900/20"
                  }`}
                >
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{n.message}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{fmt(n.createdAt)}</span>
                    {n.plan && (
                      <Link
                        href={`/dashboard/buscar/${n.plan.id}`}
                        onClick={() => setOpen(false)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        Ver plano →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
