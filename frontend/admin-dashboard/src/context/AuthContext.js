import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

const API_BASE = 'http://localhost:8000/api/v1';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('admin_user') || 'null'));
  const [loading, setLoading] = useState(false);

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
        const allowedRoles = ['fleet_manager', 'ops_manager', 'general_manager', 'admin', 'ticket_agent', 'driver', 'attendant'];
        if (!allowedRoles.includes(data.user.role)) {
          return { success: false, message: 'Tài khoản không có quyền truy cập hệ thống quản lý.' };
        }
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.user));
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

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
