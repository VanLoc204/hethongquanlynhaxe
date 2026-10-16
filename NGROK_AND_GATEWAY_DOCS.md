# TÀI LIỆU CẤU HÌNH NGROK & DOCKER GATEWAY (REVERSE PROXY)

Tài liệu này ghi lại toàn bộ danh sách file đã tạo mới và chỉnh sửa để phục vụ việc chạy thử nghiệm ứng dụng trên điện thoại qua **ngrok** và **Nginx Gateway**.

---

## 📌 I. DANH SÁCH CÁC FILE ĐÃ CHỈNH SỬA & TẠO MỚI

Tổng cộng chỉ có **5 file code/cấu hình** và **1 file thực thi**:

| STT | File | Loại thay đổi | Mục đích |
| :---: | :--- | :---: | :--- |
| 1 | [`nginx.conf`](./nginx.conf) | **TẠO MỚI** | Cấu hình Nginx làm Gateway cổng `80`: gom Khách hàng (3000), Quản trị (3001) và Backend (8000) vào 1 link duy nhất. |
| 2 | [`docker-compose.yml`](./docker-compose.yml) | **CHỈNH SỬA** | Thêm service `gateway` chạy `nginx:alpine` ở cổng `80:80`. |
| 3 | [`frontend/admin-dashboard/package.json`](./frontend/admin-dashboard/package.json) | **CHỈNH SỬA** | Thêm dòng `"homepage": "."` để các file tĩnh (js/css) dùng đường dẫn tương đối khi mở qua `/admin/`. |
| 4 | [`frontend/admin-dashboard/src/index.js`](./frontend/admin-dashboard/src/index.js) | **CHỈNH SỬA** | Thêm đoạn intercept `window.fetch` tự động chuyển `localhost:8000` thành `/api/v1` khi chạy qua Docker/ngrok. |
| 5 | [`frontend/customer-app/src/index.js`](./frontend/customer-app/src/index.js) | **CHỈNH SỬA** | Thêm đoạn intercept `window.fetch` và `axios` tự động chuyển `localhost:8000` thành `/api/v1` khi chạy qua Docker/ngrok. |
| 6 | `ngrok.exe` | **TẠO MỚI (Binary)** | File thực thi ngrok đặt tại thư mục gốc để gõ lệnh `.\ngrok http 80` không phụ thuộc vào PATH máy. |

---

## 🛠️ II. CHI TIẾT NỘI DUNG THAY ĐỔI TRONG TỪNG FILE

### 1. File `nginx.conf` (Tạo mới ở thư mục gốc)
* Cấu hình chia luồng:
  * `/` $\rightarrow$ `customer-app:3000` (Khách hàng)
  * `/admin/` $\rightarrow$ `admin-dashboard:3001` (Tài xế, quản trị)
  * `/api/` $\rightarrow$ `backend:8000/api/` (API Backend)

### 2. File `docker-compose.yml`
Thêm block service `gateway` (ngay trước `volumes:`):
```yaml
  gateway:
    image: nginx:alpine
    container_name: bus_gateway
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
      - customer-app
      - admin-dashboard
```

### 3. File `frontend/admin-dashboard/package.json`
Thêm thuộc tính `"homepage": "."`:
```json
{
  "name": "@bus-system/admin-dashboard",
  "version": "1.0.0",
  "homepage": ".",
  "scripts": { ... }
}
```

### 4. File `frontend/admin-dashboard/src/index.js`
Thêm đoạn mã tự động định tuyến API (dòng 6–14):
```javascript
// Global API Auto-Routing for Ngrok / Docker Gateway / Localhost
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.includes('http://localhost:8000/api/v1')) {
    const targetBase = window.location.port === '3001' ? 'http://localhost:8000/api/v1' : '/api/v1';
    url = url.replace('http://localhost:8000/api/v1', targetBase);
  }
  return originalFetch.call(this, url, options);
};
```

### 5. File `frontend/customer-app/src/index.js`
Thêm `import axios from 'axios';` và bộ interceptor:
```javascript
// Global API Auto-Routing for Ngrok / Docker Gateway / Localhost
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.includes('http://localhost:8000/api/v1')) {
    const targetBase = window.location.port === '3000' ? 'http://localhost:8000/api/v1' : '/api/v1';
    url = url.replace('http://localhost:8000/api/v1', targetBase);
  }
  return originalFetch.call(this, url, options);
};

axios.interceptors.request.use((config) => {
  if (config.url && config.url.includes('http://localhost:8000/api/v1')) {
    const targetBase = window.location.port === '3000' ? 'http://localhost:8000/api/v1' : '/api/v1';
    config.url = config.url.replace('http://localhost:8000/api/v1', targetBase);
  }
  return config;
});
```

---

## 🗑️ III. CÁCH GỠ BỎ HOÀN TOÀN (NẾU SAU NÀY KHÔNG MUỐN DÙNG NỮA)

Nếu sau này bạn không muốn dùng ngrok hay cổng Nginx nữa, bạn chỉ cần thực hiện 4 bước sau để hệ thống quay lại như cũ 100%:

1. **Xóa 2 file rác:**
   * Xóa file `nginx.conf`
   * Xóa file `ngrok.exe` (và file `NGROK_AND_GATEWAY_DOCS.md` này)
2. **Trong file `docker-compose.yml`:**
   * Xóa toàn bộ đoạn service `gateway:` (khoảng 14 dòng).
3. **Trong 2 file `src/index.js`:**
   * Mở `frontend/admin-dashboard/src/index.js` và `frontend/customer-app/src/index.js`: Xóa đoạn mã `Global API Auto-Routing` vừa thêm.
4. **Trong `frontend/admin-dashboard/package.json`:**
   * Xóa dòng `"homepage": ".",` (nếu muốn).

---

## 🚀 IV. CÁCH LÊN WEB THẬT (PRODUCTION DEPLOYMENT)

> **Lưu ý quan trọng:** Cấu hình hiện tại **rất chuẩn công nghiệp** (Microservices Reverse Proxy). Khi bạn triển khai lên VPS thật hoặc đưa lên Cloud:
> * Mô hình Nginx Gateway này vẫn hoạt động bình thường, chỉ cần gắn tên miền thật (ví dụ `nhaxe.com`) thay cho ngrok.
> * Bạn không bắt buộc phải xóa cấu hình này nếu muốn giữ kiến trúc một cổng chuẩn hóa cho cả hệ thống.
