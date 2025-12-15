import { useState, useEffect } from 'react';

interface LoadingProgressProps {
  duration?: number; // 预计加载时间（毫秒）
  onComplete?: () => void;
}

// 获取基于历史数据的推荐加载时间
const getRecommendedDuration = (): number => {
  try {
    const loadTimes = JSON.parse(localStorage.getItem('map_load_times') || '[]');
    if (loadTimes.length > 0) {
      const avgTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      // 取平均时间的1.2倍作为进度条总时长，给一些缓冲
      return Math.max(avgTime * 1.2, 2000); // 最少2秒
    }
  } catch (error) {
    console.warn('无法读取历史加载时间:', error);
  }
  return 4000; // 默认4秒
};

// 动态进度条组件
export const LoadingProgress = ({ duration, onComplete }: LoadingProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [actualDuration, setActualDuration] = useState(duration || getRecommendedDuration());

  useEffect(() => {
    // 如果没有指定duration，使用推荐的时长
    if (!duration) {
      setActualDuration(getRecommendedDuration());
    }
  }, [duration]);

  useEffect(() => {
    let startTime = Date.now();
    let animationFrame: number;
    let lastProgress = 0;

    // 使用缓动函数让进度更自然
    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / actualDuration, 1);
      const easedProgress = easeOutCubic(rawProgress);
      const newProgress = Math.min(easedProgress * 95, 95); // 最大到95%，留出缓冲
      
      // 只有当进度有显著变化时才更新，避免频繁重渲染
      if (Math.abs(newProgress - lastProgress) > 0.5) {
        setProgress(newProgress);
        lastProgress = newProgress;
      }

      if (rawProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        if (onComplete) {
          onComplete();
        }
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [actualDuration, onComplete]);

  // 完成加载时的动画 - 外部可以调用这个函数来快速完成
  const completeLoading = () => {
    setProgress(100);
    setIsAnimating(false);
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 300);
  };

  // 将completeLoading函数暴露给父组件
  useEffect(() => {
    (window as any).completeMapLoading = completeLoading;
    return () => {
      delete (window as any).completeMapLoading;
    };
  }, [onComplete]);

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block text-blue-600">
              加载进度
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-blue-600">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
          <div
            style={{ width: `${progress}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-300 ease-out"
          />
        </div>
        {isAnimating && (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {!isAnimating && progress >= 95 && (
          <div className="text-center text-xs text-green-600 font-medium">
            即将完成...
          </div>
        )}
      </div>
    </div>
  );
};