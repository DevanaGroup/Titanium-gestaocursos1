/**
 * Utilitário para redirecionamento do WhatsApp
 */

const WHATSAPP_NUMBER = '5561998645245'; // Número do WhatsApp com código do país

/**
 * Redireciona para o WhatsApp com uma mensagem pré-definida
 * @param message - Mensagem personalizada (opcional)
 */
export const redirectToWhatsApp = (message?: string) => {
  const defaultMessage = 'Olá! Preciso de uma conta no sistema da Cerrado Engenharia. Gostaria de mais informações sobre os serviços.';
  const finalMessage = message || defaultMessage;
  const encodedMessage = encodeURIComponent(finalMessage);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
};
/**
 * Mensagens pré-definidas para diferentes contextos
 */
export const WHATSAPP_MESSAGES = {
  GENERAL: 'Olá! Preciso de uma conta no sistema da Cerrado Engenharia. Gostaria de mais informações sobre os serviços.',
  SPECIALIST: 'Olá! Gostaria de falar com um especialista da Cerrado Engenharia sobre meu projeto ambiental.',
  SERVICES: 'Olá! Gostaria de conhecer os serviços da Cerrado Engenharia para meu empreendimento.',
  ACCOUNT: 'Olá! Preciso de uma conta no sistema da Cerrado Engenharia. Como posso proceder?'
} as const;

