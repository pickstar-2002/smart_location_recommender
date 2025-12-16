import { useState } from 'react';
import { Settings, CircleHelp } from 'lucide-react';
import qwenLogo from '@/assets/qwen-color.svg';
import deepseekLogo from '@/assets/deepseek-color.svg';
import minimaxLogo from '@/assets/minimax-color.svg';
import zhipuLogo from '@/assets/zhipu-color.svg';

interface AIModelSelectorProps {
  currentModel:
    | 'qwen'
    | 'deepseek-v3.2'
    | 'deepseek-v3.1'
    | 'deepseek-r1-0528'
    | 'minimax-m1-80k'
    | 'qwen-coder-480b'
    | 'qwen-vl-235b'
    | 'glm-4.6v';
  onModelChange: (
    model:
      | 'qwen'
      | 'deepseek-v3.2'
      | 'deepseek-v3.1'
      | 'deepseek-r1-0528'
      | 'minimax-m1-80k'
      | 'qwen-coder-480b'
      | 'qwen-vl-235b'
      | 'glm-4.6v'
  ) => void;
}

// AI模型选择器组件
export const AIModelSelector = ({ currentModel, onModelChange }: AIModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const models: Array<{
    id:
      | 'qwen'
      | 'deepseek-v3.2'
      | 'deepseek-v3.1'
      | 'deepseek-r1-0528'
      | 'minimax-m1-80k'
      | 'qwen-coder-480b'
      | 'qwen-vl-235b'
      | 'glm-4.6v';
    name: string;
    description: string;
    logo?: string;
    color: string;
  }> = [
    { id: 'qwen', name: '通义千问', description: '中文文案生成', logo: qwenLogo, color: 'text-blue-600' },
    { id: 'qwen-coder-480b', name: 'Qwen Coder 480B', description: '代码理解与生成', logo: qwenLogo, color: 'text-blue-600' },
    { id: 'qwen-vl-235b', name: 'Qwen VL 235B', description: '多模态文本图像', logo: qwenLogo, color: 'text-blue-600' },
    { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', description: '支持中文与推理', logo: deepseekLogo, color: 'text-purple-600' },
    { id: 'deepseek-v3.1', name: 'DeepSeek V3.1', description: '通用对话与生成', logo: deepseekLogo, color: 'text-purple-600' },
    { id: 'deepseek-r1-0528', name: 'DeepSeek R1-0528', description: '思维链与深度推理', logo: deepseekLogo, color: 'text-purple-600' },
    { id: 'minimax-m1-80k', name: 'MiniMax M1-80k', description: '80k上下文窗口', logo: minimaxLogo, color: 'text-rose-600' },
    { id: 'glm-4.6v', name: 'GLM-4.6V', description: '多模态与中文能力', logo: zhipuLogo, color: 'text-sky-600' }
  ];

  const currentModelInfo = models.find(m => m.id === currentModel);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-200 transition-colors"
      >
        {currentModelInfo?.logo ? (
          <img src={currentModelInfo.logo} alt="logo" className="w-4 h-4" />
        ) : (
          <span className={`w-4 h-4 inline-flex items-center justify-center rounded-sm ${currentModelInfo?.color}`}>AI</span>
        )}
        <span>AI模型:</span>
        <span className={`font-medium ${currentModelInfo?.color}`}>{currentModelInfo?.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50" onMouseLeave={() => setIsOpen(false)}>
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-medium text-gray-800 flex items-center">
              <CircleHelp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              AI在本项目中的角色
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-gray-700">
              <li>• 解析用户意图（距离、预算、人数）并生成约束</li>
              <li>• 扩展搜索词并展示，原始完整词优先、品牌优先</li>
              <li>• 智能排序加权（完整短语匹配、交通时间综合）</li>
              <li>• 为每条推荐生成约100字综合推荐理由（后台串行）</li>
              <li>• 天气/时段信息融合到理由文案中</li>
              <li>• 生成更多时避免重复并平滑追加到列表</li>
            </ul>
          </div>
          
          <div className="p-2">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  currentModel === model.id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {model.logo ? (
                    <img src={model.logo} alt="logo" className="w-4 h-4" />
                  ) : (
                    <span className={`w-4 h-4 inline-flex items-center justify-center rounded-sm ${model.color}`}>AI</span>
                  )}
                  <div>
                    <div className="font-medium text-gray-800">{model.name}</div>
                    <div className="text-xs text-gray-600">{model.description}</div>
                  </div>
                </div>
                {currentModel === model.id && (
                  <div className="text-xs text-blue-600 mt-1">当前使用</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};