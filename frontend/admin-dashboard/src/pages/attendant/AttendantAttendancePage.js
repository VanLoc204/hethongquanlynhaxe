import React from 'react';

const AttendantAttendancePage = () => {
  return (
    <section className="panel" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
        <h2 style={{ marginBottom: '10px' }}>Chức Năng Chấm Công Số (Nhân Viên Phụ Xe)</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          Tính năng tự động chấm công số dựa trên GPS gắn liền với lịch trình chuyến xe được điều động thực tế của phụ xe đang được lên lịch nâng cấp trong phiên bản tiếp theo.
        </p>
        <div style={{ display: 'inline-block', backgroundColor: '#f0f7ff', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          📅 Trạng thái: Đang phát triển (Giai đoạn sau)
        </div>
      </div>
    </section>
  );
};

export default AttendantAttendancePage;
