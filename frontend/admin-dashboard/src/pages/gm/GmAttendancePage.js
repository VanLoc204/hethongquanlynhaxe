import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const getRoleBadge = (role) => {
  switch (role) {
    case 'driver':
      return { label: 'Tài Xế', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'attendant':
      return { label: 'Phụ Xe', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
    case 'ticket_agent':
      return { label: 'Bán Vé', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    case 'ticket_manager':
      return { label: 'QL Phòng Vé', bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' };
    case 'ops_manager':
      return { label: 'QL Vận Tải', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
    case 'fleet_manager':
      return { label: 'QL Đội Xe', bg: '#fefce8', color: '#a16207', border: '#fef08a' };
    case 'general_manager':
      return { label: 'Ban Giám Đốc', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' };
    case 'admin':
      return { label: 'Quản Trị Viên', bg: '#f8fafc', color: '#334155', border: '#cbd5e1' };
    default:
      return { label: role || 'Nhân Viên', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  }
};

const GmAttendancePage = () => {
  const { token } = useContext(AuthContext);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [roleFilter, setRoleFilter] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/attendance/stats?year=${year}&month=${month}&role=${roleFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setData(resData);
      } else {
        setError(resData.message || 'Không thể tải thống kê chấm công.');
      }
    } catch (err) {
      console.error('[GmAttendancePage Error]:', err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [year, month, roleFilter, token]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  const kpi = data?.kpi || {
    totalStaff: 0,
    faceRegisteredCount: 0,
    faceRegistrationRate: 0,
    presentThisMonth: 0,
    absentThisMonth: 0,
    attendanceRate: 0
  };

  const roleStats = data?.roleStats || {};
  const monthlyStats = data?.monthlyStats || [];
  const topAbsent = data?.topAbsent || [];

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: '1440px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
              Báo Cáo &amp; Thống Kê Chuyên Cần Toàn Hệ Thống
            </h1>
            <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
              Quyền Giám Đốc
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Tổng hợp dữ liệu chấm công Face ID, phân tích tỷ lệ chuyên cần theo tháng và giám sát toàn bộ 31 nhân sự nhà xe.
          </p>
        </div>

        {/* Filters: Tháng & Năm & Chức vụ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Chức danh:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <option value="all">Toàn bộ nhân sự (31)</option>
              <option value="driver">Tài xế (9)</option>
              <option value="attendant">Phụ xe (9)</option>
              <option value="ticket_agent">Nhân viên bán vé (6)</option>
              <option value="ticket_manager">QL Phòng vé (3)</option>
              <option value="ops_manager">QL Vận tải (1)</option>
              <option value="fleet_manager">QL Đội xe (1)</option>
              <option value="general_manager">Ban Giám Đốc (1)</option>
              <option value="admin">Quản trị viên (1)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Tháng:</span>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              style={{ border: 'none', outline: 'none', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Năm:</span>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              style={{ border: 'none', outline: 'none', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchStats}
            style={{
              backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Quick Role Selection Pills cho Ban Giám Đốc */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>Lọc nhanh theo phòng ban:</span>
        
        <button
          onClick={() => setRoleFilter('all')}
          style={{
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
            border: roleFilter === 'all' ? '1px solid #2563eb' : '1px solid #e2e8f0',
            backgroundColor: roleFilter === 'all' ? '#2563eb' : '#ffffff',
            color: roleFilter === 'all' ? '#ffffff' : '#334155'
          }}
        >
          Toàn bộ nhân sự (31)
        </button>

        <button
          onClick={() => setRoleFilter('driver')}
          style={{
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
            border: roleFilter === 'driver' ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
            backgroundColor: roleFilter === 'driver' ? '#eff6ff' : '#ffffff',
            color: roleFilter === 'driver' ? '#1d4ed8' : '#334155'
          }}
        >
          Tài xế ({roleStats.driver || 9})
        </button>

        <button
          onClick={() => setRoleFilter('attendant')}
          style={{
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
            border: roleFilter === 'attendant' ? '1px solid #6d28d9' : '1px solid #e2e8f0',
            backgroundColor: roleFilter === 'attendant' ? '#f5f3ff' : '#ffffff',
            color: roleFilter === 'attendant' ? '#6d28d9' : '#334155'
          }}
        >
          Phụ xe ({roleStats.attendant || 9})
        </button>

        <button
          onClick={() => setRoleFilter('ticket_agent')}
          style={{
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
            border: roleFilter === 'ticket_agent' ? '1px solid #047857' : '1px solid #e2e8f0',
            backgroundColor: roleFilter === 'ticket_agent' ? '#ecfdf5' : '#ffffff',
            color: roleFilter === 'ticket_agent' ? '#047857' : '#334155'
          }}
        >
          Bán vé ({roleStats.ticket_agent || 6})
        </button>

        <button
          onClick={() => setRoleFilter('ticket_manager')}
          style={{
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
            border: roleFilter === 'ticket_manager' ? '1px solid #0f766e' : '1px solid #e2e8f0',
            backgroundColor: roleFilter === 'ticket_manager' ? '#f0fdfa' : '#ffffff',
            color: roleFilter === 'ticket_manager' ? '#0f766e' : '#334155'
          }}
        >
          QL Phòng vé ({roleStats.ticket_manager || 3})
        </button>

        <button
          onClick={() => setRoleFilter('ops_manager')}
          style={{
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
            border: roleFilter === 'ops_manager' ? '1px solid #c2410c' : '1px solid #e2e8f0',
            backgroundColor: roleFilter === 'ops_manager' ? '#fff7ed' : '#ffffff',
            color: roleFilter === 'ops_manager' ? '#c2410c' : '#334155'
          }}
        >
          QL Vận tải ({roleStats.ops_manager || 1})
        </button>

        <button
          onClick={() => setRoleFilter('fleet_manager')}
          style={{
            padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
            border: roleFilter === 'fleet_manager' ? '1px solid #a16207' : '1px solid #e2e8f0',
            backgroundColor: roleFilter === 'fleet_manager' ? '#fefce8' : '#ffffff',
            color: roleFilter === 'fleet_manager' ? '#a16207' : '#334155'
          }}
        >
          QL Đội xe ({roleStats.fleet_manager || 1})
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#2563eb', fontWeight: '700' }}>
          Đang tính toán số liệu thống kê tổng hợp...
        </div>
      ) : (
        <>
          {/* KPI Summary Cards (4 Cards) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            {/* Card 1: Tổng nhân sự quy mô */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b' }}>
                {roleFilter === 'all' ? 'TỔNG QUY MÔ TOÀN NHÀ XE' : 'QUY MÔ NHÂN SỰ ĐANG LỌC'}
              </span>
              <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#0f172a', margin: '6px 0 2px 0' }}>
                {kpi.totalStaff} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>người</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {roleFilter === 'all' ? 'Toàn bộ 31 nhân sự nhà xe' : 'Nhân sự thuộc nhóm chức danh đã chọn'}
              </span>
            </div>

            {/* Card 2: Tỷ lệ đăng ký Face ID */}
            <div style={{ background: '#ffffff', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(37,99,235,0.05)' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#1d4ed8' }}>ĐÃ ĐĂNG KÝ FACE ID</span>
              <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#2563eb', margin: '6px 0 2px 0' }}>
                {kpi.faceRegistrationRate}%
              </div>
              <span style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: '600' }}>
                {kpi.faceRegisteredCount} / {kpi.totalStaff} nhân sự đã có mẫu mặt
              </span>
            </div>

            {/* Card 3: Lượt đi làm tháng này */}
            <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(16,185,129,0.05)' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#047857' }}>LƯỢT ĐI LÀM THÁNG {month}</span>
              <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#059669', margin: '6px 0 2px 0' }}>
                {kpi.presentThisMonth} <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: '600' }}>lượt ca</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
                Tỷ lệ chuyên cần: {kpi.attendanceRate}%
              </span>
            </div>

            {/* Card 4: Lượt vắng mặt tháng này */}
            <div style={{ background: '#ffffff', border: '1.5px solid #fecdd3', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(239,68,68,0.05)' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#b91c1c' }}>LƯỢT VẮNG MẶT THÁNG {month}</span>
              <div style={{ fontSize: '1.85rem', fontWeight: '900', color: '#dc2626', margin: '6px 0 2px 0' }}>
                {kpi.absentThisMonth} <span style={{ fontSize: '0.85rem', color: '#b91c1c', fontWeight: '600' }}>lượt</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>
                Cần rà soát lý do vắng mặt
              </span>
            </div>

          </div>

          {/* Biểu đồ chuyên cần 12 tháng trong năm */}
          <section style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  Biểu Đồ Tỷ Lệ Chuyên Cần 12 Tháng Năm {year}
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Tỷ lệ phần trăm nhân viên có mặt làm việc theo từng tháng (Đạt chuẩn Face ID).
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', borderRadius: '3px' }}></span>
                  Tỷ lệ có mặt (%)
                </div>
              </div>
            </div>

            {/* Custom CSS Bar Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px', alignItems: 'flex-end', height: '220px', padding: '10px 0', borderBottom: '2px solid #e2e8f0' }}>
              {monthlyStats.map((item) => {
                const heightPercent = item.attendanceRate > 0 ? item.attendanceRate : 4;
                const isSelected = item.month === month;
                return (
                  <div key={item.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.725rem', fontWeight: '800', color: isSelected ? '#2563eb' : '#64748b', marginBottom: '4px' }}>
                      {item.attendanceRate}%
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPercent}%`,
                        backgroundColor: isSelected ? '#2563eb' : '#93c5fd',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.3s ease, background-color 0.2s',
                        cursor: 'pointer'
                      }}
                      title={`Tháng ${item.month}: ${item.presentRecords} lượt đi làm / ${item.totalRecords} tổng số`}
                      onClick={() => setMonth(item.month)}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: isSelected ? '800' : '600', color: isSelected ? '#0f172a' : '#64748b', marginTop: '8px' }}>
                      T{item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Top 10 nhân sự vắng mặt nhiều nhất trong tháng */}
          <section style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                Danh Sách Nhân Sự Vắng Mặt Nhiều Nhất (Tháng {month}/{year})
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Dữ liệu hỗ trợ phòng Nhân sự và Ban Giám đốc xem xét đánh giá KPI cuối tháng.
              </p>
            </div>

            {topAbsent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 0', color: '#059669', fontWeight: '700', fontSize: '0.85rem' }}>
                Ghi nhận 100% quân số đi làm đầy đủ, không có nhân sự vắng mặt trong tháng {month}/{year}.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.725rem', fontWeight: '800', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>HỌ VÀ TÊN</th>
                      <th style={{ padding: '0.75rem 1rem' }}>SỐ ĐIỆN THOẠI</th>
                      <th style={{ padding: '0.75rem 1rem' }}>CHỨC VỤ</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>SỐ NGÀY VẮNG</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>MỨC ĐỘ CẢNH BÁO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAbsent.map((person, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.825rem' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: '800', color: '#0f172a' }}>
                          {person.name}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                          {person.phone}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {(() => {
                            const badge = getRoleBadge(person.role);
                            return (
                              <span
                                style={{
                                  fontSize: '0.725rem',
                                  fontWeight: '800',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`
                                }}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: '900', color: '#dc2626', fontSize: '0.95rem' }}>
                          {person.absentDays} ngày
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '800',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              backgroundColor: person.absentDays >= 3 ? '#fef2f2' : '#fffbeb',
                              color: person.absentDays >= 3 ? '#b91c1c' : '#b45309'
                            }}
                          >
                            {person.absentDays >= 3 ? 'Cần Xử Lý Kỷ Luật' : 'Cần Nhắc Nhở'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

    </div>
  );
};

export default GmAttendancePage;
