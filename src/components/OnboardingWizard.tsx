import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Map, Search, Info } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

// 新手引导组件
export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // 组件挂载时重置状态
  useEffect(() => {
    setCurrentStep(0);
    setIsCompleted(false);
  }, []);

  const steps = [
    { title: '项目简介', content: '前端React+Vite+TS，后端Express+TS。整合高德地图（JS+REST）与ModelScope AI：支持位置搜索、AI意图解析、周边检索、路线计算、综合推荐、图片预览与天气显示。', image: '🗺️' },
    { title: '添加位置点', content: '在地图上点击、输入地址搜索或直接输入经纬度，最多支持10个位置点，并可快速定位与复制坐标。', image: '📍' },
    { title: '位置搜索与意图解析', content: '支持口语化输入（如“预算300的KTV”），AI解析为结构化条件（关键词、预算、评分、半径等），再据此调用高德API进行检索与筛选。', image: '🔍' },
    { title: '路线与综合推荐', content: '计算多种交通方式时间，结合评分与距离生成综合推荐文案（含拥堵规避、雨天公交建议、骑行路线提示），地图信息窗友好展示。', image: '🤖' },
    { title: '使用帮助与操作指南', content: '下方展示操作要点与结果查看说明；默认使用内置密钥运行，如需自定义AI密钥可在设置中填写。', image: '✅' }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsCompleted(true);
    onComplete();
  };

  const handleComplete = () => {
    setIsCompleted(true);
    onComplete();
  };

  if (isCompleted) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="text-center">
          <div className="text-6xl mb-4">{steps[currentStep].image}</div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {steps[currentStep].title}
          </h2>
          <p className="text-gray-600 mb-8">
            {steps[currentStep].content}
          </p>
        </div>
        {currentStep === steps.length - 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm sm:text-base">
                <Map className="w-5 h-5 mr-2 text-blue-600" />
                添加位置点
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start"><span className="text-blue-600 mr-2">•</span><span>在地图上点击添加位置</span></li>
                <li className="flex items-start"><span className="text-blue-600 mr-2">•</span><span>输入地址搜索添加</span></li>
                <li className="flex items-start"><span className="text-blue-600 mr-2">•</span><span>直接输入经纬度坐标</span></li>
                <li className="flex items-start"><span className="text-blue-600 mr-2">•</span><span>最多支持10个位置点</span></li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm sm:text-base">
                <Search className="w-5 h-5 mr-2 text-green-600" />
                位置搜索
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start"><span className="text-green-600 mr-2">•</span><span>支持口语化输入与AI意图解析</span></li>
                <li className="flex items-start"><span className="text-green-600 mr-2">•</span><span>按预算、评分、半径筛选周边</span></li>
                <li className="flex items-start"><span className="text-green-600 mr-2">•</span><span>综合交通时间与评分排序</span></li>
                <li className="flex items-start"><span className="text-green-600 mr-2">•</span><span>生成综合推荐文案并展示</span></li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm sm:text-base">
                <Info className="w-5 h-5 mr-2 text-purple-600" />
                查看结果
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start"><span className="text-purple-600 mr-2">•</span><span>地图标记与信息窗展示详情</span></li>
                <li className="flex items-start"><span className="text-purple-600 mr-2">•</span><span>图片点击预览、电话与区域信息</span></li>
                <li className="flex items-start"><span className="text-purple-600 mr-2">•</span><span>动态路线动画与到达时间概览</span></li>
                <li className="flex items-start"><span className="text-purple-600 mr-2">•</span><span>导航栏显示实时天气</span></li>
              </ul>
            </div>
          </div>
        )}

        {/* 步骤指示器 */}
        <div className="flex justify-center mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full mx-1 ${
                index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* 导航按钮 */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            跳过
          </button>
          
          <div className="flex space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一步
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              {currentStep === steps.length - 1 ? '开始使用' : '下一步'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* 进度 */}
        <div className="mt-6">
          <div className="bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {currentStep + 1} / {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
};