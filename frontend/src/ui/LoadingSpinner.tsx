interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'orange' | 'white';
}

export default function LoadingSpinner({ size = 'md', color = 'purple' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    purple: 'border-purple-500',
    orange: 'border-orange-500',
    white: 'border-white'
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-transparent ${colorClasses[color]} border-t-transparent`}>
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-transparent border-opacity-25 ${colorClasses[color]}`}></div>
    </div>
  );
}