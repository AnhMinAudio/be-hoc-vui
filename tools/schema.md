# Schema đề bài — DÙNG CHO CLAUDE CODE

> Đọc file này trước khi sinh đề. Mỗi đề là một file JSON. Đặt vào đúng thư mục theo môn/lớp.

## ⚠️ QUY TRÌNH BẮT BUỘC KHI SINH ĐỀ (đọc kỹ)

1. **Tránh trùng — đọc `exercises/coverage.json` TRƯỚC.** File này liệt kê mỗi (môn, lớp) đã có chủ đề nào, bao nhiêu câu, và mục `gaps` là các chỗ còn trống. → Hãy **nhắm vào chỗ thiếu**, KHÔNG sinh lại chủ đề đã có.
2. **Sinh đề GỐC, không copy đề thi có bản quyền.** Lấy đề thi thật chỉ để tham khảo *cấu trúc và độ khó*, rồi tự ra đề mới tương đương.
3. **Đáp án phải đúng.** Với Toán, tự tính lại từng phép. Câu nào không chắc thì bỏ, đừng đoán.
4. **Sau khi tạo file mới, BẮT BUỘC chạy theo thứ tự:**
   ```bash
   node tools/build-index.js   # cập nhật index.json + coverage.json
   node tools/check.js         # cổng kiểm tra — phải ĐẠT (exit 0)
   ```
   Nếu `check.js` báo LỖI CHẶN (đáp án sai, ID trùng, file lỗi) → phải sửa rồi chạy lại. Chỉ commit khi đã ĐẠT.
5. **Để verify đáp án Toán tự động chạy được:** câu Toán nên viết ở dạng có dấu `=`, ví dụ `7 + 2 = ___` hoặc `7 + 2 = ?`. Như vậy công cụ mới tính lại và kiểm tra được.

## Vị trí file

```
exercises/<subject>/lop<grade>/<slug>.json
```

- `<subject>`: `toan` | `tieng-viet` | `tieng-anh`
- `<grade>`: `1` | `2` | `3` | `4` | `5`
- `<slug>`: kebab-case tiếng Việt không dấu, ví dụ `phep-cong-trong-10`, `chu-cai-a`, `colors-and-numbers`

## Cấu trúc file JSON

```json
{
  "id": "toan-l1-phep-cong-trong-10",
  "subject": "toan",
  "grade": 1,
  "topic": "Phép cộng trong phạm vi 10",
  "difficulty": 1,
  "questions": [ /* mảng câu hỏi — xem 3 loại bên dưới */ ]
}
```

### Quy tắc:
- `id`: theo công thức `<subject-rút-gọn>-l<grade>-<slug>` — phải DUY NHẤT trên toàn site.
  - `toan` → `toan`, `tieng-viet` → `tv`, `tieng-anh` → `ta`
  - Ví dụ: `tv-l2-tu-loai-001`, `ta-l3-colors`, `toan-l1-cong-10`
- `topic`: tiêu đề hiển thị (có thể có dấu, có khoảng trắng)
- `chapter` (tùy chọn): tên chương/chủ đề để NHÓM đề trong danh sách, bám SGK. Nên có số đầu để sắp đúng thứ tự (vd `"Chủ đề 2: Phép nhân, phép chia"`, `"Chương 1: Ứng dụng đạo hàm"`). Đề cùng `chapter` sẽ gộp một nhóm; phần "Luyện tập" chỉ hiện nhóm khi môn có ≥2 đề. Đề thi thử (`timeLimit`) tự nằm ở khu riêng, không cần `chapter`.
- `difficulty`: 1-3 (1 = dễ, 3 = khó). Trong mỗi nhóm, đề được sắp dễ→khó theo trường này.
- `questions`: **BẮT BUỘC mỗi đề 15–20 câu** (cổng kiểm tra sẽ cảnh báo nếu ngoài khoảng này). Nên trộn đều cả 3 loại câu hỏi.

---

## 3 LOẠI CÂU HỎI

### 1. Trắc nghiệm 1 đáp án — `multiple-choice`

```json
{
  "type": "multiple-choice",
  "question": "2 + 3 = ?",
  "options": ["4", "5", "6", "7"],
  "answer": 1,
  "hint": "Đếm bằng ngón tay xem nào!"
}
```

- `answer`: **chỉ số (index)** của đáp án đúng trong `options`, bắt đầu từ 0
- `options`: 2-5 lựa chọn
- `hint`: gợi ý hiển thị khi trả lời sai (không bắt buộc)
- `image`: URL hình minh họa (không bắt buộc) — đặt trong `assets/img/`

### 2. Điền đáp án — `fill-blank`

```json
{
  "type": "fill-blank",
  "question": "4 + ___ = 7",
  "answer": "3",
  "alternatives": ["ba"],
  "hint": "7 trừ 4 bằng mấy?"
}
```

- Dùng `___` (3 dấu gạch dưới trở lên) hoặc `...` để đánh dấu chỗ điền
- `answer`: đáp án chính (so sánh không phân biệt hoa thường, đã trim)
- `alternatives`: các cách viết khác cũng chấp nhận (vd "3" và "ba")
- Nên dùng cho:
  - Toán: kết quả phép tính (1 con số)
  - Tiếng Việt: điền từ còn thiếu, viết chính tả từ
  - Tiếng Anh: điền từ vựng

### 3. Ghép cặp — `matching`

```json
{
  "type": "matching",
  "question": "Nối từ tiếng Anh với nghĩa tiếng Việt",
  "pairs": [
    ["red", "đỏ"],
    ["blue", "xanh dương"],
    ["green", "xanh lá"],
    ["yellow", "vàng"]
  ]
}
```

- `pairs`: mảng cặp `[trái, phải]` — sẽ được hiển thị thành 2 cột, cột phải được xáo trộn
- 3-6 cặp là hợp lý

---

## QUY TẮC RIÊNG CHO MÔN TIẾNG ANH (tieng-anh)

**Mọi câu hỏi trong đề Tiếng Anh phải SONG NGỮ:** trường `question` viết bằng tiếng Anh, kèm nghĩa tiếng Việt trong ngoặc đơn ngay sau. Đáp án (`options`/`pairs`) **giữ nguyên** như nội dung cần kiểm tra (KHÔNG thêm dịch nếu sẽ làm lộ đáp án).

Ví dụ:
```json
{ "type": "multiple-choice", "question": "What does 'mother' mean? (Từ 'mother' nghĩa là gì?)", "options": ["bố", "mẹ", "anh trai", "chị gái"], "answer": 1 }
```
- Câu ghép cặp: phần hướng dẫn cũng song ngữ, ví dụ `"Match the word with its meaning (Nối từ với nghĩa)"`.
- **Gạch chân từ:** dùng marker `[u]…[/u]` cho câu "tìm từ đồng nghĩa/trái nghĩa với từ được gạch chân". Ví dụ: `"Choose the word closest in meaning to the underlined word: 'Global warming is a serious [u]threat[/u] to the environment.'"`. Cũng hỗ trợ `[b]…[/b]` (in đậm), `[i]…[/i]` (in nghiêng) cho mọi cấp.
- Áp dụng cho TẤT CẢ đề `tieng-anh`, mọi lớp.

## QUY TẮC CHẤT LƯỢNG ĐỀ

1. **Đúng cấp độ**: lớp 1 không có phép tính 3 chữ số; lớp 5 không hỏi chữ cái
2. **Văn phong thân thiện**: dùng "Bạn", "nhé", tránh giọng cứng
3. **Không gây áp lực**: tránh "SAI rồi", thay bằng "Chưa đúng" / "Cố lên"
4. **Có hint khi câu khó**: ưu tiên hint dạng gợi ý cách làm, không phải đáp án
5. **Không tiếng nước ngoài lẫn lộn**: trừ môn Tiếng Anh
6. **Câu hỏi rõ ràng**: 1 câu = 1 ý cần trả lời

---

## ĐỀ THCS (lớp 6–9) — định dạng riêng

Đề THCS thêm `stage: "thcs"`, `grade` = 6–9, `subject` ∈ `toan` | `ngu-van` | `tieng-anh`. Thư mục `exercises/thcs/lop<n>/<slug>.json`. Số câu **15–20** như tiểu học.

**Công thức Toán — dùng KaTeX** trong `$...$`. Trong JSON phải escape `\` thành `\\`:
```json
{ "type": "multiple-choice", "question": "Khai triển $(a+b)^2$ bằng:", "options": ["$a^2+2ab+b^2$", "$a^2+b^2$"], "answer": 0 }
```
Phân số `$\\frac{a}{b}$`, lũy thừa `$x^2$`, căn `$\\sqrt{16}$`, khác `$\\neq$`.

**Hai loại câu thêm cho THCS (cũng dùng được ở cấp khác):**
- `true-false` — câu Đúng/Sai, `answer` là **boolean**:
  ```json
  { "type": "true-false", "question": "Số 0 là số nguyên dương.", "answer": false, "hint": "..." }
  ```
- **Đọc hiểu** — thêm trường `passage` vào câu `multiple-choice`/`fill-blank`; đoạn văn hiện phía trên câu hỏi. Làm 1 nhóm 3–4 câu CÙNG một `passage` (lặp passage giống nhau ở mỗi câu, vì mỗi lần chỉ hiện 1 câu).
  ```json
  { "type": "multiple-choice", "passage": "Lan is a student...", "question": "How does Lan go to school? (...)", "options": ["By bike", "By bus"], "answer": 0 }
  ```

**Loại câu sắp xếp (ordering) — chủ yếu cho Lịch sử (mốc thời gian), Toán (bước giải), Sinh (chuỗi tiến hóa):**
- Học sinh kéo-thả (chuột/cảm ứng) hoặc dùng nút ▲▼/bàn phím để xếp 3–6 thẻ theo đúng trình tự, rồi bấm "Kiểm tra".
- `items`: mỗi thẻ có `id` duy nhất trong câu + `label` (hỗ trợ KaTeX `$...$`) + tùy chọn `icon` (emoji) và `year`.
- `correctOrder`: mảng `id` theo đúng thứ tự. Hiện CHỈ chấp nhận 1 thứ tự đúng (nếu 2 sự kiện cùng năm, vẫn phải khớp `correctOrder`).
- `hideMeta` (tùy chọn): danh sách field ẩn khi làm bài, hiện lại sau khi chấm (hiện hỗ trợ `"year"`).
  ```json
  {
    "type": "ordering",
    "question": "Sắp xếp các sự kiện sau theo đúng trình tự thời gian:",
    "items": [
      { "id": "cmtt", "label": "Cách mạng tháng Tám", "year": "1945", "icon": "🇻🇳" },
      { "id": "dbp",  "label": "Chiến dịch Điện Biên Phủ", "year": "1954", "icon": "🎖️" },
      { "id": "30-4", "label": "Đại thắng 30/4", "year": "1975", "icon": "🌟" }
    ],
    "correctOrder": ["cmtt", "dbp", "30-4"],
    "hideMeta": ["year"],
    "hint": "..."
  }
  ```

**Hình ảnh trong câu hỏi (mọi loại trừ image-choice mầm non):**
- Thêm trường `image` (URL ảnh, vd `/assets/img/diagrams/sinh-hoc/cau-truc-dna.svg`) và `imageAlt` (mô tả ngắn).
- Click vào ảnh sẽ mở modal phóng to (pinch-zoom trên mobile).
  ```json
  { "type": "multiple-choice", "image": "/assets/img/diagrams/vat-li/mach-dien-don-gian.svg", "imageAlt": "Mạch điện đơn giản gồm pin, bóng đèn, công tắc", "question": "...", "options": [...], "answer": 0 }
  ```
- Thư viện SVG có sẵn: `assets/img/diagrams/<môn>/<tên>.svg` (40 file, 10 Vật lí + 10 Hóa + 10 Sinh + 10 Toán).

**Tiếng Anh THCS:** vẫn theo quy tắc song ngữ (câu hỏi Anh + nghĩa Việt trong ngoặc; đáp án giữ nguyên). Đoạn đọc hiểu là đoạn tiếng Anh ngắn đúng trình độ.

**Lưu ý:** Toán THCS (đại số/hình học) đa phần KHÔNG tự kiểm được đáp án → soạn cẩn thận, tự giải lại từng câu.

## ĐỀ MẦM NON (3–5 tuổi) — định dạng riêng

Trẻ mầm non **chưa biết đọc** → đề dùng **tranh + giọng đọc**, KHÔNG dùng `fill-blank` (không gõ chữ).

File mầm non có thêm `stage: "mam-non"`, dùng `subject` = lĩnh vực và `grade` = tuổi:
```json
{
  "id": "mn-mau-sac-3t",
  "stage": "mam-non",
  "subject": "mau-sac",        // mau-sac | con-vat | dem-so | hinh-khoi
  "grade": 3,                   // tuổi: 3 | 4 | 5
  "topic": "Nhận biết màu sắc",
  "difficulty": 1,
  "questions": [ /* 5–10 câu, chủ yếu image-choice */ ]
}
```
- Thư mục: `exercises/mam-non/age<tuổi>/<lĩnh-vực>.json`
- **Số câu: 5–10** (ngắn vì bé mau chán). Độ khó tăng theo tuổi (3 < 4 < 5); bé 3 tuổi nên 3 lựa chọn, bé 4–5 tuổi 4 lựa chọn.

### Loại câu `image-choice` (chạm vào tranh đúng)
```json
{
  "type": "image-choice",
  "question": "Đâu là màu đỏ?",
  "options": ["🔴", "🟡", "🔵"],
  "answer": 0,
  "prompt": "🍎 🍎 🍎",     // (tùy chọn) tranh hiện ở đề bài, vd để ĐẾM — cách nhau bằng dấu cách
  "speak": "Đâu là màu đỏ?"  // (tùy chọn) câu đọc to, mặc định = question
}
```
- `options` là **emoji** (sẽ tự render thành tranh minh hoạ) hoặc **số** (cho bài đếm). `answer` = chỉ số đáp án đúng.
- Bài ĐẾM: đặt các vật vào `prompt` (cách nhau bằng dấu cách: `"🐶 🐶 🐶"`), `options` là các số.
- Mỗi emoji trong `prompt`/`options` PHẢI cách nhau bằng dấu cách để hiện thành nhiều tranh.
- Câu hỏi được đọc to bằng giọng nói; viết câu hỏi ngắn, rõ.
- **Tránh trùng:** giữa các tuổi, đổi đáp án hoặc cách hỏi (vd hình tròn: bé 3 dùng 🔵, bé 4 dùng 🔴, bé 5 dùng ⚪) để không bị cảnh báo trùng câu.

## SAU KHI TẠO ĐỀ MỚI

```bash
node tools/build-index.js   # cập nhật index.json + coverage.json, cảnh báo câu trùng
node tools/check.js         # cổng kiểm tra tổng hợp — phải ĐẠT
```

Sau đó mở `tools/preview.html` (qua HTTP server) để xem trước.

### Các công cụ kiểm tra

| Lệnh | Tác dụng |
|---|---|
| `node tools/build-index.js` | Sinh `index.json` + `coverage.json`; cảnh báo câu/ID trùng |
| `node tools/verify-answers.js` | Tính lại đáp án Toán, báo câu SAI |
| `node tools/check.js` | **Cổng kiểm tra**: gộp tất cả; thoát mã ≠ 0 nếu có lỗi chặn (dùng trong CI/PR) |

**Lỗi CHẶN (phải sửa):** file sai cấu trúc, ID trùng, đáp án Toán sai, index/coverage cũ.
**Cảnh báo (không chặn, người duyệt liếc):** câu hỏi trùng giữa các file, câu Toán không tự kiểm được.
