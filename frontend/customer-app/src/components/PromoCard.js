import React from 'react';

const PromoCard = ({ image, title, desc }) => {
  return (
    <div className="promo-card animate-fade-in">
      <img src={image} alt={title} className="promo-image" />
      <div className="promo-content">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
    </div>
  );
};

export default PromoCard;
