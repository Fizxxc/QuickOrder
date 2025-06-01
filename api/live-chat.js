// API untuk live chat real-time
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
    import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
    
export class LiveChatAPI {
    // Mengirim pesan
    static async sendMessage(messageData) {
        try {
            const newMessage = {
                ...messageData,
                timestamp: serverTimestamp(),
                isRead: false
            };

            const docRef = await addDoc(collection(db, 'messages'), newMessage);

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

    // Subscribe ke pesan real-time
    static subscribeToMessages(callback, roomId = null) {
        let q;

        if (roomId) {
            q = query(
                collection(db, 'messages'),
                where('roomId', '==', roomId),
                orderBy('timestamp', 'asc')
            );
        } else {
            q = query(
                collection(db, 'messages'),
                orderBy('timestamp', 'asc')
            );
        }

        return onSnapshot(q, (querySnapshot) => {
            const messages = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                messages.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });
            });
            callback(messages);
        });
    }

    // Membuat room chat baru
    static async createChatRoom(userId, userName) {
        try {
            const roomData = {
                userId: userId,
                userName: userName,
                adminId: null,
                status: 'waiting', // waiting, active, closed
                createdAt: serverTimestamp(),
                lastActivity: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'chatRooms'), roomData);

            // Kirim pesan pembuka otomatis
            await this.sendMessage({
                roomId: docRef.id,
                senderId: 'system',
                senderName: 'System',
                text: `${userName} bergabung ke chat. Menunggu admin...`,
                type: 'system'
            });

            return {
                success: true,
                roomId: docRef.id,
                message: 'Chat room berhasil dibuat'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Bergabung sebagai admin ke room chat
    static async joinChatAsAdmin(roomId, adminId, adminName) {
        try {
            await updateDoc(doc(db, 'chatRooms', roomId), {
                adminId: adminId,
                adminName: adminName,
                status: 'active',
                lastActivity: serverTimestamp()
            });

            // Kirim pesan admin bergabung
            await this.sendMessage({
                roomId: roomId,
                senderId: adminId,
                senderName: adminName,
                text: 'Admin bergabung ke chat. Ada yang bisa dibantu?',
                type: 'admin'
            });

            return {
                success: true,
                message: 'Admin berhasil bergabung'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan semua room chat aktif
    static subscribeToActiveRooms(callback) {
        const q = query(
            collection(db, 'chatRooms'),
            where('status', 'in', ['waiting', 'active']),
            orderBy('lastActivity', 'desc')
        );

        return onSnapshot(q, (querySnapshot) => {
            const rooms = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                rooms.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    lastActivity: data.lastActivity?.toDate() || new Date()
                });
            });
            callback(rooms);
        });
    }

    // Menutup chat room
    static async closeChatRoom(roomId, closedBy) {
        try {
            await updateDoc(doc(db, 'chatRooms', roomId), {
                status: 'closed',
                closedAt: serverTimestamp(),
                closedBy: closedBy
            });

            // Kirim pesan penutupan
            await this.sendMessage({
                roomId: roomId,
                senderId: 'system',
                senderName: 'System',
                text: 'Chat ditutup. Terima kasih!',
                type: 'system'
            });

            return {
                success: true,
                message: 'Chat room berhasil ditutup'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Auto response untuk pesan user
    static async sendAutoResponse(roomId, userMessage) {
        const responses = {
            'hello': 'Halo! Selamat datang di QuickOrder. Ada yang bisa kami bantu?',
            'help': 'Kami siap membantu Anda. Silakan sampaikan pertanyaan atau keluhan Anda.',
            'order': 'Untuk informasi pesanan, Anda bisa mengecek status di halaman pesanan Anda.',
            'queue': 'Nomor antrian Anda dapat dilihat di halaman pesanan.',
            'payment': 'Pembayaran dapat dilakukan secara tunai saat pengambilan pesanan.',
            'location': 'Kami berlokasi di alamat yang tertera di aplikasi. Silakan cek detail lokasi.',
            'time': 'Estimasi waktu akan muncul setelah Anda melakukan pemesanan.',
            'default': 'Terima kasih atas pesan Anda. Admin akan segera membantu Anda.'
        };

        let responseText = responses.default;
        const lowerMessage = userMessage.toLowerCase();

        for (const [keyword, response] of Object.entries(responses)) {
            if (lowerMessage.includes(keyword)) {
                responseText = response;
                break;
            }
        }

        // Delay sebelum mengirim auto response
        setTimeout(async () => {
            await this.sendMessage({
                roomId: roomId,
                senderId: 'auto-response',
                senderName: 'Auto Response',
                text: responseText,
                type: 'auto'
            });
        }, 1000);
    }

    // Mendapatkan riwayat chat
    static async getChatHistory(roomId) {
        try {
            const q = query(
                collection(db, 'messages'),
                where('roomId', '==', roomId),
                orderBy('timestamp', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const messages = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                messages.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });
            });

            return {
                success: true,
                data: messages
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Menandai pesan sebagai dibaca
    static async markMessageAsRead(messageId) {
        try {
            await updateDoc(doc(db, 'messages', messageId), {
                isRead: true,
                readAt: serverTimestamp()
            });

            return {
                success: true,
                message: 'Pesan ditandai sebagai dibaca'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
