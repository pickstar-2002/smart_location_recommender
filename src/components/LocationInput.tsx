import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, MapPin, Search, Crosshair, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { amapService } from '@/services/amapService';
import { LocationPoint } from '@/types';
import { toast } from 'sonner';
import { getCurrentLocation, toAMapCoordinate } from '@/utils/geolocation';
import { formatTime, getCurrentTimestamp } from '@/utils/timeFormat';

interface LocationInputProps {
  className?: string;
}

// 位置输入组件
export const LocationInput = ({ className = '' }: LocationInputProps) => {
  const { points, addPoint, removePoint, updatePoint, centerOnPoint } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; address: string; location: string; distance?: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [copyNotification, setCopyNotification] = useState<{ show: boolean; message: string; id?: string }>({ show: false, message: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 通过地址添加点
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    

    setIsLoading(true);
    try {
      const { lat, lng } = await amapService.geocodeAddress(addressInput.trim());
      const newPoint: LocationPoint = {
        id: Date.now().toString(),
        lat,
        lng,
        address: addressInput.trim(),
        name: '位置', // 让store自动分配正确的序号
        createdAt: getCurrentTimestamp(),
        source: 'address'
      };
      addPoint(newPoint);
      setAddressInput('');
      setShowSuggestions(false);
      toast.success('地址添加成功');
    } catch (error) {
      toast.error('地址解析失败，请检查地址是否正确');
    } finally {
      setIsLoading(false);
    }
  };

  // 地址输入实时搜索（带防抖）
  const handleAddressInputChange = async (value: string) => {
    setAddressInput(value);
    
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 设置新的定时器，300ms后执行搜索
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        console.log(`开始搜索地址建议: "${value}", 当前位置:`, currentLocation);
        const suggestions = await amapService.getAddressSuggestions(value, currentLocation || undefined);
        console.log(`搜索完成，获得 ${suggestions.length} 个建议:`, suggestions);
        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error('获取地址建议失败:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // 输入框获得焦点时的处理
  const handleInputFocus = async () => {
    // 如果输入框有内容且长度>=2，重新获取建议
    if (addressInput.length >= 2) {
      // 清除之前的定时器
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      // 立即显示建议（如果已有内容）
      setIsSearching(true);
      try {
        console.log(`输入框获得焦点，重新搜索地址建议: "${addressInput}", 当前位置:`, currentLocation);
        const suggestions = await amapService.getAddressSuggestions(addressInput, currentLocation || undefined);
        console.log(`重新搜索完成，获得 ${suggestions.length} 个建议:`, suggestions);
        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error('获取地址建议失败:', error);
      } finally {
        setIsSearching(false);
      }
    } else if (addressInput.length > 0 && addressInput.length < 2) {
      // 如果有点内容但不够2个字符，也显示提示（让用户知道需要继续输入）
      setShowSuggestions(false);
    }
  };

  // 输入框点击事件处理
  const handleInputClick = () => {
    // 点击输入框时，如果有内容就显示建议
    if (addressInput.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // 选择地址建议
  const handleSelectSuggestion = (suggestion: { name: string; address: string; location: string; distance?: number }) => {
    const fullAddress = suggestion.address ? `${suggestion.address} ${suggestion.name}` : suggestion.name;
    setAddressInput(fullAddress);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          handleAddressSubmit(e as any);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // 点击外部关闭建议列表（优化版）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果点击的是输入框本身，不关闭建议列表
      if (inputRef.current && inputRef.current.contains(event.target as Node)) {
        return;
      }
      
      // 如果点击的是建议列表本身，不关闭建议列表
      if (suggestionsRef.current && suggestionsRef.current.contains(event.target as Node)) {
        return;
      }
      
      // 如果点击的是搜索按钮，不关闭建议列表（让用户可以重新搜索）
      const searchButton = document.querySelector('button[type="submit"]');
      if (searchButton && searchButton.contains(event.target as Node)) {
        return;
      }
      
      // 其他情况关闭建议列表
      setShowSuggestions(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // 获取当前位置用于地址搜索优化
  useEffect(() => {
    const getLocation = async () => {
      try {
        // 优先使用浏览器定位
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setCurrentLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
              setIsLocationLoading(false);
            },
            (error) => {
              console.log('浏览器定位失败，使用IP定位:', error);
              // 浏览器定位失败时使用IP定位
              getLocationByIP();
            }
          );
        } else {
          // 浏览器不支持定位，使用IP定位
          getLocationByIP();
        }
      } catch (error) {
        console.error('获取位置失败:', error);
        setIsLocationLoading(false);
      }
    };

    const getLocationByIP = async () => {
      try {
        // 获取API密钥
        const apiKey = localStorage.getItem('amap_api_key') || '725ac982d7f382ac45e1b35a84f7dd16';
        
        // 使用高德地图IP定位API
        const response = await fetch(`https://restapi.amap.com/v3/ip?key=${apiKey}`);
        const data = await response.json();
        
        if (data.status === '1' && data.rectangle) {
          // 解析矩形区域获取中心点
          const rectangle = data.rectangle.split(';');
          if (rectangle.length === 2) {
            const [lng1, lat1] = rectangle[0].split(',').map(Number);
            const [lng2, lat2] = rectangle[1].split(',').map(Number);
            const centerLat = (lat1 + lat2) / 2;
            const centerLng = (lng1 + lng2) / 2;
            
            setCurrentLocation({
              lat: centerLat,
              lng: centerLng
            });
          }
        }
      } catch (error) {
        console.error('IP定位失败:', error);
        // 使用默认位置（北京）
        setCurrentLocation({
          lat: 39.90923,
          lng: 116.397428
        });
      } finally {
        setIsLocationLoading(false);
      }
    };

    getLocation();
  }, []);

  // 复制坐标并显示轻提示
  const handleCopyCoordinates = (lng: number, lat: number, pointId: string) => {
    navigator.clipboard.writeText(`${lng}, ${lat}`);
    
    // 清除之前的定时器
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    
    // 显示提示
    setCopyNotification({
      show: true,
      message: '坐标已复制到剪贴板',
      id: pointId
    });
    
    // 3秒后自动隐藏提示
    copyTimeoutRef.current = setTimeout(() => {
      setCopyNotification({ show: false, message: '', id: undefined });
    }, 3000);
  };

  // 添加当前位置
  const handleAddCurrentLocation = async () => {
    if (points.length >= 10) {
      toast.error('已达到最大位置点数量限制（10个）');
      return;
    }

    setIsLocationLoading(true);
    try {
      let location: { lat: number; lng: number } | null = null;

      // 优先使用浏览器定位
      if (navigator.geolocation) {
        location = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude
              });
            },
            (error) => {
              console.log('浏览器定位失败，使用IP定位:', error);
              reject(error);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
          );
        });
      }

      // 如果浏览器定位失败，使用IP定位
      if (!location) {
        const apiKey = localStorage.getItem('amap_api_key') || '725ac982d7f382ac45e1b35a84f7dd16';
        const response = await fetch(`https://restapi.amap.com/v3/ip?key=${apiKey}`);
        const data = await response.json();
        
        if (data.status === '1' && data.rectangle) {
          const rectangle = data.rectangle.split(';');
          if (rectangle.length === 2) {
            const [lng1, lat1] = rectangle[0].split(',').map(Number);
            const [lng2, lat2] = rectangle[1].split(',').map(Number);
            location = {
              lat: (lat1 + lat2) / 2,
              lng: (lng1 + lng2) / 2
            };
          }
        }
      }

      if (location) {
        // 获取当前位置的地址信息
        let address = '当前位置';
        try {
          const reverseAddress = await amapService.reverseGeocode(location.lat, location.lng);
          address = reverseAddress || '当前位置';
        } catch (error) {
          console.warn('获取地址信息失败:', error);
        }

        const newPoint: LocationPoint = {
          id: Date.now().toString(),
          lat: location.lat,
          lng: location.lng,
          address: address,
          name: '我的位置',
          createdAt: getCurrentTimestamp(),
          source: 'current'
        };
        
        addPoint(newPoint);
        toast.success('已添加当前位置');
      } else {
        toast.error('无法获取当前位置');
      }
    } catch (error) {
      console.error('添加当前位置失败:', error);
      toast.error('添加当前位置失败，请检查网络连接');
    } finally {
      setIsLocationLoading(false);
    }
  };

  return (
    <div className="relative z-[60] pointer-events-auto">
      {!collapsed ? (
        <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-3 sm:p-4 w-80 sm:w-96 max-h-[70vh] sm:max-h-[75vh] overflow-y-auto ${className}`}>
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mr-2 flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">位置输入</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-500 font-medium">{points.length}/10</span>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="最小化"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 地址输入 */}
          <div className="mb-4 sm:mb-6">
            <form onSubmit={handleAddressSubmit} className="relative">
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={addressInput}
                    onChange={(e) => handleAddressInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onClick={handleInputClick}
                    placeholder={isLocationLoading ? "正在获取当前位置..." : "输入地址（如：北京市朝阳区三里屯）"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={isLoading || isLocationLoading}
                  />
                
                  {/* 地址建议下拉列表 */}
                  {showSuggestions && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
                    >
                      {/* 搜索中状态 */}
                      {isSearching && (
                        <div className="px-3 py-3 text-center text-gray-500">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            搜索中...
                          </div>
                        </div>
                      )}
                      
                      {/* 无结果状态 */}
                      {!isSearching && suggestions.length === 0 && addressInput.length >= 2 && (
                        <div className="px-3 py-3 text-center text-gray-500">
                          未找到相关地址，请尝试其他关键词
                        </div>
                      )}
                      
                      {/* 建议列表 */}
                      {!isSearching && suggestions.length > 0 && (
                        <>
                          {suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                selectedSuggestionIndex === index ? 'bg-blue-50 border-blue-200' : ''
                              }`}
                              onClick={() => handleSelectSuggestion(suggestion)}
                              onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                      {suggestion.name}
                                    </div>
                                    {suggestion.distance !== undefined && (
                                      suggestion.distance < 500 ? (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                          很近
                                        </span>
                                      ) : suggestion.distance < 1000 ? (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                          附近
                                        </span>
                                      ) : suggestion.distance < 2000 ? (
                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                          较近
                                        </span>
                                      ) : null
                                    )}
                                  </div>
                                  {suggestion.address && (
                                    <div className="text-xs text-gray-500 truncate mt-1">
                                      {suggestion.address}
                                    </div>
                                  )}
                                </div>
                                {suggestion.distance !== undefined && (
                                  <div className="ml-3 text-xs font-bold whitespace-nowrap">
                                    {suggestion.distance < 500 ? (
                                      <span className="text-green-600">{Math.round(suggestion.distance)}m</span>
                                    ) : suggestion.distance < 1000 ? (
                                      <span className="text-blue-600">{Math.round(suggestion.distance)}m</span>
                                    ) : suggestion.distance < 2000 ? (
                                      <span className="text-yellow-600">{(suggestion.distance / 1000).toFixed(1)}km</span>
                                    ) : (
                                      <span className="text-gray-600">{(suggestion.distance / 1000).toFixed(1)}km</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !addressInput.trim() || isLocationLoading}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm whitespace-nowrap min-w-[80px]"
                >
                  <Search className="w-4 h-4 mr-1" />
                  {isLoading ? '解析中...' : '搜索'}
                </button>
              </div>
            
              {/* 位置状态提示 */}
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-xs text-gray-600 mr-1">提示：</span>
                {isLocationLoading && (
                  <span className="text-xs text-blue-600 flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    正在获取当前位置...
                  </span>
                )}
                {currentLocation && !isLocationLoading && (
                  <span className="text-xs text-green-600 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                    已获取当前位置
                  </span>
                )}
                {addressInput.length > 0 && addressInput.length < 2 && !isSearching && (
                  <span className="text-xs text-orange-600 flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                    继续输入（至少2个字符）
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* 快速添加按钮组 */}
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <button
              onClick={handleAddCurrentLocation}
              disabled={isLocationLoading || points.length >= 10}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm whitespace-nowrap transition-colors"
            >
              {isLocationLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                  定位中...
                </>
              ) : (
                <>
                  <Crosshair className="w-3 h-3 mr-1" />
                  添加当前位置
                </>
              )}
            </button>
            
            {currentLocation && !isLocationLoading && (
              <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                已定位
              </div>
            )}
          </div>
      

          {/* 位置点列表 */}
          {points.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h4 className="text-sm sm:text-md font-medium text-gray-800 mb-2 sm:mb-3 flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                已添加的位置点 ({points.length}/10)
              </h4>
              {points.map((point, index) => (
                <div 
                  key={point.id} 
                  className={`border rounded-lg p-2 sm:p-3 hover:shadow-md transition-all cursor-pointer ${
                    'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* 序号标识 */}
                      <div className="flex-shrink-0">
                        <span className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                          {index + 1}
                        </span>
                      </div>
                      
                      {/* 详细信息 */}
                      <div className="flex-1 min-w-0">
                        {/* 位置名称 */}
                        <div className="flex items-center mb-1">
                          <h5 className="font-semibold text-gray-800 text-xs sm:text-sm truncate">
                            {point.name}
                          </h5>
                          {point.name === '我的位置' && (
                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                              当前位置
                            </span>
                          )}
                        </div>
                        
                        {/* 详细地址 */}
                        {point.address ? (
                          <div className="mb-1">
                            <div className="text-xs text-gray-600 mb-1">
                              📍 {point.address}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              坐标: {point.lng.toFixed(6)}, {point.lat.toFixed(6)}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-1">
                            <div className="text-xs text-gray-500 font-mono mb-1">
                              📍 坐标: {point.lng.toFixed(6)}, {point.lat.toFixed(6)}
                            </div>
                            <div className="text-xs text-gray-400">
                              🏠 地址信息获取中...
                            </div>
                          </div>
                        )}
                        
                        {/* 添加方式和时间 */}
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center">
                            ⏰ {point.createdAt ? formatTime(point.createdAt) : '--:--'}
                          </span>
                          <span className="flex items-center">
                            📝 {
                              point.source === 'address' ? '地址搜索' :
                              point.source === 'coordinate' ? '坐标输入' :
                              point.source === 'random' ? '随机位置' :
                              point.source === 'current' ? '当前位置' :
                              point.source === 'map' ? '地图点击' : '未知来源'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex space-x-1 ml-2 sm:ml-3">
                      <button
                        onClick={() => {
                          // 定位到该位置
                          centerOnPoint(point);
                          console.log(`定位到位置: ${point.name} (${point.lng}, ${point.lat})`);
                        }}
                        className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="定位到该位置"
                      >
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => {
                          handleCopyCoordinates(point.lng, point.lat, point.id);
                        }}
                        className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                        title="复制坐标"
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removePoint(point.id)}
                        className="p-1.5 sm:p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        title="删除位置点"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {points.length === 0 && (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <MapPin className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-gray-300" />
              <p className="text-sm sm:text-base">还没有添加任何位置点</p>
              <p className="text-xs sm:text-sm mt-1">可以通过以下方式添加：</p>
              <ul className="text-xs sm:text-sm mt-2 space-y-1">
                <li>• 在地图上点击</li>
                <li>• 输入地址搜索</li>
              </ul>
            </div>
          )}
          
          {/* 复制提示 - 轻量级div提示 */}
          {copyNotification.show && (
            <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50"
                 style={{
                   animation: 'copyNotification 0.3s ease-out'
                 }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{copyNotification.message}</span>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white/90 backdrop-blur rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-all"
          title="展开位置输入"
        >
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
          <span className="text-xs sm:text-sm text-gray-700 hidden sm:inline">位置输入</span>
          <span className="text-xs text-gray-500">{points.length}/10</span>
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
        </button>
      )}
    </div>
  );
};

// 添加CSS动画样式
const styles = `
  @keyframes copyNotification {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes copyNotificationOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;

// 动态添加样式到head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
