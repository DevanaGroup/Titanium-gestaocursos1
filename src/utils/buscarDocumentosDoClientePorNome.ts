import { getClients } from "@/services/clientService";
import { DocumentReference } from "@/types";

export async function buscarDocumentosDoClientePorNome(clientName: string): Promise<any[]> {
  const clients = await getClients();
  const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
  if (!client) throw new Error("Cliente não encontrado.");
  return client.documents || [];
}

// Função para buscar todos os clientes e um resumo dos documentos
export async function buscarResumoDeTodosDocumentos() {
  const clients = await getClients();
  return clients.map(client => ({
    id: client.id,
    name: client.name,
    documents: (client.documents || []).map((doc: any) => ({
      categoriaId: doc.categoriaId,
      categoriaNome: doc.categoriaNome,
      name: doc.name,
      subCategoriaId: doc.subCategoriaId,
      subCategoriaNome: doc.subCategoriaNome,
      uploadDate: doc.uploadDate
    }))
  }));
} 