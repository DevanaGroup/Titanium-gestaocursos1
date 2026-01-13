import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth, storage } from '@/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDoc,
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Plus, 
  Trash, 
  FolderPlus, 
  Upload,
  File,
  AlertCircle,
  Folder,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

interface TermoFolder {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
}

interface TermoDocument {
  id: string;
  name: string;
  url: string;
  folderId: string;
  folderName: string;
  uploadDate: Date;
  uploadedBy: string;
  uploadedByName: string;
  size: number;
}

const TermoReferenciaManager = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState<string>('');
  const [folders, setFolders] = useState<TermoFolder[]>([]);
  const [documents, setDocuments] = useState<TermoDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<TermoFolder | null>(null);
  const [isInRootFolder, setIsInRootFolder] = useState(true);
  const [folderPath, setFolderPath] = useState<TermoFolder[]>([]);
  const [selectedFolderForUpload, setSelectedFolderForUpload] = useState<string>('');
  const [isAddFolderDialogOpen, setIsAddFolderDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Estados para confirmação de exclusão
  const [deleteFolderConfirmOpen, setDeleteFolderConfirmOpen] = useState(false);
  const [deleteDocumentConfirmOpen, setDeleteDocumentConfirmOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<TermoDocument | null>(null);

  // Pastas predefinidas com descrições
  const defaultFolders = [];

  // Verificar autenticação e permissões
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        try {
          // Buscar dados do usuário
          let userData = null;
          
          // Primeiro tentar buscar na coleção unificada
          try {
            const unifiedSnap = await getDocs(query(collection(db, "collaborators_unified"), where("email", "==", userAuth.email)));
            unifiedSnap.forEach((doc) => {
              userData = { id: doc.id, ...doc.data() };
            });
            
            if (userData) {
              console.log(`✅ TermoReferenciaManager: Usando coleção unificada para ${userAuth.email}`);
            }
          } catch (error) {
            console.log('⚠️ TermoReferenciaManager: Fallback para coleções antigas');
          }
          
          // Se não encontrou na coleção unificada, o usuário não tem acesso
          if (!userData) {
            console.log("❌ Usuário não encontrado na coleção unificada");
          }
          
          if (userData) {
            setUser(userData);
            setUserRole(userData.hierarchyLevel || '');
          } else {
            toast.error("Usuário não encontrado no sistema");
            navigate('/dashboard');
          }
        } catch (error) {
          console.error("Erro ao verificar usuário:", error);
          toast.error("Erro ao verificar permissões");
          navigate('/dashboard');
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Criar pastas padrão se não existirem
  useEffect(() => {
    const createDefaultFolders = async () => {
      if (!user) return;

      try {
        const foldersSnapshot = await getDocs(collection(db, 'termoReferenciaFolders'));
        const existingFolders = foldersSnapshot.docs.map(doc => doc.data().name);
        
        // Criar pastas que não existem
        for (const folderData of defaultFolders) {
          if (!existingFolders.includes(folderData.name)) {
            await addDoc(collection(db, 'termoReferenciaFolders'), {
              name: folderData.name,
              description: folderData.description,
              createdAt: new Date(),
              createdBy: user.id,
              createdByName: user.firstName || ''
            });
          }
        }
      } catch (error) {
        console.error("Erro ao criar pastas padrão:", error);
      }
    };

    createDefaultFolders();
  }, [user]);

  // Carregar pastas
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const foldersSnapshot = await getDocs(
          query(collection(db, 'termoReferenciaFolders'), orderBy('createdAt'))
        );
        
        const foldersData = foldersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as TermoFolder[];
        
        setFolders(foldersData);
      } catch (error) {
        console.error("Erro ao carregar pastas:", error);
        toast.error("Erro ao carregar pastas");
      }
    };

    loadFolders();
  }, []);

  // Carregar documentos
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        const documentsSnapshot = await getDocs(
          query(collection(db, 'termoReferenciaDocuments'), orderBy('uploadDate', 'desc'))
        );
        
        const documentsData = documentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          uploadDate: doc.data().uploadDate?.toDate() || new Date()
        })) as TermoDocument[];
        
        setDocuments(documentsData);
      } catch (error) {
        console.error("Erro ao carregar documentos:", error);
        toast.error("Erro ao carregar documentos");
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  // Verificar se é Presidente ou Diretor de TI (ambos têm acesso total)
  const isPresident = userRole === 'Presidente' || userRole === 'Diretor de TI';

  // Selecionar pasta e navegar para dentro dela
  const handleSelectFolder = (folder: TermoFolder) => {
    setSelectedFolder(folder);
    setIsInRootFolder(false);
    setFolderPath([folder]);
  };

  // Voltar para a pasta raiz
  const handleBackToRoot = () => {
    setSelectedFolder(null);
    setIsInRootFolder(true);
    setFolderPath([]);
  };

  // Adicionar nova pasta
  const handleAddFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Nome da pasta é obrigatório");
      return;
    }

    if (!isPresident) {
      toast.error("Apenas o Presidente e Diretor de TI podem adicionar novas pastas");
      return;
    }

    try {
      // Verificar se pasta já existe
      const existingFolder = folders.find(f => f.name.toLowerCase() === newFolderName.toLowerCase());
      if (existingFolder) {
        toast.error("Já existe uma pasta com este nome");
        return;
      }

      const docRef = await addDoc(collection(db, 'termoReferenciaFolders'), {
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || 'Pasta personalizada para documentos específicos',
        createdAt: new Date(),
        createdBy: user.id,
        createdByName: `${user.firstName} ${user.lastName}`.trim()
      });

      const newFolder: TermoFolder = {
        id: docRef.id,
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || 'Pasta personalizada para documentos específicos',
        createdAt: new Date(),
        createdBy: user.id,
        createdByName: `${user.firstName} ${user.lastName}`.trim()
      };

      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setNewFolderDescription('');
      setIsAddFolderDialogOpen(false);
      toast.success("Pasta criada com sucesso");
    } catch (error) {
      console.error("Erro ao criar pasta:", error);
      toast.error("Erro ao criar pasta");
    }
  };

  // Função para confirmar exclusão de pasta
  const handleDeleteFolderConfirm = (folderId: string, folderName: string) => {
    if (!isPresident) {
      toast.error("Apenas o Presidente e Diretor de TI podem remover pastas");
      return;
    }

    // Verificar se é uma pasta padrão
    const isDefaultFolder = defaultFolders.some(df => df.name === folderName);
    if (isDefaultFolder) {
      toast.error("Não é possível remover pastas padrão do sistema");
      return;
    }

    // Verificar se há documentos na pasta
    const folderDocuments = documents.filter(doc => doc.folderId === folderId);
    if (folderDocuments.length > 0) {
      toast.error("Não é possível remover uma pasta que contém documentos");
      return;
    }

    setFolderToDelete({ id: folderId, name: folderName });
    setDeleteFolderConfirmOpen(true);
  };

  // Função para executar exclusão de pasta
  const executeDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      await deleteDoc(doc(db, 'termoReferenciaFolders', folderToDelete.id));
      setFolders(folders.filter(f => f.id !== folderToDelete.id));
      toast.success("Pasta removida com sucesso");
      setDeleteFolderConfirmOpen(false);
      setFolderToDelete(null);
    } catch (error) {
      console.error("Erro ao remover pasta:", error);
      toast.error("Erro ao remover pasta");
    }
  };

  // Upload de arquivo
  const handleFileUpload = async () => {
    if (!uploadFile || !selectedFolderForUpload) {
      toast.error("Selecione um arquivo PDF e uma pasta");
      return;
    }

    if (!isPresident) {
      toast.error("Apenas o Presidente e Diretor de TI podem fazer upload de documentos");
      return;
    }

    // Verificar se é PDF
    if (uploadFile.type !== 'application/pdf') {
      toast.error("Apenas arquivos PDF são permitidos");
      return;
    }

    // Verificar tamanho (máximo 10MB)
    if (uploadFile.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo permitido: 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // Upload para Firebase Storage
      const timestamp = Date.now();
      const filename = `${timestamp}_${uploadFile.name}`;
      const storageRef = ref(storage, `termo-referencia/${selectedFolderForUpload}/${filename}`);
      
      await uploadBytes(storageRef, uploadFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Salvar referência no Firestore
      const selectedFolderData = folders.find(f => f.id === selectedFolderForUpload);
      
      const docRef = await addDoc(collection(db, 'termoReferenciaDocuments'), {
        name: uploadFile.name,
        url: downloadURL,
        folderId: selectedFolderForUpload,
        folderName: selectedFolderData?.name || '',
        uploadDate: new Date(),
        uploadedBy: user.id,
        uploadedByName: `${user.firstName} ${user.lastName}`.trim(),
        size: uploadFile.size
      });

      const newDocument: TermoDocument = {
        id: docRef.id,
        name: uploadFile.name,
        url: downloadURL,
        folderId: selectedFolderForUpload,
        folderName: selectedFolderData?.name || '',
        uploadDate: new Date(),
        uploadedBy: user.id,
        uploadedByName: `${user.firstName} ${user.lastName}`.trim(),
        size: uploadFile.size
      };

      setDocuments([newDocument, ...documents]);
      setUploadFile(null);
      setSelectedFolderForUpload('');
      setIsUploadDialogOpen(false);
      toast.success("Documento enviado com sucesso");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar documento");
    } finally {
      setIsUploading(false);
    }
  };

  // Download de documento
  const handleDownload = (doc: TermoDocument) => {
    try {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
      toast.error("Erro ao baixar documento");
    }
  };

  // Função para confirmar exclusão de documento
  const handleDeleteDocumentConfirm = (document: TermoDocument) => {
    if (!isPresident) {
      toast.error("Apenas o Presidente pode remover documentos");
      return;
    }

    setDocumentToDelete(document);
    setDeleteDocumentConfirmOpen(true);
  };

  // Função para executar exclusão de documento
  const executeDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      // Remover do Storage
      const storageRef = ref(storage, documentToDelete.url);
      await deleteObject(storageRef);

      // Remover do Firestore
      await deleteDoc(doc(db, 'termoReferenciaDocuments', documentToDelete.id));

      setDocuments(documents.filter(d => d.id !== documentToDelete.id));
      toast.success("Documento removido com sucesso");
      setDeleteDocumentConfirmOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error("Erro ao remover documento:", error);
      toast.error("Erro ao remover documento");
    }
  };

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Obter documentos de uma pasta
  const getCurrentFolderDocuments = () => {
    if (!selectedFolder) return [];
    return documents.filter(doc => doc.folderId === selectedFolder.id);
  };

  // Obter documentos de uma pasta específica
  const getFolderDocuments = (folderId: string) => {
    return documents.filter(doc => doc.folderId === folderId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cerrado-green1 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Termo de Referência</h1>
          <p className="text-muted-foreground">
            Documentos associados aos termos de referência da organização
          </p>
        </div>
        
        {isPresident && (
          <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-cerrado-green2 hover:bg-cerrado-green1">
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
        )}
      </div>

      {!isPresident && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Apenas o <strong>Presidente</strong> e <strong>Diretor de TI</strong> podem adicionar pastas e fazer upload de documentos nesta seção.
          </AlertDescription>
        </Alert>
      )}

      {/* Breadcrumb / Caminho da pasta */}
      {!isInRootFolder && (
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToRoot}
            className="text-cerrado-green1 hover:text-cerrado-green2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{selectedFolder?.name}</span>
        </div>
      )}

      {/* Conteúdo principal - Pastas ou Documentos */}
      {isInRootFolder ? (
        // Grid de Pastas
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {folders.map((folder) => {
            const folderDocuments = getFolderDocuments(folder.id);
            const isDefaultFolder = defaultFolders.some(df => df.name === folder.name);
            
            return (
              <Card 
                key={folder.id} 
                className="relative cursor-pointer hover:shadow-md transition-shadow duration-200"
                onClick={() => handleSelectFolder(folder)}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm">{folder.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {folder.description || 'Pasta para documentos específicos'}
                      </p>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>{folderDocuments.length} documento{folderDocuments.length !== 1 ? 's' : ''}</div>
                      <div>0 B</div>
                    </div>
                  </div>

                  {/* Botão de excluir para pastas não-padrão */}
                  {isPresident && !isDefaultFolder && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolderConfirm(folder.id, folder.name);
                      }}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Card para adicionar nova pasta */}
          {isPresident && (
            <Card 
              className="border-dashed border-2 cursor-pointer hover:border-solid hover:shadow-md transition-all duration-200"
              onClick={() => setIsAddFolderDialogOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-muted-foreground">Nova Pasta</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Lista de Documentos da pasta selecionada
        <div className="space-y-4">
          {getCurrentFolderDocuments().length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum documento encontrado nesta pasta</p>
              {isPresident && (
                <p className="text-sm mt-2">
                  Use o botão "Upload PDF" para adicionar documentos
                </p>
              )}
            </div>
          ) : (
            getCurrentFolderDocuments().map((document) => (
              <div key={document.id} className="flex items-center justify-between p-4 bg-card rounded-lg shadow border border-border hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <FileText className="w-6 h-6 text-red-600" />
                  <div>
                    <h4 className="font-medium">{document.name}</h4>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(document.size)} • 
                        Enviado em {document.uploadDate.toLocaleDateString('pt-BR')} por {document.uploadedByName}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(document)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {isPresident && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocumentConfirm(document)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dialog para adicionar nova pasta */}
      <Dialog open={isAddFolderDialogOpen} onOpenChange={setIsAddFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Pasta</DialogTitle>
            <DialogDescription>
              Crie uma nova pasta para organizar os documentos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName">Nome da Pasta</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Digite o nome da nova pasta"
              />
            </div>
            <div>
              <Label htmlFor="folderDescription">Descrição</Label>
              <Input
                id="folderDescription"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Descreva o propósito desta pasta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFolderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddFolder}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para upload de documento */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
            <DialogDescription>
              Envie um arquivo PDF para uma pasta específica
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pasta de Destino</Label>
              <select
                className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                value={selectedFolderForUpload}
                onChange={(e) => setSelectedFolderForUpload(e.target.value)}
              >
                <option value="">Selecione uma pasta</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pdfFile">Arquivo PDF (máx. 10MB)</Label>
              <Input
                id="pdfFile"
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            {uploadFile && (
              <div className="text-sm text-muted-foreground">
                Arquivo selecionado: {uploadFile.name} ({formatFileSize(uploadFile.size)})
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFileUpload} disabled={isUploading}>
              {isUploading ? 'Enviando...' : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogos de Confirmação */}
      <ConfirmationDialog
        open={deleteFolderConfirmOpen}
        onOpenChange={setDeleteFolderConfirmOpen}
        onConfirm={executeDeleteFolder}
        title="Confirmar Exclusão da Pasta"
        description={`Tem certeza que deseja excluir a pasta "${folderToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />

      <ConfirmationDialog
        open={deleteDocumentConfirmOpen}
        onOpenChange={setDeleteDocumentConfirmOpen}
        onConfirm={executeDeleteDocument}
        title="Confirmar Exclusão do Documento"
        description={`Tem certeza que deseja excluir o documento "${documentToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
};

export default TermoReferenciaManager; 