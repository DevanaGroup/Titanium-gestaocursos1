# ⚡ Quick Start - Menu Banco de Dados

## 🚀 Início Rápido em 5 Passos

### 1️⃣ Instalar Dependências
```bash
npm install papaparse
npm install --save-dev @types/papaparse
```

### 2️⃣ Configurar Usuário AdminTI
No Firestore Console:
- Acesse a coleção `users`
- Encontre seu usuário
- Edite: `hierarchyLevel: "Nível 0"`

### 3️⃣ Fazer Login
- Faça login com o usuário Nível 0
- O menu "Banco de Dados" aparecerá no sidebar

### 4️⃣ Baixar Template
- Clique em "Banco de Dados"
- Escolha uma aba (ex: Colaboradores)
- Clique em "Baixar Modelo"

### 5️⃣ Importar Dados
- Preencha o CSV baixado
- Selecione o arquivo
- Clique em "Importar"
- Aguarde o resultado

---

## 📋 Exemplo Rápido - Colaboradores

### CSV de Exemplo
```csv
firstName,lastName,email,birthDate,hierarchyLevel,phone,whatsapp,address
João,Silva,joao@email.com,1990-01-15,Nível 3,11999999999,11999999999,Rua A 123
Maria,Santos,maria@email.com,1985-05-20,Nível 4,11988888888,11988888888,Rua B 456
```

### Resultado Esperado
```
✅ 2 registros importados com sucesso
❌ 0 falhas
```

---

## 🎯 Tipos Disponíveis

| Tipo | Campos Principais |
|------|-------------------|
| **Colaboradores** | firstName, lastName, email |
| **Professores** | name, email, specialty |
| **Cursos** | name, description, price |
| **Aulas** | courseId, title, duration |
| **Eventos** | title, startDate, endDate |
| **Tarefas** | title, assignedTo, dueDate |

---

## ⚠️ Regras Importantes

1. **Email único** - Não pode duplicar
2. **Campos obrigatórios** - Marcados com (obrigatório)
3. **Formato de data** - YYYY-MM-DD
4. **Cabeçalhos** - Não altere os nomes

---

## 🐛 Problemas Comuns

### "Acesso Negado"
→ Verifique se é Nível 0

### "Email já existe"
→ Remova duplicatas do CSV

### "Data inválida"
→ Use formato YYYY-MM-DD

---

## 📖 Documentação Completa

Para mais detalhes, consulte:
- `BANCO_DADOS_ADMIN_TI.md` - Documentação completa
- `INSTALACAO_BANCO_DADOS.md` - Guia de instalação
- `RESUMO_IMPLEMENTACAO_BANCO_DADOS.md` - Detalhes técnicos

---

**Pronto para usar! 🎉**
