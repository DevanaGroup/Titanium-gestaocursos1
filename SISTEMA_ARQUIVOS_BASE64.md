# Sistema de Upload de Arquivos - Tess Pareto Integration

## Visão Geral

O sistema foi atualizado para enviar arquivos diretamente para a API do Tess Pareto antes de enviar os dados para o webhook. Isso permite que a IA acesse o conteúdo real dos documentos através do ID retornado pela API.

## Fluxo de Upload

1. **Upload para Tess Pareto**: Arquivos são enviados primeiro para `https://tess.pareto.io/api/files`
2. **Recebimento do ID**: API retorna objeto com ID único do arquivo
3. **Envio para Webhook**: ID do arquivo é enviado em vez do conteúdo base64

## Estrutura de Dados

### Nova Estrutura Separada

O sistema agora envia dados em uma estrutura separada com dois objetos principais:

```json
{
  "data": {
    "agentId": "23448",
    "thread": "thread_uuid_generated",
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
  },
  "form": {
    "nomeempresa": "Cerrado Engenharia Ltda",
    "nomeprojeto": "Expansão da Unidade Industrial",
    "localizacao": "Rodovia GO-060, Km 15...",
    "tipoestudo": "EIA/RIMA - Estudo de Impacto Ambiental",
    "termoreferencia": {
      "name": "TR_SEMA_2024_001.pdf",
      "content": "JVBERi0xLjQKJdPr6eEKMSAwa...",
      "type": "application/pdf",
      "size": 2048576
    },
    "documentacaotecnica": [
      {
        "name": "Memorial_Descritivo.pdf",
        "content": "JVBERi0xLjQKJdPr6eEKMSAwa...",
        "type": "application/pdf",
        "size": 1536000
      }
    ],
    "planilhasdados": [...],
    "fotoscampo": [...]
  }
}
```

### Vantagens da Nova Estrutura

1. **Separação de Responsabilidades**: 
   - `data`: Metadados do sistema (thread, agentId, mensagens)
   - `form`: Dados específicos do formulário

2. **Melhor Organização**: Facilita o processamento no n8n
3. **Escalabilidade**: Permite adicionar novos campos sem conflitos
4. **Rastreabilidade**: Inclui informações completas de contexto

## Campos do Objeto `data`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agentId` | string | ID do agente de IA (ex: "23448") |
| `thread` | string | ID único da conversa |
| `assistantId` | string | ID do assistente no sistema |
| `assistantName` | string | Nome do assistente |
| `messages` | array | Array de mensagens da conversa |
| `wait_execution` | boolean | Controle de execução |
| `timestamp` | string | Timestamp ISO da criação |

## Campos do Objeto `form`

Contém todos os campos dinâmicos definidos no assistente, com nomes em lowercase:

- `nomeempresa`: Nome da empresa
- `nomeprojeto`: Nome do projeto
- `localizacao`: Localização detalhada
- `tipoestudo`: Tipo de estudo ambiental
- `termoreferencia`: Arquivo único (PDF)
- `documentacaotecnica`: Array de arquivos (PDFs/DOCs)
- `planilhasdados`: Array de planilhas (Excel/CSV)
- `fotoscampo`: Array de imagens (JPG/PNG)

## Processamento de Arquivos

### Upload para Tess Pareto

#### Requisição
```http
POST https://tess.pareto.io/api/files
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data

file: [arquivo binário]
process: false
```

#### Resposta
```json
{
  "id": 73325,
  "object": "file",
  "bytes": 35504128,
  "created_at": "2025-01-05T22:26:27+00:00",
  "filename": "endpoints.pdf",
  "credits": 0,
  "status": "waiting"
}
```

### Formato no Webhook

#### Arquivo Único
```json
{
  "id": 73325,
  "object": "file",
  "bytes": 35504128,
  "created_at": "2025-01-05T22:26:27+00:00",
  "filename": "endpoints.pdf",
  "credits": 0,
  "status": "waiting"
}
```

#### Múltiplos Arquivos
```json
[
  {
    "id": 73325,
    "object": "file",
    "bytes": 2048576,
    "created_at": "2025-01-05T22:26:27+00:00",
    "filename": "documento1.pdf",
    "credits": 0,
    "status": "waiting"
  },
  {
    "id": 73326,
    "object": "file",
    "bytes": 1536000,
    "created_at": "2025-01-05T22:26:28+00:00",
    "filename": "documento2.xlsx",
    "credits": 0,
    "status": "waiting"
  }
]
```

## Webhook Integration

### Endpoint
```
POST https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24
```

### Headers
```
Content-Type: application/json
```

### Body
Estrutura JSON com `data` e `form` conforme exemplos acima.

## Configuração

### API Key do Tess Pareto

#### Opção 1: Configuração Dinâmica
```typescript
import { tessPareto } from '@/services/tessPareto';

// Configurar API key
tessPareto.setApiKey('YOUR_TESS_PARETO_API_KEY');
```

#### Opção 2: Variável de Ambiente
```env
TESS_API_KEY=your_tess_pareto_api_key_here
```

#### Verificar Configuração
```typescript
if (tessPareto.isConfigured()) {
  console.log('✅ Tess Pareto configurado');
} else {
  console.log('⚠️ Tess Pareto não configurado');
}
```

## Implementação Técnica

### Upload para Tess Pareto
```typescript
import { tessPareto } from '@/services/tessPareto';

// Upload de arquivo único
const response = await tessPareto.uploadFile(file, false);
console.log('Arquivo enviado:', response);

// Upload de múltiplos arquivos
const responses = await tessPareto.uploadMultipleFiles(files, false);
console.log('Arquivos enviados:', responses);
```

### Estrutura de Dados
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
```

## Validações

### Tamanho de Arquivos
- Arquivo único: máximo 200MB
- Múltiplos arquivos: máximo 50MB cada
- Total por requisição: máximo 500MB

### Tipos Suportados
- **PDFs**: application/pdf
- **Word**: application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- **Excel**: application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- **CSV**: text/csv
- **Imagens**: image/jpeg, image/png, image/gif

## Logs e Monitoramento

O sistema gera logs detalhados para acompanhar o processamento:

```
📤 Payload estruturado para API: {
  data: { agentId: "23448", thread: "...", ... },
  form: { nomeempresa: "...", termoreferencia: {...}, ... }
}
```

## Benefícios da Integração Tess Pareto

### 1. Acesso Direto ao Conteúdo
- IA acessa conteúdo real dos documentos via ID
- Não há limitações de tamanho do payload
- Processamento mais eficiente

### 2. Fallback Automático
- Se Tess Pareto não configurado, usa base64
- Sistema resiliente a falhas de upload
- Garantia de funcionamento

### 3. Performance
- Uploads paralelos para múltiplos arquivos
- Redução significativa do tamanho do payload
- Processamento mais rápido

## Casos de Uso

### 1. Estudos Ambientais (SEIA-MASTER)
- Upload de PDFs técnicos para análise detalhada
- Processamento de planilhas de dados ambientais
- Análise de imagens de campo
- Integração com fluxos de automação

### 2. Extensibilidade
- Novos assistentes podem definir campos próprios
- Suporte a diferentes tipos de arquivo
- Integração com múltiplos webhooks
- API unificada para upload de arquivos

## Troubleshooting

### Erro: "Arquivo muito grande"
- Verificar limite de 200MB por arquivo
- Considerar compressão se necessário

### Erro: "Tipo de arquivo não suportado"
- Verificar lista de tipos suportados
- Converter arquivo se necessário

### Erro: "Falha na conversão base64"
- Verificar integridade do arquivo
- Tentar novamente o upload

## Próximos Passos

1. **Análise de Conteúdo**: IA processa o conteúdo real dos arquivos
2. **Otimização**: Compressão automática para arquivos grandes
3. **Mais Tipos**: Suporte a mais formatos de arquivo
4. **Backup**: Sistema de backup dos dados enviados 