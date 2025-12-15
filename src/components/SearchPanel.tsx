import { useState } from 'react';
import { Search, MapPin, Shield } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { recommendationService } from '@/services/recommendationService';
import { Recommendation } from '@/types';
import { toast } from 'sonner';
import { StepLoader } from './LoadingSpinner';
import { StarRating } from './StarRating';
import { AIReasonProgress } from './AIReasonProgress';
import { backendAIService } from '@/services/backendAiService';
import { amapService } from '@/services/amapService';
import { ImagePreviewModal } from './ImagePreviewModal';
import RecommendationProgress, { ProgressStep } from './RecommendationProgress';

interface SearchPanelProps {
  className?: string;
}

// 搜索面板组件
export const SearchPanel = ({ className = '' }: SearchPanelProps) => {
  const { points, searchKeyword, setSearchKeyword, recommendations, setRecommendations, setLoading, selectRecommendation, selectedRecommendation } = useAppStore();
  const [isSearching, setIsSearching] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  
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
      
      // 设置待处理列表并开始逐条生成推荐理由
      setPendingRecommendations(results);
      
      if (results.length > 0) {
        // 设置AI推荐理由生成进度
        setAiReasonProgress({
          isGenerating: true,
          current: 0,
          total: results.length,
          currentPlace: ''
        });
        
        await processRecommendationsOneByOne(results);
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



  // 热门搜索关键词
  const popularKeywords = [
    '海底捞火锅',
    'KTV',
    '麻将馆',
    '咖啡厅',
    '电影院',
    '餐厅',
    '商场',
    '公园'
  ];

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
      
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
        <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
        位置搜索
      </h3>

      {/* AI推荐理由生成进度指示器 */}
      <AIReasonProgress 
        current={aiReasonProgress.current}
        total={aiReasonProgress.total}
        currentPlace={aiReasonProgress.currentPlace}
        isVisible={aiReasonProgress.isGenerating}
      />

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
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-gray-600 mr-1">示例：</span>
            {popularKeywords.map(keyword => (
              <button
                key={keyword}
                onClick={() => setSearchKeyword(keyword)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                {keyword}
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
              className={`border rounded-lg p-2 sm:p-3 hover:shadow-md transition-all cursor-pointer animate-card-insert ${
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

                  {/* 交通方式时间显示 - 响应式 */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 text-xs text-gray-600 mb-2">
                    <div className="flex items-center">
                      <span className="mr-1">🚗</span>
                      <span className="font-medium text-red-600">{recommendation.transportationTimes?.driving || 0}分钟</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">🚌</span>
                      <span className="font-medium text-blue-600">{recommendation.transportationTimes?.transit || 0}分钟</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">🚴</span>
                      <span className="font-medium text-green-600">{recommendation.transportationTimes?.cycling || 0}分钟</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-1">🚶</span>
                      <span className="font-medium text-orange-600">{recommendation.transportationTimes?.walking || 0}分钟</span>
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
                      {typeof recommendation.averageReachableTime === 'number' && recommendation.averageReachableTime > 0 && (
                        <div className="flex items-start">
                          <span className="mr-1">⏱️</span>
                          <span className="font-medium">{Math.round(recommendation.averageReachableTime)}分钟</span>
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

                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs text-gray-600">推荐指数：</span>
                    <StarRating score={recommendation.totalScore} size="sm" />
                  </div>
                  
                  {/* AI综合推荐生成状态指示器 */}
                  {aiReasonProgress.isGenerating && !recommendation.combinedRecommendation && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span className="text-xs text-blue-600">AI综合推荐生成中...</span>
                    </div>
                  )}
                </div>
              </div>

              {recommendation.combinedRecommendation && (
                <div className="mt-2 p-2 sm:p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg text-xs sm:text-sm text-gray-800 border border-blue-100 shadow-sm">
                  <div className="flex items-center mb-1 sm:mb-2">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-2" />
                    <span className="font-semibold text-green-700">AI综合推荐</span>
                  </div>
                  <div className="text-xs sm:text-sm leading-relaxed">{recommendation.combinedRecommendation}</div>
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