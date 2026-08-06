import { sendNewDeckEmail } from './email.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerName, deckName } = req.body;

  if (!playerName || !deckName) {
    return res.status(400).json({ error: 'Invalid data' });
  }

  try {
    await sendNewDeckEmail(playerName, deckName);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error' });
  }
}
