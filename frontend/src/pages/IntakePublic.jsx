import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { intakeApi } from '../api/intake';

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
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Fehler beim Einreichen. Bitte versuchen Sie es erneut.');
    },
  });

  function handleChange(fieldId, value) {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitMutation.mutate(responses);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (isError || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Formular nicht gefunden</h2>
          <p className="text-sm text-gray-400">
            Dieser Link ist ungültig oder abgelaufen. Bitte wenden Sie sich an Ihren Ansprechpartner.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={48} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vielen Dank!</h2>
          <p className="text-sm text-gray-500">
            Ihre Antworten wurden erfolgreich übermittelt.
          </p>
        </div>
      </div>
    );
  }

  const fields = form.fields || form.template_fields || [];

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pt-12 pb-16 px-4">
      <div className="max-w-xl mx-auto">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="text-base font-semibold text-gray-900">Vecturo</span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
          <p className="text-sm text-gray-400 mt-1">Bitte füllen Sie dieses Formular aus.</p>
        </div>

        {/* Fields card */}
        {fields.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5 mb-6">
            {fields.map(f => (
              <div key={f.id}>
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {f.label}
                  {f.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {f.type === 'textarea' ? (
                  <textarea rows={4} required={f.required}
                    className="input w-full resize-none"
                    value={responses[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                  />
                ) : f.type === 'url' ? (
                  <input type="url" required={f.required} placeholder="https://"
                    className="input w-full"
                    value={responses[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                  />
                ) : f.type === 'radio' ? (
                  <div className="space-y-2.5">
                    {(f.options || []).map((opt, i) => {
                      const selected = responses[f.id] === opt;
                      return (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-[#0071E3] bg-[#0071E3]' : 'border-gray-300 group-hover:border-gray-400 bg-white'}`}>
                            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <input type="radio" name={f.id} value={opt}
                            checked={selected} onChange={() => handleChange(f.id, opt)}
                            className="sr-only"
                          />
                          <span className="text-sm text-gray-700">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : f.type === 'checkbox' ? (
                  <div className="space-y-2.5">
                    {(f.options || []).map((opt, i) => {
                      const selected = (responses[f.id] || []).includes(opt);
                      return (
                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-[#0071E3] bg-[#0071E3]' : 'border-gray-300 group-hover:border-gray-400 bg-white'}`}>
                            {selected && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
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
                    className="input w-full"
                    value={responses[f.id] || ''}
                    onChange={e => handleChange(f.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {fields.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center mb-6">
            <p className="text-sm text-gray-400">Dieses Formular hat keine Felder.</p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium text-sm hover:bg-gray-800 active:bg-gray-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitMutation.isPending ? 'Wird eingereicht…' : 'Einreichen'}
        </button>
      </div>
    </div>
  );
}
