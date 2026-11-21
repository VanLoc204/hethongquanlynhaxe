# THONG TIN KIEN TRUC CO SO DU LIEU - HE THONG CHAM CONG NHAN SU VA QUAN LY CA TRUC

Tai lieu nay mo ta toan bo cau truc co so du lieu (CSDL), cac bang lien quan, cac trang thai ca truc, quy tac khoa huy ve va co che tu dong dong ca cuoi ngay.

---

## 1. BANG CHAM CONG CUA NHAN VIEN BINH THUONG (KHONG PHAI TAI XE VA NHAN VIEN BAN VE)

Doi voi cac nhan su binh thuong (Khoi van phong, Quan ly phong ve `ticket_manager`, Dieu hanh van tai `ops_manager`, Quan ly doi xe `fleet_manager`, Ban Giam doc `general_manager`, Nhan vien hanh chinh - nhan su):

He thong su dung **DUY NHAT 01 BANG**:
- **Ten Collection trong MongoDB:** `attendances`
- **Ten Model Mongoose:** `backend/models/Attendance.js`
- **Gia tri phan loai ca truc:** `attendanceType: 'standard'`

Nhan vien binh thuong khong tham gia lai xe van tai (khong can bang chuyen xe `CrewAttendance`) va khong truc tiep thu tien mat ban ve tai quay (khong can bang doi soat ket `AgentAttendance` hoac `ShiftSession`). Do do, toan bo du lieu cham cong duoc luu gon gang trong bang `attendances` theo chuan 3NF tuyet doi.

### Chi tiet cac truong trong bang `attendances`:

| STT | Ten Truong | Kieu Du Lieu | Rang Buoc | Mac Dinh | Dien Giai & Muc Dich Nghiep Vu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `userId` | ObjectId (Ref: `User`) | Bat buoc, Co Index | - | **Khoa ngoai duy nhat** lien ket sang bang `users`. He thong ke thua ho ten, so dien thoai, chuc vu, chi nhanh ma khong luu trung lap. |
| 2 | `date` | Date | Bat buoc, Co Index | - | Ngay lam viec (duoc chuan hoa ve moc `00:00:00.000+07:00` de de dang truy van va tong hop cong thang). |
| 3 | `checkInTime` | Date | Tuy chon | `null` | Thoi diem nhan vien bat dau ca truc (ghi nhan qua Face ID/Webcam). |
| 4 | `checkOutTime` | Date | Tuy chon | `null` | Thoi diem nhan vien ket thuc ca truc / tan ca (hoac gio tu dong chot cuoi ngay). |
| 5 | `totalHours` | Number | Tu dong tinh | `0` | Tong so gio lam viec thuc te trong ca (vi du: `8.0` gio). |
| 6 | `status` | String | Enum, Co Index | `'scheduled'` | Trang thai ca truc: `scheduled` (Cho den ca), `active` (Dang trong ca), `closed` (Da hoan thanh ca / Tan ca), `absent` (Vang mat khong phep). |
| 7 | `attendanceType` | String | Enum, Co Index | `'standard'` | Phan loai nhom nhan su: `'standard'` (Nhan su gio hanh chinh / Quan ly), `'crew'` (To lai xe), `'agent'` (Nhan vien quay ve). |
| 8 | `faceVerified` | Boolean | Tu dong | `false` | Xac thuc thanh cong bang thuat toan nhan dien khuon mat Face ID AI. |
| 9 | `faceDistance` | Number | Tu dong | `null` | Sai so khoang cach Euclid 128 chieu (nguong chuan `<= 0.38`). |
| 10 | `isLiveVerified` | Boolean | Tu dong | `false` | Kiem tra chong gia mao (Liveness detection). |
| 11 | `checkInPhoto` | String (Base64/URL) | Tuy chon | `null` | Anh chup khuon mat doi soat tai thoi diem Check-in. |
| 12 | `checkOutPhoto` | String (Base64/URL) | Tuy chon | `null` | Anh chup khuon mat doi soat tai thoi diem Check-out. |
| 13 | `gpsLat`, `gpsLng`| Number | Tuy chon | `null` | Toa do dinh vi GPS thuc te luc nhan vien thao tac cham cong. |
| 14 | `note` | String | Tuy chon | `''` | Ghi chu nghiep vu hoac he thong tu dong ghi nhan khi chot ca cuoi ngay. |

---

## 2. BANG PHAN BIET GIUA CAC NHOM NHAN SU TRONG HE THONG

| Nhom Nhan Su | Bang Su Dung | Bang Phu / Mo Rong | Muc Dich Nghiep Vu |
| :--- | :--- | :--- | :--- |
| **Nhan vien binh thuong & Quan ly** | `attendances` (`attendanceType: 'standard'`) | **Khong co** (Chi dung 1 bang duy nhat) | Cham cong theo gio lam viec hanh chinh, xac thuc Face ID & GPS vi tri lam viec. |
| **Tai xe & Phu xe (`driver`, `attendant`)** | `attendances` (`attendanceType: 'crew'`) | `crewattendances` (Quan he 1-1 qua `attendanceId`) | Luu them `tripId`, `busId`, `actualDeparture`, `actualArrival`, so km thuc te va do dung gio cua chuyen xe. |
| **Nhan vien ban ve tai quay (`ticket_agent`)** | `attendances` (`attendanceType: 'agent'`) | `agentattendances` va `shiftsessions` | Quan ly so tien dau ca (`initialCash`), tien mat thu trong ca, so ve xuat va doi soat nop quy ket. |

---

## 3. CAC TRANG THAI CHAM CONG VA CHU TRINH HOAT DONG

1. **`scheduled` (Chua vao ca / Cho den ca):**
   - Nhan vien co lich truc nhung chua thuc hien Check-in Face ID.
   - Giao dien hien thi the mau vang: **CHUA VAO CA**, nut hanh dong: **BAT DAU CA TRUC (CHECK-IN)**.
2. **`active` (Dang trong ca lam viec):**
   - Nhan vien da diem danh Face ID thanh cong.
   - He thong bat dong ho dem thoi gian ca truc theo thoi gian thuc.
   - Giao dien hien thi the mau xanh: **DANG TRONG CA**, nut hanh dong: **KET THUC CA TRUC (CHECK-OUT)**.
3. **`closed` (Da hoan tat ca lam viec):**
   - Nhan vien da thuc hien Check-out tan ca (hoac he thong tu dong chot vao cuoi ngay).
   - Tinh toan tong thoi gian lam viec `totalHours`.
   - Giao dien hien thi the mau xanh la: **DA HOAN TAT CA HOM NAY**, nut bi khoa de tranh diem danh trung lap.
4. **`absent` (Vang mat khong phep):**
   - Het ca lam viec ma nhan vien khong co mat cham cong va khong co don nghi phep hop le.

---

## 4. LOGIC KHOA TINH NANG HUY VE NEU CHUA CHAM CONG

Theo quy dinh quan ly, thao tac huy ve va hoan tien anh huong truc tiep den doanh so, phoi ve va quyen loi khach hang. Do do he thong ap dung co che chan 2 lop:

### Lop 1: Giao dien nguoi dung (Frontend - `AgentTicketsPage.js`)
- Khi trang tai, ham `fetchShiftStatus` kiem tra dong thoi ca 2 nguon:
  1. Ca truc quay ve (`ShiftSession` co `status === 'active'`).
  2. Ban ghi cham cong Face ID hom nay (`Attendance` co `todayStatus === 'active'`).
- Neu nhan vien **chua cham cong vao ca**:
  - Nut **Huy Ve** bi vo hieu hoa (`disabled`).
  - Tooltip hien thi: `"Thao tac bi khoa: Vui long cham cong vao ca hom nay de thuc hien huy ve"`.
  - Neu co hanh dong mo modal huy, popup canh bao mau do xuat hien:
    - Tieu de: **Chua Cham Cong Vao Ca Hom Nay**.
    - Noi dung: `"Thao tac huy ve va hoan tien cho hanh khach yeu cau nhan vien phai hoan tat cham cong vao ca lam viec hom nay. Vui long cham cong ca truc truoc khi thao tac."`
    - Nut dieu huong: **Den Trang Cham Cong Ca Truc** (tu dong chuyen sang man hinh cham cong tuong ung voi vai tro).

### Lop 2: May chu Backend (`employeeController.js` - `cancelTicketAtCounter`)
- Tai endpoint `POST /api/users/agent/cancel-ticket/:id`:
  - Kiem tra ban ghi `Attendance` trong ngay hom nay cua nhan vien (`userId: req.user.id`, `date: today`, `status: 'active'`) va `ShiftSession`.
  - Neu khong tim thay ca nao dang active, he thong lap tuc chan thao tac va tra ve ma `403 Forbidden`:
    `"Thao tac huy ve bi khoa: Ban chua thuc hien cham cong vao ca hom nay. Vui long cham cong ca truc truoc khi thuc hien huy ve!"`

---

## 5. TINH NANG TU DONG DONG CA CHAM CONG CUOI NGAY (QUEN CHECK-OUT)

Vi nha xe hoat dong theo che do ca ngay, **khong co thay phien truc giao ban ca dem**, nhieu nhan vien tan ca ra ve thuong quen bam Check-out. He thong da hoan thien co che tu dong dong ca cuoi ngay:

### 5.1. Nguyen tac xu ly tu dong:
- Bat ky ban ghi `Attendance` nao co `status === 'active'` ma thuoc ve ngay hom truoc (`date < todayStart`), hoac ngay hom nay sau 23:50 dem:
  - Tu dong chuyen `status = 'closed'`.
  - Tu dong thiet lap `checkOutTime`: Gio tan ca tieu chuan (17:30 hoac moc cuoi ngay).
  - Tinh toan thoi luong `totalHours`: Tinh tu thoi diem Check-in den gio chot, mac dinh la `8.0` gio tieu chuan.
  - Ghi chu vao truong `note`: `"[Tu dong chot ca cuoi ngay do nhan vien quen check-out]"`.
  - Neu la ca truc quay ve (`ShiftSession`), tu dong chuyen `status = 'closed'` va cap nhat `endTime = 22:00`.

### 5.2. Co che thuc thi da tang (Double-Layer Execution):
1. **Lop chu dong (Dynamic On-demand):**
   - Ham `autoCloseEndOfDayAttendances()` duoc goi tu dong truoc moi lan truy van API cham cong (`getMyAttendance`, `getTodayAttendance`, `checkIn`).
   - Giup du lieu luon chinh xac ngay khi nguoi dung mo man hinh ma khong can cho background job.
2. **Lop dinh ky chay ngam (Background Interval Job):**
   - Trong file [server.js](file:///c:/Users/VanLoc/OneDrive%20-%20Industrial%20University%20of%20HoChiMinh%20City/Documents/KLTN/HeThongQuanLyNhaXe/backend/server.js), mot tien trinh background chay ngam moi 15 phut mot lan de quet toan bo CSDL va tu dong dong tat ca cac ca ton dong.
