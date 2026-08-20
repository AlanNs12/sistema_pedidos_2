# Contexto: Sistema de Grupos de Compatibilidade (Estoque)

Arquivo principal analisado: `src/routes/partGroupRoutes.js`

---

## 1. Mapa de Arquivos Envolvidos

### Camada Backend

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| **Rotas** | `src/routes/partGroupRoutes.js` | 12 endpoints REST, todos com middleware `requireAdmin` |
| **Controlador** | `src/controllers/partGroupController.js` | 14 métodos exportados que orquestram as chamadas |
| **Modelo** | `src/models/partGroupModels.js` | 19 funções de banco de dados (1471 linhas) |
| **Middleware** | `src/middlewares/adminMiddleware.js` | Valida JWT e permissão `usuadm === 'S'` |
| **Registro** | `src/app.js:90-91` | Importa e registra as rotas no Express |
| **Pedidos** | `src/controllers/pedidosController.js:57` | Usa `venderItens()` para débito de estoque na venda |
| **Relatórios** | `src/controllers/relatoriosController.js:274` | Endpoint `GET /v2/relatorios/estoque-grupos` |
| **Modelo Relatórios** | `src/models/relatoriosModels.js:180` | Função `getEstoqueGruposTopPecas()` para dados do painel |
| **Migração DB** | `src/config/atualizardb.js:160-229` | Criação das tabelas e colunas |

### Camada Frontend

| Arquivo | Responsabilidade |
|---------|------------------|
| `public/html/auth/js/painel-part-groups.js` | CRUD completo de grupos, adicionar/remover peças, histórico (1279 linhas) |
| `public/html/auth/js/painel-estoque-grupos.js` | Painel de ajuste rápido de estoque e quantidade ideal (395 linhas) |
| `public/html/auth/js/componentes.js:35` | Link de navegação "Estoque Grupos" no menu |
| `public/html/auth/admin/html/painel-estoque-grupos.html` | Template HTML do painel de estoque |
| `src/app.js:217` | Rota `GET /estoque-grupos` serve o HTML do painel |

### Testes e Documentação

| Arquivo | Conteúdo |
|---------|----------|
| `tests/partGroups.test.js` | Testes unitários das funções do modelo |
| `docs/STOCK_GROUPING_FIX.md` | Documentação do fix de sincronização de estoque |
| `docs/sync-group-stock.md` | Documentação detalhada da sincronização |
| `docs/part-groups-color-pagination.md` | Documentação de cores e paginação |
| `docs/migrations.md` | Histórico de migrações do banco |
| `PR_SUMMARY.md` | Resumo das últimas mudanças |

---

## 2. Tabelas do Banco de Dados

### `part_groups` (Principal)
```sql
id              SERIAL PRIMARY KEY
name            TEXT NOT NULL
stock_quantity  INTEGER DEFAULT 0
grpcusto        NUMERIC(14,4) NULL      -- Custo do grupo
color_id        INTEGER NULL            -- FK para cores.corcod
qtde_ideal      INTEGER NULL            -- Quantidade ideal de estoque
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### `part_group_items` (Vinculação grupo-peça via cor)
```sql
id        SERIAL PRIMARY KEY
group_id  INTEGER NOT NULL REFERENCES part_groups(id) ON DELETE CASCADE
procorid  INTEGER NOT NULL UNIQUE -- Vincula à variação de cor (procor)
```

### `part_group_audit` (Histórico de movimentações)
```sql
id              SERIAL PRIMARY KEY
part_group_id   INTEGER NOT NULL REFERENCES part_groups(id) ON DELETE CASCADE
change          INTEGER NOT NULL     -- positivo=entrada, negativo=saida
reason          TEXT                 -- motivo: 'sale', 'manual_adjustment', etc.
reference_id    TEXT NULL            -- procod da peça envolvida
created_at      TIMESTAMPTZ DEFAULT NOW()
```

### `pro` (coluna legada)
```sql
part_group_id   INTEGER NULL REFERENCES part_groups(id) ON DELETE SET NULL
```

---

## 3. Endpoints Disponíveis

| Método | Rota | Controller | Descrição |
|--------|------|------------|-----------|
| GET | `/part-groups` | `listGroups` | Lista todos os grupos |
| GET | `/part-groups/available-parts` | `getAvailableParts` | Peças disponíveis (filtro por grupo) |
| GET | `/part-groups/available-part` | `getAvailablePart` | Todas as peças com paginação e cores |
| GET | `/part-groups/:id` | `getGroup` | Busca grupo por ID com peças |
| GET | `/part-groups/:id/audit` | `getGroupAuditHistory` | Histórico de movimentações |
| GET | `/part-groups/part/:partId/stock` | `getPartGroupStock` | Estoque por ID da peça |
| POST | `/part-groups` | `createGroup` | Cria novo grupo (estoque=0) |
| PUT | `/part-groups/:id` | `updateGroup` | Atualiza grupo |
| PUT | `/part-groups/:id/stock` | `updateGroupStock` | Atualiza estoque do grupo |
| PUT | `/part-groups/:id/ideal` | `updateGroupIdealQty` | Define quantidade ideal |
| POST | `/part-groups/:id/parts` | `addPartToGroup` | Adiciona peça (procorid ou procod) |
| DELETE | `/part-groups/parts/:procorid` | `removePartFromGroup` | Remove peça do grupo |
| POST | `/part-groups/:id/adjust-stock` | `adjustGroupStock` | Ajusta estoque por delta |
| DELETE | `/part-groups/:id` | `deleteGroup` | Exclui grupo |

### Endpoint adicional (relatórios)
| Método | Rota | Controller | Descrição |
|--------|------|------------|-----------|
| GET | `/v2/relatorios/estoque-grupos` | `relatoriosController.getEstoqueGruposJSON` | Dados para painel de estoque |

---

## 4. Problemas Identificados

### PROBLEMA 1: Dualismo de vinculação (CRÍTICO)

O sistema possui DOIS mecanismos de vinculação grupo-peça que coexistem:

- **Modelo antigo** (`pro.part_group_id`): Usado por `decrementGroupStock()`, `incrementGroupStock()`, `venderItens()`, `addPartToGroup()` (deprecated), `removePartFromGroup()` (deprecated), `getAvailableParts()`
- **Modelo novo** (`part_group_items` via `procorid`): Usado por `addProcorToGroup()`, `addProcorToGroupByProcod()`, `removeProcorFromGroup()`, `getGroupById()`, `listAllGroups()`

**Consequência**: A venda (`venderItens`) verifica estoque via `pro.part_group_id`, mas a administração de grupos usa `part_group_items`. Se uma peça foi adicionada apenas via `part_group_items`, o `venderItens` não a encontra como parte do grupo.

**Linhas afetadas em `partGroupModels.js`**:
- `decrementGroupStock()`: linhas 183-281 (usa `pro.part_group_id`)
- `incrementGroupStock()`: linhas 293-373 (usa `pro.part_group_id`)
- `venderItens()`: linhas 1082-1396 (usa `pro.part_group_id` na linha 1116)
- `getAvailableParts()`: linhas 758-799 (filtra por `pro.part_group_id`)

### PROBLEMA 2: Rota DELETE ambígua

As rotas:
- `DELETE /part-groups/:id` (exclui grupo)
- `DELETE /part-groups/parts/:procorid` (remove peça)

Podem conflitar dependendo da ordem de resolução do Express. Se `:id` case com "parts", a rota errada será chamada.

### PROBLEMA 3: Estoque do grupo vs. estoque da peça

A função `updateGroupStock()` (linha 933) atualiza:
1. `part_groups.stock_quantity` (estoque do grupo)
2. `procor.procorqtde` de todas as variações vinculadas

Porém `venderItens()` (linha 1208) quando `stock_quantity !== null`:
1. Decrementa `pro.proqtde` de todas as peças com `part_group_id`
2. Atualiza `part_groups.stock_quantity` para `MIN(pro.proqtde)`

Isso pode causar divergência entre `procorqtde` e `pro.proqtde`.

### PROBLEMA 4: Dados do painel de estoque

O painel `painel-estoque-grupos.js` busca dados de `/v2/relatorios/estoque-grupos` (relatórios), não dos endpoints diretos de grupos. Se a função `getEstoqueGruposTopPecas()` no relatoriosModels não estiver correta, o painel mostrará dados errados.

### PROBLEMA 5: Validação de custo inconsistente

- `updateGroupStock` no controller (linha 117) valida custo com `parseFloat`
- `updateGroupStock` no modelo (linha 937) recebe `newCost` como parâmetro opcional
- O frontend em `painel-part-groups.js:601` valida custo antes de enviar
- Mas `adjustGroupStock` não aceita custo como parâmetro

---

## 5. Fluxo de Dados

### Criar Grupo
```
Frontend: criarGrupo() -> POST /part-groups
  -> Controller: createGroup() -> partGroupModels.createGroup(name, 0, colorId)
  -> INSERT INTO part_groups (name, stock_quantity, color_id)
```

### Adicionar Peça ao Grupo
```
Frontend: adicionarPecaAoGrupo(procorid) -> POST /part-groups/:id/parts
  -> Controller: addPartToGroup()
     -> partGroupModels.addProcorToGroup(procorid, groupId)
        -> INSERT INTO part_group_items (group_id, procorid)
        -> UPDATE procor SET procorqtde = group.stock_quantity
     -> OU partGroupModels.addProcorToGroupByProcod(procod, groupId)
        -> Busca ou cria procor com cor nula
        -> INSERT INTO part_group_items
```

### Ajustar Estoque
```
Frontend: ajustarEstoque() -> POST /part-groups/:id/adjust-stock
  -> Controller: adjustGroupStock()
     -> partGroupModels.adjustGroupStock(id, delta, reason)
        -> Calcula novo estoque = atual + delta
        -> partGroupModels.updateGroupStock(id, newStock, reason)
           -> UPDATE part_groups SET stock_quantity = newQuantity
           -> UPDATE procor SET procorqtde = newQuantity (via part_group_items)
           -> INSERT INTO part_group_audit
     -> partGroupModels.updateAllPartsStockInGroup(id, group.stock_quantity)
        -> UPDATE procor SET procorqtde = quantity (via part_group_items)
```

### Vender Itens (Pedido)
```
Frontend: enviar pedido -> POST /pedidos
  -> pedidosController.validarEDecrementarEstoque()
     -> partGroupModels.venderItens(itens, pvcod)
        -> Para cada peça:
           -> SELECT pro.part_group_id
           -> Se NÃO tem grupo: UPDATE pro SET proqtde = proqtde - qty
           -> Se TEM grupo:
              -> Verifica estoque via part_groups.stock_quantity
              -> UPDATE pro SET proqtde = proqtde - qty WHERE part_group_id = groupId
              -> UPDATE part_groups SET stock_quantity = MIN(pro.proqtde)
              -> INSERT INTO part_group_audit
```

---

## 6. Correções Necessárias (Plano)

### Prioridade Alta
1. **Unificar vinculação**: Fazer `venderItens()` e `decrementGroupStock()` consultarem `part_group_items` em vez de `pro.part_group_id`
2. **Corrigir rota DELETE ambígua**: Colocar a rota `DELETE /part-groups/parts/:procorid` ANTES de `DELETE /part-groups/:id`

### Prioridade Média
3. **Sincronizar procorqtde com pro.proqtde**: Quando o estoque do grupo é atualizado, garantir que ambos sejam atualizados
4. **Revisar endpoint de relatórios**: Verificar se `getEstoqueGruposTopPecas()` retorna dados consistentes

### Prioridade Baixa
5. **Remover funções deprecated**: `addPartToGroup()` e `removePartFromGroup()` quando todo o sistema estiver usando `part_group_items`
6. **Adicionar validação de custo em `adjustGroupStock`**

---

## 7. Comandos de Verificação

```bash
# Executar testes
node tests/partGroups.test.js

# Verificar se o servidor inicia sem erros
npm start

# Verificar se a rota de relatórios funciona
curl -b "token=SEU_TOKEN" http://localhost:PORT/v2/relatorios/estoque-grupos
```
