const express = require('express');
const router  = express.Router();
const { getOne, getAll, run } = require('../db/pg');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// ── DEFAULT CATEGORIES ─────────────────────────────────────────────────────────

const DEFAULT_INCOME_CATS = [
  { name: 'Honorare',   color: '#34D399' },
  { name: 'Beratung',   color: '#5B8CF5' },
  { name: 'Lizenzen',   color: '#9B72F2' },
  { name: 'Sonstiges',  color: '#9090B8' },
];
const DEFAULT_EXPENSE_CATS = [
  { name: 'Software',        color: '#5B8CF5' },
  { name: 'Hardware',        color: '#9B72F2' },
  { name: 'Büro',            color: '#FB923C' },
  { name: 'Marketing',       color: '#F472B6' },
  { name: 'Reise',           color: '#22D3EE' },
  { name: 'Versicherung',    color: '#FBBF24' },
  { name: 'Steuerberater',   color: '#34D399' },
  { name: 'Löhne',           color: '#F87171' },
  { name: 'Sonstiges',       color: '#9090B8' },
];

async function ensureDefaultCategories(workspaceOwerId) {
  const existing = await getAll(
    'SELECT id FROM finance_categories WHERE workspace_owner_id = ? LIMIT 1',
    [workspaceOwerId]
  );
  if (existing.length > 0) return;

  for (const c of DEFAULT_INCOME_CATS) {
    await run(
      `INSERT INTO finance_categories (workspace_owner_id, name, type, color, is_default)
       VALUES (?, ?, 'income', ?, true)`,
      [workspaceOwerId, c.name, c.color]
    );
  }
  for (const c of DEFAULT_EXPENSE_CATS) {
    await run(
      `INSERT INTO finance_categories (workspace_owner_id, name, type, color, is_default)
       VALUES (?, ?, 'expense', ?, true)`,
      [workspaceOwerId, c.name, c.color]
    );
  }
}

// ── SETUP ──────────────────────────────────────────────────────────────────────

router.get('/setup', async (req, res) => {
  try {
    const row = await getOne(
      'SELECT * FROM finance_setup WHERE workspace_owner_id = ?',
      [req.workspaceUserId]
    );
    res.json(row || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/setup', async (req, res) => {
  const {
    legal_form, partners, founded_date, tax_mode, vat_rate,
    tax_number, finanzamt, fiscal_year_start,
    opening_balance, open_receivables, monthly_fixed_costs,
    industry, revenue_goal, profit_goal, tax_reserve_pct,
  } = req.body;
  try {
    const existing = await getOne(
      'SELECT id FROM finance_setup WHERE workspace_owner_id = ?',
      [req.workspaceUserId]
    );
    if (existing) {
      await run(
        `UPDATE finance_setup SET
          legal_form=?, partners=?, founded_date=?, tax_mode=?, vat_rate=?,
          tax_number=?, finanzamt=?, fiscal_year_start=?,
          opening_balance=?, open_receivables=?, monthly_fixed_costs=?,
          industry=?, revenue_goal=?, profit_goal=?, tax_reserve_pct=?,
          updated_at=NOW()
         WHERE workspace_owner_id=?`,
        [
          legal_form || 'gbr',
          JSON.stringify(partners || []),
          founded_date || null,
          tax_mode || 'regular',
          vat_rate ?? 19,
          tax_number || '',
          finanzamt || '',
          fiscal_year_start || 1,
          opening_balance ?? 0,
          open_receivables ?? 0,
          monthly_fixed_costs ?? 0,
          industry || '',
          revenue_goal ?? 0,
          profit_goal ?? 0,
          tax_reserve_pct ?? 30,
          req.workspaceUserId,
        ]
      );
    } else {
      await run(
        `INSERT INTO finance_setup
          (workspace_owner_id, legal_form, partners, founded_date, tax_mode, vat_rate,
           tax_number, finanzamt, fiscal_year_start,
           opening_balance, open_receivables, monthly_fixed_costs,
           industry, revenue_goal, profit_goal, tax_reserve_pct)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          req.workspaceUserId,
          legal_form || 'gbr',
          JSON.stringify(partners || []),
          founded_date || null,
          tax_mode || 'regular',
          vat_rate ?? 19,
          tax_number || '',
          finanzamt || '',
          fiscal_year_start || 1,
          opening_balance ?? 0,
          open_receivables ?? 0,
          monthly_fixed_costs ?? 0,
          industry || '',
          revenue_goal ?? 0,
          profit_goal ?? 0,
          tax_reserve_pct ?? 30,
        ]
      );
      await ensureDefaultCategories(req.workspaceUserId);
    }
    const updated = await getOne(
      'SELECT * FROM finance_setup WHERE workspace_owner_id = ?',
      [req.workspaceUserId]
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CATEGORIES ────────────────────────────────────────────────────────────────

router.get('/categories', async (req, res) => {
  try {
    const rows = await getAll(
      'SELECT * FROM finance_categories WHERE workspace_owner_id = ? ORDER BY type, name',
      [req.workspaceUserId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/categories', async (req, res) => {
  const { name, type, color } = req.body;
  try {
    const { lastInsertRowid } = await run(
      `INSERT INTO finance_categories (workspace_owner_id, name, type, color)
       VALUES (?, ?, ?, ?) RETURNING id`,
      [req.workspaceUserId, name, type, color || '#9090B8']
    );
    const cat = await getOne('SELECT * FROM finance_categories WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(cat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/categories/:id', async (req, res) => {
  const { name, color } = req.body;
  try {
    await run(
      'UPDATE finance_categories SET name=?, color=? WHERE id=? AND workspace_owner_id=?',
      [name, color, req.params.id, req.workspaceUserId]
    );
    const cat = await getOne('SELECT * FROM finance_categories WHERE id = ?', [req.params.id]);
    res.json(cat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await run(
      'DELETE FROM finance_categories WHERE id=? AND workspace_owner_id=? AND is_default=false',
      [req.params.id, req.workspaceUserId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────

router.get('/transactions', async (req, res) => {
  const { type, category_id, from, to, limit = 200 } = req.query;
  try {
    let sql = `
      SELECT t.*, c.name AS category_name, c.color AS category_color
      FROM finance_transactions t
      LEFT JOIN finance_categories c ON c.id = t.category_id
      WHERE t.workspace_owner_id = ?`;
    const params = [req.workspaceUserId];
    if (type)        { sql += ' AND t.type = ?';        params.push(type); }
    if (category_id) { sql += ' AND t.category_id = ?'; params.push(category_id); }
    if (from)        { sql += ' AND t.date >= ?';        params.push(from); }
    if (to)          { sql += ' AND t.date <= ?';        params.push(to); }
    sql += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const rows = await getAll(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/transactions', async (req, res) => {
  const {
    type, date, description, amount_net, vat_amount, amount_gross,
    category_id, notes, receipt_data, receipt_filename, receipt_mime,
  } = req.body;
  try {
    const { lastInsertRowid } = await run(
      `INSERT INTO finance_transactions
        (workspace_owner_id, type, date, description, amount_net, vat_amount, amount_gross,
         category_id, notes, receipt_data, receipt_filename, receipt_mime)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
      [
        req.workspaceUserId, type, date, description,
        amount_net, vat_amount ?? 0, amount_gross,
        category_id || null, notes || '',
        receipt_data || '', receipt_filename || '', receipt_mime || '',
      ]
    );
    const tx = await getOne(
      `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM finance_transactions t
       LEFT JOIN finance_categories c ON c.id = t.category_id
       WHERE t.id = ?`,
      [lastInsertRowid]
    );
    res.status(201).json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/transactions/:id', async (req, res) => {
  const {
    type, date, description, amount_net, vat_amount, amount_gross,
    category_id, notes, receipt_data, receipt_filename, receipt_mime,
  } = req.body;
  try {
    await run(
      `UPDATE finance_transactions
       SET type=?, date=?, description=?, amount_net=?, vat_amount=?, amount_gross=?,
           category_id=?, notes=?, receipt_data=?, receipt_filename=?, receipt_mime=?,
           updated_at=NOW()
       WHERE id=? AND workspace_owner_id=?`,
      [
        type, date, description, amount_net, vat_amount ?? 0, amount_gross,
        category_id || null, notes || '',
        receipt_data || '', receipt_filename || '', receipt_mime || '',
        req.params.id, req.workspaceUserId,
      ]
    );
    const tx = await getOne(
      `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM finance_transactions t
       LEFT JOIN finance_categories c ON c.id = t.category_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    await run(
      'DELETE FROM finance_transactions WHERE id=? AND workspace_owner_id=?',
      [req.params.id, req.workspaceUserId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── STATS ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  const { period = 'month' } = req.query;
  try {
    let fromDate;
    const now = new Date();
    if (period === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      fromDate = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
    } else {
      fromDate = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    }
    const toDate = now.toISOString().slice(0, 10);

    const [incomeRow, expenseRow, recentRows, monthlyRows] = await Promise.all([
      getOne(
        `SELECT COALESCE(SUM(amount_gross),0) AS total, COALESCE(SUM(vat_amount),0) AS vat
         FROM finance_transactions WHERE workspace_owner_id=? AND type='income' AND date>=? AND date<=?`,
        [req.workspaceUserId, fromDate, toDate]
      ),
      getOne(
        `SELECT COALESCE(SUM(amount_gross),0) AS total, COALESCE(SUM(vat_amount),0) AS vat
         FROM finance_transactions WHERE workspace_owner_id=? AND type='expense' AND date>=? AND date<=?`,
        [req.workspaceUserId, fromDate, toDate]
      ),
      getAll(
        `SELECT t.*, c.name AS category_name, c.color AS category_color
         FROM finance_transactions t
         LEFT JOIN finance_categories c ON c.id = t.category_id
         WHERE t.workspace_owner_id=? ORDER BY t.date DESC, t.created_at DESC LIMIT 5`,
        [req.workspaceUserId]
      ),
      getAll(
        `SELECT TO_CHAR(date, 'YYYY-MM') AS month,
                SUM(CASE WHEN type='income' THEN amount_gross ELSE 0 END) AS income,
                SUM(CASE WHEN type='expense' THEN amount_gross ELSE 0 END) AS expense
         FROM finance_transactions
         WHERE workspace_owner_id=? AND date >= NOW() - INTERVAL '8 weeks'
         GROUP BY TO_CHAR(date, 'YYYY-MM')
         ORDER BY month`,
        [req.workspaceUserId]
      ),
    ]);

    const setup = await getOne(
      'SELECT * FROM finance_setup WHERE workspace_owner_id=?',
      [req.workspaceUserId]
    );

    const income  = parseFloat(incomeRow.total);
    const expense = parseFloat(expenseRow.total);
    const profit  = income - expense;
    const vatOwed = parseFloat(incomeRow.vat) - parseFloat(expenseRow.vat);
    const taxReservePct = setup ? parseFloat(setup.tax_reserve_pct) : 30;
    const taxReserve = profit > 0 ? profit * (taxReservePct / 100) : 0;

    res.json({
      income, expense, profit,
      vatOwed,
      taxReserve,
      recent: recentRows,
      monthly: monthlyRows,
      period,
      fromDate,
      toDate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TAX SUMMARY ───────────────────────────────────────────────────────────────

router.get('/tax-summary', async (req, res) => {
  const now = new Date();
  const year = req.query.year || now.getFullYear();
  try {
    const setup = await getOne(
      'SELECT * FROM finance_setup WHERE workspace_owner_id=?',
      [req.workspaceUserId]
    );

    const quarters = [1,2,3,4].map(q => ({
      q,
      from: `${year}-${String((q-1)*3+1).padStart(2,'0')}-01`,
      to:   new Date(year, q*3, 0).toISOString().slice(0,10),
    }));

    const qData = await Promise.all(quarters.map(async ({ q, from, to }) => {
      const [inc, exp] = await Promise.all([
        getOne(
          `SELECT COALESCE(SUM(amount_gross),0) AS total, COALESCE(SUM(vat_amount),0) AS vat
           FROM finance_transactions WHERE workspace_owner_id=? AND type='income' AND date>=? AND date<=?`,
          [req.workspaceUserId, from, to]
        ),
        getOne(
          `SELECT COALESCE(SUM(amount_gross),0) AS total, COALESCE(SUM(vat_amount),0) AS vat
           FROM finance_transactions WHERE workspace_owner_id=? AND type='expense' AND date>=? AND date<=?`,
          [req.workspaceUserId, from, to]
        ),
      ]);
      const income  = parseFloat(inc.total);
      const expense = parseFloat(exp.total);
      const vatIn   = parseFloat(inc.vat);
      const vatPre  = parseFloat(exp.vat);
      return { q, from, to, income, expense, profit: income-expense, vatIn, vatPre, vatOwed: vatIn-vatPre };
    }));

    const yearInc  = qData.reduce((s,q) => s + q.income, 0);
    const yearExp  = qData.reduce((s,q) => s + q.expense, 0);
    const yearProfit = yearInc - yearExp;
    const yearVat  = qData.reduce((s,q) => s + q.vatOwed, 0);

    const partners = setup ? (typeof setup.partners === 'string' ? JSON.parse(setup.partners) : setup.partners) : [];
    const partnerSummary = partners.map(p => ({
      name: p.name,
      share_pct: p.share_pct,
      profit_share: yearProfit * (p.share_pct / 100),
    }));

    const gewerbesteuerFreibetrag = 24500;
    const gewerbesteuerPflichtig = yearProfit > gewerbesteuerFreibetrag;

    res.json({
      year,
      quarters: qData,
      yearIncome: yearInc,
      yearExpense: yearExp,
      yearProfit,
      yearVatOwed: yearVat,
      partnerSummary,
      gewerbesteuerPflichtig,
      gewerbesteuerBasis: Math.max(0, yearProfit - gewerbesteuerFreibetrag),
      taxMode: setup?.tax_mode || 'regular',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── REPORTS ───────────────────────────────────────────────────────────────────

router.get('/report', async (req, res) => {
  const { type = 'pnl', from, to, year } = req.query;
  const now = new Date();
  const fromDate = from || `${year || now.getFullYear()}-01-01`;
  const toDate   = to   || `${year || now.getFullYear()}-12-31`;
  try {
    if (type === 'pnl') {
      const [incCats, expCats] = await Promise.all([
        getAll(
          `SELECT c.name, c.color, COALESCE(SUM(t.amount_net),0) AS total
           FROM finance_transactions t
           JOIN finance_categories c ON c.id = t.category_id
           WHERE t.workspace_owner_id=? AND t.type='income' AND t.date>=? AND t.date<=?
           GROUP BY c.id, c.name, c.color ORDER BY total DESC`,
          [req.workspaceUserId, fromDate, toDate]
        ),
        getAll(
          `SELECT c.name, c.color, COALESCE(SUM(t.amount_net),0) AS total
           FROM finance_transactions t
           JOIN finance_categories c ON c.id = t.category_id
           WHERE t.workspace_owner_id=? AND t.type='expense' AND t.date>=? AND t.date<=?
           GROUP BY c.id, c.name, c.color ORDER BY total DESC`,
          [req.workspaceUserId, fromDate, toDate]
        ),
      ]);
      const totalIncome  = incCats.reduce((s,r) => s + parseFloat(r.total), 0);
      const totalExpense = expCats.reduce((s,r) => s + parseFloat(r.total), 0);
      res.json({ type, incomeCategories: incCats, expenseCategories: expCats, totalIncome, totalExpense, profit: totalIncome - totalExpense, fromDate, toDate });

    } else if (type === 'cashflow') {
      const rows = await getAll(
        `SELECT TO_CHAR(date,'YYYY-MM') AS month,
                SUM(CASE WHEN type='income' THEN amount_gross ELSE 0 END) AS income,
                SUM(CASE WHEN type='expense' THEN amount_gross ELSE 0 END) AS expense
         FROM finance_transactions
         WHERE workspace_owner_id=? AND date>=? AND date<=?
         GROUP BY TO_CHAR(date,'YYYY-MM') ORDER BY month`,
        [req.workspaceUserId, fromDate, toDate]
      );
      res.json({ type, months: rows, fromDate, toDate });

    } else if (type === 'categories') {
      const rows = await getAll(
        `SELECT c.name, c.color, t.type,
                COALESCE(SUM(t.amount_net),0) AS total,
                COUNT(*) AS count
         FROM finance_transactions t
         JOIN finance_categories c ON c.id = t.category_id
         WHERE t.workspace_owner_id=? AND t.date>=? AND t.date<=?
         GROUP BY c.id, c.name, c.color, t.type ORDER BY total DESC`,
        [req.workspaceUserId, fromDate, toDate]
      );
      res.json({ type, categories: rows, fromDate, toDate });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CSV EXPORT ────────────────────────────────────────────────────────────────

router.get('/export', async (req, res) => {
  const { from, to, type } = req.query;
  try {
    let sql = `
      SELECT t.date, t.type, t.description, c.name AS category,
             t.amount_net, t.vat_amount, t.amount_gross, t.notes
      FROM finance_transactions t
      LEFT JOIN finance_categories c ON c.id = t.category_id
      WHERE t.workspace_owner_id = ?`;
    const params = [req.workspaceUserId];
    if (type) { sql += ' AND t.type = ?'; params.push(type); }
    if (from) { sql += ' AND t.date >= ?'; params.push(from); }
    if (to)   { sql += ' AND t.date <= ?'; params.push(to); }
    sql += ' ORDER BY t.date DESC';

    const rows = await getAll(sql, params);

    const header = 'Datum;Typ;Beschreibung;Kategorie;Betrag Netto;MwSt;Betrag Brutto;Notiz\n';
    const csv = header + rows.map(r =>
      `${r.date};${r.type === 'income' ? 'Einnahme' : 'Ausgabe'};"${r.description}";"${r.category || ''}";"${r.amount_net}";"${r.vat_amount}";"${r.amount_gross}";"${r.notes || ''}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="finanzen-export.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
