export interface TeacherPaymentData {
  bank: string;        // Código + nome (ex: "001 - Banco do Brasil")
  bankCode?: string;   // Apenas código (001, 341, etc.)
  agency: string;      // Agência
  account: string;     // Conta Corrente (C/C)
  defaultValue: number; // Valor padrão por aula (R$)
  reference: string;   // Descrição padrão (ex: "Aula ministrada")
  paymentName: string; // Nome para fins de pagamento/nota
  cnpj: string;        // CNPJ ou CPF
  pix: string;         // Chave PIX
}
