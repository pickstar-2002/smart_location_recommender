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
      
      {/* 全屏大屏布局 - 移除max-width限制和padding */}
      <div className="w-full">
        {/* 第一行：地图占满全宽，高度自适应屏幕 */}
        <div className="w-full mb-0">
          <div className="bg-white shadow-md overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
            <AMapComponent onSettingsClick={() => setShowApiKeyModal(true)} />
          </div>
        </div>
        
        {/* 第二行：控制面板，全宽背景 */}
        <div className="w-full bg-gray-50 border-t border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
              {/* 位置搜索控制面板 */}
              <div className="col-span-1">
                <SearchPanel />
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
