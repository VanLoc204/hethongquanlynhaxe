import React from 'react';

const RouteCard = ({ bgImage, title, routes }) => {
  return (
    <div className="route-card animate-fade-in">
      <div className="route-header" style={{ backgroundImage: `url(${bgImage})` }}>
        <div className="route-overlay">
          <h3>{title}</h3>
        </div>
      </div>
      <div className="route-list">
        {routes.map((route, idx) => (
          <div key={idx} className="route-item">
            <span className="route-name">Đến {route.dest}</span>
            <div className="route-details">
              <span className="route-price">{route.price}</span>
              <div className="route-meta">{route.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteCard;
