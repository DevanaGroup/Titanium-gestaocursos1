import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function listCategories() {
  try {
    console.log('📋 LISTAGEM DE CATEGORIAS EXISTENTES\n');
    
    // Buscar categorias
    const categoriasSnapshot = await getDocs(collection(db, 'Categorias'));
    const categorias = categoriasSnapshot.docs.map(doc => ({
      id: doc.id,
      nome: doc.data().nome,
      descricao: doc.data().descricao || 'Sem descrição'
    }));
    
    console.log(`📁 Total de categorias: ${categorias.length}\n`);
    
    if (categorias.length === 0) {
      console.log('❌ Nenhuma categoria encontrada no sistema.');
      return;
    }
    
    console.log('📋 CATEGORIAS:');
    categorias.forEach((categoria, index) => {
      console.log(`   ${index + 1}. ${categoria.nome}`);
      console.log(`      ID: ${categoria.id}`);
      console.log(`      Descrição: ${categoria.descricao}`);
      console.log('');
    });
    
    // Buscar sub-categorias
    console.log('📂 SUB-CATEGORIAS:');
    const subCategoriasSnapshot = await getDocs(collection(db, 'SubCategorias'));
    const subCategorias = subCategoriasSnapshot.docs.map(doc => ({
      id: doc.id,
      nome: doc.data().nome,
      categoriaId: doc.data().categoriaId
    }));
    
    console.log(`📂 Total de sub-categorias: ${subCategorias.length}\n`);
    
    if (subCategorias.length === 0) {
      console.log('❌ Nenhuma sub-categoria encontrada no sistema.');
      return;
    }
    
    // Agrupar sub-categorias por categoria
    const subCategoriasPorCategoria = {};
    subCategorias.forEach(subCat => {
      if (!subCategoriasPorCategoria[subCat.categoriaId]) {
        subCategoriasPorCategoria[subCat.categoriaId] = [];
      }
      subCategoriasPorCategoria[subCat.categoriaId].push(subCat);
    });
    
    // Mostrar sub-categorias organizadas
    categorias.forEach(categoria => {
      const subCats = subCategoriasPorCategoria[categoria.id] || [];
      console.log(`📁 ${categoria.nome}:`);
      if (subCats.length === 0) {
        console.log('   (Nenhuma sub-categoria)');
      } else {
        subCats.forEach((subCat, index) => {
          console.log(`   ${index + 1}. ${subCat.nome}`);
        });
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar categorias:', error);
  }
}

// Executar o script
listCategories(); 