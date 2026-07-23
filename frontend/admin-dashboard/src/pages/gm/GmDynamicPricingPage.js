import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const GmDynamicPricingPage = () => {
  const { token } = useContext(AuthContext);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'unset', 'set'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBasePrices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pricing/base-prices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCombos(data.basePrices || []);
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
        showToast(`Đã duyệt giá cho tuyến ${combo.routeName} - ${combo.busType}!`);
        fetchBasePrices();
      } else {
        showToast(data.message || 'Lỗi duyệt giá vé.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  const handleApplyAll = async () => {
    const targets = combos.filter(c => filterStatus === 'unset' ? !c.isSet : true);
    if (targets.length === 0) {
      showToast('Không có cấu hình nào cần duyệt.', 'warning');
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
      showToast(`Đã duyệt và áp dụng thành công ${successCount}/${targets.length} gợi ý giá vé!`);
      fetchBasePrices();
    } catch {
      showToast('Lỗi kết nối máy chủ trong quá trình áp dụng hàng loạt.', 'error');
    }
  };

  const getFilteredCombos = () => {
    return combos.filter(combo => {
      const matchSearch = 
        combo.routeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        combo.busType.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'set' && combo.isSet) || 
        (filterStatus === 'unset' && !combo.isSet);

      return matchSearch && matchStatus;
    });
  };

  const filtered = getFilteredCombos();
  const totalCombos = combos.length;
  const setCombosCount = combos.filter(c => c.isSet).length;
  const unsetCombosCount = totalCombos - setCombosCount;

  return (
    <div style={{ minHeight: '400px' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="panel" style={{ padding: '20px', border: '1px solid #bfdbfe', borderRadius: '12px', background: '#eff6ff' }}>
          <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: '600' }}>TỔNG SỐ TỔ HỢP</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1d4ed8', marginTop: '8px' }}>{totalCombos}</div>
        </div>
        <div className="panel" style={{ padding: '20px', border: '1px solid #bbf7d0', borderRadius: '12px', background: '#f0fdf4' }}>
          <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '600' }}>ĐÃ THIẾT LẬP GIÁ</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#15803d', marginTop: '8px' }}>{setCombosCount}</div>
        </div>
        <div className="panel" style={{ padding: '20px', border: '1px solid #fecaca', borderRadius: '12px', background: '#fff5f5' }}>
          <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '600' }}>CHƯA THIẾT LẬP GIÁ</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#b91c1c', marginTop: '8px' }}>
            {unsetCombosCount} {unsetCombosCount > 0 && <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#dc2626' }}>(Cần xử lý)</span>}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <input 
            type="text" 
            placeholder="Tìm kiếm tuyến đường hoặc loại xe..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ maxWidth: '300px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}
          />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-control"
            style={{ maxWidth: '180px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="unset">Chưa thiết lập giá</option>
            <option value="set">Đã thiết lập giá</option>
          </select>
        </div>
        <div>
          <button 
            onClick={handleApplyAll} 
            className="btn btn-primary"
            style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
          >
            Duyệt & Áp dụng tất cả gợi ý
          </button>
        </div>
      </div>

      {/* Recommended Pricing Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu gợi ý giá vé...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Không tìm thấy tổ hợp cấu hình nào phù hợp.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f1f5f9' }}>
                <th style={{ padding: '12px 16px' }}>Tuyến đường</th>
                <th style={{ padding: '12px 16px' }}>Loại xe</th>
                <th style={{ padding: '12px 16px' }}>Cự ly / Thời gian</th>
                <th style={{ padding: '12px 16px' }}>Giá hiện tại</th>
                <th style={{ padding: '12px 16px' }}>Giá gợi ý tự động (AI)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((combo, idx) => {
                const isLimousine = combo.busType.toLowerCase().includes('limousine');
                const isSleeper = combo.busType.toLowerCase().includes('giường nằm');
                const is45Seats = combo.busType.toLowerCase().includes('45 chỗ');
                const is29Seats = combo.busType.toLowerCase().includes('29 chỗ');
                
                let formulaDesc = '1.000 đ/km (Mặc định)';
                if (isLimousine) formulaDesc = '1.700 đ/km (Hạng sang)';
                else if (isSleeper) formulaDesc = '1.200 đ/km (Giường nằm)';
                else if (is45Seats) formulaDesc = '700 đ/km (Ghế ngồi lớn)';
                else if (is29Seats) formulaDesc = '750 đ/km (Ghế ngồi vừa)';
                else if (combo.busType.toLowerCase().includes('16 chỗ') || combo.busType.toLowerCase().includes('ghế ngồi')) {
                  formulaDesc = '800 đ/km (Ghế ngồi nhỏ)';
                }

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', height: '65px' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--primary)' }}>
                      {combo.routeName}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>
                      {combo.busType}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{combo.distance || 'N/A'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{combo.duration || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {combo.isSet ? (
                        <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                          {combo.price.toLocaleString('vi-VN')} đ
                        </span>
                      ) : (
                        <span style={{ color: '#f97316', background: '#ffedd5', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                          Chưa thiết lập
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--accent)' }}>
                        {combo.recommendedPrice.toLocaleString('vi-VN')} đ
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Cơ sở: {formulaDesc}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleApplyPrice(combo, combo.recommendedPrice)}
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                      >
                        {combo.isSet ? 'Cập nhật gợi ý' : 'Duyệt & Áp dụng'}
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
  );
};

export default GmDynamicPricingPage;
