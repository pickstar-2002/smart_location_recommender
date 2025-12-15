import { Recommendation } from '@/types';

// 支持的AI模型类型
type AIModel =
  | 'qwen'
  | 'deepseek-v3.2'
  | 'deepseek-v3.1'
  | 'deepseek-r1-0528'
  | 'minimax-m1-80k'
  | 'qwen-coder-480b'
  | 'qwen-vl-235b'
  | 'glm-4.6v';

// 后端代理AI服务
class BackendAIService {
  private baseURL: string;
  private currentModel: AIModel;
  private AI_MODELS: Record<AIModel, { name: string }> = {
    qwen: { name: 'Qwen/Qwen3-235B-A22B-Instruct-2507' },
    'deepseek-v3.2': { name: 'deepseek-ai/DeepSeek-V3.2' },
    'deepseek-v3.1': { name: 'deepseek-ai/DeepSeek-V3.1' },
    'deepseek-r1-0528': { name: 'deepseek-ai/DeepSeek-R1-0528' },
    'minimax-m1-80k': { name: 'MiniMax/MiniMax-M1-80k' },
    'qwen-coder-480b': { name: 'Qwen/Qwen3-Coder-480B-A35B-Instruct' },
    'qwen-vl-235b': { name: 'Qwen/Qwen3-VL-235B-A22B-Instruct' },
    'glm-4.6v': { name: 'ZhipuAI/GLM-4.6V' }
  };

  constructor() {
    this.baseURL = 'https://api-inference.modelscope.cn/v1';
    this.currentModel = 'qwen';
  }

  // 设置当前使用的AI模型
  setModel(model: AIModel) {
    this.currentModel = model;
    console.log(`🤖 切换AI模型为: ${model}`);
  }

  // 获取当前使用的AI模型
  getCurrentModel(): AIModel {
    return this.currentModel;
  }

  async generateComprehensiveReason(recommendation: Recommendation, keyword: string): Promise<string> {
    const models: AIModel[] = [
      this.currentModel,
      'qwen',
      'deepseek-v3.2',
      'deepseek-v3.1',
      'deepseek-r1-0528',
      'minimax-m1-80k',
      'qwen-coder-480b',
      'qwen-vl-235b',
      'glm-4.6v'
    ].filter((v, i, a) => a.indexOf(v as AIModel) === i) as AIModel[];

    for (let idx = 0; idx < models.length; idx++) {
      const model = models[idx];
      try {
        const controller = new AbortController();
        const timeoutMs = 12000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const distance = (recommendation.poi.distance / 1000).toFixed(1);
        const rating = recommendation.poi.rating || 0;
        const address = recommendation.poi.address;
        const drivingTime = recommendation.transportationTimes.driving;
        const transitTime = recommendation.transportationTimes.transit;
        const walkingTime = recommendation.transportationTimes.walking;
        const cyclingTime = recommendation.transportationTimes.cycling;

        const prompt = `请基于以下完整信息，生成一个100字左右的综合推荐理由，要求内容丰富、信息完整：\n\n场所名称：${recommendation.poi.name}\n具体地址：${address}\n搜索关键词：${keyword}\n距离：${distance}公里\n评分：${rating}星\n驾车时间：${drivingTime}分钟\n公交时间：${transitTime}分钟\n步行时间：${walkingTime}分钟\n骑行时间：${cyclingTime}分钟\n\n要求：\n1. 控制在80-120字之间\n2. 必须包含：地点名、地址、距离、到达时间、评价等核心信息\n3. 语言亲切自然，避免模板化\n4. 突出最吸引用户的点\n5. 按照重要性排序：地点特色 > 距离便利性 > 交通时间 > 评价情况\n\n返回纯文本，不要JSON格式，不要多余解释。`;

        const body: any = {
          model: (this.AI_MODELS[model] || this.AI_MODELS.qwen).name,
          messages: [
            { role: 'system', content: '你是一个专业的推荐文案撰写助手，擅长用生动的语言完整传达地点价值，必须包含所有关键信息。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200
        };
        if (model === 'deepseek-r1-0528') {
          body.extra_body = { enable_thinking: true };
        }

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('modelscope_api_key') || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'}`
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timer);
        if (!response.ok) continue;
        const json: any = await response.json();
        const content: string = json?.choices?.[0]?.message?.content?.trim();
        if (content && content.length > 0) {
          return content.length > 120 ? content.slice(0, 120) + '...' : content;
        }
      } catch {
        continue;
      }
    }

    const distanceKm = (recommendation.poi.distance || 0) / 1000;
    const driving = recommendation.transportationTimes?.driving || 0;
    const transit = recommendation.transportationTimes?.transit || 0;
    const walking = recommendation.transportationTimes?.walking || 0;
    const rating = recommendation.poi.rating || 0;
    const addr = recommendation.poi.address || '';
    const name = recommendation.poi.name || keyword;
    return `${name}，位于${addr}，距您约${distanceKm.toFixed(1)}公里；驾车约${driving}分钟，公交约${transit}分钟，步行约${walking}分钟，评分${rating}。综合距离与到达时间，作为本次推荐备选。`;
  }

  async generateRouteNarration(recommendation: Recommendation, originName: string, weather?: string): Promise<string> {
    const models: AIModel[] = [
      this.currentModel,
      'qwen',
      'deepseek-v3.2',
      'deepseek-v3.1',
      'deepseek-r1-0528',
      'minimax-m1-80k',
      'glm-4.6v'
    ].filter((v, i, a) => a.indexOf(v as AIModel) === i) as AIModel[];

    for (let idx = 0; idx < models.length; idx++) {
      const model = models[idx];
      try {
        const controller = new AbortController();
        const timeoutMs = 12000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const name = recommendation.poi.name;
        const addr = recommendation.poi.address || '';
        const city = [recommendation.poi.pname, recommendation.poi.cityname, recommendation.poi.adname].filter(Boolean).join('·');
        const distanceKm = (recommendation.poi.distance || 0) / 1000;
        const t = recommendation.transportationTimes || {} as any;
        const driving = t.driving || 0;
        const transit = t.transit || 0;
        const walking = t.walking || 0;
        const cycling = t.cycling || 0;
        const now = new Date();
        const hour = now.getHours();
        const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        const weatherText = typeof weather === 'string' && weather.length > 0 ? weather : '未知';

        const prompt = `你是一名路线助手，请根据下述信息生成口语化的路线解说，友好、简洁，使用中文并配合合适的emoji：\n\n起点：${originName}\n目的地：${name}（${addr}，${city}）\n距离：约${distanceKm.toFixed(1)}公里\n时间：驾车${driving}分钟，公交${transit}分钟，步行${walking}分钟，骑行${cycling}分钟\n当前天气：${weatherText}\n是否高峰：${isPeak ? '是' : '否'}\n\n要求：\n1. 给出首选出行建议，并解释理由（如高峰期建议避拥堵；雨天建议公交/地铁；非高峰与好天气可推荐骑行并给出骑行方式建议）\n2. 包含拥堵规避建议（如错峰、绕行主干道、选择快速路/高架）\n3. 若适合骑行，说明路线偏好（避车流、选择绿道/河边路线、匀速行驶、注意安全装备）\n4. 语言口语化，150-220字，输出纯文本，不要列表或JSON。`;

        const body: any = {
          model: (this.AI_MODELS[model] || this.AI_MODELS.qwen).name,
          messages: [
            { role: 'system', content: '你是一个贴心的中文路线解说助手，擅长结合路况与天气给出人性化建议。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 300
        };

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('modelscope_api_key') || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'}`
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timer);
        if (!response.ok) continue;
        const json: any = await response.json();
        const content: string = json?.choices?.[0]?.message?.content?.trim();
        if (content && content.length > 0) return content;
      } catch {
        continue;
      }
    }

    const t = recommendation.transportationTimes || { driving: 0, transit: 0, cycling: 0, walking: 0 } as any;
    const driving = t.driving || 0;
    const transit = t.transit || 0;
    const cycling = t.cycling || 0;
    const name = recommendation.poi.name;
    const distanceKm = (recommendation.poi.distance || 0) / 1000;
    return `${originName}出发，前往${name}约${distanceKm.toFixed(1)}公里；驾车约${driving}分钟，公交约${transit}分钟，晴好可尝试骑行（约${cycling}分钟），注意避开主干道与高峰拥堵。`;
  }

  async generateCombinedRecommendation(recommendation: Recommendation, originName: string, keyword: string, weather?: string): Promise<string> {
    const models: AIModel[] = [
      this.currentModel,
      'qwen',
      'deepseek-v3.2',
      'deepseek-v3.1',
      'deepseek-r1-0528',
      'minimax-m1-80k',
      'glm-4.6v'
    ].filter((v, i, a) => a.indexOf(v as AIModel) === i) as AIModel[];

    for (let idx = 0; idx < models.length; idx++) {
      const model = models[idx];
      try {
        const controller = new AbortController();
        const timeoutMs = 14000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const name = recommendation.poi.name;
        const addr = recommendation.poi.address || '';
        const city = [recommendation.poi.pname, recommendation.poi.cityname, recommendation.poi.adname].filter(Boolean).join('·');
        const distanceKm = (recommendation.poi.distance || 0) / 1000;
        const rating = recommendation.poi.rating || 0;
        const tags = (recommendation.poi.tags || []).slice(0, 6).join('、');
        const tel = recommendation.poi.phone || recommendation.poi.tel || '';
        const cost = recommendation.poi.cost || '';
        const t = recommendation.transportationTimes || {} as any;
        const driving = t.driving || 0;
        const transit = t.transit || 0;
        const cycling = t.cycling || 0;
        const walking = t.walking || 0;
        const now = new Date();
        const hour = now.getHours();
        const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        const weatherText = typeof weather === 'string' && weather.length > 0 ? weather : '未知';

        const prompt = `你是一名中文出行与地点推荐助手，请基于以下信息生成约200字的“综合推荐理由与路线解说”，口语化并配合合适emoji，信息尽可能完整：\n\n起点：${originName}\n目的地：${name}（${addr}，${city}）\n关键词：${keyword}\n距离：约${distanceKm.toFixed(1)}公里；评分：${rating}；标签：${tags || '无'}；电话：${tel || '无'}；人均：${cost || '未知'}\n时间：驾车${driving}分钟，公交${transit}分钟，步行${walking}分钟，骑行${cycling}分钟\n天气：${weatherText}；时段：${isPeak ? '高峰' : '非高峰'}\n\n要求：\n1) 将推荐理由与路线建议合并为一段，先给结论，再给理由；\n2) 高峰期提供拥堵规避建议（如错峰、避主干道、选快速路/高架）；雨天优先公交/地铁；好天气可推荐骑行并说明路线偏好（绿道/河边、避车流、装备安全）；\n3) 不要列表或JSON，使用自然口语，结尾给一句贴心提醒。`;

        const body: any = {
          model: (this.AI_MODELS[model] || this.AI_MODELS.qwen).name,
          messages: [
            { role: 'system', content: '你是一个贴心的中文出行与地点推荐助手，擅长综合地点信息与路况给出人性化建议。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 400
        };

        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('modelscope_api_key') || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'}`
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timer);
        if (!response.ok) continue;
        const json: any = await response.json();
        const content: string = json?.choices?.[0]?.message?.content?.trim();
        if (content && content.length > 0) {
          return content.length > 260 ? content.slice(0, 260) + '...' : content;
        }
      } catch {
        continue;
      }
    }

    const name = recommendation.poi.name;
    const addr = recommendation.poi.address || '';
    const distanceKm = (recommendation.poi.distance || 0) / 1000;
    const t = recommendation.transportationTimes || { driving: 0, transit: 0, cycling: 0, walking: 0 } as any;
    const driving = t.driving || 0;
    const transit = t.transit || 0;
    const cycling = t.cycling || 0;
    const rating = recommendation.poi.rating || 0;
    return `${originName}到${name}（${addr}，约${distanceKm.toFixed(1)}公里），驾车${driving}分钟、公交${transit}分钟、骑行约${cycling}分钟，评分${rating}。建议结合时段与天气选择出行方式，注意避堵与安全。`;
  }

  async parseSearchIntent(input: string): Promise<{
    keywords: string[];
    category?: string;
    budget_max?: number;
    min_rating?: number;
    distance_km?: number;
    city?: string;
    area?: string;
    open_hours?: string;
    tags?: string[];
  } | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const systemPrompt = '你是一个中文意图解析器，将用户的自然语言搜索需求解析成结构化JSON，字段必须完整且只输出JSON。';
      const userPrompt = `解析以下需求为JSON：\n【需求】${input}\n【要求】\n1) 输出JSON对象，字段：keywords(数组)、category(字符串)、budget_max(数字)、min_rating(数字)、distance_km(数字)、city(字符串)、area(字符串)、open_hours(字符串)、tags(数组)\n2) 未提及的字段给出合理空值：keywords至少包含一个核心词；budget_max/min_rating/distance_km为空则省略；\n3) 严格JSON，不要多余说明。`;

      const body = {
        model: (this.AI_MODELS[this.currentModel] || this.AI_MODELS.qwen).name,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('modelscope_api_key') || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) return null;
      const json: any = await response.json();
      const content: string = json?.choices?.[0]?.message?.content?.trim();
      if (!content) return null;
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        return null;
      }
      if (!Array.isArray(parsed.keywords) || parsed.keywords.length === 0) {
        parsed.keywords = [String(parsed.category || input).slice(0, 20)];
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

export const backendAIService = new BackendAIService();