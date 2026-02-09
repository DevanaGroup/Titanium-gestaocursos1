# 🗄️ Menu Banco de Dados - AdminTI (Nível 0)

## 📋 Visão Geral

O menu **Banco de Dados** é uma funcionalidade exclusiva para usuários com **Nível 0 (AdminTI)**. Permite a importação em massa de dados via arquivos CSV, facilitando a carga inicial do sistema ou migração de dados.

---

## 🎯 Funcionalidades

### Importação em Massa via CSV

O sistema permite importar os seguintes tipos de dados:

1. ✅ **Colaboradores** - Usuários do sistema
2. ✅ **Professores** - Docentes e instrutores
3. ✅ **Cursos** - Cursos oferecidos
4. ✅ **Aulas** - Aulas vinculadas aos cursos
5. ✅ **Eventos** - Eventos da agenda
6. ✅ **Tarefas** - Tarefas do sistema Kanban

---

## 🔐 Controle de Acesso

- **Acesso Exclusivo:** Apenas usuários com `hierarchyLevel: "Nível 0"` podem acessar
- **Rota:** `/database`
- **Menu:** Aparece no sidebar apenas para Nível 0

---

## 📁 Estrutura dos Arquivos CSV

### 1. Colaboradores

**Arquivo:** `modelo_colaboradores.csv`

```csv
firstName,lastName,email,birthDate,hierarchyLevel,phone,whatsapp,address
João,Silva,joao.silva@email.com,1990-01-15,Nível 3,11999999999,11999999999,Rua Exemplo 123
```

**Campos:**
- `firstName` (obrigatório) - Primeiro nome
- `lastName` (obrigatório) - Sobrenome
- `email` (obrigatório) - Email único
- `birthDate` (formato: YYYY-MM-DD) - Data de nascimento
- `hierarchyLevel` - Nível hierárquico (Nível 0 a Nível 6)
- `phone` - Telefone
- `whatsapp` - WhatsApp
- `address` - Endereço completo

---

### 2. Professores

**Arquivo:** `modelo_professores.csv`

```csv
name,email,phone,specialty,hourlyRate,status
Maria Santos,maria.santos@email.com,11988888888,Matemática,150,Ativo
```

**Campos:**
- `name` (obrigatório) - Nome completo
- `email` (obrigatório) - Email único
- `phone` - Telefone
- `specialty` - Especialidade/Área
- `hourlyRate` - Valor hora/aula
- `status` - Ativo/Inativo

---

### 3. Cursos

**Arquivo:** `modelo_cursos.csv`

```csv
name,description,duration,price,category,status
Curso de React,Aprenda React do zero ao avançado,40,1500,Programação,Ativo
```

**Campos:**
- `name` (obrigatório) - Nome do curso
- `description` - Descrição
- `duration` - Duração em horas
- `price` - Preço
- `category` - Categoria
- `status` - Ativo/Inativo

---

### 4. Aulas

**Arquivo:** `modelo_aulas.csv`

```csv
courseId,title,description,duration,order,videoUrl
curso123,Introdução ao React,Primeira aula do curso,60,1,https://youtube.com/watch?v=exemplo
```

**Campos:**
- `courseId` (obrigatório) - ID do curso no Firestore
- `title` (obrigatório) - Título da aula
- `description` - Descrição
- `duration` - Duração em minutos
- `order` - Ordem da aula no curso
- `videoUrl` - URL do vídeo

---

### 5. Eventos

**Arquivo:** `modelo_eventos.csv`

```csv
title,description,type,startDate,endDate,allDay,location,priority
Reunião Geral,Reunião mensal da equipe,Reunião,2025-02-15 09:00,2025-02-15 11:00,false,Sala 1,Alta
```

**Campos:**
- `title` (obrigatório) - Título do evento
- `description` - Descrição
- `type` - Tipo (Reunião, Compromisso, etc.)
- `startDate` (obrigatório) - Data/hora início (YYYY-MM-DD HH:MM)
- `endDate` (obrigatório) - Data/hora fim (YYYY-MM-DD HH:MM)
- `allDay` - true/false para dia inteiro
- `location` - Local
- `priority` - Baixa/Média/Alta/Urgente

---

### 6. Tarefas

**Arquivo:** `modelo_tarefas.csv`

```csv
title,description,status,priority,assignedTo,assignedToName,clientId,clientName,dueDate
Desenvolver feature X,Implementar nova funcionalidade,Pendente,Alta,user@email.com,João Silva,client123,Cliente ABC,2025-03-01
```

**Campos:**
- `title` (obrigatório) - Título da tarefa
- `description` - Descrição
- `status` - Pendente/Em andamento/Concluída/Bloqueada
- `priority` - Baixa/Média/Alta/Urgente
- `assignedTo` (obrigatório) - Email do responsável
- `assignedToName` - Nome do responsável
- `clientId` - ID do cliente
- `clientName` - Nome do cliente
- `dueDate` (obrigatório) - Data de vencimento (YYYY-MM-DD)

---

## 🚀 Como Usar

### Passo 1: Acessar o Menu
1. Faça login com usuário **Nível 0**
2. No menu lateral, clique em **"Banco de Dados"**

### Passo 2: Selecionar Tipo de Importação
1. Escolha a aba correspondente ao tipo de dado (Colaboradores, Professores, etc.)

### Passo 3: Baixar Modelo
1. Clique em **"Baixar Modelo"** para obter o arquivo CSV de exemplo
2. O arquivo será baixado com a estrutura correta

### Passo 4: Preencher Dados
1. Abra o arquivo CSV no Excel, Google Sheets ou editor de texto
2. Preencha os dados seguindo o formato do exemplo
3. **Importante:** Mantenha os cabeçalhos (primeira linha) exatamente como estão
4. Aceita vírgula (,) ou ponto e vírgula (;) como separador

### Passo 5: Importar
1. Clique em **"Clique para selecionar arquivo CSV"**
2. Selecione seu arquivo preenchido
3. Clique em **"Importar"**
4. Aguarde o processamento

### Passo 6: Verificar Resultado
1. Uma janela mostrará o progresso da importação
2. Ao final, você verá:
   - ✅ Quantidade de registros importados com sucesso
   - ❌ Quantidade de falhas
   - ⚠️ Avisos (ex: registros duplicados)
   - 📋 Lista detalhada de erros

---

## ⚠️ Validações e Regras

### Validações Automáticas

1. **Emails:**
   - Devem ser únicos
   - Formato válido (usuario@dominio.com)
   - Duplicatas são rejeitadas

2. **Datas:**
   - Formato: YYYY-MM-DD ou YYYY-MM-DD HH:MM
   - Datas inválidas geram aviso

3. **Campos Obrigatórios:**
   - Registros sem campos obrigatórios são rejeitados
   - Erro detalhado é exibido

4. **Duplicatas:**
   - Sistema verifica registros existentes
   - Duplicatas são puladas com aviso

### Tratamento de Erros

- **Erro em uma linha:** Não interrompe a importação das demais
- **Arquivo inválido:** Importação é cancelada
- **Formato incorreto:** Mensagem de erro específica

---

## 📊 Progresso e Feedback

Durante a importação, você verá:

- **Barra de Progresso:** Mostra quantos registros foram processados
- **Item Atual:** Nome do registro sendo processado
- **Estatísticas em Tempo Real:**
  - ✅ Sucessos
  - ❌ Falhas
- **Lista de Erros:** Detalhes de cada falha
- **Lista de Avisos:** Alertas não críticos

---

## 🔧 Arquivos Criados

### Estrutura de Arquivos

```
src/
├── pages/
│   └── AdminDatabase.tsx          # Página principal
├── components/
│   └── database/
│       └── ImportProgressDialog.tsx  # Dialog de progresso
├── services/
│   └── bulkImportService.ts       # Lógica de importação
└── utils/
    └── csvTemplates.ts            # Geração de templates
```

### Coleções Firestore Afetadas

- `collaborators_unified` - Colaboradores
- `teachers` - Professores
- `courses` - Cursos
- `lessons` - Aulas
- `agenda_events` - Eventos
- `tasks` - Tarefas

---

## 📦 Dependências

### Necessário Instalar

```bash
npm install papaparse
npm install --save-dev @types/papaparse
```

**PapaParse:** Biblioteca para parsing de arquivos CSV

---

## 🎨 Interface

### Layout da Página

```
┌─────────────────────────────────────────────────────────┐
│  🗄️ Gerenciar Banco de Dados                           │
│  Cadastre e importe dados em massa via CSV              │
├─────────────────────────────────────────────────────────┤
│  [Colaboradores] [Professores] [Cursos] [Aulas] ...    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │ Importação em Massa (CSV)                        │  │
│  │                                                   │  │
│  │ [📤 Clique para selecionar arquivo CSV]          │  │
│  │                                                   │  │
│  │ [📥 Baixar Modelo]  [📤 Importar]                │  │
│  │                                                   │  │
│  │ Planilha normal (Excel, Google Sheets).          │  │
│  │ Aceita vírgula (,) ou ponto e vírgula (;).       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Instruções                                        │  │
│  │                                                   │  │
│  │ 1. Baixe o modelo CSV                            │  │
│  │ 2. Preencha os dados no arquivo                  │  │
│  │ 3. Selecione o arquivo preenchido                │  │
│  │ 4. Clique em "Importar" para processar           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Problema: "Acesso Negado"
**Solução:** Verifique se seu usuário tem `hierarchyLevel: "Nível 0"`

### Problema: "Erro ao processar arquivo"
**Solução:** 
- Verifique se o arquivo é CSV válido
- Confirme que os cabeçalhos estão corretos
- Tente salvar novamente como CSV UTF-8

### Problema: "Email já existe"
**Solução:** 
- Verifique duplicatas no arquivo
- Confirme se o email já está cadastrado no sistema

### Problema: "Data inválida"
**Solução:** Use formato YYYY-MM-DD (ex: 2025-02-15)

---

## 📝 Notas Importantes

1. **Backup:** Sempre faça backup antes de importações grandes
2. **Teste:** Teste com poucos registros primeiro
3. **Encoding:** Use UTF-8 para caracteres especiais
4. **Separadores:** Vírgula (,) ou ponto e vírgula (;) são aceitos
5. **Cabeçalhos:** Não altere os nomes dos cabeçalhos
6. **Linhas Vazias:** São ignoradas automaticamente

---

## 🔄 Atualizações Futuras

Funcionalidades planejadas:
- [ ] Exportação de dados existentes
- [ ] Atualização em massa de registros
- [ ] Exclusão em massa
- [ ] Histórico de importações
- [ ] Validação prévia com preview
- [ ] Importação de clientes
- [ ] Importação de contratos

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Verifique este documento
2. Consulte os logs de erro na interface
3. Entre em contato com o suporte técnico

---

**Última atualização:** Fevereiro 2025
**Versão:** 1.0.0
