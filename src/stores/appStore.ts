import { create } from 'zustand';
import { AppState, LocationPoint, Recommendation } from '@/types';

const initialState: AppState = {
  points: [],
  searchKeyword: '',
  recommendations: [],
  isLoading: false,
  mapConfig: {
    center: [116.397428, 39.90923], // 北京天安门
    zoom: 11
  },
  selectedRecommendation: undefined,
  selectedOriginPoint: undefined
};

interface AppStore extends AppState {
  addPoint: (point: LocationPoint) => void;
  removePoint: (id: string) => void;
  updatePoint: (id: string, updates: Partial<LocationPoint>) => void;
  setSearchKeyword: (keyword: string) => void;
  setRecommendations: (recommendations: Recommendation[]) => void;
  setLoading: (loading: boolean) => void;
  setMapConfig: (config: Partial<AppState['mapConfig']>) => void;
  selectRecommendation: (recommendation: Recommendation | undefined) => void;
  clearPoints: () => void;
  clearRecommendations: () => void;
  setCurrentLocation: (location: [number, number]) => void;
  centerOnPoint: (point: { lat: number; lng: number }) => void;
  setSelectedOriginPoint: (point: LocationPoint | undefined) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  addPoint: (point: LocationPoint) => {
    const { points } = get();
    if (points.length >= 10) {
      return; // 限制最多10个点
    }
    
    // 如果点是自动命名的，重新计算正确的序号
    if (point.name && point.name.startsWith('位置')) {
      // 找到当前最大的位置序号
      const existingNumbers = points
        .filter(p => p.name && p.name.startsWith('位置'))
        .map(p => {
          const match = p.name.match(/位置(\d+)/);
          return match ? parseInt(match[1]) : 0;
        });
      
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      point.name = `位置${maxNumber + 1}`;
    }
    
    set({ points: [...points, point] });
  },

  removePoint: (id: string) => {
    const { points } = get();
    const remainingPoints = points.filter(p => p.id !== id);
    
    // 重新排序并更新名称，保持序号连续性
    const reorderedPoints = remainingPoints.map((point, index) => {
      // 只更新以"位置"开头的自动命名，保留用户自定义名称
      if (point.name && point.name.startsWith('位置')) {
        return {
          ...point,
          name: `位置${index + 1}`
        };
      }
      return point;
    });
    
    set({ points: reorderedPoints });
  },

  updatePoint: (id: string, updates: Partial<LocationPoint>) => {
    const { points } = get();
    set({
      points: points.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    });
  },

  setSearchKeyword: (keyword: string) => {
    set({ searchKeyword: keyword });
  },

  setRecommendations: (recommendations: Recommendation[]) => {
    set({ recommendations });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setMapConfig: (config: Partial<AppState['mapConfig']>) => {
    const { mapConfig } = get();
    set({ mapConfig: { ...mapConfig, ...config } });
  },

  selectRecommendation: (recommendation: Recommendation | undefined) => {
    set({ selectedRecommendation: recommendation });
  },

  clearPoints: () => {
    set({ points: [] });
  },

  clearRecommendations: () => {
    set({ recommendations: [], selectedRecommendation: undefined });
  },

  setCurrentLocation: (location: [number, number]) => {
    set({ mapConfig: { center: location, zoom: 14 } });
  },
  
  centerOnPoint: (point: { lat: number; lng: number }) => {
    set({ mapConfig: { center: [point.lng, point.lat], zoom: 16 } });
  },

  setSelectedOriginPoint: (point: LocationPoint | undefined) => {
    set({ selectedOriginPoint: point });
  }
}));