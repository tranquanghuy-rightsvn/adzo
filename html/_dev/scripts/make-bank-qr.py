"""Sinh mã QR chuyển khoản (chuẩn VietQR/EMVCo, quét được bằng mọi app ngân hàng VN).
Xuất SVG (vector - nét ở mọi kích thước) + PNG lớn dự phòng vào html/assets/img/payment/.
Đổi tài khoản: sửa 3 hằng số dưới rồi chạy: python3 html/_dev/scripts/make-bank-qr.py
"""
import pathlib
import qrcode
import qrcode.image.svg

BANK_BIN = "970416"      # ACB
ACCOUNT = "260613369"
OUT = pathlib.Path(__file__).resolve().parents[2] / "assets/img/payment"


def tlv(tag, value):
    return f"{tag}{len(value):02d}{value}"


def crc16(data):
    crc = 0xFFFF
    for b in data.encode():
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else crc << 1
            crc &= 0xFFFF
    return f"{crc:04X}"


merchant = tlv("00", "A000000727") + tlv("01", tlv("00", BANK_BIN) + tlv("01", ACCOUNT)) + tlv("02", "QRIBFTTA")
payload = tlv("00", "01") + tlv("01", "11") + tlv("38", merchant) + tlv("53", "704") + tlv("58", "VN") + "6304"
payload += crc16(payload)

OUT.mkdir(parents=True, exist_ok=True)
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=2, box_size=24)
qr.add_data(payload)
qr.make(fit=True)
qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(OUT / "qr-code.svg")
try:
    qr.make_image(fill_color="black", back_color="white").save(OUT / "qr-code.png")
except Exception as e:  # PIL không có -> chỉ có SVG
    print("bỏ qua PNG:", e)
print(payload)
