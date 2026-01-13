# Sistema de Notificações de Vencimentos Financeiros

## Visão Geral
Sistema completo de notificações automáticas para vencimentos de contas a pagar e receber, com local centralizado para acompanhamento.

## Funcionalidades Implementadas

### 🔔 Notificações Automáticas
- **Antecedência Mínima**: TODAS as prioridades começam a notificar pelo menos 10 dias antes
- **Priorização por Valor**: Sistema automático baseado em valores monetários
- **Múltiplos Canais**: Email (implementado) + WhatsApp (preparado)
- **Anti-spam**: Sistema de logs para evitar notificações duplicadas

### 📊 Dashboard Centralizado
- **Cards de Visão Geral**: Estatísticas de vencimentos por status
- **Filtros Avançados**: Por tipo, status, prioridade e período
- **Lista Detalhada**: Vencimentos com alertas visuais e valores
- **Notificações Manuais**: Botões para envio individual

### ⚙️ Configurações Personalizáveis
- **Canais de Notificação**: Habilitar/desabilitar email e WhatsApp
- **Antecedência por Prioridade**: Configurar dias de antecedência
- **Relatórios Diários**: Resumos automáticos por email

## Regras de Priorização (Automática)

### 🔴 Urgente (≥ R$ 50.000)
- **Antecedência**: 30, 15, 10, 7, 5, 3, 1 dias antes + vencimento
- **Verificação**: A cada 2 horas (7h-21h, todos os dias)

### 🟠 Alta (R$ 10.000 - R$ 49.999)
- **Antecedência**: 20, 15, 10, 7, 3, 1 dias antes + vencimento
- **Verificação**: A cada 2 horas (8h-20h, seg-sáb)

### 🟡 Média (R$ 1.000 - R$ 9.999)
- **Antecedência**: 15, 10, 7, 5, 3, 1 dias antes + vencimento
- **Verificação**: A cada 2 horas (8h-20h, seg-sáb)

### 🔵 Baixa (< R$ 1.000)
- **Antecedência**: 10, 7, 5, 3, 1 dias antes + vencimento
- **Verificação**: A cada 2 horas (8h-20h, seg-sáb)

## Configuração de CRON Jobs

### 1. Notificações Gerais
```
schedule: "0 8-20/2 * * 1-6"
Executa: A cada 2 horas das 8h às 20h, segunda a sábado
```

### 2. Notificações Urgentes
```
schedule: "0 7-21/2 * * *"
Executa: A cada 2 horas das 7h às 21h, todos os dias
```

### 3. Relatório Diário
```
schedule: "0 8 * * *"
Executa: Todo dia às 8h da manhã
```

### 4. Limpeza de Logs
```
schedule: "0 3 * * 0"
Executa: Todo domingo às 3h da manhã
```

## Arquivos Implementados

### Frontend
- `src/components/financial/FinancialDueDatesManager.tsx`
- `src/types/financial.ts` (atualizado)
- `src/components/FinancialManagementExpanded.tsx` (integração)

### Backend
- `functions/src/financialNotificationService.ts`
- `functions/src/types.ts` (interfaces adicionadas)
- `functions/src/index.ts` (CRON jobs)

## Como Usar

### 1. Acesso ao Sistema
- Navegue até: **Dashboard > Gestão Financeira > Vencimentos e Notificações**
- O card mostra estatísticas rápidas dos vencimentos

### 2. Acompanhamento
- **Aba Visão Geral**: Dashboard com filtros e lista completa
- **Aba Notificações**: Histórico e envio manual
- **Aba Configurações**: Personalizar antecedência e canais

### 3. Notificações Automáticas
- Sistema verifica automaticamente a cada 2 horas
- Envia emails com design profissional
- Relatórios diários resumindo situação

## Benefícios
- ✅ **Antecedência Garantida**: Mínimo 10 dias para todas as prioridades
- ✅ **Visão Centralizada**: Todos os vencimentos em um só lugar
- ✅ **Priorização Inteligente**: Baseada em valores monetários
- ✅ **Configuração Flexível**: Adaptável às necessidades da empresa
- ✅ **Integração Completa**: Funciona com a arquitetura existente

## Controle de Status e Comprovantes

### 🔄 Mudança de Status
- **Marcar como Pago/Recebido**: Botão verde na lista de vencimentos
- **Marcar como Pendente**: Botão amarelo para reverter status
- **Atualização Automática**: Data e usuário registrados automaticamente

### 📎 Anexos e Comprovantes
- **Upload de Arquivos**: Arrastar e soltar ou clicar para anexar
- **Formatos Aceitos**: PDF, JPG, PNG, DOC, DOCX (até 10MB)
- **Visualização**: Abrir anexos em nova aba
- **Gerenciamento**: Remover anexos desnecessários

### 📝 Observações
- **Campo Dedicado**: Textarea para observações detalhadas
- **Exibição na Lista**: Prévia das observações na lista principal
- **Histórico**: Registro de alterações com data e usuário

### 🎯 Modal de Edição Completo
- **Informações Básicas**: Status, método de pagamento, data e valor
- **Observações**: Campo para notas e comentários
- **Comprovantes**: Upload e gerenciamento de anexos
- **Validação**: Campos obrigatórios e validação de dados

## Interface Melhorada

### 📋 Lista de Vencimentos
- **Indicadores Visuais**: Ícones para anexos e observações
- **Botões de Ação**: Pagar, Pendente, Editar
- **Informações Completas**: Data de pagamento, método, observações
- **Filtros Visuais**: Cores por status e prioridade

### 🎨 Indicadores Visuais
- 📎 **Anexos**: Ícone de clipe com quantidade
- 📄 **Observações**: Ícone de documento
- ✅ **Pagamentos**: Status verde com data
- ⚠️ **Alertas**: Cores por urgência

## Funcionalidades Técnicas

### 🔐 Segurança
- **Controle de Acesso**: Apenas usuários autorizados podem editar
- **Auditoria**: Registro de todas as alterações
- **Validação**: Verificação de dados antes de salvar

### 💾 Persistência
- **Auto-save**: Salvamento automático das alterações
- **Backup**: Histórico de versões dos dados
- **Sincronização**: Atualizações em tempo real

## Próximos Passos
1. Integrar com dados reais do sistema financeiro
2. Implementar notificações WhatsApp
3. Adicionar gráficos de tendências
4. Criar alertas para usuários específicos
5. **Implementar auditoria completa** de alterações
6. **Adicionar relatórios** de comprovantes
7. **Integrar com storage** para arquivos permanentes 