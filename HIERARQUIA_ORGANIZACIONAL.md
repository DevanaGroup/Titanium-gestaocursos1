# 🏢 Estrutura Hierárquica Organizacional

## �� Nova Estrutura de 10 Níveis Hierárquicos

O sistema foi atualizado para refletir uma estrutura organizacional mais robusta e completa, com 10 níveis hierárquicos que seguem as melhores práticas corporativas.

### 🔝 1. Presidente / CEO
**Função:** Principal responsável pela organização
- Define a visão, missão e objetivos estratégicos
- Representa a empresa perante investidores, governo e sociedade
- **Responsabilidades:**
  - Tomar decisões de alto impacto
  - Aprovar grandes investimentos
  - Relacionamento com stakeholders
- **Permissões no Sistema:** Acesso total a todas as funcionalidades

### 🧠 2. Diretores (C-Level: CFO, CTO, COO, etc.)
**Função:** Direcionar grandes áreas (finanças, tecnologia, operações, marketing)
- Executam a estratégia definida pelo presidente
- **Cargos típicos:**
  - CFO – Diretor Financeiro
  - CTO – Diretor de Tecnologia
  - COO – Diretor de Operações
  - CMO – Diretor de Marketing
  - **Diretor Financeiro** – Direciona estratégias e operações financeiras
- **Responsabilidades:**
  - Elaborar planos estratégicos por área
  - Tomar decisões táticas de alto nível
  - Coordenar os gerentes de cada departamento
- **Permissões no Sistema:** Gestão de departamentos, relatórios financeiros, aprovação de despesas

### 📋 3. Gerente
**Função:** Gerenciar departamentos ou setores específicos
- Traduzem a estratégia dos diretores em planos executáveis
- **Responsabilidades:**
  - Planejamento e controle de recursos
  - Gestão de pessoas e desempenho
  - Reporte de resultados aos diretores
- **Permissões no Sistema:** Gestão de projetos, aprovação de despesas menores, relatórios

### 🧭 4. Coordenador
**Função:** Intermediário entre gerente e supervisor
- Coordena a execução de projetos e rotinas da equipe
- **Responsabilidades:**
  - Distribuição de tarefas
  - Acompanhamento de metas
  - Suporte técnico e administrativo ao supervisor
- **Permissões no Sistema:** Gestão de projetos, visualização de relatórios

### 👁‍🗨 5. Supervisor
**Função:** Supervisionar equipes operacionais
- Garante o cumprimento de processos e qualidade
- **Responsabilidades:**
  - Monitoramento diário da equipe
  - Relatórios de produção ou desempenho
  - Resolver conflitos e garantir disciplina
- **Permissões no Sistema:** Gestão de projetos limitada

### 👨‍💻 6. Líder Técnico / Líder de Equipe
**Função:** Liderança informal ou técnica
- Não tem autoridade administrativa completa, mas orienta tecnicamente os colegas
- **Responsabilidades:**
  - Garantir boas práticas técnicas
  - Apoiar o supervisor em questões operacionais
  - Servir como referência técnica
- **Permissões no Sistema:** Liderança técnica, orientação de equipe

### ⚙️ 7. Engenheiro / Analista / Financeiro
**Função:** Executar tarefas técnicas, analíticas e financeiras da organização
- Nível intermediário com conhecimento específico
- **Exemplos:**
  - **Engenheiro:** Elabora projetos, acompanha obras ou processos técnicos
  - **Analista:** Analisa dados, processos ou desempenho
  - **Financeiro:** Controla fluxo de caixa, contas a pagar e a receber
- **Permissões no Sistema:** Execução de tarefas técnicas e analíticas

### 🛍️ 8. Comercial
**Função:** Executar atividades comerciais e de vendas
- Apoio nas operações comerciais e relacionamento com clientes
- **Responsabilidades:**
  - Atendimento ao cliente
  - Apoio em vendas e negociações
  - Suporte comercial
  - Relacionamento com prospects
- **Permissões no Sistema:** Acesso limitado, criação de solicitações básicas

### 🛠 9. Técnico / Assistente
**Função:** Apoiar os níveis acima com tarefas técnicas ou administrativas específicas
- **Responsabilidades:**
  - **Técnico:** Execução prática de tarefas (manutenção, suporte, produção)
  - **Assistente:** Apoio administrativo, financeiro, RH, etc.
- **Permissões no Sistema:** Apoio técnico e administrativo

### 📚 10. Estagiário / Auxiliar
**Função:** Aprender e apoiar com tarefas básicas ou rotineiras
- **Responsabilidades:**
  - **Estagiário:** Desenvolvimento profissional sob supervisão, com tarefas práticas e formativas
  - **Auxiliar:** Apoio operacional, como organização de arquivos, limpeza, pequenos serviços
- **Permissões no Sistema:** Acesso limitado, criação de solicitações básicas

## 🔄 Fluxo de Comunicação e Subordinação

```
Presidente
    ↓
Diretores (Diretor, Diretor de TI, Diretor Financeiro)
    ↓
Gerentes
    ↓
Coordenadores
    ↓
Supervisores
    ↓
Líderes Técnicos
    ↓
Engenheiros/Analistas/Financeiros
    ↓
Técnicos/Assistentes/Comercial
    ↓
Estagiários/Auxiliares
```

### 📊 Matriz de Permissões

| Funcionalidade | Presidente | Diretor | Dir. TI | Dir. Fin. | Gerente | Coordenador | Supervisor | Líder Técnico | Eng/Analista | Técnico | Comercial | Estagiário |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Gestão de Usuários** | ✅ Todos | ✅ Gerente↓ | ✅ Gerente↓ | ✅ Gerente↓ | ✅ Coord↓ | ✅ Super↓ | ✅ Líder↓ | ✅ Eng↓ | ✅ Téc↓ | ✅ Com↓ | ✅ Est↓ | ❌ |
| **Aprovação de Despesas** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Relatórios Financeiros** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Gestão de Projetos** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Liderança Técnica** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Criação de Solicitações** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Visualizar Próprios Dados** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🚀 Como Implementar

### 1. Atualização Automática
- Execute o botão "Atualizar Hierarquia" na seção de Colaboradores
- Usuários específicos serão promovidos a Presidente automaticamente
- Demais usuários serão definidos como Estagiário/Auxiliar

### 2. Reclassificação Manual
Após a atualização automática, os Presidentes podem:
- Acessar a gestão de colaboradores
- Editar cada usuário individualmente
- Definir o nível hierárquico apropriado

### 3. Validação de Permissões
O sistema automaticamente:
- Valida permissões baseadas na hierarquia
- Restringe acesso a funcionalidades inadequadas
- Aplica regras de subordinação

## 🔧 Configurações Técnicas

### Funções Utilitárias
- `hasPermission()` - Verifica permissões específicas
- `canManageLevel()` - Verifica se pode gerenciar determinado nível
- `getManagedLevels()` - Retorna níveis que pode gerenciar
- `getHierarchyDescription()` - Descrição do nível
- `getHierarchyColor()` - Cor do nível para UI

### Tipos TypeScript
```typescript
type HierarchyLevel = 
  | "Presidente" 
  | "Diretor" 
  | "Diretor de TI"
  | "Diretor Financeiro"
  | "Gerente" 
  | "Coordenador" 
  | "Supervisor" 
  | "Líder Técnico" 
  | "Engenheiro" 
  | "Analista" 
  | "Financeiro" 
  | "Técnico/Assistente" 
  | "Comercial"
  | "Estagiário/Auxiliar";
```