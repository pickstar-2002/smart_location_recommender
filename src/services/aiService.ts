import { SearchResult, LocationPoint, Recommendation } from '@/types';
import { backendAIService } from './backendAiService';

// Qwen3-235B-A22B-Instruct-2507 AI服务 - 使用后端代理
class AIService {

  // 简化版位置分析推荐 - 不使用AI
  async analyzeAndRecommend(
    points: LocationPoint[],
    searchResults: SearchResult[],
    keyword: string
  ): Promise<Recommendation[]> {
    console.log('🔄 开始简化版位置分析推荐...');
    console.log(`📍 用户位置点数量: ${points.length}`);
    console.log(`🔍 搜索关键词: ${keyword}`);
    console.log(`📊 候选地点数量: ${searchResults.length}`);
    
    // 简化的推荐逻辑：基于距离和评分的综合评分
    const scoredResults = searchResults.map(place => {
      // 基础分数计算
      let score = 50; // 基础分
      
      // 距离评分 (0-30分) - 越近分数越高
      const distanceScore = Math.max(0, 30 - (place.distance / 1000) * 2);
      score += distanceScore;
      
      // 评分加分 (0-20分)
      if (place.rating && place.rating > 0) {
        score += Math.min(20, place.rating * 4); // 5分满分得20分
      }
      
      // 关键词匹配加权：完整短语优先
      const full = keyword.trim();
      if (full && place.name && place.name.includes(full)) {
        score += 15; // 完整匹配显著提升
      }
      // 确保分数在0-100范围内
      score = Math.max(0, Math.min(100, score));
      
      console.log(`📍 ${place.name}: 距离=${place.distance}m, 评分=${place.rating}, 综合得分=${score.toFixed(1)}`);
      
      return {
        poi: place,
        score: score,
        reason: '', // 将在后续步骤中通过AI生成
        transportationTimes: {
          driving: Math.floor(place.distance / 500) + 5, // 简化计算
          transit: Math.floor(place.distance / 300) + 8,
          walking: Math.floor(place.distance / 80) + 10,
          cycling: Math.floor(place.distance / 200) + 6
        },
        pointDistances: [],
        mcpValidation: null
      };
    });
    
    // 按分数排序，取前5个
    const topResults = scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(result => ({
        ...result,
        totalScore: result.score,
        routes: [],
        averageReachableTime: 0
      }));
    
    console.log(`✅ 简化版推荐完成，返回${topResults.length}个结果`);
    return topResults;
  }

  // 降级推荐算法
  private fallbackRecommend(searchResults: SearchResult[], centerPoint: { lat: number; lng: number }): Recommendation[] {
    // 按距离和评分排序
    const sorted = searchResults
      .filter(result => result.rating && result.rating >= 3.5) // 过滤低评分
      .sort((a, b) => {
        const scoreA = this.calculateSimpleScore(a, centerPoint);
        const scoreB = this.calculateSimpleScore(b, centerPoint);
        return scoreB - scoreA;
      })
      .slice(0, 5);

    return sorted.map(result => {
      const distanceKm = result.distance / 1000;
      const baseTime = Math.round(distanceKm * 15); // 基础估算时间
      
      // 计算各种交通方式的时间
      const drivingTime = Math.round(distanceKm / 30 * 60);      // 30km/h 驾驶速度
      const transitTime = Math.round(distanceKm / 20 * 60);      // 20km/h 公交速度
      const cyclingTime = Math.round(distanceKm / 15 * 60);     // 15km/h 骑行速度
      const walkingTime = Math.round(distanceKm / 5 * 60);       // 5km/h 步行速度
      
      // 生成个性化的推荐理由
      const reason = this.generateFallbackReason(result, distanceKm, walkingTime, drivingTime);
      
      return {
        poi: result,
        routes: [],
        averageReachableTime: baseTime,
        transportationTimes: {
          driving: drivingTime,
          transit: transitTime,
          cycling: cyclingTime,
          walking: walkingTime
        },
        pointDistances: [{
          pointId: 'center',
          pointName: '中心点',
          distance: result.distance,
          drivingTime: drivingTime,
          transitTime: transitTime,
          cyclingTime: cyclingTime,
          walkingTime: walkingTime
        }],
        totalScore: this.calculateSimpleScore(result, centerPoint),
        reason: reason
      };
    });
  }

  // 生成降级推荐理由
  private generateFallbackReason(result: SearchResult, distanceKm: number, walkingTime: number, drivingTime: number): string {
    const rating = result.rating || 0;
    const ratingText = rating >= 4.5 ? '超高品质' : rating >= 4.0 ? '品质优秀' : rating >= 3.5 ? '口碑良好' : '品质尚可';
    
    // 根据距离生成不同的推荐文案
    if (distanceKm <= 0.5) {
      return `距离超近，仅${distanceKm.toFixed(1)}公里，步行${walkingTime}分钟即达。${ratingText}，交通便利。`;
    } else if (distanceKm <= 1.0) {
      return `距离适中，${distanceKm.toFixed(1)}公里，驾车${drivingTime}分钟可达。${ratingText}，出行方便。`;
    } else if (distanceKm <= 2.0) {
      return `${distanceKm.toFixed(1)}公里路程，驾车${drivingTime}分钟轻松到达。${ratingText}，值得前往。`;
    } else {
      return `距离${distanceKm.toFixed(1)}公里，驾车${drivingTime}分钟可达。${ratingText}，适合专程前往。`;
    }
  }

  private calculateSimpleScore(result: SearchResult, centerPoint: { lat: number; lng: number }): number {
    const distanceScore = Math.max(0, 100 - result.distance / 50); // 距离越近分数越高
    const ratingScore = (result.rating || 3) * 20; // 评分转换为百分制
    return Math.round((distanceScore * 0.6 + ratingScore * 0.4)); // 距离权重60%，评分权重40%
  }

  private calculateCenter(points: LocationPoint[]): { lat: number; lng: number } {
    if (points.length === 0) {
      return { lat: 39.90923, lng: 116.397428 };
    }

    let totalLat = 0;
    let totalLng = 0;

    points.forEach(point => {
      totalLat += point.lat;
      totalLng += point.lng;
    });

    return {
      lat: totalLat / points.length,
      lng: totalLng / points.length
    };
  }

  // 简化版关键词扩展 - 不使用AI
  async expandKeyword(keyword: string): Promise<string[]> {
    console.log(`🔍 开始简化版关键词扩展: ${keyword}`);
    
    // 预定义的同义词映射
    const synonymMap: Record<string, string[]> = {
      '火锅': ['海底捞', '火锅店', '重庆火锅', '四川火锅'],
      'KTV': ['卡拉OK', 'K歌', '夜总会', 'KTV会所'],
      '麻将馆': ['棋牌室', '麻将', '棋牌', '棋牌会所'],
      '咖啡厅': ['咖啡馆', '咖啡', '星巴克', '咖啡屋'],
      '餐厅': ['饭店', '餐馆', '美食', '酒楼'],
      '酒店': ['宾馆', '旅馆', '住宿', '民宿'],
      '超市': ['便利店', '商场', '购物', '杂货店'],
      '医院': ['诊所', '医疗', '健康', '体检中心'],
      '银行': ['ATM', '取款机', '金融', '理财'],
      '加油站': ['中石化', '中石油', '加油', '能源'],
      '电影院': ['影城', '影院', '电影', 'IMAX'],
      '影院': ['电影院', '影城', '电影'],
      '影城': ['电影院', '影院', '电影'],
      '自助': ['自助餐', '自助餐厅'],
      '日式': ['日料', '日本料理', '和食'],
      '日料': ['日本料理', '寿司', '刺身', '和食']
    };
    
    const normalized = keyword.trim();
    // 查找预定义的同义词（针对精确品类词），品牌词不拆分
    const extendedKeywords = synonymMap[normalized] || [];
    
    // 基于常见组合词的智能扩展（无需AI）
    const composites: string[] = [];
    const contains = (w: string) => normalized.includes(w);
    const pushUniq = (arr: string[], v: string) => { if (!arr.includes(v)) arr.push(v); };
    const knownTokens = ['烤肉','烧烤','自助','自助餐','火锅','KTV','咖啡厅','餐厅','咖啡馆','日式','日料','日本料理','寿司','刺身','电影院','影院','影城'];
    for (const t of knownTokens) {
      if (contains(t)) pushUniq(composites, t);
    }
    if (contains('烤肉') && contains('自助')) {
      pushUniq(composites, '烤肉自助');
      pushUniq(composites, '自助烤肉');
      pushUniq(composites, '烤肉自助餐');
      pushUniq(composites, '自助餐 烤肉');
    }
    if (contains('烧烤') && contains('自助')) {
      pushUniq(composites, '烧烤自助');
      pushUniq(composites, '自助烧烤');
      pushUniq(composites, '烧烤自助餐');
    }
    const jpQualifiers = ['日式','日料','日本料理'];
    for (const q of jpQualifiers) {
      if (contains(q) && contains('自助')) {
        pushUniq(composites, `${q}自助`);
        pushUniq(composites, `${q}自助餐`);
        pushUniq(composites, `自助 ${q}`);
      }
    }

    // 总是包含原关键词，保持原词在最前，避免被泛化词覆盖
    const result = Array.from(new Set([normalized, ...composites, ...extendedKeywords]));
    
    console.log(`✅ 关键词扩展完成: ${result.join(', ')}`);
    return result;
  }

  // 生成综合推荐理由（100字左右）- 使用后端代理服务
  async generateComprehensiveReason(recommendation: Recommendation, keyword: string): Promise<string> {
    console.log('🤖 开始生成AI推荐理由（通过后端代理）...');
    console.log(`📍 场所: ${recommendation.poi.name}`);
    console.log(`🔍 关键词: ${keyword}`);
    
    try {
      // 使用后端代理服务调用AI
      const reason = await backendAIService.generateComprehensiveReason(recommendation, keyword);
      console.log(`✅ 推荐理由生成完成，字数: ${reason.length}`);
      return reason;
    } catch (error) {
      console.error('❌ AI推荐理由生成错误:', error);
      console.error('📋 错误详情:', {
        error: error,
        placeName: recommendation.poi.name,
        keyword: keyword,
        timestamp: new Date().toISOString()
      });
      // 暂时不使用降级处理，直接抛出错误便于排查
      throw new Error(`AI推荐理由生成失败: ${error}`);
    }
  }

  // 降级综合推荐理由
  private generateFallbackComprehensiveReason(recommendation: Recommendation, keyword: string): string {
    const name = recommendation.poi.name;
    const address = recommendation.poi.address;
    const distance = (recommendation.poi.distance / 1000).toFixed(1);
    const rating = recommendation.poi.rating || 0;
    const drivingTime = recommendation.transportationTimes.driving;
    const transitTime = recommendation.transportationTimes.transit;
    const walkingTime = recommendation.transportationTimes.walking;
    
    // 根据评分和距离生成不同级别的推荐文案
    if (rating >= 4.5 && distance <= '0.8') {
      return `${name}位于${address}，距您${distance}公里，驾车${drivingTime}分钟即达。${rating}星超高品质，${keyword}首选推荐！`;
    } else if (rating >= 4.0 && distance <= '1.2') {
      return `${name}(${address})距离${distance}公里，驾车${drivingTime}分钟，公交${transitTime}分钟可达。${rating}星优质评价，值得体验的${keyword}。`;
    } else if (distance <= '0.5') {
      return `${name}就在附近，${address}，步行${walkingTime}分钟即达。距您仅${distance}公里，出行超便利的${keyword}选择。`;
    } else {
      return `${name}位于${address}，距离${distance}公里，驾车${drivingTime}分钟可达。${rating}星品质，交通便捷的${keyword}好去处。`;
    }
  }
}

export const aiService = new AIService();