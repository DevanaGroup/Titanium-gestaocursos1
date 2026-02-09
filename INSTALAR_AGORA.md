# 🚨 AÇÃO NECESSÁRIA - Instalar Dependências

## ⚠️ Erro Atual

O sistema está tentando importar `papaparse` mas ele não está instalado.

```
Failed to resolve import "papaparse" from "src/services/bulkImportService.ts"
```

---

## ✅ SOLUÇÃO: Execute Este Comando

### Opção 1: Comando Simples
```bash
npm install papaparse @types/papaparse
```

### Opção 2: Se houver erro de permissão
```bash
sudo npm install papaparse @types/papaparse
```

### Opção 3: Usando Yarn (se preferir)
```bash
yarn add papaparse @types/papaparse
```

---

## 📋 Passo a Passo

### 1. Abra o Terminal
- No VS Code: `Terminal > New Terminal`
- Ou use o Terminal do macOS

### 2. Navegue até o Projeto (se necessário)
```bash
cd "/Users/alissonsantana/Desktop/Projetos 2025/Titanium-gestaocursos1-5"
```

### 3. Execute o Comando
```bash
npm install papaparse @types/papaparse
```

### 4. Aguarde a Instalação
Você verá algo como:
```
added 2 packages, and audited 500 packages in 5s
```

### 5. Verifique a Instalação
```bash
npm list papaparse
```

Deve mostrar:
```
papaparse@5.4.1
```

---

## 🔧 Se Houver Erro de Permissão

### Problema
```
npm error code EACCES
npm error syscall mkdir
npm error errno -13
```

### Solução 1: Usar sudo
```bash
sudo npm install papaparse @types/papaparse
```

### Solução 2: Corrigir Permissões
```bash
sudo chown -R $(whoami) node_modules
npm install papaparse @types/papaparse
```

### Solução 3: Limpar Cache
```bash
npm cache clean --force
npm install papaparse @types/papaparse
```

---

## ✅ Após a Instalação

### 1. Reinicie o Servidor de Desenvolvimento
```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
npm run dev
```

### 2. Verifique se o Erro Sumiu
- O servidor deve iniciar sem erros
- Acesse http://localhost:5173
- Faça login com usuário Nível 0
- Clique em "Banco de Dados"

### 3. Teste a Funcionalidade
- Baixe um template CSV
- Preencha com dados de teste
- Importe o arquivo
- Verifique o resultado

---

## 📦 O Que Será Instalado

### papaparse (v5.4.1)
- Biblioteca para parsing de arquivos CSV
- Tamanho: ~100KB
- Licença: MIT
- Documentação: https://www.papaparse.com/

### @types/papaparse (v5.3.14)
- Definições TypeScript para papaparse
- Tamanho: ~10KB
- Necessário para type safety

---

## 🎯 Verificação Final

Após instalar, execute:

```bash
# 1. Verificar instalação
npm list papaparse

# 2. Build do projeto
npm run build

# 3. Iniciar dev server
npm run dev
```

Se tudo estiver OK, você verá:
```
✓ built in 2.5s
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'papaparse'"
**Solução:** Execute novamente `npm install papaparse`

### Erro: "EACCES permission denied"
**Solução:** Use `sudo npm install papaparse @types/papaparse`

### Erro: "npm ERR! code ENOENT"
**Solução:** Verifique se está na pasta correta do projeto

### Servidor não reinicia
**Solução:** 
1. Pare o servidor (Ctrl+C)
2. Execute `npm run dev` novamente

---

## 📞 Precisa de Ajuda?

### Verifique
1. Você está na pasta correta do projeto?
2. O arquivo `package.json` existe?
3. A pasta `node_modules` existe?
4. Você tem permissão de escrita na pasta?

### Comandos Úteis
```bash
# Ver versão do npm
npm --version

# Ver versão do node
node --version

# Limpar cache
npm cache clean --force

# Reinstalar tudo
rm -rf node_modules package-lock.json
npm install
```

---

## ✅ Checklist

- [ ] Abri o terminal
- [ ] Naveguei até a pasta do projeto
- [ ] Executei `npm install papaparse @types/papaparse`
- [ ] Aguardei a instalação completar
- [ ] Verifiquei com `npm list papaparse`
- [ ] Reiniciei o servidor de desenvolvimento
- [ ] Testei o menu "Banco de Dados"
- [ ] Funcionalidade está funcionando!

---

## 🎉 Pronto!

Após instalar as dependências, o Menu Banco de Dados estará **100% funcional**!

---

**Execute agora:**
```bash
npm install papaparse @types/papaparse
```

**E depois:**
```bash
npm run dev
```

**Está pronto para usar! 🚀**
