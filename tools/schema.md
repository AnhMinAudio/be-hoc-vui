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
- `difficulty`: 1-3 (1 = dễ, 3 = khó)
- `questions`: 5-12 câu là vừa đủ cho 1 buổi luyện

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

## QUY TẮC CHẤT LƯỢNG ĐỀ

1. **Đúng cấp độ**: lớp 1 không có phép tính 3 chữ số; lớp 5 không hỏi chữ cái
2. **Văn phong thân thiện**: dùng "Bạn", "nhé", tránh giọng cứng
3. **Không gây áp lực**: tránh "SAI rồi", thay bằng "Chưa đúng" / "Cố lên"
4. **Có hint khi câu khó**: ưu tiên hint dạng gợi ý cách làm, không phải đáp án
5. **Không tiếng nước ngoài lẫn lộn**: trừ môn Tiếng Anh
6. **Câu hỏi rõ ràng**: 1 câu = 1 ý cần trả lời

---

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
