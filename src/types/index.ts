export interface LocationPoint {
  id: string;
  lat: number;
  lng: number;
  address?: string;
  name?: string;
  createdAt?: number; // 添加时间戳
  source?: 'address' | 'coordinate' | 'random' | 'current' | 'map'; // 添加来源标识
}

export interface SearchResult {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  distance: number;
  rating?: number;
  phone?: string;
  tel?: string; // 添加电话属性
  photos?: string[];
  openHours?: string;
  tags?: string[];
  pname?: string;
  cityname?: string;
  adname?: string;
  cost?: string;
  reachableTime?: {
    driving?: number;
    walking?: number;
    transit?: number;
  };
  score?: number;
}

export interface SearchIntent {
  keywords: string[];
  category?: string;
  budget_max?: number;
  min_rating?: number;
  distance_km?: number;
  group_size?: number;
  city?: string;
  area?: string;
  open_hours?: string;
  tags?: string[];
}

export interface RouteInfo {
  distance: number;
  duration: number;
  mode: 'driving' | 'walking' | 'transit';
  polyline?: string;
}

export interface Recommendation {
  poi: SearchResult;
  routes: RouteInfo[];
  averageReachableTime: number; // 保持兼容性，计算所有交通方式的平均值
  transportationTimes: {
    driving: number;      // 驾车平均时间（分钟）
    transit: number;      // 公共交通平均时间（分钟）
    cycling: number;      // 骑行平均时间（分钟）
    walking: number;      // 步行平均时间（分钟）
  };
  // 新增：每个位置点到推荐点的距离和时间
  pointDistances: {
    pointId: string;
    pointName?: string;
    distance: number;     // 距离（米）
    drivingTime?: number;   // 驾车时间（分钟）
    walkingTime?: number;   // 步行时间（分钟）
    transitTime?: number;   // 公交时间（分钟）
    cyclingTime?: number;   // 骑行时间（分钟）
  }[];
  totalScore: number;
  reason?: string;
  routeNarration?: string;
  combinedRecommendation?: string;
  confidence?: number;
  mcpValidation?: {
    isValid: boolean;
    confidence: number;
    details: {
      poiValidation?: any;
      recommendationValidation?: any;
      contextualSuggestions?: {
        suggestions: string[];
        considerations: string[];
        bestPractices: string[];
      };
    };
  };
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
}

export interface AppState {
  points: LocationPoint[];
  searchKeyword: string;
  recommendations: Recommendation[];
  isLoading: boolean;
  mapConfig: MapConfig;
  selectedRecommendation?: Recommendation;
  selectedOriginPoint?: LocationPoint;
}

export interface AMapPlace {
  id: string;
  name: string;
  address: string;
  location: string;
  distance: number;
  rating?: number;
  photos?: Array<{
    url: string;
    title?: string;
  }>;
  tel?: string;
  biz_ext?: {
    rating?: string;
    cost?: string;
  };
  type?: string;
  typecode?: string;
  shopinfo?: string;
  pname?: string;
  cityname?: string;
  adname?: string;
}