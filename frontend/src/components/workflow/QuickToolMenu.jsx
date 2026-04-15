import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Plus, X, ExternalLink, Pencil, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { workflowApi } from '../../api/workflow';
import { TOOL_CATEGORIES } from './workflowConfig';

function ToolItem({ tool, onEdit, onDelete }) {
  const cat = TOOL_CATEGORIES[tool.category] || TOOL_CATEGORIES.other;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 8px', borderRadius: '8px',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-card-secondary)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{
        width: '8px', height: '8px',
        borderRadius: '50%',
        background: cat.color,
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {tool.url ? (
          <a
            href={tool.url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text)',
              textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            {tool.name}
            <ExternalLink size={10} color="#8E8E93" />
          </a>
        ) : (
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
            {tool.name}
          </span>
        )}
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{cat.label}</span>
      </div>
      <div style={{ display: 'flex', gap: '2px', opacity: 0 }}
        className="tool-actions"
      >
        <button onClick={() => onEdit(tool)} style={{ padding: '3px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', borderRadius: '4px' }}>
          <Pencil size={11} />
        </button>
        <button onClick={() => onDelete(tool.id)} style={{ padding: '3px', border: 'none', background: 'none', cursor: 'pointer', color: '#FF3B30', borderRadius: '4px' }}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

export default function QuickToolMenu() {
  const [open,    setOpen]    = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null); // tool object
  const [form,    setForm]    = useState({ name: '', url: '', category: 'other' });
  const popoverRef = useRef(null);
  const qc = useQueryClient();

  const { data: tools = [] } = useQuery({
    queryKey: ['workflow-tools'],
    queryFn: () => workflowApi.getTools().then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (data) => workflowApi.addTool(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-tools'] }); setShowAdd(false); setForm({ name: '', url: '', category: 'other' }); },
    onError: () => toast.error('Fehler beim Hinzufügen'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => workflowApi.updateTool(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow-tools'] }); setEditing(null); },
    onError: () => toast.error('Fehler beim Speichern'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => workflowApi.deleteTool(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-tools'] }),
    onError: () => toast.error('Fehler beim Löschen'),
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
        setShowAdd(false);
        setEditing(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Group tools by category
  const grouped = TOOL_CATEGORIES
    ? Object.keys(TOOL_CATEGORIES).reduce((acc, cat) => {
        const catTools = tools.filter(t => t.category === cat);
        if (catTools.length > 0) acc[cat] = catTools;
        return acc;
      }, {})
    : {};

  function startEdit(tool) {
    setEditing(tool);
    setForm({ name: tool.name, url: tool.url || '', category: tool.category });
    setShowAdd(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      addMutation.mutate(form);
    }
  }

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Quick Tools"
        style={{
          width: '40px', height: '40px',
          borderRadius: '12px',
          border: 'none',
          background: open ? 'var(--color-blue)' : 'var(--color-card-secondary)',
          color: open ? '#fff' : 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        <Wrench size={17} />
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '280px',
          background: 'var(--color-card)',
          borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
          border: '1px solid var(--color-border-subtle)',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 14px 10px',
            borderBottom: '1px solid #F2F2F7',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
              Quick Tools
            </span>
            <button
              onClick={() => { setShowAdd(s => !s); setEditing(null); setForm({ name: '', url: '', category: 'other' }); }}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--color-card-secondary)',
                color: 'var(--color-blue)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Plus size={12} /> Tool
            </button>
          </div>

          {/* Tool list */}
          <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px 6px' }}>
            {tools.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '16px 0' }}>
                Keine Tools hinzugefügt
              </p>
            ) : (
              Object.entries(grouped).map(([cat, catTools]) => (
                <div key={cat} style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '10px', fontWeight: 600,
                    color: 'var(--color-text-secondary)', textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '4px 8px 2px',
                  }}>
                    {TOOL_CATEGORIES[cat]?.label}
                  </div>
                  {catTools.map(tool => (
                    <div key={tool.id}
                      style={{ position: 'relative' }}
                      onMouseEnter={e => {
                        const actions = e.currentTarget.querySelector('.tool-actions');
                        if (actions) actions.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        const actions = e.currentTarget.querySelector('.tool-actions');
                        if (actions) actions.style.opacity = '0';
                      }}
                    >
                      <ToolItem
                        tool={tool}
                        onEdit={startEdit}
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Add / Edit form */}
          {(showAdd || editing) && (
            <div style={{
              borderTop: '1px solid #F2F2F7',
              padding: '12px 14px',
              background: 'var(--color-card-secondary)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '10px' }}>
                {editing ? 'Tool bearbeiten' : 'Neues Tool hinzufügen'}
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  placeholder="Name (z.B. Figma)"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  style={{
                    padding: '8px 10px', borderRadius: '8px',
                    border: '1.5px solid #E5E5EA', fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <input
                  placeholder="URL (optional)"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  style={{
                    padding: '8px 10px', borderRadius: '8px',
                    border: '1.5px solid #E5E5EA', fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{
                    padding: '8px 10px', borderRadius: '8px',
                    border: '1.5px solid #E5E5EA', fontSize: '13px',
                    background: 'var(--color-card)', outline: 'none',
                  }}
                >
                  {Object.entries(TOOL_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowAdd(false); setEditing(null); }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px',
                      border: '1.5px solid #E5E5EA', background: 'var(--color-card)',
                      fontSize: '13px', cursor: 'pointer', color: 'var(--color-text-tertiary)',
                    }}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 2, padding: '8px', borderRadius: '8px',
                      border: 'none', background: 'var(--color-blue)',
                      fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', color: '#fff',
                    }}
                  >
                    {editing ? 'Speichern' : 'Hinzufügen'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
