# Migrations: 5 Melhorias

Execute as seguintes instruções SQL no banco de dados para habilitar as 5 melhorias:

## 1. Cor por Grupo de Compatibilidade (Melhoria 3)

Adiciona suporte a cores por grupo de compatibilidade, permitindo gerenciar estoque separado por cor/variação.

```sql
-- Adiciona coluna color_id à tabela part_groups (FK para a tabela cores)
ALTER TABLE part_groups
  ADD COLUMN IF NOT EXISTS color_id INTEGER REFERENCES cores(corcod) ON DELETE SET NULL;
```

Após essa migration, é possível criar grupos com a mesma peça mas cores diferentes,
cada grupo tendo seu próprio estoque independente.

## 2. Verificar índice em pvdtcad (Performance — Dashboard com filtros de data)

Para melhorar a performance dos filtros de data no dashboard:

```sql
-- Índice na data de criação de pedidos (já pode existir)
CREATE INDEX IF NOT EXISTS idx_pv_pvdtcad ON pv (pvdtcad);
```

## Notas

- A coluna `color_id` é opcional (nullable). Grupos sem cor são os grupos genéricos existentes.
- A tabela `cores` já existe no sistema com colunas `corcod`, `cordes` e `corhex`.
