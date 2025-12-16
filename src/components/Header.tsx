import { Settings, Search, X, Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, Thermometer, MapPin, HelpCircle } from 'lucide-react';
import { AIModelSelector } from './AIModelSelector';
import { backendAIService } from '@/services/backendAiService';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { amapService } from '@/services/amapService';

interface HeaderProps {
  onApiKeyClick: () => void;
  onShowOnboarding?: () => void;
}

// 头部组件
export const Header = ({ onApiKeyClick, onShowOnboarding }: HeaderProps) => {
  const [showHelp, setShowHelp] = useState(false);
  const [selectedModel, setSelectedModel] = useState(backendAIService.getCurrentModel());
  const { selectedOriginPoint, points, mapConfig } = useAppStore();
  const [weatherInfo, setWeatherInfo] = useState<{ city?: string; weather?: string; temperature?: string; humidity?: string; winddirection?: string; windpower?: string } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      let lat: number | undefined;
      let lng: number | undefined;
      if (selectedOriginPoint) {
        lat = selectedOriginPoint.lat; lng = selectedOriginPoint.lng;
      } else if (points && points.length > 0) {
        lat = points[0].lat; lng = points[0].lng;
      } else if (mapConfig && mapConfig.center) {
        lat = mapConfig.center[1]; lng = mapConfig.center[0];
      }
      if (typeof lat === 'number' && typeof lng === 'number') {
        const city = await amapService.getCityByCoordinate(lat, lng);
        if (city) {
          const w = await amapService.getWeatherByCityName(city);
          setWeatherInfo(w ? { city: w.city || city, weather: w.weather, temperature: w.temperature, humidity: w.humidity, winddirection: w.winddirection, windpower: w.windpower } : null);
        } else {
          setWeatherInfo(null);
        }
      }
    };
    fetchWeather();
  }, [selectedOriginPoint, points, mapConfig]);

  const handleHelpClick = () => {
    setShowHelp(!showHelp);
  };

  const handleCloseHelp = () => {
    setShowHelp(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                <img src="/favicon.png" alt="map" className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                <span className="hidden sm:inline">智能位置推荐助手</span>
                <span className="sm:hidden">位置推荐</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <AIModelSelector 
              currentModel={selectedModel}
              onModelChange={(m) => { backendAIService.setModel(m); setSelectedModel(m); }}
            />
            {weatherInfo && (
              (() => {
                const t = weatherInfo.weather || '';
                const bg = t.includes('雨')
                  ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500'
                  : t.includes('雪')
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-sky-600'
                  : t.includes('云') || t.includes('阴')
                  ? 'bg-gradient-to-r from-gray-500 via-slate-500 to-gray-700'
                  : 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500';
                const glow = bg;
                const Icon = t.includes('雨')
                  ? CloudRain
                  : t.includes('雪')
                  ? CloudSnow
                  : t.includes('云') || t.includes('阴')
                  ? Cloud
                  : Sun;
                return (
                  <div className="relative">
                    <div className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm ${bg} text-white rounded-full shadow-lg ring-1 ring-white/20 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl`}> 
                      <Icon className="w-4 h-4 animate-pulse" />
                      <span className="font-medium">{weatherInfo.weather}</span>
                      <Thermometer className="w-4 h-4" />
                      <span>{weatherInfo.temperature}℃</span>
                      {weatherInfo.humidity && <><Droplets className="w-4 h-4" /><span>{weatherInfo.humidity}%</span></>}
                      {(weatherInfo.winddirection || weatherInfo.windpower) && <><Wind className="w-4 h-4" /><span>{[weatherInfo.winddirection, weatherInfo.windpower].filter(Boolean).join(' ')}</span></>}
                      {weatherInfo.city && <><MapPin className="w-4 h-4" /><span className="hidden sm:inline">{weatherInfo.city}</span></>}
                    </div>
                    <div className={`absolute inset-0 -z-10 blur-xl opacity-40 ${glow}`}></div>
                  </div>
                );
              })()
            )}
            <button
              onClick={() => onShowOnboarding?.()}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="新手引导"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            
            <button
              onClick={onApiKeyClick}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="API密钥设置"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 帮助弹框 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">使用帮助</h2>
              <button
                onClick={handleCloseHelp}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm sm:text-base">
                  <img src="/favicon.png" alt="map" className="w-5 h-5 mr-2" />
                  添加位置点
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>在地图上点击添加位置</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>输入地址搜索添加</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>直接输入经纬度坐标</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>最多支持10个位置点</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm sm:text-base">
                  <Search className="w-5 h-5 mr-2 text-green-600" />
                  搜索场所
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span>输入场所类型关键词</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span>支持模糊匹配和品牌搜索</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span>AI智能分析推荐最佳地点</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span>考虑交通可达性和评分</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center text-sm sm:text-base">
                  <MapPin className="w-5 h-5 mr-2 text-purple-600" />
                  查看结果
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-purple-600 mr-2">•</span>
                    <span>地图显示推荐地点</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 mr-2">•</span>
                    <span>查看详细信息和路线</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 mr-2">•</span>
                    <span>比较不同推荐选项</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 mr-2">•</span>
                    <span>获取联系方式和导航</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={handleCloseHelp}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  知道了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
