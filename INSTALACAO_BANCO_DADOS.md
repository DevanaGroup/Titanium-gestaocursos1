# 🚀 Instalação - Menu Banco de Dados

## 📦 Dependências Necessárias

Para que o menu Banco de Dados funcione corretamente, é necessário instalar a biblioteca **PapaParse** para processamento de arquivos CSV.

---

## 🔧 Instalação

Execute os seguintes comandos no terminal:

```bash
# Instalar PapaParse
npm install papaparse

# Instalar tipos TypeScript para PapaParse
npm install --save-dev @types/papaparse
```

---

## ✅ Verificação

Após a instalação, verifique se as dependências foram adicionadas ao `package.json`:

```json
{
  "dependencies": {
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

---

## 📁 Arquivos Criados

Os seguintes arquivos foram criados para implementar o menu Banco de Dados:

### Páginas
- ✅ `src/pages/AdminDatabase.tsx` - Página principal do menu

### Componentes
- ✅ `src/components/database/ImportProgressDialog.tsx` - Dialog de progresso

### Serviços
- ✅ `src/services/bulkImportService.ts` - Lógica de importação

### Utilitários
- ✅ `src/utils/csvTemplates.ts` - Geração de templates CSV

### Rotas
- ✅ `src/App.tsx` - Rota `/database` adicionada

### Menu
- ✅ `src/components/CustomSidebar.tsx` - Menu "Banco de Dados" adicionado

---

## 🎯 Configuração do Usuário

Para acessar o menu Banco de Dados, o usuário deve ter:

```javascript
{
  hierarchyLevel: "Nível 0"
}
```

### Como Configurar um Usuário como Nível 0

1. Acesse o Firestore Console
2. Navegue até a coleção `users`
3. Encontre o documento do usuário
4. Edite o campo `hierarchyLevel` para `"Nível 0"`
5. Salve as alterações

---

## 🧪 Testando a Instalação

### 1. Verificar Acesso ao Menu

1. Faça login com um usuário **Nível 0**
2. Verifique se o menu "Banco de Dados" aparece no sidebar
3. Clique no menu para acessar a página

### 2. Testar Download de Template

1. Acesse qualquer aba (ex: Colaboradores)
2. Clique em "Baixar Modelo"
3. Verifique se o arquivo CSV foi baixado

### 3. Testar Importação

1. Abra o arquivo CSV baixado
2. Preencha com dados de teste
3. Selecione o arquivo na interface
4. Clique em "Importar"
5. Verifique o progresso e resultado

---

## 🔍 Verificação de Erros Comuns

### Erro: "Cannot find module 'papaparse'"

**Solução:**
```bash
npm install papaparse
```

### Erro: "Property 'parse' does not exist on type 'typeof Papa'"

**Solução:**
```bash
npm install --save-dev @types/papaparse
```

### Erro: "Acesso Negado"

**Solução:** Verifique se o usuário tem `hierarchyLevel: "Nível 0"`

---

## 📊 Estrutura de Permissões

| Nível | Acesso ao Banco de Dados |
|-------|--------------------------|
| Nível 0 | ✅ Sim (Exclusivo) |
| Nível 1 | ❌ Não |
| Nível 2 | ❌ Não |
| Nível 3 | ❌ Não |
| Nível 4 | ❌ Não |
| Nível 5 | ❌ Não |
| Nível 6 | ❌ Não |

---

## 🎨 Customização

### Adicionar Novos Tipos de Importação

Para adicionar um novo tipo de importação (ex: Clientes):

1. **Criar função de importação** em `bulkImportService.ts`:
```typescript
export const importClientsFromCSV = async (
  file: File,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  // Implementação
};
```

2. **Criar template CSV** em `csvTemplates.ts`:
```typescript
export const downloadClientsTemplate = () => {
  const headers = ["name", "email", "phone"];
  const exampleRow = ["Cliente ABC", "cliente@email.com", "11999999999"];
  const csv = [headers.join(","), exampleRow.join(",")].join("\n");
  downloadCSV("modelo_clientes.csv", csv);
};
```

3. **Adicionar tab** em `AdminDatabase.tsx`:
```tsx
<TabsTrigger value="clients">
  <Users className="h-4 w-4" />
  Clientes
</TabsTrigger>

<TabsContent value="clients">
  <ImportTabContent
    title="Clientes"
    description="Importe clientes em massa via CSV"
    type="clients"
    onImport={handleCSVImport}
    onDownloadTemplate={handleDownloadTemplate}
    isImporting={isImporting}
  />
</TabsContent>
```

4. **Adicionar case** no handler:
```typescript
case "clients":
  result = await importClientsFromCSV(file, (progress) => {
    setImportProgress(progress);
  });
  break;
```

---

## 📝 Checklist de Instalação

- [ ] Instalar `papaparse`
- [ ] Instalar `@types/papaparse`
- [ ] Verificar arquivos criados
- [ ] Configurar usuário Nível 0
- [ ] Testar acesso ao menu
- [ ] Testar download de template
- [ ] Testar importação de dados
- [ ] Verificar logs de erro
- [ ] Documentar usuários com acesso

---

## 🔄 Próximos Passos

Após a instalação bem-sucedida:

1. ✅ Configure usuários com Nível 0
2. ✅ Prepare arquivos CSV para importação
3. ✅ Faça backup do banco de dados
4. ✅ Teste com dados de exemplo
5. ✅ Importe dados reais
6. ✅ Verifique integridade dos dados

---

## 📞 Suporte

Em caso de problemas durante a instalação:

1. Verifique os logs do console do navegador
2. Verifique os logs do terminal
3. Consulte a documentação do PapaParse: https://www.papaparse.com/
4. Entre em contato com o suporte técnico

---

**Instalação concluída com sucesso!** 🎉

Agora você pode usar o menu Banco de Dados para importar dados em massa.
