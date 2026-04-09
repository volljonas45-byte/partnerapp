import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit2, Copy, ClipboardList, FileText, X, Link,
  CheckCircle2, Inbox, Eye, User, Calendar, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { intakeApi } from '../api/intake';
import { clientsApi } from '../api/clients';
import { projectsApi } from '../api/projects';
import { formatDate } from '../utils/formatters';
import { useConfirm } from '../hooks/useConfirm';

// ── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const FIELD_TYPE_LABELS = {
  text:     'Text',
  textarea: 'Textblock',
  url:      'URL',
  radio:    'Einfachauswahl',
  checkbox: 'Mehrfachauswahl',
};

// ── NewFormModal ──────────────────────────────────────────────────────────────

function NewFormModal({ templates, clients, projects, onClose, onCreate, isPending }) {
  const [formData, setFormData] = useState({
    title: '',
    template_id: '',
    client_id: '',
    project_id: '',
  });
  const [createdForm, setCreatedForm] = useState(null);

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.title.trim()) return;
    const payload = {
      title: formData.title.trim(),
      template_id: formData.template_id || undefined,
      client_id: formData.client_id || undefined,
      project_id: formData.project_id || undefined,
    };
    onCreate(payload, {
      onSuccess: (data) => {
        setCreatedForm(data);
      },
    });
  }

  function copyLink() {
    if (!createdForm?.token) return;
    const url = `${window.location.origin}/intake/fill/${createdForm.token}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link kopiert!');
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Neues Formular</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        {createdForm ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
              <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
              <span className="text-sm text-green-800 font-medium">Formular erstellt!</span>
            </div>
            <p className="text-sm text-gray-500">
              Teilen Sie diesen Link mit Ihrem Kunden:
            </p>
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 break-all font-mono">
              {`${window.location.origin}/intake/fill/${createdForm.token}`}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">Schließen</button>
              <button type="button" onClick={copyLink} className="btn-primary">
                <Link size={14} />
                Link kopieren
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Titel *</label>
              <input
                autoFocus
                className="input w-full"
                placeholder="z.B. Website-Briefing"
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Template</label>
              <select
                className="input w-full"
                value={formData.template_id}
                onChange={e => handleChange('template_id', e.target.value)}
              >
                <option value="">Kein Template</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kunde (optional)</label>
              <select
                className="input w-full"
                value={formData.client_id}
                onChange={e => handleChange('client_id', e.target.value)}
              >
                <option value="">Kein Kunde</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Projekt (optional)</label>
              <select
                className="input w-full"
                value={formData.project_id}
                onChange={e => handleChange('project_id', e.target.value)}
              >
                <option value="">Kein Projekt</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
              <button type="submit" disabled={!formData.title.trim() || isPending} className="btn-primary">
                {isPending ? 'Erstelle…' : 'Erstellen'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── TemplateEditorModal ───────────────────────────────────────────────────────

function TemplateEditorModal({ editingTemplate, onClose, onSave, isPending }) {
  const [tmpl, setTmpl] = useState(
    editingTemplate
      ? { name: editingTemplate.name, description: editingTemplate.description || '', fields: editingTemplate.fields || [] }
      : { name: '', description: '', fields: [] }
  );

  const [addingField, setAddingField] = useState(false);
  const [newField, setNewField] = useState({ label: '', type: 'text', required: false, options: [] });
  const [newOption, setNewOption] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!tmpl.name.trim()) return;
    onSave(tmpl);
  }

  function addOption() {
    const v = newOption.trim();
    if (!v || newField.options.includes(v)) return;
    setNewField(prev => ({ ...prev, options: [...prev.options, v] }));
    setNewOption('');
  }

  function removeOption(opt) {
    setNewField(prev => ({ ...prev, options: prev.options.filter(o => o !== opt) }));
  }

  function addField() {
    if (!newField.label.trim()) return;
    const needsOptions = newField.type === 'radio' || newField.type === 'checkbox';
    if (needsOptions && newField.options.length === 0) return;
    const field = {
      id: genId(),
      label: newField.label.trim(),
      type: newField.type,
      required: newField.required,
      options: needsOptions ? newField.options : [],
    };
    setTmpl(prev => ({ ...prev, fields: [...prev.fields, field] }));
    setNewField({ label: '', type: 'text', required: false, options: [] });
    setNewOption('');
    setAddingField(false);
  }

  function removeField(id) {
    setTmpl(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            {editingTemplate ? 'Template bearbeiten' : 'Neues Template'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
            <input
              autoFocus
              className="input w-full"
              placeholder="z.B. Website-Briefing"
              value={tmpl.name}
              onChange={e => setTmpl(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Beschreibung</label>
            <input
              className="input w-full"
              placeholder="Kurze Beschreibung…"
              value={tmpl.description}
              onChange={e => setTmpl(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Fields list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">Felder ({tmpl.fields.length})</label>
            </div>

            {tmpl.fields.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {tmpl.fields.map(f => (
                  <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-gray-800 truncate">{f.label}</span>
                      {f.required && <span className="text-red-400 text-xs">*</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500">
                        {FIELD_TYPE_LABELS[f.type] || f.type}
                        {(f.type === 'radio' || f.type === 'checkbox') && f.options?.length > 0 && ` (${f.options.length})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField(f.id)}
                        className="p-0.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {addingField ? (
              <div className="p-3 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bezeichnung</label>
                  <input
                    autoFocus
                    className="input w-full"
                    placeholder="z.B. Website-URL"
                    value={newField.label}
                    onChange={e => setNewField(prev => ({ ...prev, label: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addField(); } if (e.key === 'Escape') setAddingField(false); }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
                    <select
                      className="input w-full"
                      value={newField.type}
                      onChange={e => setNewField(prev => ({ ...prev, type: e.target.value, options: [] }))}
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textblock</option>
                      <option value="url">URL</option>
                      <option value="radio">Einfachauswahl</option>
                      <option value="checkbox">Mehrfachauswahl</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={e => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                      className="rounded"
                    />
                    Pflichtfeld
                  </label>
                </div>

                {/* Options editor for radio/checkbox */}
                {(newField.type === 'radio' || newField.type === 'checkbox') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Antwortoptionen
                      {newField.options.length === 0 && <span className="text-red-400 ml-1">* mindestens eine</span>}
                    </label>
                    <div className="space-y-1.5 mb-2">
                      {newField.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg">
                          <div className={`w-3 h-3 rounded-${newField.type === 'radio' ? 'full' : 'sm'} border-2 border-gray-300 shrink-0`} />
                          <span className="text-xs text-gray-700 flex-1">{opt}</span>
                          <button type="button" onClick={() => removeOption(opt)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        className="input flex-1 text-xs py-1.5"
                        placeholder="Option hinzufügen…"
                        value={newOption}
                        onChange={e => setNewOption(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                      />
                      <button
                        type="button"
                        onClick={addOption}
                        disabled={!newOption.trim()}
                        className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAddingField(false)} className="btn-secondary text-xs py-1.5">
                    Abbrechen
                  </button>
                  <button type="button" onClick={addField} disabled={!newField.label.trim()} className="btn-primary text-xs py-1.5">
                    Hinzufügen
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingField(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
              >
                <Plus size={13} />
                Feld hinzufügen
              </button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={!tmpl.name.trim() || isPending} className="btn-primary">
              {isPending ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── FillModal ─────────────────────────────────────────────────────────────────

function FillModal({ form, onClose, onSubmit, isPending }) {
  const fields = form.fields || form.template_fields || [];
  const [responses, setResponses] = useState({});

  function handleChange(fieldId, value) {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(responses);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{form.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Intern ausfüllen</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X size={16} />
          </button>
        </div>

        {fields.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400">Dieses Formular hat keine Felder.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(f => (
              <div key={f.id}>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  {f.label}
                  {f.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={4}
                    required={f.required}
                    className="input w-full resize-none"
                    value={responses[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                  />
                ) : f.type === 'url' ? (
                  <input type="url" required={f.required} placeholder="https://"
                    className="input w-full" value={responses[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                  />
                ) : f.type === 'radio' ? (
                  <div className="space-y-2">
                    {(f.options || []).map((opt, i) => (
                      <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${responses[f.id] === opt ? 'border-apple-blue bg-apple-blue' : 'border-gray-300 group-hover:border-gray-400'}`}>
                          {responses[f.id] === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <input type="radio" name={f.id} value={opt} checked={responses[f.id] === opt}
                          onChange={() => handleChange(f.id, opt)} className="sr-only" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : f.type === 'checkbox' ? (
                  <div className="space-y-2">
                    {(f.options || []).map((opt, i) => {
                      const selected = (responses[f.id] || []).includes(opt);
                      return (
                        <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-apple-blue bg-apple-blue' : 'border-gray-300 group-hover:border-gray-400'}`}>
                            {selected && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <input type="checkbox" checked={selected} onChange={() => {
                            const cur = responses[f.id] || [];
                            handleChange(f.id, selected ? cur.filter(v => v !== opt) : [...cur, opt]);
                          }} className="sr-only" />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input type="text" required={f.required}
                    className="input w-full" value={responses[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
              <button type="submit" disabled={isPending} className="btn-primary">
                {isPending ? 'Einreiche…' : 'Einreichen'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── ResponsesPanel ────────────────────────────────────────────────────────────

function ResponsesPanel({ form, onClose }) {
  const navigate  = useNavigate();
  const fields    = form.fields    || [];
  const responses = form.responses || {};

  const PAGE_LABEL_TO_VALUE = {
    'Startseite': 'startseite', 'Über uns': 'ueber_uns', 'Leistungen': 'leistungen',
    'Portfolio': 'portfolio', 'Referenzen': 'referenzen', 'Blog': 'blog',
    'Shop': 'shop', 'Kontakt': 'kontakt', 'Impressum': 'impressum',
    'Datenschutz': 'datenschutz', 'FAQ': 'faq', 'Karriere': 'karriere',
  };

  function openWizard() {
    const rawPages = responses.pages ? responses.pages.split(', ').filter(Boolean) : [];
    // support both value keys and human-readable labels
    const mappedPages = rawPages.map(p => PAGE_LABEL_TO_VALUE[p] || p);

    const prefill = {
      company_name:   responses.company_name   || '',
      contact_person: responses.contact_person || '',
      email:          responses.email          || '',
      phone:          responses.phone          || '',
      industry:       responses.industry       || '',
      has_website:    responses.has_website === 'Ja' ? true : responses.has_website === 'Nein' ? false : null,
      website_url:    responses.website_url    || '',
      project_type:   responses.project_type   || '',
      goal:           responses.goal           || '',
      pages:          mappedPages,
      first_notes:    responses.first_notes    || '',
    };
    onClose();
    navigate('/wizard', { state: { prefill } });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Eingereicht
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">{form.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              {form.client_name && (
                <span className="flex items-center gap-1"><User size={11} />{form.client_name}</span>
              )}
              {form.submitted_at && (
                <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(form.submitted_at)}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Responses */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Keine Felder definiert.</p>
          ) : (
            fields.map(field => {
              const rawAnswer = responses[field.id] || responses[field.label] || '';
              const answer = Array.isArray(rawAnswer) ? rawAnswer : rawAnswer;
              const isEmpty = Array.isArray(answer) ? answer.length === 0 : !answer;
              return (
                <div key={field.id}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{field.label}</p>
                  <div className={`bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 min-h-[40px] ${isEmpty ? 'text-gray-300 italic' : ''}`}>
                    {isEmpty ? 'Keine Antwort' : Array.isArray(answer) ? (
                      <ul className="space-y-1">
                        {answer.map((v, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-apple-blue shrink-0" />
                            {v}
                          </li>
                        ))}
                      </ul>
                    ) : answer}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer – Wizard Button */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={openWizard}
            className="w-full flex items-center justify-center gap-2 bg-apple-blue hover:bg-blue-600 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            <Sparkles size={15} />
            Im Wizard öffnen & Projekt anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Intake() {
  const qc = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();

  const [activeTab, setActiveTab]             = useState('inbox');
  const [showNewFormModal, setShowNewFormModal] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showFillModal, setShowFillModal]     = useState(null);
  const [selectedInboxItem, setSelectedInboxItem] = useState(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: forms = [], isLoading: formsLoading } = useQuery({
    queryKey: ['intake-forms'],
    queryFn: intakeApi.getForms,
  });

  const { data: inbox = [], isLoading: inboxLoading } = useQuery({
    queryKey: ['intake-inbox'],
    queryFn: intakeApi.getInbox,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['intake-templates'],
    queryFn: intakeApi.getTemplates,
  });

  const { data: clientsRaw = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  });
  const clients = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw.data || []);

  const { data: projectsRaw = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then(r => r.data || r),
  });
  const projects = Array.isArray(projectsRaw) ? projectsRaw : (projectsRaw.data || []);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createFormMutation = useMutation({
    mutationFn: intakeApi.createForm,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intake-forms'] });
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const deleteFormMutation = useMutation({
    mutationFn: intakeApi.deleteForm,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intake-forms'] });
      toast.success('Formular gelöscht');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Löschen'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: intakeApi.createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intake-templates'] });
      toast.success('Template erstellt');
      setShowTemplateEditor(false);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => intakeApi.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intake-templates'] });
      toast.success('Template gespeichert');
      setShowTemplateEditor(false);
      setEditingTemplate(null);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Speichern'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: intakeApi.deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intake-templates'] });
      toast.success('Template gelöscht');
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Löschen'),
  });

  const submitFormMutation = useMutation({
    mutationFn: ({ id, responses }) => intakeApi.submitForm(id, responses),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intake-forms'] });
      qc.invalidateQueries({ queryKey: ['intake-inbox'] });
      qc.invalidateQueries({ queryKey: ['intake-unread-count'] });
      toast.success('Formular eingereicht');
      setShowFillModal(null);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Einreichen'),
  });

  const markSeenMutation = useMutation({
    mutationFn: intakeApi.markSeen,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intake-inbox'] });
      qc.invalidateQueries({ queryKey: ['intake-unread-count'] });
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  function copyFormLink(form) {
    const url = `${window.location.origin}/intake/fill/${form.token}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link kopiert!');
    });
  }

  async function handleDeleteForm(form) {
    const ok = await confirm(`Formular „${form.title}" wird gelöscht.`, { title: 'Formular löschen' });
    if (!ok) return;
    deleteFormMutation.mutate(form.id);
  }

  async function handleDeleteTemplate(tmpl) {
    const ok = await confirm(`Template „${tmpl.name}" wird gelöscht.`, { title: 'Template löschen' });
    if (!ok) return;
    deleteTemplateMutation.mutate(tmpl.id);
  }

  function openTemplateEditor(tmpl = null) {
    setEditingTemplate(tmpl);
    setShowTemplateEditor(true);
  }

  function handleSaveTemplate(data) {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  }

  function handleCreateFormFromTemplate(tmpl) {
    setShowNewFormModal(true);
  }

  function handleOpenInboxItem(item) {
    setSelectedInboxItem(item);
    if (!item.seen) markSeenMutation.mutate(item.id);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  const isLoading = formsLoading || templatesLoading || inboxLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Intake</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {activeTab === 'forms' ? `${forms.length} Formulare` : `${templates.length} Templates`}
            </p>
          </div>
          <button
            onClick={() => activeTab === 'forms' ? setShowNewFormModal(true) : openTemplateEditor(null)}
            className="btn-primary"
          >
            <Plus size={15} />
            {activeTab === 'forms' ? 'Neues Formular' : 'Neues Template'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100">
          {[
            { key: 'inbox',     label: 'Posteingang', icon: Inbox },
            { key: 'forms',     label: 'Formulare',   icon: FileText },
            { key: 'templates', label: 'Templates',    icon: ClipboardList },
          ].map(({ key, label, icon: Icon }) => {
            const unreadInbox = key === 'inbox' && inbox.filter(f => !f.seen).length;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === key
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                }`}
              >
                <Icon size={14} />
                {label}
                {unreadInbox > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {unreadInbox}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">

        {/* ── POSTEINGANG TAB ── */}
        {activeTab === 'inbox' && (
          <>
            {inbox.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Inbox size={36} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Noch keine ausgefüllten Formulare.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inbox.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleOpenInboxItem(item)}
                    className={`w-full text-left card p-4 hover:shadow-md transition-all flex items-start gap-4 ${!item.seen ? 'border-l-4 border-l-red-400' : ''}`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!item.seen ? 'bg-red-50' : 'bg-gray-100'}`}>
                      <Inbox size={14} className={!item.seen ? 'text-red-500' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">{item.title}</span>
                        {!item.seen && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">NEU</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {item.client_name && <span className="flex items-center gap-1"><User size={10} />{item.client_name}</span>}
                        {item.project_name && <span className="truncate">{item.project_name}</span>}
                        <span className="flex items-center gap-1 ml-auto shrink-0">
                          <Calendar size={10} />
                          {formatDate(item.submitted_at || item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {(item.fields || []).length} Felder · Klicken zum Anzeigen
                      </p>
                    </div>
                    <Eye size={14} className="text-gray-300 shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── FORMULARE TAB ── */}
        {activeTab === 'forms' && (
          <>
            {forms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <FileText size={36} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 mb-4">Noch keine Formulare.</p>
                <button onClick={() => setShowNewFormModal(true)} className="btn-primary">
                  <Plus size={15} />
                  Erstes Formular erstellen
                </button>
              </div>
            ) : (
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Titel</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Kunde</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Projekt</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Erstellt</th>
                      <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forms.map(form => (
                      <tr
                        key={form.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-5 py-3 font-medium text-gray-900">{form.title}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {form.client_name || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {form.project_name || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          {form.status === 'submitted' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Eingereicht
                              {!form.seen && <span className="ml-1 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">NEU</span>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Ausstehend
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400">
                          {formatDate(form.created_at)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => copyFormLink(form)}
                              title="Link kopieren"
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                            >
                              <Copy size={14} />
                            </button>
                            {form.status === 'pending' && (
                              <button
                                onClick={() => setShowFillModal(form)}
                                title="Intern ausfüllen"
                                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                              >
                                <Edit2 size={12} />
                                Intern ausfüllen
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteForm(form)}
                              title="Löschen"
                              className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TEMPLATES TAB ── */}
        {activeTab === 'templates' && (
          <>
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <ClipboardList size={36} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 mb-4">Noch keine Templates.</p>
                <button onClick={() => openTemplateEditor(null)} className="btn-primary">
                  <Plus size={15} />
                  Erstes Template erstellen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {templates.map(tmpl => (
                  <div key={tmpl.id} className="card p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{tmpl.name}</h3>
                        {tmpl.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{tmpl.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openTemplateEditor(tmpl)}
                          title="Bearbeiten"
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl)}
                          title="Löschen"
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                        {(tmpl.fields || []).length} {(tmpl.fields || []).length === 1 ? 'Feld' : 'Felder'}
                      </span>
                    </div>

                    <button
                      onClick={() => { setShowNewFormModal(true); }}
                      className="mt-auto w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <Plus size={13} />
                      Formular erstellen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showNewFormModal && (
        <NewFormModal
          templates={templates}
          clients={clients}
          projects={projects}
          onClose={() => setShowNewFormModal(false)}
          onCreate={(data, callbacks) => createFormMutation.mutate(data, callbacks)}
          isPending={createFormMutation.isPending}
        />
      )}

      {showTemplateEditor && (
        <TemplateEditorModal
          editingTemplate={editingTemplate}
          onClose={() => { setShowTemplateEditor(false); setEditingTemplate(null); }}
          onSave={handleSaveTemplate}
          isPending={createTemplateMutation.isPending || updateTemplateMutation.isPending}
        />
      )}

      {showFillModal && (
        <FillModal
          form={showFillModal}
          onClose={() => setShowFillModal(null)}
          onSubmit={responses => submitFormMutation.mutate({ id: showFillModal.id, responses })}
          isPending={submitFormMutation.isPending}
        />
      )}

      {selectedInboxItem && (
        <ResponsesPanel
          form={selectedInboxItem}
          onClose={() => setSelectedInboxItem(null)}
        />
      )}
      {ConfirmDialogNode}
    </div>
  );
}
