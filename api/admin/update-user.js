import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

const ADMIN_EMAILS = ['poopandastore@gmail.com', 'kucingmona@gmail.com'];

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decodedToken = await getAuth().verifyIdToken(token);
        if (!ADMIN_EMAILS.includes(decodedToken.email)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { userId, newTier } = req.body;
        if (!userId || !['standard', 'pro'].includes(newTier)) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const db = getFirestore();
        await db.collection('users').doc(userId).update({ tier: newTier });

        res.status(200).json({ message: 'User tier updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: error.message });
    }
}
