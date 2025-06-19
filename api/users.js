import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!initializeApp.length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const ADMIN_EMAILS = ['poopandastore@gmail.com', 'kucingmona@gmail.com'];

export default async function handler(req, res) {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decodedToken = await getAuth().verifyIdToken(token);
        if (!ADMIN_EMAILS.includes(decodedToken.email)) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        const db = getFirestore();
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Konversi Timestamp ke string agar aman untuk JSON
        const sanitizedUsers = users.map(user => ({
            ...user,
            registeredAt: user.registeredAt.toDate().toISOString(),
            usageResetDate: user.usageResetDate.toDate().toISOString()
        }));

        res.status(200).json(sanitizedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
}
