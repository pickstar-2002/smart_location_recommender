/**
 * 地理定位工具函数
 */

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * 获取当前位置（带备用方案）
 * @param options 定位选项
 * @returns 位置信息
 */
export const getCurrentLocation = (
  options: PositionOptions = {
    enableHighAccuracy: false, // 改为false以提高成功率
    timeout: 8000, // 减少超时时间到8秒
    maximumAge: 300000 // 5分钟内缓存
  }
): Promise<GeoLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.warn('浏览器不支持地理定位API');
      reject(new Error('浏览器不支持地理定位'));
      return;
    }

    console.log('开始获取当前位置...');
    console.log('定位选项:', options);

    // 首先尝试高精度定位
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('成功获取位置:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        console.warn('高精度定位失败，尝试低精度定位:', error);
        
        // 如果高精度失败，尝试低精度定位
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('低精度定位成功:', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (lowPrecisionError) => {
            let errorMessage = '获取位置失败';
            console.warn('低精度定位也失败:', lowPrecisionError);
            switch (lowPrecisionError.code) {
              case lowPrecisionError.PERMISSION_DENIED:
                errorMessage = '用户拒绝了地理定位请求，请检查浏览器权限设置';
                console.warn('用户拒绝了地理定位权限');
                break;
              case lowPrecisionError.POSITION_UNAVAILABLE:
                errorMessage = '位置信息不可用，可能是网络或GPS问题';
                console.warn('位置信息不可用');
                break;
              case lowPrecisionError.TIMEOUT:
                errorMessage = '获取位置超时，请检查网络连接或尝试刷新页面';
                console.warn('获取位置超时');
                break;
              default:
                errorMessage = '获取位置时发生未知错误';
                console.warn('未知错误:', lowPrecisionError);
            }
            reject(new Error(errorMessage));
          },
          {
            enableHighAccuracy: false, // 低精度
            timeout: 5000, // 5秒超时
            maximumAge: 300000 // 5分钟缓存
          }
        );
      },
      options
    );
  });
};

/**
 * 检查地理定位权限状态
 * @returns 权限状态
 */
export const checkGeolocationPermission = async (): Promise<PermissionState | 'unsupported'> => {
  if (!navigator.permissions) {
    return 'unsupported';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch (error) {
    return 'unsupported';
  }
};

/**
 * 请求地理定位权限
 * @returns 是否获得权限
 */
export const requestGeolocationPermission = async (): Promise<boolean> => {
  try {
    await getCurrentLocation({ timeout: 5000 });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 通过IP获取位置（兜底方案）
 * @returns 位置信息
 */
export const getLocationByIP = async (): Promise<GeoLocation> => {
  console.log('尝试通过IP获取位置...');
  
  // 使用多个IP定位服务，提高成功率
  const ipServices = [
    {
      url: 'https://ipapi.co/json/',
      parser: (data: any) => {
        if (data.latitude && data.longitude) {
          return {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude)
          };
        }
        if (data.loc) {
          // ipapi.co 格式: "lat,lng"
          const [latitude, longitude] = data.loc.split(',');
          return {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          };
        }
        return null;
      }
    },
    {
      url: 'https://ipwho.is/',
      parser: (data: any) => {
        if (data.success && data.latitude && data.longitude) {
          return {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude)
          };
        }
        return null;
      }
    },
    {
      url: 'https://freegeoip.app/json/',
      parser: (data: any) => {
        if (data.latitude && data.longitude) {
          return {
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude)
          };
        }
        return null;
      }
    },
    // 添加一个更简单的兜底服务
    {
      url: 'http://ip-api.com/json/',
      parser: (data: any) => {
        if (data.status === 'success' && data.lat && data.lon) {
          return {
            latitude: parseFloat(data.lat),
            longitude: parseFloat(data.lon)
          };
        }
        return null;
      }
    }
  ];
  
  for (const service of ipServices) {
    try {
      console.log(`尝试IP服务: ${service.url}`);
      
      // 使用更简单的fetch，避免timeout参数兼容性问题
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时
      
      const response = await fetch(service.url, { 
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SmartLocationApp/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`${service.url} 返回数据:`, data);
      
      // 使用服务特定的解析器
      const location = service.parser(data);
      
      if (location && !isNaN(location.latitude) && !isNaN(location.longitude)) {
        console.log(`IP定位成功: ${location.latitude}, ${location.longitude}`);
        return {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 50000 // IP定位精度较低，约50公里
        };
      }
      
      throw new Error('无法从该IP服务获取有效坐标');
    } catch (error) {
      console.warn(`IP服务 ${service.url} 失败:`, error);
      continue;
    }
  }
  
  // 如果所有服务都失败，返回一个中国中心位置的默认值
  console.warn('所有IP定位服务都失败了，返回中国中心位置');
  return {
    latitude: 35.0, // 中国中心纬度
    longitude: 105.0, // 中国中心经度
    accuracy: 100000 // 100公里精度
  };
};

/**
 * 将地理坐标转换为高德地图坐标格式
 * @param location 位置信息
 * @returns 高德地图坐标 [经度, 纬度]
 */
export const toAMapCoordinate = (location: GeoLocation): [number, number] => {
  return [location.longitude, location.latitude];
};