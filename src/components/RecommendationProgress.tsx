import React from 'react';
import { Loader2, MapPin, Search, Route, Brain, CheckCircle } from 'lucide-react';

export interface ProgressStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  details?: string[];
  duration?: number;
}

interface RecommendationProgressProps {
  steps: ProgressStep[];
  currentStep: number;
  onCancel?: () => void;
}

const RecommendationProgress: React.FC<RecommendationProgressProps> = ({ 
  steps, 
  currentStep, 
  onCancel 
}) => {
  const getStepIcon = (step: ProgressStep, index: number) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (step.status === 'running') {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    } else if (step.status === 'error') {
      return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
        <span className="text-white text-xs">!</span>
      </div>;
    } else {
      return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getStepContent = (step: ProgressStep) => {
    if (step.status === 'running' && step.details && step.details.length > 0) {
      return (
        <div className="mt-2 space-y-1">
          {step.details.map((detail, index) => (
            <div key={index} className="text-sm text-gray-600 flex items-start">
              <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0" />
              <span>{detail}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800">智能推荐进行中</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {getStepIcon(step, index)}
              </div>
              <div className="ml-3 sm:ml-4 flex-1">
                <div className="flex items-center flex-wrap gap-1">
                  <h4 className={`text-sm font-medium ${
                    step.status === 'running' 
                      ? 'text-blue-600' 
                      : step.status === 'completed'
                      ? 'text-green-600'
                      : step.status === 'error'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}>
                    {step.title}
                  </h4>
                  {step.duration && step.status === 'completed' && (
                    <span className="ml-1 sm:ml-2 text-xs text-gray-400">
                      {step.duration}ms
                    </span>
                  )}
                </div>
                <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 ${
                  step.status === 'running' 
                    ? 'text-blue-500' 
                    : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
                {getStepContent(step)}
              </div>
            </div>
            
            {/* 连接线 */}
            {index < steps.length - 1 && (
              <div className="absolute left-2 sm:left-2.5 top-6 sm:top-8 w-0.5 h-6 sm:h-8 bg-gray-200" />
            )}
          </div>
        ))}
      </div>

      
    </div>
  );
};

export default RecommendationProgress;