# 🗄️ Menu Banco de Dados - Documentação Completa

## 📖 Visão Geral

O **Menu Banco de Dados** é uma funcionalidade exclusiva para usuários com **Nível 0 (AdminTI)** que permite a importação em massa de dados via arquivos CSV.

---

## 🎯 Funcionalidades

- ✅ Importação em massa de **Colaboradores**
- ✅ Importação em massa de **Professores**
- ✅ Importação em massa de **Cursos**
- ✅ Importação em massa de **Aulas**
- ✅ Importação em massa de **Eventos**
- ✅ Importação em massa de **Tarefas**
- ✅ Download de templates CSV
- ✅ Validação automática de dados
- ✅ Progresso em tempo real
- ✅ Relatório detalhado de erros

---

## 🚀 Início Rápido

### 1. Instalar Dependências
```bash
npm install papaparse
npm install --save-dev @types/papaparse
```

### 2. Configurar Usuário
No Firestore, configure um usuário com:
```javascript
hierarchyLevel: "Nível 0"
```

### 3. Acessar o Menu
1. Faça login com o usuário Nível 0
2. Clique em "Banco de Dados" no menu lateral
3. Escolha o tipo de importação
4. Baixe o modelo CSV
5. Preencha os dados
6. Importe o arquivo

---

## 📚 Documentação Completa

### Guias de Uso
- 📖 **[BANCO_DADOS_ADMIN_TI.md](BANCO_DADOS_ADMIN_TI.md)** - Documentação completa de uso
- ⚡ **[QUICK_START_BANCO_DADOS.md](QUICK_START_BANCO_DADOS.md)** - Início rápido em 5 passos
- 🎨 **[EXEMPLO_VISUAL_BANCO_DADOS.md](EXEMPLO_VISUAL_BANCO_DADOS.md)** - Exemplos visuais da interface

### Guias Técnicos
- 🔧 **[INSTALACAO_BANCO_DADOS.md](INSTALACAO_BANCO_DADOS.md)** - Guia de instalação detalhado
- 🛠️ **[COMANDOS_UTEIS_BANCO_DADOS.md](COMANDOS_UTEIS_BANCO_DADOS.md)** - Comandos úteis para desenvolvimento
- 📊 **[RESUMO_IMPLEMENTACAO_BANCO_DADOS.md](RESUMO_IMPLEMENTACAO_BANCO_DADOS.md)** - Detalhes da implementação

### Ferramentas
- ✅ **[CHECKLIST_BANCO_DADOS.md](CHECKLIST_BANCO_DADOS.md)** - Checklist completo de verificação
- 🔨 **[INSTALAR_DEPENDENCIAS.sh](INSTALAR_DEPENDENCIAS.sh)** - Script de instalação

---

## 📁 Estrutura de Arquivos

```
src/
├── pages/
│   └── AdminDatabase.tsx              # Página principal
├── components/
│   └── database/
│       └── ImportProgressDialog.tsx   # Dialog de progresso
├── services/
│   └── bulkImportService.ts           # Lógica de importação
└── utils/
    └── csvTemplates.ts                # Templates CSV

docs/
├── BANCO_DADOS_ADMIN_TI.md
├── INSTALACAO_BANCO_DADOS.md
├── QUICK_START_BANCO_DADOS.md
├── EXEMPLO_VISUAL_BANCO_DADOS.md
├── COMANDOS_UTEIS_BANCO_DADOS.md
├── RESUMO_IMPLEMENTACAO_BANCO_DADOS.md
├── CHECKLIST_BANCO_DADOS.md
└── README_BANCO_DADOS.md              # Este arquivo
```

---

## 🎯 Tipos de Importação

| Tipo | Coleção Firestore | Campos Principais |
|------|-------------------|-------------------|
| **Colaboradores** | `collaborators_unified` | firstName, lastName, email |
| **Professores** | `teachers` | name, email, specialty |
| **Cursos** | `courses` | name, description, price |
| **Aulas** | `lessons` | courseId, title, duration |
| **Eventos** | `agenda_events` | title, startDate, endDate |
| **Tarefas** | `tasks` | title, assignedTo, dueDate |

---

## 🔐 Controle de Acesso

| Nível | Acesso ao Menu |
|-------|----------------|
| **Nível 0** | ✅ Sim (Exclusivo) |
| Nível 1 | ❌ Não |
| Nível 2-6 | ❌ Não |

---

## 📊 Fluxo de Uso

```
1. Login (Nível 0)
   ↓
2. Menu "Banco de Dados"
   ↓
3. Escolher Tipo (ex: Colaboradores)
   ↓
4. Baixar Modelo CSV
   ↓
5. Preencher Dados
   ↓
6. Upload do Arquivo
   ↓
7. Importar
   ↓
8. Ver Resultado
   ✅ Sucessos
   ❌ Falhas
   ⚠️ Avisos
```

---

## 🎨 Interface

### Menu Lateral
```
┌─────────────────────┐
│  🏠 Início          │
│  🗄️ Banco de Dados  │ ← NOVO!
│  👥 Colaboradores   │
│  🎓 Cursos          │
│  📅 Agenda          │
└─────────────────────┘
```

### Página Principal
```
┌────────────────────────────────────────────────────┐
│  🗄️ Gerenciar Banco de Dados                      │
├────────────────────────────────────────────────────┤
│  [Colaboradores] [Professores] [Cursos] ...       │
├────────────────────────────────────────────────────┤
│  Importação em Massa    │  Instruções             │
│  [📤 Upload CSV]        │  1. Baixe o modelo      │
│  [📥 Modelo] [Importar] │  2. Preencha dados      │
└────────────────────────────────────────────────────┘
```

---

## ⚠️ Validações

### Automáticas
- ✅ Email válido e único
- ✅ Campos obrigatórios preenchidos
- ✅ Formato de data correto
- ✅ Verificação de duplicatas

### Tratamento de Erros
- ❌ Erro em uma linha não interrompe importação
- ⚠️ Avisos para duplicatas
- 📋 Lista detalhada de erros
- 🔄 Possibilidade de corrigir e reimportar

---

## 📦 Dependências

### Necessárias
- `papaparse` - Parsing de CSV
- `@types/papaparse` - Tipos TypeScript

### Já Existentes
- React
- Firebase/Firestore
- React Router
- Shadcn/ui
- Lucide Icons

---

## 🧪 Testes

### Teste Rápido
```bash
# 1. Baixe o modelo de colaboradores
# 2. Preencha com:
firstName,lastName,email,birthDate,hierarchyLevel,phone,whatsapp,address
Teste,Usuario,teste@email.com,1990-01-01,Nível 5,11999999999,11999999999,Rua Teste 123

# 3. Importe o arquivo
# 4. Verifique no Firestore
```

---

## 🐛 Troubleshooting

### Problema: "Acesso Negado"
**Solução:** Verifique se o usuário tem `hierarchyLevel: "Nível 0"`

### Problema: "Email já existe"
**Solução:** Remova duplicatas do CSV ou verifique dados existentes

### Problema: "Data inválida"
**Solução:** Use formato YYYY-MM-DD (ex: 2025-02-15)

### Problema: "Erro ao processar arquivo"
**Solução:** 
- Verifique se é um arquivo CSV válido
- Confirme que os cabeçalhos estão corretos
- Salve como CSV UTF-8

---

## 📈 Estatísticas

- **Arquivos Criados:** 7
- **Arquivos Modificados:** 2
- **Linhas de Código:** ~1.500
- **Tipos de Importação:** 6
- **Validações:** 10+

---

## 🔮 Roadmap

### Próximas Funcionalidades
- [ ] Exportação de dados existentes
- [ ] Atualização em massa
- [ ] Exclusão em massa
- [ ] Histórico de importações
- [ ] Preview antes de importar
- [ ] Importação de clientes
- [ ] Rollback de importações

---

## 📞 Suporte

### Documentação
1. Consulte os arquivos de documentação
2. Verifique o checklist
3. Leia os exemplos visuais

### Problemas Técnicos
1. Verifique os logs do console
2. Consulte o guia de troubleshooting
3. Entre em contato com o suporte técnico

---

## 🎉 Conclusão

O Menu Banco de Dados está pronto para uso! Siga os passos de instalação e configuração para começar a importar dados em massa.

### Próximos Passos
1. ✅ Instalar dependências
2. ✅ Configurar usuário Nível 0
3. ✅ Testar importação
4. ✅ Usar em produção

---

## 📝 Notas Importantes

- ⚠️ Sempre faça backup antes de importações grandes
- ⚠️ Teste com poucos registros primeiro
- ⚠️ Use UTF-8 para caracteres especiais
- ⚠️ Não altere os cabeçalhos dos templates

---

## 🏆 Créditos

**Desenvolvido para:** Titaniumfix  
**Data:** Fevereiro 2025  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para Uso

---

## 📄 Licença

Este código é proprietário e confidencial. Todos os direitos reservados.

---

**Documentação completa e pronta para uso! 🚀**

Para começar, execute:
```bash
bash INSTALAR_DEPENDENCIAS.sh
```

E consulte **[QUICK_START_BANCO_DADOS.md](QUICK_START_BANCO_DADOS.md)** para início rápido!
