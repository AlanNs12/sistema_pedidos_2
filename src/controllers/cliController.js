const pool = require("../config/db");

exports.cadastrarCliente = async (req, res) => {
  try {
    const result = await cliModels.cadastrarCliente();
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos estoque" });
  }
};

// Utils rápidos
const onlyDigits = (s) => (s || '').replace(/\D/g, '');
const isCpf = (d) => d && d.length === 11;
const isCnpj = (d) => d && d.length === 14;
const isEmail = (s) => !s || /^[^@]+@[^@]+\.[^@]+$/.test(s);
const isCep = (s) => !s || /^[0-9]{5}-?[0-9]{3}$/.test(s);

// (Opcional) validação de CPF/CNPJ por dígitos verificadores — simples e eficiente:
function validaCPF(cpf) {
  cpf = onlyDigits(cpf);
  if (!isCpf(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  let sum=0; for (let i=0;i<9;i++) sum+=parseInt(cpf[i])*(10-i);
  let d1 = 11 - (sum % 11); d1 = d1 >= 10 ? 0 : d1;
  sum=0; for (let i=0;i<10;i++) sum+=parseInt(cpf[i])*(11-i);
  let d2 = 11 - (sum % 11); d2 = d2 >= 10 ? 0 : d2;
  return d1 === parseInt(cpf[9]) && d2 === parseInt(cpf[10]);
}
function validaCNPJ(cnpj) {
  cnpj = onlyDigits(cnpj);
  if (!isCnpj(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base) => {
    let len = base.length, pos = len - 7, sum = 0;
    for (let i = len; i >= 1; i--) {
      sum += base[len - i] * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const b = cnpj.slice(0, 12).split('').map(Number);
  const d1 = calc(b);
  const d2 = calc([...b, d1]);
  return d1 === parseInt(cnpj[12]) && d2 === parseInt(cnpj[13]);
}
const validaDoc = (doc) => {
  const d = onlyDigits(doc);
  return (isCpf(d) && validaCPF(d)) || (isCnpj(d) && validaCNPJ(d));
};

// CREATE: insere em par + cli (transação)
exports.create = async (req, res) => {
  const {
    parcnpjcpf, parierg, pardes, parfan, parrua, parbai,
    parmuncod, parcep, parfone, paremail,
    clibloq = false, clilim = 0
  } = req.body || {};

  try {
    // validações mínimas
    const doc = onlyDigits(parcnpjcpf);
    if (!pardes || !doc) return res.status(400).json({ error: 'pardes e parcnpjcpf são obrigatórios' });
    if (!validaDoc(doc)) return res.status(400).json({ error: 'CPF/CNPJ inválido' });
    if (!Number.isInteger(parmuncod)) return res.status(400).json({ error: 'parmuncod inválido' });
    if (!isEmail(paremail)) return res.status(400).json({ error: 'email inválido' });
    if (!isCep(parcep)) return res.status(400).json({ error: 'CEP inválido' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertPar = `
        INSERT INTO public.par
          (parcnpjcpf, parierg, pardes, parfan, parrua, parbai, parmuncod, parcep, parfone, paremail)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING parcod, pardes, parfan, parcnpjcpf, parmuncod, parcep, parfone, paremail, pardcad, parsit`;
      const parValues = [doc, parierg || null, pardes, parfan || null, parrua || null, parbai || null,
                         parmuncod, parcep || null, parfone || null, paremail || null];
      const { rows: r1 } = await client.query(insertPar, parValues);
      const par = r1[0];

      const insertCli = `
        INSERT INTO public.cli (cliparcod, clibloq, clilim)
        VALUES ($1,$2,$3)
        RETURNING cliparcod, clibloq, clilim`;
      const { rows: r2 } = await client.query(insertCli, [par.parcod, !!clibloq, Number(clilim) || 0]);

      await client.query('COMMIT');
      return res.status(201).json({ ...par, ...r2[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      // violação de unique (doc/email)
      if (e.code === '23505') return res.status(409).json({ error: 'Documento ou e-mail já cadastrado' });
      if (e.code === '23503') return res.status(400).json({ error: 'Município inválido (FK)' });
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'erro ao criar cliente' });
  }
};

// LIST: paginação + busca por nome/fantasia/doc
exports.list = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 20, 1), 200);
  const q = (req.query.q || '').trim();
  const off = (page - 1) * pageSize;

  // filtro flexível: ILIKE; se tiver pg_trgm e quiser, dá pra usar similarity
  const filters = [];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    params.push(`%${q}%`);
    params.push(onlyDigits(q)); // busca por doc sem máscara
    filters.push(`(p.pardes ILIKE $${params.length-2} OR p.parfan ILIKE $${params.length-1} OR p.parcnpjcpf = $${params.length})`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const base = `
    FROM public.par p
    JOIN public.cli c ON c.cliparcod = p.parcod
    JOIN public.mun m ON m.muncod = p.parmuncod
    JOIN public.uf u  ON u.ufsigla = m.munufsigla
  `;

  try {
    const countSql = `SELECT COUNT(*) ${base} ${where}`;
    const { rows: rc } = await pool.query(countSql, params);
    const total = parseInt(rc[0].count, 10);

    const dataSql = `
      SELECT p.parcod, p.pardes, p.parfan, p.parcnpjcpf, p.parrua, p.parbai, p.parcep, p.parfone, p.paremail,
             m.muncod, m.mundes, u.ufsigla,
             c.clibloq, c.clilim, p.pardcad, p.pardua, p.parsit
      ${base} ${where}
      ORDER BY p.pardes ASC
      LIMIT ${pageSize} OFFSET ${off}`;
    const { rows } = await pool.query(dataSql, params);

    return res.json({ page, pageSize, total, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'erro ao listar clientes' });
  }
};

// GET by ID
exports.getById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

  const sql = `
    SELECT p.parcod, p.pardes, p.parfan, p.parcnpjcpf, p.parrua, p.parbai, p.parcep, p.parfone, p.paremail,
           p.parierg, p.parmuncod, m.mundes, u.ufsigla,
           c.clibloq, c.clilim, p.pardcad, p.pardua, p.parsit
    FROM public.par p
    JOIN public.cli c ON c.cliparcod = p.parcod
    JOIN public.mun m ON m.muncod = p.parmuncod
    JOIN public.uf u  ON u.ufsigla = m.munufsigla
    WHERE p.parcod = $1
  `;
  try {
    const { rows } = await pool.query(sql, [id]);
    if (!rows.length) return res.status(404).json({ error: 'cliente não encontrado' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'erro ao buscar cliente' });
  }
};

// UPDATE: atualiza campos de PAR e CLI
exports.update = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

  const {
    parcnpjcpf, parierg, pardes, parfan, parrua, parbai,
    parmuncod, parcep, parfone, paremail,
    clibloq, clilim, parsit
  } = req.body || {};

  // validações pontuais se vierem no body
  if (parcnpjcpf && !validaDoc(parcnpjcpf)) return res.status(400).json({ error: 'CPF/CNPJ inválido' });
  if (paremail && !isEmail(paremail)) return res.status(400).json({ error: 'email inválido' });
  if (parcep && !isCep(parcep)) return res.status(400).json({ error: 'CEP inválido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update PAR (só campos enviados)
    const fieldsPar = [];
    const valuesPar = [];
    const push = (col, val) => { valuesPar.push(val); fieldsPar.push(`${col} = $${valuesPar.length}`); };

    if (parcnpjcpf) push('parcnpjcpf', onlyDigits(parcnpjcpf));
    if (parierg !== undefined) push('parierg', parierg || null);
    if (pardes) push('pardes', pardes);
    if (parfan !== undefined) push('parfan', parfan || null);
    if (parrua !== undefined) push('parrua', parrua || null);
    if (parbai !== undefined) push('parbai', parbai || null);
    if (Number.isInteger(parmuncod)) push('parmuncod', parmuncod);
    if (parcep !== undefined) push('parcep', parcep || null);
    if (parfone !== undefined) push('parfone', parfone || null);
    if (paremail !== undefined) push('paremail', paremail || null);
    if (parsit !== undefined) push('parsit', parsit);

    if (fieldsPar.length) {
      // pardua atualiza via trigger; se não criou trigger, atualize aqui:
      fieldsPar.push(`pardua = now()`);
      valuesPar.push(id);
      const sqlPar = `UPDATE public.par SET ${fieldsPar.join(', ')} WHERE parcod = $${valuesPar.length}`;
      await client.query(sqlPar, valuesPar);
    }

    // Update CLI
    const fieldsCli = [];
    const valuesCli = [];
    if (clibloq !== undefined) { valuesCli.push(!!clibloq); fieldsCli.push(`clibloq = $${valuesCli.length}`); }
    if (clilim !== undefined)  { valuesCli.push(Number(clilim) || 0); fieldsCli.push(`clilim = $${valuesCli.length}`); }
    if (fieldsCli.length) {
      valuesCli.push(id);
      const sqlCli = `UPDATE public.cli SET ${fieldsCli.join(', ')} WHERE cliparcod = $${valuesCli.length}`;
      await client.query(sqlCli, valuesCli);
    }

    await client.query('COMMIT');
    return exports.getById(req, res);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(409).json({ error: 'Documento ou e-mail já cadastrado' });
    if (e.code === '23503') return res.status(400).json({ error: 'Município inválido (FK)' });
    console.error(e);
    return res.status(500).json({ error: 'erro ao atualizar cliente' });
  } finally {
    client.release();
  }
};

// DELETE: opcionalmente marque inativo em vez de excluir
exports.remove = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'id inválido' });

  try {
    await pool.query(`DELETE FROM public.cli WHERE cliparcod = $1`, [id]);
    await pool.query(`DELETE FROM public.par WHERE parcod = $1`, [id]);
    return res.json({ ok: true });
  } catch (e) {
    if (e.code === '23503') return res.status(409).json({ error: 'cliente possui vínculos e não pode ser removido' });
    console.error(e);
    return res.status(500).json({ error: 'erro ao remover cliente' });
  }
};
