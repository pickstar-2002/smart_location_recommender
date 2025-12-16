import { useState, useEffect } from 'react';
import { Search, MapPin, Shield, ChevronLeft, RefreshCcw } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { recommendationService } from '@/services/recommendationService';
import { Recommendation } from '@/types';
import { toast } from 'sonner';
import { StepLoader } from './LoadingSpinner';
import { StarRating } from './StarRating';
import { backendAIService } from '@/services/backendAiService';
import { amapService } from '@/services/amapService';
import { ImagePreviewModal } from './ImagePreviewModal';
import RecommendationProgress, { ProgressStep } from './RecommendationProgress';

interface SearchPanelProps {
  className?: string;
  onCollapse?: () => void;
}

// 搜索面板组件
export const SearchPanel = ({ className = '', onCollapse }: SearchPanelProps) => {
  const { points, searchKeyword, setSearchKeyword, recommendations, setRecommendations, setLoading, selectRecommendation, selectedRecommendation } = useAppStore();
  const [isSearching, setIsSearching] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [hotKeywords, setHotKeywords] = useState<string[]>([]);
  const [hotLoading, setHotLoading] = useState(false);
  
  // 动态卡片插入状态
  const [displayedRecommendations, setDisplayedRecommendations] = useState<Recommendation[]>([]); // 当前显示的推荐结果
  const [pendingRecommendations, setPendingRecommendations] = useState<Recommendation[]>([]); // 待处理的推荐结果
  
  
  
  // AI推荐理由生成进度状态
  const [aiReasonProgress, setAiReasonProgress] = useState({
    isGenerating: false,
    current: 0,
    total: 0,
    currentPlace: ''
  });

  const [previewImages, setPreviewImages] = useState<string[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  

  const fetchHotKeywords = async () => {
    try {
      setHotLoading(true);
      let city = '';
      if (points && points.length > 0) {
        try {
          city = await amapService.getCityByCoordinate(points[0].lat, points[0].lng) || '';
        } catch {}
      }
      const now = new Date();
      const hour = now.getHours();
      const time = hour >= 18 ? '晚上' : hour <= 6 ? '清晨' : '白天';
      const keywords = await backendAIService.generateHotKeywords({ city, time, examples: hotKeywords });
      setHotKeywords(keywords.slice(0, 6));
    } finally {
      setHotLoading(false);
    }
  };

  const handleRefreshHot = () => {
    if (!hotLoading) fetchHotKeywords();
  };

  // 执行搜索 - 使用新的进度展示
  const handleSearch = async () => {
    if (points.length === 0) {
      toast.error('请先添加至少一个位置点');
      return;
    }

    if (!searchKeyword.trim()) {
      toast.error('请输入要搜索的场所类型');
      return;
    }

    // 检查API密钥
    const amapKey = localStorage.getItem('amap_api_key');
    
    if (!amapKey || amapKey === 'YOUR_AMAP_API_KEY') {
      // 使用默认的API密钥
      const defaultApiKey = '725ac982d7f382ac45e1b35a84f7dd16';
      localStorage.setItem('amap_api_key', defaultApiKey);
    }

    setIsSearching(true);
    setLoading(true);
    setShowProgress(true);
    setDisplayedRecommendations([]);
    setPendingRecommendations([]);
    setRecommendations([]);

    try {
      // 使用新的推荐服务，支持进度回调
      const results = await recommendationService.getRecommendations(
        points,
        searchKeyword.trim(),
        (steps, currentStep) => {
          setProgressSteps([...steps]);
        }
      );
      
      // 先展示推荐地点，再后台生成推荐理由
      setPendingRecommendations(results);
      setDisplayedRecommendations(results);
      setRecommendations(results);

      if (results.length > 0) {
        setAiReasonProgress({ isGenerating: true, current: 0, total: results.length, currentPlace: '' });
        void generateCombinedInBackground(results);
      }
      
      toast.success(`找到 ${results.length} 个推荐地点`);
      
    } catch (error) {
      console.error('搜索失败:', error);
      toast.error('搜索失败，请稍后重试');
    } finally {
      setIsSearching(false);
      setLoading(false);
      // 延迟隐藏进度展示，让用户看到完成状态
      setTimeout(() => setShowProgress(false), 2000);
    }
  };

  // 选择推荐
  const handleSelectRecommendation = (recommendation: Recommendation) => {
    selectRecommendation(recommendation);
    toast.success(`已选择：${recommendation.poi.name}`);
  };

  // 逐条处理推荐结果并动态插入
  const processRecommendationsOneByOne = async (recommendations: Recommendation[]) => {
    console.log(`🎯 开始逐条处理 ${recommendations.length} 个推荐结果...`);
    
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      console.log(`📝 正在处理第${i + 1}个推荐: ${rec.poi.name}`);
      
      // 更新进度状态
      setAiReasonProgress(prev => ({
        ...prev,
        current: i + 1,
        currentPlace: rec.poi.name
      }));
      
      try {
        // 添加请求间隔，避免API限流
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
        
        // 获取天气（基于城市名），生成AI综合推荐
        let weatherText: string | undefined;
        try {
          const city = rec.poi.cityname || rec.poi.pname || '';
          const weather = await amapService.getWeatherByCityName(city);
          if (weather) weatherText = `${weather.weather}，${weather.temperature}℃`;
        } catch {}
        const originName = (useAppStore.getState().selectedOriginPoint?.name) || (useAppStore.getState().points[0]?.name) || '出发点';
        const combined = await backendAIService.generateCombinedRecommendation(rec, originName, searchKeyword.trim(), weatherText);
        
        // 创建带有综合推荐的新推荐对象
        const recommendationWithReason = {
          ...rec,
          combinedRecommendation: combined
        };
        
        // 动态插入到显示列表（使用函数式更新确保顺序正确）
        setDisplayedRecommendations(prev => [...prev, recommendationWithReason]);
        // 同步到全局store，驱动高德地图生成对应推荐标记
        {
          const currentList = useAppStore.getState().recommendations;
          setRecommendations([...currentList, recommendationWithReason]);
        }
        
        console.log(`✅ 第${i + 1}个推荐理由生成完成，已动态插入`);
        
      } catch (error) {
        console.error(`❌ 第${i + 1}个推荐理由生成失败:`, error);
        // 即使失败也插入原始推荐（不带AI理由）
        setDisplayedRecommendations(prev => [...prev, rec]);
        {
          const currentList = useAppStore.getState().recommendations;
          setRecommendations([...currentList, rec]);
        }
      }
    }
    
    // 全部处理完成
    setAiReasonProgress(prev => ({ ...prev, isGenerating: false }));
    console.log('🎉 所有推荐结果处理完成');
  };

  // 后台生成综合推荐理由：不阻塞列表展示，生成后插入到对应卡片的“AI综合推荐”区域
  const generateCombinedInBackground = async (recs: Recommendation[]) => {
    for (let i = 0; i < recs.length; i++) {
      const rec = recs[i];
      setAiReasonProgress(prev => ({ ...prev, current: i + 1, currentPlace: rec.poi.name }));
      try {
        // 间隔避免限流
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 800));
        let weatherText: string | undefined;
        try {
          const city = rec.poi.cityname || rec.poi.pname || '';
          const weather = await amapService.getWeatherByCityName(city);
          if (weather) weatherText = `${weather.weather}，${weather.temperature}℃`;
        } catch {}
        const originName = (useAppStore.getState().selectedOriginPoint?.name) || (useAppStore.getState().points[0]?.name) || '出发点';
        const combined = await backendAIService.generateCombinedRecommendation(rec, originName, searchKeyword.trim(), weatherText);

        // 就地更新显示列表
        setDisplayedRecommendations(prev => prev.map(item => item.poi.id === rec.poi.id ? { ...item, combinedRecommendation: combined } : item));
        // 同步到全局store
        {
          const current = useAppStore.getState().recommendations;
          const updated = current.map(item => item.poi.id === rec.poi.id ? { ...item, combinedRecommendation: combined } : item);
          setRecommendations(updated);
        }
      } catch {}
    }
    setAiReasonProgress(prev => ({ ...prev, isGenerating: false }));
  };

  const handleGenerateMore = async () => {
    if (isGeneratingMore || isSearching) return;
    const totalLoaded = (useAppStore.getState().recommendations || []).length;
    if (totalLoaded >= 20) {
      toast.info('已达到20条上限');
      return;
    }

    if (points.length === 0 || !searchKeyword.trim()) {
      toast.error('请先添加位置点并输入关键词');
      return;
    }

    setIsGeneratingMore(true);
    try {
      const existing = (useAppStore.getState().recommendations || []);
      const existingIds = new Set(existing.map(r => r.poi.id));
      const existingKeys = new Set(existing.map(r => `${r.poi.name}|${r.poi.address}`.trim()));
      const results = await recommendationService.getMoreRecommendations(
        points,
        searchKeyword.trim(),
        { ids: Array.from(existingIds), names: Array.from(existingKeys) },
        5
      );
      const uniq = results.filter(r => !existingIds.has(r.poi.id) && !existingKeys.has(`${r.poi.name}|${r.poi.address}`.trim()));
      const remain = 20 - totalLoaded;
      const batch = uniq.slice(0, Math.min(5, Math.max(0, remain)));
      if (batch.length === 0) {
        toast.info('没有更多新推荐');
      } else {
        setAiReasonProgress({ isGenerating: true, current: 0, total: batch.length, currentPlace: '' });
        // 先更新 pending 以使计数正确
        setPendingRecommendations(prev => [...prev, ...batch]);
        await processRecommendationsOneByOne(batch);
        toast.success(`已追加 ${batch.length} 条推荐`);
      }
    } catch (error) {
      console.error('生成更多失败:', error);
      toast.error('生成更多失败，请稍后重试');
    } finally {
      setIsGeneratingMore(false);
    }
  };



  // 热门搜索关键词
  useEffect(() => {
    fetchHotKeywords();
  }, []);

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
      {/* 新的进度展示组件 */}
      {showProgress && progressSteps.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <RecommendationProgress 
            steps={progressSteps}
            currentStep={progressSteps.findIndex(step => step.status === 'running')}
            onCancel={() => {
              setIsSearching(false);
              setLoading(false);
              setShowProgress(false);
            }}
          />
        </div>
      )}
      
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
          位置搜索
        </h3>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="最小化"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* AI推荐理由生成进度指示器已移除，改为卡片内loading占位 */}

      {/* 搜索输入 */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="用一句话描述你想找的地方（如：预算300的KTV、离地铁近的咖啡厅）"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || points.length === 0 || !searchKeyword.trim()}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm whitespace-nowrap min-w-[80px]"
          >
            <Search className="w-4 h-4 mr-1" />
            {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>
        
        {/* AI模型选择器 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          {/* 热门关键词 */}
          <div className="flex flex-wrap gap-1 items-center">
          <span className="text-xs text-gray-600 mr-1">搜索热词：</span>
          <button
            onClick={handleRefreshHot}
            disabled={hotLoading}
            className="ml-2 inline-flex items-center p-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            title="刷新热词"
          >
            <RefreshCcw className="w-3 h-3" />
          </button>
          {hotLoading && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded inline-flex items-center">
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></span>
              生成中...
            </span>
          )}
          {hotKeywords.slice(0, 6).map((kw, i) => (
            <button
              key={`${kw}-${i}`}
              onClick={() => setSearchKeyword(kw)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {kw}
            </button>
          ))}
          </div>
          
        </div>
      </div>

      {/* 搜索结果 */}
      {displayedRecommendations.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <h4 className="text-sm sm:text-md font-medium text-gray-800 mb-2 sm:mb-3">
            推荐结果 ({displayedRecommendations.length}/{pendingRecommendations.length})
            {aiReasonProgress.isGenerating && (
              <span className="ml-2 text-xs sm:text-sm text-blue-600 animate-pulse">
                • 正在生成中...
              </span>
            )}
          </h4>
          
          {displayedRecommendations.map((recommendation, index) => (
            <div
              key={`${recommendation.poi.id}-${index}`}
              className={`border rounded-lg p-2 sm:p-3 hover:shadow-md transition-all cursor-pointer animate-card-insert overflow-hidden ${
                selectedRecommendation?.poi.id === recommendation.poi.id 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelectRecommendation(recommendation)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0">
                      {index + 1}
                    </span>
                    <h5 className="font-semibold text-gray-800 text-xs sm:text-sm truncate">{recommendation.poi.name}</h5>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-1 truncate">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {recommendation.poi.address}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-600 mb-1 flex-wrap">
                    {recommendation.poi.rating && (
                      <div className="flex items-center">
                        <StarRating score={recommendation.poi.rating * 20} size="sm" />
                        <span className="ml-1 text-gray-600">{recommendation.poi.rating}</span>
                      </div>
                    )}
                    <div className="text-xs text-blue-600 font-medium">
                      {(recommendation.poi.distance / 1000).toFixed(1)}km
                    </div>
                    <div className="text-xs text-green-600 font-medium flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      地图定位
                    </div>
                  </div>

                  

                  {(
                    recommendation.poi.phone || recommendation.poi.tel || recommendation.poi.tags?.length || recommendation.poi.cost || recommendation.poi.pname || recommendation.poi.cityname || recommendation.poi.adname || recommendation.averageReachableTime || (recommendation.poi.photos && recommendation.poi.photos.length)
                  ) && (
                    <div className="space-y-1 text-xs text-gray-700">
                      {(recommendation.poi.phone || recommendation.poi.tel) && (
                        <div className="flex items-start">
                          <span className="mr-1">📞</span>
                          <span className="font-medium">{recommendation.poi.phone || recommendation.poi.tel}</span>
                        </div>
                      )}
                      {(recommendation.poi.pname || recommendation.poi.cityname || recommendation.poi.adname) && (
                        <div className="flex items-start">
                          <span className="mr-1">🏙️</span>
                          <span className="font-medium">{[recommendation.poi.pname, recommendation.poi.cityname, recommendation.poi.adname].filter(Boolean).join(' · ')}</span>
                        </div>
                      )}
                      {recommendation.poi.cost && (
                        <div className="flex items-start">
                          <span className="mr-1">💰</span>
                          <span className="font-medium">{recommendation.poi.cost}</span>
                        </div>
                      )}
                      {recommendation.poi.tags && recommendation.poi.tags.length > 0 && (
                        <div className="flex items-start">
                          <span className="mr-1">🏷️</span>
                          <span className="font-medium">{recommendation.poi.tags.slice(0, 3).join('、')}</span>
                        </div>
                      )}
                      
                      {recommendation.poi.photos && recommendation.poi.photos.length > 0 && (
                        <div className="flex gap-2 mt-1">
                          {recommendation.poi.photos.slice(0, 2).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="photo"
                              className="w-12 h-9 sm:w-16 sm:h-12 rounded border border-gray-200 object-cover cursor-zoom-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImages(recommendation.poi.photos);
                                const idx = recommendation.poi.photos.indexOf(url);
                                setPreviewIndex(idx >= 0 ? idx : 0);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  
                  {recommendation.pointDistances && recommendation.pointDistances.length > 0 && (
                    <div className="mt-2 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg text-xs sm:text-sm text-gray-800 border border-blue-100 shadow-sm max-h-32 overflow-y-auto">
                      <div className="flex items-center mb-1 sm:mb-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mr-2" />
                        <span className="font-semibold text-blue-700">位置点距离与时间</span>
                      </div>
                      <div className="pr-1 transition-opacity duration-300 opacity-100 break-words">
                        {recommendation.pointDistances.map((pd) => (
                          <div key={pd.pointId} className="flex items-center flex-wrap gap-2 text-xs text-gray-700 mb-1">
                            <span className="inline-flex items-center text-gray-700">
                              <MapPin className="w-3 h-3 mr-1" />
                              {pd.pointName || '位置点'}
                            </span>
                            <span className="inline-flex items-center">
                              <span className="mr-1">📏</span>
                              <span className="font-medium text-blue-600">{(pd.distance / 1000).toFixed(1)}km</span>
                            </span>
                            <span className="inline-flex items-center">
                              <span className="mr-1">🚗</span>
                              <span className="font-medium text-red-600">{pd.drivingTime ?? 0}分钟</span>
                            </span>
                            <span className="inline-flex items-center">
                              <span className="mr-1">🚌</span>
                              <span className="font-medium text-blue-600">{pd.transitTime ?? 0}分钟</span>
                            </span>
                            <span className="inline-flex items-center">
                              <span className="mr-1">🚴</span>
                              <span className="font-medium text-green-600">{pd.cyclingTime ?? 0}分钟</span>
                            </span>
                            <span className="inline-flex items-center">
                              <span className="mr-1">🚶</span>
                              <span className="font-medium text-orange-600">{pd.walkingTime ?? 0}分钟</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI综合推荐生成状态指示器 */}
                  {!recommendation.combinedRecommendation && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span className="text-xs text-blue-600">AI综合推荐生成中...</span>
                    </div>
                  )}
                </div>
              </div>

              {recommendation.combinedRecommendation && (
                <div className="mt-2 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg text-xs sm:text-sm text-gray-800 border border-blue-100 shadow-sm max-h-32 overflow-y-auto">
                  <div className="flex items-center mb-1 sm:mb-2">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-2" />
                    <span className="font-semibold text-green-700">AI综合推荐</span>
                  </div>
                  <div className="text-xs sm:text-sm leading-relaxed break-words pr-1 transition-opacity duration-300 opacity-100">
                    {recommendation.combinedRecommendation}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* 底部加载指示器 */}
          {aiReasonProgress.isGenerating && (
            <div className="text-center py-3 sm:py-4 animate-pulse">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 rounded-lg text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                <span className="text-xs sm:text-sm">正在生成第 {displayedRecommendations.length + 1} 个推荐...</span>
              </div>
            </div>
          )}

          {!aiReasonProgress.isGenerating && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs sm:text-sm text-gray-500">已加载 {displayedRecommendations.length}/20</span>
              <button
                onClick={handleGenerateMore}
                disabled={isGeneratingMore || displayedRecommendations.length >= 20}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                {isGeneratingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                    生成中...
                  </>
                ) : (
                  '生成更多'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 搜索提示 */}
      {points.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>请先添加位置点</p>
          <p className="text-sm mt-1">在地图上点击或输入地址来添加位置</p>
        </div>
      )}

      {points.length > 0 && displayedRecommendations.length === 0 && searchKeyword && !isSearching && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>点击搜索按钮开始寻找推荐地点</p>
        </div>
      )}
      {previewImages && (
        <ImagePreviewModal images={previewImages} startIndex={previewIndex} onClose={() => setPreviewImages(null)} />
      )}
    </div>
  );
};