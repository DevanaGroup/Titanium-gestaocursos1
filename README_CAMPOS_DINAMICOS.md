# Sistema de Campos Dinâmicos - Assistentes IA

> Sistema completo de coleta de dados estruturados para assistentes IA com integração webhook n8n

## ✨ Características

- 🎯 **Formulários Dinâmicos**: Campos configuráveis por assistente
- 📤 **Integração Webhook**: Envio automático para n8n
- 🔄 **Transição Suave**: Formulário → Chat sem interrupção
- 📊 **Preview em Tempo Real**: Visualização dos dados antes do envio
- ✅ **Validação Inteligente**: Campos obrigatórios e tipos de arquivo
- 🎨 **Interface Moderna**: UI/UX otimizada para produtividade

## 🚀 Como Usar

### 1. Selecionar Assistente
```bash
# Acesse a interface de seleção
npm run dev → http://localhost:8081
```

### 2. Preencher Formulário
- Campos obrigatórios são marcados com **asterisco**
- Preview dos dados aparece automaticamente
- Botão fica desabilitado até campos obrigatórios serem preenchidos

### 3. Enviar Dados
- Clique em "Enviar Dados e Iniciar Conversa"
- Dados são enviados para webhook automaticamente
- Interface transiciona para chat

## 🔧 Configuração

### Webhook Endpoint
```
https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24
```

### Formato de Dados
```json
{
  "nomeempresa": "string",
  "nomeprojeto": "string", 
  "localizacao": "string",
  "tipoestudo": "string",
  "termoreferencia": "arquivo.pdf",
  "documentacaotecnica": "arquivo1.pdf, arquivo2.pdf",
  "planilhasdados": "dados.xlsx",
  "fotoscampo": "foto1.jpg, foto2.jpg",
  "messages": [
    {
      "content": "Dados iniciais coletados",
      "role": "user"
    }
  ],
  "wait_execution": false
}
```

## 🏗️ Estrutura de Campo

```typescript
interface DynamicField {
  id: string;
  variableName: string;  // Nome da variável (será lowercase na API)
  label: string;         // Rótulo exibido
  type: FieldType;       // Tipo do campo
  required: boolean;     // Se é obrigatório
  placeholder?: string;  // Placeholder
  description?: string;  // Descrição/ajuda
  options?: string[];    // Para dropdown
  validation?: {
    minLength?: number;
    maxLength?: number;
    fileTypes?: string[];
    maxSize?: number;
  };
}
```

## 📋 Tipos de Campo

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `text` | Campo de texto simples | Nome da empresa |
| `textarea` | Área de texto multilinha | Localização detalhada |
| `dropdown` | Lista suspensa | Tipo de estudo |
| `file` | Upload de arquivo único | Termo de referência |
| `multiple-files` | Upload múltiplos arquivos | Documentação técnica |

## 🎯 Assistente SEIA-MASTER

### Campos Configurados
1. **Nome da Empresa** (text, obrigatório)
2. **Nome do Projeto** (text, obrigatório) 
3. **Localização** (textarea, obrigatório)
4. **Tipo de Estudo** (dropdown, obrigatório)
   - EIA/RIMA, MCE, PCA, RAS, PBA, etc.
5. **Termo de Referência** (file PDF, obrigatório)
6. **Documentação Técnica** (multiple-files PDF/DOC, opcional)
7. **Planilhas de Dados** (multiple-files Excel/CSV, opcional)
8. **Fotografias de Campo** (multiple-files imagens, opcional)

### Usar o SEIA-MASTER
```bash
# 1. Executar aplicação
npm run dev

# 2. Selecionar "SEIA-MASTER"
# 3. Preencher formulário com dados do projeto ambiental
# 4. Enviar e conversar normalmente
```

## 🧪 Testes

### Teste Manual da Integração
```typescript
// Usar o WebhookTester component
<WebhookTester />
```

### Teste via Script
```bash
# Executar teste do webhook
npm run test:webhook
```

### Payload de Teste
```json
{
  "nomeempresa": "Cerrado Engenharia Ltda",
  "nomeprojeto": "Expansão da Unidade Industrial",
  "localizacao": "Goiânia/GO",
  "tipoestudo": "EIA/RIMA",
  "termoreferencia": "TR_001.pdf",
  "messages": [{"content": "Dados iniciais", "role": "user"}],
  "wait_execution": false
}
```

## 🔍 Monitoramento

### Logs do Console
```javascript
console.log('📤 Dados formatados para API:', formattedData);
console.log('✅ Webhook response:', webhookResponse);
console.error('❌ Erro ao enviar para webhook:', error);
```

### Status Visual
- Card de progresso com 4 etapas
- Indicadores visuais de cada fase
- Estatísticas em tempo real

## 📁 Arquivos Principais

```
src/
├── components/
│   ├── CustomChatInterface.tsx      # Interface principal
│   ├── AssistantSelection.tsx       # Seleção de assistentes
│   ├── WebhookDataPreview.tsx       # Preview dos dados
│   ├── WebhookTester.tsx            # Teste da integração
│   └── IntegrationStatusCard.tsx    # Status da integração
├── services/
│   ├── assistantService.ts          # Serviço de assistentes
│   └── messageHistoryService.ts     # Histórico de mensagens
└── scripts/
    ├── createSeiaMaster.ts          # Criar assistente SEIA-MASTER
    └── testWebhookIntegration.ts    # Teste da integração
```

## 🔧 Desenvolvimento

### Criar Novo Assistente com Campos
```typescript
const assistant = await createAssistant({
  name: "Meu Assistente",
  description: "Descrição do assistente",
  aiModel: "GPT-4 Turbo",
  agentId: "agent_123",
  dynamicFields: [
    {
      id: "campo1",
      variableName: "meuCampo",
      label: "Meu Campo",
      type: "text",
      required: true
    }
  ]
});
```

### Validações Personalizadas
```typescript
const validateFormData = () => {
  const requiredFields = fields.filter(f => f.required);
  const missingFields = requiredFields.filter(f => 
    !formData[f.variableName] || formData[f.variableName].trim() === ''
  );
  
  if (missingFields.length > 0) {
    toast.error(`Campos obrigatórios: ${missingFields.map(f => f.label).join(', ')}`);
    return false;
  }
  
  return true;
};
```

## 🚀 Deploy

### Webhook Configuration
```bash
# Configurar webhook URL no n8n
WEBHOOK_URL=https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24

# Configurar Template ID
TEMPLATE_ID=24667
```

### Variáveis de Ambiente
```env
VITE_WEBHOOK_URL=https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24
VITE_TEMPLATE_ID=24667
```

## 📞 Suporte

### Logs Importantes
- **Console do navegador**: Logs de envio e resposta
- **Network tab**: Verificar requisições HTTP
- **Toasts**: Mensagens de sucesso/erro

### Troubleshooting
1. **Webhook não responde**: Verificar conectividade
2. **Campos não salvam**: Verificar validações
3. **Transição falha**: Verificar estado do componente

## 🎉 Pronto para Usar!

O sistema está 100% funcional e integrado. Basta selecionar o assistente SEIA-MASTER e começar a usar! 