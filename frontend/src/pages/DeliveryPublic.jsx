import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ExternalLink, Link2, Shield, CheckCircle2, RefreshCw, Zap,
} from 'lucide-react';
import { deliveryApi } from '../api/delivery';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateDisplay(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <h3 className="text-base font-semibold text-gray-900 mb-3">{children}</h3>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DeliveryPublic() {
  const { token } = useParams();

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ['delivery', 'public', token],
    queryFn: () => deliveryApi.getPublic(token),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Link2 size={20} className="text-gray-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Dokument nicht gefunden</h1>
          <p className="text-sm text-gray-500">
            Dokument nicht gefunden oder nicht freigegeben
          </p>
        </div>
      </div>
    );
  }

  const links       = Array.isArray(doc.links)       ? doc.links       : [];
  const credentials = Array.isArray(doc.credentials) ? doc.credentials : [];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Vecturo wordmark */}
        <p className="text-xs font-medium text-gray-400 tracking-wide mb-10">Vecturo</p>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Projekt-Übergabe</h1>
          {doc.project_name && (
            <p className="text-xl text-gray-500 mb-4">{doc.project_name}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {doc.client_name && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {doc.client_name}
              </span>
            )}
            {doc.created_at && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                {formatDateDisplay(doc.created_at)}
              </span>
            )}
            {doc.type === 'retainer' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-purple-200">
                <RefreshCw size={11} /> Retainer
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                <Zap size={11} /> Einmalig
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-8" />

        {/* Summary */}
        {doc.summary && doc.summary.trim() && (
          <section className="mb-8">
            <SectionHeading>Projektzusammenfassung</SectionHeading>
            <p className="text-gray-600 leading-relaxed text-sm">{doc.summary}</p>
          </section>
        )}

        {/* Links */}
        {links.length > 0 && (
          <section className="mb-8">
            <SectionHeading>Wichtige Links</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors group"
                >
                  <span className="truncate">{link.label || link.url}</span>
                  <ExternalLink size={14} className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Credentials */}
        {credentials.length > 0 && (
          <section className="mb-8">
            <SectionHeading>Zugänge</SectionHeading>
            <div className="flex items-start gap-2 bg-amber-50 rounded-xl px-4 py-3 mb-4 text-xs text-amber-700">
              <Shield size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                Zugänge werden als externe Links bereitgestellt. Keine Passwörter werden gespeichert.
              </span>
            </div>
            <div className="space-y-2">
              {credentials.map((cred, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-800">{cred.label}</span>
                  <a
                    href={cred.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 font-medium"
                  >
                    Zum Zugang <span aria-hidden>→</span>
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Type-specific access section */}
        {doc.type === 'one_time' ? (
          <section className="mb-8">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-4">
              <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 mb-0.5">Vollständiger Zugang</p>
                <p className="text-xs text-emerald-700">Alle Zugänge und Codes werden übergeben.</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-8">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-4">
              <RefreshCw size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-0.5">Laufender Service</p>
                <p className="text-xs text-blue-700">Zugänge sind für die Dauer des Services verfügbar.</p>
              </div>
            </div>
          </section>
        )}

        {/* Instructions */}
        {doc.instructions && doc.instructions.trim() && (
          <section className="mb-8">
            <SectionHeading>Anweisungen & Hinweise</SectionHeading>
            <div className="bg-gray-50 rounded-xl p-5">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {doc.instructions}
              </pre>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-gray-50 pt-8 text-center">
          <p className="text-xs text-gray-300">
            Erstellt mit Vecturo · {formatDateDisplay(doc.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
