const pool = require("./db");

async function atualizarDB() {
  const LOCK_KEY = 20250911;

  await pool.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
  try {
    await pool.query("BEGIN");

    // ==================================================================================================================================
    // NOVOS CAMPOS QUE FOMOS ADICIONANDO ADD AQUI: pleaSE

    // Exemplo: LEMBRAR SEMPRE DE COLOCAR O "IF NOT EXISTS"

    //  await pool.query(`ALTER TABLE public.emp ADD IF NOT exists empcod serial4 NOT NULL;`);

    await pool.query(
      `ALTER TABLE public.emp ADD IF NOT exists empcod serial4 NOT NULL;`
    );

    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS emp_empcod_key ON public.emp (empcod);`
    );

    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS usu_usucod_key ON public.usu (usucod);`
    );

    await pool.query(
      `ALTER TABLE public.marcas ADD IF NOT exists marcasordem int;`
    );

    await pool.query(
      `ALTER TABLE public.tipo ADD IF NOT exists tipoordem int;`
    );
    await pool.query(
      `ALTER TABLE public.usu ADD IF NOT exists ususta varchar(1) default 'A';`
    );
    await pool.query(
      `ALTER TABLE public.usu ADD IF NOT exists usuest varchar(1) default 'N';`
    );
    await pool.query(
      `ALTER TABLE public.usu ADD IF NOT exists usupv varchar(1) default 'N';`
    );
    await pool.query(
      `ALTER TABLE public.usu ADD IF NOT exists usurca varchar(1) default 'N';`
    );
    await pool.query(
      `ALTER TABLE public.usu ADD IF NOT exists usuviuversao varchar(1) default 'N';`
    );
    await pool.query(
      `ALTER TABLE public.emp ADD IF NOT exists empusapv varchar(1) default 'N';`
    );
    await pool.query(
      `ALTER TABLE public.emp ADD IF NOT exists empusaest varchar(1) default 'N';`
    );
    await pool.query(
      `alter table public.procor add IF NOT exists procorqtde int null;`
    );
    await pool.query(
      `ALTER TABLE public.pro ADD IF NOT exists proqtde int4 DEFAULT 0 NOT NULL;`
    );
    await pool.query(
      `ALTER TABLE public.pv ADD if not exists pvdtcad date DEFAULT now() NOT NULL;`
    );
    await pool.query(
      `ALTER TABLE public.pv ADD if not exists pvrcacod int4 NULL;`
    );
    await pool.query(
      `ALTER TABLE public.pro ADD if not exists prosemest varchar(1) default 'N';`
    );
    await pool.query(
      `ALTER TABLE public.pvi ADD if not exists pviprocorid int4 NULL;`
    );
    await pool.query(
      `ALTER TABLE public.procor ADD if not exists procorsemest bpchar(1) DEFAULT 'N'::bpchar NULL;`
    );
    await pool.query(
      `ALTER TABLE public.pro ADD if not exists proacabando bpchar(1) DEFAULT 'N'::bpchar NULL;`
    );
    await pool.query(
      `ALTER TABLE public.pro ADD if not exists procusto numeric(14, 4) NULL;`
    );
    //temporatrio
    await pool.query(`
        ALTER TABLE public.procor ALTER COLUMN procorqtde SET DEFAULT 0;
        ALTER TABLE public.procor ALTER COLUMN procorsemest SET DEFAULT 'S'::bpchar;

    `);
    await pool.query(`update usu set usuviuversao = 'N';`);

    //fim temporatrio

    // Tabela de relacionamento muitos-para-muitos entre produtos e modelos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.promod (
        promodprocod int4 NOT NULL,
        promodmodcod int4 NOT NULL,
        CONSTRAINT promod_pkey PRIMARY KEY (promodprocod, promodmodcod),
        CONSTRAINT promod_procod_fkey FOREIGN KEY (promodprocod) REFERENCES public.pro(procod) ON DELETE CASCADE,
        CONSTRAINT promod_modcod_fkey FOREIGN KEY (promodmodcod) REFERENCES public.modelo(modcod) ON DELETE CASCADE
      );
    `);

    // Migrar dados existentes de promodcod para a tabela promod (se existirem)
    await pool.query(`
      INSERT INTO public.promod (promodprocod, promodmodcod)
      SELECT procod, promodcod FROM public.pro 
      WHERE promodcod IS NOT NULL
      ON CONFLICT (promodprocod, promodmodcod) DO NOTHING;
    `);

    // ==================================================================================================================================
    // GRUPOS DE COMPATIBILIDADE (PART GROUPS) - Grupos para gerenciamento de estoque compartilhado
    // Simplificado: usa INTEGER como ID (auto increment) ao invés de UUID
    // ==================================================================================================================================

    // Verifica se a tabela part_groups existe com UUID e precisa de migração
    await pool.query(`
      DO $$
      BEGIN
        -- Se a tabela existe com coluna UUID, faz a migração para INTEGER
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'part_groups' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
        ) THEN
          -- Remove as constraints antigas
          ALTER TABLE public.pro DROP CONSTRAINT IF EXISTS fk_pro_part_group;
          DROP INDEX IF EXISTS idx_pro_part_group_id;
          DROP INDEX IF EXISTS idx_part_group_audit_group_id;
          
          -- Cria tabela temporária para migração dos dados
          CREATE TEMP TABLE temp_part_groups AS SELECT * FROM public.part_groups;
          CREATE TEMP TABLE temp_audit AS SELECT * FROM public.part_group_audit;
          CREATE TEMP TABLE temp_pro_groups AS SELECT procod, part_group_id FROM public.pro WHERE part_group_id IS NOT NULL;
          
          -- Remove as tabelas antigas
          DROP TABLE IF EXISTS public.part_group_audit;
          DROP TABLE IF EXISTS public.part_groups CASCADE;
          
          -- Limpa a coluna part_group_id da tabela pro
          ALTER TABLE public.pro DROP COLUMN IF EXISTS part_group_id;
        END IF;
      END$$;
    `);

    // Cria tabela part_groups com ID INTEGER (auto increment) - mais simples e fácil de entender
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.part_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Adiciona coluna grpcusto na tabela part_groups (custo do grupo)
    await pool.query(`
      ALTER TABLE public.part_groups ADD COLUMN IF NOT EXISTS grpcusto NUMERIC(14, 4) NULL;
    `);

    // Adiciona coluna color_id na tabela part_groups (vincula grupo a uma cor)
    await pool.query(`
      ALTER TABLE public.part_groups ADD COLUMN IF NOT EXISTS color_id INTEGER NULL;
    `);

    // Adiciona coluna part_group_id na tabela pro (FK para grupos de compatibilidade)
    await pool.query(`
      ALTER TABLE public.pro ADD IF NOT EXISTS part_group_id INTEGER NULL;
    `);

    // Adiciona a constraint de chave estrangeira se não existir
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_pro_part_group' 
          AND table_name = 'pro'
        ) THEN
          ALTER TABLE public.pro 
            ADD CONSTRAINT fk_pro_part_group 
            FOREIGN KEY (part_group_id) 
            REFERENCES public.part_groups(id) 
            ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    // Cria tabela de auditoria para histórico de movimentações de estoque do grupo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.part_group_audit (
        id SERIAL PRIMARY KEY,
        part_group_id INTEGER NOT NULL REFERENCES public.part_groups(id) ON DELETE CASCADE,
        change INTEGER NOT NULL,
        reason TEXT,
        reference_id TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Índice para buscas rápidas no histórico de auditoria
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_part_group_audit_group_id 
      ON public.part_group_audit(part_group_id);
    `);

    // Índice para buscas rápidas de peças por grupo
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pro_part_group_id 
      ON public.pro(part_group_id);
    `);

    // Adiciona coluna corhex na tabela cores (código HEX opcional para exibição)
    await pool.query(`
      ALTER TABLE public.cores ADD COLUMN IF NOT EXISTS corhex TEXT NULL;
    `);

    // Tabela de itens do grupo de compatibilidade, vinculando grupo a uma variação procor
    // Substitui o campo part_group_id em pro, permitindo o mesmo produto em vários grupos
    // desde que com cores diferentes (procorid diferente).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.part_group_items (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES public.part_groups(id) ON DELETE CASCADE,
        procorid INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_part_group_item UNIQUE (group_id, procorid)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_part_group_items_group_id
      ON public.part_group_items(group_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_part_group_items_procorid
      ON public.part_group_items(procorid);
    `);

    // Adiciona coluna qtde_ideal em part_groups (quantidade ideal de estoque por grupo)
    await pool.query(`
      ALTER TABLE public.part_groups ADD COLUMN IF NOT EXISTS qtde_ideal INTEGER NULL;
    `);

    // ==================================================================================================================================
    // FIM GRUPOS DE COMPATIBILIDADE
    // ==================================================================================================================================

    // FIM NOVOS CAMPOS
    // ==================================================================================================================================

    //   INSERTS CONDICIONAIS

    // EMP default (empcod = 1)
    await pool.query(`
      INSERT INTO public.emp (empcod, emprazao, empwhatsapp1, empwhatsapp2)
      VALUES (1, 'Razao Social ou Fantasia', '', '')
      ON CONFLICT (empcod) DO NOTHING;
    `);

    // USU default (usucod = 1, usunome = 'orderup')
    await pool.query(`
      INSERT INTO public.usu (usunome, usuemail, ususenha,usuadm,usupv,usuest)
      VALUES ('orderup', 'admin@orderup.com.br', md5('orderup@'),'S','S','S')
      ON CONFLICT (usuemail) DO NOTHING;
    `);

    // View Tipo peças
    await pool.query(`
      CREATE OR REPLACE VIEW public.vw_tipo_pecas
      AS SELECT tipo.tipocod,
          tipo.tipodes,
          pro.promarcascod,
          promod.promodmodcod as promodcod,
          tipo.tipoordem
        FROM pro
          left join promod on promodprocod = pro.procod
          left JOIN tipo ON tipo.tipocod = pro.protipocod
        GROUP BY tipo.tipocod, tipo.tipodes, pro.promarcascod, promod.promodmodcod;

      -- Permissions

      ALTER TABLE public.vw_tipo_pecas OWNER TO postgres;
      GRANT ALL ON TABLE public.vw_tipo_pecas TO postgres;
    `);

    // Table EST (estoque)
    await pool.query(`
        CREATE TABLE IF NOT exists public.est (
      estprocod int4 NOT NULL,
      estqt int4 NOT NULL,
      esttipo varchar(4) NULL,
      CONSTRAINT est_pkey PRIMARY KEY (estprocod)
      );
    `);

    // Table PV (pedidos de venda)
    await pool.query(`
        CREATE TABLE IF NOT exists public.pv (
        pvcod int4 NOT NULL,
        pvdtcad date DEFAULT now() NOT NULL,
        pvvl numeric(14, 4) DEFAULT 0 NULL,
        pvobs varchar(254) NULL,
        pvcanal varchar(10) NULL,
        pvconfirmado bpchar(2) NULL,
        pvsta bpchar(2) NULL,
        CONSTRAINT pvcod_pkey PRIMARY KEY (pvcod)
      );

    `);

    // Table PVI (itens dos pedidos de venda)
    await pool.query(`
        CREATE TABLE IF NOT exists public.pvi (
          pvipvcod int4 NOT NULL,
          pviprocod int4 NOT NULL,
          pvivl numeric(14, 4) DEFAULT 0 NULL,
          pviqtde numeric(14, 4) DEFAULT 0 NULL
      );
    `);

    //Estrutura para cadastro de clientes:

    await pool.query(`
      -- Extensões úteis (opcional, mas recomendado)
      CREATE EXTENSION IF NOT EXISTS citext;
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      -- Tipo para status do parceiro
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'par_status') THEN
          CREATE TYPE par_status AS ENUM ('A','I');
        END IF;
      END$$;

      -- =========================
      -- TABELAS BASE (PAÍS/REGIÃO)
      -- =========================
      CREATE TABLE IF NOT exists public.pais (
        paiscod           INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        paisdes           VARCHAR(40) NOT NULL UNIQUE,
        paispop           NUMERIC(14,4),
        paismoe           VARCHAR(20),
        paiscontcod       INT NOT NULL
      );

      -- Região/Tipo de UF (mínima para atender a FK citada)
      CREATE TABLE IF NOT exists public.tufreg (
        tufregcod INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        tufregdes VARCHAR(40) NOT NULL
      );

      -- ========
      -- TABELA UF
      -- ========
      CREATE TABLE IF NOT exists public.uf (
        ufsigla     VARCHAR(2) PRIMARY KEY,
        ufcodibge   INT NOT NULL,
        ufdes       VARCHAR(40) NOT NULL,
        ufie        VARCHAR(20),
        ufconv      VARCHAR(20),
        ufmen       VARCHAR(500),
        ufpaiscod   INT NOT NULL REFERENCES public.pais(paiscod),
        uftufregcod INT REFERENCES public.tufreg(tufregcod),
        CONSTRAINT ck_uf_sigla_fmt CHECK (ufsigla ~ '^[A-Z]{2}$')
      );

      -- =============
      -- TABELA MUN (Município)
      -- =============
      CREATE TABLE IF NOT exists public.mun (
        muncod       INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        mundes       VARCHAR(40) NOT NULL,
        munufsigla   VARCHAR(2) NOT NULL REFERENCES public.uf(ufsigla),
        muncodibge   INT UNIQUE,
        CONSTRAINT uq_mun_nome_uf UNIQUE (mundes, munufsigla)
      );


      -- ======================
      -- TABELA PAR (Parceiros)
      -- ======================
      CREATE TABLE IF NOT exists public.par (
        parcod      INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        parcnpjcpf  VARCHAR(14) NOT NULL,                 -- somente dígitos (11=CPF, 14=CNPJ)
        parierg     VARCHAR(20),
        pardes      VARCHAR(120) NOT NULL,                -- razão/nome
        parfan      VARCHAR(120),                         -- fantasia
        parrua      VARCHAR(80),
        parbai      VARCHAR(40),
        parmuncod   INT NOT NULL REFERENCES public.mun(muncod),
        parcep      VARCHAR(9),                           -- 99999-999 (aceita com/sem hífen via CHECK)
        parfone     VARCHAR(20),
        paremail    CITEXT,
        pardcad     TIMESTAMPTZ NOT NULL DEFAULT now(),   -- criado_em
        pardua      TIMESTAMPTZ,                          -- atualizado_em
        parsit      par_status NOT NULL DEFAULT 'A',
        CONSTRAINT uq_par_parcnpjcpf UNIQUE (parcnpjcpf),
        CONSTRAINT ck_par_doc_fmt CHECK (parcnpjcpf ~ '^[0-9]{11}$' OR parcnpjcpf ~ '^[0-9]{14}$'),
        CONSTRAINT ck_par_cep_fmt CHECK (parcep IS NULL OR parcep ~ '^[0-9]{5}-?[0-9]{3}$'),
        CONSTRAINT ck_par_email_fmt CHECK (paremail IS NULL OR paremail ~* '^[^@]+@[^@]+\.[^@]+$')
      );

      -- =================
      -- TABELA CLI (Cliente)
      -- =================
      CREATE TABLE IF NOT exists public.cli (
        cliparcod INT PRIMARY KEY REFERENCES public.par(parcod) ON DELETE RESTRICT,
        clibloq   BOOLEAN NOT NULL DEFAULT false,
        clilim    NUMERIC(14,2) NOT NULL DEFAULT 0
      );



      -- =======================================
      -- INSERTS PARA POPULAR AS TABELAS NECESSÁRIAS
      -- =======================================

      -- ====== PAÍS ======
      -- =======================================
      -- INSERTS PARA POPULAR A TABELA PAIS
      -- =======================================

      INSERT INTO public.pais
      (paiscod, paisdes, paispop, paismoe, paiscontcod)
      VALUES (1058, 'BRASIL', 170000000.0000, 'REAL', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais
      (paiscod, paisdes, paispop, paismoe, paiscontcod)
      VALUES (1600, 'CHINA, REPUBLICA POPULAR', 300000000.0000, 'DOLAR', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais
      (paiscod, paisdes, paispop, paismoe, paiscontcod)
      VALUES (3514, 'HONG KONG', NULL, 'DOLAR HONG KONG', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais
      (paiscod, paisdes, paispop, paismoe, paiscontcod)
      VALUES (2496, 'ESTADOS UNIDOS', NULL, 'DOLAR', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais
      (paiscod, paisdes, paispop, paismoe, paiscontcod)
      VALUES (3867, 'ITALIA', NULL, 'EURO', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (6289, 'ESCOCIA', NULL, 'LIBRA', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (1490, 'CANADA', NULL, 'DOLAR', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (7676, 'SUICA', NULL, 'DOLAR', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (6033, 'POLONIA', NULL, 'DOLAR', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (5380, 'NORUEGA', NULL, 'DOLAR', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (698, 'AUSTRALIA', NULL, 'DOLAR', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (876, 'BELGICA', NULL, 'DOLAR', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (2453, 'ESPANHA', NULL, 'EURO', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (230, 'ALEMANHA', NULL, 'EURO', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3516, 'INGLATERRA', NULL, 'LBR', 6)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3515, 'ROMENIA', NULL, 'EUR', 6)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3517, 'AUSTRIA', NULL, 'EURO', 6)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3518, 'TURQUIA', NULL, 'LIRA TURCA', 6)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3519, 'HOLANDA', NULL, 'EURO', 6)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3520, 'REINO UNIDO', NULL, 'LIBRA ESTERLINA', 6)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3521, 'REPÚBLICA TCHECA', NULL, 'COROA TCHECA', 6)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3522, 'TAIWAN', NULL, NULL, 5)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3524, 'ARGENTINA', NULL, NULL, 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3525, 'FRANCA', NULL, NULL, 6)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3832, 'ISRAEL', NULL, 'shekel israelense', 4)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3526, 'JAPAO', NULL, 'IENE', 5)
      ON CONFLICT (paiscod) DO NOTHING;

      INSERT INTO public.pais VALUES (3523, 'PANAMA', NULL, NULL, 3)
      ON CONFLICT (paiscod) DO NOTHING;


      -- ====== TUFREG ======
      INSERT INTO public.tufreg (tufregcod, tufregdes) VALUES (1, 'CENTRO-OESTE')
      ON CONFLICT (tufregcod) DO NOTHING;
      INSERT INTO public.tufreg (tufregcod, tufregdes) VALUES (2, 'NORDESTE')
      ON CONFLICT (tufregcod) DO NOTHING;
      INSERT INTO public.tufreg (tufregcod, tufregdes) VALUES (3, 'NORTE')
      ON CONFLICT (tufregcod) DO NOTHING;
      INSERT INTO public.tufreg (tufregcod, tufregdes) VALUES (4, 'SUDESTE')
      ON CONFLICT (tufregcod) DO NOTHING;
      INSERT INTO public.tufreg (tufregcod, tufregdes) VALUES (5, 'SUL')
      ON CONFLICT (tufregcod) DO NOTHING;

      -- ====== UF ======
      INSERT INTO public.uf VALUES ('RJ', 33, 'RIO DE JANEIRO', '', '', '', 1058, 4)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('PR', 41, 'PARANA', '', '', '', 1058, 5)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('SC', 42, 'SANTA CATARINA', '', '', '', 1058, 5)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('RS', 43, 'RIO GRANDE DO SUL', '', '', '', 1058, 5)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('MS', 50, 'MATO GROSSO DO SUL', '', '', '', 1058, 1)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('MT', 51, 'MATO GROSSO', '', '', '', 1058, 1)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('AP', 16, 'AMAPA', '', '', '', 1058, 3)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('RO', 11, 'RONDONIA', '', '', '', 1058, 3)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('RR', 14, 'RORAIMA', '', '', '', 1058, 3)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('PA', 14, 'PARA', '', '', '', 1058, 3)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('TO', 17, 'TOCANTINS', '', '', '', 1058, 3)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('MA', 21, 'MARANHAO', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('PI', 22, 'PIAUI', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('RN', 24, 'RIO GRANDE DO NORTE', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('MG', 31, 'MINAS GERAIS', '', '', '', 1058, 4)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('CE', 23, 'CEARA', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('PB', 25, 'PARAIBA', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('PE', 26, 'PERNAMBUCO', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('SP', 35, 'SAO PAULO', '', '', '', 1058, 4)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('SE', 28, 'SERGIPE', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('ES', 32, 'ESPIRITO SANTO', '', '', '', 1058, 4)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('AM', 13, 'AMAZONAS', '', '', '', 1058, 3)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('GO', 52, 'GOIAS', '', '', '', 1058, 1)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('BA', 29, 'BAHIA', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('AC', 12, 'ACRE', '', '', '', 1058, 3)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('AL', 27, 'ALAGOAS', '', '', '', 1058, 2)
      ON CONFLICT (ufsigla) DO NOTHING;
      INSERT INTO public.uf VALUES ('DF', 53, 'DISTRITO FEDERAL', '', '', '', 1058, 1)
      ON CONFLICT (ufsigla) DO NOTHING;


    `);

    // Trigger function to decrement stock when order is confirmed
    // IDEMPOTENT: Only executes when pvconfirmado transitions from 'N' to 'S'
    //
    // Stock decrement strategy:
    // 1) Items WITH color (pviprocorid) -> decrement from procor table
    // 2) Items WITHOUT color and product WITHOUT variations -> decrement from pro.proqtde
    // 3) Products belonging to a compatibility group (part_groups):
    //    - Decrement stock for the sold product
    //    - Decrement stock for ALL members of the same group (shared/compatible parts)
    //    - Create audit records for traceability
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.atualizar_saldo()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        DECLARE
          r RECORD;
          member_rec RECORD;
          v_group_id INTEGER;
          v_qty NUMERIC;
        BEGIN
          -- IDEMPOTENT CHECK: Only execute if transitioning from 'N' to 'S'
          -- This prevents double stock deductions on re-confirmation attempts
          IF OLD.pvconfirmado = 'N' AND NEW.pvconfirmado = 'S' THEN

            -- 1) Items WITH color -> decrement from procor
            UPDATE procor pc
              SET procorqtde = GREATEST(COALESCE(pc.procorqtde, 0) - COALESCE(i.pviqtde, 0), 0)
              FROM pvi i
            WHERE i.pvipvcod      = NEW.pvcod
              AND i.pviprocorid  IS NOT NULL
              AND i.pviprocorid   = pc.procorcorescod
              AND i.pviprocod     = pc.procorprocod;

            -- 2) Items WITHOUT color AND product WITHOUT variations -> decrement from pro.proqtde
            -- Only for products NOT in a compatibility group (groups are handled separately below)
            UPDATE pro pr
              SET proqtde = GREATEST(COALESCE(pr.proqtde, 0) - COALESCE(i.pviqtde, 0), 0)
              FROM pvi i
            WHERE i.pvipvcod = NEW.pvcod
              AND i.pviprocod = pr.procod
              AND i.pviprocorid IS NULL
              AND pr.part_group_id IS NULL
              AND NOT EXISTS (
                    SELECT 1
                      FROM procor pc
                      WHERE pc.procorprocod = pr.procod
                  );

            -- 3) COMPATIBILITY GROUPS: For products in a group, decrement stock for ALL group members
            -- This ensures that when product A is sold, the stock of compatible parts B, C, etc.
            -- in the same group is also decremented.
            -- 
            -- Table structure assumed for part_groups:
            -- - part_groups(id, name, stock_quantity, ...) - main group table
            -- - pro.part_group_id - FK linking product to a group
            -- - part_group_audit - audit trail for stock movements
            -- 
            -- NOTE: We aggregate quantities by group_id first to handle cases where
            -- an order contains multiple products from the same group
            FOR r IN 
              SELECT 
                pr.part_group_id,
                SUM(COALESCE(i.pviqtde, 0)) as total_qty
              FROM pvi i
              JOIN pro pr ON pr.procod = i.pviprocod
              WHERE i.pvipvcod = NEW.pvcod
                AND pr.part_group_id IS NOT NULL
              GROUP BY pr.part_group_id
            LOOP
              v_group_id := r.part_group_id;
              v_qty := r.total_qty;

              -- Update the group's shared stock_quantity
              UPDATE part_groups 
              SET stock_quantity = GREATEST(stock_quantity - v_qty, 0),
                  updated_at = NOW()
              WHERE id = v_group_id;

              -- Decrement stock for ALL members of the compatibility group
              -- This includes both the sold product and all other compatible parts
              FOR member_rec IN
                SELECT procod, prodes
                FROM pro
                WHERE part_group_id = v_group_id
              LOOP
                -- Decrement the individual product stock (pro.proqtde)
                UPDATE pro
                SET proqtde = GREATEST(COALESCE(proqtde, 0) - v_qty, 0)
                WHERE procod = member_rec.procod;

                -- Create audit record for each member affected
                -- reference_id stores the product code (procod) for frontend display
                INSERT INTO part_group_audit (part_group_id, change, reason, reference_id)
                VALUES (v_group_id, -v_qty, 'sale', member_rec.procod::text);
              END LOOP;
            END LOOP;

          END IF;

          RETURN NEW;
        END;
        $function$;
  
    `);

    // Trigger function to return stock when a confirmed order is cancelled
    // IDEMPOTENT: Only executes when pvsta transitions to 'X' for a confirmed order
    // Mirrors the logic of atualizar_saldo but returns stock instead of decrementing
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.retornar_saldo()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        DECLARE
          r RECORD;
          member_rec RECORD;
          v_group_id INTEGER;
          v_qty NUMERIC;
        BEGIN
          -- Only return stock if the order was confirmed AND is being cancelled
          -- Check that we're transitioning from non-cancelled to cancelled state
          IF OLD.pvsta <> 'X' AND NEW.pvsta = 'X' AND NEW.pvconfirmado = 'S' THEN

            -- 1) Items WITH color -> return to procor
            UPDATE procor pc
              SET procorqtde = COALESCE(pc.procorqtde, 0) + COALESCE(i.pviqtde, 0)
              FROM pvi i
            WHERE i.pvipvcod      = NEW.pvcod
              AND i.pviprocorid  IS NOT NULL
              AND i.pviprocorid   = pc.procorcorescod
              AND i.pviprocod     = pc.procorprocod;

            -- 2) Items WITHOUT color AND product WITHOUT variations -> return to pro.proqtde
            -- Only for products NOT in a compatibility group (groups are handled separately)
            UPDATE pro pr
              SET proqtde = COALESCE(pr.proqtde, 0) + COALESCE(i.pviqtde, 0)
              FROM pvi i
            WHERE i.pvipvcod = NEW.pvcod
              AND i.pviprocod = pr.procod
              AND i.pviprocorid IS NULL
              AND pr.part_group_id IS NULL
              AND NOT EXISTS (
                    SELECT 1
                      FROM procor pc
                      WHERE pc.procorprocod = pr.procod
                  );

            -- 3) COMPATIBILITY GROUPS: Return stock for ALL members of the group
            -- NOTE: We aggregate quantities by group_id first to handle cases where
            -- an order contains multiple products from the same group
            FOR r IN 
              SELECT 
                pr.part_group_id,
                SUM(COALESCE(i.pviqtde, 0)) as total_qty
              FROM pvi i
              JOIN pro pr ON pr.procod = i.pviprocod
              WHERE i.pvipvcod = NEW.pvcod
                AND pr.part_group_id IS NOT NULL
              GROUP BY pr.part_group_id
            LOOP
              v_group_id := r.part_group_id;
              v_qty := r.total_qty;

              -- Return stock to the group's shared stock_quantity
              UPDATE part_groups 
              SET stock_quantity = stock_quantity + v_qty,
                  updated_at = NOW()
              WHERE id = v_group_id;

              -- Return stock to ALL members of the compatibility group
              FOR member_rec IN
                SELECT procod, prodes
                FROM pro
                WHERE part_group_id = v_group_id
              LOOP
                -- Return the individual product stock (pro.proqtde)
                UPDATE pro
                SET proqtde = COALESCE(proqtde, 0) + v_qty
                WHERE procod = member_rec.procod;

                -- Create audit record for each member affected
                INSERT INTO part_group_audit (part_group_id, change, reason, reference_id)
                VALUES (v_group_id, v_qty, 'Cancelado', member_rec.procod::text);
              END LOOP;
            END LOOP;

          END IF;

          RETURN NEW;
        END;
        $function$;
 
    `);
    await pool.query(`
      CREATE OR REPLACE FUNCTION fn_marcar_prosemest()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1
              FROM procor
              WHERE procorprocod = NEW.procod
          ) THEN
              IF NEW.proqtde = 0 THEN
                  NEW.prosemest := 'S';
              ELSE
                  NEW.prosemest := 'N';
              END IF;
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

    `);
   await pool.query(`
      CREATE OR REPLACE FUNCTION fn_marcar_procorsemest()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.procorqtde = 0 THEN
              NEW.procorsemest := 'S';
          ELSE
              NEW.procorsemest := 'N';
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

    `);


    // FIM INSERTS CONDICIONAIS

    //inicio das triggers
    // Trigger for stock decrement on order confirmation
    // The trigger fires AFTER UPDATE OF pvconfirmado and the condition ensures
    // it only runs when transitioning from 'N' to 'S' (idempotent)
    await pool.query(`
      DROP TRIGGER IF EXISTS t_atualizar_saldo ON pv;
      CREATE TRIGGER t_atualizar_saldo
      AFTER UPDATE OF pvconfirmado
      ON public.pv
      FOR EACH ROW
      WHEN (OLD.pvconfirmado = 'N' AND NEW.pvconfirmado = 'S')
      execute procedure atualizar_saldo()
    `);

    // Trigger for stock return on order cancellation
    // The trigger fires AFTER UPDATE OF pvsta and the condition ensures
    // it only runs when transitioning to 'X' from a non-cancelled state (idempotent)
    await pool.query(`
      DROP TRIGGER IF EXISTS t_retornar_saldo ON public.pv;
      CREATE TRIGGER t_retornar_saldo
      AFTER UPDATE OF pvsta
      ON public.pv
      FOR EACH ROW
      WHEN (OLD.pvsta <> 'X' AND NEW.pvsta = 'X')
      execute procedure retornar_saldo()
    `);
    await pool.query(`
        DROP TRIGGER IF EXISTS trg_marcar_prosemest ON pro;
        CREATE TRIGGER trg_marcar_prosemest
        BEFORE UPDATE OF proqtde ON pro
        FOR EACH ROW
        EXECUTE PROCEDURE fn_marcar_prosemest();

        

        DROP TRIGGER IF EXISTS trg_marcar_procorsemest ON procor;
        CREATE TRIGGER trg_marcar_procorsemest
        BEFORE UPDATE OF procorqtde ON procor
        FOR EACH ROW
        EXECUTE PROCEDURE fn_marcar_procorsemest();

        
    `);
    //fim das triggers

    //inicio das sequences

    await pool.query(`CREATE SEQUENCE IF NOT EXISTS public.pv_seq
                      INCREMENT BY 1
                      MINVALUE 1
                      MAXVALUE 9223372036854775807
                      START 1
                      CACHE 1
                      NO CYCLE;`);
    //fim das sequences

    // ==================================================================================================================================
    // ÍNDICES DE PERFORMANCE — criados com IF NOT EXISTS para ser idempotente
    // ==================================================================================================================================

    // pv: filtros de status, confirmação, data e vendedor (usados em todas as listagens de pedidos)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pv_sta          ON public.pv (pvsta);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pv_confirmado   ON public.pv (pvconfirmado);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pv_dtcad        ON public.pv (pvdtcad);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pv_rcacod       ON public.pv (pvrcacod);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pv_canal        ON public.pv (pvcanal);`);

    // pvi: join com pv e com pro (chaves de join mais usadas)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pvi_pvcod       ON public.pvi (pvipvcod);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pvi_procod      ON public.pvi (pviprocod);`);

    // pro: filtros de marca, tipo, status e estoque (usados em listagens de produtos)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pro_marcas      ON public.pro (promarcascod);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pro_tipo        ON public.pro (protipocod);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pro_sit         ON public.pro (prosit);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pro_semest      ON public.pro (prosemest);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pro_acabando    ON public.pro (proacabando);`);

    // promod: join de peças com modelos (correlated subquery em proModels e proController)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_promod_procod   ON public.promod (promodprocod);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_promod_modcod   ON public.promod (promodmodcod);`);

    // par: busca textual por nome/fantasia via ILIKE — índices GIN trigram para acelerar
    // Requer a extensão pg_trgm que já foi habilitada acima (CREATE EXTENSION IF NOT EXISTS pg_trgm)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_par_des_trgm
      ON public.par USING gin (pardes gin_trgm_ops);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_par_fan_trgm
      ON public.par USING gin (parfan gin_trgm_ops);
    `);

    // ==================================================================================================================================
    // FIM ÍNDICES DE PERFORMANCE
    // ==================================================================================================================================

    // ==================================================================================================================================
    // CORREÇÃO: permitir procorcorescod NULL em procor (peças sem cor)
    // A PK original (procorprocod, procorcorescod) exigia ambas NOT NULL, impedindo
    // adicionar uma peça sem variação de cor ao grupo de compatibilidade.
    // Solução: trocar PK para procorid (serial, já único) e relaxar a constraint.
    // ==================================================================================================================================

    // 1. Dropa a PK antiga somente se ainda for a composta (procorprocod, procorcorescod)
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_name = tc.constraint_name
           AND kcu.table_name = tc.table_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = 'procor'
            AND kcu.column_name = 'procorcorescod'
        ) THEN
          ALTER TABLE public.procor DROP CONSTRAINT IF EXISTS pk_procor;
        END IF;
      END$$;
    `);

    // 2. Torna procorcorescod nullable (para peças sem cor)
    await pool.query(`
      ALTER TABLE public.procor ALTER COLUMN procorcorescod DROP NOT NULL;
    `);

    // 3. Adiciona PK em procorid (serial, já único por definição)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_type = 'PRIMARY KEY'
            AND table_name = 'procor'
        ) THEN
          ALTER TABLE public.procor ADD CONSTRAINT pk_procor_id PRIMARY KEY (procorid);
        END IF;
      END$$;
    `);

    // 4. Unique index para pares (produto, cor) onde cor NÃO é nula (comportamento original)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_procor_procod_corcod
      ON public.procor(procorprocod, procorcorescod)
      WHERE procorcorescod IS NOT NULL;
    `);

    // 5. Unique partial index: garante no máximo um registro "sem cor" por produto
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_procor_procod_sem_cor
      ON public.procor(procorprocod)
      WHERE procorcorescod IS NULL;
    `);

    // ==================================================================================================================================
    // FIM CORREÇÃO procorcorescod NULL
    // ==================================================================================================================================

    await pool.query("COMMIT");
    console.log("✅ atualizardb: tabelas e registros padrão garantidos.");
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ atualizardb: erro:", err);
    throw err;
  } finally {
    await pool.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
  }
}

module.exports = { atualizarDB };
