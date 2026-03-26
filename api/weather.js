// api/weather.js
// 気象庁APIプロキシ
// 和歌山: 300000

export default async function handler(req, res) {
  const { code = '300000' } = req.query;

  // 許可するコードのホワイトリスト
  const ALLOWED = ['300000']; // 和歌山のみ（追加可能）
  if (!ALLOWED.includes(code)) {
    return res.status(400).json({ error: 'Invalid area code' });
  }

  try {
    const url = `https://www.jma.go.jp/bosai/forecast/data/forecast/${code}.json`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`JMA returned ${response.status}`);

    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    return res.json(data);

  } catch (e) {
    console.error('weather error:', e.message);
    return res.status(500).json({ error: 'Failed to fetch weather', detail: e.message });
  }
}
