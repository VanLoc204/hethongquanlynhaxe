import React from 'react';

const StatCard = ({ label, value, trend, colorClass }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}></div>
      <div className="stat-info">
        <h3>{label}</h3>
        <p className="stat-value">{value}</p>
        {trend && <span className="stat-trend positive">{trend}</span>}
      </div>
    </div>
  );
};

export default StatCard;
