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

  constructor() {
    // 在 EdgeOne Pages 环境下使用 node-functions 路由，否则回退到本地 /api/ai
    this.baseURL = typeof window !== 'undefined' && window.location.origin.includes('edgeone') ? '/api/ai' : '/api/ai';
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

  // 生成推荐理由（通过后端代理）
  async generateComprehensiveReason(recommendation: Recommendation, keyword: string): Promise<string> {
    console.log('🤖 开始通过后端生成AI推荐理由...');
    console.log(`📍 场所: ${recommendation.poi.name}`);
    console.log(`🔍 关键词: ${keyword}`);
    console.log(`🤖 使用模型: ${this.currentModel}`);

    const models: AIModel[] = [
      this.currentModel,
      'qwen' as AIModel,
      'deepseek-v3.2' as AIModel,
      'deepseek-v3.1' as AIModel,
      'deepseek-r1-0528' as AIModel,
      'minimax-m1-80k' as AIModel,
      'qwen-coder-480b' as AIModel,
      'qwen-vl-235b' as AIModel,
      'glm-4.6v' as AIModel
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (let idx = 0; idx < models.length; idx++) {
      const model = models[idx];
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutMs = 12000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        let response;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount < maxRetries) {
          try {
            response = await fetch(`${this.baseURL}/generate-recommendation-reason`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': localStorage.getItem('modelscope_api_key') || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'
              },
              body: JSON.stringify({ recommendation, keyword, model }),
              signal: controller.signal
            });

            if (response.status === 429) {
              throw new Error('MODEL_429');
            }
            break;
          } catch (e) {
            console.error(`❌ ${model} 第${retryCount + 1}次请求失败:`, e);
            if (retryCount === maxRetries - 1) throw e;
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        clearTimeout(timer);
        const endTime = Date.now();
        console.log(`🔄 后端请求完成，耗时: ${endTime - startTime}ms`);
        if (!response!.ok) {
          if (response!.status === 429) {
            throw new Error('MODEL_429');
          }
          const errorData = await response!.json().catch(() => ({ error: '未知错误' }));
          console.error('❌ 后端AI服务错误:', errorData);
          throw new Error(errorData.error || response!.statusText);
        }

        const result = await response!.json();
        if (result && result.success && result.data && String(result.data).trim().length > 0) {
          console.log(`✅ AI推荐理由生成成功，字数: ${result.data.length}`);
          console.log(`📝 生成的推荐理由: ${result.data}`);
          console.log(`🤖 使用的模型: ${result.modelName}`);
          return result.data as string;
        }

        console.warn(`⚠️ 模型${model}返回空内容，尝试下一个模型`);
      } catch (err) {
        console.warn(`⚠️ 模型${model}调用失败，尝试下一个模型`, err);
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
    const fallback = `${name}，位于${addr}，距您约${distanceKm.toFixed(1)}公里；驾车约${driving}分钟，公交约${transit}分钟，步行约${walking}分钟，评分${rating}。综合距离与到达时间，作为本次推荐备选。`;
    console.log('ℹ️ 使用本地兜底推荐理由');
    return fallback;
  }

  // 生成路线口语化解说（通过后端代理）
  async generateRouteNarration(recommendation: Recommendation, originName: string, weather?: string): Promise<string> {
    const models: AIModel[] = [
      this.currentModel,
      'qwen' as AIModel,
      'deepseek-v3.2' as AIModel,
      'deepseek-v3.1' as AIModel,
      'deepseek-r1-0528' as AIModel,
      'minimax-m1-80k' as AIModel,
      'glm-4.6v' as AIModel
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (let idx = 0; idx < models.length; idx++) {
      const model = models[idx];
      try {
        const controller = new AbortController();
        const timeoutMs = 12000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`${this.baseURL}/generate-route-narration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': localStorage.getItem('modelscope_api_key') || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'
          },
          body: JSON.stringify({ recommendation, originName, weather, model }),
          signal: controller.signal
        });

        clearTimeout(timer);
        if (!response.ok) continue;
        const result = await response.json();
        if (result && result.success && result.data) {
          return String(result.data);
        }
      } catch (err) {
        continue;
      }
    }

    // 兜底本地解说
    const t = recommendation.transportationTimes || { driving: 0, transit: 0, cycling: 0, walking: 0 };
    const driving = t.driving || 0;
    const transit = t.transit || 0;
    const cycling = t.cycling || 0;
    const name = recommendation.poi.name;
    const distanceKm = (recommendation.poi.distance || 0) / 1000;
    return `${originName}出发，前往${name}约${distanceKm.toFixed(1)}公里；驾车约${driving}分钟，公交约${transit}分钟，晴好可尝试骑行（约${cycling}分钟），注意避开主干道与高峰拥堵。`;
  }

  // 生成综合推荐理由与路线解说（通过后端代理）
  async generateCombinedRecommendation(recommendation: Recommendation, originName: string, keyword: string, weather?: string): Promise<string> {
    const models: AIModel[] = [
      this.currentModel,
      'qwen' as AIModel,
      'deepseek-v3.2' as AIModel,
      'deepseek-v3.1' as AIModel,
      'deepseek-r1-0528' as AIModel,
      'minimax-m1-80k' as AIModel,
      'glm-4.6v' as AIModel
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (let idx = 0; idx < models.length; idx++) {
      const model = models[idx];
      try {
        const controller = new AbortController();
        const timeoutMs = 14000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`${this.baseURL}/generate-combined-recommendation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': localStorage.getItem('modelscope_api_key') || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'
          },
          body: JSON.stringify({ recommendation, originName, keyword, weather, model }),
          signal: controller.signal
        });

        clearTimeout(timer);
        if (!response.ok) continue;
        const result = await response.json();
        if (result && result.success && result.data) {
          return String(result.data);
        }
      } catch (err) {
        continue;
      }
    }

    // 兜底：拼接已有信息
    const name = recommendation.poi.name;
    const addr = recommendation.poi.address || '';
    const distanceKm = (recommendation.poi.distance || 0) / 1000;
    const t = recommendation.transportationTimes || { driving: 0, transit: 0, cycling: 0, walking: 0 };
    const driving = t.driving || 0;
    const transit = t.transit || 0;
    const cycling = t.cycling || 0;
    const rating = recommendation.poi.rating || 0;
    return `${originName}到${name}（${addr}，约${distanceKm.toFixed(1)}公里），驾车${driving}分钟、公交${transit}分钟、骑行约${cycling}分钟，评分${rating}。建议结合时段与天气选择出行方式，注意避堵与安全。`;
  }

  // 解析自然语言位置搜索意图
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
      const response = await fetch(`${this.baseURL}/parse-search-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': localStorage.getItem('modelscope_api_key') || 'ms-85ed98e9-1a8e-41e5-8215-ee563559d069'
        },
        body: JSON.stringify({ input, model: this.currentModel }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) return null;
      const result = await response.json();
      if (result && result.success) return result.data;
      return null;
    } catch {
      return null;
    }
  }
}

export const backendAIService = new BackendAIService();