# Sistema de Estrutura Separada - Data/Form

## Visão Geral

O sistema foi otimizado para enviar dados em uma estrutura separada, organizando melhor as informações entre metadados do sistema (`data`) e dados específicos do formulário (`form`).

## Estrutura do Payload

### Formato Geral
```json
{
  "data": {
    // Metadados do sistema
  },
  "form": {
    // Dados específicos do formulário
  }
}
```

### Objeto `data` (Metadados do Sistema)
```json
{
  "data": {
    "agentId": "23448",
    "thread": "thread_uuid_12345",
    "assistantId": "seia-master-id",
    "assistantName": "SEIA-MASTER",
    "messages": [
      {
        "content": "Dados iniciais coletados para elaboração de estudo ambiental",
        "role": "user",
        "timestamp": "2024-01-01T10:00:00.000Z"
      }
    ],
    "wait_execution": false,
    "timestamp": "2024-01-01T10:00:00.000Z"
  }
}
```

### Objeto `form` (Dados do Formulário)
```json
{
  "form": {
    "nomeempresa": "Cerrado Engenharia Ltda",
    "nomeprojeto": "Expansão da Unidade Industrial",
    "localizacao": "Rodovia GO-060, Km 15, Zona Industrial Norte...",
    "tipoestudo": "EIA/RIMA - Estudo de Impacto Ambiental",
    "termoreferencia": {
      "name": "TR_SEMA_2024_001.pdf",
      "content": "JVBERi0xLjQKJdPr6eEKMSAwa...",
      "type": "application/pdf",
      "size": 2048576
    },
    "documentacaotecnica": [...],
    "planilhasdados": [...],
    "fotoscampo": [...],
    "messages": [
      {
        "content": "Dados iniciais coletados para elaboração de estudo ambiental",
        "role": "user",
        "timestamp": "2024-01-01T10:00:00.000Z"
      }
    ]
  }
}
```

## Especificação dos Campos

### Campos do Objeto `data`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `agentId` | string | Sim | ID do agente de IA da API externa |
| `thread` | string | Sim | ID único da thread/conversa |
| `assistantId` | string | Sim | ID do assistente no sistema interno |
| `assistantName` | string | Sim | Nome do assistente |
| `messages` | array | Sim | Array de mensagens da conversa |
| `wait_execution` | boolean | Sim | Controle de execução assíncrona |
| `timestamp` | string | Sim | Timestamp ISO de criação |

### Campos do Objeto `form`

Os campos variam conforme o assistente, mas seguem padrões:

#### Campos de Texto
- **Naming**: lowercase, sem espaços
- **Validação**: conforme definido no assistente
- **Exemplo**: `nomeempresa`, `nomeprojeto`, `localizacao`

#### Campos de Dropdown
- **Formato**: string com valor selecionado
- **Exemplo**: `tipoestudo: "EIA/RIMA - Estudo de Impacto Ambiental"`

#### Campo Messages
- **Formato**: array de objetos com histórico da conversa
- **Estrutura**: `{content: string, role: 'user'|'assistant', timestamp: string}`
- **Disponível**: tanto em `data` quanto em `form`

#### Campos de Arquivo Único
```json
{
  "name": "documento.pdf",
  "content": "base64_encoded_content",
  "type": "application/pdf",
  "size": 1024000
}
```

#### Campos de Múltiplos Arquivos
```json
[
  {
    "name": "arquivo1.pdf",
    "content": "base64_content_1",
    "type": "application/pdf",
    "size": 512000
  },
  {
    "name": "arquivo2.xlsx",
    "content": "base64_content_2",
    "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "size": 256000
  }
]
```

## Vantagens da Nova Estrutura

### 1. Separação de Responsabilidades
- **Sistema**: Dados técnicos para rastreamento e controle
- **Formulário**: Dados específicos do domínio/negócio + contexto das mensagens

### 2. Melhor Organização
- Facilita processamento no n8n
- Permite validações específicas por contexto
- Reduz conflitos entre campos

### 3. Escalabilidade
- Novos campos podem ser adicionados sem impacto
- Suporte a múltiplos tipos de formulário
- Flexibilidade para diferentes assistentes

### 4. Rastreabilidade
- Informações completas de contexto
- Histórico de mensagens incluído
- Timestamps para auditoria

## Implementação Técnica

### Interface TypeScript
```typescript
interface WebhookPayload {
  data: {
    agentId: string;
    thread: string;
    assistantId: string;
    assistantName: string;
    messages: Message[];
    wait_execution: boolean;
    timestamp: string;
  };
  form: Record<string, any>;
}

interface Message {
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}
```

### Função de Criação
```typescript
const createWebhookPayload = (
  formData: Record<string, any>,
  assistant: Assistant,
  threadId: string,
  messages: Message[]
): WebhookPayload => {
  return {
    data: {
      agentId: assistant.agentId,
      thread: threadId,
      assistantId: assistant.id,
      assistantName: assistant.name,
      messages,
      wait_execution: false,
      timestamp: new Date().toISOString()
    },
    form: formData
  };
};
```

## Processamento no n8n

### Acesso aos Dados do Sistema
```javascript
// Obter agentId
const agentId = $json.data.agentId;

// Obter thread
const thread = $json.data.thread;

// Obter mensagens
const messages = $json.data.messages;
```

### Acesso aos Dados do Formulário
```javascript
// Obter dados específicos
const nomeEmpresa = $json.form.nomeempresa;
const projeto = $json.form.nomeprojeto;

// Processar arquivos
const termoReferencia = $json.form.termoreferencia;
const documentos = $json.form.documentacaotecnica;

// Obter mensagens (disponível tanto em data quanto em form)
const messagesFromData = $json.data.messages;
const messagesFromForm = $json.form.messages;
```

## Exemplos de Uso

### 1. Envio de Dados Iniciais
```json
{
  "data": {
    "agentId": "23448",
    "thread": "thread_abc123",
    "assistantId": "seia-master",
    "assistantName": "SEIA-MASTER",
    "messages": [
      {
        "content": "Dados iniciais coletados para elaboração de estudo ambiental",
        "role": "user",
        "timestamp": "2024-01-01T10:00:00.000Z"
      }
    ],
    "wait_execution": false,
    "timestamp": "2024-01-01T10:00:00.000Z"
  },
  "form": {
    "nomeempresa": "Cerrado Engenharia Ltda",
    "nomeprojeto": "Expansão Industrial",
    "localizacao": "Goiânia/GO",
    "tipoestudo": "EIA/RIMA",
    "messages": [
      {
        "content": "Dados iniciais coletados para elaboração de estudo ambiental",
        "role": "user",
        "timestamp": "2024-01-01T10:00:00.000Z"
      }
    ]
  }
}
```

### 2. Continuação da Conversa
```json
{
  "data": {
    "agentId": "23448",
    "thread": "thread_abc123",
    "assistantId": "seia-master",
    "assistantName": "SEIA-MASTER",
    "messages": [
      {
        "content": "Dados iniciais coletados para elaboração de estudo ambiental",
        "role": "user",
        "timestamp": "2024-01-01T10:00:00.000Z"
      },
      {
        "content": "Preciso de mais informações sobre o projeto",
        "role": "user",
        "timestamp": "2024-01-01T10:05:00.000Z"
      }
    ],
    "wait_execution": false,
    "timestamp": "2024-01-01T10:05:00.000Z"
  },
  "form": {
    // Dados do formulário original são mantidos
    "nomeempresa": "Cerrado Engenharia Ltda",
    "nomeprojeto": "Expansão Industrial",
    "localizacao": "Goiânia/GO",
    "tipoestudo": "EIA/RIMA",
    "messages": [
      {
        "content": "Dados iniciais coletados para elaboração de estudo ambiental",
        "role": "user",
        "timestamp": "2024-01-01T10:00:00.000Z"
      },
      {
        "content": "Preciso de mais informações sobre o projeto",
        "role": "user",
        "timestamp": "2024-01-01T10:05:00.000Z"
      }
    ]
  }
}
```

## Webhook Configuration

### Endpoint
```
POST https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24
```

### Headers
```
Content-Type: application/json
```

### Response Expected
```json
{
  "template_id": "template_123",
  "responses": [
    {
      "id": "response_456",
      "status": "success",
      "message": "Dados processados com sucesso"
    }
  ]
}
```

## Logs e Monitoramento

### Logs de Envio
```
📤 Payload estruturado para API: {
  data: { agentId: "23448", thread: "thread_abc123", ... },
  form: { nomeempresa: "Cerrado Engenharia", ... }
}
```

### Logs de Resposta
```
✅ Dados dinâmicos enviados com sucesso: {
  template_id: "template_123",
  responses: [...]
}
```

## Troubleshooting

### Erro: "agentId not found"
- Verificar se o assistente tem agentId configurado
- Confirmar que o agentId está no formato correto

### Erro: "thread invalid"
- Verificar se o thread foi gerado corretamente
- Confirmar que o thread é único por conversa

### Erro: "form data missing"
- Verificar se os dados do formulário foram coletados
- Confirmar que os campos obrigatórios foram preenchidos

## Próximos Passos

1. **Validação de Schema**: Implementar validação JSON Schema
2. **Retry Logic**: Sistema de retry para falhas temporárias
3. **Batch Processing**: Suporte a envio em lote
4. **Analytics**: Métricas de uso e performance 