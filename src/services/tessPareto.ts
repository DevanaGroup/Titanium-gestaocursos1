interface TessFileResponse {
  id: number;
  object: string;
  bytes: number;
  created_at: string;
  filename: string;
  credits: number;
  status: string;
}

interface TessUploadError {
  error: string;
  message: string;
}

export class TessPareto {
  private apiKey: string;
  private baseUrl: string = 'https://tess.pareto.io/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Configura a API key dinamicamente
   * @param apiKey - Nova API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Verifica se a API key está configurada
   * @returns true se a API key está configurada
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'CONFIGURE_TESS_API_KEY_HERE';
  }

  /**
   * Faz upload de um arquivo para a API do Tess Pareto
   * @param file - Arquivo a ser enviado
   * @param process - Se deve processar o arquivo (padrão: false)
   * @returns Objeto com informações do arquivo enviado
   */
  async uploadFile(file: File, process: boolean = false): Promise<TessFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('process', process.toString());

    try {
      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json() as TessUploadError;
        throw new Error(`Erro no upload: ${errorData.message || response.statusText}`);
      }

      const result = await response.json() as TessFileResponse;
      return result;
    } catch (error) {
      console.error('Erro ao fazer upload para Tess Pareto:', error);
      throw error;
    }
  }

  /**
   * Faz upload de múltiplos arquivos
   * @param files - Array de arquivos
   * @param process - Se deve processar os arquivos
   * @returns Array com informações dos arquivos enviados
   */
  async uploadMultipleFiles(files: File[], process: boolean = false): Promise<TessFileResponse[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, process));
    
    try {
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Erro ao fazer upload de múltiplos arquivos:', error);
      throw error;
    }
  }

  /**
   * Verifica o status de um arquivo
   * @param fileId - ID do arquivo
   * @returns Status do arquivo
   */
  async getFileStatus(fileId: number): Promise<TessFileResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao verificar status: ${response.statusText}`);
      }

      const result = await response.json() as TessFileResponse;
      return result;
    } catch (error) {
      console.error('Erro ao verificar status do arquivo:', error);
      throw error;
    }
  }

  /**
   * Processa um arquivo enviado para o Tess Pareto
   * @param fileId - ID do arquivo a ser processado
   * @returns Resultado do processamento
   */
  async processFile(fileId: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro no processamento: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      throw error;
    }
  }

  /**
   * Processa múltiplos arquivos
   * @param fileIds - Array de IDs dos arquivos
   * @returns Array com resultados do processamento
   */
  async processMultipleFiles(fileIds: number[]): Promise<any[]> {
    const processPromises = fileIds.map(fileId => this.processFile(fileId));
    
    try {
      const results = await Promise.all(processPromises);
      return results;
    } catch (error) {
      console.error('Erro ao processar múltiplos arquivos:', error);
      throw error;
    }
  }

  /**
   * Faz upload e processa automaticamente um arquivo
   * @param file - Arquivo a ser enviado
   * @param autoProcess - Se deve processar automaticamente após upload
   * @returns Objeto com informações do arquivo e resultado do processamento
   */
  async uploadAndProcessFile(file: File, autoProcess: boolean = true): Promise<{ file: TessFileResponse, processResult?: any }> {
    try {
      // Primeiro faz o upload
      const uploadResult = await this.uploadFile(file, false);
      
      let processResult;
      if (autoProcess) {
        // Aguarda um momento para o arquivo estar disponível
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Processa o arquivo
        processResult = await this.processFile(uploadResult.id);
      }

      return {
        file: uploadResult,
        processResult
      };
    } catch (error) {
      console.error('Erro ao fazer upload e processar arquivo:', error);
      throw error;
    }
  }
}

// Instância singleton com API key configurada
export const tessPareto = new TessPareto('AUycRNfJxPbEtWp323ihZXwpTW1WBX6WrRev1qehe2c3db11');

// Tipos exportados
export type { TessFileResponse, TessUploadError }; 