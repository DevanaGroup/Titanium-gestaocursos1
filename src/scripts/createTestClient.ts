import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAVl9qEZUOxc6FVRZmM8ZHu-WlaU9TYEQE",
  authDomain: "cerrado-engenharia.firebaseapp.com",
  projectId: "cerrado-engenharia",
  storageBucket: "cerrado-engenharia.firebasestorage.app",
  messagingSenderId: "975123537185",
  appId: "1:975123537185:web:ec737ffd42df032dd5b260",
  measurementId: "G-B369H20BPQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestClient() {
  try {
    console.log('🏗️ Criando cliente de teste...\n');
    
    // Cliente de teste atribuído ao presidente
    const testClient = {
      name: "TESTE - Empresa de Teste",
      project: "Projeto de Teste para Debug",
      status: "Em andamento",
      contactName: "Contato de Teste",
      email: "teste@teste.com",
      phone: "(99) 99999-9999",
      address: "Endereço de Teste, 123",
      cpf: "",
      cnpj: "00.000.000/0001-00",
      assignedTo: "TyRG9NYt46Yy8TnjsBTr72YUNMK2", // ID do Alisson (Presidente)
      assignedToName: "Alisson Santana",
      documents: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('📄 Dados do cliente de teste:');
    console.log('   • Nome:', testClient.name);
    console.log('   • Projeto:', testClient.project);
    console.log('   • Status:', testClient.status);
    console.log('   • Atribuído a:', testClient.assignedToName);
    console.log('   • ID do usuário:', testClient.assignedTo);
    console.log('');
    
    const docRef = await addDoc(collection(db, "clients"), testClient);
    
    console.log('✅ Cliente de teste criado com sucesso!');
    console.log('🆔 ID do documento:', docRef.id);
    console.log('');
    
    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('1. Faça login como presidente no sistema');
    console.log('2. Acesse a página de Clientes');
    console.log('3. Verifique se o cliente de teste aparece na lista');
    console.log('4. Se aparecer, o problema estava na falta de clientes atribuídos');
    console.log('5. Se não aparecer, o problema está na lógica de permissões');
    console.log('');
    
    console.log('💡 DICA: Abra o console do browser (F12) para ver os logs detalhados');
    
  } catch (error) {
    console.error('❌ Erro ao criar cliente de teste:', error);
  }
}

// Executar a criação
createTestClient(); 