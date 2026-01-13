# Sistema de Solicitações de Despesas - Cerrado Engenharia

## Visão Geral

O Sistema de Solicitações de Despesas é uma funcionalidade completa para gerenciar reembolsos e despesas corporativas, com protocolo único de controle e workflow de aprovação.

## Funcionalidades Principais

### Para Colaboradores
- ✅ Criar solicitações de reembolso com categorização detalhada
- ✅ Upload múltiplo de comprovantes (PDF, DOC, XLS, JPG, PNG - máx 10MB)
- ✅ Acompanhar status em tempo real
- ✅ Histórico completo de solicitações
- ✅ Possibilidade de cancelar solicitações pendentes
- ✅ Campos específicos para viagens (destino, KM, hospedagem)
- ✅ Sistema de despesas recorrentes

### Para Gestores
- ✅ Dashboard analítico com estatísticas
- ✅ Aprovação/reprovação com comentários obrigatórios
- ✅ Visualização de todas as solicitações da equipe
- ✅ Filtros avançados (status, categoria, urgência)
- ✅ Protocolo único para rastreamento (EXP{YY}{MM}{DD}{timestamp})

## Arquitetura Técnica

### Componentes Principais
- `ExpenseRequestManagement.tsx` - Interface principal
- `expenseRequestService.ts` - Serviços Firebase
- `fileUploadService.ts` - Upload de anexos

### Estrutura de Dados
```typescript
interface ExpenseRequest {
  protocol: string; // EXP{YY}{MM}{DD}{timestamp}
  requesterId: string;
  title: string;
  amount: number;
  category: string;
  status: 'Em análise' | 'Aprovado' | 'Reprovado' | 'Cancelado';
  attachments: ExpenseAttachment[];
  travelDetails?: TravelDetails; // Opcional para viagens
  recurringDetails?: RecurringDetails; // Opcional para recorrentes
}
```

### Integração Firebase
- Coleção: `expenseRequests`
- Storage: `expense-attachments/{requestId}/`
- Validação de arquivos: 10MB máximo

## Diferenciação de Uso

### "Relatórios de Viagem" vs "Solicitações de Despesas"

**Relatórios de Viagem** (existente):
- Focado em relatórios específicos de viagem
- Requer fotos do odômetro obrigatórias
- Processo mais visual e detalhado
- Para prestação de contas pós-viagem

**Solicitações de Despesas** (novo):
- Sistema universal de reembolsos
- Protocolo de controle único
- Workflow gestor-colaborador
- Para solicitações antecipadas e reembolsos diversos

## Menu de Navegação

Ambos os sistemas coexistem no menu lateral:
- 🧮 **Relatórios de Viagem** - Para relatórios específicos com odômetro
- 🧾 **Solicitações de Despesas** - Para reembolsos gerais com protocolo

## Permissões de Acesso

| Funcionalidade | Colaborador | Gestor | Administrador |
|---|---|---|---|
| Criar solicitações | ✅ | ✅ | ✅ |
| Ver próprias solicitações | ✅ | ✅ | ✅ |
| Ver todas as solicitações | ❌ | ✅ | ✅ |
| Aprovar/Reprovar | ❌ | ✅ | ✅ |
| Dashboard analítico | ❌ | ✅ | ✅ |

## Categorias e Subcategorias

### Categorias Principais
- Operacional, Marketing, Administrativo
- Tecnologia, Recursos Humanos
- Viagem, Alimentação, Material
- Combustível, Hospedagem, Transporte

### Subcategorias Específicas
- Combustível, Pedágio, Estacionamento
- Passagem Aérea/Terrestre, Taxi/Uber
- Material de Escritório, Software, Hardware
- Treinamento, Evento

## Resolução de Problemas Técnicos

### Erro: "Unsupported field value: undefined"
**Causa**: Firestore não aceita campos `undefined`
**Solução**: Implementado filtro de campos undefined/null antes do envio

### Cache/Dependências Corrompidas
**Sintomas**: Erros 504 (Outdated Optimize Dep)
**Solução**:
```bash
# Limpar cache npm
sudo chown -R 501:20 "/Users/usuario/.npm"
npm cache clean --force

# Reinstalar dependências
sudo rm -rf node_modules
npm install

# Reiniciar servidor
npm run dev
```

### Permissões de Arquivo
**Sintomas**: EACCES permission denied
**Solução**: 
```bash
sudo rm -rf node_modules/.vite
sudo chown -R $(whoami) node_modules
```

## Status de Implementação

### ✅ Implementado
- Sistema completo de solicitações
- Upload de arquivos com validação
- Protocolo único de controle
- Workflow de aprovação
- Dashboard analítico
- Filtros e busca avançada
- Campos específicos para viagem
- Sistema de recorrência
- Tratamento de erros Firebase

### 🔄 Próximas Melhorias
- Integração com sistema de pagamentos
- Notificações por email
- Relatórios exportáveis
- API para integração externa
- Auditoria de alterações

## Documentação de API

### Principais Funções

```typescript
// Criar solicitação
createExpenseRequest(requestData): Promise<string>

// Buscar solicitações
getAllExpenseRequests(): Promise<ExpenseRequest[]>
getExpenseRequestsByUser(userId): Promise<ExpenseRequest[]>

// Aprovar/Reprovar
approveExpenseRequest(id, reviewer, comments): Promise<void>
rejectExpenseRequest(id, reviewer, comments): Promise<void>

// Estatísticas
getExpenseRequestStats(userId?): Promise<ExpenseRequestStats>

// Upload de arquivos
uploadExpenseAttachment(file, requestId, userId): Promise<ExpenseAttachment>
```

### Validações Implementadas

- **Arquivos**: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (máx 10MB)
- **Campos obrigatórios**: Título, descrição, valor, data esperada
- **Viagem**: Destino, datas de início/fim (se aplicável)
- **Permissões**: Verificação de hierarquia para ações administrativas

## Configuração de Desenvolvimento

### Requisitos
- Node.js 18+
- Firebase configurado
- Vite 5.4+

### Instalação
```bash
npm install
npm run dev
```

### Estrutura de Arquivos
```
src/
├── components/
│   └── ExpenseRequestManagement.tsx
├── services/
│   ├── expenseRequestService.ts
│   └── fileUploadService.ts
├── types/
│   └── index.ts (ExpenseRequest interfaces)
└── config/
    └── firebase.ts
```

## 🔍 **NOVA INTERFACE DE VISUALIZAÇÃO DETALHADA**

### **Para Gestores e Aprovadores**

A nova interface de visualização foi completamente reformulada para fornecer todas as informações necessárias para tomada de decisão:

#### **📋 Aba "Informações Gerais"**
- **Protocolo único** em destaque
- **Valor total** com formatação brasileira
- **Status e urgência** com badges visuais
- **Título e descrição** completos
- **Categorização** (categoria + subcategoria)
- **Dados do solicitante** e datas
- **Justificativa empresarial** destacada
- **Informações de cliente/projeto** (se aplicável)

#### **🚗 Aba "Detalhes Específicos"**
- **Viagens:** Destino, datas, KM percorrido, hospedagem, transporte, relatório de visita
- **Recorrências:** Frequência, número de ocorrências, data final
- **Indicação visual** quando não há detalhes específicos

#### **📎 Aba "Anexos"**
- **Listagem completa** de todos os comprovantes
- **Visualização e download** direto dos arquivos
- **Informações técnicas** (tamanho, data de upload)
- **Alertas** sobre política de comprovantes
- **Aviso visual** quando não há anexos

#### **📜 Aba "Histórico"**
- **Timeline completa** da solicitação
- **Marcos importantes:** Criação, revisão, pagamento
- **Comentários da análise** com identificação do revisor
- **Informações técnicas** (IDs internos)

### **⚡ Aprovação Direta**
- **Botões de ação** integrados na visualização
- **Transição suave** para o dialog de aprovação/reprovação
- **Contexto preservado** durante o processo

### **🎯 Benefícios para Gestores**
1. **Visão 360°** de cada solicitação
2. **Acesso rápido** a todos os comprovantes
3. **Contexto completo** para decisão informada
4. **Interface intuitiva** com navegação por abas
5. **Integração perfeita** com o fluxo de aprovação

--- 