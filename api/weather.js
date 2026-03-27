// api/weather.js
// 気象庁APIプロキシ
// 和歌山: 300000

export default async function handler(req, res) {
  const { code = '300000' } = req.query;

  // 許可するコードのホワイトリスト（都道府県コード）
  const ALLOWED = [
    '010000', // 北海道（宗谷）
    '011000', // 北海道（上川・留萌）
    '012000', // 北海道（網走・北見・紋別）
    '013000', // 北海道（十勝）
    '014000', // 北海道（釧路・根室）
    '015000', // 北海道（胆振・日高）
    '016000', // 北海道（石狩・空知・後志）
    '017000', // 北海道（渡島・檜山）
    '020000', // 青森
    '030000', // 岩手
    '040000', // 宮城
    '050000', // 秋田
    '060000', // 山形
    '070000', // 福島
    '080000', // 茨城
    '090000', // 栃木
    '100000', // 群馬
    '110000', // 埼玉
    '120000', // 千葉
    '130000', // 東京
    '140000', // 神奈川
    '150000', // 新潟
    '160000', // 富山
    '170000', // 石川
    '180000', // 福井
    '190000', // 山梨
    '200000', // 長野
    '210000', // 岐阜
    '220000', // 静岡
    '230000', // 愛知
    '240000', // 三重
    '250000', // 滋賀
    '260000', // 京都
    '270000', // 大阪
    '280000', // 兵庫
    '290000', // 奈良
    '300000', // 和歌山
    '310000', // 鳥取
    '320000', // 島根
    '330000', // 岡山
    '340000', // 広島
    '350000', // 山口
    '360000', // 徳島
    '370000', // 香川
    '380000', // 愛媛
    '390000', // 高知
    '400000', // 福岡
    '410000', // 佐賀
    '420000', // 長崎
    '430000', // 熊本
    '440000', // 大分
    '450000', // 宮崎
    '460000', // 鹿児島
    '471000', // 沖縄（本島）
    '472000', // 沖縄（宮古）
    '473000', // 沖縄（八重山）
  ];
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
