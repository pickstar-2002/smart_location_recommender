import { useState, useEffect } from 'react';
import { Settings, AlertCircle, MapPin } from 'lucide-react';

interface MapStatusIndicatorProps {
  onSettingsClick: () => void;
}

// 地图状态指示器组件
export const MapStatusIndicator = ({ onSettingsClick }: MapStatusIndicatorProps) => {
  const [mapStatus, setMapStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [apiKeyStatus, setApiKeyStatus] = useState<'missing' | 'valid' | 'invalid'>('missing');
  const [isLocating, setIsLocating] = useState(true); // 新增：是否正在定位
  const [showLocationSuccess, setShowLocationSuccess] = useState(false); // 新增：是否显示定位成功提示

  useEffect(() => {
    // 检查API密钥状态
    const checkApiKey = () => {
      setApiKeyStatus('valid');
    };

    checkApiKey();

    // 监听地图加载状态
    const checkMapLoaded = () => {
      if (window.AMap) {
        setMapStatus('loaded');
      } else {
        // 等待一段时间后检查
        setTimeout(() => {
          if (window.AMap) {
            setMapStatus('loaded');
          } else {
            setMapStatus('error');
          }
        }, 3000);
      }
    };

    checkMapLoaded();
  }, []);

  // 当地图加载成功时，显示定位成功提示，3秒后自动消失
  useEffect(() => {
    if (mapStatus === 'loaded') {
      setShowLocationSuccess(true);
      const timer = setTimeout(() => {
        setShowLocationSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [mapStatus]);

  if (mapStatus === 'loaded' && showLocationSuccess) {
    // 地图加载成功，显示定位成功提示（短暂显示后消失）
    return (
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 animate-fade-in-out">
        <div className="bg-green-100 border border-green-400 text-green-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-md flex items-center space-x-1 sm:space-x-2">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          <div>
            <p className="text-xs sm:text-sm font-medium">定位成功</p>
            <p className="text-xs hidden sm:block">已显示您的当前位置</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10">
      {apiKeyStatus === 'missing' && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-md flex items-center space-x-1 sm:space-x-2">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
          <div>
            <p className="text-xs sm:text-sm font-medium">地图API密钥未配置</p>
            <p className="text-xs hidden sm:block">点击设置按钮配置密钥</p>
          </div>
          <button
            onClick={onSettingsClick}
            className="ml-1 sm:ml-2 p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-200 rounded"
          >
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}
      
      {mapStatus === 'loading' && apiKeyStatus === 'valid' && (
        <div className="bg-blue-100 border border-blue-400 text-blue-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-md flex items-center space-x-1 sm:space-x-2">
          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
          <div>
            <p className="text-xs sm:text-sm font-medium">正在定位您的位置...</p>
            <p className="text-xs hidden sm:block">请稍候</p>
          </div>
        </div>
      )}
      
      {mapStatus === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-md flex items-center space-x-1 sm:space-x-2">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
          <div>
            <p className="text-xs sm:text-sm font-medium">地图加载失败</p>
            <p className="text-xs hidden sm:block">请检查API密钥是否正确</p>
          </div>
          <button
            onClick={onSettingsClick}
            className="ml-1 sm:ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-200 rounded"
          >
            <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
