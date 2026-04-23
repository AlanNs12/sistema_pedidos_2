# Sincronização de Estoque entre Grupos de Peças

## Visão Geral

Esta funcionalidade implementa a sincronização automática de estoque entre peças que pertencem ao mesmo grupo de compatibilidade. Quando uma peça de um grupo é vendida, o estoque é decrementado de forma atômica e sincronizada com todas as outras peças do grupo.

## Regras de Negócio

### 1. Peça sem Grupo
- Comportamento inalterado
- Decrementa apenas o estoque individual da peça vendida (`pro.proqtde`)

### 2. Peça com Grupo (part_groups)

#### 2a. Grupo com campo `stock_quantity` definido (não nulo)
- O campo `stock_quantity` do grupo é usado como fonte da verdade
- Ao vender Q unidades:
  1. Valida se `group.stock_quantity >= Q`
  2. Se insuficiente, bloqueia a venda com erro
  3. Se suficiente, decrementa `group.stock_quantity -= Q`
  4. Atualiza o estoque de todas as peças do grupo para o novo valor
  5. Cria registro de auditoria com `reference_id` = código do produto (procod)

#### 2b. Grupo sem campo `stock_quantity` definido (nulo)
- Carrega todas as peças do grupo com lock `FOR UPDATE`, ordenadas por `proqtde DESC, procod ASC`
- Calcula a soma total do estoque disponível entre todas as peças
- Se soma total < Q, bloqueia a venda com erro "Estoque insuficiente no grupo"
- Caso soma suficiente, distribui a retirada entre as peças:
  - Começa pelas peças com maior estoque
  - Retira de cada peça `min(estoque_atual, restante_a_tirar)` até completar Q
  - Nenhum estoque fica negativo
- Cria registros de auditoria para cada peça afetada com `reference_id` = código do produto (procod)

### 3. Garantias Transacionais
- Toda operação é atômica (usa transação PostgreSQL)
- Usa locks `SELECT ... FOR UPDATE` para evitar condições de corrida
- WhatsApp só é enviado após commit bem-sucedido
- Em caso de falha, rollback é executado e nenhuma alteração persiste

### 4. Auditoria (part_group_audit)
- O campo `reference_id` sempre contém o código do produto (procod) como texto
- Isso permite que o frontend exiba corretamente qual peça foi afetada no histórico
- A query de histórico faz JOIN com a tabela `pro` usando `p.procod::text = a.reference_id`

## Fluxo de Venda

```
Cliente adiciona itens ao carrinho
        ↓
Cliente clica em "Finalizar" (Balcão ou Entrega)
        ↓
Frontend envia POST /pedidos/enviar
        ↓
[NOVO] Middleware validarEDecrementarEstoque
        ├── Valida estoque de cada item
        ├── Para itens com grupo: sincroniza estoque
        ├── Executa tudo em uma transação
        └── Em caso de erro: retorna 400 com mensagem clara
        ↓
Se sucesso: Cria pedido (pv) e itens (pvi)
        ↓
Frontend recebe resposta OK
        ↓
WhatsApp é enviado (só após commit do estoque)
```

## Instruções de Teste Manual

### Pré-requisitos
1. Ter o sistema rodando localmente
2. Ter peças cadastradas no banco de dados
3. Ter pelo menos um grupo de compatibilidade criado

### Cenário 1: Venda de peça com grupo que tem `stock_quantity` definido

1. Crie um grupo de compatibilidade:
   ```sql
   INSERT INTO part_groups (name, stock_quantity) VALUES ('Grupo Teste', 10);
   ```

2. Adicione peças ao grupo:
   ```sql
   UPDATE pro SET part_group_id = (SELECT id FROM part_groups WHERE name = 'Grupo Teste')
   WHERE procod IN (1, 2, 3); -- IDs das peças que deseja agrupar
   ```

3. No sistema, adicione uma das peças ao carrinho com quantidade 1

4. Finalize o pedido (Balcão ou Entrega)

5. **Resultado esperado**:
   - Pedido criado com sucesso
   - WhatsApp enviado
   - Estoque do grupo diminuído para 9
   - Estoque de todas as peças do grupo (1, 2, 3) agora é 9

6. Verificação SQL:
   ```sql
   SELECT pg.name, pg.stock_quantity, p.procod, p.prodes, p.proqtde
   FROM part_groups pg
   JOIN pro p ON p.part_group_id = pg.id
   WHERE pg.name = 'Grupo Teste';
   ```

### Cenário 2: Venda de 2 unidades de peça sem grupo

1. Certifique-se que a peça não pertence a nenhum grupo:
   ```sql
   SELECT procod, prodes, proqtde, part_group_id 
   FROM pro 
   WHERE part_group_id IS NULL AND proqtde > 2
   LIMIT 1;
   ```

2. No sistema, adicione esta peça ao carrinho com quantidade 2

3. Finalize o pedido

4. **Resultado esperado**:
   - Pedido criado com sucesso
   - Apenas o estoque da peça vendida foi decrementado em 2

5. Verificação SQL:
   ```sql
   SELECT procod, prodes, proqtde FROM pro WHERE procod = [ID_DA_PECA];
   ```

### Cenário 3: Estoque insuficiente - deve bloquear a venda

1. Crie uma situação de estoque baixo:
   ```sql
   UPDATE part_groups SET stock_quantity = 1 WHERE name = 'Grupo Teste';
   UPDATE pro SET proqtde = 1 WHERE part_group_id = (SELECT id FROM part_groups WHERE name = 'Grupo Teste');
   ```

2. No sistema, adicione uma peça do grupo ao carrinho com quantidade 5

3. Tente finalizar o pedido

4. **Resultado esperado**:
   - Erro exibido: "Estoque do grupo 'Grupo Teste' insuficiente. Disponível: 1, Solicitado: 5"
   - Nenhum pedido foi criado
   - Nenhuma alteração no estoque
   - WhatsApp NÃO foi enviado

### Cenário 4: Venda de múltiplos itens do mesmo grupo

1. Configure estoque do grupo:
   ```sql
   UPDATE part_groups SET stock_quantity = 20 WHERE name = 'Grupo Teste';
   ```

2. No sistema, adicione duas peças diferentes do mesmo grupo ao carrinho:
   - Peça A: quantidade 3
   - Peça B: quantidade 2

3. Finalize o pedido

4. **Resultado esperado**:
   - Pedido criado com sucesso
   - Estoque do grupo diminuído em 5 (3+2)
   - Novo estoque do grupo e de todas as peças: 15

### Cenário 5: Venda de peça com grupo SEM `stock_quantity` definido (distribuição de estoque)

1. Crie um grupo de compatibilidade SEM estoque definido:
   ```sql
   INSERT INTO part_groups (name, stock_quantity) VALUES ('Grupo Sem Estoque', NULL);
   ```

2. Adicione peças ao grupo com estoques diferentes:
   ```sql
   UPDATE pro SET part_group_id = (SELECT id FROM part_groups WHERE name = 'Grupo Sem Estoque'), proqtde = 10
   WHERE procod = 1;
   UPDATE pro SET part_group_id = (SELECT id FROM part_groups WHERE name = 'Grupo Sem Estoque'), proqtde = 5
   WHERE procod = 2;
   UPDATE pro SET part_group_id = (SELECT id FROM part_groups WHERE name = 'Grupo Sem Estoque'), proqtde = 3
   WHERE procod = 3;
   ```

3. No sistema, adicione uma das peças ao carrinho com quantidade 12

4. Finalize o pedido

5. **Resultado esperado**:
   - Pedido criado com sucesso (soma total = 18, suficiente para 12)
   - Estoque da peça 1 (maior estoque): 10 - 10 = 0
   - Estoque da peça 2: 5 - 2 = 3
   - Estoque da peça 3: 3 (não tocado, já atingimos 12)
   - Registros de auditoria criados para peças 1 e 2 com seus respectivos `reference_id`

6. Verificação SQL:
   ```sql
   SELECT p.procod, p.prodes, p.proqtde
   FROM pro p
   WHERE part_group_id = (SELECT id FROM part_groups WHERE name = 'Grupo Sem Estoque')
   ORDER BY p.proqtde DESC;

   -- Verificar auditoria com reference_id correto (código do produto)
   SELECT a.*, p.prodes as part_name
   FROM part_group_audit a
   LEFT JOIN pro p ON p.procod::text = a.reference_id
   WHERE a.part_group_id = (SELECT id FROM part_groups WHERE name = 'Grupo Sem Estoque')
   ORDER BY a.created_at DESC;
   ```

### Cenário 6: Estoque insuficiente em grupo SEM `stock_quantity` definido

1. Configure estoques baixos nas peças do grupo:
   ```sql
   UPDATE pro SET proqtde = 2 WHERE part_group_id = (SELECT id FROM part_groups WHERE name = 'Grupo Sem Estoque');
   ```

2. No sistema, adicione uma peça do grupo ao carrinho com quantidade 10

3. Tente finalizar o pedido

4. **Resultado esperado**:
   - Erro exibido: "Estoque insuficiente no grupo 'Grupo Sem Estoque'. Disponível (soma das peças): 6, Solicitado: 10"
   - Nenhum pedido foi criado
   - Nenhuma alteração no estoque

### Cenário 7: Verificar que o histórico mostra a peça correta

1. Após realizar vendas nos cenários anteriores, verifique o histórico de auditoria:
   ```sql
   SELECT 
     a.id,
     a.change,
     a.reason,
     a.reference_id,
     a.created_at,
     p.prodes as part_name
   FROM part_group_audit a
   LEFT JOIN pro p ON p.procod::text = a.reference_id
   ORDER BY a.created_at DESC
   LIMIT 20;
   ```

2. **Resultado esperado**:
   - O campo `reference_id` contém o código do produto (ex: "1", "2", "3")
   - O JOIN com a tabela `pro` retorna corretamente o nome da peça (`part_name`)
   - O frontend pode exibir qual peça específica foi afetada

## Arquivos Modificados

- `src/models/partGroupModels.js` - Função `venderItens()` atualizada para:
  - Usar `reference_id` = código do produto (procod) em vez do código do pedido
  - Distribuir retirada entre peças quando grupo não tem `stock_quantity` definido
- `src/config/atualizardb.js` - Triggers atualizadas para usar `reference_id` = procod
- `src/controllers/pedidosController.js` - Middleware `validarEDecrementarEstoque`
- `src/routes/pedidosRoutes.js` - Rota `/pedidos/enviar` com middleware
- `docs/sync-group-stock.md` - Documentação atualizada

## Tratamento de Erros

| Erro | Mensagem para o usuário |
|------|------------------------|
| Peça não encontrada | "Peça com ID X não encontrada" |
| Estoque individual insuficiente | "Estoque insuficiente para a peça 'Nome'. Disponível: X, Solicitado: Y" |
| Estoque do grupo insuficiente (com stock_quantity) | "Estoque do grupo 'Nome' insuficiente. Disponível: X, Solicitado: Y" |
| Estoque do grupo insuficiente (sem stock_quantity) | "Estoque insuficiente no grupo 'Nome'. Disponível (soma das peças): X, Solicitado: Y" |

## Auditoria

Todas as vendas de peças com grupo são registradas na tabela `part_group_audit`.

O campo `reference_id` agora contém o código do produto (procod) em vez do código do pedido, permitindo que o frontend exiba corretamente qual peça foi afetada:

```sql
-- Consulta de histórico com nome da peça
SELECT 
  a.id,
  a.change,
  a.reason,
  a.reference_id,
  a.created_at,
  p.prodes as part_name
FROM part_group_audit a
LEFT JOIN pro p ON p.procod::text = a.reference_id
WHERE a.part_group_id = [ID_DO_GRUPO]
ORDER BY a.created_at DESC
LIMIT 50;
```

## Considerações Técnicas

- A função `venderItens()` usa `SELECT ... FOR UPDATE` para evitar race conditions
- Múltiplos itens do mesmo grupo são acumulados e processados uma única vez
- A transação é isolada: em caso de qualquer erro, todas as alterações são revertidas
- O frontend só envia WhatsApp após receber resposta OK do servidor
- Para grupos sem `stock_quantity`, a distribuição de retirada segue a ordem: estoque DESC, procod ASC
- Nenhum estoque de peça individual fica negativo durante a distribuição
