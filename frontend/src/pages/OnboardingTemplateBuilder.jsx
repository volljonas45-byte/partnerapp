import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Trash2, Copy, GripVertical,
  AlignLeft, Edit3, List, Key, CheckSquare, Upload,
  Check, ChevronDown, Palette, ExternalLink, Image,
  AlertCircle, Eye, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { onboardingApi } from '../api/onboarding';
import api from '../api/client';
import { useConfirm } from '../hooks/useConfirm';

// ── Step type config ───────────────────────────────────────────────────────────

const STEP_TYPES = [
  { value: 'text',        label: 'Infotext',       icon: AlignLeft,   color: 'bg-violet-100 text-violet-600'  },
  { value: 'form',        label: 'Formular',        icon: Edit3,       color: 'bg-blue-100 text-blue-600'     },
  { value: 'select',      label: 'Auswahl',         icon: List,        color: 'bg-cyan-100 text-cyan-600'     },
  { value: 'credentials', label: 'Zugangsdaten',    icon: Key,         color: 'bg-amber-100 text-amber-600'   },
  { value: 'checklist',   label: 'Checkliste',      icon: CheckSquare, color: 'bg-green-100 text-green-600'   },
  { value: 'file_upload', label: 'Datei-Upload',    icon: Upload,      color: 'bg-rose-100 text-rose-600'     },
];

const FIELD_TYPES = ['text', 'email', 'phone', 'textarea', 'url'];

function typeConfig(value) {
  return STEP_TYPES.find(t => t.value === value) ?? STEP_TYPES[0];
}

function uid() { return Math.random().toString(36).slice(2, 8); }

function defaultConfig(type) {
  switch (type) {
    case 'text':        return { instructions: [], content: '' };
    case 'form':        return { instructions: [], fields: [{ id: uid(), label: 'Name', type: 'text', required: true, placeholder: '' }] };
    case 'select':      return { instructions: [], question: '', multiple: false, options: [{ id: uid(), label: 'Option 1' }, { id: uid(), label: 'Option 2' }] };
    case 'credentials': return { instructions: [], note: '', fields: [{ id: uid(), label: 'URL', type: 'url', required: false }] };
    case 'checklist':   return { instructions: [], items: [{ id: uid(), label: 'Punkt 1' }], requireAll: false };
    case 'file_upload': return { instructions: [], label: 'Dateien hochladen', accept: '*', multiple: false, maxMb: 10 };
    default:            return { instructions: [] };
  }
}

// ── Config editors ─────────────────────────────────────────────────────────────

function TextEditor({ config, onChange }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">Inhalt</p>
      <textarea
        rows={7}
        value={config.content || ''}
        onChange={e => onChange({ ...config, content: e.target.value })}
        placeholder="Schreibe hier den Text, der dem Kunden angezeigt wird…"
        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none leading-relaxed"
      />
    </div>
  );
}

function FormEditor({ config, onChange }) {
  const fields = config.fields || [];
  const set = (idx, patch) => onChange({ ...config, fields: fields.map((f, i) => i === idx ? { ...f, ...patch } : f) });
  const add = () => onChange({ ...config, fields: [...fields, { id: uid(), label: 'Feld', type: 'text', required: false, placeholder: '' }] });
  const remove = (idx) => onChange({ ...config, fields: fields.filter((_, i) => i !== idx) });
  return (
    <div className="space-y-2">
      {fields.map((f, idx) => (
        <div key={f.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <input
            value={f.label}
            onChange={e => set(idx, { label: e.target.value })}
            placeholder="Bezeichnung"
            className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
          <select
            value={f.type}
            onChange={e => set(idx, { type: e.target.value })}
            className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
          >
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer select-none">
            <input type="checkbox" className="rounded" checked={f.required} onChange={e => set(idx, { required: e.target.checked })} />
            Pflicht
          </label>
          <button onClick={() => remove(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 pt-1 transition-colors">
        <Plus size={13} /> Feld hinzufügen
      </button>
    </div>
  );
}

function SelectEditor({ config, onChange }) {
  const options = config.options || [];
  const setOpt = (idx, label) => onChange({ ...config, options: options.map((o, i) => i === idx ? { ...o, label } : o) });
  const add    = () => onChange({ ...config, options: [...options, { id: uid(), label: `Option ${options.length + 1}` }] });
  const remove = (idx) => onChange({ ...config, options: options.filter((_, i) => i !== idx) });
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Frage</p>
        <input
          value={config.question || ''}
          onChange={e => onChange({ ...config, question: e.target.value })}
          placeholder="z.B. Wie haben Sie von uns erfahren?"
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
        <input type="checkbox" className="rounded" checked={config.multiple || false} onChange={e => onChange({ ...config, multiple: e.target.checked })} />
        Mehrfachauswahl erlauben
      </label>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Optionen</p>
        <div className="space-y-2">
          {options.map((o, idx) => (
            <div key={o.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-gray-300 shrink-0" />
              <input
                value={o.label}
                onChange={e => setOpt(idx, e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
              <button onClick={() => remove(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button onClick={add} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            <Plus size={13} /> Option hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

function CredentialsEditor({ config, onChange }) {
  const fields = config.fields || [];
  const set    = (idx, patch) => onChange({ ...config, fields: fields.map((f, i) => i === idx ? { ...f, ...patch } : f) });
  const add    = () => onChange({ ...config, fields: [...fields, { id: uid(), label: 'Feld', type: 'text', required: false }] });
  const remove = (idx) => onChange({ ...config, fields: fields.filter((_, i) => i !== idx) });
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Hinweis</p>
        <textarea
          rows={2}
          value={config.note || ''}
          onChange={e => onChange({ ...config, note: e.target.value })}
          placeholder="z.B. Bitte gebt uns Zugang zu folgenden Systemen:"
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>
      <div className="space-y-2">
        {fields.map((f, idx) => (
          <div key={f.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <input
              value={f.label}
              onChange={e => set(idx, { label: e.target.value })}
              placeholder="Bezeichnung"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
            />
            <select
              value={f.type}
              onChange={e => set(idx, { type: e.target.value })}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            >
              {['text','url','email'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer select-none">
              <input type="checkbox" className="rounded" checked={f.required} onChange={e => set(idx, { required: e.target.checked })} />
              Pflicht
            </label>
            <button onClick={() => remove(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button onClick={add} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
          <Plus size={13} /> Feld hinzufügen
        </button>
      </div>
    </div>
  );
}

function ChecklistEditor({ config, onChange }) {
  const items  = config.items || [];
  const set    = (idx, label) => onChange({ ...config, items: items.map((item, i) => i === idx ? { ...item, label } : item) });
  const add    = () => onChange({ ...config, items: [...items, { id: uid(), label: `Punkt ${items.length + 1}` }] });
  const remove = (idx) => onChange({ ...config, items: items.filter((_, i) => i !== idx) });
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
        <input type="checkbox" className="rounded" checked={config.requireAll || false} onChange={e => onChange({ ...config, requireAll: e.target.checked })} />
        Alle Punkte müssen bestätigt werden
      </label>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
            <input
              value={item.label}
              onChange={e => set(idx, e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <button onClick={() => remove(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button onClick={add} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
          <Plus size={13} /> Punkt hinzufügen
        </button>
      </div>
    </div>
  );
}

function FileUploadEditor({ config, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Beschriftung</p>
        <input value={config.label || ''} onChange={e => onChange({ ...config, label: e.target.value })} placeholder="z.B. Logo hochladen" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Erlaubte Dateitypen</p>
        <input value={config.accept || '*'} onChange={e => onChange({ ...config, accept: e.target.value })} placeholder=".svg,.png,.pdf" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
          <input type="checkbox" className="rounded" checked={config.multiple || false} onChange={e => onChange({ ...config, multiple: e.target.checked })} />
          Mehrere Dateien
        </label>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500">Max. MB</p>
          <input type="number" min={1} max={50} value={config.maxMb || 10} onChange={e => onChange({ ...config, maxMb: Number(e.target.value) })} className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none" />
        </div>
      </div>
    </div>
  );
}

function InstructionsEditor({ config, onChange }) {
  const instructions = config.instructions || [];
  const add    = () => onChange({ ...config, instructions: [...instructions, ''] });
  const set    = (idx, val) => onChange({ ...config, instructions: instructions.map((s, i) => i === idx ? val : s) });
  const remove = (idx) => onChange({ ...config, instructions: instructions.filter((_, i) => i !== idx) });

  return (
    <div className="mb-8">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Anweisungen</p>
      <div className="space-y-2">
        {instructions.map((instr, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-2">{idx + 1}</span>
            <input
              value={instr}
              onChange={e => set(idx, e.target.value)}
              placeholder={`Anweisung ${idx + 1}…`}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button onClick={() => remove(idx)} className="mt-2 text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button onClick={add} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 pt-1 transition-colors">
          <Plus size={13} /> Anweisung hinzufügen
        </button>
      </div>
    </div>
  );
}

function ConfigEditor({ step, onChange }) {
  switch (step.type) {
    case 'text':        return <TextEditor        config={step.config} onChange={onChange} />;
    case 'form':        return <FormEditor        config={step.config} onChange={onChange} />;
    case 'select':      return <SelectEditor      config={step.config} onChange={onChange} />;
    case 'credentials': return <CredentialsEditor config={step.config} onChange={onChange} />;
    case 'checklist':   return <ChecklistEditor   config={step.config} onChange={onChange} />;
    case 'file_upload': return <FileUploadEditor  config={step.config} onChange={onChange} />;
    default:            return null;
  }
}

// ── Live Preview ───────────────────────────────────────────────────────────────

function PreviewStep({ step, brand }) {
  const color = brand.color || '#111827';
  if (!step) return (
    <div className="flex items-center justify-center h-full text-gray-300 text-sm">
      Wähle einen Schritt aus
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Preview header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        {brand.logo && <img src={brand.logo} alt="" className="h-5 object-contain" />}
        {brand.name && <span className="text-xs font-semibold text-gray-800">{brand.name}</span>}
        <div className="flex-1" />
        <span className="text-xs text-gray-400">Vorschau</span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100">
        <div className="h-full w-1/3 rounded-full" style={{ backgroundColor: color }} />
      </div>

      {/* Step preview */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color }}>
          {typeConfig(step.type).label}
        </p>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {step.title || <span className="text-gray-300">Titel…</span>}
        </h3>
        {step.description && (
          <p className="text-sm text-gray-500 mb-4">{step.description}</p>
        )}

        {/* Instructions preview */}
        {(step.config.instructions || []).length > 0 && (
          <ol className="space-y-2 mb-4">
            {step.config.instructions.map((instr, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-gray-600">
                <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white mt-0.5" style={{ backgroundColor: color }}>{i + 1}</span>
                <span>{instr || <span className="text-gray-300 italic">Anweisung…</span>}</span>
              </li>
            ))}
          </ol>
        )}

        {/* Type-specific preview */}
        <div className="mt-4">
          {step.type === 'text' && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {step.config.content || <span className="text-gray-300 italic">Noch kein Inhalt…</span>}
            </p>
          )}

          {step.type === 'form' && (
            <div className="space-y-3">
              {(step.config.fields || []).map(f => (
                <div key={f.id}>
                  <p className="text-xs font-medium text-gray-600 mb-1">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</p>
                  <div className="h-9 border border-gray-200 rounded-lg bg-white px-3 flex items-center">
                    <span className="text-xs text-gray-300">{f.placeholder || f.label}…</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step.type === 'select' && (
            <div className="space-y-2">
              {step.config.question && <p className="text-sm font-medium text-gray-700 mb-3">{step.config.question}</p>}
              {(step.config.options || []).map((o, i) => (
                <div key={o.id} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${i === 0 ? 'border-current font-medium' : 'border-gray-200 text-gray-600'}`} style={i === 0 ? { borderColor: color, color } : {}}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${i === 0 ? 'border-current' : 'border-gray-300'}`} style={i === 0 ? { borderColor: color } : {}}>
                    {i === 0 && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
                  </div>
                  {o.label}
                </div>
              ))}
            </div>
          )}

          {step.type === 'credentials' && (
            <div className="space-y-3">
              {step.config.note && <p className="text-sm text-gray-500 bg-gray-50 px-4 py-2.5 rounded-lg">{step.config.note}</p>}
              {(step.config.fields || []).map(f => (
                <div key={f.id}>
                  <p className="text-xs font-medium text-gray-600 mb-1">{f.label}</p>
                  <div className="h-9 border border-gray-200 rounded-lg bg-white px-3 flex items-center">
                    <span className="text-xs text-gray-300">{f.label}…</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step.type === 'checklist' && (
            <div className="space-y-2.5">
              {(step.config.items || []).map((item, i) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${i === 0 ? 'border-current' : 'border-gray-300'}`} style={i === 0 ? { borderColor: color, backgroundColor: color } : {}}>
                    {i === 0 && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {step.type === 'file_upload' && (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <Upload size={20} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">{step.config.label || 'Dateien hochladen'}</p>
              <p className="text-xs text-gray-400 mt-1">Max. {step.config.maxMb || 10} MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation preview */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <button className="text-sm text-gray-400">← Zurück</button>
        <button className="px-5 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: color }}>
          Weiter →
        </button>
      </div>
    </div>
  );
}

// ── Client Branding Panel ──────────────────────────────────────────────────────

function ClientBrandingPanel({ brand, onChange, onClose, clients = [] }) {
  const logoRef = useRef(null);

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange({ ...brand, logo: ev.target.result });
    reader.readAsDataURL(file);
  };

  const handleClientSelect = (e) => {
    const clientId = e.target.value;
    if (!clientId) return;
    const client = clients.find(c => String(c.id) === clientId);
    if (client) {
      onChange({
        name:  client.company_name,
        color: client.brand_color || '#111827',
        logo:  client.brand_logo  || null,
      });
    }
  };

  return (
    <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-50">
      <p className="text-sm font-semibold text-gray-900 mb-4">Branding</p>
      <div className="space-y-4">
        {/* Client selector */}
        {clients.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Firma auswählen</p>
            <select
              onChange={handleClientSelect}
              defaultValue=""
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="" disabled>Firma wählen…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Firmenname</p>
          <input
            value={brand.name || ''}
            onChange={e => onChange({ ...brand, name: e.target.value })}
            placeholder="z.B. Deine Agentur"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Primärfarbe</p>
          <div className="flex items-center gap-2">
            <input type="color" value={brand.color || '#111827'} onChange={e => onChange({ ...brand, color: e.target.value })}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0" />
            <input value={brand.color || '#111827'} onChange={e => onChange({ ...brand, color: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono" />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Logo</p>
          {brand.logo ? (
            <div className="flex items-center gap-2">
              <img src={brand.logo} alt="" className="h-8 object-contain rounded border border-gray-200 px-2" />
              <button onClick={() => onChange({ ...brand, logo: null })} className="text-xs text-gray-400 hover:text-red-500">Entfernen</button>
            </div>
          ) : (
            <button onClick={() => logoRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors w-full">
              <Image size={13} /> Logo hochladen
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </button>
          )}
        </div>
      </div>
      <button onClick={onClose} className="mt-4 w-full py-2 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800">
        Fertig
      </button>
    </div>
  );
}

// ── Preview Modal ──────────────────────────────────────────────────────────────

function PreviewModal({ steps, brand, onClose }) {
  const [idx, setIdx] = useState(0);
  const color = brand.color || '#111827';
  const step  = steps[idx];
  const progress = Math.round(((idx) / steps.length) * 100);

  if (!steps.length) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
        <p className="text-gray-500 text-sm">Noch keine Schritte vorhanden.</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg">Schließen</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-gray-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh', '--brand': color }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 shrink-0">
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: color }} />
        </div>

        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            {brand.logo && <img src={brand.logo} alt="" className="h-6 object-contain" />}
            {brand.name && <span className="text-sm font-semibold text-gray-800">{brand.name}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{idx + 1} / {steps.length}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color }}>
            Schritt {idx + 1}
          </p>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {step.title || <span className="text-gray-300">Titel…</span>}
          </h2>
          {step.description && <p className="text-sm text-gray-500 mt-1 mb-4">{step.description}</p>}

          {/* Instructions */}
          {(step.config.instructions || []).length > 0 && (
            <ol className="space-y-2.5 my-4">
              {step.config.instructions.map((instr, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white mt-0.5" style={{ backgroundColor: color }}>{i + 1}</span>
                  <span>{instr}</span>
                </li>
              ))}
            </ol>
          )}

          {/* Type preview */}
          <div className="mt-4">
            {step.type === 'text' && (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{step.config.content || <span className="italic text-gray-300">Kein Inhalt</span>}</p>
            )}
            {step.type === 'form' && (
              <div className="space-y-3">
                {(step.config.fields || []).map(f => (
                  <div key={f.id}>
                    <p className="text-xs font-medium text-gray-600 mb-1">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}</p>
                    <div className="h-9 border border-gray-200 rounded-lg bg-white px-3 flex items-center">
                      <span className="text-xs text-gray-300">{f.placeholder || f.label}…</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {step.type === 'select' && (
              <div className="space-y-2">
                {step.config.question && <p className="text-sm font-medium text-gray-700 mb-3">{step.config.question}</p>}
                {(step.config.options || []).map((o, i) => (
                  <div key={o.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                    {o.label}
                  </div>
                ))}
              </div>
            )}
            {step.type === 'credentials' && (
              <div className="space-y-3">
                {step.config.note && <p className="text-sm text-gray-500 bg-gray-50 px-4 py-2.5 rounded-lg">{step.config.note}</p>}
                {(step.config.fields || []).map(f => (
                  <div key={f.id}>
                    <p className="text-xs font-medium text-gray-600 mb-1">{f.label}</p>
                    <div className="h-9 border border-gray-200 rounded-lg bg-white px-3 flex items-center">
                      <span className="text-xs text-gray-300">{f.label}…</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {step.type === 'checklist' && (
              <div className="space-y-2.5">
                {(step.config.items || []).map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            {step.type === 'file_upload' && (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                <Upload size={20} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">{step.config.label || 'Dateien hochladen'}</p>
                <p className="text-xs text-gray-400 mt-1">Max. {step.config.maxMb || 10} MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex items-center gap-1.5 text-sm text-gray-500 disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Zurück
          </button>
          <button
            onClick={() => idx < steps.length - 1 ? setIdx(i => i + 1) : onClose()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {idx < steps.length - 1 ? <>Weiter <ChevronRight size={16} /></> : <><Check size={14} /> Abschließen</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Type Picker (slash command) ────────────────────────────────────────────────

function TypePicker({ onSelect, onClose, direction = 'down' }) {
  return (
    <div className={`absolute left-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
      {STEP_TYPES.map(t => {
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            onClick={() => onSelect(t.value)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.color}`}>
              <Icon size={14} />
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OnboardingTemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const { data: template, isLoading } = useQuery({
    queryKey: ['onboarding-template', id],
    queryFn: () => onboardingApi.getTemplate(id).then(r => r.data),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/api/clients').then(r => r.data),
  });

  // ── Local state ──────────────────────────────────────────────────────────────
  const [steps,         setSteps]        = useState(null);  // null = use server
  const [activeId,      setActiveId]     = useState(null);
  const [brand,         setBrand]        = useState(null);  // null = use server
  const [saveStatus,    setSaveStatus]   = useState('saved'); // saved | saving | error
  const [showBranding,  setShowBranding] = useState(false);
  const [showPreview,   setShowPreview]  = useState(false);
  const [showPicker,    setShowPicker]   = useState(false);
  const [dragOver,      setDragOver]     = useState(null);
  const dragItem = useRef(null);
  const saveTimer = useRef({});

  // Sync from server on first load
  useEffect(() => {
    if (template && !steps) {
      setSteps(template.steps || []);
      setActiveId(template.steps?.[0]?.id ?? null);
    }
    if (template && !brand) {
      setBrand({ name: template.brand_name || '', color: template.brand_color || '#111827', logo: template.brand_logo || null });
    }
  }, [template]);

  const liveSteps  = steps ?? (template?.steps || []);
  const liveBrand  = brand ?? { name: '', color: '#111827', logo: null };
  const activeStep = liveSteps.find(s => s.id === activeId) ?? null;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const updateTemplateMutation = useMutation({
    mutationFn: (data) => onboardingApi.updateTemplate(id, data),
    onSuccess:  ()  => { qc.invalidateQueries({ queryKey: ['onboarding-template', id] }); setSaveStatus('saved'); },
    onError:    ()  => setSaveStatus('error'),
  });

  const addStepMutation = useMutation({
    mutationFn: (data) => onboardingApi.addStep(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['onboarding-template', id] });
      setSteps(null);
      setActiveId(data.id);
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, data }) => onboardingApi.updateStep(id, stepId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding-template', id] }); setSaveStatus('saved'); },
    onError:   () => setSaveStatus('error'),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId) => onboardingApi.deleteStep(id, stepId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding-template', id] }); setSteps(null); },
  });

  const reorderMutation = useMutation({
    mutationFn: (stepIds) => onboardingApi.reorderSteps(id, stepIds),
  });


  // ── Autosave (debounced) ─────────────────────────────────────────────────────

  const autosaveStep = useCallback((step) => {
    setSaveStatus('saving');
    clearTimeout(saveTimer.current[step.id]);
    saveTimer.current[step.id] = setTimeout(() => {
      updateStepMutation.mutate({
        stepId: step.id,
        data: { title: step.title, description: step.description, config: step.config },
      });
    }, 800);
  }, []);

  const autosaveBrand = useCallback((b) => {
    setSaveStatus('saving');
    clearTimeout(saveTimer.current['brand']);
    saveTimer.current['brand'] = setTimeout(() => {
      updateTemplateMutation.mutate({ brand_name: b.name, brand_color: b.color, brand_logo: b.logo });
    }, 800);
  }, []);

  // ── Step helpers ─────────────────────────────────────────────────────────────

  const patchStep = (patch) => {
    const updated = liveSteps.map(s => s.id === activeId ? { ...s, ...patch } : s);
    setSteps(updated);
    const newStep = updated.find(s => s.id === activeId);
    if (newStep) autosaveStep(newStep);
  };

  const addStep = (type) => {
    setShowPicker(false);
    addStepMutation.mutate({ type, title: typeConfig(type).label, config: defaultConfig(type) });
  };

  const duplicateStep = (step) => {
    addStepMutation.mutate({ type: step.type, title: `${step.title} (Kopie)`, description: step.description || '', config: step.config });
  };

  const deleteStep = (stepId) => {
    const remaining = liveSteps.filter(s => s.id !== stepId);
    if (activeId === stepId) setActiveId(remaining[0]?.id ?? null);
    deleteStepMutation.mutate(stepId);
  };

  // ── Drag and drop ────────────────────────────────────────────────────────────

  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { setDragOver(idx); };
  const handleDragEnd   = () => {
    if (dragItem.current === null || dragOver === null || dragItem.current === dragOver) {
      dragItem.current = null; setDragOver(null); return;
    }
    const arr = [...liveSteps];
    const dragged = arr.splice(dragItem.current, 1)[0];
    arr.splice(dragOver, 0, dragged);
    setSteps(arr);
    reorderMutation.mutate(arr.map(s => s.id));
    dragItem.current = null; setDragOver(null);
  };

  // ── Brand change ─────────────────────────────────────────────────────────────

  const handleBrandChange = (b) => {
    setBrand(b);
    autosaveBrand(b);
  };

  if (isLoading) return <div className="h-full flex items-center justify-center text-sm text-gray-400">Lädt…</div>;
  if (!template) return <div className="h-full flex items-center justify-center text-sm text-red-500">Vorlage nicht gefunden</div>;

  const tc = activeStep ? typeConfig(activeStep.type) : null;
  const TypeIcon = tc?.icon;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">

      {/* ── Top bar ── */}
      <div className="h-12 border-b border-gray-200 bg-white flex items-center gap-3 px-4 shrink-0">
        <button onClick={() => navigate('/onboarding')} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{template.name}</span>
        <div className="flex-1" />

        {/* Autosave indicator */}
        <span className={`text-xs flex items-center gap-1.5 ${saveStatus === 'saved' ? 'text-gray-400' : saveStatus === 'saving' ? 'text-amber-500' : 'text-red-500'}`}>
          {saveStatus === 'saved'  && <><Check size={12} /> Gespeichert</>}
          {saveStatus === 'saving' && <>Wird gespeichert…</>}
          {saveStatus === 'error'  && <><AlertCircle size={12} /> Fehler</>}
        </span>

        {/* Branding toggle */}
        <div className="relative">
          <button
            onClick={() => setShowBranding(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${showBranding ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Palette size={13} /> Branding
          </button>
          {showBranding && (
            <ClientBrandingPanel
              brand={liveBrand}
              clients={clients}
              onChange={handleBrandChange}
              onClose={() => setShowBranding(false)}
            />
          )}
        </div>

        {/* Preview button */}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Eye size={13} /> Vorschau
        </button>

        <button
          onClick={() => navigate('/onboarding/flows')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ExternalLink size={13} /> Flow erstellen
        </button>
      </div>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Steps panel ── */}
        <div className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="px-3 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Schritte</p>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {liveSteps.map((step, idx) => {
              const tc = typeConfig(step.type);
              const Icon = tc.icon;
              const isActive  = step.id === activeId;
              const isDragOver = dragOver === idx;
              return (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => setActiveId(step.id)}
                  className={`group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all select-none ${
                    isActive  ? 'bg-gray-100 text-gray-900' :
                    isDragOver ? 'bg-blue-50 border border-blue-200' :
                    'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <GripVertical size={12} className="text-gray-300 shrink-0 cursor-grab" />
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] ${tc.color}`}>
                    <Icon size={11} />
                  </span>
                  <span className="flex-1 text-xs truncate font-medium">{step.title}</span>
                  {/* Hover actions */}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); duplicateStep(step); }}
                      className="p-0.5 text-gray-400 hover:text-gray-700 rounded"
                      title="Duplizieren"
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      onClick={async e => { e.stopPropagation(); const ok = await confirm('Dieser Schritt wird gelöscht.', { title: 'Schritt löschen' }); if (ok) deleteStep(step.id); }}
                      className="p-0.5 text-gray-400 hover:text-red-500 rounded"
                      title="Löschen"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add step */}
          <div className="p-2 border-t border-gray-100 relative">
            <button
              onClick={() => setShowPicker(v => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Plus size={13} /> Schritt hinzufügen
              <ChevronDown size={11} className="ml-auto" />
            </button>
            {showPicker && (
              <TypePicker onSelect={addStep} onClose={() => setShowPicker(false)} direction="up" />
            )}
          </div>
        </div>

        {/* ── CENTER: Editor ── */}
        <div className="flex-1 overflow-y-auto">
          {!activeStep ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <p className="text-sm">Wähle einen Schritt aus oder füge einen neuen hinzu</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-8 py-10">
              {/* Step type badge (clickable to change) */}
              <div className="relative inline-block mb-6">
                <button
                  onClick={() => setShowPicker(v => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${tc.color}`}
                >
                  <TypeIcon size={12} /> {tc.label} <ChevronDown size={11} />
                </button>
                {showPicker && (
                  <TypePicker
                    onSelect={(type) => {
                      setShowPicker(false);
                      patchStep({ type, config: defaultConfig(type) });
                    }}
                    onClose={() => setShowPicker(false)}
                  />
                )}
              </div>

              {/* Editable title */}
              <input
                value={activeStep.title}
                onChange={e => patchStep({ title: e.target.value })}
                placeholder="Schritt-Titel…"
                className="w-full text-2xl font-bold text-gray-900 bg-transparent border-none outline-none mb-2 placeholder-gray-200"
              />

              {/* Editable description */}
              <input
                value={activeStep.description || ''}
                onChange={e => patchStep({ description: e.target.value })}
                placeholder="Kurze Beschreibung (optional)…"
                className="w-full text-sm text-gray-500 bg-transparent border-none outline-none mb-8 placeholder-gray-300"
              />

              {/* Divider */}
              <div className="border-t border-gray-100 mb-8" />

              {/* Instructions editor */}
              <InstructionsEditor
                config={activeStep.config}
                onChange={(newConfig) => patchStep({ config: newConfig })}
              />

              {/* Divider */}
              <div className="border-t border-gray-100 mb-8" />

              {/* Config editor */}
              <ConfigEditor
                step={activeStep}
                onChange={(newConfig) => patchStep({ config: newConfig })}
              />
            </div>
          )}
        </div>

      </div>

      {/* ── Preview Modal ── */}
      {showPreview && (
        <PreviewModal
          steps={liveSteps}
          brand={liveBrand}
          onClose={() => setShowPreview(false)}
        />
      )}
      {ConfirmDialogNode}
    </div>
  );
}
