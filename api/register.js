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

const ADMIN_EMAILS = ['poopandastore@gmail.com', 'kucingmona@gmail.com'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Only POST requests allowed' });
  }

  const { name, phone, email, password } = req.body;

  try {
    // 1. Buat user di Firebase Authentication
    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
      displayName: name,
    });
    
    // 2. Tentukan apakah user adalah admin
    const isAdmin = ADMIN_EMAILS.includes(email);
    
    // 3. Siapkan data untuk disimpan di Firestore
    const userData = {
      name: name,
      phone: phone,
      email: email,
      tier: isAdmin ? 'pro' : 'standard', // Admin langsung dapat tier pro
      generationCount: 0,
      usageResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), // Kuota akan direset awal bulan depan
      registeredAt: new Date(),
      isAdmin: isAdmin
    };

    // 4. Buat dokumen di Firestore dengan ID yang sama dengan ID user
    const db = getFirestore();
    await db.collection('users').doc(userRecord.uid).set(userData);

    return res.status(200).json({ uid: userRecord.uid, email: userRecord.email });
  } catch (error) {
    console.error('Error creating new user:', error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email ini sudah terdaftar. Silakan gunakan email lain.' });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan internal di server.' });
  }
}
