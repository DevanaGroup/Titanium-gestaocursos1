// Lista de bancos brasileiros com códigos BACEN/COMPE
// Formato: { code: string, name: string } - exibido como "001 - Banco do Brasil"

export interface BrazilianBank {
  code: string;
  name: string;
}

export const BRAZILIAN_BANKS: BrazilianBank[] = [
  { code: "001", name: "Banco do Brasil" },
  { code: "033", name: "Santander Brasil" },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "237", name: "Bradesco" },
  { code: "341", name: "Itaú Unibanco" },
  { code: "077", name: "Banco Inter" },
  { code: "260", name: "Nubank" },
  { code: "422", name: "Banco Safra" },
  { code: "208", name: "BTG Pactual" },
  { code: "380", name: "PicPay" },
  { code: "212", name: "Banco Original" },
  { code: "756", name: "Bancoob (Sicoob)" },
  { code: "748", name: "Sicredi" },
  { code: "655", name: "Banco Neon" },
  { code: "389", name: "Banco Mercantil" },
  { code: "336", name: "Banco C6" },
  { code: "290", name: "PagSeguro" },
  { code: "323", name: "Mercado Pago" },
  { code: "630", name: "Banco Smartbank" },
  { code: "637", name: "Banco Sofisa" },
  { code: "041", name: "Banco do Estado do RS" },
  { code: "004", name: "Banco do Nordeste" },
  { code: "070", name: "Banco de Brasília" },
  { code: "136", name: "Unicred Cooperativa" },
  { code: "246", name: "Banco ABC Brasil" },
  { code: "318", name: "Banco BMG" },
  { code: "505", name: "Banco Credit Suisse" },
  { code: "707", name: "Banco Daycoval" },
  { code: "739", name: "Banco Cetelem" },
  { code: "741", name: "Banco Ribeirão Preto" },
  { code: "745", name: "Banco Citibank" },
  { code: "746", name: "Banco Modal" },
  { code: "747", name: "Banco Rabobank" },
  { code: "751", name: "Scotiabank Brasil" },
  { code: "755", name: "Bank of America" },
  { code: "399", name: "HSBC" },
  { code: "184", name: "Banco Itaú BBA" },
  { code: "197", name: "Stone Pagamentos" },
].sort((a, b) => a.name.localeCompare(b.name));

export function getBankDisplay(bank: BrazilianBank): string {
  return `${bank.code} - ${bank.name}`;
}

export function findBankByCodeOrName(search: string): BrazilianBank[] {
  if (!search.trim()) return BRAZILIAN_BANKS;
  const normalized = search.toLowerCase().trim();
  return BRAZILIAN_BANKS.filter(
    (b) =>
      b.code.includes(normalized) ||
      b.name.toLowerCase().includes(normalized)
  );
}
