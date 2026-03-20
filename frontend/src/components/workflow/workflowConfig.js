// ── Workflow Phase Configuration ───────────────────────────────────────────────

export const PHASE_ORDER = [
  'demo',
  'demo_lieferung',
  'entscheidung',
  'projektstart',
  'rechtliches',
  'uebergabe',
  'abgeschlossen',
];

export const PHASES = {
  demo: {
    label: 'Demo',
    emoji: '🎨',
    description: 'Demo vorbereiten, Build-Typ festlegen & Content sammeln',
    tasks: [
      {
        key: 'content_gathered',
        label: 'Content vom Kunden gesammelt',
      },
      {
        key: 'briefing_done',
        label: 'Briefing abgeschlossen',
      },
      {
        key: 'build_type_decided',
        label: 'Build-Typ entschieden (Wix / Gecodet / Beide)',
        decision: 'build_type',
      },
      {
        key: 'demo_built',
        label: 'Demo gebaut',
      },
      {
        key: 'repo_setup',
        label: 'Repository aufgesetzt',
        condition: (d) => d.build_type === 'gecodet' || d.build_type === 'beide',
      },
    ],
  },

  demo_lieferung: {
    label: 'Demo-Lieferung',
    emoji: '📤',
    description: 'Angebot erstellen, Demo präsentieren & Termin vereinbaren',
    tasks: [
      {
        key: 'price_set',
        label: 'Preis & Angebot erstellt',
      },
      {
        key: 'demo_sent',
        label: 'Demo an Kunden versendet',
      },
      {
        key: 'called_client',
        label: 'Kunden angerufen',
      },
      {
        key: 'meeting_scheduled',
        label: 'Entscheidungstermin vereinbart',
      },
    ],
  },

  entscheidung: {
    label: 'Entscheidung',
    emoji: '🎯',
    description: 'Kundenentscheidung einholen — Gewonnen, Verloren oder Verschoben',
    tasks: [
      {
        key: 'outcome_decided',
        label: 'Kundenentscheidung eingeholt',
        decision: 'outcome',
      },
    ],
  },

  projektstart: {
    label: 'Projektstart',
    emoji: '🚀',
    description: 'Anzahlung, Geschäftsmodell dokumentieren & Website bauen',
    tasks: [
      {
        key: 'deposit_received',
        label: '50% Anzahlung erhalten',
      },
      {
        key: 'business_model_documented',
        label: 'Geschäftsmodell & Ziel dokumentiert',
      },
      {
        key: 'website_built',
        label: 'Website fertig gebaut',
      },
      {
        key: 'deployment_configured',
        label: 'Deployment konfiguriert & live geschaltet',
        condition: (d) => d.build_type === 'gecodet' || d.build_type === 'beide',
      },
    ],
  },

  rechtliches: {
    label: 'Rechtliches',
    emoji: '⚖️',
    description: 'DSGVO-Daten sammeln & rechtliche Lösung implementieren',
    tasks: [
      {
        key: 'dsgvo_data_collected',
        label: 'DSGVO-Daten vom Kunden gesammelt',
      },
      {
        key: 'legal_solution_chosen',
        label: 'Rechtliche Lösung gewählt (KI / IT-Kanzlei)',
        decision: 'legal_solution',
      },
      {
        key: 'it_kanzlei_contacted',
        label: 'IT-Kanzlei München beauftragt',
        condition: (d) => d.legal_solution === 'it_kanzlei',
      },
      {
        key: 'legal_implemented',
        label: 'Rechtliches vollständig umgesetzt',
      },
    ],
  },

  uebergabe: {
    label: 'Übergabe',
    emoji: '🤝',
    description: 'Abschlusstests, Kunden-Übergabe & Abschlusszahlung',
    tasks: [
      {
        key: 'seo_check',
        label: 'SEO-Check durchgeführt',
      },
      {
        key: 'testing_done',
        label: 'Vollständiges Testing abgeschlossen',
      },
      {
        key: 'client_accounts_created',
        label: 'Kunden-Accounts erstellt & übergeben',
      },
      {
        key: 'final_payment',
        label: 'Abschlusszahlung (50%) erhalten',
      },
      {
        key: 'google_business',
        label: 'Google Business eingerichtet',
      },
    ],
  },

  abgeschlossen: {
    label: 'Abgeschlossen',
    emoji: '🎉',
    description: 'Projekt erfolgreich abgeschlossen',
    tasks: [],
  },
};

// Decision configuration
export const DECISIONS = {
  build_type: {
    label: 'Welcher Build-Typ?',
    options: [
      { value: 'wix',     label: 'Wix',           desc: 'No-Code mit Wix' },
      { value: 'gecodet', label: 'Gecodet',        desc: 'Custom mit Code' },
      { value: 'beide',   label: 'Beide',          desc: 'Wix + Coded Version' },
    ],
  },
  outcome: {
    label: 'Wie hat der Kunde entschieden?',
    options: [
      { value: 'won',       label: 'Gewonnen',   desc: 'Kunde macht es', color: '#34C759' },
      { value: 'lost',      label: 'Verloren',   desc: 'Kunde macht es nicht', color: '#FF3B30' },
      { value: 'postponed', label: 'Verschoben', desc: 'Später entscheiden', color: '#FF9500', requiresDate: true },
    ],
  },
  legal_solution: {
    label: 'Welche rechtliche Lösung?',
    options: [
      { value: 'ki',         label: 'KI-Lösung',       desc: 'Automatisiert per KI' },
      { value: 'it_kanzlei', label: 'IT-Kanzlei München', desc: 'Professionelle Kanzlei' },
    ],
  },
};

// Tool categories
export const TOOL_CATEGORIES = {
  cms:           { label: 'CMS',           color: '#5856D6' },
  code:          { label: 'Code',          color: '#007AFF' },
  hosting:       { label: 'Hosting',       color: '#34C759' },
  design:        { label: 'Design',        color: '#FF2D55' },
  legal:         { label: 'Rechtliches',   color: '#FF9500' },
  communication: { label: 'Kommunikation', color: '#30B0C7' },
  other:         { label: 'Sonstiges',     color: '#8E8E93' },
};
