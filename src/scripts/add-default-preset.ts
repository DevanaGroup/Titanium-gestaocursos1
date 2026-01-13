import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const addDefaultPreset = async () => {
  try {
    const defaultPreset = {
      nome: 'Checklist ISPS Code - Auditoria Completa',
      descricao: 'Preset padrão para auditoria completa do ISPS Code',
      areas: [
        {
          id: 'area-1',
          name: 'DOCUMENTAÇÃO PRELIMINAR',
          order: 0,
          items: [
            {
              id: 'item-1-1',
              title: 'Instalação Portuária: Razão Social e CNPJ',
              description: 'Verificar documentação da instalação portuária',
              order: 0,
            },
            {
              id: 'item-1-2',
              title: 'Sócios, Procuradores e Representantes Legais',
              description: 'Verificar documentação dos sócios e representantes',
              order: 1,
            },
            {
              id: 'item-1-3',
              title: 'Supervisor de Segurança da Instalação Portuária',
              description: 'Verificar documentação do supervisor',
              order: 2,
            },
          ],
        },
        {
          id: 'area-2',
          name: 'ESTUDO DE AVALIAÇÃO DA SEGURANÇA',
          order: 1,
          items: [
            {
              id: 'item-2-1',
              title: 'Análise de Riscos',
              description: 'Verificar análise de riscos de segurança',
              order: 0,
            },
            {
              id: 'item-2-2',
              title: 'Plano de Segurança',
              description: 'Verificar existência e adequação do plano de segurança',
              order: 1,
            },
          ],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await addDoc(collection(db, 'presets'), defaultPreset);
    console.log('✅ Preset padrão ISPS Code criado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar preset padrão:', error);
    throw error;
  }
};

