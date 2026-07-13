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
 * Send Booking Ticket Invoice Email
 */
exports.sendBookingInvoiceEmail = async (booking, trip) => {
  if (!booking.customerEmail) return;

  const subject = `[Á Đông Travel] Hóa đơn điện tử đặt vé xe thành công - Mã số #${booking.orderCode}`;
  
  // Create a QR server image containing the booking code to show in the email
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=ADongTravel-Booking-${booking._id}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #ef4444; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">XÁC NHẬN ĐẶT VÉ THÀNH CÔNG</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Cảm ơn quý khách đã tin tưởng dịch vụ Á Đông Travel</p>
      </div>
      
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h3 style="color: #ef4444; border-bottom: 2px dashed #e2e8f0; padding-bottom: 8px; margin-top: 0;">Mã đặt chỗ: #${booking.orderCode}</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Hành khách:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${booking.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Số điện thoại:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${booking.customerPhone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Năm sinh / CCCD:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${booking.customerBirthYear} / ${booking.customerCCCD}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Mã ghế ngồi:</td>
            <td style="padding: 6px 0; font-weight: bold; color: #ef4444; text-align: right;">${booking.seats.join(', ')}</td>
          </tr>
        </table>

        <h4 style="color: #ef4444; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin: 20px 0 10px 0;">Thông tin chuyến xe</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Lộ trình:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${trip.routeId?.startPoint || ''} &rarr; ${trip.routeId?.endPoint || ''}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Loại xe:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${trip.busId?.name || ''} (${trip.busId?.type || ''})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Giờ khởi hành:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${new Date(trip.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ngày ${new Date(trip.departureTime).toLocaleDateString('vi-VN')}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Điểm đón khách:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; max-width: 250px;">${booking.pickup}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Điểm trả khách:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; max-width: 250px;">${booking.dropoff}</td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 14px; color: #64748b; display: block;">Tổng cộng</span>
            <strong style="font-size: 20px; color: #ef4444;">${formatVND(trip.price * booking.seats.length)}</strong>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 14px; color: #64748b; display: block;">Trạng thái</span>
            <span style="padding: 4px 10px; border-radius: 12px; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: bold;">
              ${booking.status === 'paid' ? 'ĐÃ THANH TOÁN' : 'THANH TOÁN SAU'}
            </span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <p style="font-size: 14px; color: #64748b; margin-bottom: 12px;">Mã QR vé xe (Đưa mã này khi lên xe để soát vé):</p>
          <img src="${qrUrl}" alt="Vé Xe QR Code" style="border: 4px solid #f1f5f9; border-radius: 8px; padding: 8px;" />
        </div>

      </div>

      <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        Email này được gửi tự động. Vui lòng không trả lời email này.<br>
        Á Đông Travel - Tổng đài CSKH: 1900 6067
      </div>
    </div>
  `;

  return await sendEmail(booking.customerEmail, booking.customerName, subject, htmlContent);
};
