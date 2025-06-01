// Menu load and display logic// API untuk mengelola menu makanan
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

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

export class MenuAPI {
    // Data menu default
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

    // Inisialisasi menu default
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

                return {
                    success: true,
                    message: 'Menu default berhasil diinisialisasi'
                };
            }

            return {
                success: true,
                message: 'Menu sudah ada'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Menambah item menu baru
    static async addMenuItem(menuData) {
        try {
            const newItem = {
                ...menuData,
                createdAt: new Date(),
                isAvailable: true
            };

            const docRef = await addDoc(collection(db, 'menu'), newItem);

            return {
                success: true,
                itemId: docRef.id,
                message: 'Item menu berhasil ditambahkan'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan semua item menu
    static async getAllMenuItems() {
        try {
            const querySnapshot = await getDocs(collection(db, 'menu'));
            const menuItems = [];

            querySnapshot.forEach((doc) => {
                menuItems.push({ id: doc.id, ...doc.data() });
            });

            return {
                success: true,
                data: menuItems
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan menu berdasarkan kategori
    static async getMenuByCategory(category) {
        try {
            const allMenu = await this.getAllMenuItems();

            if (!allMenu.success) {
                throw new Error(allMenu.error);
            }

            const filteredMenu = allMenu.data.filter(item =>
                item.category.toLowerCase() === category.toLowerCase()
            );

            return {
                success: true,
                data: filteredMenu
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update item menu
    static async updateMenuItem(itemId, updateData) {
        try {
            await updateDoc(doc(db, 'menu', itemId), {
                ...updateData,
                updatedAt: new Date()
            });

            return {
                success: true,
                message: 'Item menu berhasil diupdate'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update ketersediaan item
    static async updateAvailability(itemId, isAvailable) {
        try {
            await updateDoc(doc(db, 'menu', itemId), {
                isAvailable: isAvailable,
                updatedAt: new Date()
            });

            return {
                success: true,
                message: `Item ${isAvailable ? 'tersedia' : 'tidak tersedia'}`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Menghapus item menu
    static async deleteMenuItem(itemId) {
        try {
            await deleteDoc(doc(db, 'menu', itemId));

            return {
                success: true,
                message: 'Item menu berhasil dihapus'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Subscribe ke perubahan menu real-time
    static subscribeToMenu(callback) {
        return onSnapshot(collection(db, 'menu'), (querySnapshot) => {
            const menuItems = [];
            querySnapshot.forEach((doc) => {
                menuItems.push({ id: doc.id, ...doc.data() });
            });
            callback(menuItems);
        });
    }

    // Mendapatkan kategori yang tersedia
    static async getCategories() {
        try {
            const allMenu = await this.getAllMenuItems();

            if (!allMenu.success) {
                throw new Error(allMenu.error);
            }

            const categories = [...new Set(allMenu.data.map(item => item.category))];

            return {
                success: true,
                data: categories
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mencari menu berdasarkan nama
    static async searchMenu(searchTerm) {
        try {
            const allMenu = await this.getAllMenuItems();

            if (!allMenu.success) {
                throw new Error(allMenu.error);
            }

            const filteredMenu = allMenu.data.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );

            return {
                success: true,
                data: filteredMenu
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Inisialisasi App Check dengan ReCaptchaV3Provider
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LeXz1ErAAAAAM7wIOqwa21yrxff_7EdxImLG2cv'), // reCAPTCHA v3 key dari Google
      isTokenAutoRefreshEnabled: true // agar token diperbarui otomatis
    });