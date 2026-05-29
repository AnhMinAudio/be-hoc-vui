# Tham chiếu cấu trúc đề KIỂM TRA ĐỊNH KỲ — THCS & THPT (dùng chung)

> Áp dụng cho đề ôn tập/đề thi thử giữa kỳ & cuối kỳ bậc THCS (6–9) và THPT (10–12), theo **cấu trúc đề kiểm tra định kỳ "cấu trúc mới"** (Công văn 7991/BGDĐT, áp dụng từ HK2 năm học 2024–2025).
> Nguồn: CV 7991/BGDĐT (thuvienphapluat.vn, luatvietnam.vn); cấu trúc định dạng đề thi tốt nghiệp THPT 2025 (vqa.moet.gov.vn) cho phần dạng câu. Tham khảo CẤU TRÚC & ĐỘ KHÓ, không chép nguyên câu.
> Cập nhật: 2026-05-29.

## A. Cấu trúc đề (cấu trúc mới)
- **Trắc nghiệm khách quan (7 điểm):**
  - **Nhiều lựa chọn** (3đ) — mỗi câu 4 phương án, 1 đúng → loại `multiple-choice`.
  - **Đúng – Sai** (2đ) — mỗi câu 1 ý dẫn + **4 ý nhỏ**, mỗi ý chọn Đúng/Sai → loại `true-false-group` (statements 4 ý).
  - **Trả lời ngắn** (2đ) — điền đáp án cuối → loại `fill-blank`.
- **Tự luận (3 điểm):** trình bày lời giải → nền tảng KHÔNG chấm được; **mô phỏng bằng câu hỏi đáp án cuối** (`fill-blank`) hoặc bỏ phần trình bày.

## B. Ma trận mức độ (nhãn `level`)
| Mức | Nhãn | Tỉ lệ tham khảo |
|---|---|---|
| Nhận biết | `NB` | ~40% |
| Thông hiểu | `TH` | ~30% |
| Vận dụng | `VD` | ~20% |
| Vận dụng cao | `VDC` | ~10% |

> BẮT BUỘC có câu **VD/VDC** (gồm bài toán/tình huống thực tiễn) để đề không quá dễ.

## C. Thời điểm & phạm vi
- Giữa kỳ 1: sau ~tuần 8 HK1; Giữa kỳ 2: sau ~tuần 7 HK2. Cuối kỳ: hết học kỳ.
- Đề "Ôn tập giữa kỳ/cuối kỳ" bám các chương đã học tới kỳ đó (tra cứu mục lục SGK Kết nối tri thức từng môn-lớp).

## D. Cách ra đề trên nền tảng
- Đề THCS/THPT PHẢI có `"stage":"thcs"` hoặc `"stage":"thpt"`.
- Gắn `chapter` = `"Ôn tập giữa kỳ N"` / `"Ôn tập cuối kỳ N"` để gom nhóm; gắn `level` đúng ma trận mục B; gắn `outcomes` theo `curriculum/<mon>-lop<n>-ket-noi.md` nếu có.
- Có thể tạo **đề thi thử** bấm giờ (`timeLimit`, vd 45–90 phút) mô phỏng thời lượng kiểm tra.
- **Toán & KHTN KHÔNG được nền tảng tự verify** → người soạn phải tự giải lại từng câu; nêu rõ phần cần người duyệt.
- Tiếng Anh: câu hỏi **song ngữ** (dẫn Anh + nghĩa Việt), đáp án giữ tiếng Anh. Ngữ văn: ưu tiên Đọc hiểu + Thực hành tiếng Việt (chấm khách quan), tránh phần viết đoạn/bài.

Tham chiếu môn cụ thể đã có: `exam-reference/toan-lop8.md`, `toan-lop9.md`, `toan-lop12.md`.
