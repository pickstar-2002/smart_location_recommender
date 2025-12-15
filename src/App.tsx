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
            </div>
          </div>
          
          {/* 控制面板区域 */}
          <div className="w-full lg:w-96 xl:w-[28rem] bg-white border-l-0 lg:border-l border-gray-200 shadow-lg order-2 lg:order-2 max-h-[50vh] lg:max-h-none">
            <div className="h-full flex flex-col">
              {/* 位置输入区域 */}
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <LocationInput />
              </div>
              
              {/* 搜索面板区域 - 可滚动 */}
              <div className="flex-1 overflow-y-auto">
                <SearchPanel className="shadow-none border-0" />
              </div>
            </div>
          </div>
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
