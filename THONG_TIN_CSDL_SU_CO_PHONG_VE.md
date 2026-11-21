# THONG TIN KIEN TRUC CO SO DU LIEU - CHUC NANG TIEP NHAN VA XU LY SU CO PHONG VE

Tai lieu nay mo ta toan bo cau truc co so du lieu (CSDL), cac bang lien quan, quan he khoa ngoai, cac truong vat ly va co che toi uu hoa chuan 3NF (khong luu tru du thua) cua chuc nang **Tiep Nhan & Chi Dao Xu Ly Su Co Phong Ve**.

---

## 1. TONG QUAN CAC BANG DU LIEU LIEN QUAN

Chuc nang quan ly su co phong ve duoc thiet ke theo mo hinh quan he chat che, toi uu luu tru theo chuan 3NF giua 2 bang (collection) chinh:

1. **Bang Chinh: `counterincidents`** (Model: `CounterIncident.js`)
   - Luu tru thong tin ve cac su co phat sinh trong qua trinh van hanh quay ban ve (may in phoi ve, may POS, ket noi mang, tien ket thieu/thua, khieu nai trung ve...).
2. **Bang Tham Chieu: `users`** (Model: `User.js`)
   - Luu thong tin nhan su toan he thong (Nhan vien ban ve `ticket_agent`, Quan ly ban ve `ticket_manager`, Tong giam doc `general_manager`...).
   - Cung cap thong tin: Ho ten, so dien thoai, vi tri lam viec (assignedOffice) va chi nhanh truc thuoc (branch).

---

## 2. CHI TIET BANG CHINH: `counterincidents` (Model: CounterIncident.js)

Collection nay luu tru doc quyen cac thuoc tinh dac thu cua su co quay ve:

| STT | Ten Truong | Kieu Du Lieu | Rang Buoc | Mac Dinh | Dien Giai & Muc Dich Nghiep Vu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `incidentCode` | String | Unique, Bat buoc | Sinh tu dong | Ma dinh danh su co (VD: `SC-20261120-05` hoac `SC-20261104-001`). Dung de tra cuu va bao cao. |
| 2 | `title` | String | Bat buoc | - | Tieu de tom tat su co (VD: May in ve nhiet EPSON quay 01 bi ket phoi giay...). |
| 3 | `category` | String | Enum, Bat buoc | `'equipment'` | Phan loai su co. Gia tri hop le: `equipment` (Thiet bi & May in/POS), `network` (Mang truyen tai & Phan mem), `fund` (Quy ket & Tien mat), `service` (Dich vu & Khieu nai khach), `other` (Khac). |
| 4 | `severity` | String | Enum, Bat buoc | `'medium'` | Muc do nghiem trong cua su co: `urgent` (Khan cap), `high` (Muc cao), `medium` (Trung binh), `low` (Muc thap). |
| 5 | `reportedBy` | ObjectId (Ref: `User`) | Bat buoc | - | **Khoa ngoai (Foreign Key)** lien ket den bang `users`. Xac dinh nhan vien ban ve da lap bao cao su co nay. |
| 6 | `details` | String | Bat buoc | - | Mo ta chi tiet hien tuong su co xay ra tai quay ve. |
| 7 | `initialAction` | String | Tuy chon | `''` | Bien phap xu ly tam thoi cua nhan vien ban ve tai quay truoc khi bao cao quan ly. |
| 8 | `status` | String | Enum, Bat buoc | `'open'` | Tien do xu ly su co: `open` (Moi tiep nhan / Cho chi dao), `processing` (Dang phoi hop xu ly / Huong dan quay ve), `resolved` (Da khac phuc hoan tat), `closed` (Da dong su co va ban giao). |
| 9 | `resolutionNotes` | String | Tuy chon (Bat buoc khi Quan ly xu ly) | `''` | Noi dung chi dao, phuong an giai quyet hoac huong dan ky thuat cua Quan ly chi nhanh cho nhan vien. |
| 10 | `resolvedBy` | ObjectId (Ref: `User`) | Tuy chon | `null` | **Khoa ngoai (Foreign Key)** luu ID cua Quan ly chi nhanh da tiep nhan va dong/khac phuc su co. |
| 11 | `resolvedAt` | Date | Tuy chon | `null` | Thoi diem su co duoc khac phuc hoan tat. |
| 12 | `createdAt` | Date | Tu dong | Thoi diem tao | Thoi diem nhan vien gui bao cao su co len he thong. |
| 13 | `updatedAt` | Date | Tu dong | Thoi diem cap nhat | Thoi diem cap nhat gan nhat cua ho so su co. |

---

## 3. NGUYEN TAC TOI UU HOA DU LIEU & CHUAN HOA 3NF

He thong ap dung nghiem ngat nguyen tac **khong luu du lieu lap lai, khong luu truong co the suy dien tu logic**:

### 3.1. Ke Thua Thong Tin Tu Bang `users` (Khong luu trung lap)
- **Ho ten va So dien thoai nhan vien (`reporterName`, `reporterPhone`):** Khong luu trong bang `counterincidents`. Khi can hien thi, backend thuc hien `populate('reportedBy', 'name phone')` de lay du lieu truc tiep tu bang `users`. Neu nhan vien doi so dien thoai, thong tin se tu dong nhat quan.
- **Vi tri van phong / Quay ve (`location`):** Khong luu truong `location` cung trong CSDL. He thong lay tu dong tu truong `reportedBy.assignedOffice` (Van phong lam viec duoc phan cong cua nhan vien ban ve).
- **Chi nhanh quan ly (`branchId`):** Khong luu truong `branchId` doc lap trong bang su co. Khi Quan ly chi nhanh xem danh sach su co, he thong loc dua tren chi nhanh cua nhan vien bao cao (`reportedBy.branch.branchId`).

### 3.2. Loai Bo Chi Phi Phat Sinh (`estimatedCost` / `actualCost`)
- Su co van hanh phong ve mang dac thu ky thuat van hanh, ho tro nghiep vu va doi soat ca truc.
- Cac chi phi phat sinh (neu co) duoc quan ly tap trung o Module Quan ly Tai san & Thiet bi hoac Module Chi phi Ke toan de tranh xuyen thung du lieu tai chinh vao bang nghiep vu ban ve.
- Da loai bo hoan toan cac truong chi phi khoi Model va giao dien de dam bao tinh gon nhat.

---

## 4. QUAN HE GIUA CAC BANG (RELATIONSHIP MAPPING)

```
+-------------------------------------------------------------+
|                      users (Collection)                     |
+-------------------------------------------------------------+
| _id                 : ObjectId (Primary Key)                |
| name                : String (Ho ten nhan vien / quan ly)   |
| phone               : String (So dien thoai)                |
| role                : String ('ticket_agent', 'ticket_mgr') |
| assignedOffice      : String (Vi tri quay ve, VD: Quay 01)  |
| branch              : Object { branchId, branchName }       |
+-------------------------------------------------------------+
                            ^                ^
                            | (reportedBy)   | (resolvedBy)
                            |                |
+-------------------------------------------------------------+
|                counterincidents (Collection)                |
+-------------------------------------------------------------+
| _id                 : ObjectId (Primary Key)                |
| incidentCode        : String (Unique)                       |
| title               : String                                |
| category            : String (equipment, network, fund,...) |
| severity            : String (urgent, high, medium, low)    |
| reportedBy          : ObjectId -> users._id (Bat buoc)      |
| details             : String                                |
| initialAction       : String                                |
| status              : String (open, processing, resolved...) |
| resolutionNotes     : String (Chi dao cua quan ly)          |
| resolvedBy          : ObjectId -> users._id (Tuy chon)      |
| resolvedAt          : Date                                  |
| createdAt           : Date                                  |
| updatedAt           : Date                                  |
+-------------------------------------------------------------+
```

---

## 5. CO CHE BAT LOI (VALIDATION) CUA CHUC NANG

Chuc nang da duoc thiet lap co che kiem soat loi 2 lop:

### 5.1. Lop Giao Dien (Frontend - `TicketIncidentsPage.js`)
1. **Bat loi rong:** Truoc khi gui form cap nhat, kiem tra noi dung chi dao / phuong an giai quyet `updateNotes.trim()`. Neu de trong, giao dien lap tuc ngan chan gui va hien thi hop thong bao loi mau do:
   `"Vui long nhap noi dung chi dao / phuong an giai quyet cho nhan vien quay ve."`
2. **Kiem tra do dai toi thieu:** Noi dung chi dao phai co it nhat 5 ky tu de dam bao tinh xac thuc nghiep vu.
3. **Phan hoi truc quan:** O nhap `textarea` tu dong doi sang vien do (`border: 1.5px solid #dc2626`) va mau nen canh bao (`#fffaf0`) khi co loi. Khi nguoi dung go phim, loi tu dong duoc xoa de dam bao trai nghiem muot ma.

### 5.2. Lop Xu Ly Backend (`employeeController.js` - `updateTicketIncident`)
1. Kiem tra tinh hop le cua `resolutionNotes`: Bat buoc la chuoi va phai co do dai sau khi trim toi thieu 5 ky tu. Neu khong hop le, API tra ve ma loi `400 Bad Request` kem thong bao ro rang.
2. Tu dong gan `resolvedBy = req.user.id` va `resolvedAt = new Date()` khi trang thai duoc chuyen sang `resolved` hoac `closed`.
