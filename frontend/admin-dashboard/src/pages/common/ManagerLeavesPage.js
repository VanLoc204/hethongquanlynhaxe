import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ManagerLeavesPage = () => {
  const { token } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const fetchAllLeaves = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/users/admin/leaves', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeaves(data.leaves || []);
      } else {
        setError(data.message || 'Không thể tải danh sách đơn xin nghỉ.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lấy danh sách đơn nghỉ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLeaves();
  }, [token]);

  const handleStatusUpdate = async (id, status) => {
    setError('');
    setSuccess('');
    const statusText = status === 'approved' ? 'duyệt' : 'từ chối';

    if (!window.confirm(`Bạn có chắc chắn muốn ${statusText} đơn xin nghỉ phép này?`)) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/users/admin/leaves/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Đã ${statusText} đơn xin nghỉ thành công.`);
        fetchAllLeaves();
      } else {
        setError(data.message || `Lỗi khi ${statusText} đơn nghỉ.`);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi cập nhật đơn nghỉ.');
    }
  };

  const getRoleLabel = (role) => {
    const roles = {
      driver: 'Tài xế',
      attendant: 'Phụ xe',
      ticket_agent: 'Nhân viên bán vé',
      ticket_manager: 'Quản lý phòng vé',
      fleet_manager: 'Quản lý đội xe',
      ops_manager: 'Quản lý vận tải',
      admin: 'Quản trị viên'
    };
    return roles[role] || role;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const calculateDays = (start, end) => {
    if (!start) return '';
    const s = new Date(start);
    const e = end ? new Date(end) : s;
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} ngày`;
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter((l) => l.status === 'pending').length;
    const approved = leaves.filter((l) => l.status === 'approved').length;
    const rejected = leaves.filter((l) => l.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [leaves]);

  // Filtered list
  const filteredLeaves = useMemo(() => {
    return leaves.filter((item) => {
      // Tab filter
      if (activeTab !== 'all' && item.status !== activeTab) {
        return false;
      }
      // Role filter
      if (selectedRole !== 'all' && item.userId?.role !== selectedRole) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const staffName = (item.userId?.name || '').toLowerCase();
        const staffPhone = (item.userId?.phone || '').toLowerCase();
        const staffEmail = (item.userId?.email || '').toLowerCase();
        const reason = (item.reason || item.details || '').toLowerCase();
        if (
          !staffName.includes(query) &&
          !staffPhone.includes(query) &&
          !staffEmail.includes(query) &&
          !reason.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [leaves, activeTab, selectedRole, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.25s ease' }}>
      
      {/* Top Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
            Phê Duyệt Đơn Xin Nghỉ Phép
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Hệ thống xét duyệt và quản lý đơn xin nghỉ của tài xế, phụ xe và nhân sự vận hành.
          </p>
        </div>

        <button
          onClick={fetchAllLeaves}
          style={{
            padding: '8px 18px',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Làm mới dữ liệu
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* Total */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Tổng số đơn
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Toàn bộ lịch sử đơn xin nghỉ
          </div>
        </div>

        {/* Pending */}
        <div style={{
          backgroundColor: '#fffbeb',
          borderRadius: '12px',
          border: '1px solid #fde68a',
          padding: '1.25rem',
          boxShadow: '0 2px 4px rgba(245,158,11,0.05)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Đơn chờ xét duyệt
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#d97706', marginTop: '0.4rem' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem' }}>
            Cần quản lý xử lý ngay
          </div>
        </div>

        {/* Approved */}
        <div style={{
          backgroundColor: '#ecfdf5',
          borderRadius: '12px',
          border: '1px solid #a7f3d0',
          padding: '1.25rem',
          boxShadow: '0 2px 4px rgba(16,185,129,0.05)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Đã phê duyệt
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#059669', marginTop: '0.4rem' }}>
            {stats.approved}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.25rem' }}>
            Đã chấp thuận cho nghỉ
          </div>
        </div>

        {/* Rejected */}
        <div style={{
          backgroundColor: '#fef2f2',
          borderRadius: '12px',
          border: '1px solid #fecaca',
          padding: '1.25rem',
          boxShadow: '0 2px 4px rgba(239,68,68,0.05)'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Từ chối duyệt
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: '#dc2626', marginTop: '0.4rem' }}>
            {stats.rejected}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.25rem' }}>
            Không chấp thuận
          </div>
        </div>

      </div>

      {/* Main Panel */}
      <section style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>

        {/* Toolbar: Tabs & Search / Filter */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #f1f5f9'
        }}>
          
          {/* Status Tabs with Counters */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tất cả', count: stats.total },
              { id: 'pending', label: 'Chờ duyệt', count: stats.pending },
              { id: 'approved', label: 'Đã duyệt', count: stats.approved },
              { id: 'rejected', label: 'Từ chối', count: stats.rejected }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isActive ? '#2563eb' : '#f8fafc',
                    color: isActive ? '#ffffff' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#64748b',
                    fontWeight: '800'
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box & Role Dropdown */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Search Input */}
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, lý do..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                minWidth: '220px',
                outline: 'none'
              }}
            />

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                fontWeight: '600',
                color: '#334155',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="all">Tất cả chức vụ</option>
              <option value="driver">Tài xế (Driver)</option>
              <option value="attendant">Phụ xe (Attendant)</option>
              <option value="ticket_agent">Bán vé (Ticket Agent)</option>
            </select>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '8px',
            fontSize: '0.85rem',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            backgroundColor: '#ecfdf5',
            color: '#047857',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600',
            border: '1px solid #a7f3d0'
          }}>
            {success}
          </div>
        )}

        {/* Content Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#2563eb', fontWeight: '700' }}>
            Đang tải danh sách đơn xin nghỉ phép...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3.5rem 1rem',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#334155' }}>
              Không tìm thấy đơn xin nghỉ phép nào
            </div>
            <div style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: '4px' }}>
              Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>STT</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Nhân viên</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Chức vụ</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Thời gian xin nghỉ</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Lý do nghỉ</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((item, idx) => {
                  const staffName = item.userId?.name || 'Nhân viên';
                  const staffRole = item.userId?.role ? getRoleLabel(item.userId.role) : 'Chưa rõ';
                  const staffPhone = item.userId?.phone || '—';
                  const staffEmail = item.userId?.email || '';
                  const duration = calculateDays(item.startDate, item.endDate);

                  return (
                    <tr
                      key={item._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Index */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {idx + 1}
                      </td>

                      {/* Staff Info */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }}>
                            {staffName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            ĐT: {staffPhone}
                          </span>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: item.userId?.role === 'driver' ? '#eff6ff' : item.userId?.role === 'attendant' ? '#f5f3ff' : '#f0fdf4',
                          color: item.userId?.role === 'driver' ? '#1d4ed8' : item.userId?.role === 'attendant' ? '#6d28d9' : '#15803d',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: item.userId?.role === 'driver' ? '1px solid #bfdbfe' : item.userId?.role === 'attendant' ? '1px solid #ddd6fe' : '1px solid #bbf7d0'
                        }}>
                          {staffRole}
                        </span>
                      </td>

                      {/* Vacation Period */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>
                            {formatDate(item.startDate)}
                          </span>
                          {item.endDate && formatDate(item.startDate) !== formatDate(item.endDate) && (
                            <>
                              <span style={{ color: '#94a3b8' }}>đến</span>
                              <span style={{ fontWeight: '700', color: '#0f172a' }}>
                                {formatDate(item.endDate)}
                              </span>
                            </>
                          )}
                          {duration && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              ({duration})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reason */}
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          fontSize: '0.85rem',
                          color: '#334155',
                          maxWidth: '260px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={item.reason || item.details}
                      >
                        {item.reason || item.details || 'Không có ghi chú lý do'}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        {item.status === 'approved' && (
                          <span style={{
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            border: '1px solid #a7f3d0'
                          }}>
                            Đã phê duyệt
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span style={{
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            border: '1px solid #fecaca'
                          }}>
                            Từ chối
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span style={{
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            border: '1px solid #fde68a'
                          }}>
                            Chờ duyệt
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {item.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleStatusUpdate(item._id, 'approved')}
                              style={{
                                border: 'none',
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(item._id, 'rejected')}
                              style={{
                                border: 'none',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '500' }}>
                            Đã xử lý
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ManagerLeavesPage;
