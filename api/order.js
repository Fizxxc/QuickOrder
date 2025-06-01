// API untuk mengelola pesanan dan antrian
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

export class OrderAPI {
    // Membuat pesanan baru
    static async createOrder(orderData) {
        try {
            const queueNumber = await this.getNextQueueNumber();
            const newOrder = {
                ...orderData,
                queueNumber: queueNumber,
                status: 'pending',
                orderTime: new Date(),
                estimatedTime: this.calculateEstimatedTime()
            };

            const docRef = await addDoc(collection(db, 'orders'), newOrder);
            
            return {
                success: true,
                orderId: docRef.id,
                queueNumber: queueNumber,
                message: 'Pesanan berhasil dibuat'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan nomor antrian berikutnya
    static async getNextQueueNumber() {
        try {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const q = query(
                collection(db, 'orders'),
                where('orderTime', '>=', startOfDay),
                where('orderTime', '<=', endOfDay),
                orderBy('queueNumber', 'desc')
            );

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return 1;
            } else {
                const lastOrder = querySnapshot.docs[0].data();
                return lastOrder.queueNumber + 1;
            }
        } catch (error) {
            console.error('Error getting queue number:', error);
            return Math.floor(Math.random() * 100) + 1; // Fallback
        }
    }

    // Menghitung estimasi waktu
    static calculateEstimatedTime() {
        const baseTime = 15; // 15 menit base time
        const randomAdditional = Math.floor(Math.random() * 10); // 0-10 menit tambahan
        return baseTime + randomAdditional;
    }

    // Update status pesanan
    static async updateOrderStatus(orderId, newStatus) {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: newStatus,
                updatedAt: new Date()
            });

            return {
                success: true,
                message: 'Status pesanan berhasil diupdate'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan semua pesanan
    static async getAllOrders() {
        try {
            const q = query(collection(db, 'orders'), orderBy('orderTime', 'desc'));
            const querySnapshot = await getDocs(q);
            
            const orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            return {
                success: true,
                data: orders
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan pesanan user
    static async getUserOrders(userId) {
        try {
            const q = query(
                collection(db, 'orders'),
                where('userId', '==', userId),
                orderBy('orderTime', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const orders = [];
            
            querySnapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            return {
                success: true,
                data: orders
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Subscribe ke perubahan pesanan real-time
    static subscribeToOrders(callback) {
        const q = query(collection(db, 'orders'), orderBy('orderTime', 'desc'));
        
        return onSnapshot(q, (querySnapshot) => {
            const orders = [];
            querySnapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });
            callback(orders);
        });
    }

    // Menghapus pesanan
    static async deleteOrder(orderId) {
        try {
            await deleteDoc(doc(db, 'orders', orderId));
            return {
                success: true,
                message: 'Pesanan berhasil dihapus'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan statistik pesanan
    static async getOrderStats() {
        try {
            const orders = await this.getAllOrders();
            
            if (!orders.success) {
                throw new Error(orders.error);
            }

            const today = new Date().toDateString();
            const todayOrders = orders.data.filter(order => {
                const orderDate = order.orderTime?.toDate?.() || new Date(order.orderTime);
                return orderDate.toDateString() === today;
            });

            const stats = {
                totalOrders: orders.data.length,
                todayOrders: todayOrders.length,
                pendingOrders: orders.data.filter(order => order.status === 'pending').length,
                completedOrders: orders.data.filter(order => order.status === 'completed').length,
                todayRevenue: todayOrders.reduce((sum, order) => sum + (order.total || 0), 0)
            };

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}