import { Request, Response } from 'express';
import OpenAI from 'openai';

const AI_MODELS = {
  qwen: {
    name: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    description: '通义千问大模型，适合中文推荐文案生成'
  },
  'deepseek-v3.2': {
    name: 'deepseek-ai/DeepSeek-V3.2',
    description: 'DeepSeek V3.2，支持中文与推理'
  },
  'deepseek-v3.1': {
    name: 'deepseek-ai/DeepSeek-V3.1',
    description: 'DeepSeek V3.1，通用对话与生成'
  },
  'deepseek-r1-0528': {
    name: 'deepseek-ai/DeepSeek-R1-0528',
    description: 'DeepSeek R1-0528，思维链与深度推理'
  },
  'minimax-m1-80k': {
    name: 'MiniMax/MiniMax-M1-80k',
    description: 'MiniMax M1-80k，大上下文窗口'
  },
  'glm-4.6v': {
    name: 'ZhipuAI/GLM-4.6V',
    description: 'GLM-4.6V，多模态与中文能力'
  }
};

export default async function handler(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'ok' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '仅支持 POST 请求' });
  }

  try {
    const { recommendation, originName, weather, model = 'qwen' } = req.body;
    if (!recommendation || !originName) {
      return res.status(400).json({ success: false, error: '缺少必要参数：recommendation 与 originName' });
    }

    const apiKey = req.headers['x-api-key'] as string || process.env.MODELSCOPE_API_KEY || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069';
    const client = new OpenAI({ baseURL: 'https://api-inference.modelscope.cn/v1', apiKey });

    const name = recommendation.poi.name;
    const addr = recommendation.poi.address || '';
    const city = [recommendation.poi.pname, recommendation.poi.cityname, recommendation.poi.adname].filter(Boolean).join('·');
    const distanceKm = (recommendation.poi.distance || 0) / 1000;
    const t = recommendation.transportationTimes || {};
    const driving = t.driving || 0;
    const transit = t.transit || 0;
    const walking = t.walking || 0;
    const cycling = t.cycling || 0;

    const now = new Date();
    const hour = now.getHours();
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const weatherText = typeof weather === 'string' && weather.length > 0 ? weather : '未知';

    const prompt = `
你是一名路线助手，请根据下述信息生成口语化的路线解说，友好、简洁，使用中文并配合合适的emoji：

起点：${originName}
目的地：${name}（${addr}，${city}）
距离：约${distanceKm.toFixed(1)}公里
时间：驾车${driving}分钟，公交${transit}分钟，步行${walking}分钟，骑行${cycling}分钟
当前天气：${weatherText}
是否高峰：${isPeak ? '是' : '否'}

要求：
1. 给出首选出行建议，并解释理由（如高峰期建议避拥堵；雨天建议公交/地铁；非高峰与好天气可推荐骑行并给出骑行方式建议）
2. 包含拥堵规避建议（如错峰、绕行主干道、选择快速路/高架）
3. 若适合骑行，说明路线偏好（避车流、选择绿道/河边路线、匀速行驶、注意安全装备）
4. 语言口语化，150-220字，输出纯文本，不要列表或JSON。
`;

    const modelConfig: any = {
      model: AI_MODELS[model as keyof typeof AI_MODELS]?.name || AI_MODELS.qwen.name,
      messages: [
        { role: 'system', content: '你是一个贴心的中文路线解说助手，擅长结合路况与天气给出人性化建议。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
    };

    const response = await client.chat.completions.create(modelConfig);
    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return res.status(500).json({ success: false, error: 'AI返回内容为空' });
    }
    res.json({ success: true, data: content, model, modelName: AI_MODELS[model as keyof typeof AI_MODELS]?.name });
  } catch (error) {
    console.error('❌ 路线解说生成错误:', error);
    res.status(500).json({ success: false, error: '路线解说生成失败', details: error instanceof Error ? error.message : '未知错误' });
  }
}