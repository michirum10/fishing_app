// api/sun.js
// 日の出・日没時刻計算（朝マズメ・夕マズメ用）
// 外部API不要・座標から計算

export default async function handler(req, res) {
  const { lat, lon, year, month, day } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const y = Number(year  || now.getFullYear());
  const m = Number(month || now.getMonth() + 1);
  const d = Number(day   || now.getDate());

  try {
    const result = calcSunTimes(Number(lat), Number(lon), y, m, d);
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function calcSunTimes(lat, lon, year, month, day) {
  // Julian Day
  const JD = toJulianDay(year, month, day);

  // 太陽の赤緯・時角から日の出・日没を計算
  const n = JD - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
  const epsilon = 23.439 * Math.PI / 180;
  const sinDec = Math.sin(epsilon) * Math.sin(lambda);
  const dec = Math.asin(sinDec);

  const latRad = lat * Math.PI / 180;
  const cosHA = (Math.cos(90.833 * Math.PI / 180) - Math.sin(latRad) * Math.sin(dec))
              / (Math.cos(latRad) * Math.cos(dec));

  if (Math.abs(cosHA) > 1) {
    // 白夜・極夜（日本では発生しない）
    return { sunrise: '06:00', sunset: '18:00', error: 'calculation failed' };
  }

  const HA = Math.acos(cosHA) * 180 / Math.PI;

  // 均時差
  const eqTime = 4 * (L - 0.0057183 - Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)) * 180 / Math.PI);

  // JST = UTC+9、経度補正
  const solarNoon = 720 - 4 * lon - eqTime + 9 * 60; // 分単位
  const sunriseMin = solarNoon - 4 * HA;
  const sunsetMin  = solarNoon + 4 * HA;

  const fmt = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${String(h).padStart(2, '0')}:${String(m < 60 ? m : 59).padStart(2, '0')}`;
  };

  // 朝マズメ：日の出40分前〜日の出30分後
  // 夕マズメ：日没30分前〜日没40分後
  return {
    sunrise:      fmt(sunriseMin),
    sunset:       fmt(sunsetMin),
    mornStart:    fmt(sunriseMin - 40),
    mornEnd:      fmt(sunriseMin + 30),
    duskStart:    fmt(sunsetMin - 30),
    duskEnd:      fmt(sunsetMin + 40),
  };
}

function toJulianDay(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}
