import React, { useEffect, useState } from 'react';
import { auth, db } from '@/config/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  MessageCircle, 
  UserPlus, 
  Settings, 
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { TicketUpdate } from '@/types/support';

interface SupportNotificationsProps {
  onNotificationClick?: (ticketId: string) => void;
}

export const SupportNotifications: React.FC<SupportNotificationsProps> = ({
  onNotificationClick
}) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<TicketUpdate[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // useEffect para gerenciar autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // useEffect para monitorar atualizações de tickets em tempo real
  useEffect(() => {
    if (!currentUser?.uid) return;

    console.log('🔔 Iniciando monitoramento de notificações para:', currentUser.uid);

    // Query para buscar updates recentes (sem filtrar authorId aqui para evitar problemas de índice)
    const q = query(
      collection(db, 'supportTicketUpdates'),
      orderBy('createdAt', 'desc'),
      limit(50) // Buscar mais para compensar a filtragem no cliente
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updates: TicketUpdate[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        updates.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        } as TicketUpdate);
      });

      // Filtrar: não incluir próprias atualizações E apenas dos últimos 3 dias
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const recentUpdates = updates.filter(update => 
        update.createdAt > threeDaysAgo && 
        update.authorId !== currentUser.uid // Excluir próprias atualizações
      ).slice(0, 20); // Limitar a 20 após filtragem

      setNotifications(recentUpdates);
      
      // Calcular não lidas (simplificado - todas as recentes por enquanto)
      setUnreadCount(recentUpdates.length);

      // Mostrar toast para novas notificações
      if (recentUpdates.length > 0 && updates.length > notifications.length) {
        const latestUpdate = recentUpdates[0];
        if (latestUpdate.type === 'comment' && !latestUpdate.isInternal) {
          toast.info(`💬 Nova mensagem no ticket #${latestUpdate.ticketId.slice(-6)}`);
        }
      }
    }, (error) => {
      console.error('❌ Erro ao monitorar notificações:', error);
    });

    return () => unsubscribe();
  }, [currentUser, notifications.length]);

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'status_change':
        return <Settings className="w-4 h-4 text-green-500" />;
      case 'assignment':
        return <UserPlus className="w-4 h-4 text-yellow-500" />;
      case 'resolution':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUpdateTitle = (update: TicketUpdate) => {
    switch (update.type) {
      case 'comment':
        return 'Nova mensagem';
      case 'status_change':
        return 'Status alterado';
      case 'assignment':
        return 'Ticket atribuído';
      case 'resolution':
        return 'Ticket resolvido';
      default:
        return 'Atualização';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 dia atrás';
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const handleNotificationClick = (ticketId: string) => {
    onNotificationClick?.(ticketId);
    setIsOpen(false);
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
    toast.success('Todas as notificações marcadas como lidas');
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96 overflow-y-auto"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações de Suporte</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-6 px-2 text-xs"
            >
              Marcar como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex flex-col items-start p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => handleNotificationClick(notification.ticketId)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="flex-shrink-0 mt-0.5">
                  {getUpdateIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {getUpdateTitle(notification)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{notification.ticketId.slice(-6)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Por: {notification.authorName}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatTimeAgo(notification.createdAt)}
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="text-center justify-center">
          <span className="text-sm text-muted-foreground">
            Ver todos os tickets
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 