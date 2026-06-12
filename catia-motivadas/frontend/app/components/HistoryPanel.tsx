"use client";

import { useEffect, useState } from "react";
import { Search, Download, Eye, RefreshCw, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface HistoryRecord {
  id: number;
  fecha_creacion: string;
  tipo_mutacion: string;
  expediente: string;
  propietario: string;
  numero_predio: string;
  estado: string;
  archivo_nombre?: string;
}

interface HistoryResponse {
  records: HistoryRecord[];
  total: number;
  page: number;
  page_size: number;
}

interface PreviewRecord {
  id: number;
  motivada_texto: string;
  expediente: string;
}

export default function HistoryPanel() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewRecord | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const PAGE_SIZE = 10;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      const resp = await axios.get(`${API}/api/history/`, { params });
      setData(resp.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchHistory();
  };

  const handlePreview = async (id: number, expediente: string) => {
    const resp = await axios.get(`${API}/api/history/${id}`);
    setPreview({ id, motivada_texto: resp.data.data.motivada_texto, expediente });
  };

  const handleDownload = async (id: number, expediente: string) => {
    setDownloading(id);
    try {
      const resp = await axios.get(`${API}/api/history/${id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motivada_${expediente}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-100">Historial de Motivadas</h2>
          {data && <p className="text-xs text-gray-500 mt-0.5">{data.total} registros en total</p>}
        </div>
        <button onClick={fetchHistory} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar por expediente, propietario o predio…"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">
          Buscar
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12 text-gray-600 text-sm">Cargando…</div>
      ) : !data || data.records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
          <FileText size={36} strokeWidth={1} />
          <p className="text-sm">No hay registros aún</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Expediente</th>
                  <th className="px-4 py-3 font-medium">Propietario</th>
                  <th className="px-4 py-3 font-medium">Predio</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.records.map((rec) => (
                  <tr key={rec.id} className="bg-gray-950 hover:bg-gray-900/60 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(rec.fecha_creacion).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-mono text-xs whitespace-nowrap">{rec.expediente}</td>
                    <td className="px-4 py-3 text-gray-200 max-w-[160px] truncate">{rec.propietario}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">{rec.numero_predio}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        rec.estado === "GENERADA"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-gray-700 text-gray-400"
                      }`}>
                        {rec.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePreview(rec.id, rec.expediente)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                          title="Ver motivada"
                        >
                          <Eye size={14} />
                        </button>
                        {rec.archivo_nombre && (
                          <button
                            onClick={() => handleDownload(rec.id, rec.expediente)}
                            disabled={downloading === rec.id}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-gray-800 transition-colors"
                            title="Descargar .docx"
                          >
                            <Download size={14} className={downloading === rec.id ? "animate-pulse" : ""} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-gray-500 text-xs">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-40 border border-gray-700 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-gray-200 disabled:opacity-40 border border-gray-700 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <p className="text-sm font-semibold text-gray-100">Motivada</p>
                <p className="text-xs text-gray-500">{preview.expediente}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-5 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-mono flex-1">
              {preview.motivada_texto}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
