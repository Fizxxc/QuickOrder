// API untuk mengelola data user dan autentikasi
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

export class UserAPI {
    // Registrasi user baru
    static async registerUser(userData) {
        try {
            const { email, password, name } = userData;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Simpan data user ke Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                name: name,
                email: email,
                role: 'user',
                createdAt: new Date(),
                isActive: true
            });

            return {
                success: true,
                user: userCredential.user,
                message: 'Registrasi berhasil'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Login user
    static async loginUser(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            
            if (userDoc.exists()) {
                return {
                    success: true,
                    user: userCredential.user,
                    userData: userDoc.data(),
                    message: 'Login berhasil'
                };
            } else {
                throw new Error('Data user tidak ditemukan');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Logout user
    static async logoutUser() {
        try {
            await signOut(auth);
            return {
                success: true,
                message: 'Logout berhasil'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Mendapatkan data user
    static async getUserData(userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                return {
                    success: true,
                    data: userDoc.data()
                };
            } else {
                throw new Error('User tidak ditemukan');
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update data user
    static async updateUserData(userId, updateData) {
        try {
            await setDoc(doc(db, 'users', userId), updateData, { merge: true });
            return {
                success: true,
                message: 'Data user berhasil diupdate'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

