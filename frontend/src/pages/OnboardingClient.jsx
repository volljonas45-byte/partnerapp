import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Check, Lock, Upload, AlertCircle } from 'lucide-react';
import { onboardingApi } from '../api/onboarding';

// ── Step Renderers ─────────────────────────────────────────────────────────────

function TextStep({ step }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
      {step.config.content || <span className="text-gray-400 italic">Kein Inhalt</span>}
    </div>
  );
}

function FormStep({ step, value, onChange }) {
  const fields = step.config.fields || [];
  const data = value || {};

  return (
    <div className="space-y-4">
      {fields.map(f => (
        <div key={f.id}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {f.label}
            {f.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              rows={3}
              required={f.required}
              placeholder={f.placeholder || ''}
              value={data[f.id] || ''}
              onChange={e => onChange({ ...data, [f.id]: e.target.value })}
              className="client-input resize-none"
            />
          ) : (
            <input
              type={f.type === 'phone' ? 'tel' : f.type}
              required={f.required}
              placeholder={f.placeholder || ''}
              value={data[f.id] || ''}
              onChange={e => onChange({ ...data, [f.id]: e.target.value })}
              className="client-input"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SelectStep({ step, value, onChange }) {
  const { question, options = [], multiple } = step.config;
  const selected = value?.selected || [];

  const toggle = (optId) => {
    if (multiple) {
      const next = selected.includes(optId)
        ? selected.filter(x => x !== optId)
        : [...selected, optId];
      onChange({ selected: next });
    } else {
      onChange({ selected: [optId] });
    }
  };

  return (
    <div>
      {question && <p className="text-sm font-medium text-gray-700 mb-4">{question}</p>}
      <div className="space-y-2">
        {options.map(opt => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                active
                  ? 'border-current bg-opacity-10 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
              style={active ? { borderColor: 'var(--brand)', color: 'var(--brand)', backgroundColor: `color-mix(in srgb, var(--brand) 10%, transparent)` } : {}}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                active ? 'border-current' : 'border-gray-300'
              }`}
                style={active ? { borderColor: 'var(--brand)' } : {}}
              >
                {active && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--brand)' }} />}
              </div>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CredentialsStep({ step, value, onChange }) {
  const { note, fields = [] } = step.config;
  const data = value || {};

  return (
    <div className="space-y-4">
      {note && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">{note}</p>}
      {fields.map(f => (
        <div key={f.id}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {f.label}
            {f.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type={f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
            required={f.required}
            value={data[f.id] || ''}
            onChange={e => onChange({ ...data, [f.id]: e.target.value })}
            className="client-input"
          />
        </div>
      ))}
    </div>
  );
}

function ChecklistStep({ step, value, onChange }) {
  const { items = [], requireAll } = step.config;
  const checked = value?.checked || [];

  const toggle = (itemId) => {
    const next = checked.includes(itemId)
      ? checked.filter(x => x !== itemId)
      : [...checked, itemId];
    onChange({ checked: next });
  };

  return (
    <div className="space-y-3">
      {requireAll && (
        <p className="text-xs text-gray-500 mb-2">Alle Punkte müssen bestätigt werden</p>
      )}
      {items.map(item => {
        const active = checked.includes(item.id);
        return (
          <label
            key={item.id}
            className="flex items-start gap-3 cursor-pointer group"
          >
            <div
              onClick={() => toggle(item.id)}
              className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all ${
                active ? 'border-current' : 'border-gray-300 group-hover:border-gray-400'
              }`}
              style={active ? { borderColor: 'var(--brand)', backgroundColor: 'var(--brand)' } : {}}
            >
              {active && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-sm text-gray-700">{item.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function FileUploadStep({ step, value, onChange }) {
  const { label, accept, multiple, maxMb = 10 } = step.config;
  const files = value?.files || [];
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  const handleFiles = (fileList) => {
    setError('');
    const newFiles = [];
    for (const file of Array.from(fileList)) {
      if (file.size > maxMb * 1024 * 1024) {
        setError(`"${file.name}" überschreitet das Limit von ${maxMb} MB.`);
        continue;
      }
      newFiles.push(file);
    }
    if (!newFiles.length) return;

    const readers = newFiles.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => resolve({ name: file.name, size: file.size, dataUrl: e.target.result });
      reader.readAsDataURL(file);
    }));

    Promise.all(readers).then(converted => {
      const merged = multiple ? [...files, ...converted] : converted;
      onChange({ files: merged });
    });
  };

  const removeFile = (idx) => {
    onChange({ files: files.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
      >
        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">{label || 'Dateien hochladen'}</p>
        <p className="text-xs text-gray-400 mt-1">Klicken oder Dateien hierher ziehen · Max. {maxMb} MB</p>
        {accept !== '*' && <p className="text-xs text-gray-400">{accept}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, idx) => (
            <li key={idx} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-sm">
              <Check size={14} className="text-green-500 shrink-0" />
              <span className="flex-1 truncate text-gray-700">{f.name}</span>
              <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                onClick={() => removeFile(idx)}
                className="text-gray-400 hover:text-red-500 text-xs"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepRenderer({ step, value, onChange }) {
  switch (step.type) {
    case 'text':        return <TextStep        step={step} />;
    case 'form':        return <FormStep        step={step} value={value} onChange={onChange} />;
    case 'select':      return <SelectStep      step={step} value={value} onChange={onChange} />;
    case 'credentials': return <CredentialsStep step={step} value={value} onChange={onChange} />;
    case 'checklist':   return <ChecklistStep   step={step} value={value} onChange={onChange} />;
    case 'file_upload': return <FileUploadStep  step={step} value={value} onChange={onChange} />;
    default: return null;
  }
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validate(step, value) {
  if (step.type === 'text') return null;
  if (step.type === 'form') {
    const fields = step.config.fields || [];
    for (const f of fields) {
      if (f.required && !(value?.[f.id] || '').trim())
        return `Bitte fülle das Feld "${f.label}" aus.`;
    }
    return null;
  }
  if (step.type === 'select') {
    if (!(value?.selected?.length)) return 'Bitte wähle mindestens eine Option.';
    return null;
  }
  if (step.type === 'credentials') {
    const fields = step.config.fields || [];
    for (const f of fields) {
      if (f.required && !(value?.[f.id] || '').trim())
        return `Bitte fülle das Feld "${f.label}" aus.`;
    }
    return null;
  }
  if (step.type === 'checklist') {
    if (step.config.requireAll) {
      const items = step.config.items || [];
      const checked = value?.checked || [];
      if (checked.length < items.length) return 'Bitte bestätige alle Punkte.';
    }
    return null;
  }
  return null;
}

// ── PIN Screen ─────────────────────────────────────────────────────────────────

function PinScreen({ brandColor, brandName, onSubmit, error }) {
  const [pin, setPin] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: brandColor || '#111827' }}
        >
          <Lock size={20} className="text-white" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{brandName || 'Onboarding'}</h2>
        <p className="text-sm text-gray-500 mb-6">Bitte gib deinen PIN ein, um fortzufahren.</p>
        <form onSubmit={e => { e.preventDefault(); onSubmit(pin); }}>
          <input
            type="text"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN eingeben"
            className="client-input text-center text-lg tracking-widest mb-3"
            autoFocus
          />
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColor || '#111827' }}
          >
            Bestätigen
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Completion Screen ──────────────────────────────────────────────────────────

function CompletionScreen({ brandColor, brandName }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: brandColor || '#111827' }}
        >
          <Check size={28} className="text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Fertig!</h2>
        <p className="text-gray-500 text-sm">
          Vielen Dank! Deine Angaben wurden erfolgreich übermittelt.<br />
          {brandName && <>{brandName} wird sich bald bei dir melden.</>}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OnboardingClient() {
  const { token } = useParams();
  const [pin, setPin]         = useState('');
  const [pinError, setPinError] = useState('');
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses]     = useState({});
  const [validationError, setValidationError] = useState('');
  const [completed, setCompleted]     = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['onboarding-public', token, pinConfirmed ? pin : ''],
    queryFn: () => onboardingApi.getPublicFlow(token, pinConfirmed ? pin : undefined).then(r => r.data),
    retry: false,
  });

  // Seed current step from server
  useEffect(() => {
    if (data) {
      if (data.status === 'completed') setCompleted(true);
      setCurrentStep(data.current_step || 0);
      setResponses(data.responses || {});
    }
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: ({ step_index, response }) =>
      onboardingApi.submitStep(token, step_index, response, pin || undefined),
    onSuccess: (res) => {
      if (res.data.completed) {
        setCompleted(true);
      } else {
        setCurrentStep(res.data.next_step);
      }
    },
  });

  const handlePinSubmit = async (enteredPin) => {
    setPinError('');
    setPin(enteredPin);
    setPinConfirmed(true);
    // refetch will trigger with new pin
    const result = await refetch();
    if (result.error) {
      setPinError('Falscher PIN. Bitte erneut versuchen.');
      setPinConfirmed(false);
      setPin('');
    }
  };

  if (isLoading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Lädt…</p>
      </div>
    );
  }

  // 401 = requires PIN
  if (error?.response?.status === 401 && !pinConfirmed) {
    return (
      <PinScreen
        brandColor={error.response?.data?.brand_color}
        brandName={error.response?.data?.brand_name}
        onSubmit={handlePinSubmit}
        error={pinError}
      />
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-gray-900 font-medium">Formular nicht gefunden</p>
          <p className="text-sm text-gray-500 mt-1">Der Link ist ungültig oder abgelaufen.</p>
        </div>
      </div>
    );
  }

  const { steps = [], brand_color, brand_name, brand_logo } = data;
  const brandColor = brand_color || '#111827';

  if (completed || data.status === 'completed') {
    return <CompletionScreen brandColor={brandColor} brandName={brand_name} />;
  }

  if (!steps.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Dieses Formular hat noch keine Schritte.</p>
      </div>
    );
  }

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast  = currentStep === steps.length - 1;
  const progress = Math.round(((currentStep) / steps.length) * 100);

  const handleNext = () => {
    const err = validate(step, responses[currentStep]);
    if (err) { setValidationError(err); return; }
    setValidationError('');

    submitMutation.mutate({
      step_index: currentStep,
      response: responses[currentStep] || { type: step.type },
    });
  };

  const handleBack = () => {
    setValidationError('');
    setCurrentStep(s => Math.max(0, s - 1));
  };

  const setStepValue = (val) => {
    setValidationError('');
    setResponses(r => ({ ...r, [currentStep]: val }));
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ '--brand': brandColor }}
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: brandColor }}
        />
      </div>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {brand_logo && (
            <img src={brand_logo} alt="" className="h-7 object-contain" />
          )}
          {brand_name && (
            <span className="text-sm font-semibold text-gray-900">{brand_name}</span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {currentStep + 1} / {steps.length}
        </span>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* Step card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: brandColor }}>
                Schritt {currentStep + 1}
              </p>
              <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
              {step.description && (
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              )}
            </div>

            {(step.config.instructions || []).length > 0 && (
              <ol className="space-y-2.5 mb-6">
                {step.config.instructions.map((instr, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white mt-0.5"
                      style={{ backgroundColor: brandColor }}
                    >
                      {i + 1}
                    </span>
                    <span>{instr}</span>
                  </li>
                ))}
              </ol>
            )}

            <StepRenderer
              step={step}
              value={responses[currentStep]}
              onChange={setStepValue}
            />

            {validationError && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={14} />
                {validationError}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={isFirst}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              >
                <ChevronLeft size={16} /> Zurück
              </button>
              <button
                onClick={handleNext}
                disabled={submitMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {submitMutation.isPending
                  ? 'Wird gespeichert…'
                  : isLast
                  ? <><Check size={15} /> Abschließen</>
                  : <>Weiter <ChevronRight size={16} /></>
                }
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
