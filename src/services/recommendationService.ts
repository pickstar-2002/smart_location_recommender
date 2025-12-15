import { LocationPoint, Recommendation, SearchResult } from '@/types';
import { amapService } from './amapService';
import { aiService } from './aiService';
import { mcpServiceManager } from './mcpService';
import { ProgressStep } from '@/components/RecommendationProgress';

// 智能推荐服务
export class RecommendationService {
  // 主要推荐流程 - 支持进度回调
  async getRecommendations(
    points: LocationPoint[],
    keyword: string,
    onProgress?: (steps: ProgressStep[], currentStep: number) => void
  ): Promise<Recommendation[]> {
    if (points.length === 0) {
      throw new Error('至少需要输入一个位置点');
    }

    const steps: ProgressStep[] = [
      {
        id: 'center',
        title: '计算中心位置',
        description: '正在分析您的位置分布...',
        status: 'pending'
      },
      {
        id: 'keywords',
        title: '扩展搜索关键词',
        description: '正在生成相关搜索词...',
        status: 'pending'
      },
      {
        id: 'search',
        title: '搜索周边地点',
        description: '正在搜寻候选地点...',
        status: 'pending'
      },
      {
        id: 'analyze',
        title: '分析地理位置',
        description: '正在评估地点适宜性...',
        status: 'pending'
      },
      {
        id: 'routes',
        title: '计算交通路线',
        description: '正在计算最优路线...',
        status: 'pending'
      },
      {
        id: 'ranking',
        title: '智能排序推荐',
        description: '正在生成最终推荐...',
        status: 'pending'
      }
    ];

    try {
      // 步骤1: 计算中心点
      steps[0].status = 'running';
      if (onProgress) onProgress(steps, 0);
      
      const centerPoint = amapService.calculateCenter(points);
      steps[0].status = 'completed';
      steps[0].details = [`中心位置: ${centerPoint.lat.toFixed(4)}, ${centerPoint.lng.toFixed(4)}`];
      if (onProgress) onProgress(steps, 0);
      
      // 步骤2: 扩展关键词
      steps[1].status = 'running';
      if (onProgress) onProgress(steps, 1);
      
      const keywords = await aiService.expandKeyword(keyword);
      steps[1].status = 'completed';
      steps[1].details = [`扩展关键词: ${keywords.join(', ')}`];
      if (onProgress) onProgress(steps, 1);
      
      // 步骤3: 搜索周边地点
      steps[2].status = 'running';
      if (onProgress) onProgress(steps, 2);
      
      let allResults: SearchResult[] = [];
      const searchDetails: string[] = [];
      
      for (let i = 0; i < keywords.slice(0, 3).length; i++) {
        const kw = keywords[i];
        steps[2].description = `正在搜索: ${kw} (${i + 1}/${keywords.slice(0, 3).length})`;
        if (onProgress) onProgress(steps, 2);
        
        const places = await amapService.searchAround(centerPoint, kw, 5000);
        const results = places.map(place => amapService.convertToSearchResult(place));
        allResults = [...allResults, ...results];
        searchDetails.push(`${kw}: ${results.length}个结果`);
      }
      
      const uniqueResults = this.deduplicateResults(allResults);
      steps[2].status = 'completed';
      steps[2].details = [`共找到 ${uniqueResults.length} 个候选地点`, ...searchDetails];
      if (onProgress) onProgress(steps, 2);
      
      // 步骤4: 分析地理位置
      steps[3].status = 'running';
      if (onProgress) onProgress(steps, 3);
      
      const simplifiedRecommendations = await aiService.analyzeAndRecommend(points, uniqueResults, keyword);
      steps[3].status = 'completed';
      steps[3].details = [`分析完成，筛选出 ${simplifiedRecommendations.length} 个推荐地点`];
      if (onProgress) onProgress(steps, 3);
      
      // 步骤5: 计算路线信息
      steps[4].status = 'running';
      steps[4].description = '正在计算各交通方式的时间...';
      if (onProgress) onProgress(steps, 4);
      
      const recommendationsWithRoutes = await this.addRouteInformation(
        simplifiedRecommendations,
        points,
        (progress) => {
          steps[4].description = progress;
          if (onProgress) onProgress(steps, 4);
        }
      );
      steps[4].status = 'completed';
      steps[4].details = ['路线计算完成'];
      if (onProgress) onProgress(steps, 4);
      
      // 步骤6: 生成推荐理由
      steps[5].status = 'running';
      if (onProgress) onProgress(steps, 5);
      
      const recommendationsWithReasons = await this.generateComprehensiveReasons(
        recommendationsWithRoutes,
        keyword,
        (progress) => {
          steps[5].description = progress;
          if (onProgress) onProgress(steps, 5);
        }
      );
      steps[5].status = 'completed';
      steps[5].details = ['推荐完成'];
      if (onProgress) onProgress(steps, 5);
      
      return recommendationsWithReasons;
    } catch (error) {
      console.error('推荐服务错误:', error);
      // 更新错误步骤状态
      const currentStepIndex = steps.findIndex(step => step.status === 'running');
      if (currentStepIndex !== -1) {
        steps[currentStepIndex].status = 'error';
        steps[currentStepIndex].description = `错误: ${error.message}`;
        if (onProgress) onProgress(steps, currentStepIndex);
      }
      throw error;
    }
  }

  // 逐步推荐流程 - 用于显示每个步骤的真实执行过程
  async extendKeywords(keyword: string): Promise<string[]> {
    try {
      const keywords = await aiService.expandKeyword(keyword);
      console.log(`关键词扩展结果: ${keywords.join(', ')}`);
      return keywords;
    } catch (error) {
      console.error('关键词扩展失败:', error);
      // 降级方案：返回原始关键词
      return [keyword];
    }
  }

  async searchNearbyPlaces(
    points: LocationPoint[],
    keywords: string[],
    options?: { radiusMeters?: number; minRating?: number; budgetMax?: number }
  ): Promise<SearchResult[]> {
    try {
      const centerPoint = amapService.calculateCenter(points);
      let allResults: SearchResult[] = [];
      
      const radius = options?.radiusMeters ?? 5000;
      for (const kw of keywords.slice(0, 3)) {
        const places = await amapService.searchAround(centerPoint, kw, radius);
        const results = places.map(place => amapService.convertToSearchResult(place));
        allResults = [...allResults, ...results];
      }
      
      const uniqueResults = this.deduplicateResults(allResults);
      let filtered = uniqueResults;
      if (typeof options?.minRating === 'number') {
        filtered = filtered.filter(r => (r.rating ?? 0) >= (options!.minRating as number));
      }
      if (typeof options?.budgetMax === 'number') {
        filtered = filtered.filter(r => {
          if (!r.cost) return true;
          const num = parseFloat(String(r.cost).replace(/[^0-9.]/g, ''));
          if (isNaN(num)) return true;
          return num <= (options!.budgetMax as number);
        });
      }
      console.log(`周边搜索完成: 找到 ${filtered.length} 个候选地点（筛选后）`);
      return filtered;
    } catch (error) {
      console.error('周边搜索失败:', error);
      throw new Error('搜索周边场所失败');
    }
  }

  async analyzeLocations(searchResults: SearchResult[], points: LocationPoint[]): Promise<SearchResult[]> {
    try {
      // 分析地理位置 - 这里可以添加更复杂的地理分析逻辑
      console.log(`地理位置分析完成`);
      return searchResults;
    } catch (error) {
      console.error('地理位置分析失败:', error);
      throw new Error('地理位置分析失败');
    }
  }

  async calculateRoutes(searchResults: SearchResult[], points: LocationPoint[]): Promise<Recommendation[]> {
    try {
      // 转换为推荐格式并计算路线
      const recommendations = searchResults.map(result => ({
        poi: result,
        score: 0.5, // 基础分数
        reason: '基础推荐',
        routes: [],
        averageReachableTime: 0,
        transportationTimes: {
          driving: 0,
          transit: 0,
          walking: 0,
          cycling: 0
        },
        pointDistances: [],
        totalScore: 50 // 基础总分
      }));

      // 计算路线信息
      const recommendationsWithRoutes = await this.addRouteInformation(recommendations, points);
      console.log(`路线计算完成`);
      return recommendationsWithRoutes;
    } catch (error) {
      console.error('路线计算失败:', error);
      throw new Error('计算最优路线失败');
    }
  }

  async aiRanking(recommendations: Recommendation[], keyword: string): Promise<Recommendation[]> {
    try {
      // 使用AI进行智能排序
      const aiRecommendations = await aiService.analyzeAndRecommend(
        recommendations.map(r => ({ 
          id: `point-${r.poi.id}`, 
          lat: r.poi.location.lat, 
          lng: r.poi.location.lng 
        })),
        recommendations.map(r => r.poi),
        keyword
      );
      console.log(`AI智能排序完成`);
      return aiRecommendations;
    } catch (error) {
      console.error('AI排序失败:', error);
      throw new Error('AI智能排序失败');
    }
  }

  fallbackRanking(recommendations: Recommendation[], keyword: string): Recommendation[] {
    // 降级方案：使用基础排序算法
    console.log('使用降级排序方案');
    return recommendations.sort((a, b) => {
      // 优先按平均可达时间排序，时间越短越好
      if (a.averageReachableTime !== b.averageReachableTime) {
        return a.averageReachableTime - b.averageReachableTime;
      }
      // 其次按总分排序
      return b.totalScore - a.totalScore;
    });
  }

  async mcpValidation(recommendations: Recommendation[]): Promise<Recommendation[]> {
    try {
      // MCP验证和增强
      const points = recommendations.map(r => ({ 
        id: `mcp-${r.poi.id}`, 
        lat: r.poi.location.lat, 
        lng: r.poi.location.lng 
      }));
      const validatedRecommendations = await this.validateWithMCP(recommendations, points);
      console.log(`MCP验证完成`);
      return validatedRecommendations;
    } catch (error) {
      console.error('MCP验证失败:', error);
      throw new Error('MCP验证信息失败');
    }
  }

  // 去重搜索结果
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.name}-${result.location.lat}-${result.location.lng}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // 添加路线信息 - 支持进度回调
  private async addRouteInformation(
    recommendations: Recommendation[],
    points: LocationPoint[],
    onProgress?: (message: string) => void
  ): Promise<Recommendation[]> {
    const updatedRecommendations = [];
    
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      if (onProgress) {
        onProgress(`正在计算路线: ${rec.poi.name} (${i + 1}/${recommendations.length})`);
      }
      
      const routes: any[] = [];
      const modeStats = {
        driving: { totalTime: 0, totalDistance: 0, count: 0 },
        walking: { totalTime: 0, totalDistance: 0, count: 0 },
        transit: { totalTime: 0, totalDistance: 0, count: 0 },
        cycling: { totalTime: 0, totalDistance: 0, count: 0 }
      };

      const pointDistances = [];
      
      for (const point of points) {
        const drivingRoute = await amapService.getRoute(
          point,
          rec.poi.location,
          'driving'
        );

        const walkingRoute = await amapService.getRoute(
          point,
          rec.poi.location,
          'walking'
        );

        const transitRoute = await amapService.getRoute(
          point,
          rec.poi.location,
          'transit'
        );

        const pointDistanceInfo = {
          pointId: point.id,
          pointName: point.name,
          distance: this.calculateDistance(point, rec.poi.location),
          drivingTime: undefined as number | undefined,
          walkingTime: undefined as number | undefined,
          transitTime: undefined as number | undefined,
          cyclingTime: undefined as number | undefined
        };

        if (drivingRoute) {
          routes.push(drivingRoute);
          modeStats.driving.totalTime += drivingRoute.duration;
          modeStats.driving.totalDistance += drivingRoute.distance;
          modeStats.driving.count++;
          pointDistanceInfo.drivingTime = Math.round(drivingRoute.duration / 60);
        } else {
          pointDistanceInfo.drivingTime = this._estimateTransportationTime(pointDistanceInfo.distance, 'driving');
        }

        if (walkingRoute) {
          routes.push(walkingRoute);
          modeStats.walking.totalTime += walkingRoute.duration;
          modeStats.walking.totalDistance += walkingRoute.distance;
          modeStats.walking.count++;
          pointDistanceInfo.walkingTime = Math.round(walkingRoute.duration / 60);
        } else {
          pointDistanceInfo.walkingTime = this._estimateTransportationTime(pointDistanceInfo.distance, 'walking');
        }

        if (transitRoute) {
          routes.push(transitRoute);
          modeStats.transit.totalTime += transitRoute.duration;
          modeStats.transit.totalDistance += transitRoute.distance;
          modeStats.transit.count++;
          pointDistanceInfo.transitTime = Math.round(transitRoute.duration / 60);
        } else {
          pointDistanceInfo.transitTime = this._estimateTransportationTime(pointDistanceInfo.distance, 'transit');
        }

        pointDistanceInfo.cyclingTime = this._estimateTransportationTime(pointDistanceInfo.distance, 'cycling');
        pointDistances.push(pointDistanceInfo);
      }

      const transportationTimes = {
        driving: modeStats.driving.count > 0 ? Math.round(modeStats.driving.totalTime / modeStats.driving.count / 60) : 0,
        transit: modeStats.transit.count > 0 ? Math.round(modeStats.transit.totalTime / modeStats.transit.count / 60) : 0,
        walking: modeStats.walking.count > 0 ? Math.round(modeStats.walking.totalTime / modeStats.walking.count / 60) : 0,
        cycling: 0
      };

      const avgDistance = (modeStats.driving.totalDistance + modeStats.walking.totalDistance) / 
                        Math.max(modeStats.driving.count + modeStats.walking.count, 1);
      const avgDistanceKm = avgDistance / 1000;

      if (transportationTimes.transit === 0 && avgDistanceKm > 0) {
        transportationTimes.transit = Math.round(avgDistanceKm / 18 * 60 + 8);
      }

      if (avgDistanceKm > 0) {
        transportationTimes.cycling = Math.round(avgDistanceKm / 15 * 60);
      }

      let averageTime = 0;
      
      if (transportationTimes.driving > 0) {
        averageTime = Math.round(transportationTimes.driving * 1.2);
      } else if (transportationTimes.transit > 0) {
        averageTime = Math.round(transportationTimes.transit * 0.7);
      } else if (transportationTimes.cycling > 0) {
        averageTime = transportationTimes.cycling;
      }
      
      if (averageTime > 300) {
        const avgDistanceKm = (modeStats.driving.totalDistance + modeStats.walking.totalDistance) / 1000;
        averageTime = Math.round(avgDistanceKm / 20 * 60);
      }

      updatedRecommendations.push({
        ...rec,
        routes,
        averageReachableTime: averageTime,
        transportationTimes,
        pointDistances
      });
    }

    return updatedRecommendations;
  }

  // 计算地理中心点
  calculateGeographicCenter(points: LocationPoint[]): { lat: number; lng: number } {
    return amapService.calculateCenter(points);
  }

  // 计算最优服务区域（考虑交通可达性）
  async calculateOptimalServiceArea(
    points: LocationPoint[],
    searchResults: SearchResult[]
  ): Promise<{ lat: number; lng: number }> {
    if (points.length === 0) {
      return { lat: 39.90923, lng: 116.397428 };
    }

    if (points.length === 1) {
      return points[0];
    }

    // 简单的加权中心计算
    // 在实际应用中，这里可以使用更复杂的算法，如考虑交通网络的最小生成树等
    let totalLat = 0;
    let totalLng = 0;
    let totalWeight = 0;

    // 使用距离作为权重因子
    for (const point of points) {
      let minDistance = Infinity;
      
      for (const result of searchResults) {
        const distance = this.calculateDistance(point, result.location);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }

      // 距离越近权重越大
      const weight = minDistance < 1000 ? 2 : 1;
      totalLat += point.lat * weight;
      totalLng += point.lng * weight;
      totalWeight += weight;
    }

    return {
      lat: totalLat / totalWeight,
      lng: totalLng / totalWeight
    };
  }

  // 计算两点间距离（米）
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371000; // 地球半径（米）
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // 估算各种交通方式的时间（当API获取失败时的备选方案）
  private _estimateTransportationTime(distance: number, mode: 'driving' | 'walking' | 'transit' | 'cycling'): number {
    const distanceKm = distance / 1000;
    
    switch (mode) {
      case 'driving':
        // 驾车：平均30km/h，考虑红绿灯和拥堵
        return Math.round(distanceKm / 30 * 60 + 2); // +2分钟缓冲时间
      
      case 'walking':
        // 步行：平均5km/h
        return Math.round(distanceKm / 5 * 60);
      
      case 'transit':
        // 公交：平均18km/h + 等车换乘时间
        const baseTravelTime = distanceKm / 18 * 60;
        const waitingTime = 5; // 平均等车时间5分钟
        const transferTime = distanceKm > 5 ? 5 : 2; // 距离>5km时增加换乘时间
        return Math.round(baseTravelTime + waitingTime + transferTime);
      
      case 'cycling':
        // 骑行：平均15km/h
        return Math.round(distanceKm / 15 * 60);
      
      default:
        return Math.round(distanceKm / 20 * 60); // 默认20km/h综合速度
    }
  }

  // 获取推荐详情
  async getRecommendationDetail(recommendation: Recommendation): Promise<Recommendation> {
    try {
      // 获取更详细的地点信息
      const detail = await amapService.getPlaceDetail(recommendation.poi.id);
      if (detail) {
        recommendation.poi = amapService.convertToSearchResult(detail);
      }
      
      // 获取MCP增强信息
      const enhancedRecommendation = await mcpServiceManager.getEnhancedRecommendation(recommendation);
      
      return enhancedRecommendation;
    } catch (error) {
      console.error('获取推荐详情错误:', error);
      return recommendation;
    }
  }

  // MCP验证
  private async validateWithMCP(
    recommendations: Recommendation[],
    points: LocationPoint[]
  ): Promise<Recommendation[]> {
    try {
      const validatedRecommendations = await Promise.all(
        recommendations.map(async (rec) => {
          try {
            const validation = await mcpServiceManager.validateRecommendation(rec, points);
            
            return {
              ...rec,
              mcpValidation: validation,
              confidence: validation.confidence
            };
          } catch (error) {
            console.error('MCP验证失败:', error);
            return {
              ...rec,
              mcpValidation: {
                isValid: true,
                confidence: 0.7,
                details: {}
              },
              confidence: 0.7
            };
          }
        })
      );

      return validatedRecommendations;
    } catch (error) {
      console.error('MCP批量验证错误:', error);
      return recommendations;
    }
  }

  // 生成综合推荐理由（逐个生成，避免并发请求）- 支持进度回调
  async generateComprehensiveReasons(
    recommendations: Recommendation[], 
    keyword: string,
    onProgress?: (message: string) => void
  ): Promise<Recommendation[]> {
    try {
      if (onProgress) {
        onProgress(`开始生成AI推荐理由，共${recommendations.length}个地点`);
      }
      
      const recommendationsWithReasons: Recommendation[] = [];
      
      // 逐个生成推荐理由，避免并发请求导致429错误
      for (let i = 0; i < recommendations.length; i++) {
        const rec = recommendations[i];
        if (onProgress) {
          onProgress(`正在生成推荐理由: ${rec.poi.name} (${i + 1}/${recommendations.length})`);
        }
        
        try {
          // 添加请求间隔，避免API限流
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const comprehensiveReason = await aiService.generateComprehensiveReason(rec, keyword);
          recommendationsWithReasons.push({
            ...rec,
            reason: comprehensiveReason
          });
          
        } catch (error) {
          console.error(`❌ 第${i + 1}个推荐理由生成失败:`, error);
          // 即使某个推荐失败，也继续处理下一个
          recommendationsWithReasons.push(rec); // 保持原有的reason不变
        }
      }
      
      if (onProgress) {
        onProgress(`推荐理由生成完成 (${recommendationsWithReasons.filter(r => r.reason && r.reason !== '基础推荐').length}/${recommendations.length})`);
      }
      
      return recommendationsWithReasons;
      
    } catch (error) {
      console.error('批量生成综合推荐理由错误:', error);
      return recommendations;
    }
  }
}

export const recommendationService = new RecommendationService();