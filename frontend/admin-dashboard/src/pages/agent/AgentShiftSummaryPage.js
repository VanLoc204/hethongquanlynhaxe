import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentShiftSummaryPage = () => {
  const { token } = useContext(AuthContext);
  const [activeShift, setActiveShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');
  const [closing, setClosing] = useState(false);

  const fetchShiftData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Get current active shift
      const activeRes = await fetch('http://localhost:8000/api/v1/users/shift/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const activeData = await activeRes.json();
      if (activeRes.ok && activeData.success) {
        setActiveShift(activeData.session);
      }

      // 2. Get shift history list
      const historyRes = await fetch('http://localhost:8000/api/v1/users/shift/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historyData = await historyRes.json();
      if (historyRes.ok && historyData.success) {
        setHistory(historyData.history);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu ca trực.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, [token]);

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!activeShift) return;

    setClosing(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/users/shift/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Đóng ca làm việc và nộp báo cáo doanh thu thành công!');
        setActiveShift(null);
        setNotes('');
        fetchShiftData(); // re-fetch history
      } else {
        setError(data.message || 'Không thể đóng ca trực.');
      }
    } catch (err) {
      setError('Lỗi máy chủ khi kết ca trực.');
    } finally {
      setClosing(false);
    }
  };

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Đang tải lịch sử ca trực...</div>
      </div>
    );
  }

  return (
    <section className="panel" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <h2>Tổng Kết Doanh Thu Ca Trực</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nhân viên đóng ca làm việc bến xe để đối soát tổng lượng tiền mặt thối nhận và kết chuyển các giao dịch không tiền mặt.</p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1.25rem' }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: '1.25rem' }}>{success}</div>}

      {/* Active Shift Closure Portal */}
      {activeShift ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem', background: '#faf5ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e9d8fd' }}>
          <div>
            <h3 style={{ marginTop: 0, color: '#6b46c1' }}>⚡ Ca trực đang cần chốt bàn giao</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <div>🏢 <strong>Địa chỉ quầy trực: </strong> {activeShift.counterNumber}</div>
              <div>⏰ <strong>Bắt đầu lúc: </strong> {new Date(activeShift.startTime).toLocaleTimeString('vi-VN')} ({new Date(activeShift.startTime).toLocaleDateString('vi-VN')})</div>
              <div>💵 <strong>Tiền mặt nhận đầu ca: </strong> {formatCurrency(activeShift.initialCash)}</div>
              <div>🎫 <strong>Số lượng vé đã bán ra: </strong> {activeShift.ticketsSold?.length || 0} vé</div>
            </div>

            <div style={{ marginTop: '1rem', background: '#ffffff', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Doanh thu tiền mặt (Quầy bàn giao):</span>
                <strong>{formatCurrency(activeShift.cashRevenue || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Doanh thu POS/QR chuyển khoản:</span>
                <strong>{formatCurrency(activeShift.cashlessRevenue || 0)}</strong>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.05rem', color: '#6b46c1' }}>
                <span>Tổng tiền bàn giao cần chốt:</span>
                <span>{formatCurrency(activeShift.initialCash + (activeShift.cashRevenue || 0) + (activeShift.cashlessRevenue || 0))}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0 }}>Báo cáo bàn giao kết thúc ca:</h4>
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Ghi chú bàn giao (Ví dụ: Thừa/thiếu tiền lẻ, bàn giao ca sau...)</label>
              <textarea
                className="form-control"
                rows="4"
                style={{ marginTop: '0.4rem' }}
                placeholder="Nhập ghi chú hoặc biên bản đối chiếu tiền mặt lẻ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
            <button
              type="submit"
              className="btn"
              style={{ backgroundColor: '#6b46c1', color: '#ffffff', padding: '0.75rem', fontWeight: '600', marginTop: '0.5rem' }}
              disabled={closing}
            >
              {closing ? 'Đang đóng ca...' : 'Xác nhận Đóng ca & Bàn giao doanh thu'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ backgroundColor: '#f7fafc', color: 'var(--text-muted)', padding: '1.5rem', borderRadius: '6px', textAlign: 'center', marginBottom: '2.5rem', border: '1px dashed var(--card-border)' }}>
          Hiện bạn không có ca bán vé nào đang ở trạng thái hoạt động. Để chốt doanh thu ca bán vé, vui lòng sang tab <strong>Chấm công ca</strong> để mở ca trực trước.
        </div>
      )}

      {/* History table list */}
      <h3 style={{ marginBottom: '1rem' }}>Lịch Sử Các Ca Đã Chốt</h3>
      {history.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có lịch sử ca trực nào được ghi nhận trước đây.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--card-border)' }}>
                <th style={{ padding: '0.75rem' }}>Thời gian ca trực</th>
                <th style={{ padding: '0.75rem' }}>Quầy trực</th>
                <th style={{ padding: '0.75rem' }}>Vốn lẻ ban đầu</th>
                <th style={{ padding: '0.75rem' }}>Tổng doanh thu</th>
                <th style={{ padding: '0.75rem' }}>Số vé bán</th>
                <th style={{ padding: '0.75rem' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {history.map(item => (
                <tr key={item._id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: '500' }}> {new Date(item.startTime).toLocaleTimeString('vi-VN')} - {item.endTime ? new Date(item.endTime).toLocaleTimeString('vi-VN') : 'Đang trực'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(item.startTime).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{item.counterNumber}</td>
                  <td style={{ padding: '0.75rem' }}>{formatCurrency(item.initialCash)}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--primary)' }}>
                    {formatCurrency((item.cashRevenue || 0) + (item.cashlessRevenue || 0))}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{item.ticketsSold?.length || 0} vé</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.notes || 'Không có ghi chú'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AgentShiftSummaryPage;
