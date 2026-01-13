import { db, storage } from '@/config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  SupportTicket, 
  TicketCreationData, 
  TicketUpdateData, 
  SupportTicketFilter,
  SupportMetrics,
  TicketAttachment,
  TicketUpdate,
  BrowserInfo,
  DeviceInfo,
  SupportStatus,
  SupportPriority
} from '@/types/support';
import { auth } from '@/config/firebase';
import { createTaskAuditLog } from '@/services/taskAuditService';

class SupportTicketService {
  private readonly COLLECTION_NAME = 'supportTickets';
  private readonly UPDATES_COLLECTION = 'supportTicketUpdates';
  private readonly STORAGE_PATH = 'support-attachments';

  // ==================== CRIAÇÃO DE TICKETS ====================
  
  /**
   * Cria um novo ticket de suporte
   */
  async createTicket(ticketData: TicketCreationData): Promise<SupportTicket> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      console.log('🎫 Criando novo ticket de suporte:', ticketData.title);

      // Gerar protocolo único
      const protocol = this.generateProtocol();
      
      // Detectar informações do navegador e dispositivo
      const browserInfo = this.detectBrowserInfo();
      const deviceInfo = this.detectDeviceInfo();
      
      // Upload de anexos se houver
      const attachments: TicketAttachment[] = [];
      const screenshots: string[] = [];
      
      if (ticketData.attachments && ticketData.attachments.length > 0) {
        for (const file of ticketData.attachments) {
          const attachment = await this.uploadAttachment(file, protocol, 'attachment');
          attachments.push(attachment);
        }
      }
      
      if (ticketData.screenshots && ticketData.screenshots.length > 0) {
        for (const file of ticketData.screenshots) {
          const attachment = await this.uploadAttachment(file, protocol, 'screenshot');
          screenshots.push(attachment.url);
        }
      }

      // Buscar dados do usuário no Firestore
      let requesterHierarchy = 'Não definido';
      let requesterDepartment = 'Não definido';
      
      try {
        const userDoc = await getDoc(doc(db, 'collaborators_unified', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          requesterHierarchy = userData.hierarchyLevel || 'Não definido';
          requesterDepartment = userData.department || 'Não definido';
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar dados do usuário:', error);
      }

      // Preparar dados do ticket
      const ticket: Omit<SupportTicket, 'id'> = {
        protocol,
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority,
        status: 'Aberto',
        
        // Dados do solicitante
        requesterId: currentUser.uid,
        requesterName: currentUser.displayName || currentUser.email || 'Usuário',
        requesterEmail: currentUser.email || '',
        requesterHierarchy,
        requesterDepartment,
        
        // Dados técnicos
        attachments,
        screenshots,
        browserInfo,
        deviceInfo,
        pageUrl: ticketData.pageUrl || window.location.href,
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        
        // Comunicação
        updates: [],
        
        // Auto-assign para Diretor de TI se configurado
        ...(await this.getAutoAssignmentData())
      };

      // Salvar no Firestore
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...ticket,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const createdTicket: SupportTicket = {
        id: docRef.id,
        ...ticket
      };

      // Log de auditoria
      await createTaskAuditLog(
        'support_ticket_created',
        `Ticket de suporte criado: ${protocol}`,
        docRef.id,
        ticketData.title,
        {
          category: { from: null, to: ticketData.category },
          priority: { from: null, to: ticketData.priority },
          status: { from: null, to: 'Aberto' }
        }
      );

      // Criar update inicial
      await this.addUpdate(docRef.id, {
        type: 'system',
        message: `Ticket criado por ${currentUser.displayName || currentUser.email}`,
        authorId: 'system',
        authorName: 'Sistema',
        authorRole: 'system'
      });

      console.log('✅ Ticket criado com sucesso:', protocol);
      return createdTicket;

    } catch (error) {
      console.error('❌ Erro ao criar ticket:', error);
      throw error;
    }
  }

  // ==================== LEITURA DE TICKETS ====================
  
  /**
   * Busca tickets com filtros e paginação
   */
  async getTickets(
    filter: SupportTicketFilter = {}, 
    pageSize: number = 20,
    lastDoc?: any
  ): Promise<{ tickets: SupportTicket[]; hasMore: boolean; lastDoc: any }> {
    try {
      console.log('🔍 Buscando tickets com filtros:', filter);

      let q = collection(db, this.COLLECTION_NAME);
      const constraints: any[] = [];

      // Aplicar filtros (sem filtrar excluídos na query para evitar conflito com orderBy)
      if (filter.status && filter.status.length > 0) {
        constraints.push(where('status', 'in', filter.status));
      }

      if (filter.category && filter.category.length > 0) {
        constraints.push(where('category', 'in', filter.category));
      }

      if (filter.priority && filter.priority.length > 0) {
        constraints.push(where('priority', 'in', filter.priority));
      }

      if (filter.assignedTo) {
        constraints.push(where('assignedTo', '==', filter.assignedTo));
      }

      if (filter.requesterId) {
        constraints.push(where('requesterId', '==', filter.requesterId));
      }

      // Ordenação e paginação
      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(pageSize + 1)); // +1 para verificar se há mais

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const queryRef = query(q, ...constraints);
      const snapshot = await getDocs(queryRef);

      const tickets: SupportTicket[] = [];
      const docs = snapshot.docs;
      const hasMore = docs.length > pageSize;

      // Processar documentos (excluir o último se houver mais)
      const docsToProcess = hasMore ? docs.slice(0, -1) : docs;

      for (const docSnap of docsToProcess) {
        const data = docSnap.data();
        
        // Converter attachments do Firestore
        const attachments = this.convertAttachmentsFromFirestore(data.attachments || []);
        
        const ticket: SupportTicket = {
          id: docSnap.id,
          ...data,
          attachments,
          screenshots: data.screenshots || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate(),
          closedAt: data.closedAt?.toDate(),
          assignedAt: data.assignedAt?.toDate()
        } as SupportTicket;

        // Carregar updates
        ticket.updates = await this.getTicketUpdates(ticket.id);
        tickets.push(ticket);
      }

      // Aplicar filtros client-side
      let filteredTickets = tickets;

      // Filtrar tickets excluídos (sempre, exceto se especificamente solicitado)
      if (!filter.status || !filter.status.includes('Excluído')) {
        filteredTickets = filteredTickets.filter(ticket => ticket.status !== 'Excluído');
      }

      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        filteredTickets = filteredTickets.filter(ticket =>
          ticket.title.toLowerCase().includes(searchTerm) ||
          ticket.description.toLowerCase().includes(searchTerm) ||
          ticket.protocol.toLowerCase().includes(searchTerm)
        );
      }

      console.log(`✅ ${filteredTickets.length} tickets encontrados`);
      return {
        tickets: filteredTickets,
        hasMore,
        lastDoc: hasMore ? docs[docs.length - 2] : null
      };

    } catch (error) {
      console.error('❌ Erro ao buscar tickets:', error);
      throw error;
    }
  }

  /**
   * Busca um ticket específico por ID
   */
  async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    try {
      console.log('🔍 Buscando ticket:', ticketId);

      const docRef = doc(db, this.COLLECTION_NAME, ticketId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('❌ Ticket não encontrado:', ticketId);
        return null;
      }

      const data = docSnap.data();
      
      // Converter attachments do Firestore
      const attachments = this.convertAttachmentsFromFirestore(data.attachments || []);
      
      const ticket: SupportTicket = {
        id: docSnap.id,
        ...data,
        attachments,
        screenshots: data.screenshots || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        resolvedAt: data.resolvedAt?.toDate(),
        closedAt: data.closedAt?.toDate(),
        assignedAt: data.assignedAt?.toDate()
      } as SupportTicket;

      // Carregar updates
      ticket.updates = await this.getTicketUpdates(ticketId);

      console.log('✅ Ticket encontrado:', ticket.protocol);
      console.log('📎 Attachments:', ticket.attachments?.length || 0);
      console.log('📷 Screenshots:', ticket.screenshots?.length || 0);
      
      return ticket;

    } catch (error) {
      console.error('❌ Erro ao buscar ticket:', error);
      throw error;
    }
  }

  // ==================== ATUALIZAÇÃO DE TICKETS ====================
  
  /**
   * Atualiza um ticket existente
   */
  async updateTicket(ticketId: string, updateData: TicketUpdateData): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      console.log('📝 Atualizando ticket:', ticketId);

      const ticketRef = doc(db, this.COLLECTION_NAME, ticketId);
      const ticket = await this.getTicketById(ticketId);
      
      if (!ticket) {
        throw new Error('Ticket não encontrado');
      }

      // Preparar dados de atualização
      const updateObj: any = {
        updatedAt: serverTimestamp()
      };

      // Atualizar campos específicos
      if (updateData.status && updateData.status !== ticket.status) {
        updateObj.status = updateData.status;
        
        // Timestamps especiais
        if (updateData.status === 'Resolvido') {
          updateObj.resolvedAt = updateData.resolvedAt || serverTimestamp();
          updateObj.timeToResolve = this.calculateTimeToResolve(ticket.createdAt);
        }
        
        if (updateData.status === 'Fechado') {
          updateObj.closedAt = updateData.closedAt || serverTimestamp();
        }

        // Criar update para mudança de status
        await this.addUpdate(ticketId, {
          type: 'status_change',
          message: `Status alterado de "${ticket.status}" para "${updateData.status}"`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName || currentUser.email || 'Usuário',
          authorRole: this.getUserRole(currentUser),
          statusChange: {
            from: ticket.status,
            to: updateData.status
          }
        });
      }

      if (updateData.priority && updateData.priority !== ticket.priority) {
        updateObj.priority = updateData.priority;

        // Criar update para mudança de prioridade
        await this.addUpdate(ticketId, {
          type: 'comment',
          message: `Prioridade alterada de "${ticket.priority}" para "${updateData.priority}"`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName || currentUser.email || 'Usuário',
          authorRole: this.getUserRole(currentUser)
        });
      }

      if (updateData.assignedTo && updateData.assignedTo !== ticket.assignedTo) {
        updateObj.assignedTo = updateData.assignedTo;
        updateObj.assignedToName = updateData.assignedToName || 'Usuário';
        updateObj.assignedAt = updateData.assignedAt || serverTimestamp();

        // Criar update para atribuição
        await this.addUpdate(ticketId, {
          type: 'assignment',
          message: `Ticket atribuído para ${updateData.assignedToName || 'Usuário'}`,
          authorId: currentUser.uid,
          authorName: currentUser.displayName || currentUser.email || 'Usuário',
          authorRole: this.getUserRole(currentUser),
          assignmentChange: {
            from: ticket.assignedTo,
            to: updateData.assignedTo,
            fromName: ticket.assignedToName,
            toName: updateData.assignedToName || 'Usuário'
          }
        });
      }

      if (updateData.resolution) {
        updateObj.resolution = updateData.resolution;
        updateObj.resolutionType = updateData.resolutionType;
        
        // Criar update para resolução
        await this.addUpdate(ticketId, {
          type: 'resolution',
          message: updateData.resolution,
          authorId: currentUser.uid,
          authorName: currentUser.displayName || currentUser.email || 'Usuário',
          authorRole: this.getUserRole(currentUser)
        });
      }

      // Atualizar ticket
      await updateDoc(ticketRef, updateObj);

      // Adicionar comentário se fornecido
      if (updateData.message) {
        await this.addUpdate(ticketId, {
          type: 'comment',
          message: updateData.message,
          authorId: currentUser.uid,
          authorName: currentUser.displayName || currentUser.email || 'Usuário',
          authorRole: this.getUserRole(currentUser),
          isInternal: updateData.isInternal
        });
      }

      // Log de auditoria
      await createTaskAuditLog(
        'support_ticket_updated',
        `Ticket de suporte atualizado: ${ticket.protocol}`,
        ticketId,
        ticket.title
      );

      console.log('✅ Ticket atualizado com sucesso');

    } catch (error) {
      console.error('❌ Erro ao atualizar ticket:', error);
      throw error;
    }
  }

  // ==================== GESTÃO DE UPDATES ====================

  /**
   * Adiciona um update ao ticket
   */
  async addUpdate(ticketId: string, updateData: Omit<TicketUpdate, 'id' | 'ticketId' | 'createdAt'>): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Preencher dados do autor automaticamente se não fornecidos
      const authorData = {
        authorId: updateData.authorId === 'current_user' ? currentUser.uid : updateData.authorId,
        authorName: updateData.authorName === 'Usuário Atual' 
          ? (currentUser.displayName || currentUser.email || 'Usuário')
          : updateData.authorName,
        authorRole: updateData.authorRole
      };

      const update: Omit<TicketUpdate, 'id'> = {
        ticketId,
        ...updateData,
        ...authorData,
        createdAt: new Date()
      };

      await addDoc(collection(db, this.UPDATES_COLLECTION), {
        ...update,
        createdAt: serverTimestamp()
      });

      console.log('✅ Update adicionado ao ticket:', ticketId);

    } catch (error) {
      console.error('❌ Erro ao adicionar update:', error);
      throw error;
    }
  }

  /**
   * Busca updates de um ticket
   */
  async getTicketUpdates(ticketId: string): Promise<TicketUpdate[]> {
    try {
      const q = query(
        collection(db, this.UPDATES_COLLECTION),
        where('ticketId', '==', ticketId),
        orderBy('createdAt', 'asc')
      );

      const snapshot = await getDocs(q);
      const updates: TicketUpdate[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        updates.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as TicketUpdate);
      });

      return updates;

    } catch (error) {
      console.error('❌ Erro ao buscar updates:', error);
      return [];
    }
  }

  // ==================== UPLOAD DE ARQUIVOS ====================

  /**
   * Faz upload de um anexo
   */
  async uploadAttachment(
    file: File, 
    protocol: string, 
    type: 'attachment' | 'screenshot'
  ): Promise<TicketAttachment> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const fileName = `${protocol}_${type}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `${this.STORAGE_PATH}/${protocol}/${fileName}`);
      
      console.log('📎 Fazendo upload do arquivo:', fileName);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const attachment: TicketAttachment = {
        id: `att_${Date.now()}`,
        name: fileName,
        originalName: file.name,
        url: downloadURL,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        uploadedBy: currentUser.uid,
        uploadedByName: currentUser.displayName || currentUser.email || 'Usuário'
      };

      console.log('✅ Upload concluído:', fileName);
      return attachment;

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }
  }

  // ==================== MÉTRICAS E RELATÓRIOS ====================

  /**
   * Gera métricas de suporte
   */
  async getMetrics(startDate?: Date, endDate?: Date): Promise<SupportMetrics> {
    try {
      console.log('📊 Gerando métricas de suporte');

      const constraints: any[] = [orderBy('createdAt', 'desc')];
      
      if (startDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(startDate)));
      }
      
      if (endDate) {
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endDate)));
      }

      const q = query(collection(db, this.COLLECTION_NAME), ...constraints);
      const snapshot = await getDocs(q);

      const tickets: SupportTicket[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        tickets.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          resolvedAt: data.resolvedAt?.toDate(),
          closedAt: data.closedAt?.toDate()
        } as SupportTicket);
      });

      // Calcular métricas
      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => !['Resolvido', 'Fechado', 'Cancelado'].includes(t.status)).length;
      const resolvedTickets = tickets.filter(t => t.status === 'Resolvido').length;

      const resolvedWithTime = tickets.filter(t => t.timeToResolve);
      const averageResolutionTime = resolvedWithTime.length > 0 
        ? resolvedWithTime.reduce((sum, t) => sum + (t.timeToResolve || 0), 0) / resolvedWithTime.length 
        : 0;

      // Métricas por categoria
      const ticketsByPriority = tickets.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {} as Record<SupportPriority, number>);

      const ticketsByCategory = tickets.reduce((acc, ticket) => {
        acc[ticket.category] = (acc[ticket.category] || 0) + 1;
        return acc;
      }, {} as any);

      const ticketsByStatus = tickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {} as any);

      // Calcular tempo médio de primeira resposta
      const averageFirstResponseTime = await this.calculateAverageFirstResponseTime(tickets);

      const metrics: SupportMetrics = {
        totalTickets,
        openTickets,
        resolvedTickets,
        averageResolutionTime,
        averageFirstResponseTime,
        ticketsByPriority,
        ticketsByCategory,
        ticketsByStatus,
        period: {
          start: startDate || new Date(0),
          end: endDate || new Date()
        }
      };

      console.log('✅ Métricas geradas:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Erro ao gerar métricas:', error);
      throw error;
    }
  }

  // ==================== EXCLUSÃO DE TICKETS ====================

  /**
   * Exclui um ticket de suporte (apenas para Diretor de TI e Presidente)
   */
  async deleteTicket(ticketId: string): Promise<void> {
    try {
      console.log('🗑️ Excluindo ticket:', ticketId);

      // Verificar se o ticket existe
      const ticketDoc = await getDoc(doc(db, this.COLLECTION_NAME, ticketId));
      if (!ticketDoc.exists()) {
        throw new Error('Ticket não encontrado');
      }

      const ticketData = ticketDoc.data() as SupportTicket;

      // Excluir o documento do ticket
      await updateDoc(doc(db, this.COLLECTION_NAME, ticketId), {
        status: 'Excluído',
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Log de auditoria
      await createTaskAuditLog(
        'support_ticket_deleted',
        `Ticket de suporte excluído: ${ticketData.protocol}`,
        ticketId,
        ticketData.title,
        {
          status: { from: ticketData.status, to: 'Excluído' }
        }
      );

      // Adicionar update de exclusão
      await this.addUpdate(ticketId, {
        type: 'system',
        message: 'Ticket excluído pelo administrador',
        authorId: 'system',
        authorName: 'Sistema',
        authorRole: 'system'
      });

      console.log('✅ Ticket excluído com sucesso:', ticketData.protocol);

    } catch (error) {
      console.error('❌ Erro ao excluir ticket:', error);
      throw error;
    }
  }

  // ==================== UTILITÁRIOS ====================

  /**
   * Gera protocolo único para o ticket
   */
  private generateProtocol(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    
    return `SUP${year}${month}${day}${timestamp}`;
  }

  /**
   * Detecta informações do navegador
   */
  private detectBrowserInfo(): BrowserInfo {
    const userAgent = navigator.userAgent;
    
    // Detectar navegador
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    // Extrair versão (simplificado)
    const version = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+)/)?.[1] || 'Unknown';
    
    return {
      browser,
      version,
      userAgent
    };
  }

  /**
   * Detecta informações do dispositivo
   */
  private detectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    
    // Detectar OS
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    // Detectar tipo de dispositivo
    let device = 'Desktop';
    if (/Mobi|Android/i.test(userAgent)) device = 'Mobile';
    else if (/Tablet|iPad/i.test(userAgent)) device = 'Tablet';
    
    return {
      os,
      device,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  /**
   * Calcula tempo para resolução em horas
   */
  private calculateTimeToResolve(createdAt: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    return Math.round(diffMs / (1000 * 60 * 60) * 100) / 100; // horas com 2 decimais
  }

  /**
   * Determina o papel do usuário
   */
  private getUserRole(user: any): 'requester' | 'support' | 'system' {
    if (user.hierarchyLevel === 'Diretor de TI') {
      return 'support';
    }
    return 'requester';
  }

  /**
   * Calcula tempo médio de primeira resposta
   */
  private async calculateAverageFirstResponseTime(tickets: SupportTicket[]): Promise<number> {
    try {
      let totalResponseTime = 0;
      let responseCount = 0;

      for (const ticket of tickets) {
        // Buscar o primeiro update do tipo 'comment' que não seja do solicitante
        const updates = await this.getTicketUpdates(ticket.id);
        const firstResponse = updates.find(update => 
          update.type === 'comment' && 
          update.authorId !== ticket.requesterId &&
          !update.isInternal
        );

        if (firstResponse) {
          const responseTime = (firstResponse.createdAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60); // em horas
          totalResponseTime += responseTime;
          responseCount++;
        }
      }

      return responseCount > 0 ? totalResponseTime / responseCount : 0;
    } catch (error) {
      console.error('❌ Erro ao calcular tempo de primeira resposta:', error);
      return 0;
    }
  }

  /**
   * Obtém dados para auto-atribuição
   */
  private async getAutoAssignmentData(): Promise<{ assignedTo?: string; assignedToName?: string; assignedAt?: Date }> {
    try {
      // Buscar Diretor de TI ou usuário de suporte ativo
      const collaboratorsSnapshot = await getDocs(
        query(
          collection(db, 'collaborators_unified'),
          where('hierarchyLevel', 'in', ['Diretor de TI', 'Gerente de TI', 'Analista TI'])
        )
      );

      if (!collaboratorsSnapshot.empty) {
        const firstCollaborator = collaboratorsSnapshot.docs[0];
        const data = firstCollaborator.data();
        
        return {
          assignedTo: firstCollaborator.id,
          assignedToName: data.name || data.displayName || 'Suporte TI',
          assignedAt: new Date()
        };
      }

      return {};
    } catch (error) {
      console.error('❌ Erro ao obter auto-atribuição:', error);
      return {};
    }
  }

  // ==================== UTILITÁRIOS PRIVADOS ====================

  /**
   * Converte attachments do Firestore para o formato da aplicação
   */
  private convertAttachmentsFromFirestore(attachments: any[]): TicketAttachment[] {
    if (!attachments || !Array.isArray(attachments)) return [];
    
    return attachments.map(attachment => ({
      ...attachment,
      uploadedAt: attachment.uploadedAt?.toDate ? attachment.uploadedAt.toDate() : new Date(attachment.uploadedAt)
    }));
  }
}

export const supportTicketService = new SupportTicketService(); 