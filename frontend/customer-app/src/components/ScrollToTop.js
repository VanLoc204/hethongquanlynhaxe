import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component lắng nghe sự thay đổi của Route (pathname, search query params, key)
 * và tự động cuộn màn hình về vị trí trên cùng (0, 0) ngay lập tức.
 * Giúp người dùng khi chuyển từ trang này sang trang khác hoặc tìm kiếm
 * luôn bắt đầu từ đỉnh trang thay vì bị giữ nguyên vị trí cuộn của trang trước.
 */
const ScrollToTop = () => {
  const { pathname, search, key } = useLocation();

  useEffect(() => {
    // Vô hiệu hóa tính năng tự động ghi nhớ vị trí cuộn của trình duyệt
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Cuộn ngay về đỉnh trang
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });

    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }, [pathname, search, key]);

  return null;
};

export default ScrollToTop;

