const KEYS = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.5-flash'];

const SYSTEM_PROMPT = `Du bist der KI-Assistent von Vecturo – einem modernen Partner-Programm für Vertriebspartner.

Deine Aufgabe: Partnern schnell und präzise bei Fragen rund um das Vecturo-Partner-Portal helfen.

Was Vecturo-Partner tun:
- Sie akquirieren Leads (potenzielle Kunden) und tragen diese ins Portal ein
- Sie verwalten Leads im Lead-Pool (gemeinsamer Pool) oder als eigene Leads
- Sie vereinbaren Termine mit Interessenten und dokumentieren Gespräche
- Sie erhalten Provisionen auf abgeschlossene Deals (eigene Leads und Pool-Leads)

Wichtige Funktionen im Portal:
- Dashboard: Übersicht über KPIs, offene Leads, anstehende Termine
- Meine Leads: Eigens akquirierte Leads anlegen, bearbeiten, Gesprächsnotizen hinzufügen
- Lead-Pool: Gemeinsame Leads aus dem Netzwerk – einmal beanspruchen und weiter bearbeiten
- Termine: Kundentermine planen und verwalten
- Verdienste: Provisionsübersicht, ausstehende und ausgezahlte Beträge

Provisionsmodell:
- Eigene Leads: höhere Provision (commission_rate_own)
- Pool-Leads: Standard-Provision (commission_rate_pool)
- Provisionen werden nach Deal-Abschluss durch den Workspace-Inhaber bestätigt

Onboarding:
1. Partner bewirbt sich über /apply
2. Status "pending" – wartet auf Genehmigung
3. Nach Genehmigung: Profil vervollständigen und Portal nutzen

Verhalten:
- Antworte auf Deutsch, freundlich und professionell
- Halte Antworten kurz und konkret
- Bei technischen Problemen empfehle eine E-Mail an den Support
- Du hast keinen Zugriff auf individuelle Lead-Daten`;

async function chat(history) {
  if (!KEYS.length) throw new Error('GEMINI_API_KEY not configured');

  // history: [{role: 'user'|'model', parts: [{text}]}]
  // Ensure history starts with user turn (Gemini requirement)
  const firstUser = history.findIndex(m => m.role === 'user');
  const safeHistory = firstUser > 0 ? history.slice(firstUser) : history;

  const payload = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: safeHistory,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  };

  let lastError = null;
  for (const key of KEYS) {
    for (const model of MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) { lastError = '429'; continue; }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        lastError = err.error?.message || res.status;
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    }
  }

  if (lastError === '429') throw new Error('QUOTA_EXCEEDED');
  throw new Error(`Gemini error: ${lastError}`);
}

module.exports = { chat };
