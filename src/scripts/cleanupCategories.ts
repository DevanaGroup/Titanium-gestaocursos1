import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';

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

// Categorias originais que devem ser mantidas
const categoriasOriginais = [
  "Projetos Técnicos",
  "Gestão do Processo de Licenciamento", 
  "Planejamento e Viabilidade Ambiental",
  "Regularização e Manejo Ambiental",
  "Tratamento de Efluentes",
  "Loteamentos e Expansão Industrial",
  "Licenciamento Ambiental",
  "Curriculos"
];

async function cleanupCategories() {
  try {
    console.log('🧹 LIMPEZA DE CATEGORIAS - Mantendo apenas as originais\n');
    
    // Buscar todas as categorias
    const categoriasSnapshot = await getDocs(collection(db, 'Categorias'));
    const todasCategorias = categoriasSnapshot.docs.map(doc => ({
      id: doc.id,
      nome: doc.data().nome
    }));
    
    console.log('📋 Categorias encontradas:');
    todasCategorias.forEach((cat, index) => {
      const isOriginal = categoriasOriginais.includes(cat.nome);
      console.log(`   ${index + 1}. ${cat.nome} ${isOriginal ? '✅ (ORIGINAL)' : '❌ (REMOVER)'}`);
    });
    
    // Identificar categorias para remover
    const categoriasParaRemover = todasCategorias.filter(cat => !categoriasOriginais.includes(cat.nome));
    
    if (categoriasParaRemover.length === 0) {
      console.log('\n✅ Todas as categorias são originais. Nada a remover.');
      return;
    }
    
    console.log(`\n🗑️ Categorias a remover: ${categoriasParaRemover.length}`);
    categoriasParaRemover.forEach(cat => {
      console.log(`   - ${cat.nome} (ID: ${cat.id})`);
    });
    
    // Verificar se há documentos usando essas categorias
    console.log('\n🔍 Verificando documentos...');
    const documentosSnapshot = await getDocs(collection(db, 'documents'));
    const documentosComCategoria = documentosSnapshot.docs.filter(doc => {
      const data = doc.data();
      return categoriasParaRemover.some(cat => data.categoriaId === cat.id);
    });
    
    if (documentosComCategoria.length > 0) {
      console.log(`⚠️  ATENÇÃO: ${documentosComCategoria.length} documentos usam categorias que serão removidas!`);
      console.log('❌ Não é possível remover categorias em uso.');
      return;
    }
    
    // Remover sub-categorias primeiro
    console.log('\n🗑️ Removendo sub-categorias das categorias a remover...');
    let subCategoriasRemovidas = 0;
    
    for (const categoria of categoriasParaRemover) {
      const subCategoriasSnapshot = await getDocs(
        query(collection(db, 'SubCategorias'), where('categoriaId', '==', categoria.id))
      );
      
      for (const subCat of subCategoriasSnapshot.docs) {
        try {
          await deleteDoc(doc(db, 'SubCategorias', subCat.id));
          console.log(`   ✅ Removida sub-categoria: ${subCat.data().nome}`);
          subCategoriasRemovidas++;
        } catch (error) {
          console.error(`   ❌ Erro ao remover sub-categoria ${subCat.data().nome}:`, error);
        }
      }
    }
    
    // Remover categorias
    console.log('\n🗑️ Removendo categorias...');
    let categoriasRemovidas = 0;
    
    for (const categoria of categoriasParaRemover) {
      try {
        await deleteDoc(doc(db, 'Categorias', categoria.id));
        console.log(`   ✅ Removida categoria: ${categoria.nome}`);
        categoriasRemovidas++;
      } catch (error) {
        console.error(`   ❌ Erro ao remover categoria ${categoria.nome}:`, error);
      }
    }
    
    // Resumo final
    console.log('\n📊 RESUMO DA LIMPEZA:');
    console.log(`   🗑️ Categorias removidas: ${categoriasRemovidas}`);
    console.log(`   🗑️ Sub-categorias removidas: ${subCategoriasRemovidas}`);
    console.log(`   ✅ Categorias mantidas: ${categoriasOriginais.length}`);
    
    console.log('\n✅ Limpeza concluída! Apenas as categorias originais foram mantidas.');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar o script
cleanupCategories(); 