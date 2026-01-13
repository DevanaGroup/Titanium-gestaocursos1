import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';

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

// Categorias padrão para documentos
const categoriasPadrao = [
  {
    nome: "Documentos Administrativos",
    descricao: "Documentos de gestão administrativa"
  },
  {
    nome: "Documentos Técnicos",
    descricao: "Documentos técnicos e projetos"
  },
  {
    nome: "Documentos Legais",
    descricao: "Documentos jurídicos e contratos"
  },
  {
    nome: "Documentos Financeiros",
    descricao: "Documentos contábeis e financeiros"
  },
  {
    nome: "Documentos Ambientais",
    descricao: "Estudos e relatórios ambientais"
  },
  {
    nome: "Documentos de Obra",
    descricao: "Documentos relacionados a obras e construções"
  },
  {
    nome: "Documentos de Cliente",
    descricao: "Documentos específicos do cliente"
  },
  {
    nome: "Outros",
    descricao: "Outros tipos de documentos"
  }
];

// Sub-categorias padrão
const subCategoriasPadrao = [
  // Documentos Administrativos
  { nome: "Contratos", categoriaId: "Documentos Administrativos" },
  { nome: "Procurações", categoriaId: "Documentos Administrativos" },
  { nome: "Autorizações", categoriaId: "Documentos Administrativos" },
  { nome: "Comunicados", categoriaId: "Documentos Administrativos" },
  
  // Documentos Técnicos
  { nome: "Projetos", categoriaId: "Documentos Técnicos" },
  { nome: "Especificações", categoriaId: "Documentos Técnicos" },
  { nome: "Memoriais", categoriaId: "Documentos Técnicos" },
  { nome: "Cálculos", categoriaId: "Documentos Técnicos" },
  { nome: "Desenhos", categoriaId: "Documentos Técnicos" },
  
  // Documentos Legais
  { nome: "Contratos", categoriaId: "Documentos Legais" },
  { nome: "Processos", categoriaId: "Documentos Legais" },
  { nome: "Licenças", categoriaId: "Documentos Legais" },
  { nome: "Alvarás", categoriaId: "Documentos Legais" },
  
  // Documentos Financeiros
  { nome: "Faturas", categoriaId: "Documentos Financeiros" },
  { nome: "Recibos", categoriaId: "Documentos Financeiros" },
  { nome: "Orçamentos", categoriaId: "Documentos Financeiros" },
  { nome: "Relatórios Financeiros", categoriaId: "Documentos Financeiros" },
  
  // Documentos Ambientais
  { nome: "EIA/RIMA", categoriaId: "Documentos Ambientais" },
  { nome: "PCA", categoriaId: "Documentos Ambientais" },
  { nome: "MCE", categoriaId: "Documentos Ambientais" },
  { nome: "RAP", categoriaId: "Documentos Ambientais" },
  { nome: "PGRS", categoriaId: "Documentos Ambientais" },
  { nome: "Inventários", categoriaId: "Documentos Ambientais" },
  
  // Documentos de Obra
  { nome: "Projetos Executivos", categoriaId: "Documentos de Obra" },
  { nome: "Orçamentos", categoriaId: "Documentos de Obra" },
  { nome: "Cronogramas", categoriaId: "Documentos de Obra" },
  { nome: "Relatórios de Obra", categoriaId: "Documentos de Obra" },
  { nome: "Fotos de Obra", categoriaId: "Documentos de Obra" },
  
  // Documentos de Cliente
  { nome: "Documentos Pessoais", categoriaId: "Documentos de Cliente" },
  { nome: "Documentos da Empresa", categoriaId: "Documentos de Cliente" },
  { nome: "Questionários", categoriaId: "Documentos de Cliente" },
  { nome: "Comprovantes", categoriaId: "Documentos de Cliente" }
];

async function checkAndCreateCategories() {
  try {
    console.log('🔍 Verificando categorias existentes...\n');
    
    // Verificar categorias existentes
    const categoriasSnapshot = await getDocs(collection(db, 'Categorias'));
    const categoriasExistentes = categoriasSnapshot.docs.map(doc => doc.data().nome);
    
    console.log('📋 Categorias existentes:');
    if (categoriasExistentes.length === 0) {
      console.log('   Nenhuma categoria encontrada');
    } else {
      categoriasExistentes.forEach((categoria, index) => {
        console.log(`   ${index + 1}. ${categoria}`);
      });
    }
    
    // Verificar sub-categorias existentes
    const subCategoriasSnapshot = await getDocs(collection(db, 'SubCategorias'));
    const subCategoriasExistentes = subCategoriasSnapshot.docs.map(doc => ({
      nome: doc.data().nome,
      categoriaId: doc.data().categoriaId
    }));
    
    console.log('\n📋 Sub-categorias existentes:');
    if (subCategoriasExistentes.length === 0) {
      console.log('   Nenhuma sub-categoria encontrada');
    } else {
      subCategoriasExistentes.forEach((subCat, index) => {
        console.log(`   ${index + 1}. ${subCat.nome} (${subCat.categoriaId})`);
      });
    }
    
    // Criar categorias que não existem
    console.log('\n🚀 Criando categorias faltantes...');
    const categoriasCriadas = [];
    
    for (const categoria of categoriasPadrao) {
      if (!categoriasExistentes.includes(categoria.nome)) {
        try {
          const docRef = await addDoc(collection(db, 'Categorias'), {
            nome: categoria.nome,
            descricao: categoria.descricao,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          categoriasCriadas.push({
            id: docRef.id,
            nome: categoria.nome
          });
          
          console.log(`   ✅ Criada: ${categoria.nome}`);
        } catch (error) {
          console.error(`   ❌ Erro ao criar ${categoria.nome}:`, error);
        }
      } else {
        console.log(`   ⏭️  Já existe: ${categoria.nome}`);
      }
    }
    
    // Criar sub-categorias que não existem
    console.log('\n🚀 Criando sub-categorias faltantes...');
    const subCategoriasCriadas = [];
    
    for (const subCategoria of subCategoriasPadrao) {
      const existe = subCategoriasExistentes.some(
        existente => existente.nome === subCategoria.nome && existente.categoriaId === subCategoria.categoriaId
      );
      
      if (!existe) {
        try {
          const docRef = await addDoc(collection(db, 'SubCategorias'), {
            nome: subCategoria.nome,
            categoriaId: subCategoria.categoriaId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          subCategoriasCriadas.push({
            id: docRef.id,
            nome: subCategoria.nome,
            categoriaId: subCategoria.categoriaId
          });
          
          console.log(`   ✅ Criada: ${subCategoria.nome} (${subCategoria.categoriaId})`);
        } catch (error) {
          console.error(`   ❌ Erro ao criar ${subCategoria.nome}:`, error);
        }
      } else {
        console.log(`   ⏭️  Já existe: ${subCategoria.nome} (${subCategoria.categoriaId})`);
      }
    }
    
    // Resumo final
    console.log('\n📊 RESUMO FINAL:');
    console.log(`   📁 Categorias criadas: ${categoriasCriadas.length}`);
    console.log(`   📂 Sub-categorias criadas: ${subCategoriasCriadas.length}`);
    console.log(`   📋 Total de categorias: ${categoriasExistentes.length + categoriasCriadas.length}`);
    console.log(`   📂 Total de sub-categorias: ${subCategoriasExistentes.length + subCategoriasCriadas.length}`);
    
    if (categoriasCriadas.length > 0 || subCategoriasCriadas.length > 0) {
      console.log('\n✅ Categorias e sub-categorias criadas com sucesso!');
    } else {
      console.log('\n✅ Todas as categorias já existem no sistema!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar/criar categorias:', error);
  }
}

// Executar o script
checkAndCreateCategories(); 