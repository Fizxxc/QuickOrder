// API untuk mengelola pesan dan notifikasi
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, getDocs, onSnapshot, query, orderBy, where } from 'firebase/firestore';

const firebaseConfig = {
    // Konfigurasi Firebase Anda
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export class PesanAPI {
    // Mengirim pesan/notifikasi
    static async sendMessage(messageData) {
        try {
            const newMessage = {
                ...messageData,
                timestamp: new Date(),
                isRead: false,
                priority: messageData.priority || 'normal' // low, normal, high, urgent
            };

            const docRef = await addDoc(collection(db, 'notifications'), newMessage);
            
            return {
                success: true,
                messageId: docRef.id,
                message: 'Pesan berhasil dikirim'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mengirim notifikasi order update
    static async sendOrderNotification(orderId, userId, orderStatus, message) {
        try {
            const notificationData = {
                type: 'order_update',
                title: 'Update Pesanan',
                message: message,
                userId: userId,
                orderId: orderId,
                orderStatus: orderStatus,
                timestamp: new Date(),
                isRead: false,
                priority: 'high'
            };

            return await this.sendMessage(notificationData);
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mengirim notifikasi antrian
    static async sendQueueNotification(userId, queueNumber, estimatedTime) {
        try {
            const notificationData = {
                type: 'queue_update',
                title: 'Nomor Antrian Anda',
                message: `Nomor antrian Anda: ${queueNumber}. Estimasi waktu: ${estimatedTime} menit`,
                userId: userId,
                queueNumber: queueNumber,
                estimatedTime: estimatedTime,
                timestamp: new Date(),
                isRead: false,
                priority: 'normal'
            };

            return await this.sendMessage(notificationData);
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mengirim broadcast message ke semua user
    static async sendBroadcastMessage(title, message, priority = 'normal') {
        try {
            // Mendapatkan semua user
            const usersSnapshot = await getDocs(
                query(collection(db, 'users'), where('role', '==', 'user'))
            );

            const promises = [];
            
            usersSnapshot.forEach((doc) => {
                const userData = doc.data();
                promises.push(
                    this.sendMessage({
                        type: 'broadcast',
                        title: title,
                        message: message,
                        userId: doc.id,
                        timestamp: new Date(),
                        isRead: false,
                        priority: priority
                    })
                );
            });

            await Promise.all(promises);

            return {
                success: true,
                message: `Broadcast dikirim ke ${usersSnapshot.size} user`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan notifikasi user
    static async getUserNotifications(userId, limit = 50) {
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const notifications = [];
            let count = 0;
            
            querySnapshot.forEach((doc) => {
                if (count < limit) {
                    notifications.push({ id: doc.id, ...doc.data() });
                    count++;
                }
            });

            return {
                success: true,
                data: notifications
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Subscribe ke notifikasi user real-time
    static subscribeToUserNotifications(userId, callback) {
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc')
        );

        return onSnapshot(q, (querySnapshot) => {
            const notifications = [];
            querySnapshot.forEach((doc) => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
            callback(notifications);
        });
    }

    // Menandai notifikasi sebagai dibaca
    static async markAsRead(notificationId) {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                isRead: true,
                readAt: new Date()
            });

            return {
                success: true,
                message: 'Notifikasi ditandai sebagai dibaca'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Menandai semua notifikasi user sebagai dibaca
    static async markAllAsRead(userId) {
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );

            const querySnapshot = await getDocs(q);
            const promises = [];

            querySnapshot.forEach((doc) => {
                promises.push(
                    updateDoc(doc.ref, {
                        isRead: true,
                        readAt: new Date()
                    })
                );
            });

            await Promise.all(promises);

            return {
                success: true,
                message: 'Semua notifikasi ditandai sebagai dibaca'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Menghapus notifikasi
    static async deleteNotification(notificationId) {
        try {
            await deleteDoc(doc(db, 'notifications', notificationId));
            
            return {
                success: true,
                message: 'Notifikasi berhasil dihapus'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Menghapus notifikasi lama (lebih dari 30 hari)
    static async cleanupOldNotifications() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const q = query(
                collection(db, 'notifications'),
                where('timestamp', '<', thirtyDaysAgo)
            );

            const querySnapshot = await getDocs(q);
            const promises = [];

            querySnapshot.forEach((doc) => {
                promises.push(deleteDoc(doc.ref));
            });

            await Promise.all(promises);

            return {
                success: true,
                message: `${querySnapshot.size} notifikasi lama berhasil dihapus`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan jumlah notifikasi yang belum dibaca
    static async getUnreadCount(userId) {
        try {
            const q = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );

            const querySnapshot = await getDocs(q);

            return {
                success: true,
                count: querySnapshot.size
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mengirim reminder untuk pesanan yang tertunda
    static async sendOrderReminder(orderId, userId, queueNumber) {
        try {
            const reminderData = {
                type: 'order_reminder',
                title: 'Reminder Pesanan',
                message: `Pesanan Anda dengan nomor antrian ${queueNumber} masih dalam proses. Terima kasih atas kesabarannya.`,
                userId: userId,
                orderId: orderId,
                queueNumber: queueNumber,
                timestamp: new Date(),
                isRead: false,
                priority: 'normal'
            };

            return await this.sendMessage(reminderData);
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Auto-cleanup: Menjalankan pembersihan otomatis
    static async autoCleanup() {
        try {
            await this.cleanupOldNotifications();
            console.log('Auto cleanup completed');
        } catch (error) {
            console.error('Auto cleanup failed:', error);
        }
    }

    // Mengirim notifikasi promo/discount
    static async sendPromoNotification(title, message, promoCode = null) {
        try {
            const notificationData = {
                type: 'promo',
                title: title,
                message: message,
                promoCode: promoCode,
                timestamp: new Date(),
                isRead: false,
                priority: 'normal'
            };

            return await this.sendBroadcastMessage(title, message, 'normal');
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}