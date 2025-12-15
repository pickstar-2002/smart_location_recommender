import { AMapPlace, LocationPoint, SearchResult, RouteInfo } from '@/types';

// 高德地图API服务
class AMapService {
  private key: string;
  private baseUrl = 'https://restapi.amap.com/v3';

  constructor(apiKey: string) {
    this.key = apiKey;
  }

  // 地址转坐标
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    const url = `${this.baseUrl}/geocode/geo?key=${this.key}&address=${encodeURIComponent(address)}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const location = data.geocodes[0].location.split(',');
        return {
          lng: parseFloat(location[0]),
          lat: parseFloat(location[1])
        };
      }
      throw new Error('地址解析失败');
    } catch (error) {
      console.error('地理编码错误:', error);
      throw error;
    }
  }

  // 地址输入提示 - 智能附近搜索（完全匹配优先，同名地点按距离排序）
  async getAddressSuggestions(keyword: string, location?: { lat: number; lng: number }): Promise<Array<{ name: string; address: string; location: string; distance?: number }>> {
    if (!keyword || keyword.length < 2) {
      return [];
    }

    try {
      console.log(`=== 开始搜索: "${keyword}" ===`);
      console.log(`当前位置:`, location);
      console.log(`搜索策略: 完全匹配优先，同名地点按距离排序`);
      
      // 第一步：获取所有候选结果（包括附近搜索和输入提示）
      let candidateResults: Array<{ name: string; address: string; location: string; distance?: number; source: string }> = [];
      
      // 如果有当前位置，优先使用周边搜索API
      if (location) {
        // 首先尝试周边搜索，限制在10公里范围内（扩大搜索范围）
        const nearbyUrl = `${this.baseUrl}/place/around?key=${this.key}&keywords=${encodeURIComponent(keyword)}&location=${location.lng},${location.lat}&radius=10000&sortrule=distance&output=json`;
        
        try {
          const nearbyResponse = await fetch(nearbyUrl);
          const nearbyData = await nearbyResponse.json();
          
          console.log(`周边搜索结果:`, nearbyData);
          
          if (nearbyData.status === '1' && nearbyData.pois && nearbyData.pois.length > 0) {
            const nearbyResults = nearbyData.pois.map((poi: any) => ({
              name: poi.name,
              address: poi.address || poi.district || '',
              location: poi.location || '',
              distance: parseFloat(poi.distance) || 0,
              source: 'nearby'
            }));
            
            candidateResults = [...candidateResults, ...nearbyResults];
            console.log(`周边搜索获得 ${nearbyResults.length} 个结果`);
          }
        } catch (nearbyError) {
          console.warn('周边搜索失败:', nearbyError);
        }
      }
      
      // 第二步：获取输入提示结果
      // 获取当前城市信息
      let city = '';
      if (location) {
        try {
          const regeoUrl = `${this.baseUrl}/geocode/regeo?key=${this.key}&location=${location.lng},${location.lat}&poitype=&radius=1000&extensions=base&batch=false`;
          const regeoResponse = await fetch(regeoUrl);
          const regeoData = await regeoResponse.json();
          
          if (regeoData.status === '1' && regeoData.regeocode && regeoData.regeocode.addressComponent) {
            city = regeoData.regeocode.addressComponent.city || regeoData.regeocode.addressComponent.province;
            console.log(`获取当前城市: ${city}`);
          }
        } catch (regeoError) {
          console.warn('获取城市信息失败:', regeoError);
        }
      }
      
      // 输入提示搜索
      const inputtipsUrl = `${this.baseUrl}/assistant/inputtips?key=${this.key}&keywords=${encodeURIComponent(keyword)}&datatype=all`;
      
      // 优先搜索当前城市
      if (city) {
        try {
          const cityUrl = `${inputtipsUrl}&city=${encodeURIComponent(city)}&citylimit=true`;
          console.log(`城市限制搜索URL: ${cityUrl}`);
          const cityResponse = await fetch(cityUrl);
          const cityData = await cityResponse.json();
          
          if (cityData.status === '1' && cityData.tips && cityData.tips.length > 0) {
            const inputResults = cityData.tips
              .filter((tip: any) => tip.name && !candidateResults.some(existing => existing.name === tip.name))
              .map((tip: any) => {
                // 计算距离
                let distance = undefined;
                if (location && tip.location) {
                  const [lng, lat] = tip.location.split(',').map(Number);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    distance = Math.round(this._straightDistance(location, { lat, lng }));
                  }
                }
                
                return {
                  name: tip.name,
                  address: tip.address || tip.district || '',
                  location: tip.location || '',
                  distance,
                  source: 'inputtips'
                };
              });
            
            candidateResults = [...candidateResults, ...inputResults];
            console.log(`城市限制输入提示获得 ${inputResults.length} 个结果`);
          }
        } catch (cityError) {
          console.warn('城市限制搜索失败:', cityError);
        }
      }
      
      // 如果结果还不够，使用无城市限制的输入提示
      if (candidateResults.length < 8) {
        try {
          const response = await fetch(inputtipsUrl);
          const data = await response.json();
          
          if (data.status === '1' && data.tips && data.tips.length > 0) {
            const additionalResults = data.tips
              .filter((tip: any) => tip.name && !candidateResults.some(existing => existing.name === tip.name))
              .slice(0, 5 - candidateResults.length)
              .map((tip: any) => {
                // 计算距离
                let distance = undefined;
                if (location && tip.location) {
                  const [lng, lat] = tip.location.split(',').map(Number);
                  if (!isNaN(lat) && !isNaN(lng)) {
                    distance = Math.round(this._straightDistance(location, { lat, lng }));
                  }
                }
                
                return {
                  name: tip.name,
                  address: tip.address || tip.district || '',
                  location: tip.location || '',
                  distance,
                  source: 'inputtips_general'
                };
              });
            
            candidateResults = [...candidateResults, ...additionalResults];
            console.log(`基础输入提示获得 ${additionalResults.length} 个结果`);
          }
        } catch (error) {
          console.warn('基础输入提示失败:', error);
        }
      }
      
      console.log(`候选结果总数: ${candidateResults.length} 个`);
      
      // 新的排序逻辑：优先处理同名地点的距离排序
      const normalizedKeyword = keyword.trim().toLowerCase();
      
      // 1. 找出所有同名地点（完全匹配）
      const exactNameMatches = candidateResults.filter(result => 
        result.name.trim().toLowerCase() === normalizedKeyword
      );
      
      // 2. 找出所有相关地点（开头匹配、包含匹配）
      const relatedMatches = candidateResults.filter(result => {
        const resultName = result.name.trim().toLowerCase();
        return resultName.startsWith(normalizedKeyword) || resultName.includes(normalizedKeyword);
      });
      
      // 3. 其他地点
      const otherResults = candidateResults.filter(result => 
        !exactNameMatches.some(exact => exact.name === result.name) &&
        !relatedMatches.some(related => related.name === result.name)
      );
      
      // 对同名地点按距离排序（这是关键！）
      if (location && exactNameMatches.length > 0) {
        console.log(`找到 ${exactNameMatches.length} 个同名"${keyword}"地点，按距离排序`);
        console.log(`同名地点排序前:`, exactNameMatches.map(r => ({name: r.name, distance: r.distance, address: r.address})));
        
        // 如果找到多个同名地点，给用户明确的提示
        if (exactNameMatches.length > 1) {
          console.log(`⚠️ 发现多个同名地点，将按距离排序显示！`);
        }
        
        exactNameMatches.sort((a, b) => {
          const distA = a.distance || Infinity;
          const distB = b.distance || Infinity;
          return distA - distB;
        });
        console.log(`同名地点排序后:`, exactNameMatches.map(r => ({name: r.name, distance: r.distance, address: r.address})));
      }
      
      // 对相关地点也按距离排序
      if (location && relatedMatches.length > 0) {
        console.log(`找到 ${relatedMatches.length} 个相关"${keyword}"地点，按距离排序`);
        relatedMatches.sort((a, b) => {
          const distA = a.distance || Infinity;
          const distB = b.distance || Infinity;
          return distA - distB;
        });
      }
      
      // 对其他结果按距离排序
      if (location && otherResults.length > 0) {
        otherResults.sort((a, b) => {
          const distA = a.distance || Infinity;
          const distB = b.distance || Infinity;
          return distA - distB;
        });
      }
      
      // 最终排序：同名地点（按距离）> 相关地点（按距离）> 其他地点（按距离）
      const sortedResults = [
        ...exactNameMatches,
        ...relatedMatches,
        ...otherResults
      ];
      
      console.log(`最终排序结果:`);
      console.log(`- 同名地点: ${exactNameMatches.length} 个`);
      console.log(`- 相关地点: ${relatedMatches.length} 个`);
      console.log(`- 其他地点: ${otherResults.length} 个`);
      
      // 返回最终结果（只返回需要的字段）
      const finalResults = sortedResults.slice(0, 5).map(result => ({
        name: result.name,
        address: result.address,
        location: result.location,
        distance: result.distance || undefined // 确保undefined值被正确处理
      }));
      
      console.log(`最终返回 ${finalResults.length} 个结果:`, finalResults.map(r => ({name: r.name, distance: r.distance, address: r.address})));
      console.log(`=== 搜索完成: "${keyword}" ===`);
      return finalResults;
      
    } catch (error) {
      console.error('地址提示错误:', error);
      return [];
    }
  }

  // 坐标转地址（逆地理编码）
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = `${this.baseUrl}/geocode/regeo?key=${this.key}&location=${lng},${lat}&poitype=&radius=1000&extensions=base&batch=false&roadlevel=0`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.regeocode) {
        return data.regeocode.formatted_address || '未知地址';
      }
      return '地址获取失败';
    } catch (error) {
      console.error('逆地理编码错误:', error);
      return '地址获取失败';
    }
  }

  // 周边搜索
  async searchAround(center: { lat: number; lng: number }, keyword: string, radius = 3000): Promise<AMapPlace[]> {
    const url = `${this.baseUrl}/place/around?key=${this.key}&keywords=${encodeURIComponent(keyword)}&location=${center.lng},${center.lat}&radius=${radius}&sortrule=distance&output=json`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.pois) {
        return data.pois.map((poi: any) => ({
          id: poi.id,
          name: poi.name,
          address: poi.address,
          location: poi.location,
          distance: parseFloat(poi.distance),
          rating: poi.biz_ext?.rating ? parseFloat(poi.biz_ext.rating) : undefined,
          photos: poi.photos || [],
          tel: poi.tel,
          biz_ext: poi.biz_ext,
          type: poi.type,
          typecode: poi.typecode,
          shopinfo: poi.shopinfo,
          pname: poi.pname,
          cityname: poi.cityname,
          adname: poi.adname
        }));
      }
      return [];
    } catch (error) {
      console.error('周边搜索错误:', error);
      return [];
    }
  }

  // 天气查询（基础实时天气）
  async getWeatherByCityName(city: string): Promise<{ weather: string; temperature: string; humidity?: string; winddirection?: string; windpower?: string; reporttime?: string; city?: string } | null> {
    if (!city) return null;
    const url = `${this.baseUrl}/weather/weatherInfo?key=${this.key}&city=${encodeURIComponent(city)}&extensions=base`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === '1' && data.lives && data.lives.length > 0) {
        const live = data.lives[0];
        return { 
          weather: live.weather, 
          temperature: live.temperature,
          humidity: live.humidity,
          winddirection: live.winddirection,
          windpower: live.windpower,
          reporttime: live.reporttime,
          city: live.city
        };
      }
      return null;
    } catch (error) {
      console.error('天气查询错误:', error);
      return null;
    }
  }

  async getCityByCoordinate(lat: number, lng: number): Promise<string | null> {
    const url = `${this.baseUrl}/geocode/regeo?key=${this.key}&location=${lng},${lat}&poitype=&radius=1000&extensions=base&batch=false`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === '1' && data.regeocode && data.regeocode.addressComponent) {
        const comp = data.regeocode.addressComponent;
        return comp.city || comp.province || null;
      }
      return null;
    } catch (error) {
      console.error('获取城市信息错误:', error);
      return null;
    }
  }

  // 获取地点详情
  async getPlaceDetail(id: string): Promise<AMapPlace | null> {
    const url = `${this.baseUrl}/place/detail?key=${this.key}&id=${id}&output=json`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === '1' && data.pois && data.pois.length > 0) {
        const poi = data.pois[0];
        return {
          id: poi.id,
          name: poi.name,
          address: poi.address,
          location: poi.location,
          distance: 0,
          rating: poi.biz_ext?.rating ? parseFloat(poi.biz_ext.rating) : undefined,
          photos: poi.photos || [],
          tel: poi.tel,
          biz_ext: poi.biz_ext,
          type: poi.type,
          typecode: poi.typecode,
          shopinfo: poi.shopinfo,
          pname: poi.pname,
          cityname: poi.cityname,
          adname: poi.adname
        };
      }
      return null;
    } catch (error) {
      console.error('获取地点详情错误:', error);
      return null;
    }
  }

  // 路线规划
  async getRoute(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode: 'driving' | 'walking' | 'transit'): Promise<RouteInfo | null> {
    const originStr = `${origin.lng},${origin.lat}`;
    const destinationStr = `${destination.lng},${destination.lat}`;
    
    let url = '';
    switch (mode) {
      case 'driving':
        url = `${this.baseUrl}/direction/driving?key=${this.key}&origin=${originStr}&destination=${destinationStr}&strategy=10`;
        break;
      case 'walking':
        url = `${this.baseUrl}/direction/walking?key=${this.key}&origin=${originStr}&destination=${destinationStr}`;
        break;
      case 'transit':
        // 使用动态城市参数，先尝试不指定城市，让API自动识别
        url = `${this.baseUrl}/direction/transit/integrated?key=${this.key}&origin=${originStr}&destination=${destinationStr}&strategy=0`;
        break;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (mode === 'transit') {
        console.log(`公交路线API响应:`, data);
        console.log(`公交路线状态: ${data.status}, 是否有transits: ${data.route?.transits?.length > 0}`);
        
        if (data.status === '1' && data.route && data.route.transits && data.route.transits.length > 0) {
          const t = data.route.transits[0];
          console.log(`第一个公交方案:`, t);
          
          const duration = Number(t.duration);
          let distance = 0;
          
          // 尝试多种距离字段
          if (typeof t.distance !== 'undefined' && t.distance !== null) {
            distance = Number(t.distance);
            console.log(`使用distance: ${distance}米`);
          } else if (typeof t.walking_distance !== 'undefined' && t.walking_distance !== null) {
            distance = Number(t.walking_distance);
            console.log(`使用walking_distance: ${distance}米`);
          } else if (typeof t.total_distance !== 'undefined' && t.total_distance !== null) {
            distance = Number(t.total_distance);
            console.log(`使用total_distance: ${distance}米`);
          } else {
            // 如果都没有，使用直线距离作为估算
            distance = this._straightDistance(origin, destination);
            console.log(`使用直线距离估算: ${distance}米`);
          }
          
          console.log(`公交时间计算结果: duration=${duration}秒 (${duration/60}分钟), distance=${distance}米`);
          
          if (isNaN(duration) || duration <= 0) {
            console.warn(`公交时间转换失败或无效: 原始值=${t.duration}, 转换后=${duration}`);
            return null;
          }
          return {
            distance,
            duration,
            mode,
            polyline: undefined
          };
        }
        console.warn(`公交路线获取失败: 状态=${data.status}, 信息=${data.info || '无'}, transits长度=${data.route?.transits?.length || 0}`);
        
        // 当公交API失败时，使用估算作为备选
        const estimatedDistance = this._straightDistance(origin, destination);
        const estimatedDuration = this._estimateTransitTime(estimatedDistance) * 60; // 转换为秒
        
        console.log(`使用公交时间估算: 距离=${estimatedDistance}米, 时间=${estimatedDuration}秒 (${estimatedDuration/60}分钟)`);
        
        return {
          distance: estimatedDistance,
          duration: estimatedDuration,
          mode,
          polyline: undefined
        };
      }

      if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
        const path = data.route.paths[0];
        const distance = Number(path.distance);
        const duration = Number(path.duration);
        if (isNaN(distance) || isNaN(duration)) {
          return null;
        }
        return {
          distance,
          duration,
          mode,
          polyline: path.polyline
        };
      }
      return null;
    } catch (error) {
      console.error(`路线规划错误 (${mode}):`, error);
      return null;
    }
  }

  // 估算公交时间（当API失败时的备选方案）
  private _estimateTransitTime(distance: number): number {
    // 公交估算：考虑等车、换乘、行驶速度等因素
    // 平均公交速度约15-20km/h，加上等车时间
    const distanceKm = distance / 1000;
    const baseTravelTime = distanceKm / 18 * 60; // 18km/h平均速度，转换为分钟
    const waitingTime = 5; // 平均等车时间5分钟
    const transferTime = 3; // 平均换乘时间3分钟
    
    return Math.round(baseTravelTime + waitingTime + transferTime);
  }

  private _straightDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    const R = 6371000;
    const phi1 = (p1.lat * Math.PI) / 180;
    const phi2 = (p2.lat * Math.PI) / 180;
    const dphi = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dlambda = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a = Math.sin(dphi / 2) * Math.sin(dphi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 计算多个点的中心点
  calculateCenter(points: LocationPoint[]): { lat: number; lng: number } {
    if (points.length === 0) {
      return { lat: 39.90923, lng: 116.397428 }; // 默认北京天安门
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

  // 转换高德数据到内部格式
  convertToSearchResult(place: AMapPlace): SearchResult {
    const location = place.location.split(',');
    return {
      id: place.id,
      name: place.name,
      address: place.address,
      location: {
        lat: parseFloat(location[1]),
        lng: parseFloat(location[0])
      },
      distance: place.distance,
      rating: place.rating,
      phone: place.tel,
      photos: place.photos?.map(p => p.url) || [],
      tags: place.type?.split(';') || [],
      pname: place.pname,
      cityname: place.cityname,
      adname: place.adname,
      cost: place.biz_ext?.cost
    };
  }
}

// 从localStorage获取API密钥
const getAmapApiKey = (): string => {
  return '725ac982d7f382ac45e1b35a84f7dd16';
};

export const amapService = new AMapService(getAmapApiKey());
