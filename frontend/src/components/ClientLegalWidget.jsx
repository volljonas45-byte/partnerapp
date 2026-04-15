import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Pencil, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { legalApi } from '../api/legal';

/**
 * Shows legal info (Firmenname, Adresse, USt-IdNr., DSGVO) for a selected client.
 * Appears automatically when clientId is set; allows inline editing.
 */
export default function ClientLegalWidget({ clientId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const { data: legal, isLoading } = useQuery({
    queryKey: ['legal', clientId],
    queryFn: () => legalApi.get(clientId),
    enabled: !!clientId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => legalApi.save(clientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['legal', clientId] });
      setEditing(false);
      toast.success('Legal Setup gespeichert');
    },
    onError: () => toast.error('Speichern fehlgeschlagen'),
  });

  if (!clientId) return null;
  if (isLoading) return null;

  const isEmpty = !legal?.company_name && !legal?.address && !legal?.vat_id && !legal?.dsgvo_provider;

  const startEdit = () => {
    setDraft({
      company_name:   legal?.company_name   || '',
      address:        legal?.address        || '',
      vat_id:         legal?.vat_id         || '',
      dsgvo_provider: legal?.dsgvo_provider || '',
    });
    setEditing(true);
  };

  const set = (key) => (e) => setDraft(d => ({ ...d, [key]: e.target.value }));

  return (
    <div style={{
      marginTop: '8px',
      border: '1.5px solid',
      borderColor: isEmpty ? '#FFD60A33' : '#D0E4FF',
      borderRadius: '10px',
      background: isEmpty ? '#FFFBEA' : '#F5F9FF',
      padding: '14px 16px',
      transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editing ? '12px' : (isEmpty ? '8px' : '10px') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Shield size={14} color={isEmpty ? '#B45309' : 'var(--color-blue)'} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: isEmpty ? '#B45309' : 'var(--color-blue)', letterSpacing: '-0.01em' }}>
            Legal Setup
          </span>
          {isEmpty && (
            <span style={{ fontSize: '11px', color: '#B45309', opacity: 0.8 }}>— noch nicht ausgefüllt</span>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '5px' }}
          >
            <Pencil size={11} /> Bearbeiten
          </button>
        )}
      </div>

      {/* Empty hint */}
      {!editing && isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#92400E' }}>
          <AlertCircle size={13} />
          Für eine korrekte Rechnung bitte Firmendaten ergänzen.
        </div>
      )}

      {/* Display mode */}
      {!editing && !isEmpty && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
          {[
            { label: 'Firmenname',    value: legal.company_name },
            { label: 'Adresse',       value: legal.address },
            { label: 'USt-IdNr.',     value: legal.vat_id },
            { label: 'DSGVO-Anbieter', value: legal.dsgvo_provider },
          ].map(({ label, value }) => value ? (
            <div key={label}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>{label}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text)' }}>{value}</div>
            </div>
          ) : null)}
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Firmenname</label>
              <input
                type="text"
                className="input"
                style={{ fontSize: '13px', padding: '6px 10px' }}
                value={draft.company_name}
                onChange={set('company_name')}
                placeholder="Muster GmbH"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>Adresse</label>
              <input
                type="text"
                className="input"
                style={{ fontSize: '13px', padding: '6px 10px' }}
                value={draft.address}
                onChange={set('address')}
                placeholder="Musterstraße 1, 10115 Berlin"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>USt-IdNr.</label>
              <input
                type="text"
                className="input"
                style={{ fontSize: '13px', padding: '6px 10px' }}
                value={draft.vat_id}
                onChange={set('vat_id')}
                placeholder="DE123456789"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>DSGVO-Anbieter</label>
              <input
                type="text"
                className="input"
                style={{ fontSize: '13px', padding: '6px 10px' }}
                value={draft.dsgvo_provider}
                onChange={set('dsgvo_provider')}
                placeholder="eRecht24, IT-Kanzlei …"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px', borderRadius: '7px', border: '1px solid #E5E5EA', background: 'var(--color-card)', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
            >
              <X size={12} /> Abbrechen
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate(draft)}
              disabled={saveMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 14px', borderRadius: '7px', border: 'none', background: 'var(--color-blue)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              <Save size={12} /> {saveMutation.isPending ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
