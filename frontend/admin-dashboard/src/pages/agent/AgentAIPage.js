import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import API_BASE_URL from '../../config/api';
import { AuthContext } from '../../context/AuthContext';

const AgentAIPage = () => {
  const { token, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Xin chào anh/chị. Tôi là Trợ Lý Số An Bình AI hỗ trợ nghiệp vụ quầy vé.\nAnh/chị có thể tra cứu nhanh các thông tin:\n- Lịch trình xuất bến, giá vé niêm yết và tình trạng chỗ trống các chuyến xe.\n- Chính sách hoàn / hủy vé (quy định chỉ được hủy trước giờ khởi hành ít nhất 5 ngày, hoàn 100%).',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sending, setSending] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const feedRef = useRef(null);
  const inputRef = useRef(null);

  const fetchShiftInfo = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingShift(true);
      const res = await fetch(API_BASE_URL + '/api/users/shift/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.session) {
        setCurrentShift(data.session);
      } else {
        setCurrentShift(null);
      }
    } catch (err) {
      setCurrentShift(null);
    } finally {
      setLoadingShift(false);
    }
  }, [token]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setSessionId('agent_ai_session_' + Math.random().toString(36).substring(2, 9));
    fetchShiftInfo();
  }, [fetchShiftInfo]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleSendMessage = async (textToSend) => {
    const content = typeof textToSend === 'string' ? textToSend : inputText;
    if (!content.trim() || sending) return;

    const userMessage = {
      sender: 'user',
      text: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    try {
      const historyContext = messages
        .filter((_, idx) => idx > 0)
        .map(msg => ({
          sender: msg.sender,
          text: msg.text
        }));

      const res = await fetch(API_BASE_URL + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.text,
          sessionId,
          history: historyContext,
          source: 'staff_agent',
          role: 'ticket_agent'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const cleanText = (data.text || '')
          .replace(/\s*[\(\[]\s*(?:ID|Mã\s*(?:chuyến|ID|vé)?)\s*:\s*[0-9a-fA-F]{24}\s*[\)\]]/gi, '')
          .replace(/\s*(?:ID|Mã\s*(?:chuyến|ID|vé)?)\s*:\s*[0-9a-fA-F]{24}/gi, '')
          .replace(/\s*[\(\[]\s*[0-9a-fA-F]{24}\s*[\)\]]/g, '')
          .replace(/\b[0-9a-fA-F]{24}\b/g, '')
          .replace(/\(\s*\)/g, '')
          .replace(/\[\s*\]/g, '')
          .replace(/\s+([.,;:!?])/g, '$1')
          .trim();

        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: cleanText,
          timestamp: new Date(data.timestamp || new Date())
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: 'Xin lỗi, trợ lý AI hiện đang bận xử lý dữ liệu. Vui lòng hỏi lại sau giây lát hoặc tra cứu sổ tay quy định bên phải.',
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền hoặc liên hệ bộ phận hỗ trợ kỹ thuật.',
        timestamp: new Date()
      }]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        sender: 'assistant',
        text: 'Hội thoại đã được làm mới. Tôi sẵn sàng hỗ trợ tra cứu các quy định và nghiệp vụ bán vé mới.',
        timestamp: new Date()
      }
    ]);
    setSessionId('agent_ai_session_' + Math.random().toString(36).substring(2, 9));
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.35s ease', width: '100%' }}>
      <style>{`
        .ai-page-box {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          margin-bottom: 0.65rem;
        }

        .ai-workspace-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 10px;
          align-items: start;
        }

        .ai-chat-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 205px);
          min-height: 480px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          overflow: hidden;
        }

        .ai-messages-feed {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ai-sidebar-card {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 1.15rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (max-width: 1024px) {
          .ai-workspace-layout {
            grid-template-columns: 1fr;
          }
          .ai-chat-card {
            height: 600px;
          }
        }

        @media (max-width: 768px) {
          .ai-chat-card {
            height: calc(100vh - 240px);
            min-height: 480px;
          }
          .ai-messages-feed {
            padding: 0.85rem 0.65rem;
          }
        }
      `}</style>

      {/* ========================================================= */}
      {/* VÙNG 1: HEADER QUẢN TRỊ TRỢ LÝ AI                          */}
      {/* ========================================================= */}
      <div className="ai-page-box" style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Trợ Lý Số &amp; Tư Vấn Nghiệp Vụ AI
              </h1>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Hỗ Trợ Quầy 24/7
              </span>
              <span style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                Dữ Liệu Nội Bộ
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '3px', margin: 0 }}>
              Hệ thống trí tuệ nhân tạo hỗ trợ nhân viên tra cứu lịch trình chuyến xe, giá vé niêm yết và quy định hủy vé.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              color: '#059669',
              background: '#ecfdf5',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #a7f3d0'
            }}>
              Hệ thống sẵn sàng
            </span>
            <button
              onClick={handleResetChat}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.42rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              Làm mới hội thoại
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VÙNG 2: GIAO DIỆN CHÍNH 2 CỘT (CHAT + SỔ TAY QUY ĐỊNH)     */}
      {/* ========================================================= */}
      <div className="ai-workspace-layout">
        {/* CỘT TRÁI: KHUNG HỘI THOẠI AI TẬP TRUNG */}
        <div className="ai-chat-card">
          {/* Thanh tiêu đề con của khung chat */}
          <div style={{
            padding: '0.75rem 1.25rem',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                TRỢ LÝ AI
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>
                Hội Thoại Nghiệp Vụ Bán Vé
              </span>
            </div>
          </div>

          {/* Danh sách tin nhắn */}
          <div className="ai-messages-feed" ref={feedRef}>
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  {/* Nhãn người gửi & thời gian */}
                  <div style={{
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    color: '#64748b',
                    marginBottom: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      color: isUser ? '#2563eb' : '#047857',
                      background: isUser ? '#eff6ff' : '#ecfdf5',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      {isUser ? 'Nhân Viên Quầy' : 'Trợ Lý AI An Bình'}
                    </span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Bong bóng tin nhắn */}
                  <div
                    style={{
                      maxWidth: '82%',
                      background: isUser ? '#2563eb' : '#ffffff',
                      color: isUser ? '#ffffff' : '#0f172a',
                      padding: '0.85rem 1.15rem',
                      borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      border: isUser ? 'none' : '1px solid #e2e8f0',
                      lineHeight: '1.55',
                      fontSize: '0.85rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  color: '#047857',
                  marginBottom: '3px',
                  background: '#ecfdf5',
                  padding: '1px 6px',
                  borderRadius: '4px'
                }}>
                  Trợ Lý AI An Bình
                </div>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '0.65rem 1rem',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: '700'
                }}>
                  Hệ thống AI đang tra cứu dữ liệu &amp; soạn câu trả lời...
                </div>
              </div>
            )}
          </div>

          {/* Form nhập liệu tin nhắn */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            style={{
              padding: '0.85rem 1.25rem',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Nhập câu hỏi tra cứu chuyến xe, giá vé, chính sách hoàn hủy... (Nhấn Enter để gửi)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              style={{
                flex: 1,
                padding: '0.65rem 0.95rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                background: '#ffffff',
                color: '#0f172a'
              }}
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              style={{
                backgroundColor: sending || !inputText.trim() ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: sending || !inputText.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.15s ease'
              }}
            >
              {sending ? 'Đang gửi...' : 'Gửi câu hỏi'}
            </button>
          </form>
        </div>

        {/* CỘT PHẢI: SỔ TAY NGHIỆP VỤ & QUY ĐỊNH BÁN VÉ THỰC TẾ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Card 1: Thông tin phiên trực quầy thực tế */}
          <div className="ai-sidebar-card">
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a' }}>
                Thông Tin Trực Quầy
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Dữ liệu phiên làm việc thực tế từ hệ thống
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nhân viên:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{user?.name || currentShift?.userId?.name || 'Nhân Viên Bán Vé'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Văn phòng trực:</span>
                <span style={{ fontWeight: '700', color: '#2563eb' }}>
                  {currentShift?.location || user?.assignedOffice || user?.branch || 'Văn phòng chi nhánh'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>Trạng thái ca:</span>
                {loadingShift ? (
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Đang tải...</span>
                ) : currentShift ? (
                  <span style={{ fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>
                    Đang trong ca trực
                  </span>
                ) : (
                  <span style={{ fontWeight: '700', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                    Chưa mở ca trực
                  </span>
                )}
              </div>
              {currentShift && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Giờ mở ca:</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {currentShift.startTime ? new Date(currentShift.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Tiền két nhận bàn giao:</span>
                    <span style={{ fontWeight: '700', color: '#047857' }}>
                      {(currentShift.initialCash || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Quy chuẩn nghiệp vụ cốt lõi chuẩn xác */}
          <div className="ai-sidebar-card">
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a' }}>
                Quy Chuẩn Nghiệp Vụ Cốt Lõi
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Quy chế vận tải &amp; bán vé An Bình Lines
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.72rem' }}>
              {/* Mục 1: Chính sách hoàn hủy vé */}
              <div style={{ background: '#f8fafc', padding: '9px 11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '800', color: '#1e40af', marginBottom: '3px' }}>
                  Chính sách Hoàn / Hủy vé
                </div>
                <div style={{ color: '#475569', lineHeight: '1.45' }}>
                  - <strong>Trước giờ chạy &gt;= 5 ngày (120h)</strong>: Hoàn 100% giá vé (hoàn Điểm Tích Lũy hoặc tiền mặt tại quầy).<br/>
                  - <strong>Dưới 5 ngày trước giờ chạy</strong>: Tuyệt đối không hỗ trợ hoàn hoặc hủy vé.
                </div>
              </div>

              {/* Mục 2: Quy chuẩn giá vé & vị trí ghế */}
              <div style={{ background: '#f8fafc', padding: '9px 11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '3px' }}>
                  Quy Chuẩn Giá Vé &amp; Vị Trí Ghế
                </div>
                <div style={{ color: '#475569', lineHeight: '1.45' }}>
                  - Giá vé áp dụng đồng nhất theo giá niêm yết của từng chuyến và vị trí ghế hành khách chọn trên sơ đồ.<br/>
                  - Hệ thống không áp dụng chính sách vé ưu tiên hay giảm giá riêng.
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Đường dây liên hệ nội bộ chính thức */}
          <div className="ai-sidebar-card">
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              Đường Dây Hỗ Trợ Nội Bộ
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div>Tổng đài CSKH &amp; Đặt vé: <strong style={{ color: '#2563eb' }}>1900 6067</strong> (24/7)</div>
              <div>Bộ phận Kỹ thuật &amp; Vận hành nội bộ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentAIPage;
