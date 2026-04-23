# Fix de Agrupamento de Peças - Sincronização de Estoque

## Problema

Anteriormente, quando uma peça era adicionada a um grupo de compatibilidade, o estoque não era sincronizado automaticamente:

1. **Peças com cor**: Quando uma peça com cor era adicionada a um grupo, o estoque do grupo não refletia o estoque da cor (`procorqtde`)
2. **Grupos com estoque definido**: Quando uma peça era adicionada a um grupo que já tinha estoque definido, a peça não refletia o estoque do grupo até ser ajustado manualmente

## Solução Implementada

A função `addPartToGroup` em `src/models/partGroupModels.js` foi modificada para realizar sincronização automática de estoque em 3 cenários:

### Cenário 1: Adicionando Peça com Cor a Grupo Vazio
**Antes:**
- Grupo tinha `stock_quantity = 0`
- Cor tinha `procorqtde = 20`
- Resultado: Nenhuma sincronização ocorria

**Depois:**
- Grupo tem `stock_quantity = 0`
- Cor tem `procorqtde = 20`
- Sistema automaticamente:
  1. Atualiza `stock_quantity` do grupo para 20
  2. Atualiza `proqtde` da peça para 20
  3. Mantém `procorqtde` em 20
  4. Cria registro de auditoria com motivo `'colored_part_added'`

### Cenário 2: Adicionando Peça a Grupo com Estoque Definido
**Antes:**
- Grupo tinha `stock_quantity = 15`
- Peça tinha `proqtde = 0`
- Resultado: Peça ficava com estoque 0 até ajuste manual

**Depois:**
- Grupo tem `stock_quantity = 15`
- Peça tem `proqtde = 0`
- Sistema automaticamente:
  1. Atualiza `proqtde` da peça para 15
  2. Se houver cor definida, atualiza `procorqtde` para 15

### Cenário 3: Adicionando Peça com Cor a Grupo com Estoque
**Antes:**
- Grupo tinha `stock_quantity = 15`
- Cor tinha `procorqtde = 20`
- Resultado: Dessincronia entre estoque do grupo e da cor

**Depois:**
- Grupo tem `stock_quantity = 15` (prevalece)
- Cor tinha `procorqtde = 20`
- Sistema automaticamente:
  1. Mantém `stock_quantity` do grupo em 15 (não sobrescreve)
  2. Atualiza `proqtde` da peça para 15
  3. Atualiza `procorqtde` para 15 (sincroniza com grupo)

## Detalhes Técnicos

### Mudanças no Código
- Arquivo modificado: `src/models/partGroupModels.js`
- Função: `addPartToGroup(partId, groupId, colorId = null)`
- Tipo de mudança: Lógica de negócio aprimorada com transação atômica

### Fluxo de Execução
```javascript
BEGIN TRANSACTION
  1. Associar peça ao grupo (UPDATE pro.part_group_id)
  2. Buscar informações do grupo (stock_quantity)
  3. SE colorId fornecido:
     a. Buscar procorqtde da cor
     b. SE grupo sem estoque E cor com estoque:
        - Atualizar stock_quantity do grupo
        - Criar registro de auditoria
  4. SE grupo tem estoque (incluindo atualizado acima):
     a. Sincronizar proqtde da peça
     b. SE colorId fornecido: sincronizar procorqtde
COMMIT TRANSACTION
```

### Auditoria
Um novo tipo de registro de auditoria foi adicionado:
- **Motivo**: `'colored_part_added'`
- **Quando**: Ao adicionar peça com cor que atualiza o estoque do grupo
- **Change**: Quantidade adicionada (valor de procorqtde)
- **Reference ID**: ID da peça adicionada

## Testes

Dois novos testes foram adicionados em `tests/partGroups.test.js`:

1. **Teste 12**: "Adicionar peça a grupo com estoque definido sincroniza estoque da peça"
   - Verifica sincronização automática quando peça é adicionada a grupo com estoque

2. **Teste 13**: "Adicionar peça com cor a grupo vazio atualiza estoque do grupo com procorqtde"
   - Verifica que procorqtde é usado para inicializar estoque do grupo
   - Verifica criação de registro de auditoria

## Compatibilidade

### Mudanças Compatíveis
- ✅ Compatível com API existente (mesma assinatura de função)
- ✅ Compatível com banco de dados (usa estrutura existente)
- ✅ Transação atômica garante consistência

### Sem Impacto Negativo
- ✅ Não quebra funcionalidades existentes
- ✅ Apenas adiciona sincronização automática que antes era manual
- ✅ Mantém comportamento de auditoria existente

## Benefícios

1. **Reduz erros humanos**: Sincronização automática elimina necessidade de ajuste manual
2. **Melhora experiência do usuário**: Estoque reflete imediatamente após adicionar peça
3. **Consistência de dados**: Garante que peças no mesmo grupo sempre têm estoque sincronizado
4. **Rastreabilidade**: Auditoria completa de mudanças de estoque via procorqtde

## Próximos Passos

1. Testar em ambiente de desenvolvimento/staging
2. Verificar impacto em performance com grupos grandes
3. Considerar adicionar configuração para desabilitar sincronização automática se necessário
