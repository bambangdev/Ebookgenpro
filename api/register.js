import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// PERBAIKAN: Menggunakan getApps() untuk mencegah inisialisasi ganda
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
    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
      displayName: name,
    });
    
    const isAdmin = ADMIN_EMAILS.includes(email);
    const userData = {
      name, phone, email,
      tier: isAdmin ? 'pro' : 'standard',
      generationCount: 0,
      usageResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      registeredAt: new Date(),
      isAdmin: isAdmin
    };

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
