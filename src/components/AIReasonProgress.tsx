import { Loader2 } from 'lucide-react';

interface AIReasonProgressProps {
  current: number;
  total: number;
  currentPlace: string;
  isVisible: boolean;
}

// AI推荐理由生成进度组件
export const AIReasonProgress = ({ current, total, currentPlace, isVisible }: AIReasonProgressProps) => {
  if (!isVisible || total === 0) return null;
  
  const progress = (current / total) * 100;
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px]">
      <div className="flex items-center gap-3 mb-3">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <div>
          <h4 className="font-medium text-gray-800 flex items-center">
            <span>AI查询位置中</span>
            <span className="ml-1 inline-flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </h4>
          <p className="text-xs text-gray-600">{current}/{total} 个地点</p>
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* 当前处理的地点 */}
      {currentPlace && (
        <div className="text-sm text-gray-700">
          <span className="text-gray-500">当前：</span>
          <span className="font-medium truncate block">{currentPlace}</span>
        </div>
      )}
      
      {/* 完成提示 */}
      {current === total && total > 0 && (
        <div className="mt-2 text-xs text-green-600 font-medium">
          ✨ 推荐理由生成完成！
        </div>
      )}
      
      {/* 下一个即将生成提示 */}
      {current < total && currentPlace && (
        <div className="mt-2 text-xs text-blue-600">
          📋 下一个: {currentPlace}
        </div>
      )}
    </div>
  );
};