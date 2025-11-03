const pool = require('../config/db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

async function totalVendas() {   
        const result = await pool.query(`select
            count(pvcod) as total_pedido,
            pvconfirmado,
            pvcanal,
            sum(pvvl) as vl_total  
            from pv
            group by pv.pvconfirmado ,pv.pvcanal 
            order by pv.pvcanal`);
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

module.exports = { totalVendas, listarPv ,cancelarPedido};