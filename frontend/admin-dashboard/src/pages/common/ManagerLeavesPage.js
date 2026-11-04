import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const ManagerLeavesPage = () => {
  const { token } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  const fetchAllLeaves = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/admin/leaves', {
        headers: { 'Authorization': `Bearer ${token}` }
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
      const res = await fetch(`http://localhost:8000/api/v1/users/admin/leaves/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(`Đã ${statusText} đơn xin nghỉ thành công!`);
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
      ticket_agent: 'Bán vé',
      fleet_manager: 'QL Đội xe',
      ops_manager: 'QL Vận tải',
      admin: 'Quản trị viên'
    };
    return roles[role] || role;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span style={{ background: 'rgba(46, 207, 128, 0.1)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Đã phê duyệt</span>;
      case 'rejected':
        return <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Từ chối</span>;
      default:
        return <span style={{ background: 'rgba(241, 180, 76, 0.1)', color: 'var(--warning)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Chờ duyệt</span>;
    }
  };

  const filteredLeaves = leaves.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Leave Approval Panel */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e8ebf3', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Phê Duyệt Đơn Xin Nghỉ Phép</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Danh sách đơn xin nghỉ phép của lái xe, phụ xe và nhân viên quầy vé.
            </p>
          </div>

          {/* Filter options */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'pending', 'approved', 'rejected'].map((item) => {
              const labels = {
                all: 'Tất cả',
                pending: 'Chờ duyệt',
                approved: 'Đã duyệt',
                rejected: 'Từ chối'
              };
              return (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`btn ${filter === item ? '' : 'btn-secondary'}`}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    border: filter === item ? 'none' : '1px solid var(--border-color)',
                    backgroundColor: filter === item ? 'var(--primary)' : '#ffffff',
                    color: filter === item ? '#ffffff' : 'var(--text-main)',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {labels[item]}
                </button>
              );
            })}
          </div>
        </div>

        {error && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ecfdf5', color: '#047857', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500' }}>{success}</div>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải danh sách đơn...</div>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Không tìm thấy đơn xin nghỉ phép nào ở trạng thái này.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Nhân viên</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Thời gian nghỉ</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Lý do nghỉ</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((item) => {
                  const staffName = item.userId?.name || 'Nhân viên';
                  const staffRole = item.userId?.role ? getRoleLabel(item.userId.role) : 'Chưa rõ';
                  const staffPhone = item.userId?.phone || '';
                  const staffEmail = item.userId?.email || '';

                  return (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      {/* Staff Info */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)' }}>{staffName}</span>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              backgroundColor: '#eff6ff',
                              color: '#1e40af',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              border: '1px solid #bfdbfe'
                            }}>
                              {staffRole}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ĐT: {staffPhone} {staffEmail && `| ${staffEmail}`}
                          </span>
                        </div>
                      </td>

                      {/* Vacation Period */}
                      <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                        {formatDate(item.startDate)} đến {formatDate(item.endDate)}
                      </td>

                      {/* Reason */}
                      <td 
                        style={{ 
                          padding: '1rem', 
                          fontSize: '0.85rem', 
                          color: 'var(--text-main)',
                          maxWidth: '220px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={item.reason || item.details}
                      >
                        {item.reason || item.details || 'Không có ghi chú lý do'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem' }}>
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {item.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleStatusUpdate(item._id, 'approved')}
                              style={{
                                border: 'none',
                                backgroundColor: 'var(--success)',
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                padding: '6px 12px',
                                borderRadius: '4px',
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
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Đã xử lý</span>
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
