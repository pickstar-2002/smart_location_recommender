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

interface SearchPanelProps {
  className?: string;
}

// 搜索面板组件
export const SearchPanel = ({ className = '' }: SearchPanelProps) => {
  const { points, searchKeyword, setSearchKeyword, recommendations, setRecommendations, setLoading, selectRecommendation, selectedRecommendation } = useAppStore();
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorSteps, setErrorSteps] = useState<number[]>([]);
  const [stepDetails, setStepDetails] = useState<Record<number, string>>({});
  const [stepLabels] = useState([
    '正在解析搜索意图...',
    '正在搜索周边位置...',
    '正在分析地理位置...',
    '正在计算最优路线...',
    '正在生成AI综合推荐...',
    '正在完成推荐...'
  ]);
  
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

  // 执行搜索 - 逐步执行每个步骤
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
    const modelscopeKey = localStorage.getItem('modelscope_api_key');
    
    if (!amapKey || amapKey === 'YOUR_AMAP_API_KEY') {
      // 使用默认的API密钥
      const defaultApiKey = '725ac982d7f382ac45e1b35a84f7dd16';
      localStorage.setItem('amap_api_key', defaultApiKey);
    }


    setIsSearching(true);
    setLoading(true);
    setCurrentStep(0);
    setErrorSteps([]);
    setStepDetails({}); // 重置步骤详情

    try {
      // 步骤1: 解析搜索意图
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log('🔍 正在解析搜索意图...');
      const intent = await backendAIService.parseSearchIntent(searchKeyword.trim());
      const parsedKeywords = intent?.keywords?.length ? intent.keywords : [searchKeyword.trim()];
      console.log('✅ 搜索意图解析完成:', intent);
      setStepDetails(prev => ({
        ...prev,
        0: `已解析：关键词 ${parsedKeywords.join(' / ')}${intent?.budget_max ? `，预算≤${intent.budget_max}` : ''}${intent?.min_rating ? `，评分≥${intent.min_rating}` : ''}${intent?.distance_km ? `，半径${intent.distance_km}km` : ''}`
      }));
      
      // 步骤2: 搜索周边地点
      setCurrentStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('📍 正在搜索周边位置...');
      const radiusMeters = intent?.distance_km ? Math.round(intent.distance_km * 1000) : undefined;
      const searchResults = await recommendationService.searchNearbyPlaces(points, parsedKeywords, {
        radiusMeters,
        minRating: intent?.min_rating,
        budgetMax: intent?.budget_max
      });
      console.log(`✅ 周边搜索完成: 找到 ${searchResults.length} 个候选地点`);
      setStepDetails(prev => ({
        ...prev,
        1: `已找到 ${searchResults.length} 个候选地点`
      }));
      
      // 步骤3: 分析地理位置
      setCurrentStep(3);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('🗺️ 正在分析地理位置...');
      const analyzedResults = await recommendationService.analyzeLocations(searchResults, points);
      console.log(`✅ 地理位置分析完成`);
      setStepDetails(prev => ({
        ...prev,
        2: `已分析 ${analyzedResults.length} 个地点的地理位置`
      }));
      
      // 步骤4: 计算路线信息
      setCurrentStep(4);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      console.log('🚗 正在计算最优路线...');
      const routeResults = await recommendationService.calculateRoutes(analyzedResults, points);
      console.log(`✅ 路线计算完成`);
      setStepDetails(prev => ({
        ...prev,
        3: `已计算多种交通方式的路线信息`
      }));
      
      // 步骤5: 简化版位置分析（不使用AI）
      setCurrentStep(5);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('🔄 正在执行简化版位置分析...');
      let finalResults;
      try {
        // 使用简化版位置分析（已移除AI调用）
        finalResults = await recommendationService.aiRanking(routeResults, searchKeyword.trim());
        console.log(`✅ 简化版位置分析完成`);
        setStepDetails(prev => ({
          ...prev,
          4: `位置分析完成，基于距离和评分综合评估`
        }));
      } catch (analysisError) {
        console.warn('⚠️ 位置分析失败');
        setErrorSteps(prev => [...prev, 4]);
        throw analysisError; // 直接抛出错误便于排查
      }
      
      // 步骤6: 开始动态生成AI推荐理由（逐个生成并插入）
      setCurrentStep(6);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('🤖 开始动态生成AI推荐理由...');
      setStepDetails(prev => ({
        ...prev,
        5: `正在调用AI生成个性化推荐理由...`
      }));
      
      // 动态卡片插入：从0开始逐条添加
      setDisplayedRecommendations([]); // 清空当前显示
      setPendingRecommendations(finalResults); // 设置待处理列表
      setRecommendations([]); // 清空存储的推荐结果
      
      // 开始逐条生成推荐理由并动态插入
      if (finalResults.length > 0) {
        // 设置AI推荐理由生成进度
        setAiReasonProgress({
          isGenerating: true,
          current: 0,
          total: finalResults.length,
          currentPlace: ''
        });
        
        await processRecommendationsOneByOne(finalResults);
      }
      
      console.log(`✅ 所有AI推荐理由生成完成`);
      setStepDetails(prev => ({
        ...prev,
        5: `AI推荐理由已生成，包含地点、地址、距离、时间、评价等完整信息`
      }));
      
      // 延迟一下让用户看到完成状态
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success(`找到 ${finalResults.length} 个推荐地点`);
      
    } catch (error) {
      console.error('搜索失败:', error);
      toast.error('搜索失败，请稍后重试');
      
      // 根据错误类型标记失败的步骤
      if (error instanceof Error) {
        if (error.message.includes('扩展') || error.message.includes('关键词')) {
          setErrorSteps([0]); // 关键词扩展步骤失败
        } else if (error.message.includes('搜索') || error.message.includes('周边')) {
          setErrorSteps([1]); // 搜索步骤失败
        } else if (error.message.includes('分析') || error.message.includes('地理')) {
          setErrorSteps([2]); // 分析步骤失败
        } else if (error.message.includes('路线') || error.message.includes('计算')) {
          setErrorSteps([3]); // 路线计算步骤失败
        } else if (error.message.includes('AI') || error.message.includes('推荐理由')) {
          setErrorSteps([5]); // AI推荐理由生成步骤失败
        } else {
          setErrorSteps([1]); // 默认搜索步骤失败
        }
      }
    } finally {
      setIsSearching(false);
      setLoading(false);
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
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <StepLoader 
        currentStep={currentStep}
        totalSteps={stepLabels.length}
        stepLabels={stepLabels}
        errorSteps={errorSteps}
        stepDetails={stepDetails}
      />
      
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Search className="w-5 h-5 mr-2 text-blue-600" />
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
      <div className="mb-6">
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm whitespace-nowrap"
          >
            <Search className="w-4 h-4 mr-1" />
            {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>
        
        {/* AI模型选择器 */}
        <div className="flex justify-between items-center">
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
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-800 mb-3">
            推荐结果 ({displayedRecommendations.length}/{pendingRecommendations.length})
            {aiReasonProgress.isGenerating && (
              <span className="ml-2 text-sm text-blue-600 animate-pulse">
                • 正在生成中...
              </span>
            )}
          </h4>
          
          {displayedRecommendations.map((recommendation, index) => (
            <div
              key={`${recommendation.poi.id}-${index}`}
              className={`border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer animate-card-insert ${
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
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0">
                      {index + 1}
                    </span>
                    <h5 className="font-semibold text-gray-800 text-sm truncate">{recommendation.poi.name}</h5>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-1 truncate">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {recommendation.poi.address}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-1">
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

                  {/* 交通方式时间显示 - 简化版 */}
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
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
                        <div>📞 电话：<span className="font-medium">{recommendation.poi.phone || recommendation.poi.tel}</span></div>
                      )}
                      {(recommendation.poi.pname || recommendation.poi.cityname || recommendation.poi.adname) && (
                        <div>🏙️ 区域：<span className="font-medium">{[recommendation.poi.pname, recommendation.poi.cityname, recommendation.poi.adname].filter(Boolean).join(' · ')}</span></div>
                      )}
                      {recommendation.poi.cost && (
                        <div>💰 人均：<span className="font-medium">{recommendation.poi.cost}</span></div>
                      )}
                      {recommendation.poi.tags && recommendation.poi.tags.length > 0 && (
                        <div>🏷️ 标签：<span className="font-medium">{recommendation.poi.tags.slice(0, 5).join('、')}</span></div>
                      )}
                      {typeof recommendation.averageReachableTime === 'number' && recommendation.averageReachableTime > 0 && (
                        <div>⏱️ 平均可达：<span className="font-medium">{Math.round(recommendation.averageReachableTime)}分钟</span></div>
                      )}
                      {recommendation.poi.photos && recommendation.poi.photos.length > 0 && (
                        <div className="flex gap-2 mt-1">
                          {recommendation.poi.photos.slice(0, 2).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="photo"
                              className="w-16 h-12 rounded border border-gray-200 object-cover cursor-zoom-in"
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



          <div className="flex items-center space-x-2">
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

              {false && recommendation.routeNarration && (
                <div className="mt-2 p-3 bg-orange-50 rounded-lg text-xs text-gray-800 border border-orange-200">
                  <div className="font-semibold text-orange-700 mb-1">🗺️ 路线解说</div>
                  <div>{recommendation.routeNarration}</div>
                </div>
              )}
                </div>
              </div>

              {recommendation.combinedRecommendation && (
                <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg text-sm text-gray-800 border border-blue-100 shadow-sm">
                  <div className="flex items-center mb-2">
                    <Shield className="w-4 h-4 text-green-600 mr-2" />
                    <span className="font-semibold text-green-700">AI综合推荐</span>
                  </div>
                  <div className="text-sm leading-relaxed">{recommendation.combinedRecommendation}</div>
                </div>
              )}
            </div>
          ))}
          
          {/* 底部加载指示器 */}
          {aiReasonProgress.isGenerating && (
            <div className="text-center py-4 animate-pulse">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">正在生成第 {displayedRecommendations.length + 1} 个推荐...</span>
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