import { db } from '@/config/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Tipos para a integração Z-API
export interface ZApiConfig {
  instance: string;
  token: string;
  clientToken: string;
}

export interface ZApiConfigFirestore {
  instance: string;
  token: string;
  clientToken: string;
  encrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ZApiStatus {
  connected: boolean;
  error: string;
  smartphoneConnected: boolean;
}

export interface ZApiQRCodeResponse {
  qrcode?: string; // base64 image
  error?: string;
}

export interface ZApiSendTextRequest {
  phone: string;
  message: string;
  delayMessage?: number;
  delayTyping?: number;
}

export interface ZApiSendTextResponse {
  zaapId: string;
  messageId: string;
  id: string;
}

// Classe para gerenciar configurações Z-API
class ZApiService {
  private config: ZApiConfig | null = null;

  // Função simples de criptografia (mesma lógica da OpenAI)
  private encrypt(text: string): string {
    return btoa(text.split('').reverse().join(''));
  }

  private decrypt(encryptedText: string): string {
    return atob(encryptedText).split('').reverse().join('');
  }

  // Carregar configurações do Firestore
  async loadConfig(): Promise<ZApiConfig | null> {
    try {
      const docRef = doc(db, 'settings', 'zapi');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ZApiConfigFirestore;
        
        // Descriptografar dados sensíveis
        const config: ZApiConfig = {
          instance: data.instance, // Instance ID não é criptografado
          token: this.decrypt(data.token),
          clientToken: this.decrypt(data.clientToken)
        };

        this.config = config;
        return config;
      }

      // Fallback: tentar carregar do localStorage (migração)
      const savedConfig = localStorage.getItem('zapi-config');
      if (savedConfig) {
        const localConfig = JSON.parse(savedConfig) as ZApiConfig;
        // Migrar para Firestore
        await this.saveConfig(localConfig);
        // Limpar localStorage após migração
        localStorage.removeItem('zapi-config');
        return localConfig;
      }

      return null;
    } catch (error) {
      console.error('Erro ao carregar configurações Z-API:', error);
      return null;
    }
  }

  // Salvar configurações no Firestore (criptografadas)
  async saveConfig(config: ZApiConfig): Promise<void> {
    try {
      // Validar dados obrigatórios
      if (!config.instance || !config.token || !config.clientToken) {
        throw new Error('Todos os campos são obrigatórios');
      }

      // Criptografar dados sensíveis
      const encryptedConfig: ZApiConfigFirestore = {
        instance: config.instance, // Instance ID pode ficar visível
        token: this.encrypt(config.token),
        clientToken: this.encrypt(config.clientToken),
        encrypted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'settings', 'zapi'), encryptedConfig);
      
      // Manter em memória para uso
      this.config = config;

      console.log('Configurações Z-API salvas no Firestore com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configurações Z-API:', error);
      throw new Error('Não foi possível salvar as configurações Z-API');
    }
  }

  // Verificar se as configurações estão completas
  async isConfigured(): Promise<boolean> {
    if (this.config) {
      return !!(this.config.instance && this.config.token && this.config.clientToken);
    }
    
    const config = await this.loadConfig();
    return !!(config?.instance && config?.token && config?.clientToken);
  }

  // Construir URL base da API
  private getBaseUrl(): string {
    if (!this.config) {
      throw new Error('Configurações Z-API não definidas');
    }
    return `https://api.z-api.io/instances/${this.config.instance}/token/${this.config.token}`;
  }

  // Headers padrão para requisições
  private getHeaders(): Record<string, string> {
    if (!this.config) {
      throw new Error('Configurações Z-API não definidas');
    }
    return {
      'Client-Token': this.config.clientToken,
      'Content-Type': 'application/json'
    };
  }

  // Verificar status da instância
  async getStatus(): Promise<ZApiStatus> {
    if (!(await this.isConfigured())) {
      throw new Error('Z-API não está configurado');
    }

    // Garantir que a configuração está carregada
    if (!this.config) {
      await this.loadConfig();
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/status`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return {
        connected: data.connected || false,
        error: data.error || '',
        smartphoneConnected: data.smartphoneConnected || false
      };
    } catch (error) {
      console.error('Erro ao verificar status Z-API:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        smartphoneConnected: false
      };
    }
  }

  // Obter QR Code como imagem base64
  async getQRCode(): Promise<ZApiQRCodeResponse> {
    if (!(await this.isConfigured())) {
      throw new Error('Z-API não está configurado');
    }

    // Garantir que a configuração está carregada
    if (!this.config) {
      await this.loadConfig();
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/qr-code/image`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta QR Code:', errorText);
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      // Verificar o content-type da resposta
      const contentType = response.headers.get('content-type');

      let qrcode: string;
      
      if (contentType && contentType.includes('application/json')) {
        // Se a resposta for JSON, extrair a propriedade do QR Code
        const data = await response.json();
        qrcode = data.value || data.qrcode || data.image || data.base64 || '';
      } else {
        // Se for texto/imagem direta
        qrcode = await response.text();
      }

      if (!qrcode) {
        throw new Error('QR Code vazio retornado pela API');
      }
      
      // Garantir que está no formato base64 correto
      let formattedQrCode = qrcode;
      if (!qrcode.startsWith('data:image')) {
        formattedQrCode = `data:image/png;base64,${qrcode}`;
      }
      
      return {
        qrcode: formattedQrCode
      };
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      return {
        error: error instanceof Error ? error.message : 'Erro ao obter QR Code'
      };
    }
  }

  // Obter código por telefone
  async getPhoneCode(phone: string): Promise<{ code?: string; error?: string }> {
    if (!(await this.isConfigured())) {
      throw new Error('Z-API não está configurado');
    }

    // Garantir que a configuração está carregada
    if (!this.config) {
      await this.loadConfig();
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/phone-code/${phone}`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return { code: data.code };
    } catch (error) {
      console.error('Erro ao obter código por telefone:', error);
      return {
        error: error instanceof Error ? error.message : 'Erro ao obter código'
      };
    }
  }

  // Testar conexão com as configurações fornecidas
  async testConnection(config: ZApiConfig): Promise<{ success: boolean; error?: string }> {
    const originalConfig = this.config;
    
    try {
      // Temporariamente usar as novas configurações
      this.config = config;
      
      const status = await this.getStatus();
      
      return {
        success: true,
        error: status.error || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao testar conexão'
      };
    } finally {
      // Restaurar configurações originais
      this.config = originalConfig;
    }
  }

  // Limpar configurações
  async clearConfig(): Promise<void> {
    try {
      await deleteDoc(doc(db, 'settings', 'zapi'));
      this.config = null;
      
      // Limpar também localStorage se existir (migração)
      localStorage.removeItem('zapi-config');
      
      console.log('Configurações Z-API removidas do Firestore');
    } catch (error) {
      console.error('Erro ao remover configurações Z-API:', error);
      throw new Error('Não foi possível remover as configurações Z-API');
    }
  }

  // Obter versão mascarada para exibição segura
  getMaskedToken(): string | null {
    if (!this.config?.token) return null;
    const token = this.config.token;
    return token.substring(0, 8) + '••••••••••••••••••••••••••••••••';
  }

  getMaskedClientToken(): string | null {
    if (!this.config?.clientToken) return null;
    const clientToken = this.config.clientToken;
    return clientToken.substring(0, 8) + '••••••••••••••••••••••••••••••••';
  }

  // Método para carregar configuração de forma síncrona (compatibilidade)
  loadConfigSync(): ZApiConfig | null {
    return this.config;
  }

  // Enviar mensagem de texto
  async sendText(request: ZApiSendTextRequest): Promise<ZApiSendTextResponse> {
    if (!(await this.isConfigured())) {
      throw new Error('Z-API não está configurado');
    }

    // Garantir que a configuração está carregada
    if (!this.config) {
      await this.loadConfig();
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/send-text`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          phone: request.phone,
          message: request.message,
          ...(request.delayMessage && { delayMessage: request.delayMessage }),
          ...(request.delayTyping && { delayTyping: request.delayTyping })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro Z-API ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      console.log('✅ Mensagem enviada via Z-API:', {
        zaapId: result.zaapId,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem via Z-API:', error);
      throw error;
    }
  }

  // Formatar número de telefone para o padrão Z-API
  formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se não começar com 55 (Brasil), adiciona
    if (!cleanPhone.startsWith('55')) {
      return `55${cleanPhone}`;
    }
    
    return cleanPhone;
  }
}

// Instância singleton do serviço
export const zapiService = new ZApiService(); 