# Sistema de Notificações de Tarefas

## Visão Geral

O sistema de notificações de tarefas foi implementado usando Firebase Functions com CRON jobs para envio automático de emails baseado na prioridade das tarefas. Inclui notificações de **lembretes de vencimento** e **criação de novas tarefas**. Utiliza a extensão **Email Trigger** do Firebase para processamento de emails.

## Arquitetura

### Componentes Principais

1. **Firebase Functions** - Processamento backend das notificações
2. **Firestore** - Armazenamento de dados e logs
3. **Email Trigger Extension** - Envio de emails via coleção `mail`
4. **Cloud Scheduler** - Execução automática dos CRONs
5. **Firestore Triggers** - Escuta criação de novas tarefas

### Estrutura de Arquivos

```
functions/
├── src/
│   ├── types.ts                      # Tipos TypeScript
│   ├── notificationService.ts        # Geração de emails de lembrete
│   ├── newTaskNotificationService.ts # Geração de emails de nova tarefa
│   ├── taskNotificationService.ts    # Lógica de negócio
│   └── index.ts                      # Functions e CRONs
└── package.json
```

## Funcionalidades

### 1. Notificações de Lembrete (CRONs)

#### CRON Principal (taskNotificationCron)
- **Execução**: A cada 2 horas das 8h às 18h em dias úteis
- **Schedule**: `"0 8-18/2 * * 1-5"` 
- **Horários**: 8h, 10h, 12h, 14h, 16h, 18h

#### CRON Urgente (urgentTaskNotificationCron)
- **Execução**: A cada hora das 7h às 19h, segunda a sábado
- **Schedule**: `"0 7-19 * * 1-6"`
- **Horários**: 7h, 8h, 9h, 10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h, 18h, 19h

### 2. Notificação de Nova Tarefa (Trigger)

#### Nova Funcionalidade: onTaskCreated
- **Trigger**: `onDocumentCreated("tasks/{taskId}")`
- **Execução**: Imediata quando uma nova tarefa é criada
- **Função**: Envia email automático para o responsável
- **Características**:
  - ✅ Notificação instantânea
  - ✅ Template específico para nova tarefa
  - ✅ Descrição completa da tarefa
  - ✅ Informações do criador
  - ✅ Link direto para a tarefa
  - ✅ Próximos passos orientativos

### 3. Limpeza de Logs (cleanupNotificationLogs)
- **Execução**: Domingos às 2h da manhã
- **Schedule**: `"0 2 * * 0"`
- **Função**: Remove logs de notificação com mais de 30 dias

### 4. Relatório Diário (dailyNotificationReport)
- **Execução**: Todos os dias às 19h
- **Schedule**: `"0 19 * * *"`
- **Função**: Gera estatísticas diárias de notificações

## Lógica de Notificações

### Regras por Prioridade (Lembretes)

| Prioridade | Notificações                          |
|------------|---------------------------------------|
| **Urgente**| 7, 3, 1 dias antes + dia do vencimento |
| **Alta**   | 5, 1 dias antes + dia do vencimento    |
| **Média**  | 3, 1 dias antes + dia do vencimento    |
| **Baixa**  | 1 dia antes + dia do vencimento        |

### Notificação de Nova Tarefa
- **Trigger**: Criação de documento na coleção `tasks`
- **Destinatário**: Responsável pela tarefa (`assignedTo`)
- **Timing**: Imediato (alguns segundos após criação)
- **Conteúdo**: Informações completas da tarefa + orientações

### Prevenção de Spam
- **Lembretes**: Sistema de logs impede notificações duplicadas no mesmo dia
- **Nova Tarefa**: Um email por tarefa criada (log em `new_task_notification_logs`)
- **Identificador único**: `{taskId}_{daysUntilDue}_{date}` (lembretes) / `{taskId}` (nova tarefa)

## Estrutura de Dados

### Coleções Firestore

#### 1. `tasks` (existente)
```typescript
{
  id: string;
  title: string;
  description: string;
  status: "Pendente" | "Em andamento" | "Concluída" | "Bloqueada";
  priority: "Baixa" | "Média" | "Alta" | "Urgente";
  assignedTo: string;
  assignedToName: string;
  dueDate: Timestamp;
  createdBy?: string;
  createdByName?: string;
  // ... outros campos
}
```

#### 2. `mail` (Email Trigger Extension)
```typescript
{
  to: string;
  message: {
    subject: string;
    html: string;
  }
}
```

#### 3. `notification_logs` (lembretes)
```typescript
{
  taskId: string;
  daysUntilDue: number;
  sentAt: Timestamp;
  date: string; // YYYY-MM-DD
}
```

#### 4. `new_task_notification_logs` (nova tarefa)
```typescript
{
  taskId: string;
  sentAt: Timestamp;
  date: string; // YYYY-MM-DD
}
```

#### 5. `notification_reports` (relatórios)
```typescript
{
  date: string;
  stats: {
    total: number;
    byPriority: { urgente: number, alta: number, media: number, baixa: number };
    overdue: number;
  };
  generatedAt: Timestamp;
}
```

## Templates de Email

### 1. Lembrete de Vencimento

#### Características
- **Design responsivo** com tema da empresa
- **Cores baseadas na prioridade** (vermelho para urgente, laranja para alta, etc.)
- **Informações da tarefa** e prazo
- **Botão de acesso direto** ao sistema

#### Assuntos por Situação
- `🚨 URGENTE TAREFA VENCIDA: [Título]`
- `⚠️ ALTA TAREFA VENCE HOJE: [Título]`
- `📋 MÉDIA TAREFA VENCE AMANHÃ: [Título]`
- `📌 BAIXA Lembrete de Tarefa: [Título]`

### 2. Nova Tarefa Atribuída

#### Características
- **Header diferenciado** com foco em "Nova Tarefa"
- **Descrição completa** da tarefa
- **Informações do criador** da tarefa
- **Próximos passos** orientativos
- **Link direto** para a tarefa específica
- **Caixa de boas-vindas** com orientações

#### Assuntos por Prioridade
- `🚨 URGENTE NOVA TAREFA ATRIBUÍDA: [Título]`
- `⚠️ ALTA NOVA TAREFA ATRIBUÍDA: [Título]`
- `📋 MÉDIA NOVA TAREFA ATRIBUÍDA: [Título]`
- `📌 BAIXA NOVA TAREFA ATRIBUÍDA: [Título]`

## Funções de Teste e Monitoramento

### 1. Teste Manual (testTaskNotifications)
```bash
curl -X POST \
  https://us-central1-cerrado-engenharia.cloudfunctions.net/testTaskNotifications \
  -H "Authorization: Bearer test-token-cerrado" \
  -H "Content-Type: application/json"
```

### 2. Estatísticas (getNotificationStats)
```bash
curl https://us-central1-cerrado-engenharia.cloudfunctions.net/getNotificationStats
```

## URLs das Functions

- **testTaskNotifications**: https://us-central1-cerrado-engenharia.cloudfunctions.net/testTaskNotifications
- **getNotificationStats**: https://us-central1-cerrado-engenharia.cloudfunctions.net/getNotificationStats
- **onTaskCreated**: Trigger automático (sem URL pública)

## Como Testar

### 1. Verificar Functions Deployed
```bash
firebase functions:list
```

### 2. Testar Lembretes Manualmente
Usar a URL de teste com o token de autorização para processar notificações imediatamente.

### 3. Testar Nova Tarefa
Criar uma nova tarefa no sistema - o email deve ser enviado automaticamente.

### 4. Monitorar Logs
```bash
firebase functions:log --only taskNotificationCron
firebase functions:log --only onTaskCreated
```

### 5. Verificar Estatísticas
Acessar a URL de estatísticas para ver dados de notificações recentes.

## Configurações Necessárias

### 1. Email Trigger Extension
- Deve estar instalada e configurada no projeto Firebase
- Configura automaticamente a coleção `mail`

### 2. APIs Habilitadas
- Cloud Functions
- Cloud Scheduler
- Firestore
- Artifact Registry
- Eventarc (para triggers de Firestore)

### 3. Permissões IAM
- Cloud Functions Service Agent
- Cloud Scheduler Service Agent
- Pub/Sub Publisher
- Eventarc Service Agent

## Monitoramento e Logs

### Logs Importantes
- **Verificações de tarefas**: Quantas tarefas foram analisadas
- **Notificações enviadas**: Detalhes de cada email enviado
- **Novas tarefas**: Processamento de tarefas recém-criadas
- **Erros**: Problemas com envio ou processamento
- **Relatórios diários**: Estatísticas consolidadas

### Métricas de Performance
- Número de notificações por dia
- Taxa de sucesso de envio
- Tempo de processamento
- Distribuição por prioridade
- Notificações de nova tarefa vs lembretes

## Fluxo Completo de Notificações

### 🔄 Quando uma Tarefa é Criada
1. **Usuário cria tarefa** no sistema
2. **onTaskCreated** detecta criação automaticamente
3. **Busca dados** do responsável e criador
4. **Gera email** de nova tarefa com template específico
5. **Adiciona à coleção mail** para processamento
6. **Email enviado** imediatamente
7. **Log registrado** em `new_task_notification_logs`

### ⏰ Lembretes de Vencimento (CRONs)
1. **CRON executa** nos horários programados
2. **Busca tarefas** pendentes e em andamento
3. **Calcula dias** até vencimento
4. **Aplica regras** por prioridade
5. **Verifica logs** para evitar duplicatas
6. **Envia emails** de lembrete
7. **Registra envios** em `notification_logs`

## Próximos Passos

### Melhorias Futuras
1. **Dashboard de Monitoramento** - Interface para visualizar estatísticas
2. **Personalização de Horários** - Permitir configuração por usuário
3. **Múltiplos Canais** - SMS, Push Notifications
4. **Templates Customizáveis** - Interface para editar templates
5. **Integração com Agenda** - Notificações para eventos próximos
6. **Notificações de Atualização** - Emails quando status da tarefa muda
7. **Digest de Tarefas** - Resumo semanal por usuário

### Otimizações
1. **Batching de Emails** - Agrupar múltiplas notificações
2. **Cache de Usuários** - Reduzir consultas ao Firestore
3. **Retry Logic** - Reenvio automático em caso de falha
4. **Rate Limiting** - Controle de frequência de envios
5. **Compressão de Templates** - Otimizar tamanho dos emails

## Troubleshooting

### Problemas Comuns

1. **Functions não executam**
   - Verificar se Cloud Scheduler está habilitado
   - Confirmar timezone configurado corretamente
   - Verificar permissões Eventarc para triggers

2. **Emails não são enviados**
   - Verificar se Email Trigger Extension está ativa
   - Confirmar configuração SMTP
   - Verificar logs da extensão

3. **Nova tarefa não dispara email**
   - Verificar se onTaskCreated está ativa
   - Confirmar estrutura da coleção `tasks`
   - Verificar permissões Firestore

4. **Logs de erro**
   - Verificar permissões Firestore
   - Confirmar estrutura de dados das tarefas
   - Verificar dados dos usuários

5. **Performance lenta**
   - Aumentar memória alocada nas functions
   - Otimizar queries do Firestore
   - Verificar índices no Firestore

## Segurança

### Medidas Implementadas
1. **Token de autorização** para função de teste
2. **Validação de métodos HTTP** (POST apenas para teste)
3. **Rate limiting** automático do Firebase
4. **Logs de auditoria** completos
5. **Tratamento de erro** sem bloquear operações principais

### Recomendações Adicionais
1. Implementar autenticação Firebase para funções HTTP
2. Configurar regras de segurança específicas
3. Monitorar tentativas de acesso não autorizado
4. Configurar alertas para uso anômalo
5. Auditar logs de notificações regularmente

## Conclusão

O sistema de notificações de tarefas está operacional e configurado para:

✅ **Envio automático** baseado na prioridade das tarefas  
✅ **Notificação imediata** para novas tarefas criadas  
✅ **Prevenção de spam** com sistema de logs  
✅ **Templates bonitos** e responsivos  
✅ **Monitoramento completo** com estatísticas  
✅ **Escalabilidade** para crescimento futuro  
✅ **Integração perfeita** com o sistema existente  

O sistema agora oferece **cobertura completa** do ciclo de vida das tarefas:
- 📋 **Criação**: Notificação imediata
- ⏰ **Lembretes**: Baseados na prioridade  
- 📊 **Monitoramento**: Estatísticas e logs
- 🔧 **Manutenção**: Limpeza automática

**O sistema está pronto para uso em produção e pode ser facilmente estendido com novas funcionalidades conforme necessário!** 🚀 