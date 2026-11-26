import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api';

const GmDynamicPricingPage = () => {
  const { token } = useContext(AuthContext);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'unset', 'set'
  const [aiConfidence, setAiConfidence] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 7;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBasePrices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pricing/dynamic-suggestions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCombos(data.suggestions || data.basePrices || []);
      } else {
        showToast(data.message || 'Lỗi tải gợi ý giá vé.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBasePrices();
    }
  }, [token]);

  const handleApplyPrice = async (combo, applyPrice) => {
    try {
      const res = await fetch(`${API_BASE}/pricing/base-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          routeId: combo.routeId,
          routeName: combo.routeName,
          busType: combo.busType,
          price: applyPrice
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã duyệt & áp dụng giá AI (${applyPrice.toLocaleString('vi-VN')} đ) cho tuyến ${combo.routeName}!`);
        fetchBasePrices();
      } else {
        showToast(data.message || 'Lỗi duyệt giá vé.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleRejectPrice = (combo) => {
    showToast(`Đã từ chối gợi ý giá cho tuyến ${combo.routeName} (${combo.busType})`, 'warning');
  };

  const handleApplyAll = async () => {
    const targets = combos.filter(c => filterStatus === 'unset' ? !c.isSet : true);
    if (targets.length === 0) {
      showToast('Không có cấu hình gợi ý nào cần duyệt.', 'warning');
      return;
    }

    let successCount = 0;
    try {
      for (const combo of targets) {
        const res = await fetch(`${API_BASE}/pricing/base-prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            routeId: combo.routeId,
            routeName: combo.routeName,
            busType: combo.busType,
            price: combo.recommendedPrice
          })
        });
        const data = await res.json();
        if (data.success) successCount++;
      }
      showToast(`Đã duyệt & áp dụng thành công ${successCount}/${targets.length} gợi ý giá AI vào MongoDB!`);
      fetchBasePrices();
    } catch {
      showToast('Lỗi kết nối máy chủ khi áp dụng hàng loạt.', 'error');
    }
  };

  const filteredCombos = combos.filter(combo => {
    const matchSearch = 
      combo.routeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      combo.busType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'set' && combo.isSet) || 
      (filterStatus === 'unset' && !combo.isSet);

    return matchSearch && matchStatus;
  });

  const totalCombos = combos.length;
  const setCombosCount = combos.filter(c => c.isSet).length;
  const unsetCombosCount = totalCombos - setCombosCount;

  // Pagination calculations
  const totalFiltered = filteredCombos.length;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCombos = filteredCombos.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          fontWeight: '700', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', fontSize: '0.875rem'
        }}>
          {toast.msg}
        </div>
      )}

      {/* 1. TOP STAT CARDS FOR AI SUGGESTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TỔ HỢP ĐANG VẬN HÀNH</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#2563eb', marginTop: '4px' }}>{totalCombos}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Đánh giá các chuyến chạy đến hiện tại</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ĐÃ THIẾT LẬP GIÁ</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#059669', marginTop: '4px' }}>{setCombosCount}</div>
            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
              {totalCombos > 0 ? Math.round((setCombosCount / totalCombos) * 100) : 100}% tổ hợp có giá niêm yết
            </div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CHƯA THIẾT LẬP GIÁ</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: unsetCombosCount > 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>{unsetCombosCount}</div>
            <div style={{ fontSize: '0.7rem', color: unsetCombosCount > 0 ? '#dc2626' : '#64748b', fontWeight: '600', marginTop: '2px' }}>
              {unsetCombosCount === 0 ? 'Không phát hiện tổ hợp trống' : 'Cần xử lý phê duyệt'}
            </div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DOANH THU DỰ PHÒNG AI</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#7c3aed', marginTop: '4px' }}>
              +14.6% <span style={{ fontSize: '0.7rem', backgroundColor: '#faf5ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '10px', fontWeight: '800', border: '1px solid #e9d5ff' }}>Tối ưu</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Dựa trên cân bằng tải và giá dầu</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>

      </div>

      {/* 2. SEARCH & FILTER CONTROLS BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
          
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm tuyến đường hoặc loại xe..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.825rem',
                border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: '#ffffff'
              }}
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', fontWeight: '600', outline: 'none' }}
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="unset">Chưa thiết lập giá</option>
            <option value="set">Đã thiết lập giá</option>
          </select>

        </div>

        <button 
          onClick={handleApplyAll}
          style={{
            backgroundColor: '#7c3aed', color: '#ffffff', border: 'none',
            padding: '9px 18px', borderRadius: '8px', fontSize: '0.825rem', fontWeight: '800',
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.25)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Duyệt &amp; Áp dụng tất cả gợi ý
        </button>
      </div>

      {/* 3. AI SUGGESTIONS DATA TABLE */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang phân tích và tải gợi ý giá vé từ AI...</div>
      ) : paginatedCombos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Không tìm thấy tổ hợp gợi ý nào phù hợp.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.725rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>TUYẾN ĐƯỜNG</th>
                <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>LOẠI XE</th>
                <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>CỰ LY / THỜI GIAN</th>
                <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>GIÁ HIỆN TẠI</th>
                <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>GIÁ GỢI Ý TỰ ĐỘNG (AI)</th>
                <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>PHÂN TÍCH &amp; KHUYẾN NGHỊ</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.85rem' }}>
              {paginatedCombos.map((combo, idx) => {
                const isLimo = combo.busType.toLowerCase().includes('limousine');
                const isSleeper = combo.busType.toLowerCase().includes('giường nằm');
                const isSet = combo.isSet;

                let formulaDesc = '1.000 đ/km (Mặc định)';
                if (isLimo) formulaDesc = '1.700 đ/km (Hạng sang)';
                else if (isSleeper) formulaDesc = '1.200 đ/km (Giường nằm)';
                else if (combo.busType.toLowerCase().includes('45 chỗ')) formulaDesc = '700 đ/km (Ghế ngồi lớn)';
                else if (combo.busType.toLowerCase().includes('29 chỗ')) formulaDesc = '750 đ/km (Ghế ngồi vừa)';
                else if (combo.busType.toLowerCase().includes('16 chỗ') || combo.busType.toLowerCase().includes('ghế ngồi')) formulaDesc = '800 đ/km (Ghế ngồi nhỏ)';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '800', color: '#2563eb' }}>{combo.routeName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                        {combo.tripsCount || 0} chuyến tính đến hiện tại
                      </div>
                    </td>

                    <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {combo.busType}
                    </td>

                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a' }}>{combo.distance || '172km'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{combo.duration || '3 giờ'}</div>
                    </td>

                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      {isSet ? (
                        <div style={{ fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {combo.price.toLocaleString('vi-VN')} đ
                        </div>
                      ) : (
                        <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '6px', fontSize: '0.725rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                          Chưa thiết lập
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#7c3aed' }}>
                          {combo.recommendedPrice.toLocaleString('vi-VN')} đ
                        </span>
                        {combo.diffPercent !== undefined && combo.diffPercent !== 0 ? (
                          <span style={{
                            fontSize: '0.675rem',
                            color: combo.diffPercent > 0 ? '#16a34a' : '#ea580c',
                            backgroundColor: combo.diffPercent > 0 ? '#dcfce7' : '#ffedd5',
                            padding: '1px 6px',
                            borderRadius: '6px',
                            fontWeight: '800'
                          }}>
                            {combo.diffPercent > 0 ? `+${combo.diffPercent}%` : `${combo.diffPercent}%`}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.675rem', color: '#64748b', fontWeight: '700' }}>0%</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.675rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Cơ sở: {formulaDesc}
                      </div>
                    </td>

                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        backgroundColor: (combo.analysisRecommendation && combo.analysisRecommendation.includes('⚠️')) ? '#fff7ed' : '#f0fdf4',
                        color: (combo.analysisRecommendation && combo.analysisRecommendation.includes('⚠️')) ? '#c2410c' : '#166534',
                        border: (combo.analysisRecommendation && combo.analysisRecommendation.includes('⚠️')) ? '1px solid #fed7aa' : '1px solid #bbf7d0',
                        padding: '4px 10px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: '700',
                        whiteSpace: 'nowrap', display: 'inline-block'
                      }}>
                        {combo.analysisRecommendation || '✓ Giá đã tối ưu cho tỷ lệ lấp đầy'}
                      </span>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button 
                          onClick={() => handleApplyPrice(combo, combo.recommendedPrice)}
                          style={{
                            backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
                            padding: '6px 14px', borderRadius: '6px', fontSize: '0.775rem', fontWeight: '700',
                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(37,99,235,0.2)', whiteSpace: 'nowrap'
                          }}
                        >
                          Duyệt
                        </button>

                        <button 
                          onClick={() => handleRejectPrice(combo)}
                          style={{
                            backgroundColor: '#ffffff', color: '#dc2626', border: '1px solid #fca5a5',
                            padding: '6px 12px', borderRadius: '6px', fontSize: '0.775rem', fontWeight: '700',
                            cursor: 'pointer', whiteSpace: 'nowrap'
                          }}
                        >
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. FOOTER PAGINATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
        <div>
          Hiển thị {startIndex + 1} - {Math.min(startIndex + pageSize, totalFiltered)} trên tổng số {totalFiltered} tổ hợp đang vận hành
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
          >
            &lt; Trước
          </button>
          <button style={{ padding: '4px 10px', border: '1px solid #2563eb', borderRadius: '6px', background: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.75rem' }}>
            {currentPage}
          </button>
          <button 
            disabled={startIndex + pageSize >= totalFiltered}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', cursor: (startIndex + pageSize >= totalFiltered) ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
          >
            Sau &gt;
          </button>
        </div>
      </div>

    </div>
  );
};

export default GmDynamicPricingPage;
