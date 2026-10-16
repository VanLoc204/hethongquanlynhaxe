import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const QUICK_PROMPTS = [
  'Chính sách đổi trả vé ngày thường và dịp Lễ Tết',
  'Quy định cân nặng và kích thước hành lý gửi gầm',
  'Chính sách vé cho trẻ em và người lớn tuổi',
  'Thủ tục hỗ trợ hành khách đổi chuyến giờ chót',
  'Quy định vận chuyển thú cưng và xe máy kèm theo',
  'Quy định đón trả khách tại các trạm trung chuyển'
];

const AgentAIPage = () => {
  const { token, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: 'Xin chào anh/chị. Tôi là Trợ Lý Số An Bình AI hỗ trợ nghiệp vụ bán vé và điều hành quầy. Anh/chị cần tra cứu giá vé, chính sách hoàn hủy, quy định hành lý, thủ tục đổi vé hay quy chế vận tải nào của nhà xe không ạ?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sending, setSending] = useState(false);
  const feedRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setSessionId('agent_ai_session_' + Math.random().toString(36).substring(2, 9));
  }, []);

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

      const res = await fetch('http://localhost:8000/api/v1/reviews/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.text,
          sessionId,
          history: historyContext
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: data.text,
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
        text: 'Đoạn hội thoại đã được làm mới. Tôi sẵn sàng hỗ trợ anh/chị tra cứu các quy định và nghiệp vụ bán vé mới.',
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

        .ai-prompt-chip {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #1e293b;
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .ai-prompt-chip:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
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
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                An Bình AI 2.0
              </span>
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
              Hệ thống trí tuệ nhân tạo hỗ trợ tra cứu chính sách vé, giá cước, lịch trình xe, quy định hành lý và thủ tục đổi/trả vé.
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
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600' }}>
              Phiên: {sessionId ? sessionId.substring(0, 16) : 'Đang khởi tạo'}
            </span>
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

          {/* Vùng gợi ý câu hỏi nhanh (Prompt Chips) */}
          <div style={{
            padding: '8px 1.25rem',
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#64748b', alignSelf: 'center', whiteSpace: 'nowrap' }}>
              Gợi ý nhanh:
            </span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-prompt-chip"
                onClick={() => handleSendMessage(prompt)}
                disabled={sending}
              >
                {prompt}
              </button>
            ))}
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
              placeholder="Nhập câu hỏi nghiệp vụ bán vé, hoàn hủy, hành lý... (Nhấn Enter để gửi)"
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

        {/* CỘT PHẢI: SỔ TAY NGHIỆP VỤ & QUY ĐỊNH BÁN VÉ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Card 1: Thông tin phiên trực quầy */}
          <div className="ai-sidebar-card">
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a' }}>
                Thông Tin Trực Quầy
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Phiên làm việc nhân viên bán vé
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Nhân viên:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{user?.name || 'Nhân Viên Bán Vé'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Vị trí trực:</span>
                <span style={{ fontWeight: '700', color: '#2563eb' }}>Quầy Số 01 - BXMĐ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Ca làm việc:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>Hành chính 8h (08:00 - 17:00)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Trạng thái:</span>
                <span style={{ fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px' }}>
                  Đang trong ca trực
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Tóm tắt quy định nghiệp vụ cốt lõi */}
          <div className="ai-sidebar-card">
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a' }}>
                Quy Chuẩn Nghiệp Vụ Cốt Lõi
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                Tóm tắt quy tắc áp dụng cho khách tại quầy
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.72rem' }}>
              {/* Mục 1: Đổi trả vé */}
              <div style={{ background: '#f8fafc', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '800', color: '#1e40af', marginBottom: '2px' }}>
                  Đổi / Trả vé ngày thường
                </div>
                <div style={{ color: '#475569', lineHeight: '1.4' }}>
                  - Trước giờ xuất bến 24h: Phí 10% giá vé.<br/>
                  - Trước 12h - 24h: Phí 20% giá vé.<br/>
                  - Dưới 12h: Không áp dụng hoàn hủy.
                </div>
              </div>

              {/* Mục 2: Vé Lễ Tết */}
              <div style={{ background: '#f8fafc', padding: '7px 9px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '800', color: '#b45309', marginBottom: '2px' }}>
                  Đổi / Trả vé dịp Tết &amp; Lễ lớn
                </div>
                <div style={{ color: '#475569', lineHeight: '1.4' }}>
                  - Trước giờ khởi hành 48h: Khấu trừ 30%.<br/>
                  - Trong vòng 48h trước giờ chạy: Không hoàn vé.
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Đường dây liên hệ nội bộ */}
          <div className="ai-sidebar-card">
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
              Đường Dây Hỗ Trợ Nội Bộ
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div>Tổng đài nhà xe: <strong style={{ color: '#2563eb' }}>1900 6868</strong></div>
              <div>Trực ban Bến Xe Miền Đông: <strong style={{ color: '#0f172a' }}>028 3899 1607</strong></div>
              <div>Hỗ trợ kỹ thuật phần mềm: <strong style={{ color: '#0f172a' }}>0912.345.678</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentAIPage;
