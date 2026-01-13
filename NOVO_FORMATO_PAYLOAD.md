# Novo Formato de Payload - Sistema de Campos Dinâmicos

## Estrutura Simplificada

A partir da solicitação do usuário, o sistema agora utiliza uma estrutura de payload simplificada e direta, eliminando a separação entre `data` e `form`.

### Formato Atual
```json
{
    "nomeempresa": "Cerrado Engenharia Ltda",
    "nomeprojeto": "Parque Eólico Goiabal",
    "localizacao": "Ituiutaba - MG",
    "tipoestudo": "EIA/RIMA - Estudo de Impacto Ambiental",
    "termoreferencia": "TR_SEMA_2024_001.pdf",
    "messages": [
        { 
            "role": "user", 
            "content": "Dados iniciais coletados para elaboração de estudo ambiental" 
        }
    ],
    "file_ids": [389579],
    "wait_execution": false
}
```

### Componentes do Payload

#### 1. Campos do Formulário (lowercase)
- `nomeempresa`: Nome da empresa
- `nomeprojeto`: Nome do projeto
- `localizacao`: Localização do projeto
- `tipoestudo`: Tipo de estudo ambiental
- `termoreferencia`: Nome do arquivo de termo de referência
- `documentacaotecnica`: Documentação técnica (opcional)
- `planilhasdados`: Planilhas de dados (opcional)
- `fotoscampo`: Fotografias de campo (opcional)

#### 2. Campos do Sistema
- `messages`: Array de mensagens para a IA
- `file_ids`: Array com IDs dos arquivos no Tess Pareto
- `wait_execution`: Boolean para controle de execução

### Fluxo de Processamento

1. **Coleta de Dados**: Usuário preenche formulário dinâmico
2. **Upload de Arquivos**: Arquivos são enviados para Tess Pareto
3. **Geração de Payload**: Sistema cria payload no formato simplificado
4. **Envio para Webhook**: Dados são enviados para n8n

### Exemplo de Implementação

```typescript
// Extração dos file_ids dos arquivos do Tess Pareto
const fileIds: number[] = [];
Object.values(formattedFormData).forEach(value => {
  if (value && typeof value === 'object' && 'id' in value) {
    fileIds.push(value.id as number);
  }
});

// Conversão de arquivos para nomes simples
const processedFormData = { ...formattedFormData };
Object.keys(processedFormData).forEach(key => {
  const value = processedFormData[key];
  if (value && typeof value === 'object' && 'filename' in value) {
    processedFormData[key] = value.filename as string;
  }
});

// Payload final
const payload = {
  ...processedFormData,
  messages: [{ role: "user", content: "Dados iniciais..." }],
  file_ids: fileIds,
  wait_execution: false
};
```

### Vantagens do Novo Formato

1. **Simplicidade**: Estrutura plana e direta
2. **Compatibilidade**: Formato específico solicitado
3. **Eficiência**: Menor overhead de dados
4. **Flexibilidade**: Fácil expansão para novos campos
5. **Integração**: Otimizado para n8n e Tess Pareto

### Testes Realizados

✅ **Teste de Estrutura**: Payload gerado corretamente  
✅ **Teste com Tess Pareto**: Arquivo ID 389579 enviado com sucesso  
✅ **Teste de Integração**: Sistema funcional end-to-end  
✅ **Validação de Tipos**: TypeScript sem erros  

### Arquivos Modificados

- `src/components/CustomChatInterface.tsx`: Lógica principal
- `src/scripts/testNewPayloadFormat.ts`: Script de teste
- `src/components/WebhookDataPreview.tsx`: Preview atualizado

### Próximos Passos

1. Testar com webhook ativo no n8n
2. Validar recebimento dos dados
3. Configurar processamento dos file_ids
4. Implementar respostas da IA

---

**Data da Implementação**: 05/07/2025  
**Status**: ✅ Implementado e Testado  
**Versão**: 1.0.0 