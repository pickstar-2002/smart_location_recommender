import { Router } from 'express'
import OpenAI from 'openai'

const router = Router()

const DEFAULT_MODELSCOPE_API_KEY = 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'

// 支持的AI模型配置
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
}

// AI推荐理由生成接口
router.post('/generate-recommendation-reason', async (req, res) => {
  try {
    const { recommendation, keyword, model = 'qwen' } = req.body
    
    if (!recommendation || !keyword) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：recommendation 和 keyword'
      })
    }

    console.log('🤖 后端开始生成AI推荐理由...')
    console.log(`📍 场所: ${recommendation.poi.name}`)
    console.log(`🔍 关键词: ${keyword}`)
    console.log(`🤖 使用模型: ${model} (${AI_MODELS[model as keyof typeof AI_MODELS]?.description})`)

    // 从请求头、环境变量获取API密钥，若缺失则使用默认密钥
    const apiKey = (req.headers['x-api-key'] as string) || process.env.MODELSCOPE_API_KEY || DEFAULT_MODELSCOPE_API_KEY

    const client = new OpenAI({
      baseURL: 'https://api-inference.modelscope.cn/v1',
      apiKey: apiKey,
    })

    const distance = (recommendation.poi.distance / 1000).toFixed(1)
    const rating = recommendation.poi.rating || 0
    const address = recommendation.poi.address
    const drivingTime = recommendation.transportationTimes.driving
    const transitTime = recommendation.transportationTimes.transit
    const walkingTime = recommendation.transportationTimes.walking
    const cyclingTime = recommendation.transportationTimes.cycling

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
    `

    const startTime = Date.now()
    
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
    }

    // DeepSeek R1使用思考参数
    if (model === 'deepseek-r1-0528') {
      modelConfig.extra_body = { enable_thinking: true }
      modelConfig.messages[0].content = '你是一个专业的推荐文案撰写助手，擅长深度分析与推理，能够用生动的语言完整传达地点价值，且必须包含所有关键信息。'
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
    
    const endTime = Date.now()
    console.log(`✅ AI调用成功，耗时: ${endTime - startTime}ms`)

    const content = response.choices[0]?.message?.content?.trim()
    
    if (!content) {
      console.log('⚠️ AI返回内容为空')
      return res.status(500).json({
        success: false,
        error: 'AI返回内容为空'
      })
    }

    // 确保在合理字数范围内
    const finalContent = content.length > 120 ? content.substring(0, 120) + '...' : content
    
    console.log(`✅ 推荐理由生成完成，字数: ${finalContent.length}`)
    
    res.json({
      success: true,
      data: finalContent,
      model: model,
      modelName: AI_MODELS[model as keyof typeof AI_MODELS]?.name
    })

  } catch (error) {
    console.error('❌ AI推荐理由生成错误:', error)
    console.error('📋 错误详情:', {
      error: error,
      timestamp: new Date().toISOString()
    })
    
    res.status(500).json({
      success: false,
      error: 'AI推荐理由生成失败',
      details: error instanceof Error ? error.message : '未知错误'
    })
  }
})

// 路线口语化解说生成接口
router.post('/generate-route-narration', async (req, res) => {
  try {
    const { recommendation, originName, weather, model = 'qwen' } = req.body
    if (!recommendation || !originName) {
      return res.status(400).json({ success: false, error: '缺少必要参数：recommendation 与 originName' })
    }

    const apiKey = (req.headers['x-api-key'] as string) || process.env.MODELSCOPE_API_KEY || DEFAULT_MODELSCOPE_API_KEY

    const client = new OpenAI({ baseURL: 'https://api-inference.modelscope.cn/v1', apiKey })

    const name = recommendation.poi.name
    const addr = recommendation.poi.address || ''
    const city = [recommendation.poi.pname, recommendation.poi.cityname, recommendation.poi.adname].filter(Boolean).join('·')
    const distanceKm = (recommendation.poi.distance || 0) / 1000
    const t = recommendation.transportationTimes || {}
    const driving = t.driving || 0
    const transit = t.transit || 0
    const walking = t.walking || 0
    const cycling = t.cycling || 0

    const now = new Date()
    const hour = now.getHours()
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
    const weatherText = typeof weather === 'string' && weather.length > 0 ? weather : '未知'

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
`

    const modelConfig: any = {
      model: AI_MODELS[model as keyof typeof AI_MODELS]?.name || AI_MODELS.qwen.name,
      messages: [
        { role: 'system', content: '你是一个贴心的中文路线解说助手，擅长结合路况与天气给出人性化建议。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
    }

    const response = await client.chat.completions.create(modelConfig)
    const content = response.choices[0]?.message?.content?.trim()
    if (!content) {
      return res.status(500).json({ success: false, error: 'AI返回内容为空' })
    }
    res.json({ success: true, data: content, model, modelName: AI_MODELS[model as keyof typeof AI_MODELS]?.name })
  } catch (error) {
    console.error('❌ 路线解说生成错误:', error)
    res.status(500).json({ success: false, error: '路线解说生成失败', details: error instanceof Error ? error.message : '未知错误' })
  }
})

// 综合推荐理由与路线解说生成接口
router.post('/generate-combined-recommendation', async (req, res) => {
  try {
    const { recommendation, originName, keyword, weather, model = 'qwen' } = req.body
    if (!recommendation || !originName || !keyword) {
      return res.status(400).json({ success: false, error: '缺少必要参数：recommendation、originName、keyword' })
    }

    const apiKey = (req.headers['x-api-key'] as string) || process.env.MODELSCOPE_API_KEY || DEFAULT_MODELSCOPE_API_KEY

    const client = new OpenAI({ baseURL: 'https://api-inference.modelscope.cn/v1', apiKey })

    const name = recommendation.poi.name
    const addr = recommendation.poi.address || ''
    const city = [recommendation.poi.pname, recommendation.poi.cityname, recommendation.poi.adname].filter(Boolean).join('·')
    const distanceKm = (recommendation.poi.distance || 0) / 1000
    const rating = recommendation.poi.rating || 0
    const tags = (recommendation.poi.tags || []).slice(0, 6).join('、')
    const tel = recommendation.poi.phone || recommendation.poi.tel || ''
    const cost = recommendation.poi.cost || ''
    const t = recommendation.transportationTimes || {}
    const driving = t.driving || 0
    const transit = t.transit || 0
    const walking = t.walking || 0
    const cycling = t.cycling || 0

    const now = new Date()
    const hour = now.getHours()
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
    const weatherText = typeof weather === 'string' && weather.length > 0 ? weather : '未知'

    const prompt = `
你是一名中文出行与地点推荐助手，请基于以下信息生成约200字的“综合推荐理由与路线解说”，口语化并配合合适emoji，信息尽可能完整：

起点：${originName}
目的地：${name}（${addr}，${city}）
关键词：${keyword}
距离：约${distanceKm.toFixed(1)}公里；评分：${rating}；标签：${tags || '无'}；电话：${tel || '无'}；人均：${cost || '未知'}
时间：驾车${driving}分钟，公交${transit}分钟，步行${walking}分钟，骑行${cycling}分钟
天气：${weatherText}；时段：${isPeak ? '高峰' : '非高峰'}

要求：
1) 将推荐理由与路线建议合并为一段，先给结论，再给理由；
2) 高峰期提供拥堵规避建议（如错峰、避主干道、选快速路/高架）；雨天优先公交/地铁；好天气可推荐骑行并说明路线偏好（绿道/河边、避车流、装备安全）；
3) 不要列表或JSON，使用自然口语，结尾给一句贴心提醒。
`

    const modelConfig: any = {
      model: AI_MODELS[model as keyof typeof AI_MODELS]?.name || AI_MODELS.qwen.name,
      messages: [
        { role: 'system', content: '你是一个贴心的中文出行与地点推荐助手，擅长综合地点信息与路况给出人性化建议。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400,
    }

    const response = await client.chat.completions.create(modelConfig)
    const content = response.choices[0]?.message?.content?.trim()
    if (!content) {
      return res.status(500).json({ success: false, error: 'AI返回内容为空' })
    }
    const finalContent = content.length > 260 ? content.slice(0, 260) + '...' : content
    res.json({ success: true, data: finalContent, model, modelName: AI_MODELS[model as keyof typeof AI_MODELS]?.name })
  } catch (error) {
    console.error('❌ 综合推荐生成错误:', error)
    res.status(500).json({ success: false, error: '综合推荐生成失败', details: error instanceof Error ? error.message : '未知错误' })
  }
})

// 自然语言位置搜索意图解析
router.post('/parse-search-intent', async (req, res) => {
  try {
    const { input, model = 'qwen' } = req.body
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ success: false, error: '缺少必要参数：input' })
    }

    const apiKey = (req.headers['x-api-key'] as string) || process.env.MODELSCOPE_API_KEY || DEFAULT_MODELSCOPE_API_KEY

    const client = new OpenAI({ baseURL: 'https://api-inference.modelscope.cn/v1', apiKey })

    const systemPrompt = '你是一个中文意图解析器，将用户的自然语言搜索需求解析成结构化JSON，字段必须完整且只输出JSON。'
    const userPrompt = `解析以下需求为JSON：
【需求】${input}
【要求】
1) 输出JSON对象，字段：keywords(数组)、category(字符串)、budget_max(数字)、min_rating(数字)、distance_km(数字)、city(字符串)、area(字符串)、open_hours(字符串)、tags(数组)
2) 未提及的字段给出合理空值：keywords至少包含一个核心词；budget_max/min_rating/distance_km为空则省略；
3) 严格JSON，不要多余说明。`

    const response = await client.chat.completions.create({
      model: AI_MODELS[model as keyof typeof AI_MODELS]?.name || AI_MODELS.qwen.name,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) {
      return res.status(500).json({ success: false, error: 'AI返回内容为空' })
    }
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      return res.status(500).json({ success: false, error: 'JSON解析失败', raw: content })
    }

    // 规范化
    if (!Array.isArray(parsed.keywords) || parsed.keywords.length === 0) {
      parsed.keywords = [String(parsed.category || input).slice(0, 20)]
    }
    return res.json({ success: true, data: parsed })
  } catch (error) {
    console.error('❌ 解析搜索意图错误:', error)
    res.status(500).json({ success: false, error: '解析搜索意图失败', details: error instanceof Error ? error.message : '未知错误' })
  }
})

export default router
