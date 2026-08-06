import React from 'react';

const AttendantLuggagePage = () => {
  return (
    <section className="panel" style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧳</div>
        <h2 style={{ marginBottom: '10px' }}>Chức Năng Ghi Nhận Hành Lý Ký Gửi</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          Tính năng gắn thẻ tag (Tag number), cân đo khối lượng kiện hàng và quản lý biên lai hành lý đi chung xe của hành khách đang được xem xét cập nhật trong chu kỳ cập nhật tiếp theo.
        </p>
        <div style={{ display: 'inline-block', backgroundColor: '#f0f7ff', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
          📅 Trạng thái: Đang phát triển (Giai đoạn sau)
        </div>
      </div>
    </section>
  );
};

export default AttendantLuggagePage;
