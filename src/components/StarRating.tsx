import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  score: number; // 0-100的分数
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const StarRating = ({ score, size = 'md', showScore = false }: StarRatingProps) => {
  // 将0-100分转换为0-5星
  const starRating = Math.max(0.5, Math.min(5, (score / 100) * 5));
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(starRating);
    const hasHalfStar = starRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    // 满星
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star 
          key={`full-${i}`} 
          className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
        />
      );
    }
    
    // 半星
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star className={`${sizeClasses[size]} text-gray-300`} />
          <StarHalf className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400 absolute top-0 left-0`} />
        </div>
      );
    }
    
    // 空星
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star 
          key={`empty-${i}`} 
          className={`${sizeClasses[size]} text-gray-300`}
        />
      );
    }
    
    return stars;
  };
  
  return (
    <div className="flex items-center space-x-1">
      {renderStars()}
      {showScore && (
        <span className={`ml-2 text-gray-600 ${
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        }`}>
          {score.toFixed(0)}分
        </span>
      )}
    </div>
  );
};