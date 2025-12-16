import { Crosshair } from 'lucide-react';

export const MapLegend = ({ onLocateMe, isLocating }: { onLocateMe?: () => void; isLocating?: boolean }) => {
  return (
    <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-50">
      {/* 定位按钮在图例上方 */}
      <div className="mb-2 sm:mb-3">
        <button
          onClick={onLocateMe}
          disabled={isLocating}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/95 backdrop-blur rounded-full shadow-md border border-gray-200 hover:shadow-lg disabled:bg-gray-200 disabled:text-gray-400"
          title="定位到我的位置"
        >
          {isLocating ? (
            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700"></span>
          ) : (
            <Crosshair className="w-3 h-3 text-gray-700" />
          )}
          <span className="hidden sm:inline">定位到我</span>
        </button>
      </div>

      <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 px-2 sm:px-3 py-1 sm:py-2">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <svg width="14" height="18" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-4 sm:h-5">
              <path d="M8 18C11.6667 16 14.6667 12.6667 15.5 8C14.6667 3.33333 11.6667 0 8 0C4.33333 0 1.33333 3.33333 0.5 8C1.33333 12.6667 4.33333 16 8 18Z" fill="#1B67FF" stroke="white" strokeWidth="1"/>
              <circle cx="8" cy="8" r="3" fill="white"/>
            </svg>
            <span className="text-xs text-gray-700 font-medium hidden sm:inline">您的当前位置</span>
            <span className="text-xs text-gray-700 font-medium sm:hidden">当前位置</span>
          </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <svg width="14" height="18" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-4 sm:h-5">
            <path d="M8 18C11.6667 16 14.6667 12.6667 15.5 8C14.6667 3.33333 11.6667 0 8 0C4.33333 0 1.33333 3.33333 0.5 8C1.33333 12.6667 4.33333 16 8 18Z" fill="#FF6347" stroke="white" strokeWidth="1"/>
            <text x="8" y="9" textAnchor="middle" dy=".1em" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">1</text>
          </svg>
          <span className="text-xs text-gray-700 font-medium hidden sm:inline">点击位置/用户点</span>
          <span className="text-xs text-gray-700 font-medium sm:hidden">用户点</span>
        </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <svg width="14" height="18" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-4 sm:h-5">
              <path d="M8 18C11.6667 16 14.6667 12.6667 15.5 8C14.6667 3.33333 11.6667 0 8 0C4.33333 0 1.33333 3.33333 0.5 8C1.33333 12.6667 4.33333 16 8 18Z" fill="#10B981" stroke="white" strokeWidth="1"/>
              <text x="8" y="9" textAnchor="middle" dy=".1em" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">1</text>
            </svg>
            <span className="text-xs text-gray-700 font-medium">推荐地点</span>
        </div>
        </div>
      </div>
    </div>
  );
};