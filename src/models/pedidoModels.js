const pool = require("../config/db");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

async function topMarcasMes(dataInicio, dataFim) {
  let whereExtra = "";
  const params = [];
  if (dataInicio && dataFim) {
    params.push(dataInicio, dataFim);
    whereExtra = `and pvdtcad BETWEEN $1 AND $2`;
  } else if (dataInicio) {
    params.push(dataInicio);
    whereExtra = `and pvdtcad >= $1`;
  } else if (dataFim) {
    params.push(dataFim);
    whereExtra = `and pvdtcad <= $1`;
  } else {
    whereExtra = `and pvdtcad >= CURRENT_DATE - interval '29 days'`;
  }
  const result = await pool.query(`
    select 
    marcasdes,
    sum(pvivl*pviqtde) as valor
    from pvi 
    join pv on pvcod = pvipvcod 
    join pro on pviprocod = procod
    join modelo on modcod = promodcod
    join tipo on tipocod = protipocod 
    join marcas on marcascod = promarcascod
    where  pvsta = 'A'
    ${whereExtra}
    group by marcasdes 
    order by marcasdes asc
    limit 10`, params);
  return result.rows;
}

async function topProdutosMes(dataInicio, dataFim) {
  let whereExtra = "";
  const params = [];
  if (dataInicio && dataFim) {
    params.push(dataInicio, dataFim);
    whereExtra = `and pvdtcad BETWEEN $1 AND $2`;
  } else if (dataInicio) {
    params.push(dataInicio);
    whereExtra = `and pvdtcad >= $1`;
  } else if (dataFim) {
    params.push(dataFim);
    whereExtra = `and pvdtcad <= $1`;
  } else {
    whereExtra = `and pvdtcad >= CURRENT_DATE - interval '29 days'`;
  }
  const result = await pool.query(`
    select 
    pviprocod as procod,
    marcasdes || ' - ' || tipodes || ' - ' || prodes as produto,
    count(pviprocod*pviqtde) as qtde
    from pvi 
    join pv on pvcod = pvipvcod 
    join pro on pviprocod = procod
    join modelo on modcod = promodcod
    join tipo on tipocod = protipocod 
    join marcas on marcascod = promarcascod
    where  pvsta = 'A'
    ${whereExtra}
    group by pviprocod,prodes,tipodes,marcasdes 
    order by count(pviprocod*pviqtde) desc
    limit 10`, params);
  return result.rows;
}

async function totalVendas(dataInicio, dataFim) {
  let whereClause = "";
  const params = [];
  if (dataInicio && dataFim) {
    params.push(dataInicio, dataFim);
    whereClause = `WHERE pvdtcad BETWEEN $1 AND $2`;
  } else if (dataInicio) {
    params.push(dataInicio);
    whereClause = `WHERE pvdtcad >= $1`;
  } else if (dataFim) {
    params.push(dataFim);
    whereClause = `WHERE pvdtcad <= $1`;
  }
  const result = await pool.query(`select
            count(pvcod) as total_pedido,
            pvconfirmado,
            pvcanal,
            sum(pvvl) as vl_total  
            from pv
            ${whereClause}
            group by pv.pvconfirmado ,pv.pvcanal 
            order by pv.pvcanal`, params);
  return result.rows;
}

async function totalVendasDia(dataInicio, dataFim) {
  let whereClause = "";
  const params = [];
  if (dataInicio && dataFim) {
    params.push(dataInicio, dataFim);
    whereClause = `WHERE pvdtcad BETWEEN $1 AND $2`;
  } else if (dataInicio) {
    params.push(dataInicio);
    whereClause = `WHERE pvdtcad >= $1`;
  } else if (dataFim) {
    params.push(dataFim);
    whereClause = `WHERE pvdtcad <= $1`;
  } else {
    whereClause = `WHERE pvdtcad::date = CURRENT_DATE`;
  }
  const result = await pool.query(`select
            count(pvcod) as total_pedido_dia,
            pvconfirmado,
            pvcanal,
            sum(pvvl) as vl_total_dia 
            from pv ${whereClause}
            group by pv.pvconfirmado ,pv.pvcanal 
            order by pv.pvcanal`, params);
  return result.rows;
}

async function totalVendasAnual(dataInicio, dataFim) {
  let whereClause = "";
  const params = [];
  if (dataInicio && dataFim) {
    params.push(dataInicio, dataFim);
    whereClause = `WHERE pvdtcad BETWEEN $1 AND $2`;
  } else if (dataInicio) {
    params.push(dataInicio);
    whereClause = `WHERE pvdtcad >= $1`;
  } else if (dataFim) {
    params.push(dataFim);
    whereClause = `WHERE pvdtcad <= $1`;
  } else {
    whereClause = `WHERE extract(year from pvdtcad) = extract(year from current_date)`;
  }
  const result = await pool.query(`select extract(month from pvdtcad ) as mes,
            count(pvcod) as total_pedido_mes,
            pvconfirmado,
            pvcanal,
            sum(pvvl) as vl_total_mes
            from pv ${whereClause}
            group by pv.pvconfirmado ,pv.pvcanal,extract(month from pvdtcad )
            order by extract(month from pvdtcad ),pv.pvcanal`, params);
  return result.rows;
}
async function listarPv() {
  const result = await pool.query(
    `select 
            pvcod,
            pvvl,
            pvobs,
            pvcanal,
            pvconfirmado,
            pvsta,
            pvipvcod,
            sum(pvivl) as pvvltotal,
            pviqtde 
            from pv 
            left join pvi on pvipvcod = pvcod
            where pvconfirmado = 'N' 
            and pvsta = 'A' 
            and pviprocod is not null 
            and pvrcacod = $1 
            group by 
            pvcod,
            pvvl,
            pvobs,
            pvcanal,
            pvconfirmado,
            pvsta,
            pvipvcod,
            pviqtde 
            order by pvcod desc`
  );
  return result.rows;
}

async function cancelarPedido(req, res) {
  const pvcod = req.params.pvcod;
  const result = await pool.query(
    "update pv set pvsta = 'X' where pvcod = $1 RETURNING *",
    [pvcod]
  );
  return result.rows;
}

module.exports = { topMarcasMes,topProdutosMes,totalVendas,totalVendasDia,totalVendasAnual, listarPv, cancelarPedido };
