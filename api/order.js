// api/order.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    onSnapshot,
    query,
    orderBy,
    where,
    updateDoc,
    deleteDoc,
    doc
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app-check.js';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBVzfZU-Kc4LyNC_6mOAzisn2jU1HRmqcM",
    authDomain: "order-proj.firebaseapp.com",
    projectId: "order-proj",
    storageBucket: "order-proj.firebasestorage.app",
    messagingSenderId: "235438844119",
    appId: "1:235438844119:web:48c6c5fc53da46bbc26892",
    measurementId: "G-ES8YZMS72L"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// App Check
initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LeXz1ErAAAAAM7wIOqwa21yrxff_7EdxImLG2cv'),
    isTokenAutoRefreshEnabled: true
});

export class OrderAPI {
    static async createOrder(orderData) {
        try {
            const queueNumber = await this.getNextQueueNumber();
            const newOrder = {
                ...orderData,
                queueNumber,
                status: 'pending',
                orderTime: new Date(),
                estimatedTime: this.calculateEstimatedTime()
            };
            const docRef = await addDoc(collection(db, 'orders'), newOrder);
            return { success: true, orderId: docRef.id, queueNumber, message: 'Pesanan berhasil dibuat' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async getNextQueueNumber() {
        try {
            const now = new Date();
            const start = new Date(now.setHours(0, 0, 0, 0));
            const end = new Date(now.setHours(23, 59, 59, 999));

            const q = query(
                collection(db, 'orders'),
                where('orderTime', '>=', start),
                where('orderTime', '<=', end),
                orderBy('queueNumber', 'desc')
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) return 1;

            const last = snapshot.docs[0].data();
            return last.queueNumber + 1;
        } catch (err) {
            console.error('Queue error:', err);
            return Math.floor(Math.random() * 100) + 1;
        }
    }

    static calculateEstimatedTime() {
        return 15 + Math.floor(Math.random() * 10);
    }

    static async updateOrderStatus(orderId, newStatus) {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: newStatus,
                updatedAt: new Date()
            });
            return { success: true, message: 'Status diperbarui' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async getAllOrders() {
        try {
            const q = query(collection(db, 'orders'), orderBy('orderTime', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async getUserOrders(userId) {
        try {
            const q = query(
                collection(db, 'orders'),
                where('userId', '==', userId),
                orderBy('orderTime', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static subscribeToOrders(callback) {
        const q = query(collection(db, 'orders'), orderBy('orderTime', 'desc'));
        return onSnapshot(q, snapshot => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(orders);
        });
    }

    static async deleteOrder(orderId) {
        try {
            await deleteDoc(doc(db, 'orders', orderId));
            return { success: true, message: 'Pesanan dihapus' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async getOrderStats() {
        try {
            const ordersRes = await this.getAllOrders();
            if (!ordersRes.success) throw new Error(ordersRes.error);

            const todayStr = new Date().toDateString();
            const todayOrders = ordersRes.data.filter(order => {
                const orderDate = order.orderTime?.toDate?.() || new Date(order.orderTime);
                return orderDate.toDateString() === todayStr;
            });

            const stats = {
                totalOrders: ordersRes.data.length,
                todayOrders: todayOrders.length,
                pendingOrders: ordersRes.data.filter(o => o.status === 'pending').length,
                completedOrders: ordersRes.data.filter(o => o.status === 'completed').length,
                todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
            };

            return { success: true, data: stats };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}
