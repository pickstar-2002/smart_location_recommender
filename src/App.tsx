import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AMapComponent } from '@/components/AMapComponent';
import { LocationInput } from '@/components/LocationInput';
import { SearchPanel } from '@/components/SearchPanel';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { Toaster } from '@/components/Toast';
import { OnboardingWizard } from '@/components/OnboardingWizard';

// 主应用组件
function App() {
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchPanelCollapsed, setSearchPanelCollapsed] = useState(false);

  // 检查是否需要显示新手引导
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    // 只有在自动显示的情况下才设置存储标记
    const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');
    if (!hasSeenOnboarding) {
      localStorage.setItem('has_seen_onboarding', 'true');
    }
    setShowOnboarding(false);
  };

  const handleShowOnboarding = () => {
    setShowOnboarding(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onApiKeyClick={() => setShowApiKeyModal(true)} onShowOnboarding={handleShowOnboarding} />
      
      {/* 响应式布局容器 */}
      <div className="w-full h-[calc(100vh-4rem)]">
        {/* 移动端：上下布局，桌面端：左右布局 */}
        <div className="flex flex-col lg:flex-row h-full">
          {/* 地图区域 */}
          <div className="flex-1 relative order-1 lg:order-1 min-h-[300px] lg:min-h-0">
            <div className="h-full w-full bg-white shadow-md overflow-hidden">
              <AMapComponent onSettingsClick={() => setShowApiKeyModal(true)} />
              {/* 位置输入组件 - 浮动在地图左上角 */}
              <div className="absolute top-0 left-0 z-50 pointer-events-none">
                <div className="pointer-events-auto">
                  <LocationInput />
                </div>
              </div>
              {searchPanelCollapsed && (
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 pointer-events-none">
                  <div className="pointer-events-auto">
                    <button
                      onClick={() => setSearchPanelCollapsed(false)}
                      className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-all"
                      title="展开位置搜索"
                    >
                      <img src="/favicon.png" alt="search" className="w-4 h-4" />
                      <span className="text-xs sm:text-sm text-gray-700 hidden sm:inline">位置搜索</span>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500">
                        <path d="m9 18 6-6-6-6"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 控制面板区域 */}
          {!searchPanelCollapsed && (
            <div className="w-full lg:w-96 xl:w-[28rem] bg-white border-l-0 lg:border-l border-gray-200 shadow-lg order-2 lg:order-2 max-h-[50vh] lg:max-h-none">
              <div className="h-full flex flex-col">
                {/* 搜索面板区域 - 可滚动 */}
                <div className="flex-1 overflow-y-auto">
                  <SearchPanel className="shadow-none border-0" onCollapse={() => setSearchPanelCollapsed(true)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      

      {/* API密钥设置模态框 */}
      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)} 
      />

      {/* 新手引导 */}
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}

      {/* Toast提示 */}
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
