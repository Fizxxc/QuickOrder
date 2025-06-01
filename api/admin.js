// API untuk dashboard admin dan manajemen sistem
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

export class AdminAPI {
    // Login admin
    static async loginAdmin(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                return {
                    success: true,
                    user: userCredential.user,
                    userData: userDoc.data(),
                    message: 'Login admin berhasil'
                };
            } else {
                throw new Error('Akses ditolak! Anda bukan admin.');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan dashboard statistics
    static async getDashboardStats() {
        try {
            // Mendapatkan semua pesanan
            const ordersSnapshot = await getDocs(collection(db, 'orders'));
            const orders = [];
            ordersSnapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            // Mendapatkan semua user
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const users = [];
            usersSnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });

            // Hitung statistik
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const todayOrders = orders.filter(order => {
                const orderDate = order.orderTime?.toDate?.() || new Date(order.orderTime);
                return orderDate >= startOfDay && orderDate <= endOfDay;
            });

            const stats = {
                totalOrders: orders.length,
                todayOrders: todayOrders.length,
                pendingOrders: orders.filter(order => order.status === 'pending').length,
                preparingOrders: orders.filter(order => order.status === 'preparing').length,
                readyOrders: orders.filter(order => order.status === 'ready').length,
                completedOrders: orders.filter(order => order.status === 'completed').length,
                totalUsers: users.filter(user => user.role === 'user').length,
                totalAdmins: users.filter(user => user.role === 'admin').length,
                todayRevenue: todayOrders.reduce((sum, order) => sum + (order.total || 0), 0),
                averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length : 0,
                activeQueue: orders.filter(order => 
                    order.status === 'pending' || order.status === 'preparing'
                ).length
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

    // Mendapatkan semua pesanan dengan filter
    static async getOrdersWithFilter(status = null, date = null) {
        try {
            let q = collection(db, 'orders');
            
            if (status) {
                q = query(q, where('status', '==', status));
            }
            
            if (date) {
                const startOfDay = new Date(date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(date);
                endOfDay.setHours(23, 59, 59, 999);
                
                q = query(q, 
                    where('orderTime', '>=', startOfDay),
                    where('orderTime', '<=', endOfDay)
                );
            }

            q = query(q, orderBy('orderTime', 'desc'));

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

    // Update status pesanan
    static async updateOrderStatus(orderId, newStatus, adminId) {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: newStatus,
                updatedAt: new Date(),
                updatedBy: adminId
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

    // Mendapatkan semua user
    static async getAllUsers() {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            const users = [];
            
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });

            return {
                success: true,
                data: users
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update status user (aktif/non-aktif)
    static async updateUserStatus(userId, isActive) {
        try {
            await updateDoc(doc(db, 'users', userId), {
                isActive: isActive,
                updatedAt: new Date()
            });

            return {
                success: true,
                message: `User ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
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

    // Mendapatkan laporan penjualan
    static async getSalesReport(startDate, endDate) {
        try {
            const q = query(
                collection(db, 'orders'),
                where('orderTime', '>=', startDate),
                where('orderTime', '<=', endDate),
                where('status', '==', 'completed'),
                orderBy('orderTime', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const orders = [];
            
            querySnapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            // Hitung statistik laporan
            const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
            const totalOrders = orders.length;
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            // Group by date
            const dailySales = {};
            orders.forEach(order => {
                const date = (order.orderTime?.toDate?.() || new Date(order.orderTime)).toDateString();
                if (!dailySales[date]) {
                    dailySales[date] = { revenue: 0, orders: 0 };
                }
                dailySales[date].revenue += order.total || 0;
                dailySales[date].orders += 1;
            });

            // Popular items
            const itemFrequency = {};
            orders.forEach(order => {
                order.items?.forEach(item => {
                    if (!itemFrequency[item.name]) {
                        itemFrequency[item.name] = 0;
                    }
                    itemFrequency[item.name] += item.quantity || 1;
                });
            });

            const popularItems = Object.entries(itemFrequency)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                success: true,
                data: {
                    orders: orders,
                    summary: {
                        totalRevenue,
                        totalOrders,
                        averageOrderValue
                    },
                    dailySales,
                    popularItems
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Reset antrian harian
    static async resetDailyQueue() {
        try {
            // Ubah semua pesanan yang statusnya 'completed' hari ini menjadi archived
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const q = query(
                collection(db, 'orders'),
                where('orderTime', '>=', startOfDay),
                where('orderTime', '<=', endOfDay),
                where('status', '==', 'completed')
            );

            const querySnapshot = await getDocs(q);
            const batch = [];

            querySnapshot.forEach((doc) => {
                batch.push(
                    updateDoc(doc.ref, {
                        status: 'archived',
                        archivedAt: new Date()
                    })
                );
            });

            await Promise.all(batch);

            return {
                success: true,
                message: 'Antrian harian berhasil direset'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Backup data
    static async backupData() {
        try {
            const collections = ['orders', 'users', 'menu', 'messages'];
            const backup = {};

            for (const collectionName of collections) {
                const querySnapshot = await getDocs(collection(db, collectionName));
                backup[collectionName] = [];
                
                querySnapshot.forEach((doc) => {
                    backup[collectionName].push({ id: doc.id, ...doc.data() });
                });
            }

            backup.timestamp = new Date().toISOString();

            return {
                success: true,
                data: backup,
                message: 'Backup data berhasil'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}