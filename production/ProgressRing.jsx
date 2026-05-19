import React from 'react';

export default function ProgressRing({ percentage = 0, size = 80, strokeWidth = 6, className = '' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 100) return 'hsl(142, 60%, 45%)';
    if (percentage >= 60) return 'hsl(45, 80%, 55%)';
    if (percentage > 0) return 'hsl(25, 60%, 48%)';
    return 'hsl(30, 15%, 75%)';
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(30, 15%, 90%)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-foreground">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}