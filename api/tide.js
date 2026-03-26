// api/tide.js
// 潮汐APIプロキシ（tide736.net）
// 使用前にtide736.netでportコードを確認してください

export default async function handler(req, res) {
  const { port, year, month, day } = req.query;

  if (!port) {
    return res.status(400).json({ error: 'port is required' });
  }

  // 日付デフォルト：今日（JST）
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const y = year  || now.getFullYear();
  const m = month || String(now.getMonth() + 1).padStart(2, '0');
  const d = day   || String(now.getDate()).padStart(2, '0');

  try {
    // tide736.net API
    // ※ 事前にtide736.netでportコードを確認してください
    const url = `https://tide736.net/get_tide.php?port=${port}&year=${y}&month=${m}&day=${d}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`tide736 returned ${response.status}`);

    const data = await response.json();

    // 潮汐は1日変わらないので長めにキャッシュ
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.json(data);

  } catch (e) {
    console.error('tide error:', e.message);
    return res.status(500).json({ error: 'Failed to fetch tide', detail: e.message });
  }
}
