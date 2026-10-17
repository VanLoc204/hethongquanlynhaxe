import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import {
  loadFaceApiModels,
  startWebcam,
  stopWebcam,
  detectFaceAndExtractDescriptor,
  drawDetectionBox,
  clearCanvas
} from '../../utils/faceApiHelper';

const API_BASE = 'http://localhost:8000/api/v1';

const ManagerAttendancePage = () => {
  const { token, user } = useContext(AuthContext);
  const isOpsManager = user?.role === 'ops_manager';

  // State dữ liệu chấm công
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({
    totalScheduled: 0,
    activeDirect: 0,
    closedShift: 0,
    absent: 0,
    scheduled: 0,
    faceRegisteredCount: 0
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Bộ lọc & Phân trang
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // State Modal Đăng Ký Khuôn Mặt (Face Enrollment)
  const [enrollModalUser, setEnrollModalUser] = useState(null);
  const [enrollModelsReady, setEnrollModelsReady] = useState(false);
  const [enrollCameraActive, setEnrollCameraActive] = useState(false);
  const [enrollSamples, setEnrollSamples] = useState([]); // Mảng các vector [128D]
  const [enrollCapturing, setEnrollCapturing] = useState(false);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState(null);

  const modalVideoRef = useRef(null);
  const modalCanvasRef = useRef(null);
  const modalStreamRef = useRef(null);
  const modalScanLoopRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Tải dữ liệu chấm công từ API Backend
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/attendance/today?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAttendanceData(data.attendance || []);
        setStats(
          data.stats || {
            totalScheduled: 0,
            activeDirect: 0,
            closedShift: 0,
            absent: 0,
            scheduled: 0,
            faceRegisteredCount: 0
          }
        );
      } else {
        setError(data.message || 'Không thể tải báo cáo chấm công.');
      }
    } catch (err) {
      console.error('[fetchAttendance Error]:', err);
      setError('Lỗi kết nối máy chủ khi tải bảng chấm công.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, token]);

  useEffect(() => {
    if (token) {
      fetchAttendance();
    }
  }, [token, fetchAttendance]);

  // 2. Lọc danh sách nhân sự
  const filteredData = attendanceData.filter((item) => {
    const matchRole = filterRole === 'all' || item.role === filterRole;
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery);
    return matchRole && matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 3. Xử lý Modal Face Enrollment (Đăng ký khuôn mặt cho nhân viên)
  const openEnrollModal = async (staff) => {
    setEnrollModalUser(staff);
    setEnrollSamples([]);
    setEnrollError('');
    setEnrollCapturing(false);

    try {
      await loadFaceApiModels();
      setEnrollModelsReady(true);
      setTimeout(async () => {
        try {
          if (modalVideoRef.current) {
            const stream = await startWebcam(modalVideoRef.current);
            modalStreamRef.current = stream;
            setEnrollCameraActive(true);
          }
        } catch (e) {
          setEnrollError('Không thể mở Camera để quét khuôn mặt. Vui lòng cấp quyền webcam.');
        }
      }, 200);
    } catch (err) {
      setEnrollError('Không thể nạp mô hình AI: ' + err.message);
    }
  };

  const closeEnrollModal = () => {
    if (modalScanLoopRef.current) {
      cancelAnimationFrame(modalScanLoopRef.current);
      modalScanLoopRef.current = null;
    }
    if (modalStreamRef.current) {
      stopWebcam(modalStreamRef.current);
      modalStreamRef.current = null;
    }
    clearCanvas(modalCanvasRef.current);
    setEnrollCameraActive(false);
    setEnrollModalUser(null);
    setEnrollSamples([]);
  };

  // Quét và vẽ khung nhận diện trong Modal
  useEffect(() => {
    let active = true;

    const runModalScan = async () => {
      if (!active || !enrollCameraActive || !modalVideoRef.current || !modalCanvasRef.current) return;

      if (modalVideoRef.current.readyState === 4) {
        try {
          const { detection } = await detectFaceAndExtractDescriptor(modalVideoRef.current);
          if (active && modalCanvasRef.current && modalVideoRef.current) {
            if (detection) {
              drawDetectionBox(
                modalCanvasRef.current,
                modalVideoRef.current,
                detection,
                'Khuôn mặt rõ ràng',
                '#2563eb',
                true
              );
            } else {
              clearCanvas(modalCanvasRef.current);
            }
          }
        } catch (e) {}
      }

      if (active && enrollCameraActive) {
        modalScanLoopRef.current = requestAnimationFrame(runModalScan);
      }
    };

    if (enrollCameraActive && enrollModelsReady) {
      runModalScan();
    }

    return () => {
      active = false;
      if (modalScanLoopRef.current) cancelAnimationFrame(modalScanLoopRef.current);
    };
  }, [enrollCameraActive, enrollModelsReady]);

  // Chụp mẫu khuôn mặt (Sample Capture)
  const captureFaceSample = async () => {
    if (!modalVideoRef.current) return;
    setEnrollCapturing(true);
    setEnrollError('');

    try {
      const { descriptor } = await detectFaceAndExtractDescriptor(modalVideoRef.current);
      if (!descriptor) {
        setEnrollError('Không phát hiện thấy khuôn mặt. Vui lòng nhìn thẳng vào camera!');
      } else {
        setEnrollSamples((prev) => [...prev, descriptor]);
        showToast(`Đã thu thập mẫu ${enrollSamples.length + 1}/3 thành công!`, 'success');
      }
    } catch (err) {
      setEnrollError('Lỗi trích xuất khuôn mặt: ' + err.message);
    } finally {
      setEnrollCapturing(false);
    }
  };

  // Lưu đăng ký khuôn mặt vào Database
  const saveFaceRegistration = async () => {
    if (enrollSamples.length === 0) {
      setEnrollError('Vui lòng chụp ít nhất 1 mẫu khuôn mặt!');
      return;
    }

    setEnrollSubmitting(true);
    setEnrollError('');

    try {
      const res = await fetch(`${API_BASE}/attendance/register-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: enrollModalUser.userId,
          faceDescriptors: enrollSamples
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message, 'success');
        closeEnrollModal();
        fetchAttendance();
      } else {
        setEnrollError(data.message || 'Không thể đăng ký khuôn mặt.');
      }
    } catch (err) {
      setEnrollError('Lỗi máy chủ khi lưu khuôn mặt.');
    } finally {
      setEnrollSubmitting(false);
    }
  };

  // Xuất file Excel giả lập
  const exportExcel = () => {
    alert(`Đã xuất báo cáo chấm công ngày ${selectedDate} ra định dạng Excel thành công!`);
  };

  return (
    <div style={{ animation: 'fadeIn 0.25s ease', maxWidth: '1440px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      
      {/* Toast thông báo */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '10px',
            backgroundColor: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: toast.type === 'success' ? '#047857' : '#b91c1c',
            border: `1.5px solid ${toast.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
            fontWeight: '700',
            fontSize: '0.85rem'
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Top Header & Date Picker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
              {isOpsManager ? 'Giám Sát Chấm Công Tổ Lái' : 'Bảng Theo Dõi Chấm Công'}
            </h1>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
              Dữ Liệu Thật 100%
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Theo dõi thời gian check-in/out, tọa độ GPS bến xe và xác thực nhận diện khuôn mặt Face ID của tài xế & phụ xe.
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Ngày:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', outline: 'none', fontWeight: '700', color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer' }}
            />
          </div>

          <button
            onClick={exportExcel}
            style={{
              backgroundColor: '#ffffff', color: '#334155', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Xuất Excel
          </button>

          <button
            onClick={fetchAttendance}
            style={{
              backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', fontSize: '0.825rem',
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* KPI Stats Cards (5 cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Card 1: Tổng số */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b' }}>TỔNG SỐ TỔ LÁI</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px 0' }}>
            {stats.totalScheduled} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>nhân viên</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Tài xế & Phụ xe hoạt động</span>
        </div>

        {/* Card 2: Đang trực */}
        <div style={{ background: '#ffffff', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(16,185,129,0.05)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#047857' }}>ĐANG TRONG CA</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#059669', margin: '4px 0 2px 0' }}>
            {stats.activeDirect} <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '600' }}>đang chạy</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#059669', fontWeight: '600' }}>Đã check-in khuôn mặt</span>
        </div>

        {/* Card 3: Hoàn thành tan ca */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#64748b' }}>ĐÃ HOÀN THÀNH CA</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#334155', margin: '4px 0 2px 0' }}>
            {stats.closedShift} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>người</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Đã check-out chốt giờ</span>
        </div>

        {/* Card 4: Chưa check-in / Vắng mặt */}
        <div style={{ background: '#ffffff', border: '1.5px solid #fecdd3', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(239,68,68,0.05)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#b91c1c' }}>CHƯA VÀO CA / VẮNG</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#dc2626', margin: '4px 0 2px 0' }}>
            {stats.scheduled + stats.absent} <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: '600' }}>chưa check-in</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#dc2626', fontWeight: '600' }}>Cần theo dõi sát giờ chạy</span>
        </div>

        {/* Card 5: Đã đăng ký Face ID */}
        <div style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '0.725rem', fontWeight: '800', color: '#1d4ed8' }}>ĐÃ ĐĂNG KÝ FACE ID</span>
          <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#2563eb', margin: '4px 0 2px 0' }}>
            {stats.faceRegisteredCount} <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: '600' }}>/ {stats.totalScheduled}</span>
          </div>
          <span style={{ fontSize: '0.725rem', color: '#2563eb', fontWeight: '600' }}>
            Tỷ lệ: {stats.totalScheduled > 0 ? Math.round((stats.faceRegisteredCount / stats.totalScheduled) * 100) : 0}%
          </span>
        </div>

      </div>

      {/* Main Table Panel */}
      <section style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Bộ lọc Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          
          {/* Ô tìm kiếm */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Tìm tên hoặc SĐT nhân viên..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none'
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
              🔍
            </span>
          </div>

          {/* Lọc Role & Status */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem', fontWeight: '600', color: '#334155' }}
            >
              <option value="all">Tất cả chức danh</option>
              <option value="driver">Tài xế (Driver)</option>
              <option value="attendant">Phụ xe (Attendant)</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem', fontWeight: '600', color: '#334155' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang trong ca trực</option>
              <option value="closed">Đã hoàn thành tan ca</option>
              <option value="scheduled">Chưa vào ca</option>
              <option value="absent">Vắng mặt</option>
            </select>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Bảng dữ liệu chấm công */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#2563eb', fontWeight: '600' }}>
            Đang tải dữ liệu chấm công thời gian thực...
          </div>
        ) : paginatedData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            Không tìm thấy nhân viên nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.725rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>NHÂN VIÊN</th>
                  <th style={{ padding: '0.85rem 1rem' }}>VAI TRÒ</th>
                  <th style={{ padding: '0.85rem 1rem' }}>TRẠNG THÁI CA</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>GIỜ VÀO</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>GIỜ TAN</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ĐỊA ĐIỂM &amp; GPS</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>XÁC THỰC FACE ID</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>QUẢN LÝ MẪU MẶT</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((staff) => (
                  <tr key={staff.userId} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.825rem' }}>
                    
                    {/* 1. Tên & SĐT */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.875rem' }}>{staff.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>{staff.phone}</div>
                    </td>

                    {/* 2. Vai trò */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: staff.role === 'driver' ? '#eff6ff' : '#f5f3ff',
                          color: staff.role === 'driver' ? '#1d4ed8' : '#6d28d9',
                          border: `1px solid ${staff.role === 'driver' ? '#bfdbfe' : '#ddd6fe'}`
                        }}
                      >
                        {staff.role === 'driver' ? 'Tài Xế' : 'Phụ Xe'}
                      </span>
                    </td>

                    {/* 3. Trạng thái ca */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor:
                            staff.status === 'active'
                              ? '#ecfdf5'
                              : staff.status === 'closed'
                              ? '#eff6ff'
                              : staff.status === 'absent'
                              ? '#fef2f2'
                              : '#fffbeb',
                          color:
                            staff.status === 'active'
                              ? '#047857'
                              : staff.status === 'closed'
                              ? '#1d4ed8'
                              : staff.status === 'absent'
                              ? '#b91c1c'
                              : '#b45309'
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor:
                              staff.status === 'active'
                                ? '#10b981'
                                : staff.status === 'closed'
                                ? '#2563eb'
                                : staff.status === 'absent'
                                ? '#ef4444'
                                : '#f59e0b'
                          }}
                        ></span>
                        {staff.status === 'active'
                          ? 'Đang trực ca'
                          : staff.status === 'closed'
                          ? 'Đã tan ca'
                          : staff.status === 'absent'
                          ? 'Vắng mặt'
                          : 'Chưa vào ca'}
                      </span>
                    </td>

                    {/* 4. Giờ vào */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: '800', color: staff.checkInTime !== '--:--:--' ? '#059669' : '#94a3b8' }}>
                      {staff.checkInTime}
                    </td>

                    {/* 5. Giờ tan */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: '800', color: staff.checkOutTime !== '--:--:--' ? '#0f172a' : '#94a3b8' }}>
                      {staff.checkOutTime}
                    </td>

                    {/* 6. Địa điểm & GPS */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ color: '#0f172a', fontWeight: '600' }}>{staff.location}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '2px' }}>{staff.gps}</div>
                    </td>

                    {/* 7. Xác thực Face ID & Ảnh đối soát */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {staff.faceVerified ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#059669', fontWeight: '800', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            ✓ Hợp lệ {staff.isLiveVerified && <span title="Đã qua kiểm tra cử động nháy mắt" style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px' }}>LIVE</span>}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                            Sai số: {staff.faceDistance !== null ? staff.faceDistance : '--'}
                          </span>
                          {staff.checkInPhoto && (
                            <button
                              onClick={() => setSelectedPhotoModal(staff)}
                              style={{
                                marginTop: '2px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              📷 Xem ảnh
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>--</span>
                      )}
                    </td>

                    {/* 8. Nút Quản Lý Khuôn Mặt (Face Enrollment) */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => openEnrollModal(staff)}
                        style={{
                          backgroundColor: staff.faceRegistered ? '#f1f5f9' : '#eff6ff',
                          color: staff.faceRegistered ? '#475569' : '#2563eb',
                          border: `1px solid ${staff.faceRegistered ? '#cbd5e1' : '#bfdbfe'}`,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        {staff.faceRegistered ? 'Cập nhật Face ID' : '+ Đăng ký Face ID'}
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Hiển thị <strong>{paginatedData.length}</strong> trên tổng số <strong>{filteredData.length}</strong> nhân viên
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontSize: '0.8rem'
              }}
            >
              Trang trước
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '0 8px' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
                background: '#ffffff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontSize: '0.8rem'
              }}
            >
              Trang sau
            </button>
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL ĐĂNG KÝ KHUÔN MẶT (FACE ENROLLMENT)
      ═══════════════════════════════════════════════════════════════════════════ */}
      {enrollModalUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: 'scaleIn 0.2s ease'
            }}
          >
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>
                  Đăng Ký Khuôn Mặt (Face Enrollment)
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Nhân viên: <strong style={{ color: '#0f172a' }}>{enrollModalUser.name}</strong> • {enrollModalUser.role === 'driver' ? 'Tài Xế' : 'Phụ Xe'} ({enrollModalUser.phone})
                </p>
              </div>
              <button
                onClick={closeEnrollModal}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Body Modal */}
            <div style={{ padding: '1.5rem' }}>
              {enrollError && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.825rem', marginBottom: '1rem' }}>
                  {enrollError}
                </div>
              )}

              {/* Viewport Camera Modal */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4/3',
                  background: '#0f172a',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <video
                  ref={modalVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: enrollCameraActive ? 'block' : 'none'
                  }}
                />
                <canvas
                  ref={modalCanvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                />

                {!enrollCameraActive && (
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>
                    Đang kích hoạt camera...
                  </div>
                )}
              </div>

              {/* Danh sách mẫu đã chụp */}
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
                  Mẫu khuôn mặt đã thu thập: <strong>{enrollSamples.length}/3</strong>
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: idx < enrollSamples.length ? '#10b981' : '#e2e8f0',
                        color: idx < enrollSamples.length ? '#ffffff' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '800'
                      }}
                    >
                      {idx < enrollSamples.length ? '✓' : idx + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hướng dẫn */}
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.75rem 0 0 0', lineHeight: '1.4' }}>
                💡 <em>Hướng dẫn: Cho nhân viên nhìn thẳng vào camera và bấm <strong>"Chụp Mẫu Khuôn Mặt"</strong>. Bạn có thể chụp từ 1 đến 3 góc nhẹ (nhìn thẳng, nghiêng nhẹ) để tăng độ nhận diện chính xác.</em>
              </p>
            </div>

            {/* Footer Modal Controls */}
            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={captureFaceSample}
                disabled={enrollCapturing || !enrollCameraActive}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#2563eb',
                  border: '1.5px solid #2563eb',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontWeight: '800',
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📸 {enrollCapturing ? 'Đang trích xuất...' : 'Chụp Mẫu Khuôn Mặt'}
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={closeEnrollModal}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.825rem',
                    cursor: 'pointer'
                  }}
                >
                  Hủy Bỏ
                </button>

                <button
                  onClick={saveFaceRegistration}
                  disabled={enrollSubmitting || enrollSamples.length === 0}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontWeight: '800',
                    fontSize: '0.825rem',
                    cursor: enrollSubmitting || enrollSamples.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: enrollSubmitting || enrollSamples.length === 0 ? 0.6 : 1,
                    boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                  }}
                >
                  {enrollSubmitting ? 'Đang Lưu...' : 'Lưu Dữ Liệu Khuôn Mặt'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Xem Ảnh Đối Soát Check-in */}
      {selectedPhotoModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'scaleIn 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                  Ảnh Chụp Lúc Check-in Thực Tế
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {selectedPhotoModal.name} • {selectedPhotoModal.role === 'driver' ? 'Tài xế' : 'Phụ xe'} ({selectedPhotoModal.phone})
                </p>
              </div>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem', textAlign: 'center' }}>
              <img
                src={selectedPhotoModal.checkInPhoto}
                alt="Ảnh Check-in"
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#0f172a'
                }}
              />

              <div style={{ marginTop: '1rem', textAlign: 'left', background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Thời gian vào ca:</span>
                  <strong style={{ color: '#059669', fontFamily: 'monospace' }}>{selectedPhotoModal.checkInTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Sai số nhận diện:</span>
                  <strong style={{ color: '#0f172a' }}>{selectedPhotoModal.faceDistance} (Ngưỡng: 0.48)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Xác thực người thật:</span>
                  <strong style={{ color: selectedPhotoModal.isLiveVerified ? '#059669' : '#d97706' }}>
                    {selectedPhotoModal.isLiveVerified ? '✓ Đạt chuẩn Liveness' : 'Chưa kiểm tra'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Vị trí GPS:</span>
                  <span style={{ color: '#334155', fontWeight: '600' }}>{selectedPhotoModal.gps}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPhotoModal(null)}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManagerAttendancePage;
