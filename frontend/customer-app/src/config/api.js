import API_BASE_URL from '../config/api';
// ============================================================
// CẤU HÌNH API TRUNG TÂM - CUSTOMER APP
// Khi up host, chỉ cần đặt biến môi trường REACT_APP_API_URL
// trong Render / Vercel / Netlify là toàn bộ hệ thống tự động
// trỏ về backend đúng URL mà không cần sửa thêm dòng code nào.
// ============================================================

const API_BASE_URL =
  process.env.REACT_APP_API_URL || API_BASE_URL;

export default API_BASE_URL;
