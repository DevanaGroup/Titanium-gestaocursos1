# Sistema de Campos Dinâmicos com Integração Webhook

## Resumo do Sistema

O sistema implementa coleta de dados estruturados através de formulários dinâmicos para assistentes IA, com integração automática via webhook para n8n e API Tess.Pareto.

## Componentes Implementados

### 1. Estrutura de Dados
- **DynamicField**: Interface para campos dinâmicos
- **FieldType**: Tipos suportados ('text', 'textarea', 'dropdown', 'file', 'multiple-files')
- **Assistant**: Expandida para incluir `dynamicFields?: DynamicField[]`

### 2. Componentes React
- **CustomChatInterface**: Interface principal com formulário dinâmico
- **WebhookDataPreview**: Preview dos dados que serão enviados
- **WebhookTester**: Teste da integração com webhook
- **IntegrationStatusCard**: Status em tempo real da integração

### 3. Assistente SEIA-MASTER
Criado assistente especializado em estudos ambientais com 8 campos:

1. **Nome da Empresa** (text, obrigatório)
2. **Nome do Projeto** (text, obrigatório)
3. **Localização** (textarea, obrigatório)
4. **Tipo de Estudo** (dropdown, obrigatório)
   - EIA/RIMA, MCE, PCA, RAS, etc.
5. **Termo de Referência** (file, PDF, obrigatório)
6. **Documentação Técnica** (multiple-files, PDF/DOC, opcional)
7. **Planilhas de Dados** (multiple-files, Excel/CSV, opcional)
8. **Fotografias de Campo** (multiple-files, imagens, opcional)

## Fluxo de Funcionamento

### 1. Coleta de Dados
1. Usuário seleciona assistente com campos dinâmicos
2. Interface mostra formulário ao invés do chat
3. Campos são validados em tempo real
4. Preview dos dados é mostrado conforme preenchimento

### 2. Envio para Webhook
Dados são formatados no padrão da API:
```json
{
  "nomeempresa": "Cerrado Engenharia Ltda",
  "nomeprojeto": "Expansão Industrial",
  "localizacao": "Goiânia/GO",
  "tipoestudo": "EIA/RIMA",
  "termoreferencia": "TR_001.pdf",
  "documentacaotecnica": "doc1.pdf, doc2.pdf",
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

### 3. Integração com n8n
- **Webhook URL**: `https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24`
- **Método**: POST
- **Headers**: Content-Type: application/json
- **Resposta**: Template ID 24667, Response ID, Status "starting"

### 4. Transição para Chat
Após envio dos dados:
1. Formulário é substituído pelo chat
2. Primeira mensagem é enviada automaticamente
3. Dados dinâmicos são mantidos na conversa
4. Todas as mensagens subsequentes incluem os dados iniciais

## Arquivos Modificados

### Services
- `assistantService.ts`: Suporte a campos dinâmicos
- `messageHistoryService.ts`: Armazenamento de dados dinâmicos

### Components
- `CustomChatInterface.tsx`: Interface principal com formulário
- `AssistantSelection.tsx`: Seleção de assistentes
- `WebhookDataPreview.tsx`: Preview dos dados (novo)
- `WebhookTester.tsx`: Teste da integração (novo)
- `IntegrationStatusCard.tsx`: Status da integração (novo)

### Scripts
- `createSeiaMaster.ts`: Criação do assistente SEIA-MASTER
- `testWebhookIntegration.ts`: Teste da integração

## Validações Implementadas

### 1. Campos Obrigatórios
- Validação em tempo real
- Botão desabilitado se campos obrigatórios não preenchidos
- Mensagens de erro específicas

### 2. Tipos de Arquivo
- Validação de extensões permitidas
- Limite de tamanho (200MB para PDFs)
- Suporte a múltiplos arquivos

### 3. Formato de Dados
- Conversão automática para lowercase
- Tratamento de arrays de arquivos
- Estrutura padronizada para API

## Funcionalidades Principais

### 1. Coleta Inteligente
- Formulário adaptativo baseado na configuração
- Preview em tempo real dos dados
- Validação instantânea

### 2. Integração Automática
- Envio automático para webhook
- Formato compatível com API Tess.Pareto
- Logs detalhados para debugging

### 3. Interface Unificada
- Transição suave formulário → chat
- Manutenção dos dados na conversa
- Reset inteligente para nova conversa

## Testes e Monitoramento

### 1. Teste Manual
- Componente WebhookTester para verificar conectividade
- Payload de teste com dados realistas
- Validação de resposta da API

### 2. Logs do Sistema
- Console logs para debugging
- Toasts informativos para usuário
- Tratamento de erros de rede

### 3. Status Visual
- Card de status com progresso em tempo real
- Indicadores visuais de cada etapa
- Estatísticas de uso

## Próximos Passos

1. **Resposta da API**: Implementar processamento da resposta do webhook
2. **Notificações**: Sistema de notificações para status da análise
3. **Histórico**: Visualização do histórico de análises
4. **Templates**: Criação de templates de campos para outros tipos de estudo

## Configuração

### Webhook URL
```
https://devana-tecnologia-n8n.yrd2ng.easypanel.host/webhook-test/f7cdd969-03f4-456d-ac2d-1315ccb2fc24
```

### Template ID
```
24667 (Tess.Pareto API)
```

### Estrutura de Campos SEIA-MASTER
```typescript
const seiaFields: DynamicField[] = [
  {
    id: 'empresa',
    variableName: 'nomeEmpresa',
    label: 'Nome da Empresa',
    type: 'text',
    required: true,
    validation: { minLength: 3 }
  },
  // ... outros campos
];
```

## Conclusão

O sistema está completamente funcional e integrado, proporcionando uma experiência fluida de coleta de dados estruturados com envio automático para processamento via webhook. A interface é intuitiva e o sistema é escalável para outros tipos de assistentes especializados. 