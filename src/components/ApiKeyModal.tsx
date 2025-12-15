import { useState } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// API密钥设置模态框
export const ApiKeyModal = ({ isOpen, onClose }: ApiKeyModalProps) => {
  const [modelscopeKey] = useState('ms-85ed98e9-1a8e-41e5-8215-ee563559d069');
  const [showModelscopeKey, setShowModelscopeKey] = useState(false);

  const [customModelscopeKey, setCustomModelscopeKey] = useState('');
  const handleSave = () => {
    if (customModelscopeKey.trim()) {
      localStorage.setItem('modelscope_api_key', customModelscopeKey.trim());
      toast.success('自定义AI密钥已保存');
    } else {
      toast.info('使用默认AI密钥');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Key className="w-5 h-5 mr-2" />
            API密钥设置
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 移除高德地图密钥配置：默认使用内置，无需展示 */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ModelScope AI密钥（默认使用内置，可选填自定义）
            </label>
            <div className="relative">
              <input
                type={showModelscopeKey ? 'text' : 'password'}
                value={customModelscopeKey}
                onChange={(e) => setCustomModelscopeKey(e.target.value)}
                placeholder="可选：输入你自己的 ModelScope AI 密钥"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowModelscopeKey(!showModelscopeKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                title={showModelscopeKey ? '隐藏' : '显示'}
              >
                {showModelscopeKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              默认使用内置密钥；如需使用你的密钥，可在此填写
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};