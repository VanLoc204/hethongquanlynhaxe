import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const StaffLeavePage = () => {
  const { token } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/leave', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeaves(data.leaves);
      } else {
        setError(data.message || 'Không thể tải danh sách đơn nghỉ.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!startDate || !endDate || !reason) {
      setError('Vui lòng nhập đầy đủ các trường thông tin.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Ngày bắt đầu nghỉ phải trước ngày kết thúc.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ startDate, endDate, reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Nộp đơn xin nghỉ phép thành công. Hệ thống đang phê duyệt tự động!');
        setStartDate('');
        setEndDate('');
        setReason('');
        // Reload list
        fetchLeaves();
      } else {
        setError(data.message || 'Không thể gửi đơn xin nghỉ.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi gửi đơn.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
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

  return (
    <div className="responsive-grid-layout" style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* Form nộp đơn xin nghỉ */}
      <section className="panel" style={{ height: 'fit-content' }}>
        <h2>Tạo Đơn Xin Nghỉ Phép</h2>
        {error && <div className="error-message" style={{ marginBottom: '1rem', color: '#ef4444' }}>{error}</div>}
        {success && <div style={{ marginBottom: '1rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: '500' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label>Từ ngày</label>
            <input
              type="date"
              className="form-control"
              style={{ background: '#f8fafc' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Đến ngày (Hết ngày)</label>
            <input
              type="date"
              className="form-control"
              style={{ background: '#f8fafc' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Lý do nghỉ phép</label>
            <textarea
              className="form-control"
              style={{ background: '#f8fafc', height: '100px', resize: 'none' }}
              placeholder="VD: Nghỉ ốm đi khám bệnh, Giải quyết việc cá nhân gia đình..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={submitting}
          >
            {submitting ? 'Đang gửi...' : 'Gửi đơn xin nghỉ'}
          </button>
        </form>
      </section>

      {/* Lịch sử đơn xin nghỉ */}
      <section className="panel">
        <h2>Lịch Sử Đơn Xin Nghỉ Phép</h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải lịch sử...</div>
          </div>
        ) : leaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            Bạn chưa gửi đơn xin nghỉ phép nào từ trước tới nay.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                  <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Thời gian nghỉ</th>
                  <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Lý do</th>
                  <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>Ngày gửi</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '0.8rem', fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {formatDate(item.startDate)} ➔ {formatDate(item.endDate)}
                    </td>
                    <td 
                      style={{ 
                        padding: '0.8rem', 
                        fontSize: '0.85rem', 
                        color: 'var(--text-main)',
                        maxWidth: '220px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} 
                      title={item.reason}
                    >
                      {item.reason}
                    </td>
                    <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>
                      {getStatusBadge(item.status)}
                    </td>
                    <td style={{ padding: '0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
};

export default StaffLeavePage;
