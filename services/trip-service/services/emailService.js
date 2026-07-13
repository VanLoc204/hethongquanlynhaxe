const dotenv = require('dotenv');
dotenv.config();

/**
 * Send an email using Brevo's Transactional API
 */
const sendEmail = async (toEmail, toName, subject, htmlContent) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey || apiKey === 'fake-key') {
    console.log('============================================================');
    console.log(`[MOCK EMAIL SENT] TO: ${toName} <${toEmail}>`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: (Mocked template generated successfully. Please set BREVO_API_KEY in .env for real email sending)`);
    console.log('============================================================');
    return { success: true, message: 'Mock email logged successfully' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Á Đông Travel',
          email: 'hovanloc.lv@gmail.com'
        },
        to: [
          {
            email: toEmail,
            name: toName
          }
        ],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const data = await response.json();
    console.log('[Brevo API Response]:', data);
    return { success: true, data };
  } catch (err) {
    console.error('[Brevo SMTP Error]:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Format currency helper
 */
const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};



/**
 * Send Shipment Invoice Email
 */
exports.sendShipmentInvoiceEmail = async (shipment) => {
  if (!shipment.senderEmail) return;

  const subject = `[Á Đông Express] Hóa đơn ký gửi hàng hóa thành công - Mã vận đơn ${shipment.shipmentId}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #3b82f6; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">XÁC NHẬN GỬI HÀNG THÀNH CÔNG</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Đơn hàng của quý khách đã được thu nhận tại bưu cục</p>
      </div>
      
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h3 style="color: #3b82f6; border-bottom: 2px dashed #e2e8f0; padding-bottom: 8px; margin-top: 0;">Mã vận đơn tra cứu: ${shipment.shipmentId}</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div>
            <h4 style="color: #3b82f6; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin: 0 0 8px 0;">Người gửi</h4>
            <p style="margin: 4px 0; font-size: 14px;"><strong>${shipment.senderName}</strong></p>
            <p style="margin: 4px 0; font-size: 14px; color: #64748b;">SĐT: ${shipment.senderPhone}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #64748b;">Nơi gửi: ${shipment.fromCity}</p>
          </div>
          <div>
            <h4 style="color: #3b82f6; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin: 0 0 8px 0;">Người nhận</h4>
            <p style="margin: 4px 0; font-size: 14px;"><strong>${shipment.receiverName}</strong></p>
            <p style="margin: 4px 0; font-size: 14px; color: #64748b;">SĐT: ${shipment.receiverPhone}</p>
            <p style="margin: 4px 0; font-size: 14px; color: #64748b;">Nơi nhận: ${shipment.toCity}</p>
          </div>
        </div>

        <h4 style="color: #3b82f6; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin: 20px 0 10px 0;">Thông tin bưu gửi</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Nội dung hàng hóa:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${shipment.content || 'Hàng hóa thông thường'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Trọng lượng:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${shipment.weight} kg</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Hình thức thanh toán:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${shipment.paymentType === 'immediate' ? 'Mã QR PayOS' : 'Thanh toán tại quầy'}</td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 14px; color: #64748b; display: block;">Cước phí vận chuyển</span>
            <strong style="font-size: 20px; color: #3b82f6;">${formatVND(shipment.fee)}</strong>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 14px; color: #64748b; display: block;">Trạng thái cước</span>
            <span style="padding: 4px 10px; border-radius: 12px; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: bold;">
              ${shipment.paymentStatus === 'paid' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
            </span>
          </div>
        </div>

        <div style="background-color: #eff6ff; border: 1px dashed #bfdbfe; border-radius: 8px; padding: 14px; text-align: center;">
          <p style="font-size: 14px; color: #1e40af; margin: 0;">
            Quý khách có thể truy cập website Á Đông Express và nhập mã vận đơn <strong>${shipment.shipmentId}</strong> để tra cứu hành trình vận đơn trực tuyến.
          </p>
        </div>

      </div>

      <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        Email này được gửi tự động. Vui lòng không trả lời email này.<br>
        Á Đông Express - Hotline vận tải hàng hóa: 1900 6068
      </div>
    </div>
  `;

  return await sendEmail(shipment.senderEmail, shipment.senderName, subject, htmlContent);
};
