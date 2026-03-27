// api/tide.js
// 潮汐APIプロキシ（api.tide736.net）
// パラメータ: pc=都道府県コード(JIS番号) hc=港コード(tide736独自番号)

export default async function handler(req, res) {
  const { pc, hc, year, month, day } = req.query;

  if (!pc || !hc) {
    return res.status(400).json({ error: 'pc (都道府県コード) と hc (港コード) は必須です' });
  }

  // バリデーション
  const pcNum = parseInt(pc, 10);
  const hcNum = parseInt(hc, 10);
  if (isNaN(pcNum) || pcNum < 1 || pcNum > 47 || isNaN(hcNum) || hcNum < 1) {
    return res.status(400).json({ error: 'pc/hc の値が不正です' });
  }

  // 日付デフォルト：今日（JST）
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const y = year  || now.getFullYear();
  const m = month || String(now.getMonth() + 1).padStart(2, '0');
  const d = day   || String(now.getDate()).padStart(2, '0');

  try {
    const url = `https://api.tide736.net/get_tide.php?pc=${pcNum}&hc=${hcNum}&yr=${y}&mn=${m}&dy=${d}&rg=day`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`tide736 returned ${response.status}`);

    const data = await response.json();

    if (data.status !== 1) {
      throw new Error(data.message || '潮汐データ取得失敗');
    }

    // 潮汐は1日変わらないので長めにキャッシュ
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.json(data);

  } catch (e) {
    console.error('tide error:', e.message);
    return res.status(500).json({ error: 'Failed to fetch tide', detail: e.message });
  }
}
