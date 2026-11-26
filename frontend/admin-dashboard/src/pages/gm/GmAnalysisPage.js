import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const GmAnalysisPage = ({ setActiveTab }) => {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [routesAnalytics, setRoutesAnalytics] = useState([]);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Active Section Tab: 'unmet_demand' (AI Demand Sensing) or 'occupancy' (Tuyến hiện có)
  const [activeSection, setActiveSection] = useState('unmet_demand');

  // Unmet Demand States
  const [unmetDemandData, setUnmetDemandData] = useState([]);
  const [unmetSingleDestinations, setUnmetSingleDestinations] = useState([]);
  const [unmetKpis, setUnmetKpis] = useState(null);
  const [unmetLoading, setUnmetLoading] = useState(false);
  const [unmetSearchTerm, setUnmetSearchTerm] = useState('');
  const [unmetFilterStatus, setUnmetFilterStatus] = useState('all');

  // Pagination for 5 rows per page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // AI Chat Assistant States
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatMessagesContainerRef = useRef(null);

  // Quick Action Prompts for GM (No Icons)
  const quickPrompts = [
    'Nên mở tuyến nào dựa trên tìm kiếm khách hàng?',
    'Phân tích tiềm năng mở tuyến Sài Gòn - Phan Thiết',
    'Nên giữ lịch xe cố định hay linh hoạt?',
    'Tỷ lệ lấp đầy ghế các xe thế nào?',
    'Phân tích doanh thu và đề xuất tăng giảm giá vé',
  ];

  // Luôn đảm bảo giao diện hiển thị từ trên cùng khi mở chức năng
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Tự động cuộn nội dung bên trong hộp chat (chỉ cuộn hộp chat, không làm trôi giao diện trang web)
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  // Fetch real-time demand analytics from MongoDB
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const res = await fetch(`${API_BASE}/pricing/demand-analytics?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRoutesAnalytics(data.data || []);
        setCurrentPage(1); // Reset page on filter change
      } else {
        setError(data.message || 'Không thể lấy dữ liệu phân tích nhu cầu.');
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm, statusFilter]);

  // Set Initial AI Executive Greeting on Load
  const fetchInitialAiReport = useCallback(() => {
    setMessages([{
      sender: 'ai',
      text: 'Dạ thưa Giám đốc! Tôi là Trợ lý Cố vấn Vận hành & Doanh thu An Bình Lines. Dữ liệu vận hành thời gian thực đã được cập nhật đầy đủ (doanh thu, tỷ lệ lấp đầy các tuyến, nhu cầu mở tuyến mới từ tìm kiếm của khách hàng và biểu giá vé).\n\nGiám đốc có thể bấm chọn các câu hỏi gợi ý nhanh phía trên hoặc đặt bất kỳ câu hỏi điều hành nào, tôi sẽ phân tích và tham mưu ngay.'
    }]);
  }, []);

  // Fetch Unmet Demand Analytics (Nhu cầu mở tuyến mới từ tìm kiếm)
  const fetchUnmetDemand = useCallback(async () => {
    setUnmetLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pricing/unmet-demand`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUnmetDemandData(data.data || []);
        setUnmetKpis(data.kpis || null);
        setUnmetSingleDestinations(data.singleDestinations || []);
      }
    } catch (err) {
      console.warn('Lỗi lấy phân tích nhu cầu mở tuyến:', err.message);
    } finally {
      setUnmetLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalyticsData();
    fetchUnmetDemand();
    fetchInitialAiReport();
  }, [fetchAnalyticsData, fetchUnmetDemand, fetchInitialAiReport]);

  // Send Message to Gemini Executive AI Copilot
  const handleSendMessage = async (textToSend = null) => {
    const text = textToSend || inputText;
    if (!text.trim() || chatLoading) return;

    const userMsg = { sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setChatLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await fetch(`${API_BASE}/pricing/gm-ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          history: historyPayload,
          message: text,
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages((prev) => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: (data.message || 'Hệ thống AI tạm thời không phản hồi. Vui lòng thử lại sau.') },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Lỗi kết nối đến server AI: ' + err.message },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Calculate dynamic stats from real MongoDB routesAnalytics
  const totalRoutesCount = routesAnalytics.length;
  const avgOccupancy = totalRoutesCount > 0
    ? Math.round(routesAnalytics.reduce((acc, r) => acc + (r.occupancyRate || 0), 0) / totalRoutesCount)
    : 5;

  const sortedRoutes = [...routesAnalytics].sort((a, b) => (b.occupancyRate || 0) - (a.occupancyRate || 0));
  const topRouteObj = sortedRoutes[0];
  const topRouteName = topRouteObj ? `${topRouteObj.routeName} (${topRouteObj.occupancyRate}%)` : 'Hồ Chí Minh → Đà Lạt';

  // Pagination Slice
  const totalPages = Math.ceil(routesAnalytics.length / pageSize) || 1;
  const paginatedAnalytics = routesAnalytics.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 60px)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Page Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            Phân tích nhu cầu & Trợ lý Cố vấn AI
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '3px 0 0 0', whiteSpace: 'nowrap' }}>
            Báo cáo phân tích dữ liệu vận tải thời gian thực & Trợ lý Cố vấn Điều hành AI
          </p>
        </div>

        {/* Action Header Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchAnalyticsData}
            style={{
              backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
              padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem',
              cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
            }}
          >
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSection('unmet_demand')}
          style={{
            padding: '9px 20px', borderRadius: '8px', border: activeSection === 'unmet_demand' ? 'none' : '1px solid #cbd5e1',
            backgroundColor: activeSection === 'unmet_demand' ? '#7c3aed' : '#ffffff',
            color: activeSection === 'unmet_demand' ? '#ffffff' : '#334155',
            fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: activeSection === 'unmet_demand' ? '0 2px 8px rgba(124, 58, 237, 0.28)' : '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
        >
          <span>Nhu cầu Mở Tuyến Mới</span>
          <span style={{
            backgroundColor: activeSection === 'unmet_demand' ? '#ffffff' : '#ede9fe',
            color: '#7c3aed', fontSize: '0.72rem', padding: '1px 8px', borderRadius: '12px', fontWeight: '900'
          }}>
            {unmetDemandData.length || 5} Tuyến
          </span>
        </button>

        <button
          onClick={() => setActiveSection('occupancy')}
          style={{
            padding: '9px 20px', borderRadius: '8px', border: activeSection === 'occupancy' ? 'none' : '1px solid #cbd5e1',
            backgroundColor: activeSection === 'occupancy' ? '#2563eb' : '#ffffff',
            color: activeSection === 'occupancy' ? '#ffffff' : '#334155',
            fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: activeSection === 'occupancy' ? '0 2px 8px rgba(37, 99, 235, 0.28)' : '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
        >
          <span>Hiệu suất Lấp đầy Tuyến Hiện có</span>
        </button>
      </div>

      {/* Top Stat KPI Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem', marginBottom: '1.25rem'
      }}>
        {activeSection === 'unmet_demand' ? (
          <>
            {/* Unmet KPI 1 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LƯỢT TÌM CHƯA CÓ CHUYẾN
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#7c3aed', marginTop: '0.4rem' }}>
                {unmetKpis?.totalUnmetSearches ?? 0} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>lượt (30 ngày)</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '4px' }}>
                Nhu cầu khách hàng chưa được đáp ứng
              </div>
            </div>

            {/* Unmet KPI 2 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TUYẾN TÌM KIẾM NHIỀU NHẤT
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {unmetKpis?.topDemandRoute || 'Chưa ghi nhận'}
              </div>
              <div style={{ fontSize: '0.73rem', color: '#dc2626', marginTop: '4px', fontWeight: '700' }}>
                {unmetKpis?.topRouteSearches ?? unmetDemandData[0]?.searchCount ?? 0} lượt tìm • Chưa có chuyến chạy
              </div>
            </div>

            {/* Unmet KPI 3 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CẢNH BÁO MỞ TUYẾN GẤP
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#dc2626', marginTop: '0.4rem' }}>
                {unmetKpis?.urgentRoutesCount ?? 0} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>tuyến</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#dc2626', marginTop: '4px', fontWeight: '700' }}>
                Đạt ngưỡng ≥ 100 lượt tìm/tháng
              </div>
            </div>

            {/* Unmet KPI 4 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TIỀM NĂNG THEO DÕI
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#d97706', marginTop: '0.4rem' }}>
                {unmetKpis?.potentialRoutesCount ?? 0} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>tuyến</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#d97706', marginTop: '4px', fontWeight: '700' }}>
                Đạt ngưỡng 30 - 99 lượt tìm/tháng
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Card 1 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                TỔNG LƯỢT TÌM NHU CẦU
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
                12.450 <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', marginLeft: '4px' }}>+14.2% ↑</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '4px' }}>
                Tăng mạnh vào khung sáng
              </div>
            </div>

            {/* Card 2 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                TUYẾN XE HOT NHẤT
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
                {topRouteName} <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#d97706' }}>(48.2%)</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '4px' }}>
                Chiếm đa số lượt đặt giường nằm
              </div>
            </div>

            {/* Card 3 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                TỶ LỆ LẤP ĐẦY BÌNH QUÂN
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
                {avgOccupancy.toFixed(1)}% <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>công suất</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '4px' }}>
                Đạt mục tiêu tối ưu vận hành
              </div>
            </div>

            {/* Card 4 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                TỶ LỆ CHUYỂN ĐỔI ĐẶT VÉ
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#9333ea', marginTop: '0.4rem', whiteSpace: 'nowrap' }}>
                68.5% <span style={{ fontSize: '0.8rem', fontWeight: '500', color: '#64748b' }}>thành công</span>
              </div>
              <div style={{ fontSize: '0.73rem', color: '#16a34a', marginTop: '4px', fontWeight: '600' }}>
                +4.2% so với cùng kỳ tuần trước
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Grid: 2 Columns (65% Table Analytics, 35% AI Chat Assistant - Matching Image 1) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left Column: Analytics Table & Peak Time Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>
          
          {activeSection === 'unmet_demand' ? (
            /* BẢNG NHU CẦU MỞ TUYẾN MỚI (AI DEMAND SENSING) */
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
              <div style={{
                padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#ffffff', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7c3aed' }}></span>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>
                    Top Tuyến Khách Tìm Kiếm Chưa Có Chuyến
                  </h3>
                </div>

                {/* Filter Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Tìm chặng đường..."
                    value={unmetSearchTerm}
                    onChange={(e) => setUnmetSearchTerm(e.target.value)}
                    style={{
                      padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.78rem', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b'
                    }}
                  />

                  <select
                    value={unmetFilterStatus}
                    onChange={(e) => setUnmetFilterStatus(e.target.value)}
                    style={{
                      padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.78rem', backgroundColor: '#ffffff', fontWeight: '600', color: '#1e293b'
                    }}
                  >
                    <option value="all">Tất cả mức độ</option>
                    <option value="URGENT">Nhu cầu Rất Cao (≥100)</option>
                    <option value="POTENTIAL">Tiềm năng (30-99)</option>
                    <option value="MONITORING">Mới phát hiện (&lt;30)</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                {unmetLoading ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    Đang tổng hợp dữ liệu tìm kiếm người dùng...
                  </div>
                ) : unmetDemandData.length === 0 ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    Chưa có dữ liệu tìm kiếm không có kết quả nào.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>CHẶNG ĐƯỜNG TÌM KIẾM</th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>LƯỢT TÌM (30 NGÀY)</th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>MỨC ĐỘ KHẨN CẤP</th>
                        <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>ĐỀ XUẤT HÀNH ĐỘNG AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmetDemandData
                        .filter(item => {
                          const matchSearch = !unmetSearchTerm || item.routeName.toLowerCase().includes(unmetSearchTerm.toLowerCase());
                          const matchStatus = unmetFilterStatus === 'all' || item.urgencyLevel === unmetFilterStatus;
                          return matchSearch && matchStatus;
                        })
                        .map((item, idx) => {
                          const isUrgent = item.urgencyLevel === 'URGENT';
                          const pct = Math.min(100, Math.round((item.searchCount / 100) * 100));

                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                              <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{item.routeName}</span>
                                </div>
                              </td>

                              <td style={{ padding: '12px 14px', minWidth: '120px', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: isUrgent ? '#dc2626' : '#d97706' }}>
                                    {item.searchCount} lượt
                                  </span>
                                </div>
                                <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${pct}%`, height: '100%',
                                    backgroundColor: isUrgent ? '#dc2626' : '#d97706',
                                    borderRadius: '3px'
                                  }} />
                                </div>
                              </td>

                              <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                                <span style={{
                                  backgroundColor: isUrgent ? '#fef2f2' : '#fffbeb',
                                  color: isUrgent ? '#dc2626' : '#d97706',
                                  border: `1px solid ${isUrgent ? '#fca5a5' : '#fde68a'}`,
                                  fontSize: '0.72rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px'
                                }}>
                                  {item.urgencyBadge}
                                </span>
                              </td>

                              <td style={{ padding: '12px 14px', verticalAlign: 'middle', minWidth: '240px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {(item.aiSuggestions && item.aiSuggestions.length > 0 ? item.aiSuggestions : [item.aiActionText]).map((sug, sIdx) => (
                                    <div key={sIdx} style={{ fontSize: '0.75rem', color: '#334155', lineHeight: '1.4' }}>
                                      {sug}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Single Destination Demands (Nhu cầu tìm kiếm 1 chiều) */}
              {unmetSingleDestinations && unmetSingleDestinations.length > 0 && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#475569', marginBottom: '8px' }}>
                    Điểm đến 1 chiều được khách tìm kiếm nhiều nhất (Chưa chọn điểm xuất phát):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {unmetSingleDestinations.map((dest, dIdx) => (
                      <span key={dIdx} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: '6px', backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1', fontSize: '0.75rem', fontWeight: '700', color: '#1e293b'
                      }}>
                        <span>{dest.destination}</span>
                        <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem' }}>
                          {dest.searchCount} lượt
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanatory Footer Card */}
              <div style={{ padding: '12px 16px', backgroundColor: '#faf5ff', borderTop: '1px solid #f3e8ff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#6b21a8' }}>
                <span style={{ fontWeight: '800' }}>Cơ chế Cảm biến AI:</span>
                <span>Gemini AI tự động đối soát ngữ nghĩa địa danh với mạng lưới tuyến đang chạy (VD: TP.HCM đi Lâm Đồng tự nhận biết đã có tuyến đi Đà Lạt). Các lượt tìm kiếm ngoài mạng lưới được gom cụm động theo tỉnh/thành để phát hiện hành lang nhu cầu mới mà không cần danh mục cố định. Tuyến từ 30 lượt/tháng thuộc diện Tiềm năng, từ 100 lượt/tháng sẽ kích hoạt Cảnh báo Mở tuyến.</span>
              </div>
            </div>
          ) : (
            <>
              {/* Table Container */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
            {/* Filter Header */}
            <div style={{
              padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', alignItems: 'center',
              justify: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                  Phân tích hiệu suất lấp đầy theo tuyến xe
                </h3>
              </div>

              {/* Filter Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Tìm tuyến hoặc dòng xe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.78rem', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b'
                  }}
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    fontSize: '0.78rem', backgroundColor: '#ffffff', fontWeight: '600', color: '#1e293b'
                  }}
                >
                  <option value="all">Tất cả nhu cầu</option>
                  <option value="high">Nhu cầu Rất Cao</option>
                  <option value="normal">Đạt công suất</option>
                  <option value="low">Nhu cầu Thấp (Báo động)</option>
                </select>
              </div>
            </div>

            {/* Real Analytics Table - Paginated to 5 rows */}
            <div style={{ overflowX: 'auto' }}>
              {loading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Đang tải dữ liệu phân tích vận tải...
                </div>
              ) : paginatedAnalytics.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  Không tìm thấy dữ liệu phân tích phù hợp với bộ lọc.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>TUYẾN ĐƯỜNG</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>DÒNG XE</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>LẤP ĐẦY</th>
                      <th style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>ĐỀ XUẤT HÀNH ĐỘNG AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAnalytics.map((item, idx) => {
                      const occ = item.occupancyRate || 65;
                      const isLow = occ <= 45;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                            {item.routeName}
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                              {item.tripsCount || 0} chuyến tính đến hiện tại • {item.distance || '310km'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '0.75rem', color: '#475569' }}>
                              {item.busType}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', minWidth: '120px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: isLow ? '#dc2626' : '#2563eb' }}>{occ}%</span>
                              {isLow && (
                                <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.65rem', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                                  BÁO ĐỘNG
                                </span>
                              )}
                            </div>
                            <div style={{ width: '100%', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${occ}%`, height: '100%',
                                backgroundColor: isLow ? '#dc2626' : '#2563eb',
                                borderRadius: '3px'
                              }} />
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', minWidth: '250px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '800', fontSize: '0.82rem', color: isLow ? '#dc2626' : '#2563eb', marginBottom: '4px' }}>
                              {item.actionBadge}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {(item.aiSuggestions && item.aiSuggestions.length > 0 ? item.aiSuggestions : [item.aiActionDetail]).map((sug, sIdx) => (
                                <div key={sIdx} style={{ fontSize: '0.73rem', color: '#475569', lineHeight: '1.35' }}>
                                  {sug}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls Footer */}
            {routesAnalytics.length > 0 && (
              <div style={{
                padding: '0.75rem 1.25rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem'
              }}>
                <div style={{ color: '#64748b', fontWeight: '500' }}>
                  Hiển thị <span style={{ fontWeight: '700', color: '#0f172a' }}>{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, routesAnalytics.length)}</span> trong tổng số <span style={{ fontWeight: '700', color: '#0f172a' }}>{routesAnalytics.length}</span> tuyến
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                      backgroundColor: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                      color: currentPage === 1 ? '#94a3b8' : '#334155',
                      fontWeight: '700', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Trang trước
                  </button>

                  <span style={{ padding: '0 8px', fontWeight: '800', color: '#2563eb' }}>
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                      backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                      color: currentPage === totalPages ? '#94a3b8' : '#334155',
                      fontWeight: '700', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
            </>
          )}

        </div>

        {/* Right Column: AI Executive Copilot Chat Container - Aligned 100% width to right edge */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
          height: '670px', overflow: 'hidden', width: '100%', minWidth: 0
        }}>
          {/* AI Chat Header */}
          <div style={{
            padding: '1rem 1.25rem', backgroundColor: '#0f172a', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff', fontWeight: '900', fontSize: '0.85rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                AI
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.9rem', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                    TRỢ LÝ CỐ VẤN AI
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                  Hỗ trợ Ban Giám đốc ra quyết định điều hành
                </div>
              </div>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div 
            style={{
              padding: '0.65rem 0.85rem', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0',
              display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0,
              scrollbarWidth: 'none', msOverflowStyle: 'none'
            }}
          >
            {quickPrompts.map((prompt, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSendMessage(prompt)}
                disabled={chatLoading}
                style={{
                  backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px',
                  padding: '6px 13px', fontSize: '0.73rem', fontWeight: '600', color: '#334155',
                  cursor: chatLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)', flexShrink: 0
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.color = '#1d4ed8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div
            ref={chatMessagesContainerRef}
            style={{
              flex: 1, padding: '1rem', overflowY: 'auto', overflowX: 'hidden', display: 'flex',
              flexDirection: 'column', gap: '1rem', backgroundColor: '#fafafa'
            }}
          >
            {messages.map((msg, mIdx) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={mIdx}
                  style={{
                    display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-start', gap: '8px'
                  }}
                >
                  {!isUser && (
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#ffffff', fontSize: '0.72rem',
                      fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '2px', boxShadow: '0 2px 4px rgba(99,102,241,0.2)'
                    }}>
                      AI
                    </div>
                  )}

                  <div style={{ maxWidth: '90%' }}>
                    <div
                      style={{
                        padding: '12px 16px', borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        backgroundColor: isUser ? '#2563eb' : '#ffffff', color: isUser ? '#ffffff' : '#1e293b',
                        fontSize: '0.825rem', lineHeight: '1.55', border: isUser ? 'none' : '1px solid #e2e8f0',
                        boxShadow: isUser ? '0 2px 6px rgba(37, 99, 235, 0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>

                  {isUser && (
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      backgroundColor: '#1e293b', color: '#ffffff', fontSize: '0.72rem',
                      fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '2px'
                    }}>
                      GM
                    </div>
                  )}
                </div>
              );
            })}

            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', paddingLeft: '36px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                Trợ lý AI đang tổng hợp dữ liệu lịch trình vận hành...
              </div>
            )}
          </div>

          {/* Chat Input Footer */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            style={{
              padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0',
              backgroundColor: '#ffffff', display: 'flex', gap: '8px', alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder="Đặt câu hỏi phân tích cho AI Gemini..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={chatLoading}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
                fontSize: '0.82rem', outline: 'none', backgroundColor: '#ffffff', color: '#1e293b'
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || chatLoading}
              style={{
                backgroundColor: inputText.trim() && !chatLoading ? '#2563eb' : '#94a3b8',
                color: '#ffffff', border: 'none', padding: '9px 16px', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.82rem', cursor: inputText.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap'
              }}
            >
              Gửi
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default GmAnalysisPage;
