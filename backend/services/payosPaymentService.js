const crypto = require('crypto');

class PayosPaymentService {
  constructor() {
    this.clientId = process.env.PAYOS_CLIENT_ID;
    this.apiKey = process.env.PAYOS_API_KEY;
    this.checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  }

  getCredentials() {
    return {
      clientId: process.env.PAYOS_CLIENT_ID || this.clientId,
      apiKey: process.env.PAYOS_API_KEY || this.apiKey,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY || this.checksumKey
    };
  }

  /**
   * Tạo liên kết thanh toán payOS (Payment Link & VietQR động)
   */
  async createPaymentLink({ orderCode, amount, description, buyerName, buyerEmail, buyerPhone, cancelUrl, returnUrl }) {
    const { clientId, apiKey, checksumKey } = this.getCredentials();

    if (!clientId || !apiKey || !checksumKey) {
      console.warn('[payOS Payment] Thiếu API Keys trong .env, sử dụng fallback URL.');
      return null;
    }

    const cleanOrderCode = Number(orderCode);
    const cleanAmount = Math.round(Number(amount));
    const cleanDesc = (description || `SmartBus ${cleanOrderCode}`).slice(0, 25);
    const cleanCancelUrl = cancelUrl || 'http://localhost:3000/trips';
    const cleanReturnUrl = returnUrl || 'http://localhost:3000/my-tickets';

    // Chuỗi ký tự sinh chữ ký theo đúng tài liệu payOS:
    // amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}
    const signString = `amount=${cleanAmount}&cancelUrl=${cleanCancelUrl}&description=${cleanDesc}&orderCode=${cleanOrderCode}&returnUrl=${cleanReturnUrl}`;
    const signature = crypto.createHmac('sha256', checksumKey).update(signString).digest('hex');

    const payload = {
      orderCode: cleanOrderCode,
      amount: cleanAmount,
      description: cleanDesc,
      buyerName: buyerName || 'Hành khách',
      buyerEmail: buyerEmail || '',
      buyerPhone: buyerPhone || '',
      cancelUrl: cleanCancelUrl,
      returnUrl: cleanReturnUrl,
      signature
    };

    try {
      const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'x-client-id': clientId,
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok && result.code === '00' && result.data) {
        console.log(`[payOS Payment Link] Tạo link thành công cho đơn #${cleanOrderCode}: ${result.data.checkoutUrl}`);
        return {
          success: true,
          checkoutUrl: result.data.checkoutUrl,
          qrCode: result.data.qrCode,
          accountNumber: result.data.accountNumber,
          accountName: result.data.accountName,
          bin: result.data.bin,
          orderCode: cleanOrderCode,
          amount: cleanAmount
        };
      } else {
        console.warn(`[payOS Payment Link] Lỗi từ payOS:`, result);
        return { success: false, message: result.desc || 'Không thể tạo link payOS' };
      }
    } catch (err) {
      console.error(`[payOS Payment Link] Lỗi mạng khi gọi payOS:`, err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Xác thực chữ ký webhook từ payOS gửi về khi thanh toán thành công
   */
  verifyWebhookSignature(webhookBody) {
    const { checksumKey } = this.getCredentials();
    if (!checksumKey || !webhookBody || !webhookBody.data || !webhookBody.signature) return false;

    const data = webhookBody.data;
    // Sắp xếp các trường của data theo thứ tự alphabet
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys.map(k => `${k}=${data[k] !== undefined && data[k] !== null ? data[k] : ''}`).join('&');
    const calculatedSignature = crypto.createHmac('sha256', checksumKey).update(signString).digest('hex');

    return calculatedSignature === webhookBody.signature;
  }
}

module.exports = new PayosPaymentService();

