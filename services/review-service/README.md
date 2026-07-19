# Review & AI Assistant Service

Dịch vụ quản lý đánh giá phản hồi khách hàng và tích hợp **Trợ lý ảo AI (đóng vai trò Chatbot tư vấn)** sử dụng **Google Gemini API** (`gemini-1.5-flash`) trong hệ thống quản lý nhà xe Á Đông Travel.

---

## 🚀 Tính Năng Chính

1. **Tư vấn AI tự động:** Giải đáp thông tin hành trình, lịch trình tuyến đi (Đà Lạt, Cần Thơ), giá vé, bưu gửi ký nhận và chính sách hoàn hủy 24/7.
2. **Lưu trữ nhật ký Hybrid:** Keep ngữ cảnh tức thì bằng `sessionStorage` ở client và tự động ghi log bất đồng bộ các hội thoại vào MongoDB của hệ thống để phân tích.
3. **Bảo mật tối đa:** Không để lộ API Key trên trình duyệt. Toàn bộ tin nhắn được lọc ký tự đặc biệt (Sanitization) và kiểm chứng JWT token tự động.
4. **Rate Limiting:** Giới hạn tối đa 60 tin nhắn / 15 phút từ 1 IP để bảo vệ tài khoản API Gemini khỏi các hành vi phá hoại hoặc spam.
5. **Cứu cánh Offline (Fallback):** Tự động trả lời bằng cẩm nang offline tại chỗ nếu đường truyền mạng hoặc API Gemini bị gián đoạn.

---

## 📁 Cấu Trúc File Tính Năng Chatbot

```text
services/review-service/
├── config/
│   └── db.js                 # Cầu nối kết nối cơ sở dữ liệu MongoDB
├── models/
│   └── ChatLog.js            # Schema MongoDB lưu trữ nhật ký hội thoại
├── controllers/
│   └── chatController.js     # Điều hướng yêu cầu chat, giải mã token & ghi log async
├── services/
│   └── geminiService.js      # Kết nối SDK Google Gemini, chứa System Prompt và dự phòng offline
├── routes/
│   └── chatRoutes.js         # Khai báo endpoint POST /chat kèm Rate Limiter
├── .env                      # Các cấu hình cổng & API Key
└── server.js                 # File khởi động chính của Service
```

---

## ⚙️ Cấu Hình Môi Trường (.env)

Vui lòng tạo tệp `.env` tại thư mục này với các thông số cấu hình sau:

```env
PORT=8009
MONGO_URI=mongodb://127.0.0.1:27018/bus_management
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_key_here
```

---

## 🔌 Tài Liệu API Endpoints

### 1. Endpoint Tư Vấn Chatbot AI
* **Method:** `POST`
* **Path:** `/chat` (Thông qua API Gateway: `/api/v1/reviews/chat`)
* **Headers:** 
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_TOKEN>` (Không bắt buộc - gửi kèm để lưu log dưới ID thành viên và chào theo tên)
* **Request Body:**
  ```json
  {
    "message": "Giá vé đi Đà Lạt từ HCM là bao nhiêu?",
    "sessionId": "session_1721381234_ab8c9d",
    "history": [
      { "sender": "user", "text": "Xin chào" },
      { "sender": "bot", "text": "Chào quý khách! Tôi là trợ lý ảo Á Đông AI..." }
    ]
  }
  ```
* **Response (Success - 200 OK):**
  ```json
  {
    "success": true,
    "text": "Chào quý khách, giá vé đi Đà Lạt từ TP.HCM hiện tại là 400.000đ đối với xe giường nằm 44 chỗ...",
    "timestamp": "2026-07-19T05:20:00.000Z"
  }
  ```
* **Response (Error - 429 Too Many Requests):**
  ```json
  {
    "success": false,
    "message": "Bạn đã gửi quá nhiều câu hỏi trong thời gian ngắn. Vui lòng thử lại sau 15 phút."
  }
  ```

### 2. Endpoint Kiểm Tra Sức Khỏe Service
* **Method:** `GET`
* **Path:** `/health`
* **Response (200 OK):**
  ```json
  {
    "status": "UP",
    "service": "review-service"
  }
  ```

---

## 🛠️ Hướng Dẫn Khởi Chạy Lập Trình (Local Dev)

Chạy độc lập dịch vụ này tại thư mục `services/review-service`:
```bash
npm run dev
```

Hoặc chạy từ thư mục gốc của Monorepo:
```bash
npm run dev --workspace=services/review-service
```
