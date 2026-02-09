#!/bin/bash

# Script de instalação das dependências do Menu Banco de Dados
# Execute este script com: bash INSTALAR_DEPENDENCIAS.sh

echo "🚀 Instalando dependências do Menu Banco de Dados..."
echo ""

# Instalar PapaParse
echo "📦 Instalando papaparse..."
npm install papaparse

# Instalar tipos TypeScript
echo "📦 Instalando @types/papaparse..."
npm install --save-dev @types/papaparse

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure um usuário com hierarchyLevel: 'Nível 0'"
echo "2. Faça login com esse usuário"
echo "3. Acesse o menu 'Banco de Dados' no sidebar"
echo ""
echo "📖 Consulte BANCO_DADOS_ADMIN_TI.md para mais informações"
