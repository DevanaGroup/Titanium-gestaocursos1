# Ordem dos Menus por Nível de Usuário

## 📋 Estrutura Geral

A ordem dos menus foi organizada de forma lógica, priorizando as funcionalidades mais utilizadas e agrupando por tipo de operação.

---

## 🎯 Nível 1 - Acesso Total

**Ordem dos Menus:**
1. **Início** - Dashboard principal com visão geral do sistema
2. **Colaboradores** - Gerenciamento de equipe e usuários
3. **Clientes** - Gerenciamento de clientes
4. **Agenda** - Agendamentos e compromissos
5. **Tarefas** - Kanban de tarefas (com submenu: Tarefas / Arquivados)
6. **Solicitações** - Solicitações de despesas
7. **Configurações** - Configurações do sistema (exclusivo Nível 1)
8. **Suporte** - Sistema de suporte técnico

**Justificativa:**
- **Início** primeiro: ponto de entrada principal
- **Colaboradores** em segundo: gestão de pessoas é prioridade para administradores
- **Clientes** em terceiro: gestão de relacionamento com clientes
- **Agenda e Tarefas**: operacionais do dia a dia
- **Solicitações**: funcionalidade administrativa
- **Configurações**: apenas para Nível 1, no final por ser menos acessada
- **Suporte**: sempre no final, separado por linha divisória

---

## 🎯 Nível 2 e 3 - Alto e Médio Nível

**Ordem dos Menus:**
1. **Início** - Dashboard principal
2. **Clientes** - Gerenciamento de clientes
3. **Agenda** - Agendamentos e compromissos
4. **Tarefas** - Kanban de tarefas (com submenu: Tarefas / Arquivados)
5. **Solicitações** - Solicitações de despesas
6. **Colaboradores** - Gerenciamento de equipe (se tiver permissão)
7. **Suporte** - Sistema de suporte técnico

**Justificativa:**
- **Início** primeiro: ponto de entrada
- **Clientes** em segundo: foco em operações com clientes
- **Agenda e Tarefas**: operacionais do dia a dia
- **Solicitações**: funcionalidade administrativa
- **Colaboradores**: aparece apenas se tiver permissão (`manage_department` - Nível 1-3)
- **Suporte**: sempre no final, separado por linha divisória
- **Configurações**: não aparece (apenas Nível 1)

---

## 🎯 Nível 4 e 5 - Básico e Mínimo

**Ordem dos Menus:**
1. **Início** - Dashboard principal
2. **Clientes** - Gerenciamento de clientes
3. **Agenda** - Agendamentos e compromissos
4. **Tarefas** - Kanban de tarefas (com submenu: Tarefas / Arquivados)
5. **Solicitações** - Solicitações de despesas
6. **Suporte** - Sistema de suporte técnico

**Justificativa:**
- **Início** primeiro: ponto de entrada
- **Clientes**: foco em operações com clientes
- **Agenda e Tarefas**: operacionais do dia a dia
- **Solicitações**: funcionalidade administrativa básica
- **Suporte**: sempre no final, separado por linha divisória
- **Colaboradores**: não aparece (sem permissão)
- **Configurações**: não aparece (apenas Nível 1)

---

## 📊 Tabela Comparativa

| Menu | Nível 1 | Nível 2 | Nível 3 | Nível 4 | Nível 5 |
|------|---------|---------|---------|---------|---------|
| **1. Início** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **2. Colaboradores** | ✅ (2º) | ✅ (6º) | ✅ (6º) | ❌ | ❌ |
| **3. Clientes** | ✅ (3º) | ✅ (2º) | ✅ (2º) | ✅ (2º) | ✅ (2º) |
| **4. Agenda** | ✅ (4º) | ✅ (3º) | ✅ (3º) | ✅ (3º) | ✅ (3º) |
| **5. Tarefas** | ✅ (5º) | ✅ (4º) | ✅ (4º) | ✅ (4º) | ✅ (4º) |
| **6. Solicitações** | ✅ (6º) | ✅ (5º) | ✅ (5º) | ✅ (5º) | ✅ (5º) |
| **7. Configurações** | ✅ (7º) | ❌ | ❌ | ❌ | ❌ |
| **8. Suporte** | ✅ (8º) | ✅ (7º) | ✅ (7º) | ✅ (6º) | ✅ (6º) |

---

## 🎨 Elementos Visuais

### Separador
- Uma linha divisória (`border-t`) aparece antes do menu **Suporte** em todos os níveis
- Isso ajuda a separar visualmente o suporte das outras funcionalidades

### Submenu de Tarefas
- O menu **Tarefas** possui um submenu expansível com:
  - **Tarefas** (ativas)
  - **Arquivados** (apenas para Níveis 1-4, não aparece para Cliente Externo/Cliente)

---

## 🔧 Lógica de Implementação

### Filtragem por Permissões
- Os menus são filtrados automaticamente baseado nas permissões do usuário
- Nível 1 vê todos os menus sem filtro
- Outros níveis são filtrados pela função `hasPermission()`

### Ordem de Prioridade
1. **Funcionalidades Operacionais** (Início, Clientes, Agenda, Tarefas)
2. **Funcionalidades Administrativas** (Solicitações, Colaboradores)
3. **Funcionalidades de Sistema** (Configurações)
4. **Suporte** (sempre no final, separado)

---

## 📝 Notas Importantes

- A ordem foi pensada para facilitar o acesso às funcionalidades mais usadas
- Nível 1 tem **Colaboradores** em 2º lugar porque gerencia equipe
- Níveis 2-5 têm **Clientes** em 2º lugar porque focam em operações
- **Configurações** só aparece para Nível 1 (acesso exclusivo)
- **Suporte** aparece para todos os níveis, sempre no final
