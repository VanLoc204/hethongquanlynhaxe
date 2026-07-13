import React from 'react';

const StatCard = ({ label, value, trend, colorClass }) => {
  // Map color class to specific stroke and gradient fill colors for the SVG sparkline
  let strokeColor = '#3f6ad8'; // blue
  let fillColor = 'rgba(63, 106, 216, 0.08)';
  if (colorClass === 'red' || colorClass === 'danger') {
    strokeColor = '#d9534f';
    fillColor = 'rgba(217, 83, 79, 0.08)';
  } else if (colorClass === 'green' || colorClass === 'success') {
    strokeColor = '#5cb85c';
    fillColor = 'rgba(92, 184, 92, 0.08)';
  } else if (colorClass === 'yellow' || colorClass === 'warning') {
    strokeColor = '#f0ad4e';
    fillColor = 'rgba(240, 173, 78, 0.08)';
  } else if (colorClass === 'purple' || colorClass === 'accent') {
    strokeColor = '#7b73c4';
    fillColor = 'rgba(123, 115, 196, 0.08)';
  }

  // Determine trend text style class
  const isNegative = trend && (trend.includes('-') || trend.includes('giảm'));
  const trendClass = isNegative ? 'trend-negative' : 'trend-positive';

  return (
    <div className="stat-card-concept">
      <div className="stat-card-top">
        <div className="stat-card-details">
          <span className="stat-card-label">{label}</span>
          <h2 className="stat-card-value">{value}</h2>
        </div>
        {trend && (
          <span className={`stat-card-trend-badge ${trendClass}`}>
            {isNegative ? '▼' : '▲'} {trend}
          </span>
        )}
      </div>
      
      {/* Decorative SVG Sparkline Graph */}
      <div className="stat-card-sparkline">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="sparkline-svg">
          <defs>
            <linearGradient id={`grad-${colorClass}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d="M0,22 Q15,8 30,25 T60,12 T90,20 L100,18 L100,30 L0,30 Z"
            fill={`url(#grad-${colorClass})`}
          />
          <path
            d="M0,22 Q15,8 30,25 T60,12 T90,20 L100,18"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default StatCard;
