# Integração Z-API - WhatsApp Business

## Visão Geral

Esta implementação adiciona funcionalidades completas de integração com WhatsApp através da Z-API, permitindo gerenciar conexões, configurações e status da instância WhatsApp Business diretamente pelo sistema.

## Funcionalidades Implementadas

### 1. Serviço Z-API (`src/services/zapiService.ts`)

- **Configurações Criptografadas**: Todas as credenciais são armazenadas de forma criptografada no Firestore
- **Gerenciamento de Instâncias**: Controle completo da instância Z-API
- **Status em Tempo Real**: Verificação do status da conexão e smartphone
- **QR Code**: Geração e exibição de QR Code para conexão
- **Código por Telefone**: Alternativa ao QR Code via número de telefone
- **Teste de Conexão**: Validação das credenciais antes de salvar

### 2. Componente de Configurações (`src/components/WhatsAppSettings.tsx`)

Interface moderna com três abas principais:

#### Aba Configuração
- Campos para ID da Instância, Token da API e Client Token
- Botão para mostrar/ocultar tokens sensíveis
- Validação e teste de conexão antes de salvar
- Criptografia automática dos dados

#### Aba Status
- Visualização do status da API (conectada/desconectada)
- Status do smartphone (conectado/aguardando)
- Indicadores visuais com cores e ícones
- Botão para atualizar status em tempo real

#### Aba Conexão
- Geração de QR Code para conectar WhatsApp
- Campo para obter código via telefone
- Instruções claras para o usuário
- Exibição responsiva do QR Code

### 3. Gerenciador de Configurações (`src/components/SettingsManager.tsx`)

Sistema de configurações centralizado com abas:
- **WhatsApp**: Configurações Z-API
- **Segurança**: Preparado para futuras implementações
- **Notificações**: Preparado para futuras implementações  
- **Banco de Dados**: Preparado para futuras implementações

### 4. Integração com Sistema

#### CustomSidebar
- Novo botão "Configurações" no sidebar
- Permissão restrita a gerentes e administradores
- Ícone dedicado com visual consistente

#### Dashboard
- Nova aba "settings" integrada ao sistema de navegação
- Controle de acesso por hierarquia
- Renderização condicional baseada em permissões

## Estrutura de Dados

### Firestore Collection: `settings/zapi`
```typescript
{
  instance: string,        // ID da instância (não criptografado)
  token: string,          // Token da API (criptografado)
  clientToken: string,    // Client Token (criptografado)
  encrypted: boolean,     // Flag indicando criptografia
  createdAt: Date,        // Data de criação
  updatedAt: Date         // Data da última atualização
}
```

### Tipos TypeScript
```typescript
interface ZApiConfig {
  instance: string;
  token: string;
  clientToken: string;
}

interface ZApiStatus {
  connected: boolean;
  error: string;
  smartphoneConnected: boolean;
}

interface ZApiQRCodeResponse {
  qrcode?: string;
  error?: string;
}
```

## Segurança

### Criptografia
- Tokens sensíveis são criptografados usando base64 com reversão de string
- Dados armazenados no Firestore são automaticamente criptografados
- Migração automática de localStorage para Firestore criptografado

### Controle de Acesso
- Acesso restrito a usuários com permissão `manage_department`
- Verificação de hierarquia no backend
- Interface adapta-se automaticamente às permissões do usuário

### Mascaramento
- Tokens são mascarados na interface (8 caracteres + pontos)
- Opção para mostrar/ocultar campos sensíveis
- Prevenção de exposição acidental de credenciais

## Como Usar

### 1. Configuração Inicial
1. Faça login como Gerente ou superior
2. Acesse "Configurações" no sidebar
3. Clique na aba "WhatsApp"
4. Insira suas credenciais Z-API:
   - ID da Instância
   - Token da API
   - Client Token
5. Clique em "Salvar Configurações"

### 2. Conectar WhatsApp
1. Acesse a aba "Conexão"
2. Clique em "Obter QR Code"
3. Escaneie o QR Code com seu WhatsApp
4. Ou use "Obter Código" via telefone

### 3. Verificar Status
1. Acesse a aba "Status"
2. Clique em "Verificar Status"
3. Verifique os indicadores de conexão

### 4. Gerenciar Configurações
- Use "Limpar" para remover todas as configurações
- Configurações são salvas automaticamente no Firestore
- Teste de conexão é executado antes de salvar

## Endpoints Z-API Utilizados

- `GET /status` - Verificar status da instância
- `GET /qr-code/image` - Obter QR Code
- `GET /phone-code/{phone}` - Obter código por telefone

## Tratamento de Erros

- Validação de campos obrigatórios
- Feedback visual com toasts
- Mensagens de erro específicas
- Fallbacks para cenários de falha
- Logs detalhados no console

## Responsividade

- Layout responsivo para todos os dispositivos
- Grid adaptável para diferentes tamanhos de tela
- QR Code redimensionável
- Sidebar colapsível mantém funcionalidade

## Próximos Passos

1. **Envio de Mensagens**: Implementar interface para envio de mensagens
2. **Webhooks**: Configurar recebimento de mensagens
3. **Templates**: Sistema de templates de mensagem
4. **Histórico**: Log de mensagens enviadas/recebidas
5. **Automação**: Respostas automáticas e chatbots
6. **Relatórios**: Analytics de uso do WhatsApp

## Dependências

- Firebase/Firestore (armazenamento)
- React/TypeScript (interface)
- Lucide React (ícones)
- Shadcn/ui (componentes)
- Sonner (notificações)

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console
2. Confirme as credenciais Z-API
3. Teste a conexão manualmente
4. Verifique permissões do usuário 