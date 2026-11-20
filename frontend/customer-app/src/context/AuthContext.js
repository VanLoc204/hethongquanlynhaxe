import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const API_URL = 'http://localhost:8000/api/auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set default auth headers for axios
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/me`);
        if (res.data.success) {
          setUser(res.data.user);
          setIsAuthenticated(true);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  // Login User
  const login = async (loginKey, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/login`, { loginKey, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(errMsg);
      return { success: false, message: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Register User
  const registerUser = async (name, email, phone, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/register`, { name, email, phone, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(errMsg);
      return { success: false, message: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // Logout User
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  // Update Profile Details
  const updateProfile = async (name, email) => {
    setError(null);
    try {
      const res = await axios.put(`${API_URL}/updatedetails`, { name, email });
      if (res.data.success) {
        setUser(res.data.user);
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Cập nhật thông tin thất bại.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  // Change Password
  const changePassword = async (currentPassword, newPassword) => {
    setError(null);
    try {
      const res = await axios.put(`${API_URL}/updatepassword`, { currentPassword, newPassword });
      if (res.data.success) {
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Thay đổi mật khẩu thất bại.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  // Gửi mã OTP xác thực đổi mật khẩu 2FA qua Email (Hiệu lực 3 phút = 180s)
  const sendChangePasswordOtp = async (currentPassword, newPassword) => {
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/changepassword/send-otp`, { currentPassword, newPassword });
      return {
        success: true,
        message: res.data.message,
        email: res.data.email,
        expiresIn: res.data.expiresIn || 180
      };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  // Xác thực OTP 2FA và hoàn tất cập nhật mật khẩu mới
  const verifyAndChangePassword = async (otp) => {
    setError(null);
    try {
      const res = await axios.put(`${API_URL}/changepassword/verify-and-update`, { otp });
      return { success: true, message: res.data.message };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Mã xác thực không chính xác hoặc đã hết hạn.';
      setError(errMsg);
      return { success: false, message: errMsg };
    }
  };

  // Forgot Password (Legacy)
  const forgotPassword = async (phone, newPassword) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/forgotpassword`, { phone, newPassword });
      if (res.data.success) {
        return { success: true };
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Đặt lại mật khẩu thất bại.';
      setError(errMsg);
      return { success: false, message: errMsg };
    } finally {
      setLoading(false);
    }
  };

  // 1. Gửi mã OTP khôi phục mật khẩu qua Email (3 phút hiệu lực)
  const sendForgotOtp = async (email) => {
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/forgotpassword/send-otp`, { email });
      return { 
        success: true, 
        message: res.data.message, 
        expiresIn: res.data.expiresIn || 180
      };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Không thể gửi mã xác thực. Vui lòng thử lại.';
      return { success: false, message: errMsg };
    }
  };

  // 2. Xác thực mã OTP
  const verifyForgotOtp = async (email, otp) => {
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/forgotpassword/verify-otp`, { email, otp });
      return { success: true, resetToken: res.data.resetToken };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Mã xác thực không chính xác hoặc đã hết hạn.';
      return { success: false, message: errMsg };
    }
  };

  // 3. Đặt lại mật khẩu mới với resetToken
  const resetForgotPass = async (email, resetToken, newPassword) => {
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/forgotpassword/reset`, { email, resetToken, newPassword });
      return { success: true, message: res.data.message };
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Đặt lại mật khẩu thất bại.';
      return { success: false, message: errMsg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        error,
        login,
        register: registerUser,
        logout,
        setError,
        updateProfile,
        changePassword,
        sendChangePasswordOtp,
        verifyAndChangePassword,
        forgotPassword,
        sendForgotOtp,
        verifyForgotOtp,
        resetForgotPass
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
