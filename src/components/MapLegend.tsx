export const MapLegend = () => {
  return (
    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 px-3 py-2 z-50">
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 18C11.6667 16 14.6667 12.6667 15.5 8C14.6667 3.33333 11.6667 0 8 0C4.33333 0 1.33333 3.33333 0.5 8C1.33333 12.6667 4.33333 16 8 18Z" fill="#1B67FF" stroke="white" strokeWidth="1"/>
            <circle cx="8" cy="8" r="3" fill="white"/>
          </svg>
          <span className="text-xs text-gray-700 font-medium">您的当前位置</span>
        </div>

        <div className="flex items-center space-x-3">
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 18C11.6667 16 14.6667 12.6667 15.5 8C14.6667 3.33333 11.6667 0 8 0C4.33333 0 1.33333 3.33333 0.5 8C1.33333 12.6667 4.33333 16 8 18Z" fill="#FF6347" stroke="white" strokeWidth="1"/>
            <text x="8" y="9" textAnchor="middle" dy=".1em" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">1</text>
          </svg>
          <span className="text-xs text-gray-700 font-medium">点击位置/用户点</span>
        </div>

        <div className="flex items-center space-x-3">
          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 18C11.6667 16 14.6667 12.6667 15.5 8C14.6667 3.33333 11.6667 0 8 0C4.33333 0 1.33333 3.33333 0.5 8C1.33333 12.6667 4.33333 16 8 18Z" fill="#10B981" stroke="white" strokeWidth="1"/>
            <text x="8" y="9" textAnchor="middle" dy=".1em" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">1</text>
          </svg>
          <span className="text-xs text-gray-700 font-medium">推荐地点</span>
        </div>
      </div>
    </div>
  );
};