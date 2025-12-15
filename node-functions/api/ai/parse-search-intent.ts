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
    const body = typeof (req as any).body === 'string' ? JSON.parse((req as any).body) : ((req as any).body || {});
    const { input, model = 'qwen' } = body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ success: false, error: '缺少必要参数：input' });
    }

    const apiKey = req.headers['x-api-key'] as string || process.env.MODELSCOPE_API_KEY || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069';
    const client = new OpenAI({ baseURL: 'https://api-inference.modelscope.cn/v1', apiKey });

    const systemPrompt = '你是一个中文意图解析器，将用户的自然语言搜索需求解析成结构化JSON，字段必须完整且只输出JSON。';
    const userPrompt = `解析以下需求为JSON：
【需求】${input}
【要求】
1) 输出JSON对象，字段：keywords(数组)、category(字符串)、budget_max(数字)、min_rating(数字)、distance_km(数字)、city(字符串)、area(字符串)、open_hours(字符串)、tags(数组)
2) 未提及的字段给出合理空值：keywords至少包含一个核心词；budget_max/min_rating/distance_km为空则省略；
3) 严格JSON，不要多余说明。`;

    const response = await client.chat.completions.create({
      model: AI_MODELS[model as keyof typeof AI_MODELS]?.name || AI_MODELS.qwen.name,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return res.status(500).json({ success: false, error: 'AI返回内容为空' });
    }
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({ success: false, error: 'JSON解析失败', raw: content });
    }

    // 规范化
    if (!Array.isArray(parsed.keywords) || parsed.keywords.length === 0) {
      parsed.keywords = [String(parsed.category || input).slice(0, 20)];
    }
    return res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('❌ 解析搜索意图错误:', error);
    res.status(500).json({ success: false, error: '解析搜索意图失败', details: error instanceof Error ? error.message : '未知错误' });
  }
}