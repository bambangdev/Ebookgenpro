import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Inisialisasi Firebase Admin. Pastikan service account key sudah di-set di Vercel.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Cek agar tidak inisialisasi berulang kali
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

// Daftar email yang dianggap sebagai admin
const ADMIN_EMAILS = ['poopandastore@gmail.com', 'ordivo10@gmail.com'];

export default async function handler(req, res) {
  // Ambil token dari header Authorization
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    // 1. Verifikasi token untuk mendapatkan ID pengguna (uid)
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // 2. Akses database Firestore
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    // 3. Cek apakah dokumen pengguna ada
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    // 4. Ambil data pengguna dan tambahkan status admin
    let userData = userDoc.data();
    userData.isAdmin = ADMIN_EMAILS.includes(userData.email);

    // 5. Kirim data kembali ke frontend
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
}
