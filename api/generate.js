import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!initializeApp.length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const TIER_LIMITS = { standard: 3, pro: 1000 };

export default async function handler(req, res) {
  const { userPayload } = req.body;
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const now = new Date();

    // Reset kuota jika sudah masuk bulan baru
    if (now >= userData.usageResetDate.toDate()) {
      userData.generationCount = 0;
      userData.usageResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await userRef.update({ 
        generationCount: 0,
        usageResetDate: userData.usageResetDate
      });
    }

    // Periksa kuota
    const limit = TIER_LIMITS[userData.tier] || 0;
    if (userData.generationCount >= limit) {
      return res.status(429).json({ error: 'Batas kuota generate Anda telah habis bulan ini.' });
    }

    // Panggil Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });

    if (!response.ok) throw new Error('Gagal menghubungi Gemini API');

    // Update kuota pengguna
    await userRef.update({ generationCount: FieldValue.increment(1) });
    
    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Error in generate API:', error);
    res.status(500).json({ error: error.message });
  }
}
