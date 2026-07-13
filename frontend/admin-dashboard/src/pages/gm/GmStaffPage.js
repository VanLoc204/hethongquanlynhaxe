import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

const ROLE_LABELS = {
  driver: 'Tài xế',
  attendant: 'Phụ xe',
  ticket_agent: 'Nhân viên bán vé',
  fleet_manager: 'Quản lý Đội xe',
  ops_manager: 'Quản lý Vận tải',
  general_manager: 'Giám đốc',
  admin: 'Quản trị viên'
};

const STATUS_LABELS = {
  active: 'Hoạt động',
  inactive: 'Tạm ngưng',
  suspended: 'Khóa tài khoản'
};

const GmStaffPage = () => {
  const { token } = useContext(AuthContext);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null); // null = add new
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('driver');
  const [status, setStatus] = useState('active');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff);
      }
    } catch {
      showToast('Không thể tải danh sách nhân viên.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStaff();
    }
  }, [token]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('driver');
    setStatus('active');
    setShowModal(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setName(staff.name || '');
    setEmail(staff.email || '');
    setPhone(staff.phone || '');
    setPassword('');
    setRole(staff.role || 'driver');
    setStatus(staff.status || 'active');
    setShowModal(true);
  };

  const handleDelete = (staff) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa nhân viên',
      message: `Bạn có chắc chắn muốn xóa nhân viên ${staff.name}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/users/staff/${staff._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Xóa nhân viên thành công!');
            fetchStaff();
          } else {
            showToast(data.message || 'Lỗi xóa nhân viên.', 'error');
          }
        } catch {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || (!editingStaff && !password)) {
      showToast('Vui lòng nhập đầy đủ các trường bắt buộc.', 'error');
      return;
    }

    const payload = {
      name,
      email: email || undefined,
      phone,
      role,
      status
    };

    if (password) {
      payload.password = password;
    }

    try {
      const url = editingStaff 
        ? `${API_BASE}/users/staff/${editingStaff._id}`
        : `${API_BASE}/users/staff`;
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingStaff ? 'Cập nhật thông tin thành công!' : 'Thêm nhân viên mới thành công!');
        setShowModal(false);
        fetchStaff();
      } else {
        showToast(data.message || 'Lỗi xử lý yêu cầu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  };

  return (
    <section className="panel" style={{ minHeight: '400px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white', padding: '12px 20px', borderRadius: '8px',
          fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Quản lý nhân viên</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {staffList.length} tài khoản nhân sự trong hệ thống
          </p>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary">
          + Thêm nhân viên mới
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Đang tải danh sách nhân viên...
        </div>
      ) : staffList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Không tìm thấy tài khoản nhân viên nào.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <th style={{ padding: '12px' }}>Họ và tên</th>
                <th style={{ padding: '12px' }}>Số điện thoại</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Vai trò</th>
                <th style={{ padding: '12px' }}>Trạng thái</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff._id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                  <td style={{ padding: '14px 12px', fontWeight: '700' }}>{staff.name}</td>
                  <td style={{ padding: '14px 12px' }}>{staff.phone}</td>
                  <td style={{ padding: '14px 12px', color: 'var(--text-muted)' }}>{staff.email || 'N/A'}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)'
                    }}>
                      {ROLE_LABELS[staff.role] || staff.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                      backgroundColor: staff.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: staff.status === 'active' ? '#10b981' : '#ef4444'
                    }}>
                      {STATUS_LABELS[staff.status] || staff.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleOpenEdit(staff)} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => handleDelete(staff)} 
                        className="btn btn-secondary" 
                        style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="panel" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>
              {editingStaff ? 'Cập nhật thông tin nhân viên' : 'Thêm nhân viên mới'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Họ và tên *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Nhập họ tên đầy đủ"
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Số điện thoại *</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="Nhập SĐT liên hệ"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Nhập email (tùy chọn)"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">
                  {editingStaff ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
                </label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Nhập mật khẩu truy cập"
                  required={!editingStaff} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Vai trò chức vụ *</label>
                  <select 
                    className="form-control" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="driver">Tài xế</option>
                    <option value="attendant">Phụ xe</option>
                    <option value="ticket_agent">Nhân viên bán vé</option>
                    <option value="fleet_manager">Quản lý Đội xe</option>
                    <option value="ops_manager">Quản lý Vận tải</option>
                    <option value="general_manager">Giám đốc</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái *</label>
                  <select 
                    className="form-control" 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                    <option value="suspended">Khóa tài khoản</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStaff ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="confirm-backdrop">
          <div className="confirm-card">
            <div className="confirm-header">{confirmModal.title}</div>
            <div className="confirm-body">{confirmModal.message}</div>
            <div className="confirm-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GmStaffPage;
