// api/msil.js
// 海しるAPI プロキシ — 最寄り潮汐推算地点（リンク）を返す
// 環境変数: MSIL_SUBSCRIPTION_KEY（portal.msil.go.jp で登録・取得）
//
// GET /api/msil?lat={lat}&lon={lon}
// → { features: [...], nearest: { name, linkUrl, pc, hc, dist } }
//
// 海しるAPI v2: 潮汐推算[リンク]
//   https://api.msil.go.jp/oceanography/tide/prediction/links/v2/MapServer/0/query
//   廃止予定: 2026-05-31
//   認証: Ocp-Apim-Subscription-Key ヘッダー or subscription-key クエリパラメータ

const MSIL_BASE = 'https://api.msil.go.jp/oceanography/tide/prediction/links/v2/MapServer/0/query';

export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const key = process.env.MSIL_SUBSCRIPTION_KEY;

  if (!key) {
    return res.status(503).json({
      error: 'MSIL_SUBSCRIPTION_KEY not configured',
      configured: false,
      hint: 'Vercel ダッシュボードで MSIL_SUBSCRIPTION_KEY を設定してください（portal.msil.go.jp で無料登録）'
    });
  }

  const latN = parseFloat(lat);
  const lonN = parseFloat(lon);
  if (isNaN(latN) || isNaN(lonN) || latN < 20 || latN > 46 || lonN < 122 || lonN > 154) {
    return res.status(400).json({ error: 'lat/lon が不正です（日本国内の座標を指定してください）' });
  }

  try {
    const url = new URL(MSIL_BASE);
    url.searchParams.set('geometry', `${lonN},${latN}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('distance', '100000');   // 100km 半径
    url.searchParams.set('units', 'esriSRUnit_Meter');
    url.searchParams.set('outFields', '*');
    url.searchParams.set('returnGeometry', 'true');
    url.searchParams.set('outSR', '4326');
    url.searchParams.set('f', 'json');

    const response = await fetch(url.toString(), {
      headers: { 'Ocp-Apim-Subscription-Key': key }
    });

    if (!response.ok) throw new Error(`MSIL API returned ${response.status}: ${await response.text()}`);

    const data = await response.json();
    if (data.error) throw new Error(JSON.stringify(data.error));

    const features = (data.features || []).map(f => {
      const attrs = f.attributes || {};
      // リンクフィールド名は不明のため複数候補を試みる
      const linkUrl = attrs.URL || attrs.url || attrs.link || attrs.LINK || attrs.リンク || attrs.LINK_URL || '';
      // 地点名フィールドも複数候補
      const name = attrs.NAME || attrs.name || attrs.地点名 || attrs.STATION_NAME || '';
      // tide736.net URLからpc/hcを抽出
      const { pc, hc } = parseTide736Url(linkUrl);
      // 距離計算（WGS84近似）
      let dist = null;
      if (f.geometry) {
        const gx = f.geometry.x ?? lonN;
        const gy = f.geometry.y ?? latN;
        const dx = (gx - lonN) * Math.cos((latN * Math.PI) / 180) * 111.32;
        const dy = (gy - latN) * 111.32;
        dist = Math.sqrt(dx * dx + dy * dy); // km
      }
      return { attrs, name, linkUrl, pc, hc, dist, geometry: f.geometry };
    }).sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999));

    const nearest = features[0] || null;

    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.json({
      nearest,
      features: features.slice(0, 5),
      total: features.length,
    });

  } catch (e) {
    console.error('msil error:', e.message);
    return res.status(500).json({ error: '海しるAPI fetch 失敗', detail: e.message });
  }
}

// tide736.net の URL から pc / hc を抽出
// 例: https://tide736.net/?port=hakodate&pc=1&hc=3
//     https://tide736.net/...#pc=1&hc=3
function parseTide736Url(url) {
  if (!url || !url.includes('tide736')) return { pc: null, hc: null };
  try {
    const u = new URL(url);
    const pc = u.searchParams.get('pc');
    const hc = u.searchParams.get('hc');
    if (pc && hc) return { pc: parseInt(pc, 10), hc: parseInt(hc, 10) };
    // フラグメント (#pc=1&hc=3) も試みる
    const frag = new URLSearchParams(u.hash.replace('#', ''));
    const fPc = frag.get('pc');
    const fHc = frag.get('hc');
    if (fPc && fHc) return { pc: parseInt(fPc, 10), hc: parseInt(fHc, 10) };
  } catch {}
  return { pc: null, hc: null };
}
