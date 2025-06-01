// api.js
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

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBVzfZU-Kc4LyNC_6mOAzisn2jU1HRmqcM",
    authDomain: "order-proj.firebaseapp.com",
    projectId: "order-proj",
    storageBucket: "order-proj.firebasestorage.app",
    messagingSenderId: "235438844119",
    appId: "1:235438844119:web:48c6c5fc53da46bbc26892",
    measurementId: "G-ES8YZMS72L"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LeXz1ErAAAAAM7wIOqwa21yrxff_7EdxImLG2cv'),
    isTokenAutoRefreshEnabled: true
});

// Kelas untuk Order
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

// Kelas untuk Menu
export class MenuAPI {
    static defaultMenuItems = [
        {
            name: "Nasi Goreng Spesial",
            price: 25000,
            category: "Nasi",
            description: "Nasi goreng dengan telur, ayam, dan sayuran segar",
            image: "https://via.placeholder.com/300x200",
            isAvailable: true
        },
        {
            name: "Mie Ayam Bakso",
            price: 20000,
            category: "Mie",
            description: "Mie ayam dengan bakso dan pangsit goreng",
            image: "https://via.placeholder.com/300x200",
            isAvailable: true
        },
        {
            name: "Gado-gado",
            price: 18000,
            category: "Sayuran",
            description: "Sayuran segar dengan bumbu kacang khas",
            image: "https://via.placeholder.com/300x200",
            isAvailable: true
        },
        {
            name: "Ayam Bakar",
            price: 30000,
            category: "Ayam",
            description: "Ayam bakar bumbu kecap dengan lalapan",
            image: "https://via.placeholder.com/300x200",
            isAvailable: true
        },
        {
            name: "Soto Ayam",
            price: 22000,
            category: "Soto",
            description: "Soto ayam dengan kuah bening dan pelengkap",
            image: "https://via.placeholder.com/300x200",
            isAvailable: true
        },
        {
            name: "Es Teh Manis",
            price: 5000,
            category: "Minuman",
            description: "Es teh manis segar",
            image: "https://via.placeholder.com/300x200",
            isAvailable: true
        }
    ];

    static async initializeDefaultMenu() {
        try {
            const menuSnapshot = await getDocs(collection(db, 'menu'));
            if (menuSnapshot.empty) {
                for (const item of this.defaultMenuItems) {
                    await addDoc(collection(db, 'menu'), {
                        ...item,
                        createdAt: new Date()
                    });
                }
                return { success: true, message: 'Menu default berhasil diinisialisasi' };
            }
            return { success: true, message: 'Menu sudah ada' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async addMenuItem(menuData) {
        try {
            const newItem = {
                ...menuData,
                createdAt: new Date(),
                isAvailable: true
            };
            const docRef = await addDoc(collection(db, 'menu'), newItem);
            return { success: true, itemId: docRef.id, message: 'Item menu berhasil ditambahkan' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async getAllMenuItems() {
        try {
            const querySnapshot = await getDocs(collection(db, 'menu'));
            const menuItems = [];
            querySnapshot.forEach((doc) => {
                menuItems.push({ id: doc.id, ...doc.data() });
            });
            return { success: true, data: menuItems };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static subscribeToMenu(callback) {
        const q = query(collection(db, 'menu'));
        return onSnapshot(q, snapshot => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(items);
        });
    }

    static async updateMenuItem(itemId, updates) {
        try {
            await updateDoc(doc(db, 'menu', itemId), updates);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async deleteMenuItem(itemId) {
        try {
            await deleteDoc(doc(db, 'menu', itemId));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}
