import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Plus, X, Calendar, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { intakeApi } from '../api/intake';

// ── Multi-Select Komponente ────────────────────────────────────────────────────

function MultiSelectField({ field, value = [], onChange }) {
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const predefined = field.options || [];
  const customItems = value.filter(v => !predefined.includes(v));

  function toggle(opt) {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setCustomInput('');
    setShowCustom(false);
  }

  return (
    <div>
      {/* Vordefinierte Optionen als Checkboxen */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '8px',
        marginBottom: '10px',
      }}>
        {predefined.map(opt => {
          const checked = value.includes(opt);
          return (
            <label
              key={opt}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1.5px solid ${checked ? '#0071E3' : '#E5E5EA'}`,
                background: checked ? 'rgba(0,113,227,0.05)' : '#FAFAFA',
                cursor: 'pointer',
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
            >
              {/* Custom Checkbox */}
              <div style={{
                width: '18px', height: '18px',
                borderRadius: '5px',
                border: `2px solid ${checked ? '#0071E3' : '#C7C7CC'}`,
                background: checked ? '#0071E3' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}>
                {checked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <input
                type="checkbox" checked={checked}
                onChange={() => toggle(opt)}
                style={{ display: 'none' }}
              />
              <span style={{
                fontSize: '13px',
                color: checked ? '#0071E3' : '#3C3C43',
                fontWeight: checked ? 500 : 400,
                lineHeight: 1.3,
              }}>
                {opt}
              </span>
            </label>
          );
        })}
      </div>

      {/* Custom Items (bereits hinzugefügt) */}
      {customItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {customItems.map(item => (
            <span key={item} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px',
              borderRadius: '99px',
              background: '#0071E3',
              color: '#fff',
              fontSize: '13px', fontWeight: 500,
            }}>
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter(v => v !== item))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: 0 }}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Eigene Option hinzufügen */}
      {!showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 13px',
            borderRadius: '99px',
            border: '1.5px dashed #C7C7CC',
            background: 'transparent',
            color: '#8E8E93', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Plus size={13} /> Eigene Option hinzufügen
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            autoFocus
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            placeholder="Eigene Option eingeben…"
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
              if (e.key === 'Escape') { setShowCustom(false); setCustomInput(''); }
            }}
            style={{
              padding: '8px 12px', borderRadius: '10px',
              border: '1.5px solid #0071E3', fontSize: '13px',
              outline: 'none', fontFamily: 'inherit', flex: 1, maxWidth: '260px',
            }}
          />
          <button type="button" onClick={addCustom}
            style={{
              padding: '8px 16px', borderRadius: '10px',
              border: 'none', background: '#0071E3', color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Hinzufügen
          </button>
          <button type="button" onClick={() => { setShowCustom(false); setCustomInput(''); }}
            style={{
              padding: '8px', borderRadius: '10px',
              border: '1.5px solid #E5E5EA', background: '#fff',
              color: '#8E8E93', cursor: 'pointer', display: 'flex',
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Firmen-Avatar ──────────────────────────────────────────────────────────────

function CompanyAvatar({ name, size = 48 }) {
  const initials = name
    ? name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'V';

  // Deterministische Farbe aus Firmennamen
  const colors = [
    ['#0071E3', '#E8F1FF'],
    ['#34C759', '#F0FFF4'],
    ['#FF9500', '#FFF4E5'],
    ['#BF5AF2', '#F5EEFF'],
    ['#FF3B30', '#FFF0EE'],
    ['#5AC8FA', '#EAF7FF'],
  ];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  const [fg, bg] = colors[idx];

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '14px',
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: fg,
      flexShrink: 0,
      border: `1px solid ${fg}22`,
    }}>
      {initials}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function IntakePublic() {
  const { token } = useParams();
  const [responses, setResponses] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading, isError } = useQuery({
    queryKey: ['intake-public', token],
    queryFn: () => intakeApi.getPublicForm(token),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (data) => intakeApi.submitPublic(token, data),
    onSuccess: () => setSubmitted(true),
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Fehler beim Einreichen. Bitte erneut versuchen.');
    },
  });

  function handleChange(fieldId, value) {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitMutation.mutate(responses);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F5F5F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '28px', height: '28px',
          border: '2px solid #0071E3', borderTopColor: 'transparent',
          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────

  if (isError || !form) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F5F5F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'rgba(255,59,48,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <AlertCircle size={26} color="#FF3B30" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' }}>
            Formular nicht gefunden
          </h2>
          <p style={{ fontSize: '14px', color: '#8E8E93', lineHeight: 1.6 }}>
            Dieser Link ist ungültig oder abgelaufen. Bitte wende dich an deinen Ansprechpartner.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────

  const companyName = form.client_company_name || '';

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', background: '#F5F5F7',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(52,199,89,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CheckCircle2 size={40} color="#34C759" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' }}>
            Vielen Dank!
          </h2>
          <p style={{ fontSize: '15px', color: '#6E6E73', lineHeight: 1.6 }}>
            Deine Angaben wurden erfolgreich übermittelt. Wir melden uns bald bei dir.
          </p>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  const fields = form.fields || [];
  const requiredFields = fields.filter(f => f.required);
  const canSubmit = requiredFields.every(f => {
    const v = responses[f.id];
    if (Array.isArray(v)) return v.length > 0;
    return v && String(v).trim().length > 0;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>

      {/* ── Header ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #F2F2F7',
        padding: '18px 24px',
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(145deg, #0A84FF, #0071E3)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,113,227,0.35)',
            flexShrink: 0,
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.02em' }}>
            Vecturo
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* Intro */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' }}>
            Dein Website-Briefing
          </h1>
          <p style={{ fontSize: '14px', color: '#6E6E73', lineHeight: 1.6, margin: 0 }}>
            Damit wir deine neue Website optimal gestalten können, bitten wir dich,
            die folgenden Fragen zu beantworten. Es dauert nur wenige Minuten.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fields.map((f, idx) => (
              <div
                key={f.id}
                style={{
                  background: '#fff',
                  borderRadius: '16px',
                  border: '1px solid #F2F2F7',
                  padding: '20px 22px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <label style={{
                  display: 'block',
                  fontSize: '15px', fontWeight: 600, color: '#1D1D1F',
                  marginBottom: '4px',
                }}>
                  {f.label}
                  {f.required && <span style={{ color: '#FF3B30', marginLeft: '3px' }}>*</span>}
                </label>
                {f.placeholder && f.type !== 'multiselect' && f.type !== 'date' && (
                  <p style={{ fontSize: '12px', color: '#8E8E93', margin: '0 0 12px', lineHeight: 1.5 }}>
                    {f.placeholder}
                  </p>
                )}
                {!f.placeholder && <div style={{ height: '10px' }} />}

                {/* Textarea */}
                {f.type === 'textarea' && (
                  <textarea
                    rows={4}
                    required={f.required}
                    placeholder={f.placeholder || ''}
                    value={responses[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 13px',
                      border: '1.5px solid #E5E5EA', borderRadius: '10px',
                      fontSize: '14px', outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit', lineHeight: 1.55, color: '#1D1D1F',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0071E3'}
                    onBlur={e => e.target.style.borderColor = '#E5E5EA'}
                  />
                )}

                {/* Text / URL */}
                {(f.type === 'text' || f.type === 'url') && (
                  <input
                    type={f.type === 'url' ? 'url' : 'text'}
                    required={f.required}
                    placeholder={f.placeholder || (f.type === 'url' ? 'https://' : '')}
                    value={responses[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 13px',
                      border: '1.5px solid #E5E5EA', borderRadius: '10px',
                      fontSize: '14px', outline: 'none',
                      fontFamily: 'inherit', color: '#1D1D1F',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0071E3'}
                    onBlur={e => e.target.style.borderColor = '#E5E5EA'}
                  />
                )}

                {/* Date – Kalender */}
                {f.type === 'date' && (
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <Calendar size={16} color="#8E8E93" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
                    <input
                      type="date"
                      required={f.required}
                      value={responses[f.id] || ''}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => handleChange(f.id, e.target.value)}
                      style={{
                        padding: '10px 13px 10px 36px',
                        border: '1.5px solid #E5E5EA', borderRadius: '10px',
                        fontSize: '14px', outline: 'none',
                        fontFamily: 'inherit', color: '#1D1D1F',
                        transition: 'border-color 0.15s', cursor: 'pointer',
                      }}
                      onFocus={e => e.target.style.borderColor = '#0071E3'}
                      onBlur={e => e.target.style.borderColor = '#E5E5EA'}
                    />
                  </div>
                )}

                {/* Multi-Select */}
                {f.type === 'multiselect' && (
                  <MultiSelectField
                    field={f}
                    value={responses[f.id] || []}
                    onChange={val => handleChange(f.id, val)}
                  />
                )}
              </div>
            ))}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitMutation.isPending || !canSubmit}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: canSubmit ? '#0071E3' : '#E5E5EA',
                color: canSubmit ? '#fff' : '#8E8E93',
                fontSize: '15px', fontWeight: 600,
                cursor: canSubmit && !submitMutation.isPending ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s, color 0.2s',
                marginTop: '4px',
              }}
            >
              {submitMutation.isPending ? 'Wird übermittelt…' : 'Briefing absenden ✓'}
            </button>

            {!canSubmit && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#8E8E93', margin: '-8px 0 0' }}>
                Bitte fülle alle Pflichtfelder aus (markiert mit *)
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
