# Sistema de Trâmites de Tarefas

Este documento explica como funciona o novo sistema de trâmites implementado no Kanban de tarefas.

## Visão Geral

O sistema de trâmites permite acompanhar o fluxo de uma tarefa através de diferentes responsáveis, criando um histórico completo de movimentações, assinaturas e tempos de permanência.

## Funcionalidades Principais

### 1. **Inicialização Automática**
- Toda nova tarefa criada automaticamente inicializa um processo de trâmites
- O responsável inicial da tarefa é o primeiro do trâmite

### 2. **Visualização dos Trâmites**
- Clique em qualquer card de tarefa no Kanban para abrir o dialog de trâmites
- Também é possível acessar via menu de opções (⋯) → "Ver Trâmites"

### 3. **Ações Disponíveis**

#### **Mover Tarefa**
- Permite enviar a tarefa para outro colaborador
- Requer seleção do destinatário
- Permite adicionar observações
- Gera notificação in-app para o destinatário

#### **Assinar Tarefa**
- Confirma o recebimento e aceita a responsabilidade
- Permite adicionar observações
- Registra o timestamp da assinatura

#### **Rejeitar Tarefa**
- Permite rejeitar a tarefa com motivo obrigatório
- Registra o motivo da rejeição
- Para o fluxo do trâmite

### 4. **Métricas e Insights**

#### **Status dos Trâmites**
- **Em Análise**: Tarefa está com o responsável atual
- **Em Trânsito**: Tarefa foi movida mas ainda não foi assinada
- **Assinado**: Responsável confirmou recebimento
- **Rejeitado**: Tarefa foi rejeitada

#### **Métricas Calculadas**
- Tempo total do processo
- Tempo médio por etapa
- Total de etapas
- Identificação de gargalos
- Usuários mais rápidos/lentos

## Como Usar

### Para Usuários Comuns

1. **Visualizar Trâmites**
   - Clique em qualquer tarefa no Kanban
   - Visualize o histórico completo de movimentações

2. **Interagir com Tarefas Atribuídas**
   - Se você é o responsável atual, verá as "Ações Disponíveis"
   - Use "Mover Tarefa" para enviar para outro colaborador
   - Use "Assinar" para confirmar recebimento
   - Use "Rejeitar" se não puder assumir a tarefa

### Para Gestores

1. **Acompanhar Fluxos**
   - Visualize métricas de tempo por processo
   - Identifique gargalos no fluxo
   - Acompanhe performance dos colaboradores

2. **Análise de Produtividade**
   - Tempo médio de resposta por pessoa
   - Identificação de bottlenecks
   - Padrões de rejeição

## Fluxo de Trabalho Típico

```
1. Tarefa Criada
   ↓
2. Processo Inicializado (Responsável inicial em análise)
   ↓
3. Responsável pode:
   - Assinar (aceita responsabilidade)
   - Mover para outro colaborador
   - Rejeitar com motivo
   ↓
4. Se movido: Novo responsável recebe notificação
   ↓
5. Ciclo se repete até conclusão ou rejeição final
```

## Notificações

- **In-App**: Notificações dentro do sistema quando recebe nova tarefa
- **Histórico**: Todas as movimentações ficam registradas permanentemente

## Estrutura de Dados

### ProcessStep
- Origem e destino da movimentação
- Status atual (Em Análise, Em Trânsito, Assinado, Rejeitado)
- Timestamps de criação, transição, assinatura
- Tempo de permanência em análise
- Observações

### TaskProcess
- Lista completa de steps
- Step atual ativo
- Métricas consolidadas
- Status de conclusão

## Permissões

- **Todos os usuários**: Podem visualizar trâmites de suas tarefas
- **Responsável atual**: Pode mover, assinar ou rejeitar
- **Gestores**: Podem visualizar todas as tarefas e métricas

## Benefícios

1. **Transparência**: Histórico completo de movimentações
2. **Accountability**: Registro de quem fez o quê e quando
3. **Métricas**: Insights sobre tempos e performance
4. **Auditoria**: Rastro completo para compliance
5. **Gestão**: Identificação de gargalos e oportunidades de melhoria

## Próximas Melhorias

- [ ] Notificações por email
- [ ] Relatórios de produtividade
- [ ] SLA e alertas de atraso
- [ ] Integração com calendário
- [ ] Aprovações em lote
- [ ] Templates de fluxo 