const NOTION_API_URL = 'https://api.notion.com/v1/pages';
const NOTION_DB_ID = process.env.NOTION_FEEDBACK_DB_ID ?? '';
const NOTION_API_KEY = process.env.NOTION_FEEDBACK_API_KEY ?? '';

interface FeedbackBody {
  type: 'idea' | 'improve';
  message: string;
  source?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!NOTION_DB_ID || !NOTION_API_KEY) {
    return res.status(500).json({ error: 'Notion credentials not configured' });
  }

  const { type, message, source } = req.body as FeedbackBody;

  if (!message || !type) {
    return res.status(400).json({ error: 'Missing required fields: type, message' });
  }

  const typeLabel = type === 'idea' ? '💡 Idea' : '🛠 Improvement';

  try {
    const response = await fetch(NOTION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties: {
          Feedback: {
            title: [{ text: { content: message } }],
          },
          Type: {
            select: { name: typeLabel },
          },
          Source: {
            url: source || null,
          },
          Status: {
            status: { name: 'New' },
          },
          Submitted: {
            date: { start: new Date().toISOString() },
          },
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('Notion API error:', data);
      return res.status(502).json({ error: 'Failed to save feedback' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: errMsg });
  }
}
