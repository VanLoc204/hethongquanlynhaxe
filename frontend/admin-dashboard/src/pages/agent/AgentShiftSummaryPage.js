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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2.5rem' }}>
          
          {/* Top Panel: Split info and report form */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            gap: '2.5rem',
            background: '#f8fafc',
            padding: '1.75rem',
            borderRadius: '16px',
            border: '1px solid var(--card-border)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}>
            
            {/* Left: Shift Info & Financial summary */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ marginTop: 0, color: 'var(--text)', fontWeight: '800', fontSize: '1.25rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  Ca trực đang chốt bàn giao
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Địa chỉ quầy trực:</span>
                    <strong style={{ color: 'var(--text)' }}>{activeShift.counterNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Thời gian bắt đầu:</span>
                    <strong style={{ color: 'var(--text)' }}>{new Date(activeShift.startTime).toLocaleTimeString('vi-VN')} ({new Date(activeShift.startTime).toLocaleDateString('vi-VN')})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Vốn lẻ đầu ca:</span>
                    <strong style={{ color: 'var(--text)' }}>{formatCurrency(activeShift.initialCash)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Số vé đã bán:</span>
                    <strong style={{ color: 'var(--text)' }}>{activeShift.ticketsSold?.length || 0} vé</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Doanh thu tiền mặt (Quầy bán vé):</span>
                  <strong style={{ color: 'var(--text)' }}>{formatCurrency(activeShift.cashRevenue || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Doanh thu chuyển khoản / POS:</span>
                  <strong style={{ color: 'var(--text)' }}>{formatCurrency(activeShift.cashlessRevenue || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <span>Tiền mặt nhận đầu ca:</span>
                  <span>{formatCurrency(activeShift.initialCash)}</span>
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '0.75rem 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.05rem', color: 'var(--text)' }}>
                  <span>Tổng doanh số bán vé:</span>
                  <span style={{ color: 'var(--primary)', fontSize: '1.15rem' }}>{formatCurrency((activeShift.cashRevenue || 0) + (activeShift.cashlessRevenue || 0))}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.2rem', color: '#10b981' }}>
                  <span>Thực tế két tiền mặt bàn giao:</span>
                  <span style={{ fontSize: '1.25rem' }}>{formatCurrency(activeShift.initialCash + (activeShift.cashRevenue || 0))}</span>
                </div>
              </div>
            </div>

            {/* Right: Handover report form */}
            <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ marginTop: 0, color: 'var(--text)', fontWeight: '800', fontSize: '1.25rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                  Báo cáo bàn giao kết ca
                </h3>
                <div className="form-group">
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text)' }}>Ghi chú bàn giao (Ví dụ: Thừa/thiếu tiền lẻ, bàn giao ca sau...)</label>
                  <textarea
                    className="form-control-custom"
                    rows="6"
                    style={{ marginTop: '0.5rem', height: '170px', resize: 'none', fontSize: '0.95rem' }}
                    placeholder="Nhập ghi chú hoặc biên bản đối chiếu tiền mặt lẻ bàn giao..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <button
                type="submit"
                className="btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 6px -1px rgba(63, 106, 216, 0.2)',
                  marginTop: '1.5rem',
                  height: '48px'
                }}
                disabled={closing}
              >
                {closing ? 'Đang đóng ca...' : 'Xác nhận Đóng ca & Bàn giao doanh thu'}
              </button>
            </form>
          </div>

          {/* Bottom Panel: Full width ticket sales details */}
          <div className="panel" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: '800', color: 'var(--text)' }}>
              Chi tiết vé xuất trong ca trực hiện tại
            </h3>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              backgroundColor: '#ffffff'
            }}>
              {(!activeShift.ticketsSold || activeShift.ticketsSold.length === 0) ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2.5rem 0' }}>
                  Chưa xuất vé nào trong ca trực hiện tại.
                </div>
              ) : (
                activeShift.ticketsSold.map((ticket, idx) => {
                  const price = ticket.tripId?.price || 0;
                  return (
                    <div key={ticket._id || idx} style={{
                      padding: '12px 16px',
                      borderBottom: idx === activeShift.ticketsSold.length - 1 ? 'none' : '1px solid #f1f5f9',
                      fontSize: '0.9rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ color: 'var(--text)' }}>SmartBus #{ticket.orderCode}</strong>
                        <span style={{ marginLeft: '10px', fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', fontWeight: '600', backgroundColor: '#e2e8f0', color: '#334155' }}>
                          Ghế: {ticket.seats?.join(', ')}
                        </span>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                          Khách hàng: {ticket.customerName} ({ticket.customerPhone})
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '700', color: 'var(--text)' }}>
                          {formatCurrency(price * (ticket.seats?.length || 0))}
                        </span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600', marginTop: '2px' }}>
                          {ticket.paymentMethod === 'cashless' ? 'Chuyển khoản / POS' : 'Tiền mặt'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
