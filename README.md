# 📚 Bé Học Vui — Web bài tập cho học sinh tiểu học

Trang web tĩnh đơn giản cho học sinh tiểu học lớp 1–5 luyện tập 3 môn: **Toán**, **Tiếng Việt**, **Tiếng Anh**.

## 🎯 Tính năng

- **5 lớp × 3 môn** — chọn lớp, chọn môn, làm bài
- **3 loại câu hỏi**: trắc nghiệm 1 đáp án, điền đáp án, ghép cặp
- **Theo dõi tiến độ** không cần đăng nhập (lưu vào trình duyệt — localStorage)
- **Hệ thống sao** thưởng cho mỗi câu trả lời đúng
- **Giao diện thân thiện trẻ em**: pastel, font Nunito to rõ, hiệu ứng confetti khi đạt điểm cao
- **Responsive** — chạy tốt trên máy tính, tablet, điện thoại
- **In được** bài tập ra giấy (qua chức năng Print của trình duyệt)

## 📁 Cấu trúc dự án

```
.
├── index.html                     # Trang chính (SPA)
├── assets/
│   ├── css/style.css              # Theme pastel
│   └── js/
│       ├── app.js                 # Routing + logic chính
│       ├── progress.js            # localStorage
│       └── exercises/             # 3 loại câu hỏi
├── exercises/                     # Đề bài JSON (★ NƠI THÊM NỘI DUNG)
│   ├── index.json                 # Catalog tự sinh
│   ├── toan/lop1/*.json
│   ├── tieng-viet/lop1/*.json
│   └── tieng-anh/lop1/*.json
└── tools/
    ├── schema.md                  # ★ Đặc tả cho Claude Code
    ├── build-index.js             # Sinh catalog
    └── preview.html               # Duyệt đề local
```

## 🚀 Chạy thử local

Vì web fetch JSON, phải chạy qua HTTP server (không mở file://):

```bash
# Cách 1: dùng Python (có sẵn trên Windows nếu đã cài Python)
python -m http.server 8000

# Cách 2: dùng Node
npx serve

# Cách 3: VSCode extension "Live Server" → bấm "Go Live"
```

Mở `http://localhost:8000` để xem trang chính, hoặc `http://localhost:8000/tools/preview.html` để duyệt đề.

## 📝 Quy trình thêm bài tập mới (tự động + duyệt qua PR)

1. Bảo Claude Code (trong VSCode) tạo đề. Claude sẽ tự đọc `exercises/coverage.json` để tránh trùng chủ đề:
   > "Đọc `tools/schema.md` và `exercises/coverage.json`, rồi sinh đề cho các chỗ còn thiếu của Toán lớp 2"
2. Claude sinh JSON → chạy `node tools/build-index.js` → `node tools/check.js`
3. Nếu **cổng kiểm tra** báo lỗi chặn (đáp án sai, ID/câu trùng) → Claude sửa rồi chạy lại
4. Khi ĐẠT → tạo nhánh + Pull Request
5. Bạn liếc qua PR (~30 giây), xem các cảnh báo "cần người liếc" → **Merge**
6. Cloudflare tự deploy nhánh `main`

### 🛡️ Cơ chế chống trùng (3 tầng)

| Tầng | Chặn cái gì | Công cụ |
|---|---|---|
| ID file | 2 đề cùng `id` | `check.js` (lỗi chặn) |
| Chủ đề | Sinh lại chủ đề đã có | `coverage.json` cho Claude biết chỗ thiếu |
| Câu hỏi | Câu trùng giữa các file (chuẩn hóa + fingerprint) | `check.js` (cảnh báo) |

### ✅ Kiểm tra đáp án

`check.js` tự tính lại các câu Toán có dạng phép tính (vd `7 + 2 = ___`) và **chặn nếu đáp án sai**. Câu lời văn / Tiếng Việt / Tiếng Anh không tự kiểm được sẽ được đánh dấu "cần người liếc" trong báo cáo.

### 🔧 Các lệnh kiểm tra

```bash
node tools/build-index.js    # sinh index.json + coverage.json
node tools/verify-answers.js # chỉ kiểm đáp án Toán
node tools/check.js          # CỔNG KIỂM TRA tổng hợp (dùng trước khi commit / trong PR)
```

> CI: `.github/workflows/check.yml` tự chạy `check.js` trên mỗi Pull Request — PR đỏ là có lỗi chặn.

## 🌐 Đưa lên internet (miễn phí, không cần tên miền)

### Cloudflare Pages (khuyên dùng)

1. Tạo tài khoản tại https://pages.cloudflare.com
2. Push code này lên GitHub (xem mục dưới)
3. Trong Cloudflare Pages: **Create a project** → **Connect to Git** → chọn repo này
4. Build settings: **để trống cả Build command và Build output directory** (vì là HTML tĩnh thuần)
5. Deploy → bạn có URL `<ten-project>.pages.dev`
6. Mỗi lần push lên GitHub, web tự cập nhật

### Lựa chọn khác (tương đương)

| Nền tảng | URL miễn phí |
|---|---|
| Vercel | `<ten>.vercel.app` |
| Netlify | `<ten>.netlify.app` |
| GitHub Pages | `<username>.github.io/<ten-repo>` |

## 🔧 Push lên GitHub (lần đầu)

```bash
# 1. Khởi tạo git (đã làm tự động)
git init
git add .
git commit -m "Initial commit: Web bé học vui"

# 2. Tạo repo trên GitHub (qua web https://github.com/new), KHÔNG init README
#    Đặt tên ví dụ: be-hoc-vui

# 3. Kết nối và push
git remote add origin https://github.com/<username>/be-hoc-vui.git
git branch -M main
git push -u origin main
```

## 🎨 Tuỳ chỉnh

- **Đổi tên & logo**: sửa `<title>` và `.logo` trong [index.html](index.html)
- **Đổi màu**: sửa các biến CSS đầu file [assets/css/style.css](assets/css/style.css) (`--c-toan`, `--c-tv`, `--c-ta`)
- **Đổi font**: thay link Google Fonts trong [index.html](index.html)

## 🧹 Reset tiến độ

Mở Console (F12) trong trình duyệt → gõ:
```js
Progress.reset()
```

---

Tạo bởi Claude Code 🤖 · MIT License
