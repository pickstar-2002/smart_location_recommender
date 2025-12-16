import { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { LocationPoint } from '@/types';
import { MapStatusIndicator } from './MapStatusIndicator';
import { getCurrentLocation, toAMapCoordinate, checkGeolocationPermission, getLocationByIP } from '@/utils/geolocation';
import { toast } from 'sonner';
import { MapLegend } from './MapLegend';
import { LocationInput } from './LocationInput';
import { amapService } from '@/services/amapService';
import { getCurrentTimestamp } from '@/utils/timeFormat';

interface AMapComponentProps {
  className?: string;
  onSettingsClick?: () => void;
}

// 高德地图组件
export const AMapComponent = ({ className = '', onSettingsClick }: AMapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routesRef = useRef<Map<string, any>>(new Map());
  const routeAnimRef = useRef<{ marker: any | null; polyline: any | null; timer: any | null }>({ marker: null, polyline: null, timer: null });
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number>(0);
  const [locationStatus, setLocationStatus] = useState<string>('正在获取位置...');
  const [routeStatus, setRouteStatus] = useState<{ show: boolean; origin?: string; dest?: string }>({ show: false });
  
  const { 
    points, 
    mapConfig, 
    recommendations, 
    selectedRecommendation,
    addPoint, 
    removePoint,
    updatePoint,
    setCurrentLocation,
    centerOnPoint,
    selectedOriginPoint,
    setSelectedOriginPoint
  } = useAppStore();

  // 监听地图配置变化，实现定位功能
  useEffect(() => {
    if (!mapReady) return;
    if (mapInstance.current && mapConfig.center) {
      const [lng, lat] = mapConfig.center;
      if (mapInstance.current?.setCenter) {
        mapInstance.current.setCenter([lng, lat]);
      }
      if (mapConfig.zoom && mapInstance.current?.setZoom) {
        mapInstance.current.setZoom(mapConfig.zoom);
      }
    }
  }, [mapConfig, mapReady]);

  // 定位到指定点
  const centerMapOnPoint = (point: LocationPoint) => {
    if (mapInstance.current) {
      mapInstance.current.setCenter([point.lng, point.lat]);
      mapInstance.current.setZoom(16); // 设置合适的缩放级别
      
      // 高亮显示对应的标记
      const markerId = point.source === 'map' ? `click_${point.id}` : point.id;
      const marker = markersRef.current.get(markerId);
      
      if (marker) {
        // 将标记置顶并添加动画效果
        marker.setTop(true);
        
        // 添加弹跳动画效果
        if (marker.setAnimation) {
          marker.setAnimation('AMAP_ANIMATION_BOUNCE');
          // 2秒后停止动画
          setTimeout(() => {
            if (marker.setAnimation) {
              marker.setAnimation('AMAP_ANIMATION_NONE');
            }
            marker.setTop(false);
          }, 2000);
        }
        
        // 显示信息窗口
        if (window.AMap.InfoWindow) {
          const infoWindow = new window.AMap.InfoWindow({
            content: `
              <div style="padding: 10px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; color: #3b82f6;">📍 ${point.name}</h3>
                <p style="margin: 4px 0;"><strong>经度:</strong> ${point.lng.toFixed(6)}</p>
                <p style="margin: 4px 0;"><strong>纬度:</strong> ${point.lat.toFixed(6)}</p>
                ${point.address ? `<p style="margin: 4px 0;"><strong>地址:</strong> ${point.address}</p>` : ''}
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">点击定位按钮可查看此位置</p>
              </div>
            `,
            offset: new window.AMap.Pixel(0, -45)
          });
          infoWindow.open(mapInstance.current, marker.getPosition());
        }
      }
    }
  };

  // 生成带数字的地图标记图标（大图标版本）
  const createNumberedIcon = (number: number, color: string = '#10B981') => {
    const svgContent = `
      <svg width="36" height="45" viewBox="0 0 36 45" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 40C26.2843 35 32 27.5 32 18C32 8.5 26.2843 3 18 3C9.71573 3 4 8.5 4 18C4 27.5 9.71573 35 18 40Z" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="18" y="22" text-anchor="middle" dy=".3em" fill="white" font-size="16" font-weight="bold" font-family="Arial, sans-serif">
          ${number}
        </text>
      </svg>
    `;
    
    return new window.AMap.Icon({
      size: new window.AMap.Size(36, 45),
      image: `data:image/svg+xml;base64,${btoa(svgContent)}`,
      imageSize: new window.AMap.Size(36, 45)
    });
  };

  // 生成星级评分HTML
  const generateStarRating = (rating: number, size: 'small' | 'medium' = 'medium') => {
    const starRating = Math.max(0, Math.min(5, rating));
    const fullStars = Math.floor(starRating);
    const hasHalfStar = starRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    const starSize = size === 'small' ? 12 : 14;
    const stars = [];
    
    // 满星
    for (let i = 0; i < fullStars; i++) {
      stars.push(`<svg width="${starSize}" height="${starSize}" viewBox="0 0 24 24" fill="currentColor" style="color: #fbbf24;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`);
    }
    
    // 半星
    if (hasHalfStar) {
      stars.push(`<div style="position: relative; display: inline-block;">
        <svg width="${starSize}" height="${starSize}" viewBox="0 0 24 24" fill="currentColor" style="color: #e5e7eb;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <svg width="${starSize}" height="${starSize}" viewBox="0 0 24 24" fill="currentColor" style="color: #fbbf24; position: absolute; top: 0; left: 0; clip-path: inset(0 50% 0 0);"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </div>`);
    }
    
    // 空星
    for (let i = 0; i < emptyStars; i++) {
      stars.push(`<svg width="${starSize}" height="${starSize}" viewBox="0 0 24 24" fill="currentColor" style="color: #e5e7eb;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`);
    }
    
    return stars.join('');
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // 记录加载开始时间
    setLoadingStartTime(Date.now());
    const enableDiagnostics = false;

    // 获取当前位置（多层备用方案）
    const getCurrentLocationAsync = async (): Promise<[number, number]> => {
      try {
        setLocationStatus('正在检查定位权限...');
        
        // 首先检查权限状态
        const permission = await checkGeolocationPermission();
        console.log('地理定位权限状态:', permission);
        
        if (permission === 'denied') {
          setLocationStatus('定位权限被拒绝，尝试IP定位...');
          console.warn('用户拒绝了地理定位权限，尝试IP定位');
          
          // 尝试IP定位作为备用方案
          try {
            const ipLocation = await getLocationByIP();
            setLocationStatus('IP定位成功！');
            return toAMapCoordinate(ipLocation);
          } catch (ipError) {
            console.warn('IP定位也失败:', ipError);
            setLocationStatus('IP定位失败，使用默认位置');
            return [116.397428, 39.90923];
          }
        }
        
        setLocationStatus('正在获取您的当前位置...');
        try {
          const location = await getCurrentLocation();
          setLocationStatus('位置获取成功！');
          return toAMapCoordinate(location);
        } catch (browserError) {
          console.warn('浏览器定位失败，尝试IP定位:', browserError);
          setLocationStatus('浏览器定位失败，尝试IP定位...');
          
          // 浏览器定位失败，尝试IP定位
          try {
            const ipLocation = await getLocationByIP();
            setLocationStatus('IP定位成功！');
            return toAMapCoordinate(ipLocation);
          } catch (ipError) {
            console.warn('IP定位也失败:', ipError);
            setLocationStatus('所有定位方式都失败，使用默认位置');
            return [116.397428, 39.90923];
          }
        }
      } catch (error) {
        console.error('定位过程发生错误:', error);
        setLocationStatus(`定位失败: ${error instanceof Error ? error.message : '未知错误'}`);
        return [116.397428, 39.90923];
      }
    };

    // 初始化地图
    const initMap = async () => {
      let centerLocation = mapConfig.center;
      
      // 始终尝试获取用户当前位置，无论当前配置是什么
        console.log('正在尝试获取用户当前位置...');
        const userLocation = await getCurrentLocationAsync();
        
        // 检查是否成功获取到用户位置（不是默认的北京位置）
        if (userLocation[0] !== 116.397428 || userLocation[1] !== 39.90923) {
          // 成功获取到用户位置
          centerLocation = userLocation;
          setCurrentLocation(userLocation);
          toast.success('已定位到您的当前位置');
          console.log(`成功获取到用户位置: ${userLocation[0]}, ${userLocation[1]}`);
        } else {
          console.log('使用默认位置（北京天安门）');
          toast.info('无法获取您的位置，使用默认位置（北京）');
        }

      if (window.AMap) {
        mapInstance.current = new window.AMap.Map(mapRef.current, {
          center: centerLocation,
          zoom: mapConfig.zoom,
          resizeEnable: true
        });
        setMapReady(true);

        // 添加点击事件
        mapInstance.current.on('click', async (e: any) => {
          const newPoint: LocationPoint = {
            id: Date.now().toString(),
            lat: e.lnglat.lat,
            lng: e.lnglat.lng,
            name: '位置', // 让store自动分配正确的序号
            createdAt: getCurrentTimestamp(),
            source: 'map'
          };
          addPoint(newPoint);
          
          // 异步获取地址信息
          try {
            const address = await amapService.reverseGeocode(e.lnglat.lat, e.lnglat.lng);
            if (address && address !== '地址获取失败' && address !== '未知地址') {
              // 更新点的地址信息
              updatePoint(newPoint.id, { address });
            }
          } catch (error) {
            console.error('获取点击位置地址失败:', error);
          }
          
          // 注意：由于store的addPoint会异步更新状态，我们需要从store获取最终的点信息
          // 延迟创建标记，确保store已经更新了序号
          setTimeout(() => {
            const { points } = useAppStore.getState();
            const updatedPoint = points.find(p => p.id === newPoint.id);
            if (updatedPoint && window.AMap.Marker) {
              // 提取数字序号
              const match = updatedPoint.name.match(/位置(\d+)/);
              const number = match ? parseInt(match[1]) : 1;
              
              const clickMarker = new window.AMap.Marker({
                position: [e.lnglat.lng, e.lnglat.lat],
                title: `点击位置 - ${updatedPoint.name}`,
                icon: createNumberedIcon(number, '#FF6347'), // 使用带数字的红色图标
                offset: new window.AMap.Pixel(-18, -45)
              });

              let hoverInfoWindow: any = null;
              clickMarker.on('click', () => {
                if (!window.AMap.InfoWindow) return;
                const infoWindow = new window.AMap.InfoWindow({
                  content: `
                    <div style="padding: 10px; min-width: 220px;">
                      <h3 style="margin: 0 0 6px 0; color: #10B981;">${updatedPoint.name}</h3>
                      ${updatedPoint.address ? `<p style="margin: 4px 0;">📍 ${updatedPoint.address}</p>` : ''}
                      <p style="margin: 4px 0; font-size: 11px; color: #666;">(${e.lnglat.lng.toFixed(6)}, ${e.lnglat.lat.toFixed(6)})</p>
                    </div>
                  `,
                  offset: new window.AMap.Pixel(0, -32)
                });
                infoWindow.open(mapInstance.current, clickMarker.getPosition());
              });

              clickMarker.on('mouseover', () => {
                clickMarker.setTop(true);
                if (!window.AMap.InfoWindow) return;
                hoverInfoWindow = new window.AMap.InfoWindow({
                  content: `
                    <div style="padding: 10px; min-width: 200px;">
                      <h3 style="margin: 0 0 6px 0; color: #10B981;">${updatedPoint.name}</h3>
                      ${updatedPoint.address ? `<p style="margin: 4px 0;">📍 ${updatedPoint.address}</p>` : ''}
                    </div>
                  `,
                  offset: new window.AMap.Pixel(0, -32)
                });
                hoverInfoWindow.open(mapInstance.current, clickMarker.getPosition());
              });

              clickMarker.on('mouseout', () => {
                clickMarker.setTop(false);
                if (hoverInfoWindow) {
                  hoverInfoWindow.close();
                  hoverInfoWindow = null;
                }
              });
              
              clickMarker.setMap(mapInstance.current);
              
              // 存储点击标记以便后续管理
              const clickMarkerId = `click_${newPoint.id}`;
              markersRef.current.set(clickMarkerId, clickMarker);
            }
          }, 0); // 延迟0毫秒确保store更新
        });

        // 添加地图控件
        if (window.AMap.ToolBar) {
          mapInstance.current.addControl(new window.AMap.ToolBar());
        }
        if (window.AMap.Scale) {
          mapInstance.current.addControl(new window.AMap.Scale());
        }
        if (window.AMap.OverView) {
          mapInstance.current.addControl(new window.AMap.OverView({ isOpen: true }));
        }

        // 记录加载完成时间并输出统计信息
        const loadTime = Date.now() - loadingStartTime;
        console.log(`地图加载完成，总耗时: ${loadTime}ms`);
        
        // 存储加载时间到localStorage用于统计平均时间
        const loadTimes = JSON.parse(localStorage.getItem('map_load_times') || '[]');
        loadTimes.push(loadTime);
        // 只保留最近10次的记录
        if (loadTimes.length > 10) {
          loadTimes.shift();
        }
        localStorage.setItem('map_load_times', JSON.stringify(loadTimes));
        
        // 计算平均加载时间
        const avgTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
        console.log(`平均加载时间: ${avgTime.toFixed(0)}ms (基于最近${loadTimes.length}次加载)`);
        
        // 添加当前位置标识（如果成功获取到用户位置）
            if (centerLocation[0] !== 116.397428 || centerLocation[1] !== 39.90923) {
              if (window.AMap.Marker) {
                const currentLocationMarker = new window.AMap.Marker({
                  position: centerLocation,
                  title: '您的当前位置',
                  icon: new window.AMap.Icon({
                    size: new window.AMap.Size(36, 45),
                    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCAzNiA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4IDQwQzI2LjI4NDMgMzUgMzIgMjcuNSAzMiAxOEMzMiA4LjUgMjYuMjg0MyAzIDE4IDNDOS43MTU3MyAzIDQgOC41IDQgMThDNCAyNy41IDkuNzE1NzMgMzUgMTggNDBaIiBmaWxsPSIjMjU2M0ViIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMTgiIGN5PSIxOCIgcj0iNyIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
                    imageSize: new window.AMap.Size(36, 45)
                  }),
                  offset: new window.AMap.Pixel(-18, -45),
                  zIndex: 1000 // 确保当前位置标记在最上层
                });
            
            let hoverInfoWindow3: any = null;
            currentLocationMarker.on('click', async () => {
              if (!window.AMap.InfoWindow) return;
              let addr = '';
              try {
                addr = await amapService.reverseGeocode(centerLocation[1], centerLocation[0]) || '';
              } catch {}
              const infoWindow = new window.AMap.InfoWindow({
                content: `
                  <div style="padding: 10px; min-width: 240px;">
                    <h3 style="margin: 0 0 6px 0; color: #1d4999;">您的当前位置</h3>
                    ${addr ? `<p style="margin: 4px 0;">📍 ${addr}</p>` : ''}
                    <p style="margin: 4px 0; font-size: 11px; color: #666;">(${centerLocation[0].toFixed(6)}, ${centerLocation[1].toFixed(6)})</p>
                  </div>
                `,
                offset: new window.AMap.Pixel(0, -32)
              });
              infoWindow.open(mapInstance.current, currentLocationMarker.getPosition());
            });

            currentLocationMarker.on('mouseover', async () => {
              currentLocationMarker.setTop(true);
              if (!window.AMap.InfoWindow) return;
              let addr = '';
              try {
                addr = await amapService.reverseGeocode(centerLocation[1], centerLocation[0]) || '';
              } catch {}
              hoverInfoWindow3 = new window.AMap.InfoWindow({
                content: `
                  <div style="padding: 10px; min-width: 220px;">
                    <h3 style="margin: 0 0 6px 0; color: #1d4999;">您的当前位置</h3>
                    ${addr ? `<p style="margin: 4px 0;">📍 ${addr}</p>` : ''}
                  </div>
                `,
                offset: new window.AMap.Pixel(0, -32)
              });
              hoverInfoWindow3.open(mapInstance.current, currentLocationMarker.getPosition());
            });

            currentLocationMarker.on('mouseout', () => {
              currentLocationMarker.setTop(false);
              if (hoverInfoWindow3) {
                hoverInfoWindow3.close();
                hoverInfoWindow3 = null;
              }
            });
            
            currentLocationMarker.setMap(mapInstance.current);
            
            // 存储当前位置标记
            markersRef.current.set('current_location', currentLocationMarker);
            
            console.log('已添加当前位置标识');
          }
        }
        
        // 设置加载完成状态
        setIsLoading(false);
      }
    };

    // 加载高德地图脚本
    const loadAMapScript = () => {
      if (window.AMap) {
        initMap();
        return;
      }

      const apiKey = '725ac982d7f382ac45e1b35a84f7dd16';

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}&plugin=AMap.ToolBar,AMap.Scale,AMap.OverView&callback=initAMap`;
      
      window.initAMap = () => {
        initMap();
      };

      // 监听脚本加载错误
      script.onerror = () => {
        console.error('高德地图脚本加载失败');
        setIsLoading(false);
        toast.error('地图加载失败，请检查网络连接和API密钥');
      };

      document.head.appendChild(script);
    };

    loadAMapScript();

    return () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.destroy();
        } catch {}
        mapInstance.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // 更新地图中心
  useEffect(() => {
    if (!mapReady) return;
    if (mapInstance.current) {
      if (mapInstance.current?.setCenter) {
        mapInstance.current.setCenter(mapConfig.center);
      }
      if (mapInstance.current?.setZoom) {
        mapInstance.current.setZoom(mapConfig.zoom);
      }
    }
  }, [mapConfig, mapReady]);

  // 点击“定位到我” - 将镜头移动到用户当前位置
  const handleLocateMe = async () => {
    if (isLocating) return;
    try {
      setIsLocating(true);
      setLocationStatus('正在获取您的当前位置...');
      const loc = await getCurrentLocation();
      const coords = toAMapCoordinate(loc);
      setCurrentLocation(coords);
      if (mapInstance.current?.setCenter) {
        mapInstance.current.setCenter(coords);
      }
      if (mapInstance.current?.setZoom) {
        mapInstance.current.setZoom(16);
      }
      // 反查地址并更新信息窗口交互
      let addr = '';
      try {
        addr = await amapService.reverseGeocode(coords[1], coords[0]) || '';
      } catch {}
      const existing = markersRef.current.get('current_location');
      if (existing && existing.setPosition) {
        existing.setPosition(coords);
        existing.setTitle(addr || '我的位置');
      } else if (window.AMap?.Marker) {
        const marker = new window.AMap.Marker({ position: coords, title: addr || '我的位置' });
        marker.setMap(mapInstance.current);
        // 悬浮与点击显示地址
        let hoverWin: any = null;
        marker.on('mouseover', () => {
          if (!window.AMap.InfoWindow) return;
          hoverWin = new window.AMap.InfoWindow({
            content: `<div style="padding:10px; min-width:220px;"><h3 style="margin:0 0 6px 0; color:#1d4999;">我的位置</h3>${addr ? `<p style=\"margin:4px 0;\">📍 ${addr}</p>` : ''}</div>`,
            offset: new window.AMap.Pixel(0, -32)
          });
          hoverWin.open(mapInstance.current, marker.getPosition());
        });
        marker.on('mouseout', () => {
          if (hoverWin) { hoverWin.close(); hoverWin = null; }
        });
        marker.on('click', () => {
          if (!window.AMap.InfoWindow) return;
          const infoWin = new window.AMap.InfoWindow({
            content: `<div style="padding:10px; min-width:240px;"><h3 style="margin:0 0 6px 0; color:#1d4999;">我的位置</h3>${addr ? `<p style=\"margin:4px 0;\">📍 ${addr}</p>` : ''}<p style="margin:4px 0; font-size:11px; color:#666;">(${coords[0].toFixed(6)}, ${coords[1].toFixed(6)})</p></div>`,
            offset: new window.AMap.Pixel(0, -32)
          });
          infoWin.open(mapInstance.current, marker.getPosition());
        });
        markersRef.current.set('current_location', marker);
      }
      toast.success('已定位到您的当前位置');
    } catch (err) {
      toast.error('定位失败，请稍后重试');
    } finally {
      setIsLocating(false);
      setLocationStatus('');
    }
  };

  // 更新标记点
  useEffect(() => {
    if (!mapInstance.current) return;

    // 移除与已删除点对应的点击标记（click_ 前缀）
    const pointIdSet = new Set(points.map(p => p.id));
    markersRef.current.forEach((marker, key) => {
      if (key.startsWith('click_')) {
        const id = key.replace('click_', '');
        if (!pointIdSet.has(id)) {
          mapInstance.current.remove(marker);
          markersRef.current.delete(key);
        }
      }
    });

    // 清除用户添加的标记（保留当前位置标记、点击标记和推荐结果标记）
    markersRef.current.forEach((marker, key) => {
      // 保留当前位置标记、点击标记与推荐结果标记
      if (!key.startsWith('current_location') && !key.startsWith('click_') && !key.startsWith('rec_')) {
        mapInstance.current.remove(marker);
        markersRef.current.delete(key);
      }
    });

    // 添加新标记（用户通过搜索或输入添加的位置点）
    points.forEach(point => {
      if (!window.AMap.Marker) return;
      
      // 检查是否已存在对应的点击标记
      const clickMarkerId = `click_${point.id}`;
      if (markersRef.current.has(clickMarkerId)) {
        return; // 跳过，因为点击标记已经存在
      }
      
      // 提取数字序号（从"位置1"、"位置2"等中提取数字）
      const match = point.name.match(/位置(\d+)/);
      const number = match ? parseInt(match[1]) : 1;
      
      const marker = new window.AMap.Marker({
        position: [point.lng, point.lat],
        title: point.name, // 使用store中已生成的正确名称
        icon: createNumberedIcon(number, '#FF6347'), // 使用带数字的红色图标
        offset: new window.AMap.Pixel(-18, -45)
      });

      // 添加右键删除功能
      marker.on('rightclick', () => {
        removePoint(point.id);
        // 同时删除对应的点击标记
        const clickMarkerId = `click_${point.id}`;
        const clickMarker = markersRef.current.get(clickMarkerId);
        if (clickMarker) {
          mapInstance.current.remove(clickMarker);
          markersRef.current.delete(clickMarkerId);
        }
      });

      let hoverInfoWindow2: any = null;
      marker.on('click', () => {
        if (!window.AMap.InfoWindow) return;
        const infoWindow = new window.AMap.InfoWindow({
          content: `
            <div style="padding: 10px; min-width: 220px;">
              <h3 style="margin: 0 0 6px 0; color: #FF6347;">${point.name || '位置点'}</h3>
              ${point.address ? `<p style="margin: 4px 0;">📍 ${point.address}</p>` : ''}
              <p style="margin: 4px 0; font-size: 11px; color: #666;">(${point.lng.toFixed(6)}, ${point.lat.toFixed(6)})</p>
            </div>
          `,
          offset: new window.AMap.Pixel(0, -32)
        });
        infoWindow.open(mapInstance.current, marker.getPosition());
        setSelectedOriginPoint(point);
        toast.success(`${point.name || '位置点'} 已设为出发点`);
      });

      marker.on('mouseover', () => {
        marker.setTop(true);
        if (!window.AMap.InfoWindow) return;
        hoverInfoWindow2 = new window.AMap.InfoWindow({
          content: `
            <div style="padding: 10px; min-width: 200px;">
              <h3 style="margin: 0 0 6px 0; color: #FF6347;">${point.name || '位置点'}</h3>
              ${point.address ? `<p style="margin: 4px 0;">📍 ${point.address}</p>` : ''}
            </div>
          `,
          offset: new window.AMap.Pixel(0, -32)
        });
        hoverInfoWindow2.open(mapInstance.current, marker.getPosition());
      });

      marker.on('mouseout', () => {
        marker.setTop(false);
        if (hoverInfoWindow2) {
          hoverInfoWindow2.close();
          hoverInfoWindow2 = null;
        }
      });

      marker.setMap(mapInstance.current);
      markersRef.current.set(point.id, marker);
    });
  }, [points]);

  // 更新推荐结果标记
  useEffect(() => {
    if (!mapInstance.current) return;

    // 清除所有已存在的推荐标记（为下一次重新生成做准备）
    markersRef.current.forEach((marker, key) => {
      if (key.startsWith('rec_')) {
        mapInstance.current.remove(marker);
        markersRef.current.delete(key);
      }
    });

    // 添加推荐标记
    recommendations.forEach((rec, index) => {
      if (!window.AMap.Marker) return;
      
      const isSelected = selectedRecommendation?.poi.id === rec.poi.id;
      
      const marker = new window.AMap.Marker({
        position: [rec.poi.location.lng, rec.poi.location.lat],
        title: `${index + 1}. ${rec.poi.name}`,
        icon: new window.AMap.Icon({
          size: new window.AMap.Size(isSelected ? 48 : 36, isSelected ? 60 : 45),
          image: `data:image/svg+xml;base64,${btoa(`
            <svg width="${isSelected ? 48 : 36}" height="${isSelected ? 60 : 45}" viewBox="0 0 ${isSelected ? 48 : 36} ${isSelected ? 60 : 45}" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="${isSelected ? 'M24 50C34.4934 50 44 41.6122 44 30C44 18.3878 34.4934 10 24 10C13.5066 10 4 18.3878 4 30C4 41.6122 13.5066 50 24 50Z' : 'M18 40C26.2843 35 32 27.5 32 18C32 8.5 26.2843 3 18 3C9.71573 3 4 8.5 4 18C4 27.5 9.71573 35 18 40Z'}" fill="#10B981" stroke="white" stroke-width="${isSelected ? 3 : 2}"/>
              <text x="${isSelected ? 24 : 18}" y="${isSelected ? 30 : 22}" text-anchor="middle" dy=".3em" fill="white" font-size="${isSelected ? 20 : 16}" font-weight="bold" font-family="Arial, sans-serif">
                ${index + 1}
              </text>
            </svg>
          `)}`,
          imageSize: new window.AMap.Size(isSelected ? 48 : 36, isSelected ? 60 : 45)
        }),
        offset: new window.AMap.Pixel(isSelected ? -24 : -18, isSelected ? -24 : -18),
        zIndex: isSelected ? 2000 : 500,
        animation: isSelected ? 'AMAP_ANIMATION_BOUNCE' : 'AMAP_ANIMATION_DROP'
      });

      let hoverInfoWindow: any = null;

      marker.on('click', () => {
        if (!window.AMap.InfoWindow) return;
        const infoWindow = new window.AMap.InfoWindow({
          content: `
            <div style="padding: 10px; min-width: 240px;">
              <h3 style="margin: 0 0 6px 0; color: #10B981;">${rec.poi.name}</h3>
              ${rec.poi.address ? `<p style="margin: 4px 0;">📍 <strong>地址:</strong> ${rec.poi.address}</p>` : ''}
              <div style="margin: 4px 0; display: flex; align-items: center;">
                <span style="margin-right: 6px;"><strong>评分:</strong></span>
                <div style="display: flex; align-items: center;">
                  ${generateStarRating(rec.poi.rating || 0, 'small')}
                  <span style="margin-left: 4px; font-size: 11px; color: #666;">${rec.poi.rating ? rec.poi.rating.toFixed(1) : '暂无'}</span>
                </div>
              </div>
              ${typeof rec.poi.distance === 'number' ? `<p style="margin: 4px 0;">📏 <strong>距离:</strong> ${(rec.poi.distance/1000).toFixed(2)} km</p>` : ''}
            </div>
          `,
          offset: new window.AMap.Pixel(0, -32)
        });
        infoWindow.open(mapInstance.current, marker.getPosition());
      });

      marker.on('mouseover', () => {
        marker.setTop(true);
        if (!window.AMap.InfoWindow) return;
        hoverInfoWindow = new window.AMap.InfoWindow({
          content: `
            <div style="padding: 10px; min-width: 220px;">
              <h3 style="margin: 0 0 6px 0; color: #10B981;">${rec.poi.name}</h3>
              ${rec.poi.address ? `<p style="margin: 4px 0;">📍 ${rec.poi.address}</p>` : ''}
              <div style="margin: 4px 0; display: flex; align-items: center;">
                ${generateStarRating(rec.poi.rating || 0, 'small')}
                <span style="margin-left: 4px; font-size: 11px; color: #666;">${rec.poi.rating ? rec.poi.rating.toFixed(1) : '暂无'}</span>
              </div>
            </div>
          `,
          offset: new window.AMap.Pixel(0, -32)
        });
        hoverInfoWindow.open(mapInstance.current, marker.getPosition());
      });

      marker.on('mouseout', () => {
        marker.setTop(false);
        if (hoverInfoWindow) {
          hoverInfoWindow.close();
          hoverInfoWindow = null;
        }
      });

      marker.setMap(mapInstance.current);
      markersRef.current.set(`rec_${rec.poi.id}`, marker);
    });

    // 如果有选中的推荐，自动显示其信息窗口并确保它在视野中心
    if (selectedRecommendation) {
      const selectedMarker = markersRef.current.get(`rec_${selectedRecommendation.poi.id}`);
      if (selectedMarker) {
        // 先设置地图中心到选中的推荐位置
        mapInstance.current.setCenter([selectedRecommendation.poi.location.lng, selectedRecommendation.poi.location.lat]);
      }
    }
  }, [recommendations, selectedRecommendation]);

  // 更新路线
  useEffect(() => {
    if (!mapInstance.current) return;

    // 清除现有路线
    routesRef.current.forEach(route => {
      mapInstance.current.remove(route);
    });
    routesRef.current.clear();

    

    if (routeAnimRef.current.timer) {
      clearInterval(routeAnimRef.current.timer);
      routeAnimRef.current.timer = null;
    }
    if (routeAnimRef.current.marker) {
      mapInstance.current.remove(routeAnimRef.current.marker);
      routeAnimRef.current.marker = null;
    }
    if (routeAnimRef.current.polyline) {
      mapInstance.current.remove(routeAnimRef.current.polyline);
      routeAnimRef.current.polyline = null;
    }

    if (selectedRecommendation) {
      const dest = [selectedRecommendation.poi.location.lng, selectedRecommendation.poi.location.lat];
      let origin: [number, number] | null = null;
      if (selectedOriginPoint) {
        origin = [selectedOriginPoint.lng, selectedOriginPoint.lat];
      } else if (points.length > 0) {
        origin = [points[0].lng, points[0].lat];
      } else if (mapConfig.center) {
        origin = [mapConfig.center[0], mapConfig.center[1]];
      }

      let path: any[] = [];
      const primaryRoute = selectedRecommendation.routes.find(r => r.polyline);
      if (primaryRoute && window.AMap.Util) {
        path = window.AMap.Util.decodePath(primaryRoute.polyline) || [];
      }
      if (!path || path.length === 0) {
        if (origin) {
          path = [new window.AMap.LngLat(origin[0], origin[1]), new window.AMap.LngLat(dest[0], dest[1])];
        } else {
          path = [new window.AMap.LngLat(dest[0], dest[1])];
        }
      }

      setRouteStatus({ show: false });
    }
  }, [selectedRecommendation]);

  return (
    <div className={`w-full h-full ${className} relative`} style={{ minHeight: '300px' }}>
      <MapStatusIndicator onSettingsClick={onSettingsClick || (() => {})} />
      <div 
        ref={mapRef} 
        className="w-full h-full"
      />
      
      {/* 地图图例与定位按钮（按钮在图例上方） */}
      {!isLoading && <MapLegend onLocateMe={handleLocateMe} isLocating={isLocating} />}

      {/* 地图左侧浮动位置输入 */}
      {!isLoading && <LocationInput />}

      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center px-4 sm:px-6">
            <div className="text-xl sm:text-2xl mb-2 sm:mb-3">🗺️</div>
            <h3 className="text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">地图加载中...</h3>
            <div className="text-xs sm:text-sm text-blue-600 mb-2 sm:mb-3">{locationStatus}</div>
            
            {/* 简单加载动画 */}
            <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-3 sm:mb-4">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            
            {/* 简要帮助信息 */}
            <div className="text-xs text-gray-500 max-w-xs">
              <p>正在获取您的位置信息...</p>
              <p className="mt-1">如果长时间未加载，请检查网络连接</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 高德地图类型声明
declare global {
  interface Window {
    AMap: any;
    initAMap: () => void;
  }
}
