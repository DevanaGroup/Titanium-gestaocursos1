// Utilitário para criptografia usando Web Crypto API nativa do navegador
// Mais seguro que bibliotecas externas e não requer dependências

/**
 * Gera uma chave de criptografia a partir de uma senha
 */
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt, // ArrayBuffer é um BufferSource válido
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa uma senha
 */
export async function encryptPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Gerar salt e iv aleatórios
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Deriva a chave usando uma senha mestra fixa (em produção, use uma chave mais robusta)
  const masterPassword = 'cerrado-web-genesis-2024-signature-key';
  const key = await deriveKey(masterPassword, saltBytes.buffer as ArrayBuffer);
  
  // Criptografar os dados
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  // Combinar salt + iv + dados criptografados
  const combined = new Uint8Array(saltBytes.length + iv.length + encryptedData.byteLength);
  combined.set(saltBytes, 0);
  combined.set(iv, saltBytes.length);
  combined.set(new Uint8Array(encryptedData), saltBytes.length + iv.length);
  
  // Converter para base64 para armazenar no Firestore
  return btoa(String.fromCharCode(...combined));
}

/**
 * Descriptografa uma senha
 */
export async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    // Converter de base64 para bytes
    const combined = new Uint8Array(
      atob(encryptedPassword).split('').map(char => char.charCodeAt(0))
    );
    
    // Extrair salt, iv e dados criptografados
    const saltBytes = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);
    
    // Deriva a mesma chave
    const masterPassword = 'cerrado-web-genesis-2024-signature-key';
    const key = await deriveKey(masterPassword, saltBytes.buffer as ArrayBuffer);
    
    // Descriptografar
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );
    
    // Converter de volta para string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Erro ao descriptografar senha:', error);
    throw new Error('Não foi possível descriptografar a senha');
  }
}

/**
 * Verifica se uma senha em texto plano corresponde a uma senha criptografada
 */
export async function verifyPassword(plainPassword: string, encryptedPassword: string): Promise<boolean> {
  try {
    const decryptedPassword = await decryptPassword(encryptedPassword);
    return plainPassword === decryptedPassword;
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
}