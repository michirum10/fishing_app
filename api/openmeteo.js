// api/openmeteo.js
// Open-Meteo APIプロキシ（CORS回避 + キャッシュ）
// 無料・APIキー不要・全球対応

export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (isNaN(latNum) || isNaN(lonNum) ||
      latNum < 20 || latNum > 46 ||
      lonNum < 122 || lonNum > 154) {
    return res.status(400).json({ error: 'Coordinates out of Japan range' });
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latNum.toFixed(4));
    url.searchParams.set('longitude', lonNum.toFixed(4));
    url.searchParams.set('hourly', 'windspeed_10m,winddirection_10m,precipitation,weathercode,temperature_2m');
    url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,winddirection_10m_dominant,precipitation_sum,sunrise,sunset');
    url.searchParams.set('timezone', 'Asia/Tokyo');
    url.searchParams.set('forecast_days', '3');

    const response = await fetch(url.toString());

    if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);

    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    return res.json(data);

  } catch (e) {
    console.error('openmeteo error:', e.message);
    return res.status(500).json({ error: 'Failed to fetch Open-Meteo', detail: e.message });
  }
}
