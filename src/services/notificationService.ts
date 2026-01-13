import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'project' | 'system';
  read: boolean;
  createdAt: Date;
}

export const createNotification = async (
  userId: string,
  notification: Omit<Notification, 'id' | 'read' | 'createdAt'>
) => {
  try {
    const notificationRef = doc(db, 'notifications', userId);
    const newNotification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      createdAt: serverTimestamp()
    };

    await updateDoc(notificationRef, {
      items: arrayUnion(newNotification)
    });

    return true;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
  try {
    const notificationRef = doc(db, 'notifications', userId);
    const notificationsDoc = await getDoc(notificationRef);
    
    if (notificationsDoc.exists()) {
      const notifications = notificationsDoc.data().items || [];
      const updatedNotifications = notifications.map((n: Notification) => {
        if (n.id === notificationId) {
          return { ...n, read: true };
        }
        return n;
      });

      await updateDoc(notificationRef, {
        items: updatedNotifications
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const notificationRef = doc(db, 'notifications', userId);
    const notificationsDoc = await getDoc(notificationRef);
    
    if (notificationsDoc.exists()) {
      const notifications = notificationsDoc.data().items || [];
      const updatedNotifications = notifications.map((n: Notification) => ({
        ...n,
        read: true
      }));

      await updateDoc(notificationRef, {
        items: updatedNotifications
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    throw error;
  }
}; 