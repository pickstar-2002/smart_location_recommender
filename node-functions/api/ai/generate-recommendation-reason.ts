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
  'qwen-coder-480b': {
    name: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
    description: 'Qwen Coder 480B，代码理解与生成'
  },
  'qwen-vl-235b': {
    name: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
    description: 'Qwen VL 235B，多模态文本图像'
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
    const { recommendation, keyword, model = 'qwen' } = req.body;

    if (!recommendation || !keyword) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：recommendation 和 keyword'
      });
    }

    console.log('🤖 后端开始生成AI推荐理由...');
    console.log(`📍 场所: ${recommendation.poi.name}`);
    console.log(`🔍 关键词: ${keyword}`);
    console.log(`🤖 使用模型: ${model} (${AI_MODELS[model as keyof typeof AI_MODELS]?.description})`);

    // 从请求头或环境变量获取API密钥
    const apiKey = req.headers['x-api-key'] as string || process.env.MODELSCOPE_API_KEY || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069';

    const client = new OpenAI({
      baseURL: 'https://api-inference.modelscope.cn/v1',
      apiKey: apiKey,
    });

    const distance = (recommendation.poi.distance / 1000).toFixed(1);
    const rating = recommendation.poi.rating || 0;
    const address = recommendation.poi.address;
    const drivingTime = recommendation.transportationTimes.driving;
    const transitTime = recommendation.transportationTimes.transit;
    const walkingTime = recommendation.transportationTimes.walking;
    const cyclingTime = recommendation.transportationTimes.cycling;

    const prompt = `
    请基于以下完整信息，生成一个100字左右的综合推荐理由，要求内容丰富、信息完整：
    
    场所名称：${recommendation.poi.name}
    具体地址：${address}
    搜索关键词：${keyword}
    距离：${distance}公里
    评分：${rating}星
    驾车时间：${drivingTime}分钟
    公交时间：${transitTime}分钟
    步行时间：${walkingTime}分钟
    骑行时间：${cyclingTime}分钟
    
    要求：
    1. 控制在80-120字之间
    2. 必须包含：地点名、地址、距离、到达时间、评价等核心信息
    3. 语言亲切自然，避免模板化
    4. 突出最吸引用户的点
    5. 按照重要性排序：地点特色 > 距离便利性 > 交通时间 > 评价情况
    
    返回纯文本，不要JSON格式，不要多余解释。
    `;

    const startTime = Date.now();

    // 根据选择的模型设置不同的参数
    let modelConfig: any = {
      model: AI_MODELS[model as keyof typeof AI_MODELS]?.name || AI_MODELS.qwen.name,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的推荐文案撰写助手，擅长用生动的语言完整传达地点价值，必须包含所有关键信息。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    };

    // DeepSeek R1使用思考参数
    if (model === 'deepseek-r1-0528') {
      modelConfig.extra_body = { enable_thinking: true };
      modelConfig.messages[0].content = '你是一个专业的推荐文案撰写助手，擅长深度分析与推理，能够用生动的语言完整传达地点价值，且必须包含所有关键信息。';
    }

    // 添加重试机制，处理429错误
    let response;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        response = await client.chat.completions.create(modelConfig);
        break; // 成功则跳出循环
      } catch (error: any) {
        if (error.status === 429 && retryCount < maxRetries - 1) {
          // 429错误，等待后重试
          const waitTime = (retryCount + 1) * 2000; // 递增等待时间：2s, 4s, 6s
          console.log(`⚠️ 遇到429限流错误，等待${waitTime/1000}秒后重试 (第${retryCount + 1}次)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
        } else {
          // 其他错误或重试次数用完，抛出错误
          throw error;
        }
      }
    }

    if (!response) {
      throw new Error('AI请求失败，重试次数已用完');
    }

    const endTime = Date.now();
    console.log(`✅ AI调用成功，耗时: ${endTime - startTime}ms`);

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      console.log('⚠️ AI返回内容为空');
      return res.status(500).json({
        success: false,
        error: 'AI返回内容为空'
      });
    }

    // 确保在合理字数范围内
    const finalContent = content.length > 120 ? content.substring(0, 120) + '...' : content;

    console.log(`✅ 推荐理由生成完成，字数: ${finalContent.length}`);

    res.json({
      success: true,
      data: finalContent,
      model: model,
      modelName: AI_MODELS[model as keyof typeof AI_MODELS]?.name
    });

  } catch (error) {
    console.error('❌ AI推荐理由生成错误:', error);
    console.error('📋 错误详情:', {
      error: error,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'AI推荐理由生成失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
}