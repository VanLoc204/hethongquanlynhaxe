const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Send an email using multiple providers:
 * 1. Gmail SMTP (GMAIL_USER & GMAIL_APP_PASSWORD)
 * 2. Custom SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * 3. Resend API (RESEND_API_KEY)
 * 4. Brevo Transactional REST API (BREVO_API_KEY)
 */
const sendEmail = async (toEmail, toName, subject, htmlContent) => {
  // 1. Brevo REST API (HTTPS Port 443) - Ưu tiên hàng đầu trên Cloud (Render) vì không bị chặn port SMTP
  const apiKey = process.env.BREVO_API_KEY;
  if (apiKey && apiKey !== 'fake-key') {
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
            name: 'An Bình Lines',
            email: process.env.SENDER_EMAIL || process.env.GMAIL_USER || 'hovanloc.lv@gmail.com'
          },
          to: [
            {
              email: toEmail,
              name: toName || toEmail
            }
          ],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      const data = await response.json();
      if (response.ok) {
        console.log('[Brevo API Response]: Email gửi thành công tới:', toEmail, data);
        return { success: true, provider: 'brevo', data };
      } else {
        console.warn('⚠️ [Brevo API Warning]:', data.message || data);
      }
    } catch (err) {
      console.warn('[Brevo API Network Warning]:', err.message);
    }
  }

  // 2. Gửi qua Resend API nếu có cấu hình RESEND_API_KEY (HTTPS Port 443)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'An Binh Lines <onboarding@resend.dev>',
          to: [toEmail],
          subject: subject,
          html: htmlContent
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log('[Resend API] Email gửi thành công tới:', toEmail, data.id);
        return { success: true, provider: 'resend', data };
      } else {
        console.warn('[Resend API Warning]:', data);
      }
    } catch (resendErr) {
      console.warn('[Resend API Network Warning]:', resendErr.message);
    }
  }

  // 3. Gmail SMTP (với connectionTimeout 3000ms để không bao giờ treo request nếu Render chặn port SMTP 465/587)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 3500,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '')
        }
      });
      const info = await transporter.sendMail({
        from: `"An Bình Lines" <${process.env.GMAIL_USER}>`,
        to: `"${toName}" <${toEmail}>`,
        subject: subject,
        html: htmlContent
      });
      console.log('[Gmail SMTP] Email gửi thành công tới:', toEmail, info.messageId);
      return { success: true, provider: 'gmail_smtp', messageId: info.messageId };
    } catch (gmailErr) {
      console.warn('[Gmail SMTP Warning]:', gmailErr.message);
    }
  }

  // 4. Custom SMTP chung (hỗ trợ Mailgun, SendGrid hoặc server SMTP riêng)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 3500,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      const info = await transporter.sendMail({
        from: `"An Bình Lines" <${process.env.SENDER_EMAIL || process.env.SMTP_USER}>`,
        to: `"${toName}" <${toEmail}>`,
        subject: subject,
        html: htmlContent
      });
      console.log('[Custom SMTP] Email gửi thành công tới:', toEmail, info.messageId);
      return { success: true, provider: 'custom_smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.warn('[Custom SMTP Warning]:', smtpErr.message);
    }
  }

  // Fallback Mock Log
  console.log('============================================================');
  console.log(`[EMAIL NOTICE] TO: ${toName} <${toEmail}>`);
  console.log(`SUBJECT: ${subject}`);
  console.log('Vui lòng kiểm tra lại cấu hình Brevo API key hoặc xác thực IP trong email Brevo.');
  console.log('============================================================');
  return { success: false, message: 'Dịch vụ email chưa hoàn tất gửi thật', isMock: true };
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

  const subject = `[An Bình Lines] Hóa đơn điện tử đặt vé xe thành công - Mã số #${booking.orderCode}`;
  
  // Create a QR server image containing the booking code to show in the email
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=AnBinhLines-Booking-${booking._id}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #ef4444; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">XÁC NHẬN ĐẶT VÉ THÀNH CÔNG</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Cảm ơn quý khách đã tin tưởng dịch vụ An Bình Lines</p>
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
        An Bình Lines - Tổng đài CSKH: 1900 6067
      </div>
    </div>
  `;

  return await sendEmail(booking.customerEmail, booking.customerName, subject, htmlContent);
};

/**
 * Send Shipment Invoice Email
 */
exports.sendShipmentInvoiceEmail = async (shipment) => {
  if (!shipment.senderEmail) return;

  const subject = `[An Bình Express] Hóa đơn ký gửi hàng hóa thành công - Mã vận đơn ${shipment.shipmentId}`;

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
            Quý khách có thể truy cập website An Bình Express và nhập mã vận đơn <strong>${shipment.shipmentId}</strong> để tra cứu hành trình vận đơn trực tuyến.
          </p>
        </div>

      </div>

      <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        Email này được gửi tự động. Vui lòng không trả lời email này.<br>
        An Bình Express - Hotline vận tải hàng hóa: 1900 6068
      </div>
    </div>
  `;

  return await sendEmail(shipment.senderEmail, shipment.senderName, subject, htmlContent);
};

/**
 * Send Register Account OTP Verification Email
 */
exports.sendRegisterOtpEmail = async (toEmail, otp, expiresInMinutes = 3) => {
  if (!toEmail) return { success: false, error: 'Email không được để trống' };

  const subject = `[An Bình Lines] Mã xác thực đăng ký tài khoản - Mã số #${otp}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">XÁC THỰC EMAIL ĐĂNG KÝ TÀI KHOẢN</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Chào mừng bạn đến với hệ thống vé xe khách An Bình Lines</p>
      </div>
      
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h3 style="color: #2563eb; border-bottom: 2px dashed #e2e8f0; padding-bottom: 8px; margin-top: 0;">Mã xác thực email của bạn</h3>
        
        <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px;">
          Xin chào quý khách,<br/>
          Hệ thống nhận được yêu cầu đăng ký tài khoản thành viên mới với địa chỉ email này. Để xác thực email này là có thật và hoàn tất việc tạo tài khoản, vui lòng nhập mã OTP 6 chữ số dưới đây:
        </p>

        <div style="background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13.5px; color: #dc2626; font-weight: bold;">
            ⏱️ Mã OTP này có hiệu lực trong vòng ${expiresInMinutes} phút (${expiresInMinutes * 60} giây).
          </p>
          <p style="margin: 6px 0 0 0; font-size: 12.5px; color: #64748b;">
            Sau khi đăng ký thành công, email này sẽ được dùng để nhận hóa đơn vé điện tử và cấp lại mật khẩu khi cần thiết.
          </p>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
          Nếu bạn không thực hiện đăng ký tài khoản tại An Bình Lines, xin vui lòng bỏ qua thư này.
        </p>
      </div>

      <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        Email này được gửi tự động từ hệ thống An Bình Lines. Vui lòng không trả lời email này.<br>
        An Bình Lines - Dịch vụ vận tải hành khách chất lượng cao.
      </div>
    </div>
  `;

  return await sendEmail(toEmail, 'Thành viên mới', subject, htmlContent);
};

/**
 * Send Forgot Password OTP Verification Email
 * Designed with the exact same template, branding, and high delivery structure as Booking Invoice Email
 */
exports.sendForgotPasswordOtpEmail = async (toEmail, userName, otp, expiresInMinutes = 3) => {
  if (!toEmail) return { success: false, error: 'Email không được để trống' };

  const subject = `[An Bình Lines] Mã xác thực OTP khôi phục mật khẩu - Mã số #${otp}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #ef4444; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">XÁC THỰC KHÔI PHỤC MẬT KHẨU</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Hệ thống vé xe khách trực tuyến An Bình Lines</p>
      </div>
      
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h3 style="color: #ef4444; border-bottom: 2px dashed #e2e8f0; padding-bottom: 8px; margin-top: 0;">Mã OTP bảo mật của quý khách</h3>
        
        <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px;">
          Xin chào <strong>${userName || 'Quý khách'}</strong>,<br/>
          Chúng tôi nhận được yêu cầu cấp lại mật khẩu cho tài khoản đăng ký với email này. Vui lòng nhập mã xác thực OTP 6 số dưới đây để tiếp tục thiết lập mật khẩu mới:
        </p>

        <div style="background-color: #fff1f2; border: 2px dashed #ef4444; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #b91c1c; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13.5px; color: #dc2626; font-weight: bold;">
            ⏱️ Mã OTP này có hiệu lực trong vòng ${expiresInMinutes} phút (${expiresInMinutes * 60} giây).
          </p>
          <p style="margin: 6px 0 0 0; font-size: 12.5px; color: #64748b;">
            Vì lý do an toàn thông tin, tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai, kể cả nhân viên nhà xe.
          </p>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
          Nếu quý khách không gửi yêu cầu này, vui lòng bỏ qua thư hoặc liên hệ hotline <strong>1900 6067</strong> để được hỗ trợ bảo mật tài khoản.
        </p>
      </div>

      <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        Email này được gửi tự động từ hệ thống An Bình Lines. Vui lòng không trả lời email này.<br>
        An Bình Lines - Dịch vụ vận tải hành khách chất lượng cao.
      </div>
    </div>
  `;

  return await sendEmail(toEmail, userName || 'Quý khách', subject, htmlContent);
};

/**
 * Send Change Password OTP Verification Email (2FA Security)
 */
exports.sendChangePasswordOtpEmail = async (toEmail, userName, otp, expiresInMinutes = 3) => {
  if (!toEmail) return { success: false, error: 'Email không được để trống' };

  const subject = `[An Bình Lines] Mã xác thực OTP đổi mật khẩu (2FA) - Mã số #${otp}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">XÁC THỰC ĐỔI MẬT KHẨU (2FA)</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Hệ thống vé xe khách trực tuyến An Bình Lines</p>
      </div>
      
      <div style="padding: 24px; color: #334155; line-height: 1.6;">
        <h3 style="color: #2563eb; border-bottom: 2px dashed #e2e8f0; padding-bottom: 8px; margin-top: 0;">Mã OTP xác thực bảo mật 2 lớp</h3>
        
        <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px;">
          Xin chào <strong>${userName || 'Quý khách'}</strong>,<br/>
          Hệ thống vừa nhận được yêu cầu đổi mật khẩu cho tài khoản của bạn. Để hoàn tất quy trình bảo mật 2FA, vui lòng nhập mã xác thực OTP 6 số dưới đây:
        </p>

        <div style="background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace;">
            ${otp}
          </span>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13.5px; color: #dc2626; font-weight: bold;">
            ⏱️ Mã OTP này có hiệu lực trong vòng ${expiresInMinutes} phút (${expiresInMinutes * 60} giây).
          </p>
          <p style="margin: 6px 0 0 0; font-size: 12.5px; color: #64748b;">
            Vì lý do an toàn thông tin, tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai, kể cả nhân viên nhà xe.
          </p>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
          Nếu quý khách không yêu cầu đổi mật khẩu, vui lòng liên hệ ngay hotline <strong>1900 6067</strong> để khóa tài khoản khẩn cấp.
        </p>
      </div>

      <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        Email này được gửi tự động từ hệ thống An Bình Lines. Vui lòng không trả lời email này.<br>
        An Bình Lines - Dịch vụ vận tải hành khách chất lượng cao.
      </div>
    </div>
  `;

  return await sendEmail(toEmail, userName || 'Quý khách', subject, htmlContent);
};

exports.sendEmail = sendEmail;
