import React, { createContext, useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';

export const AuthContext = createContext();

const API_BASE = API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('admin_user') || 'null'));
  const [loading, setLoading] = useState(false);

  // Sync latest user profile and branch data on mount/refresh
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401 || res.status === 404) {
          // Token không còn tồn tại trong CSDL -> xóa session cũ và logout
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          localStorage.removeItem('admin_server_boot_id');
          setToken('');
          setUser(null);
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data || !isMounted) return;

        const storedBootId = localStorage.getItem('admin_server_boot_id');
        // Nếu máy chủ vừa được khởi động lại (bootId không khớp hoặc session cũ chưa có bootId):
        if (data.serverBootId && (!storedBootId || storedBootId !== data.serverBootId)) {
          console.warn('[Admin Auth] Máy chủ vừa được bật lại phiên mới. Xóa phiên cũ và yêu cầu đăng nhập lại.');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          localStorage.removeItem('admin_server_boot_id');
          setToken('');
          setUser(null);
          return;
        }

        if (data.success && data.user) {
          if (data.serverBootId) {
            localStorage.setItem('admin_server_boot_id', data.serverBootId);
          }
          setUser(prev => ({ ...(prev || {}), ...data.user }));
          localStorage.setItem('admin_user', JSON.stringify(data.user));
        }
      })
      .catch(err => {
        console.error('Lỗi đồng bộ hồ sơ người dùng:', err);
      });
    return () => { isMounted = false; };
  }, [token]);

  const login = async (phone, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginKey: phone, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const allowedRoles = ['fleet_manager', 'ops_manager', 'general_manager', 'admin', 'ticket_manager', 'ticket_agent', 'driver', 'attendant'];
        if (!allowedRoles.includes(data.user.role)) {
          return { success: false, message: 'Tài khoản không có quyền truy cập hệ thống quản lý.' };
        }
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
        if (data.serverBootId) {
          localStorage.setItem('admin_server_boot_id', data.serverBootId);
        }
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Sai thông tin đăng nhập.' };
      }
    } catch (err) {
      return { success: false, message: 'Lỗi kết nối máy chủ.' };
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (updatedData) => {
    setUser(prev => {
      const next = { ...(prev || {}), ...updatedData };
      localStorage.setItem('admin_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_server_boot_id');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, updateUser, loading, login, logout, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
