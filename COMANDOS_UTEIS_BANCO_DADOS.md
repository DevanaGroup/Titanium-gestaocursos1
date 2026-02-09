# 🛠️ Comandos Úteis - Menu Banco de Dados

## 📦 Instalação

### Instalar Dependências
```bash
# Instalar PapaParse
npm install papaparse

# Instalar tipos TypeScript
npm install --save-dev @types/papaparse

# Ou usar o script
bash INSTALAR_DEPENDENCIAS.sh
```

### Verificar Instalação
```bash
# Verificar se papaparse está instalado
npm list papaparse

# Verificar versão
npm list papaparse --depth=0
```

---

## 🚀 Desenvolvimento

### Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```

### Build para Produção
```bash
npm run build
```

### Preview da Build
```bash
npm run preview
```

---

## 🔍 Debugging

### Verificar Logs do Console
```javascript
// No navegador, abra o Console (F12)
// Os logs de importação aparecerão aqui
```

### Verificar Firestore
```bash
# Acesse o Firebase Console
# https://console.firebase.google.com/

# Navegue até Firestore Database
# Verifique as coleções:
# - collaborators_unified
# - teachers
# - courses
# - lessons
# - agenda_events
# - tasks
```

---

## 🧪 Testes

### Testar Importação de Colaboradores
```bash
# 1. Baixe o modelo CSV
# 2. Preencha com dados de teste:

firstName,lastName,email,birthDate,hierarchyLevel,phone,whatsapp,address
Teste,Usuario,teste@email.com,1990-01-01,Nível 5,11999999999,11999999999,Rua Teste 123

# 3. Importe o arquivo
# 4. Verifique no Firestore
```

### Testar Validações
```bash
# Teste 1: Email inválido
firstName,lastName,email,birthDate,hierarchyLevel,phone,whatsapp,address
Teste,Usuario,email-invalido,1990-01-01,Nível 5,11999999999,11999999999,Rua Teste 123

# Resultado esperado: ❌ Erro - Email inválido

# Teste 2: Campo obrigatório faltando
firstName,lastName,email,birthDate,hierarchyLevel,phone,whatsapp,address
,Silva,joao@email.com,1990-01-01,Nível 5,11999999999,11999999999,Rua Teste 123

# Resultado esperado: ❌ Erro - Nome obrigatório

# Teste 3: Duplicata
firstName,lastName,email,birthDate,hierarchyLevel,phone,whatsapp,address
João,Silva,joao@email.com,1990-01-01,Nível 5,11999999999,11999999999,Rua Teste 123
Maria,Santos,joao@email.com,1985-05-20,Nível 4,11988888888,11988888888,Rua Teste 456

# Resultado esperado: ⚠️ Aviso - Email já existe
```

---

## 🗄️ Firestore

### Consultar Dados via Console
```javascript
// No Console do Firebase, use a aba Firestore
// Ou via código:

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Buscar todos os colaboradores
const querySnapshot = await getDocs(collection(db, 'collaborators_unified'));
querySnapshot.forEach((doc) => {
  console.log(doc.id, ' => ', doc.data());
});
```

### Limpar Dados de Teste
```javascript
// CUIDADO: Isso apaga TODOS os documentos da coleção!

import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const querySnapshot = await getDocs(collection(db, 'collaborators_unified'));
querySnapshot.forEach(async (doc) => {
  await deleteDoc(doc.ref);
});
```

---

## 📊 Monitoramento

### Ver Logs de Importação
```javascript
// Os logs aparecem no console do navegador
// Formato:
// ✅ Sucesso: 97 registros
// ❌ Falhas: 3 registros
// Erros:
//   • Linha 5: Email inválido
//   • Linha 12: Campo obrigatório
```

### Verificar Performance
```javascript
// No Console do navegador (F12)
// Aba Performance
// Grave durante a importação
// Analise o tempo de processamento
```

---

## 🔧 Manutenção

### Adicionar Novo Tipo de Importação

#### 1. Criar Função de Importação
```typescript
// src/services/bulkImportService.ts

export const importNOVO_TIPOFromCSV = async (
  file: File,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  try {
    const data = await parseCSV(file);
    const total = data.length;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      onProgress({
        current: i + 1,
        total,
        currentItem: row.name || "",
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        warnings: result.warnings,
      });

      try {
        // Validações
        if (!row.campo_obrigatorio) {
          throw new Error("Campo obrigatório");
        }

        // Inserir no Firestore
        await addDoc(collection(db, "colecao_firestore"), {
          campo1: row.campo1,
          campo2: row.campo2,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }
  } catch (error: any) {
    result.errors.push(`Erro ao processar arquivo: ${error.message}`);
  }

  return result;
};
```

#### 2. Criar Template CSV
```typescript
// src/utils/csvTemplates.ts

export const downloadNOVO_TIPOTemplate = () => {
  const headers = ["campo1", "campo2", "campo3"];
  const exampleRow = ["Exemplo 1", "Exemplo 2", "Exemplo 3"];
  const csv = [headers.join(","), exampleRow.join(",")].join("\n");
  downloadCSV("modelo_novo_tipo.csv", csv);
};
```

#### 3. Adicionar Tab na Interface
```typescript
// src/pages/AdminDatabase.tsx

// Adicionar no TabsList:
<TabsTrigger value="novo_tipo" className="flex items-center gap-2">
  <Icon className="h-4 w-4" />
  <span className="hidden sm:inline">Novo Tipo</span>
</TabsTrigger>

// Adicionar TabsContent:
<TabsContent value="novo_tipo">
  <ImportTabContent
    title="Novo Tipo"
    description="Importe novo tipo em massa via CSV"
    type="novo_tipo"
    onImport={handleCSVImport}
    onDownloadTemplate={handleDownloadTemplate}
    isImporting={isImporting}
  />
</TabsContent>

// Adicionar case no handleCSVImport:
case "novo_tipo":
  result = await importNOVO_TIPOFromCSV(file, (progress) => {
    setImportProgress(progress);
  });
  break;

// Adicionar case no handleDownloadTemplate:
case "novo_tipo":
  downloadNOVO_TIPOTemplate();
  break;
```

---

## 🐛 Troubleshooting

### Problema: Importação Lenta
```bash
# Solução 1: Reduzir tamanho do arquivo
# Importe em lotes menores (ex: 100 registros por vez)

# Solução 2: Otimizar validações
# Remova validações desnecessárias

# Solução 3: Usar batch writes
# Agrupe múltiplas escritas no Firestore
```

### Problema: Erro de Permissão no Firestore
```javascript
// Verifique as regras do Firestore
// Firebase Console > Firestore > Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /collaborators_unified/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Problema: CSV não é reconhecido
```bash
# Verifique o encoding do arquivo
# Deve ser UTF-8

# No Excel:
# Salvar Como > CSV UTF-8 (Delimitado por vírgulas)

# No Google Sheets:
# Arquivo > Fazer download > Valores separados por vírgula (.csv)
```

---

## 📝 Scripts Úteis

### Script para Criar Usuário Nível 0
```javascript
// Execute no Console do Firebase

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const userId = 'SEU_USER_ID_AQUI';
await updateDoc(doc(db, 'users', userId), {
  hierarchyLevel: 'Nível 0'
});

console.log('Usuário atualizado para Nível 0');
```

### Script para Backup de Dados
```javascript
// Exportar dados antes de importação em massa

import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

const backup = async (collectionName) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  const data = [];
  querySnapshot.forEach((doc) => {
    data.push({ id: doc.id, ...doc.data() });
  });
  
  // Salvar em arquivo JSON
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_${collectionName}_${Date.now()}.json`;
  link.click();
};

// Usar:
backup('collaborators_unified');
```

---

## 🔐 Segurança

### Verificar Acesso
```typescript
// Verificar se usuário tem Nível 0
import { getLevelNumber } from '@/utils/hierarchyUtils';

const levelNum = getLevelNumber(userRole);
if (levelNum !== 0) {
  console.error('Acesso negado');
  navigate('/dashboard');
}
```

### Validar Dados Antes de Importar
```typescript
// Adicionar validações extras
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const regex = /^\d{10,11}$/;
  return regex.test(phone.replace(/\D/g, ''));
};
```

---

## 📚 Recursos Adicionais

### Documentação PapaParse
```bash
# Site oficial
https://www.papaparse.com/

# Exemplos
https://www.papaparse.com/demo

# GitHub
https://github.com/mholt/PapaParse
```

### Documentação Firebase
```bash
# Firestore
https://firebase.google.com/docs/firestore

# Batch Writes
https://firebase.google.com/docs/firestore/manage-data/transactions

# Security Rules
https://firebase.google.com/docs/firestore/security/get-started
```

---

## 🎯 Checklist de Deploy

- [ ] Instalar dependências em produção
- [ ] Configurar variáveis de ambiente
- [ ] Verificar regras do Firestore
- [ ] Testar importação em staging
- [ ] Fazer backup dos dados
- [ ] Configurar usuários Nível 0
- [ ] Documentar processo para equipe
- [ ] Monitorar logs após deploy

---

**Comandos prontos para uso! 🛠️**
