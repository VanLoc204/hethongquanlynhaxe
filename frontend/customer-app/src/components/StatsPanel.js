import React from 'react';
import { Users, Award, Bus } from 'lucide-react';

const StatsPanel = () => {
  return (
    <div className="stats-container">
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-icon-box">
            <Users size={28} />
          </div>
          <div>
            <div className="stat-number">Hơn 40 triệu</div>
            <div className="stat-label">Lượt khách phục vụ cả nước</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon-box">
            <Award size={28} />
          </div>
          <div>
            <div className="stat-number">Hơn 350</div>
            <div className="stat-label">Phòng vé, bưu cục toàn hệ thống</div>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon-box">
            <Bus size={28} />
          </div>
          <div>
            <div className="stat-number">Hơn 6.500</div>
            <div className="stat-label">Chuyến xe lăn bánh mỗi ngày</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
