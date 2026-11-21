import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBranchById } from '../../constants/branches';

const API_BASE = 'http://localhost:8000/api';

const renderStars = (rating) => {
  const stars = [];
  const score = Math.min(5, Math.max(1, Math.round(rating || 5)));
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} style={{ color: i <= score ? '#eab308' : '#cbd5e1', fontSize: '0.9rem' }}>
        ★
      </span>
    );
  }
  return stars;
};

const TicketCustomerFeedbackPage = () => {
  const { token, user } = useContext(AuthContext);

  const managerBranchId = user?.branch?.branchId || 'sg';
  const branchInfo = managerBranchId ? getBranchById(managerBranchId) : null;
  const branchName = branchInfo?.branchName || user?.branch?.branchName || 'Chi nhánh TP. Hồ Chí Minh';

  const [feedbacks, setFeedbacks] = useState([]);
  const [csat, setCsat] = useState({
    avgRating: '4.8',
    positiveRate: 95,
    repliedRate: 0,
    repliedCount: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    totalFeedbacks: 0
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Bộ lọc
  const [ratingFilter, setRatingFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Trả Lời Bình Luận Của Khách Hàng
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Nạp danh sách đánh giá & bình luận chuyến xe toàn hệ thống
  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ratingFilter !== 'all') params.append('rating', ratingFilter);
      if (replyFilter !== 'all') params.append('isReplied', replyFilter === 'replied' ? 'true' : 'false');

      const res = await fetch(`${API_BASE}/users/ticket-manager/feedbacks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbacks(data.feedbacks || []);
        if (data.csat) setCsat(data.csat);
      } else {
        showToast(data.message || 'Không thể tải danh sách bình luận.', 'error');
      }
    } catch {
      showToast('Lỗi máy chủ khi tải danh sách bình luận.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchFeedbacks();
  }, [token, ratingFilter, replyFilter]);

  // Danh sách các tuyến xe có trong bình luận để lọc
  const routeList = useMemo(() => {
    const set = new Set();
    feedbacks.forEach(f => {
      const rName = f.tripId?.routeId?.name || (f.tripId?.routeId?.startPoint && f.tripId?.routeId?.endPoint ? `${f.tripId.routeId.startPoint} - ${f.tripId.routeId.endPoint}` : null);
      if (rName) set.add(rName);
    });
    return Array.from(set);
  }, [feedbacks]);

  // Xử lý gửi câu trả lời bình luận
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    if (!replyContent.trim()) {
      showToast('Vui lòng nhập nội dung câu trả lời.', 'error');
      return;
    }

    setSubmittingReply(true);
    try {
      const res = await fetch(`${API_BASE}/users/ticket-manager/feedbacks/${selectedFeedback._id}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ replyContent })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Đã gửi câu trả lời cho bình luận của khách hàng thành công!');
        setSelectedFeedback(null);
        setReplyContent('');
        fetchFeedbacks();
      } else {
        showToast(data.message || 'Không thể gửi câu trả lời.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Các mẫu trả lời nhanh
  const applyQuickReply = (type) => {
    const custName = selectedFeedback?.customerName || selectedFeedback?.userName || 'Quý khách';
    const routeName = selectedFeedback?.tripId?.routeId?.name || 'chuyến xe';

    if (type === 'thank_you') {
      setReplyContent(`Chào ${custName}, An Bình Lines xin chân thành cảm ơn Quý khách đã tin tưởng lựa chọn ${routeName}. Sự hài lòng và những lời động viên của Quý khách chính là niềm tự hào lớn nhất của toàn thể đội ngũ nhà xe. Kính chúc Quý khách luôn có những chuyến hành trình thượng lộ bình an!`);
    } else if (type === 'apology') {
      setReplyContent(`Chào ${custName}, Ban quản lý phòng vé An Bình Lines chân thành xin lỗi Quý khách về trải nghiệm chưa trọn vẹn trên ${routeName} vừa qua. Chúng tôi đã tiếp nhận phản ánh, tiến hành rà soát phương tiện và chấn chỉnh quy trình phục vụ để không lặp lại tình trạng này. Rất mong tiếp tục được phục vụ Quý khách tốt hơn trong tương lai!`);
    } else if (type === 'vip_care') {
      setReplyContent(`Kính chào ${custName}, cảm ơn Quý khách đã dành thời gian đóng góp ý kiến quý báu cho An Bình Lines. Bộ phận chăm sóc khách hàng của phòng vé chi nhánh xin ghi nhận và sẽ liên tục nâng cao chất lượng dịch vụ để mang đến trải nghiệm di chuyển an toàn, tiện nghi nhất. Trân trọng cảm ơn Quý khách!`);
    }
  };

  // Lọc theo từ khóa tìm kiếm và tuyến xe
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      const rName = f.tripId?.routeId?.name || (f.tripId?.routeId?.startPoint && f.tripId?.routeId?.endPoint ? `${f.tripId.routeId.startPoint} - ${f.tripId.routeId.endPoint}` : '');
      if (routeFilter !== 'all' && rName !== routeFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const uName = (f.customerName || f.userName || '').toLowerCase();
      const phone = (f.customerPhone || '').toLowerCase();
      const comment = (f.comment || '').toLowerCase();
      const reply = (f.replyContent || '').toLowerCase();
      const plate = (f.tripId?.busId?.plateNumber || '').toLowerCase();

      return uName.includes(q) || phone.includes(q) || comment.includes(q) || reply.includes(q) || plate.includes(q) || rName.toLowerCase().includes(q);
    });
  }, [feedbacks, routeFilter, searchQuery]);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700',
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#ffffff',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header Panel */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Đánh Giá &amp; Bình Luận Chuyến Xe Của Khách Hàng
              </h1>
              <span style={{ fontSize: '0.74rem', background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                Toàn Hệ Thống
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '6px 0 0 0' }}>
              Theo dõi các đánh giá, nhận xét của hành khách sau khi trải nghiệm chuyến xe và <strong>trả lời bình luận trực tiếp</strong> từ Quản lý phòng vé chi nhánh.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => { fetchFeedbacks(); showToast('Đã làm mới danh sách đánh giá & bình luận!'); }}
              style={{
                backgroundColor: '#2563eb', border: 'none', color: '#ffffff',
                fontWeight: '700', padding: '0.65rem 1.25rem', borderRadius: '8px', fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" /></svg>
              Làm Mới Dữ Liệu
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards CSAT KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>ĐIỂM ĐÁNH GIÁ TRUNG BÌNH (CSAT)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <span>{csat.avgRating}</span>
            <span style={{ fontSize: '1.2rem', color: '#eab308' }}>★</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>/ 5.0</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Dựa trên {csat.totalFeedbacks}&nbsp;lượt đánh giá thực tế
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TỶ LỆ KHÁCH HÀNG HÀI LÒNG</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#16a34a', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {csat.positiveRate}%
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap' }}>
            Khách cho điểm từ 4 sao đến 5 sao
          </div>
        </div>

        <div style={{ background: '#f0fdf4', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>ĐÃ ĐƯỢC QUẢN LÝ PHẢN HỒI</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#166534', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {csat.repliedCount || 0}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#166534' }}>/ {csat.totalFeedbacks || feedbacks.length} bình luận</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Tỷ lệ phản hồi đạt {csat.repliedRate || 0}%
          </div>
        </div>

        <div style={{ background: '#fffbeb', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>BÌNH LUẬN CHƯA PHẢN HỒI</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b45309', margin: '4px 0', whiteSpace: 'nowrap' }}>
            {Math.max(0, (csat.totalFeedbacks || feedbacks.length) - (csat.repliedCount || 0))}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: '600' }}>bình luận</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Cần quản lý chi nhánh phản hồi ngay
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              ĐÁNH GIÁ SAO:
            </label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả mức sao (1 - 5★)</option>
              <option value="5">5 sao (Xuất sắc)</option>
              <option value="4">4 sao (Rất tốt)</option>
              <option value="3">3 sao (Bình thường)</option>
              <option value="2">2 sao (Cần khắc phục)</option>
              <option value="1">1 sao (Không hài lòng)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              TRẠNG THÁI TRẢ LỜI:
            </label>
            <select
              value={replyFilter}
              onChange={(e) => setReplyFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="unreplied">Chưa trả lời (Cần phản hồi)</option>
              <option value="replied">Đã được Quản lý trả lời</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              TUYẾN XE:
            </label>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
            >
              <option value="all">Tất cả tuyến xe ({routeList.length})</option>
              {routeList.map((rt, idx) => (
                <option key={idx} value={rt}>{rt}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '4px', whiteSpace: 'nowrap' }}>
              TÌM KIẾM BÌNH LUẬN:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm theo tên khách, SĐT, biển số xe, nội dung bình luận..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.85rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Feedbacks Table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b', fontSize: '0.85rem' }}>
            Đang tải dữ liệu đánh giá &amp; bình luận chuyến xe từ máy chủ...
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Không tìm thấy đánh giá hoặc bình luận nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '1350px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>STT</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Hành khách</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Chuyến xe &amp; Biển số</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Đánh giá</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Nội dung bình luận của khách</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Thời gian gửi</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>Câu trả lời của Quản lý chi nhánh</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((fb, idx) => {
                  const dateStr = fb.createdAt ? new Date(fb.createdAt).toLocaleString('vi-VN') : '--';
                  const custName = fb.customerName || fb.userName || 'Hành khách';
                  const custInitial = custName.charAt(0).toUpperCase();

                  // Tuyến xe và phương tiện
                  const routeName = fb.tripId?.routeId?.name || (fb.tripId?.routeId?.startPoint && fb.tripId?.routeId?.endPoint ? `${fb.tripId.routeId.startPoint} - ${fb.tripId.routeId.endPoint}` : 'Tuyến Sài Gòn');
                  const busPlate = fb.tripId?.busId?.plateNumber || '51B-016.16';
                  const busType = fb.tripId?.busId?.type || 'Limousine';
                  const isReplied = Boolean(fb.isReplied || fb.replyContent);

                  return (
                    <tr key={fb._id} style={{ borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{idx + 1}</td>

                      {/* Hành khách */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{custName}</span>
                        {fb.customerPhone && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>
                            ({fb.customerPhone})
                          </span>
                        )}
                      </td>

                      {/* Tuyến xe & Biển số */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>{routeName}</span>
                        <span style={{ fontSize: '0.75rem', color: '#2563eb', marginLeft: '6px' }}>
                          (Xe: {busPlate} • {busType})
                        </span>
                      </td>

                      {/* Đánh giá sao */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          {renderStars(fb.rating)}
                          <span style={{ marginLeft: '4px', fontWeight: '800', color: '#334155' }}>
                            ({fb.rating || 5}★)
                          </span>
                        </div>
                      </td>

                      {/* Bình luận của khách */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                        <div style={{ color: '#0f172a', fontWeight: '500', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          "{fb.comment}"
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>

                      {/* Trạng thái trả lời */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {isReplied ? (
                          <span style={{
                            background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700',
                            whiteSpace: 'nowrap', display: 'inline-block'
                          }}>
                            ĐÃ TRẢ LỜI
                          </span>
                        ) : (
                          <span style={{
                            background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: '700',
                            whiteSpace: 'nowrap', display: 'inline-block'
                          }}>
                            CHƯA TRẢ LỜI
                          </span>
                        )}
                      </td>

                      {/* Câu trả lời của Quản lý */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                        {fb.replyContent ? (
                          <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            ✓ QL: "{fb.replyContent}"
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Chờ Quản lý gửi câu trả lời...
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => {
                            setSelectedFeedback(fb);
                            setReplyContent(fb.replyContent || '');
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
                            border: isReplied ? '1px solid #cbd5e1' : '1px solid #bfdbfe',
                            background: isReplied ? '#f8fafc' : '#2563eb',
                            color: isReplied ? '#334155' : '#ffffff',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: isReplied ? 'none' : '0 1px 2px rgba(37,99,235,0.2)'
                          }}
                        >
                          {isReplied ? 'Sửa Câu Trả Lời' : 'Trả Lời Bình Luận'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Trả Lời Bình Luận Của Khách Hàng */}
      {selectedFeedback && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '620px', width: '100%',
            padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Trả Lời Bình Luận Của Khách Hàng
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                  Người trả lời: <strong>{user?.fullName || user?.name || 'Võ Hoàng Nam'} (Quản lý phòng vé chi nhánh)</strong>
                </div>
              </div>
              <button onClick={() => setSelectedFeedback(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}>✕</button>
            </div>

            {/* Thông tin chuyến xe & Bình luận của khách */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '8px' }}>
                <div>
                  Hành khách: <strong style={{ color: '#0f172a' }}>{selectedFeedback.customerName || selectedFeedback.userName}</strong> ({selectedFeedback.customerPhone || '0903******'})
                </div>
                <div style={{ color: '#64748b' }}>
                  {selectedFeedback.createdAt ? new Date(selectedFeedback.createdAt).toLocaleString('vi-VN') : ''}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontWeight: '700' }}>Tuyến xe:</span>
                <span style={{ color: '#2563eb', fontWeight: '600' }}>
                  {selectedFeedback.tripId?.routeId?.name || (selectedFeedback.tripId?.routeId?.startPoint && selectedFeedback.tripId?.routeId?.endPoint ? `${selectedFeedback.tripId.routeId.startPoint} - ${selectedFeedback.tripId.routeId.endPoint}` : 'Chuyến xe Sài Gòn')}
                </span>
                <span style={{ color: '#64748b' }}>• Xe: {selectedFeedback.tripId?.busId?.plateNumber || '51B-016.16'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontWeight: '700' }}>Đánh giá:</span>
                {renderStars(selectedFeedback.rating)}
                <span style={{ fontWeight: '800', color: '#0f172a' }}>({selectedFeedback.rating || 5} sao)</span>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontStyle: 'italic', color: '#1e293b' }}>
                "{selectedFeedback.comment}"
              </div>
            </div>

            {/* Mẫu trả lời nhanh */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                GỢI Ý MẪU PHẢN HỒI NHANH (Bấm để áp dụng):
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => applyQuickReply('thank_you')}
                  style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontWeight: '600', cursor: 'pointer' }}
                >
                  ✓ Mẫu cảm ơn (4★ - 5★)
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickReply('apology')}
                  style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontWeight: '600', cursor: 'pointer' }}
                >
                  ⚠ Mẫu xin lỗi &amp; khắc phục (1★ - 3★)
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickReply('vip_care')}
                  style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: '600', cursor: 'pointer' }}
                >
                  ★ Mẫu chăm sóc khách hàng VIP
                </button>
              </div>
            </div>

            <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Nội dung câu trả lời của Quản lý chi nhánh *
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Nhập nội dung phản hồi chính thức từ Quản lý phòng vé gửi đến khách hàng..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', lineHeight: '1.45' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedFeedback(null)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingReply}
                  style={{
                    padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff',
                    fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.25)'
                  }}
                >
                  {submittingReply ? 'Đang gửi...' : 'Gửi Câu Trả Lời Cho Khách Hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketCustomerFeedbackPage;
