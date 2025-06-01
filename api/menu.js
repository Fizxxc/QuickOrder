// Menu load and display logic
// API untuk mengelola menu makanan
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js';
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app-check.js";

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

const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LeXz1ErAAAAAM7wIOqwa21yrxff_7EdxImLG2cv'),
    isTokenAutoRefreshEnabled: true
});

const menuContainer = document.getElementById('menuContainer');

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

    static async getMenuByCategory(category) {
        try {
            const allMenu = await this.getAllMenuItems();
            if (!allMenu.success) throw new Error(allMenu.error);
            const filteredMenu = allMenu.data.filter(item =>
                item.category.toLowerCase() === category.toLowerCase()
            );
            return { success: true, data: filteredMenu };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async updateMenuItem(itemId, updateData) {
        try {
            await updateDoc(doc(db, 'menu', itemId), {
                ...updateData,
                updatedAt: new Date()
            });
            return { success: true, message: 'Item menu berhasil diupdate' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async updateAvailability(itemId, isAvailable) {
        try {
            await updateDoc(doc(db, 'menu', itemId), {
                isAvailable: isAvailable,
                updatedAt: new Date()
            });
            return { success: true, message: `Item ${isAvailable ? 'tersedia' : 'tidak tersedia'}` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async deleteMenuItem(itemId) {
        try {
            await deleteDoc(doc(db, 'menu', itemId));
            return { success: true, message: 'Item menu berhasil dihapus' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static subscribeToMenu(callback) {
        return onSnapshot(collection(db, 'menu'), (querySnapshot) => {
            const menuItems = [];
            querySnapshot.forEach((doc) => {
                menuItems.push({ id: doc.id, ...doc.data() });
            });
            callback(menuItems);
        });
    }

    static async getCategories() {
        try {
            const allMenu = await this.getAllMenuItems();
            if (!allMenu.success) throw new Error(allMenu.error);
            const categories = [...new Set(allMenu.data.map(item => item.category))];
            return { success: true, data: categories };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async searchMenu(searchTerm) {
        try {
            const allMenu = await this.getAllMenuItems();
            if (!allMenu.success) throw new Error(allMenu.error);
            const filteredMenu = allMenu.data.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return { success: true, data: filteredMenu };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Tambahan: Render menu ke dalam halaman HTML
    static renderMenuItems(items) {
        if (!menuContainer) return;
        menuContainer.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'p-3 border rounded shadow mb-4 bg-white';
            card.innerHTML = `
                <img src="${item.image}" class="w-full h-48 object-cover mb-2 rounded" alt="${item.name}" />
                <h3 class="text-lg font-bold">${item.name}</h3>
                <p class="text-gray-600 mb-1">${item.description}</p>
                <p class="text-purple-600 font-semibold mb-2">Rp ${item.price.toLocaleString()}</p>
                <button onclick="addToCart('${item.id}', '${item.name}', ${item.price})"
                    class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
                    Tambah ke Keranjang
                </button>
            `;
            menuContainer.appendChild(card);
        });
    }

    // Tambahan: Menampilkan semua item dari Firebase ke halaman
    static async displayAllMenuItems() {
        const response = await this.getAllMenuItems();
        if (response.success) {
            this.renderMenuItems(response.data);
        } else {
            menuContainer.innerHTML = `<p class="text-red-500">${response.error}</p>`;
        }
    }
}
