import { useState, useEffect } from 'react';
import { Loader, X, Wand2, Search, MapPin, Route, Brain, CheckCircle } from 'lucide-react';

// 加载状态组件
export const LoadingSpinner = ({ 
  isLoading, 
  message = '正在处理中...',
  subMessage = '请稍候，系统正在为您分析最佳推荐地点' 
}: { 
  isLoading: boolean; 
  message?: string;
  subMessage?: string;
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
        <div className="animate-spin mb-4">
          <Loader className="w-12 h-12 text-blue-600 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{message}</h3>
        <p className="text-gray-600 text-sm">{subMessage}</p>
        
        {/* 进度指示器 */}
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
          <p className="text-xs text-gray-500">正在调用AI模型分析...</p>
        </div>
      </div>
    </div>
  );
};

// 步骤加载器 - 增强版，展示实时信息
export const StepLoader = ({ 
  currentStep, 
  totalSteps, 
  stepLabels,
  errorSteps = [],
  onClose,
  autoClose = true,
  autoCloseDelay = 2000,
  stepDetails = {} // 新增：每个步骤的详细信息
}: { 
  currentStep: number; 
  totalSteps: number;
  stepLabels: string[];
  errorSteps?: number[]; // 失败的步骤索引数组
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number; // 自动关闭延迟时间（毫秒）
  stepDetails?: Record<number, string>; // 步骤详细信息
}) => {
  const [isVisible, setIsVisible] = useState(currentStep > 0);
  const [currentDetail, setCurrentDetail] = useState('');

  // 监听步骤变化，更新详细信息
  useEffect(() => {
    if (currentStep > 0 && currentStep <= totalSteps) {
      const detail = stepDetails[currentStep - 1] || '';
      setCurrentDetail(detail);
    }
  }, [currentStep, stepDetails, totalSteps]);

  // 监听步骤变化，处理自动关闭
  useEffect(() => {
    if (currentStep >= totalSteps && autoClose && currentStep > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [currentStep, totalSteps, autoClose, autoCloseDelay, onClose]);

  // 处理手动关闭
  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  // 重置可见性状态当currentStep变化时
  useEffect(() => {
    if (currentStep > 0) {
      setIsVisible(true);
    }
  }, [currentStep]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl mx-4 relative shadow-lg border border-gray-200">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          title="关闭"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
              currentStep >= totalSteps ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {currentStep >= totalSteps ? (
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              ) : (
                <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                {currentStep >= totalSteps ? '智能分析完成！' : '位置搜索执行中...'}
              </h3>
              <p className="text-gray-600 mt-1">
                {currentStep >= totalSteps 
                  ? '已为您找到最佳推荐地点' 
                  : '请稍候，系统正在为您解析意图、检索地点并生成推荐'
                }
              </p>
            </div>
          </div>
          
          {/* 当前步骤详细信息 */}
          {currentDetail && currentStep <= totalSteps && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
              <div className="flex items-start">
                <div className="mt-2 mr-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1 flex items-center">
                    <span>🔍</span>
                    <span className="ml-1">当前步骤详情</span>
                  </p>
                  <p className="text-sm text-blue-700">{currentDetail}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 步骤指示器 */}
          <div className="space-y-4">
            {stepLabels.map((label, index) => {
              const hasError = errorSteps.includes(index);
              const isCurrent = index === currentStep - 1;
              const isCompleted = index < currentStep;
              const Icon = [Wand2, Search, MapPin, Route, Brain, CheckCircle][index] || Search;
              
              return (
                <div key={index} className={`flex items-start ${
                  isCurrent ? 'bg-blue-50 rounded-lg p-3 -mx-3' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1 transition-all duration-300 flex-shrink-0 ${
                    hasError ? 'bg-red-100 text-red-600' :
                    isCompleted ? 'bg-green-100 text-green-600' :
                    isCurrent ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {hasError ? '!' : isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <span className={`text-base flex items-center gap-2 ${
                      hasError ? 'text-red-600 font-semibold' :
                      isCompleted ? 'text-gray-800 font-semibold' : 'text-gray-500'
                    }`}>
                      <Icon className={`w-4 h-4 ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span>{label}</span>
                    </span>
                    {stepDetails[index] && isCompleted && (
                      <div className="mt-2 text-sm text-green-700 bg-green-50 rounded-md p-2">
                        <span className="font-medium">✓ </span>
                        {stepDetails[index]}
                      </div>
                    )}
                    {hasError && isCurrent && (
                      <div className="mt-2 text-sm text-red-700 bg-red-50 rounded-md p-2 border border-red-200">
                        <span className="font-medium">⚠️ 该步骤失败，已启用降级方案</span>
                      </div>
                    )}
                    {isCurrent && !hasError && (
                      <div className="mt-2 text-sm text-blue-700 bg-blue-50 rounded-md p-2 border border-blue-200">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            <span>🔄</span>
                            <span className="ml-1">正在执行</span>
                          </span>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                        {stepDetails[index] && (
                          <div className="mt-2 text-xs text-blue-700">
                            {stepDetails[index]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isCurrent && (
                    <div className="ml-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 进度条 - 增强版 */}
        <div className="bg-gray-200 rounded-full h-3 overflow-hidden mb-4">
          <div 
            className={`h-3 rounded-full transition-all duration-700 ease-out ${
              errorSteps.length > 0 ? 'bg-yellow-400' : 
              currentStep >= totalSteps ? 'bg-green-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>
        
        {/* 底部状态信息 */}
        <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">步骤 {Math.min(currentStep, totalSteps)} / {totalSteps}</span>
            </div>
          
          <div className="text-right">
            {errorSteps.length > 0 && (
              <span className="text-sm text-yellow-600">
                ⚠️ 部分服务不可用，已启用备用方案
              </span>
            )}
            {currentStep >= totalSteps && (
              <span className="text-sm text-green-600 font-medium">
                ✅ 所有步骤执行完成！
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};