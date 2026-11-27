import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_specification_document(filename="DAC_TA_USE_CASE.docx"):
    doc = docx.Document()

    # Căn lề A4 chuẩn báo cáo Khóa luận IUH: Trên 2cm, Dưới 2cm, Trái 2.5cm, Phải 2cm
    for section in doc.sections:
        section.top_margin = docx.shared.Cm(2.0)
        section.bottom_margin = docx.shared.Cm(2.0)
        section.left_margin = docx.shared.Cm(2.5)
        section.right_margin = docx.shared.Cm(2.0)

    # Đặt font chuẩn Times New Roman 13pt
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(13)
    font.color.rgb = RGBColor(0, 0, 0)

    # Thêm bảng kẻ khung đầy đủ tất cả đường viền đen
    table = doc.add_table(rows=0, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>\n'
        f'  <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>\n'
        f'  <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>\n'
        f'  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>\n'
        f'  <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>\n'
        f'  <w:insideH w:val="single" w:sz="6" w:space="0" w:color="000000"/>\n'
        f'  <w:insideV w:val="single" w:sz="6" w:space="0" w:color="000000"/>\n'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

    col_widths = [docx.shared.Cm(3.8), docx.shared.Cm(12.7)]

    def format_para(para, text, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=3):
        para.alignment = align
        para.paragraph_format.space_after = Pt(space_after)
        para.paragraph_format.space_before = Pt(1)
        para.paragraph_format.line_spacing = 1.15
        run = para.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)
        run.bold = bold
        return run

    def add_merged_row(text, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT):
        row = table.add_row()
        cell = row.cells[0]
        cell.merge(row.cells[1])
        cell.width = docx.shared.Cm(16.5)
        p = cell.paragraphs[0]
        format_para(p, text, bold=bold, align=align, space_after=3)
        return cell

    def add_2col_row(col1_text, col2_text, col1_bold=True, col2_bold=False):
        row = table.add_row()
        row.cells[0].width = col_widths[0]
        row.cells[1].width = col_widths[1]
        
        p1 = row.cells[0].paragraphs[0]
        format_para(p1, col1_text, bold=col1_bold, space_after=3)
        
        p2 = row.cells[1].paragraphs[0]
        format_para(p2, col2_text, bold=col2_bold, space_after=3)
        return row

    # 1. Tiêu đề Use Case (gộp 2 cột)
    add_merged_row("Đặt vé trực tuyến và chọn ghế", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)

    # 2. Tiền điều kiện, Hậu điều kiện, Actor chính, Actor phụ
    add_2col_row("Tiền điều kiện", "Khách hàng đã tìm kiếm và bấm \"Chọn chuyến\" tại một chuyến xe cụ thể còn chỗ trống.")
    add_2col_row("Hậu điều kiện", "Hệ thống tạo đơn giữ chỗ tạm thời thành công với các vị trí ghế đã chọn, tính tổng tiền vé và chuyển sang bước thanh toán.")
    add_2col_row("Actor chính", "Khách hàng")
    add_2col_row("Actor phụ", "Không")

    # 3. Tiêu đề Basic flow (gộp 2 cột)
    add_merged_row("Basic flow", bold=True, align=WD_ALIGN_PARAGRAPH.LEFT)

    # 4. Tiêu đề 2 cột
    add_2col_row("Khách hàng", "Hệ thống", col1_bold=True, col2_bold=True)

    # 5. Các bước Basic Flow đánh số so le
    steps = [
        ("1. Khách hàng xem sơ đồ chỗ ngồi của chuyến xe (hiển thị trực quan tầng dưới/tầng trên đối với xe giường nằm hoặc limousine).",
         "2. Hệ thống hiển thị trạng thái từng ghế: ghế còn trống, ghế đang chọn và ghế đã có người mua."),
        ("3. Khách hàng bấm chọn các vị trí ghế mong muốn trên sơ đồ.",
         "4. Hệ thống đánh dấu các ghế vừa chọn, tính toán số lượng vé và cập nhật tạm tính tổng tiền vé."),
        ("5. Khách hàng lựa chọn Điểm đón và Điểm trả trong danh sách các trạm dừng đón/trả cố định của chuyến đi.",
         "6. Hệ thống ghi nhận điểm đón/trả và hiển thị biểu mẫu điền thông tin người nhận vé."),
        ("7. Khách hàng nhập thông tin nhận vé (Họ tên, Số điện thoại, CCCD, Năm sinh, Email hoặc tự động điền nếu đã đăng nhập) (nhập mã giảm giá/điểm thưởng nếu có).",
         "8. Hệ thống kiểm tra mã giảm giá/điểm thưởng và cập nhật lại số tiền thanh toán thực tế."),
        ("9. Khách hàng kiểm tra lại tóm tắt thông tin chuyến đi và nhấn nút \"Tiếp tục thanh toán\".",
         "10. Hệ thống kiểm tra tính hợp lệ của toàn bộ thông tin đặt vé và thông tin hành khách."),
        ("",
         "11. Hệ thống tạm khóa các vị trí ghế vừa chọn trong thời gian quy định (5 phút) để tránh người khác đặt trùng."),
        ("",
         "12. Hệ thống khởi tạo đơn đặt vé tạm thời, kích hoạt đồng hồ đếm ngược thời gian giữ chỗ và chuyển sang màn hình Thanh toán.")
    ]

    for s1, s2 in steps:
        add_2col_row(s1, s2, col1_bold=False, col2_bold=False)

    # 6. Tiêu đề Alternative flow (gộp 2 cột)
    add_merged_row("Alternative flow", bold=True, align=WD_ALIGN_PARAGRAPH.LEFT)

    # 7. Nội dung Alternative flow (gộp 1 ô toàn chiều rộng)
    row_alt = table.add_row()
    cell_alt = row_alt.cells[0]
    cell_alt.merge(row_alt.cells[1])
    cell_alt.width = docx.shared.Cm(16.5)

    alt_items = [
        ("3.A1 Chọn vào ghế đã có người mua hoặc đang được người khác giữ", [
            "1. Hệ thống không cho phép chọn và hiển thị thông báo: \"Ghế này đã có người đặt, vui lòng chọn ghế khác\".",
            "2. Khách hàng chọn vị trí ghế trống khác trên sơ đồ.",
            "3. Quay lại bước 3."
        ]),
        ("3.A2 Chọn vượt quá số lượng ghế tối đa cho phép trong một lần đặt", [
            "1. Hệ thống hiển thị cảnh báo: \"Mỗi giao dịch chỉ được đặt tối đa 5 ghế\".",
            "2. Khách hàng bỏ bớt ghế đã chọn hoặc giữ nguyên số ghế hợp lệ.",
            "3. Quay lại bước 3."
        ]),
        ("3.A3 Khách hàng bấm hủy chọn một ghế đã nhấp", [
            "1. Khách hàng nhấp lại vào vị trí ghế đang chọn.",
            "2. Hệ thống chuyển ghế đó về trạng thái còn trống và tự động trừ bớt tiền vé tương ứng trong tổng tiền.",
            "3. Quay lại bước 3."
        ]),
        ("5.A1 Chưa chọn Điểm đón hoặc Điểm trả", [
            "1. Hệ thống hiển thị cảnh báo: \"Vui lòng chọn Điểm đón và Điểm trả khách\".",
            "2. Khách hàng chọn điểm đón/trả phù hợp.",
            "3. Quay lại bước 8."
        ]),
        ("6.A1 Thông tin hành khách để trống hoặc sai định dạng", [
            "1. Hệ thống hiển thị thông báo lỗi chi tiết tại ô nhập liệu không hợp lệ (Họ tên không chứa số; Số điện thoại phải đúng 10 số; Số CCCD phải đúng 12 chữ số; Năm sinh không hợp lệ).",
            "2. Khách hàng sửa lại thông tin chính xác.",
            "3. Quay lại bước 8."
        ]),
        ("7.A1 Mã giảm giá không hợp lệ hoặc đã hết hạn", [
            "1. Hệ thống hiển thị thông báo: \"Mã giảm giá không tồn tại hoặc đã hết lượt sử dụng\".",
            "2. Hệ thống giữ nguyên giá vé gốc chưa giảm.",
            "3. Khách hàng nhập mã khác hoặc bỏ qua bước này."
        ]),
        ("10.A1 Ghế bị người khác nhanh tay đặt trước ngay lúc xác nhận", [
            "1. Trong lúc khách hàng đang điền thông tin, có người khác đã hoàn tất giữ chỗ vị trí ghế đó trước.",
            "2. Hệ thống cập nhật lại trạng thái ghế trên sơ đồ thành \"Đã bán\" và thông báo: \"Rất tiếc, ghế vừa được đặt bởi khách hàng khác. Vui lòng chọn ghế thay thế\".",
            "3. Khách hàng chọn lại ghế còn trống khác.",
            "4. Quay lại bước 3."
        ])
    ]

    p_first = cell_alt.paragraphs[0]
    for idx, (title, sub_steps) in enumerate(alt_items):
        p_title = p_first if idx == 0 else cell_alt.add_paragraph()
        format_para(p_title, title, bold=True, space_after=2)
        for s in sub_steps:
            p_sub = cell_alt.add_paragraph()
            format_para(p_sub, s, bold=False, space_after=2)
        if idx < len(alt_items) - 1:
            p_space = cell_alt.add_paragraph()
            p_space.paragraph_format.space_before = Pt(0)
            p_space.paragraph_format.space_after = Pt(4)

    # 8. Tiêu đề Exception (gộp 2 cột)
    add_merged_row("Exception", bold=True, align=WD_ALIGN_PARAGRAPH.LEFT)

    # 9. Nội dung Exception (gộp 1 ô toàn chiều rộng)
    row_exc = table.add_row()
    cell_exc = row_exc.cells[0]
    cell_exc.merge(row_exc.cells[1])
    cell_exc.width = docx.shared.Cm(16.5)

    exc_items = [
        ("11.E1 Hết thời gian giữ chỗ tạm thời (Quá 5 phút chưa thanh toán)", [
            "1. Đồng hồ đếm ngược đếm về 00:00.",
            "2. Hệ thống tự động hủy đơn đặt vé tạm thời và giải phóng các vị trí ghế trở lại trạng thái còn trống cho khách khác chọn.",
            "3. Hệ thống hiển thị thông báo: \"Đã hết thời gian giữ vé. Vui lòng thực hiện đặt lại vé\".",
            "4. Kết thúc use case."
        ]),
        ("11.E2 Mất kết nối đường truyền trong lúc tạo đơn giữ chỗ", [
            "1. Hệ thống hiển thị thông báo: \"Không thể kết nối đến máy chủ, vui lòng kiểm tra mạng và thử lại\".",
            "2. Kết thúc use case."
        ])
    ]

    p_first_exc = cell_exc.paragraphs[0]
    for idx, (title, sub_steps) in enumerate(exc_items):
        p_title = p_first_exc if idx == 0 else cell_exc.add_paragraph()
        format_para(p_title, title, bold=True, space_after=2)
        for s in sub_steps:
            p_sub = cell_exc.add_paragraph()
            format_para(p_sub, s, bold=False, space_after=2)
        if idx < len(exc_items) - 1:
            p_space = cell_exc.add_paragraph()
            p_space.paragraph_format.space_before = Pt(0)
            p_space.paragraph_format.space_after = Pt(4)

    doc.save(filename)
    print(f"SUCCESS: Exported {filename}")

if __name__ == "__main__":
    create_specification_document("DAC_TA_USE_CASE.docx")
