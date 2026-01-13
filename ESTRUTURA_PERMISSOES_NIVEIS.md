# Estrutura de Permissões por Nível

## 📊 Visão Geral dos Níveis

O sistema utiliza 5 níveis hierárquicos numéricos, onde **menor número = maior autoridade**:
- **Nível 1**: Máximo de permissões (acesso total)
- **Nível 2**: Alto nível de permissões
- **Nível 3**: Permissões intermediárias
- **Nível 4**: Permissões básicas
- **Nível 5**: Permissões mínimas

---

## 🎯 Nível 1 - Acesso Total

### Menus Disponíveis:
✅ **Todos os menus** (usa `directorTiMenuItems` - menu completo)

1. **Início** (`/dashboard`) - Sem permissão necessária
2. **Clientes** (`/clients`) - Sem permissão necessária
3. **Agenda** (`/calendar`) - Sem permissão necessária
4. **Tarefas** (`/tasks`) - Sem permissão necessária
5. **Solicitações** (`/expense-requests`) - Sem permissão necessária
6. **Relatórios** (`/reports`) - ✅ `view_financial_reports` (Nível 1-3)
7. **Colaboradores** (`/collaborators`) - ✅ `manage_department` (Nível 1-3)
8. **Configurações** (`/settings`) - ✅ `settings_access` (Apenas Nível 1)
9. **Suporte** (`/support`) - ✅ `suporte_web` (Todos)

### Permissões Específicas:
- ✅ `manage_department` - Pode gerenciar departamentos
- ✅ `manage_all_users` - Pode gerenciar todos os usuários
- ✅ `approve_expenses` - Pode aprovar despesas
- ✅ `view_financial_reports` - Pode ver relatórios financeiros
- ✅ `view_all_tasks` - Pode ver todas as tarefas
- ✅ `chatbot_access` - Tem acesso ao chatbot
- ✅ `settings_access` - Tem acesso às configurações (ÚNICO)
- ✅ `suporte_web` - Tem acesso ao suporte
- ✅ `technical_checklist_access` - Tem acesso ao checklist técnico

---

## 🎯 Nível 2 - Alto Nível

### Menus Disponíveis:
✅ **Menu padrão** (`defaultMenuItems`) filtrado por permissões

1. **Início** (`/dashboard`) - Sem permissão necessária
2. **Clientes** (`/clients`) - Sem permissão necessária
3. **Agenda** (`/calendar`) - Sem permissão necessária
4. **Tarefas** (`/tasks`) - Sem permissão necessária
5. **Solicitações** (`/expense-requests`) - Sem permissão necessária
6. **Relatórios** (`/reports`) - ✅ `view_financial_reports` (Nível 1-3)
7. **Colaboradores** (`/collaborators`) - ✅ `manage_department` (Nível 1-3)
8. **Suporte** (`/support`) - ✅ `suporte_web` (Todos)

### Permissões Específicas:
- ✅ `manage_department` - Pode gerenciar departamentos
- ✅ `manage_all_users` - Pode gerenciar todos os usuários
- ✅ `approve_expenses` - Pode aprovar despesas
- ✅ `view_financial_reports` - Pode ver relatórios financeiros
- ✅ `view_all_tasks` - Pode ver todas as tarefas
- ✅ `chatbot_access` - Tem acesso ao chatbot
- ❌ `settings_access` - **NÃO tem acesso** (apenas Nível 1)
- ✅ `suporte_web` - Tem acesso ao suporte
- ✅ `technical_checklist_access` - Tem acesso ao checklist técnico

---

## 🎯 Nível 3 - Permissões Intermediárias

### Menus Disponíveis:
✅ **Menu padrão** (`defaultMenuItems`) filtrado por permissões

1. **Início** (`/dashboard`) - Sem permissão necessária
2. **Clientes** (`/clients`) - Sem permissão necessária
3. **Agenda** (`/calendar`) - Sem permissão necessária
4. **Tarefas** (`/tasks`) - Sem permissão necessária
5. **Solicitações** (`/expense-requests`) - Sem permissão necessária
6. **Relatórios** (`/reports`) - ✅ `view_financial_reports` (Nível 1-3)
7. **Colaboradores** (`/collaborators`) - ✅ `manage_department` (Nível 1-3)
8. **Suporte** (`/support`) - ✅ `suporte_web` (Todos)

### Permissões Específicas:
- ✅ `manage_department` - Pode gerenciar departamentos
- ✅ `manage_all_users` - Pode gerenciar todos os usuários
- ✅ `view_financial_reports` - Pode ver relatórios financeiros
- ✅ `view_all_tasks` - Pode ver todas as tarefas
- ❌ `approve_expenses` - **NÃO pode aprovar** (apenas Nível 1-2)
- ❌ `chatbot_access` - **NÃO tem acesso** (apenas Nível 1-2)
- ❌ `settings_access` - **NÃO tem acesso** (apenas Nível 1)
- ✅ `suporte_web` - Tem acesso ao suporte
- ✅ `technical_checklist_access` - Tem acesso ao checklist técnico

---

## 🎯 Nível 4 - Permissões Básicas

### Menus Disponíveis:
✅ **Menu padrão** (`defaultMenuItems`) filtrado por permissões

1. **Início** (`/dashboard`) - Sem permissão necessária
2. **Clientes** (`/clients`) - Sem permissão necessária
3. **Agenda** (`/calendar`) - Sem permissão necessária
4. **Tarefas** (`/tasks`) - Sem permissão necessária
5. **Solicitações** (`/expense-requests`) - Sem permissão necessária
6. **Suporte** (`/support`) - ✅ `suporte_web` (Todos)

### Menus NÃO Disponíveis:
- ❌ **Relatórios** - Requer `view_financial_reports` (Nível 1-3)
- ❌ **Colaboradores** - Requer `manage_department` (Nível 1-3)
- ❌ **Configurações** - Requer `settings_access` (Apenas Nível 1)

### Permissões Específicas:
- ❌ `manage_department` - **NÃO pode gerenciar** (apenas Nível 1-3)
- ❌ `manage_all_users` - **NÃO pode gerenciar** (apenas Nível 1-3)
- ❌ `approve_expenses` - **NÃO pode aprovar** (apenas Nível 1-2)
- ❌ `view_financial_reports` - **NÃO pode ver** (apenas Nível 1-3)
- ❌ `view_all_tasks` - **NÃO pode ver todas** (apenas Nível 1-3)
- ❌ `chatbot_access` - **NÃO tem acesso** (apenas Nível 1-2)
- ❌ `settings_access` - **NÃO tem acesso** (apenas Nível 1)
- ✅ `suporte_web` - Tem acesso ao suporte
- ✅ `technical_checklist_access` - Tem acesso ao checklist técnico
- ✅ `view_own_data` - Pode ver seus próprios dados
- ✅ `create_expense_requests` - Pode criar solicitações de despesas

---

## 🎯 Nível 5 - Permissões Mínimas

### Menus Disponíveis:
✅ **Menu padrão** (`defaultMenuItems`) filtrado por permissões

1. **Início** (`/dashboard`) - Sem permissão necessária
2. **Clientes** (`/clients`) - Sem permissão necessária
3. **Agenda** (`/calendar`) - Sem permissão necessária
4. **Tarefas** (`/tasks`) - Sem permissão necessária
5. **Solicitações** (`/expense-requests`) - Sem permissão necessária
6. **Suporte** (`/support`) - ✅ `suporte_web` (Todos)

### Menus NÃO Disponíveis:
- ❌ **Relatórios** - Requer `view_financial_reports` (Nível 1-3)
- ❌ **Colaboradores** - Requer `manage_department` (Nível 1-3)
- ❌ **Configurações** - Requer `settings_access` (Apenas Nível 1)

### Permissões Específicas:
- ❌ `manage_department` - **NÃO pode gerenciar** (apenas Nível 1-3)
- ❌ `manage_all_users` - **NÃO pode gerenciar** (apenas Nível 1-3)
- ❌ `approve_expenses` - **NÃO pode aprovar** (apenas Nível 1-2)
- ❌ `view_financial_reports` - **NÃO pode ver** (apenas Nível 1-3)
- ❌ `view_all_tasks` - **NÃO pode ver todas** (apenas Nível 1-3)
- ❌ `chatbot_access` - **NÃO tem acesso** (apenas Nível 1-2)
- ❌ `settings_access` - **NÃO tem acesso** (apenas Nível 1)
- ❌ `technical_checklist_access` - **NÃO tem acesso** (apenas Nível 1-4)
- ✅ `suporte_web` - Tem acesso ao suporte
- ✅ `view_own_data` - Pode ver seus próprios dados
- ✅ `create_expense_requests` - Pode criar solicitações de despesas

---

## 📋 Resumo Comparativo

| Menu/Funcionalidade | Nível 1 | Nível 2 | Nível 3 | Nível 4 | Nível 5 |
|---------------------|---------|---------|---------|---------|---------|
| **Início** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Clientes** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Agenda** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tarefas** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Solicitações** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Relatórios** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Colaboradores** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Configurações** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Suporte** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver Todas as Tarefas** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Aprovar Despesas** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Chatbot** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Checklist Técnico** | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 🔧 Notas Técnicas

### Lógica de Seleção de Menu:
- **Nível 1**: Usa `directorTiMenuItems` (menu completo com todos os módulos)
- **Outros níveis**: Usam `defaultMenuItems` (menu padrão)

### Lógica de Filtro de Permissões:
- **Nível 1**: Não filtra nada (vê todos os menus)
- **Outros níveis**: Filtram baseado em `hasPermission(userRole, permission)`

### Permissões Especiais:
- `suporte_web`: Todos os níveis têm acesso
- `view_own_data`: Todos os níveis têm acesso
- `create_expense_requests`: Todos os níveis têm acesso
- `settings_access`: Apenas Nível 1
