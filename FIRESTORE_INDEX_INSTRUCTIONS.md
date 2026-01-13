# Instruções para Criar Índice no Firestore

## 🔥 **ERRO ATUAL**
```
FirebaseError: The query requires an index. You can create it here: https://console...
```

## 🎯 **SOLUÇÃO**

### 1. **Acesse o Firebase Console**
- Link direto: https://console.firebase.google.com/project/cerrado-engenharia/firestore/indexes
- Ou navegue: Firebase Console → Firestore Database → Indexes

### 2. **Crie o Índice Composto**

**Clique em "Create Index" e configure:**

| Campo | Tipo | Ordem |
|-------|------|-------|
| Collection ID | `assistants` | - |
| userId | Single field | Ascending |
| createdAt | Single field | Descending |

### 3. **Aguarde a Criação**
- O índice leva alguns minutos para ser criado
- Status ficará "Building" → "Enabled"

### 4. **Após Criação do Índice**

Reative o orderBy no código:

```typescript
// Em src/services/assistantService.ts, linha ~65
const assistantsQuery = query(
  collection(db, ASSISTANTS_COLLECTION),
  where('userId', '==', userId),
  orderBy('createdAt', 'desc') // ← Reativar esta linha
);
```

### 5. **Teste Final**
- Recarregue a página
- Todos os assistentes devem aparecer
- Ordem cronológica correta (mais recentes primeiro)

## 🚨 **IMPORTANTE**
Sem este índice, a query falha e o sistema usa localStorage como fallback, resultando em assistentes não aparecendo.

## ✅ **Confirmação**
Quando funcionar, você verá no console:
```
✅ Encontrados X assistentes na coleção principal
``` 