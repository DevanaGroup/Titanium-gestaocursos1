# 🔥 Coleções do Firestore - Cerrado Web Genesis

## 📋 Coleções Principais

### ✅ Checklist System (Novo)
1. **`presets`** - Presets de checklist reutilizáveis
   - Estrutura: `{ id, nome, descricao, areas[], createdAt, updatedAt }`

2. **`projetos`** - Projetos de checklist
   - Estrutura: `{ id, nome, status, progresso, dataInicio, cliente{}, modules[], criadoEm, atualizadoEm }`

3. **`relatorios`** - Relatórios gerados dos projetos
   - Estrutura: `{ id, projectId, clientId, itens[], statistics{}, createdAt, updatedAt }`

---

### 👥 Usuários e Colaboradores
4. **`collaborators_unified`** ⭐ **PRINCIPAL** - Coleção unificada de colaboradores/usuários
   - Estrutura: dados completos de usuários (nome, email, role, hierarchyLevel, etc.)

5. **`collaborators`** - Coleção antiga (mantida para compatibilidade)
6. **`users`** - Coleção antiga (mantida para compatibilidade)
7. **`collaboratorsBankInfo`** - Informações bancárias dos colaboradores
8. **`notifications`** - Notificações por usuário (subcoleção: `notifications/{userId}`)

---

### 📁 Clientes e Documentos
9. **`clients`** - Clientes do sistema
   - **Subcoleções:**
     - `clients/{clientId}/folders` - Pastas de documentos
     - `clients/{clientId}/documents` - Documentos dos clientes

10. **`Categorias`** - Categorias de documentos (primeira letra maiúscula)
11. **`SubCategorias`** - Subcategorias de documentos
12. **`documents`** - Documentos gerais

---

### 💼 Financeiro
13. **`financeiro`** - Raiz do módulo financeiro
14. **`financeiro_chartOfAccounts`** - Plano de contas
15. **`financeiro_costCenters`** - Centros de custo
16. **`financeiro_accountsPayable`** - Contas a pagar
17. **`financeiro_accountsReceivable`** - Contas a receber
18. **`financeiro_suppliers`** - Fornecedores
19. **`financialClients`** - Clientes financeiros
20. **`financeiro_financialClients`** - Alternativa para clientes financeiros
21. **`financial_clients`** - Outra alternativa
22. **`monthlyBalances`** - Balanços mensais
23. **`payrollConfigurations`** - Configurações de folha de pagamento
24. **`payrollRecords`** - Registros de folha de pagamento

---

### ✅ Tarefas e Processos
25. **`tasks`** - Tarefas do sistema
26. **`task-processes`** - Processos de tarefas
27. **`process-steps`** - Etapas dos processos
28. **`process-notifications`** - Notificações de processos
29. **`timeTracking`** - Rastreamento de tempo de trabalho

---

### 📊 Produtividade e Métricas
30. **`productivityMetrics`** - Métricas de produtividade
31. **`productivityGoals`** - Metas de produtividade
32. **`productivityAlerts`** - Alertas de produtividade
33. **`productivityReports`** - Relatórios de produtividade

---

### 🎯 Comercial
34. **`prospects`** - Prospects/leads comerciais
35. **`prospectClients`** - Clientes convertidos de prospects
36. **`prospect_activities`** - Atividades relacionadas a prospects
37. **`commercial_targets`** - Metas comerciais

---

### 🎫 Suporte
38. **`supportTickets`** - Tickets de suporte
39. **`supportTicketUpdates`** - Atualizações de tickets de suporte

---

### 📝 Documentação e Configurações
40. **`termoReferenciaFolders`** - Pastas de termos de referência
41. **`termoReferenciaDocuments`** - Documentos de termos de referência
42. **`settings`** - Configurações gerais do sistema
   - Subdocumentos: `settings/zapi` - Configurações ZAPI/WhatsApp

---

### 📨 Comunicação
43. **`whatsapp_logs`** - Logs de mensagens WhatsApp
44. **`messages-history`** - Histórico de mensagens

---

### 📋 Auditoria e Logs
45. **`auditLogs`** - Logs de auditoria de todas as ações do sistema

---

### 💰 Solicitações de Despesas
46. **`expenseRequests`** - Solicitações de despesas (nome da constante)

---

## 📊 Estatísticas

- **Total de Coleções Principais:** 46
- **Total de Subcoleções:** 2 (folders, documents dentro de clients)
- **Total de Subdocumentos:** 1 (notifications, settings/zapi)

## 🔍 Observações Importantes

1. **Coleções Unificadas:**
   - `collaborators_unified` é a coleção principal para usuários
   - `collaborators` e `users` são mantidas apenas para compatibilidade

2. **Nomenclatura:**
   - Algumas coleções usam primeira letra maiúscula (`Categorias`, `SubCategorias`)
   - A maioria usa camelCase ou snake_case

3. **Estruturas Aninhadas:**
   - `clients/{clientId}/folders` - Pastas por cliente
   - `clients/{clientId}/documents` - Documentos por cliente
   - `notifications/{userId}` - Notificações por usuário

4. **Múltiplas Referências:**
   - `financialClients`, `financeiro_financialClients`, `financial_clients` - Todas para clientes financeiros (verificar se são usadas de forma consistente)

---

## ✅ Checklist System (Novo Sistema)

As coleções do novo sistema de checklist são:
- **`presets`** ✅
- **`projetos`** ✅  
- **`relatorios`** ✅

Estas são as coleções principais para o novo módulo de checklist implementado.

