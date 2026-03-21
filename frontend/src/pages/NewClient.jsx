import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../api/clients';

const EMPTY_FORM = {
  company_name: '', contact_person: '', address: '',
  city: '', postal_code: '', country: '',
  email: '', phone: '', vat_id: '',
};

export default function NewClient() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={form[name] || ''}
        onChange={e => set(name, e.target.value)}
      />
    </div>
  );

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Kunde angelegt');
      navigate(`/clients/${data.id}`);
    },
    onError: err => toast.error(err.response?.data?.error || 'Fehler beim Erstellen'),
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      toast.error('Unternehmensname ist erforderlich');
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/clients')}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Kunden anlegen</h1>
          <p className="text-sm text-gray-500 mt-0.5">Neuen Kunden erstellen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Kontaktdaten */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Kontaktdaten</h2>
          {field('company_name',   'Unternehmensname *', 'text', 'Muster GmbH')}
          {field('contact_person', 'Ansprechpartner',    'text', 'Max Mustermann')}
          <div className="grid grid-cols-2 gap-4">
            {field('email', 'E-Mail', 'email', 'info@muster.de')}
            {field('phone', 'Telefon', 'tel',  '+49 ...')}
          </div>
        </div>

        {/* Adresse */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Adresse</h2>
          {field('address', 'Straße & Hausnummer')}
          <div className="grid grid-cols-3 gap-4">
            {field('postal_code', 'PLZ')}
            {field('city',        'Stadt')}
            {field('country',     'Land')}
          </div>
        </div>

        {/* Steuerdaten */}
        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Steuerdaten</h2>
          {field('vat_id', 'USt-IdNr.', 'text', 'DE123456789')}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate('/clients')} className="btn-secondary">
            Abbrechen
          </button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            <Save size={15} />
            {createMutation.isPending ? 'Wird gespeichert…' : 'Kunden anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}
