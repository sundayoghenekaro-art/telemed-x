// Reconciles src/integrations/supabase/types.ts with the SQL migrations.
// Adds columns that exist in migrations but not in the generated types, and
// adds whole tables that were never generated. Existing typings (enums,
// array shapes, relationships) are preserved.
const fs = require('fs');
const path = require('path');

const MIG = 'supabase/migrations';
const TYPES = 'src/integrations/supabase/types.ts';

const stripComments = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');

function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function parseCol(def) {
  const m = def.match(/^"?([a-z_][a-z0-9_]*)"?\s+(.+)$/is);
  if (!m) return null;
  const name = m[1];
  if (/^(constraint|primary|unique|check|foreign|exclude)$/i.test(name)) return null;
  const rest = m[2];
  const typeMatch = rest.match(
    /^([a-z_ ]+?(?:\([^)]*\))?(?:\[\])?)(?=\s+(?:not\s+null|null|default|primary|unique|references|check|generated|collate)\b|$)/is,
  );
  if (!typeMatch) return null;
  return { name, rest, sqlType: typeMatch[1].trim().toLowerCase() };
}

const SCALARS = [
  [/^(uuid|text|character varying|varchar|character|char|citext|inet|bytea|tsvector|interval|time|timetz)$/, 'string'],
  [/^(boolean|bool)$/, 'boolean'],
  [/^(smallint|integer|int|int4|int8|bigint|serial|bigserial|smallserial|numeric|decimal|real|double precision|float4|float8|money)$/, 'number'],
  [/^(json|jsonb)$/, 'Json'],
  [/^(timestamp|timestamptz|date)$/, 'string'],
];

function toTs(sqlType) {
  const t = sqlType.replace(/\s+/g, ' ').trim();
  if (/\[\]$/.test(t)) {
    const element = toTs(t.replace(/\[\]$/, ''));
    return `${element}[]`;
  }
  for (const [re, ts] of SCALARS) if (re.test(t)) return ts;
  return 'string';
}

function parseDdl() {
  const files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort();
  const tables = new Map();
  const alters = [];

  for (const file of files) {
    const sql = stripComments(fs.readFileSync(path.join(MIG, file), 'utf8'));

    const reCreate = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi;
    let m;
    while ((m = reCreate.exec(sql))) {
      const name = m[1].toLowerCase();
      let i = reCreate.lastIndex;
      let depth = 1;
      let body = '';
      while (i < sql.length && depth > 0) {
        const ch = sql[i];
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) break;
        }
        body += ch;
        i++;
      }
      const cols = new Map();
      const pkCols = [];
      for (const def of splitTopLevel(body)) {
        const tablePk = def.match(/^(?:constraint\s+"?[a-z0-9_]+"?\s+)?primary\s+key\s*\(([^)]+)\)/i);
        if (tablePk) {
          for (const col of tablePk[1].split(',')) pkCols.push(col.trim().replace(/"/g, ''));
          continue;
        }
        const c = parseCol(def);
        if (!c) continue;
        const notNull =
          /\bnot\s+null\b/i.test(c.rest) ||
          /\bprimary\s+key\b/i.test(c.rest) ||
          /\bgenerated\s+always\s+as\s+identity\b/i.test(c.rest) ||
          /^(smallserial|serial|bigserial)$/i.test(c.sqlType);
        cols.set(c.name, {
          name: c.name,
          tsType: toTs(c.sqlType),
          notNull,
          hasDefault: /\bdefault\b/i.test(c.rest) || /\bgenerated\b/i.test(c.rest),
        });
      }
      for (const col of pkCols) {
        const existing = cols.get(col);
        if (existing) existing.notNull = true;
      }
      tables.set(name, cols);
    }

    const reAdd = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s+ADD\s+COLUMN\s+([^;]+);/gi;
    while ((m = reAdd.exec(sql))) {
      const table = m[1].toLowerCase();
      const clauses = m[2].split(/,\s*ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?/i);
      for (const clause of clauses) {
        const clean = clause.replace(/^IF\s+NOT\s+EXISTS\s+/i, '').trim();
        const c = parseCol(clean);
        if (!c) continue;
        alters.push({
          table,
          col: {
            name: c.name,
            tsType: toTs(c.sqlType),
            notNull: /\bnot\s+null\b/i.test(c.rest) || /\bprimary\s+key\b/i.test(c.rest),
            hasDefault: /\bdefault\b/i.test(c.rest),
          },
        });
      }
    }
  }

  for (const a of alters) {
    if (!tables.has(a.table)) tables.set(a.table, new Map());
    tables.get(a.table).set(a.col.name, a.col);
  }
  return tables;
}

const PAD = '          ';

function blockBounds(src, table) {
  const header = `      ${table}: {`;
  const start = src.indexOf(header);
  if (start < 0) return null;
  const end = src.indexOf('\n      }', start);
  if (end < 0) return null;
  return { start, end };
}

function sectionInsertOffset(sectionText, colName, ordinal) {
  const lineRe = /^ {10}([a-z_][a-z0-9_]*)\??: /gm;
  let m;
  let lastEnd = null;
  while ((m = lineRe.exec(sectionText))) {
    const name = m[1];
    if (name === colName) return -1; // already present
    if (ordinal && name > colName && lastEnd === null) return m.index;
    lastEnd = lineRe.lastIndex;
  }
  return sectionText.lastIndexOf('\n');
}

function addColumnToBlock(block, col) {
  const sections = [
    { key: 'Row: {', render: () => `${PAD}${col.name}: ${col.tsType}${col.notNull ? '' : ' | null'}` },
    {
      key: 'Insert: {',
      render: () =>
        `${PAD}${col.name}${!col.notNull || col.hasDefault ? '?' : ''}: ${col.tsType}${col.notNull ? '' : ' | null'}`,
    },
    { key: 'Update: {', render: () => `${PAD}${col.name}?: ${col.tsType}${col.notNull ? '' : ' | null'}` },
  ];

  for (const section of sections) {
    const sIdx = block.indexOf(section.key);
    if (sIdx < 0) continue;
    const bodyStart = sIdx + section.key.length;
    const bodyEnd = block.indexOf('\n        }', bodyStart);
    if (bodyEnd < 0) continue;
    const body = block.slice(bodyStart, bodyEnd);
    const offset = sectionInsertOffset(body, col.name, true);
    if (offset < 0) continue;
    const line = section.render();
    const nextBody = body.slice(0, offset) + '\n' + line + body.slice(offset);
    block = block.slice(0, bodyStart) + nextBody + block.slice(bodyEnd);
  }
  return block;
}

function renderTable(table, cols) {
  const names = [...cols.keys()].sort();
  const row = names.map((n) => `${PAD}${n}: ${cols.get(n).tsType}${cols.get(n).notNull ? '' : ' | null'}`);
  const ins = names.map((n) => {
    const c = cols.get(n);
    const optional = !c.notNull || c.hasDefault;
    return `${PAD}${n}${optional ? '?' : ''}: ${c.tsType}${c.notNull ? '' : ' | null'}`;
  });
  const upd = names.map((n) => `${PAD}${n}?: ${cols.get(n).tsType}${cols.get(n).notNull ? '' : ' | null'}`);
  return [
    `      ${table}: {`,
    '        Row: {',
    ...row,
    '        }',
    '        Insert: {',
    ...ins,
    '        }',
    '        Update: {',
    ...upd,
    '        }',
    '        Relationships: []',
    '      }',
  ].join('\n');
}

let src = fs.readFileSync(TYPES, 'utf8');
const ddl = parseDdl();
const addedTables = [];
const addedColumns = [];

for (const [table, cols] of [...ddl].sort(([a], [b]) => a.localeCompare(b))) {
  if (cols.size === 0) continue;
  const bounds = blockBounds(src, table);
  if (!bounds) {
    addedTables.push(table);
    const marker = '\n    }\n    Views: {';
    const idx = src.indexOf(marker);
    if (idx < 0) throw new Error('Views marker not found');
    src = src.slice(0, idx) + '\n' + renderTable(table, cols) + marker + src.slice(idx + marker.length);
    continue;
  }
  const block = src.slice(bounds.start, bounds.end);
  const rowBody = block.split('Row: {')[1].split('\n        }')[0];
  const present = new Set([...rowBody.matchAll(/^ {10}([a-z_][a-z0-9_]*):/gm)].map((x) => x[1]));
  const missing = [...cols.values()].filter((c) => !present.has(c.name));
  if (missing.length === 0) continue;
  let nextBlock = block;
  for (const col of missing) {
    nextBlock = addColumnToBlock(nextBlock, col);
    addedColumns.push(`${table}.${col.name}`);
  }
  src = src.slice(0, bounds.start) + nextBlock + src.slice(bounds.end);
}

fs.writeFileSync(TYPES, src, 'utf8');
console.log('tables added:', addedTables.length ? addedTables.join(', ') : 'none');
console.log('columns added:', addedColumns.length ? addedColumns.join(', ') : 'none');
