# Índices Necessários para o Firestore

## Problema
O aplicativo está apresentando erros relacionados à falta de índices compostos no Firestore. Quando você usa `where()` em um campo e `orderBy()` em outro campo diferente, o Firestore requer índices compostos específicos.

## Solução Implementada (Temporária)
- Removemos temporariamente o `orderBy()` das queries
- Implementamos ordenação no lado do cliente (JavaScript)
- Isso resolve o erro imediatamente, mas pode ser menos eficiente com grandes volumes de dados

## Índices que Precisam ser Criados

### 1. Coleção `prospects`
**Campo:** `assignedTo` (Ascending) + `updatedAt` (Descending)

**Link para criar:** 
```
https://console.firebase.google.com/v1/r/project/cerrado-engenharia/firestore/indexes?create_composite=ClRwcm9qZWN0cy9jZXJyYWRvLWVuZ2VuaGFyaWEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Byb3NwZWN0cy9pbmRleGVzL18QARoOCgphc3NpZ25lZFRvEAEaDQoJdXBkYXRlZEF0EAIaDAoIX19uYW1lX18QAg
```

### 2. Coleção `prospect_activities`
**Campo:** `createdBy` (Ascending) + `createdAt` (Descending)

**Link para criar:**
```
https://console.firebase.google.com/v1/r/project/cerrado-engenharia/firestore/indexes?create_composite=Cl5wcm9qZWN0cy9jZXJyYWRvLWVuZ2VuaGFyaWEvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Byb3NwZWN0X2FjdGl2aXRpZXMvaW5kZXhlcy9fEAEaDQoJY3JlYXRlZEJ5EAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg
```

## Como Criar os Índices

1. **Acesse o Firebase Console:** https://console.firebase.google.com/
2. **Selecione o projeto:** cerrado-engenharia
3. **Vá para Firestore Database**
4. **Clique na aba "Indexes"**
5. **Use os links fornecidos acima ou crie manualmente:**

### Para Prospects:
- Collection ID: `prospects`
- Field path: `assignedTo` | Array config: No | Order: Ascending
- Field path: `updatedAt` | Array config: No | Order: Descending
- Query scope: Collection

### Para Prospect Activities:
- Collection ID: `prospect_activities`
- Field path: `createdBy` | Array config: No | Order: Ascending
- Field path: `createdAt` | Array config: No | Order: Descending
- Query scope: Collection

## Depois de Criar os Índices

Uma vez criados os índices (pode levar alguns minutos), você pode reverter as mudanças temporárias:

1. Voltar a usar `orderBy()` nas queries
2. Remover a ordenação no cliente
3. Isso melhorará a performance das consultas

## Status dos Índices
- [ ] prospects (assignedTo + updatedAt)
- [ ] prospect_activities (createdBy + createdAt)

**Observação:** A criação de índices pode levar alguns minutos para ser concluída. O Firebase mostrará o status de "Building" até que estejam prontos para uso. 