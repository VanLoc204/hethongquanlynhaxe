import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const AgentShiftSummaryPage = () => {
  const { token, user } = useContext(AuthContext);
  const [activeShift, setActiveShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');
  const [closing, setClosing] = useState(false);

  // Lấy dữ liệu ca trực và lịch sử
  const fetchShiftData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Ca trực đang mở hiện tại
      const activeRes = await fetch('http://localhost:8000/api/users/shift/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const activeData = await activeRes.json();
      if (activeRes.ok && activeData.success) {
        setActiveShift(activeData.session);
      } else {
        setActiveShift(null);
      }

      // 2. Lịch sử các ca trực đã chốt
      const historyRes = await fetch('http://localhost:8000/api/users/shift/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historyData = await historyRes.json();
      if (historyRes.ok && historyData.success) {
        setHistory(historyData.history || []);
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ khi nạp dữ liệu ca trực.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, [token]);

  // Xử lý tạm khóa quầy
  const handlePauseShift = async () => {
    setClosing(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/api/users/shift/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Nghỉ trưa / Giải lao giữa ca' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Quầy vé đã được tạm khóa an toàn. Bạn có thể yên tâm nghỉ ngơi.');
        fetchShiftData();
      } else {
        setError(data.message || 'Không thể tạm khóa ca.');
      }
    } catch (err) {
      setError('Lỗi kết nối khi tạm khóa ca.');
    } finally {
      setClosing(false);
    }
  };

  // Xử lý đóng ca & bàn giao doanh thu (Check-out)
  const handleCloseShift = async (e) => {
    if (e) e.preventDefault();
    if (!activeShift) return;

    setClosing(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('http://localhost:8000/api/users/shift/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message || 'Đóng ca làm việc và nộp báo cáo kết chuyển doanh thu thành công!');
        setActiveShift(null);
        setNotes('');
        fetchShiftData();
      } else {
        setError(data.message || 'Không thể đóng ca trực.');
      }
    } catch (err) {
      setError('Lỗi máy chủ khi chốt đóng ca.');
    } finally {
      setClosing(false);
    }
  };

  const formatCurrency = (number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number || 0);
  };

  // Tính thời gian đã trực
  const calculateShiftDuration = (startTime) => {
    if (!startTime) return '';
    const diffMs = Date.now() - new Date(startTime).getTime();
    if (diffMs < 0) return 'Vừa bắt đầu';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} giờ ${minutes} phút`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>

      {/* CSS Cục Bộ Chuẩn Giao Diện Bán Vé & Quản Lý - Đồng Bộ Kích Thước & Tuyệt Đối Không Dùng Icon */}
      <style>{`
        .shift-panel-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.25rem 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          box-sizing: border-box;
        }

        .shift-header-wrap {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .shift-two-col {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 1.5rem;
          align-items: stretch;
        }

        @media (max-width: 992px) {
          .shift-two-col {
            grid-template-columns: 1fr;
          }
        }

        .shift-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.45rem 0;
          font-size: 0.82rem;
          border-bottom: 1px dashed #f1f5f9;
        }

        .shift-info-row:last-child {
          border-bottom: none;
        }

        .shift-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.75rem 0.85rem;
          font-size: 0.82rem;
          color: #0f172a;
          outline: none;
          resize: none;
          box-sizing: border-box;
          font-family: inherit;
          background: #ffffff;
          transition: border-color 0.15s;
        }

        .shift-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        /* Bảng danh sách chi tiết vé và lịch sử */
        .shift-table-wrap {
          width: 100%;
          overflow: hidden;
          background: #ffffff;
        }

        .shift-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 0.8rem;
        }

        .shift-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          padding: 0.75rem 0.85rem;
          border-bottom: 2px solid #e2e8f0;
          text-align: left;
          white-space: nowrap;
          box-sizing: border-box;
          font-size: 0.78rem;
        }

        .shift-table td {
          padding: 0.7rem 0.85rem;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
          vertical-align: middle;
          box-sizing: border-box;
          word-break: break-word;
          line-height: 1.35;
        }

        .shift-table tbody tr:hover {
          background-color: #f8fafc;
        }

        .badge-shift {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .badge-active {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .badge-closed {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .badge-cash {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .badge-cashless {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }
      `}</style>

      {/* ========================================================= */}
      {/* KHỐI 1: TIÊU ĐỀ TRANG & TRẠNG THÁI CA TRỰC QUẦY           */}
      {/* ========================================================= */}
      <div className="shift-panel-box">
        <div className="shift-header-wrap">
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Tổng Kết Doanh Thu Ca Trực
            </h1>

            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>
              Nhân viên đóng ca làm việc bến xe để đối soát tổng lượng tiền mặt thối nhận và kết chuyển các giao dịch không tiền mặt.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeShift ? (
              <span className="badge-shift badge-active" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                Đang Mở Ca
              </span>
            ) : (
              <span className="badge-shift badge-closed" style={{ padding: '6px 12px', fontSize: '0.76rem' }}>
                Chưa Mở Ca Trực
              </span>
            )}
            <button
              type="button"
              onClick={fetchShiftData}
              style={{
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#ffffff',
                fontWeight: '700',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              title="Tải lại dữ liệu ca trực từ CSDL"
            >
              Làm Mới Dữ Liệu
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
            Lưu ý: {error}
          </div>
        )}

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
            Thành công: {success}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* KHỐI 2: CHI TIẾT CA ĐANG CHỐT BÀN GIAO & FORM ĐÓNG CA     */}
      {/* ========================================================= */}
      {activeShift ? (
        <div className="shift-two-col">

          {/* CỘT TRÁI: ĐỐI SOÁT TÀI CHÍNH VÀ TIỀN MẶT BÀN GIAO */}
          <div className="shift-panel-box" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
                <h2 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Thông Tin & Đối Soát Doanh Thu Ca
                </h2>
                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '700' }}>
                  Thời gian trực: {calculateShiftDuration(activeShift.startTime)}
                </span>
              </div>

              {/* Thông tin ca trực */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '1rem' }}>
                <div className="shift-info-row">
                  <span style={{ color: '#64748b' }}>Địa chỉ văn phòng trực:</span>
                  <strong style={{ color: '#0f172a' }}>{activeShift.userId?.assignedOffice || user?.assignedOffice || user?.branch?.branchName || 'Văn phòng bán vé'}</strong>
                </div>
                <div className="shift-info-row">
                  <span style={{ color: '#64748b' }}>Thời gian bắt đầu ca:</span>
                  <strong style={{ color: '#0f172a' }}>
                    {new Date(activeShift.startTime).toLocaleTimeString('vi-VN')} ({new Date(activeShift.startTime).toLocaleDateString('vi-VN')})
                  </strong>
                </div>
                <div className="shift-info-row">
                  <span style={{ color: '#64748b' }}>Vốn lẻ nhận đầu ca:</span>
                  <strong style={{ color: '#0f172a' }}>{formatCurrency(activeShift.initialCash)}</strong>
                </div>
                <div className="shift-info-row">
                  <span style={{ color: '#64748b' }}>Số lượng vé đã xuất:</span>
                  <strong style={{ color: '#2563eb' }}>{activeShift.ticketsSold?.length || 0} vé</strong>
                </div>
              </div>
            </div>

            {/* Bảng tính toán dòng tiền kết ca */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.45rem' }}>
                <span style={{ color: '#64748b' }}>Doanh thu tiền mặt (Quầy bán vé):</span>
                <strong style={{ color: '#0f172a' }}>{formatCurrency(activeShift.cashRevenue || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.45rem' }}>
                <span style={{ color: '#64748b' }}>Doanh thu chuyển khoản / POS:</span>
                <strong style={{ color: '#0f172a' }}>{formatCurrency(activeShift.cashlessRevenue || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.45rem' }}>
                <span style={{ color: '#64748b' }}>Tiền mặt đã chi hoàn trả vé:</span>
                <strong style={{ color: (activeShift.refundCash || 0) > 0 ? '#dc2626' : '#64748b' }}>
                  {(activeShift.refundCash || 0) > 0 ? `-${formatCurrency(activeShift.refundCash)}` : '0 đ'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.45rem' }}>
                <span style={{ color: '#64748b' }}>Tiền mặt vốn lẻ nhận đầu ca:</span>
                <strong style={{ color: '#64748b' }}>{formatCurrency(activeShift.initialCash)}</strong>
              </div>

              <div style={{ borderTop: '1px solid #cbd5e1', margin: '0.65rem 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>Tổng doanh số bán vé trong ca:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#2563eb' }}>
                  {formatCurrency((activeShift.cashRevenue || 0) + (activeShift.cashlessRevenue || 0))}
                </span>
              </div>

              {/* Thực tế tiền mặt nộp kết ca */}
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#047857', textTransform: 'uppercase' }}>
                    Thực Tế Két Tiền Mặt Bàn Giao
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#065f46', marginTop: '2px' }}>
                    (Vốn đầu ca + Tiền mặt bán vé - Tiền mặt đã chi hoàn vé)
                  </div>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#047857' }}>
                  {formatCurrency((activeShift.initialCash || 0) + (activeShift.cashRevenue || 0) - (activeShift.refundCash || 0))}
                </div>
              </div>
            </div>

          </div>

          {/* CỘT PHẢI: BÁO CÁO GHI CHÚ BÀN GIAO & NÚT XÁC NHẬN ĐÓNG CA */}
          <form onSubmit={handleCloseShift} className="shift-panel-box" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem', marginBottom: '0.85rem' }}>
                <h2 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Báo Cáo Bàn Giao & Đóng Ca
                </h2>
                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>
                  Ghi chú kiểm đếm tiền mặt, vé xuất và tình trạng thiết bị trước khi chốt nộp
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Ghi chú bàn giao ca (Ví dụ: Thừa/thiếu tiền lẻ, bàn giao ca kế tiếp, sự cố quầy...)
                </label>
                <textarea
                  className="shift-textarea"
                  rows="7"
                  placeholder="Nhập ghi chú hoặc biên bản đối chiếu tiền mặt lẻ bàn giao, thông tin nhân viên nhận bàn giao ca tiếp theo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                ></textarea>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem 0.95rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                <strong style={{ color: '#0f172a' }}>Lưu ý kết ca:</strong> Sau khi xác nhận đóng ca, quầy bán vé sẽ tạm khóa. Doanh thu tiền mặt và chuyển khoản sẽ được chốt lưu vào sổ sách kế toán ca trực.
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <button
                type="submit"
                disabled={closing}
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {closing ? 'Đang Xử Lý Đóng Ca...' : 'Xác Nhận Đóng Ca & Bàn Giao Doanh Thu'}
              </button>
            </div>
          </form>

        </div>
      ) : (
        <div className="shift-panel-box" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: '#64748b' }}>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
            Hiện tại bạn chưa mở ca làm việc nào
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
            Để thực hiện nghiệp vụ bán vé, in biên lai và chốt doanh thu ca, vui lòng chuyển sang mục Chấm Công Ca để mở ca trực quầy.
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* KHỐI 3: CHI TIẾT CÁC VÉ ĐÃ XUẤT TRONG CA HIỆN TẠI          */}
      {/* ========================================================= */}
      {activeShift && (
        <div className="shift-panel-box" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '0.95rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Chi Tiết Vé Xuất Trong Ca Hiện Tại
              </h2>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                Tổng cộng {activeShift.ticketsSold?.length || 0} vé đã phát hành trong ca này
              </div>
            </div>

            <span style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: '700' }}>
              Văn phòng: {activeShift.userId?.assignedOffice || user?.assignedOffice || user?.branch?.branchName || 'Văn phòng bán vé'}
            </span>
          </div>

          {(!activeShift.ticketsSold || activeShift.ticketsSold.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>
              Chưa có vé nào được xuất bán trong ca trực hiện tại.
            </div>
          ) : (
            <div className="shift-table-wrap">
              <table className="shift-table">
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Mã Vé</th>
                    <th>Hành Khách</th>
                    <th>Tuyến Đường</th>
                    <th>Ghế Ngồi</th>
                    <th>Hình Thức</th>
                    <th style={{ textAlign: 'right' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {activeShift.ticketsSold.map((ticket, idx) => {
                    const price = ticket.tripId?.price || 0;
                    const totalCost = (ticket.totalAmount || (price * (ticket.seats?.length || 0)));
                    return (
                      <tr key={ticket._id || idx}>
                        <td>
                          <strong style={{ color: '#2563eb', fontWeight: '800' }}>
                            #{ticket.orderCode || (ticket._id ? ticket._id.slice(-6).toUpperCase() : idx + 1)}
                          </strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{ticket.customerName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ticket.customerPhone}</div>
                        </td>
                        <td>
                          {ticket.tripId?.routeId ? (
                            <div>
                              <strong style={{ color: '#0f172a' }}>
                                {ticket.tripId.routeId.startPoint} ⇄ {ticket.tripId.routeId.endPoint}
                              </strong>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Xe: {ticket.tripId.busId?.plateNumber || 'Tiêu chuẩn'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Chưa có thông tin tuyến</span>
                          )}
                        </td>
                        <td>
                          <strong style={{ color: '#0f172a' }}>{ticket.seats?.join(', ')}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>({ticket.seats?.length || 0} ghế)</div>
                        </td>
                        <td>
                          {ticket.paymentMethod === 'cashless' ? (
                            <span className="badge-shift badge-cashless">Chuyển Khoản / POS</span>
                          ) : (
                            <span className="badge-shift badge-cash">Tiền Mặt</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#047857' }}>
                          {formatCurrency(totalCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* KHỐI 3B: CHI TIẾT CÁC VÉ ĐÃ HỦY VÀ HOÀN TIỀN TRONG CA    */}
      {/* ========================================================= */}
      {activeShift && activeShift.ticketsRefunded && activeShift.ticketsRefunded.length > 0 && (
        <div className="shift-panel-box" style={{ padding: '0', overflow: 'hidden', borderLeft: '4px solid #dc2626' }}>
          <div style={{ padding: '0.95rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', backgroundColor: '#fef2f2' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#dc2626', margin: 0 }}>
                Chi Tiết Vé Hủy &amp; Đã Hoàn Tiền Trong Ca
              </h2>
              <div style={{ fontSize: '0.74rem', color: '#991b1b', marginTop: '2px' }}>
                Tổng cộng {activeShift.ticketsRefunded.length} vé đã hủy, tổng tiền mặt đã hoàn: {formatCurrency(activeShift.refundCash || 0)}
              </div>
            </div>

            <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: '700' }}>
              Trích xuất từ két: {activeShift.userId?.assignedOffice || user?.assignedOffice || user?.branch?.branchName || 'Văn phòng bán vé'}
            </span>
          </div>

          <div className="shift-table-wrap">
            <table className="shift-table">
              <colgroup>
                <col style={{ width: '12%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Mã Vé Hủy</th>
                  <th>Hành Khách</th>
                  <th>Tuyến Đường</th>
                  <th>Ghế Giải Phóng</th>
                  <th>Phí Phạt Giữ Lại</th>
                  <th style={{ textAlign: 'right' }}>Tiền Mặt Đã Hoàn</th>
                </tr>
              </thead>
              <tbody>
                {activeShift.ticketsRefunded.map((ticket, idx) => (
                  <tr key={ticket._id || idx}>
                    <td>
                      <strong style={{ color: '#dc2626', fontWeight: '800' }}>
                        #{ticket.orderCode || (ticket._id ? ticket._id.slice(-6).toUpperCase() : idx + 1)}
                      </strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{ticket.customerName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ticket.customerPhone}</div>
                    </td>
                    <td>
                      {ticket.tripId?.routeId ? (
                        <div>
                          <strong style={{ color: '#0f172a' }}>
                            {ticket.tripId.routeId.startPoint} ⇄ {ticket.tripId.routeId.endPoint}
                          </strong>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Chưa có thông tin tuyến</span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: '#64748b' }}>{ticket.seats?.join(', ')}</strong>
                    </td>
                    <td>
                      <span style={{ color: '#047857', fontWeight: '700' }}>
                        +{formatCurrency(ticket.cancellationFee || 0)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>
                      -{formatCurrency(ticket.refundAmount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* KHỐI 4: LỊCH SỬ CÁC CA ĐÃ CHỐT BÀN GIAO TRƯỚC ĐÂY         */}
      {/* ========================================================= */}
      <div className="shift-panel-box" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '0.95rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Lịch Sử Các Ca Làm Việc Đã Chốt Bàn Giao
            </h2>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
              Ghi nhận {history.length} ca làm việc đã đối soát và kết sổ
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>
            Chưa có lịch sử ca trực nào được ghi nhận trước đây.
          </div>
        ) : (
          <div className="shift-table-wrap">
            <table className="shift-table">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Thời Gian Ca</th>
                  <th>Quầy Trực</th>
                  <th>Vốn Lẻ Ban Đầu</th>
                  <th>Doanh Thu Bán Vé</th>
                  <th>Tiền Mặt Kết Két</th>
                  <th>Số Vé Bán</th>
                  <th>Ghi Chú Bàn Giao</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const startTime = new Date(item.startTime);
                  const endTime = item.endTime ? new Date(item.endTime) : null;
                  const totalRevenue = (item.cashRevenue || 0) + (item.cashlessRevenue || 0);
                  const totalCashToHandover = item.initialCash + (item.cashRevenue || 0);

                  return (
                    <tr key={item._id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {endTime ? endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đang trực'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          Ngày {startTime.toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.userId?.assignedOffice || user?.assignedOffice || user?.branch?.branchName || 'Văn phòng bán vé'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <span className={`badge-shift ${item.status === 'active' ? 'badge-active' : 'badge-closed'}`}>
                            {item.status === 'active' ? 'Đang Mở Ca' : 'Đã Đóng Ca'}
                          </span>
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            background: item.faceVerified ? '#ecfdf5' : '#f1f5f9',
                            color: item.faceVerified ? '#059669' : '#64748b',
                            border: `1px solid ${item.faceVerified ? '#a7f3d0' : '#cbd5e1'}`
                          }}>
                            {item.faceVerified ? 'Face ID' : 'Thủ công'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ color: '#64748b' }}>{formatCurrency(item.initialCash)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '800', color: '#2563eb' }}>{formatCurrency(totalRevenue)}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          Mặt: {formatCurrency(item.cashRevenue || 0)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '800', color: '#047857' }}>
                          {formatCurrency(totalCashToHandover)}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{item.ticketsSold?.length || 0}</strong> vé
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: item.notes ? 'normal' : 'italic' }}>
                          {item.notes || 'Không có ghi chú'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentShiftSummaryPage;
