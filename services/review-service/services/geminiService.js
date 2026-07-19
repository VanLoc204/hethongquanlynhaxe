const { GoogleGenerativeAI } = require('@google/generative-ai');

// System instructions for Gemini AI Assistant
const SYSTEM_INSTRUCTION = `
Bạn là Trợ lý ảo Á Đông Travel AI - chuyên viên tư vấn và chăm sóc khách hàng thông minh của Công ty Cổ phần Xe khách Á Đông (Á Đông Travel).
Nhiệm vụ của bạn là hỗ trợ tư vấn nhiệt tình, lịch sự, và chuyên nghiệp về dịch vụ xe khách và gửi hàng ký gửi của Á Đông Travel.

Dưới đây là thông tin nghiệp vụ chính thức của nhà xe để bạn trả lời chính xác, tuyệt đối không được tự bịa thông tin:

1. TUYẾN ĐƯỜNG CHÍNH VÀ XE KHÁCH:
   - Tuyến TP. Hồ Chí Minh ↔ Đà Lạt: Khoảng cách ~310km. Thời gian đi khoảng 7-8 tiếng.
     + Dòng xe Giường Nằm 44 Chỗ: Giá vé 400.000đ/vé (Miễn phí nước uống, wifi, gối nằm, chăn đắp).
     + Dòng xe Ghế Ngồi 29 Chỗ: Giá vé 220.000đ/vé.
     + Dòng xe Ghế Ngồi 45 Chỗ: Giá vé 200.000đ/vé.
     + Dòng xe Limousine Ghế Ngồi 9 Chỗ: Giá vé 350.000đ/vé (Cao cấp, cổng sạc điện thoại tại ghế).
   - Tuyến TP. Hồ Chí Minh ↔ Cần Thơ: Khoảng cách ~172km. Thời gian đi khoảng 3 tiếng.
     + Dòng xe Giường Nằm 44 Chỗ: Giá vé 165.000đ/vé.
     + Dòng xe Ghế Ngồi 16 Chỗ: Giá vé 150.000đ/vé.

2. CHÍNH SÁCH HOÀN TIỀN & HỦY VÉ:
   - Khách được hoàn tiền 100% khi thực hiện hủy vé trước giờ khởi hành ít nhất 24 tiếng. Khách có thể tự thực hiện tại mục "Quản lý vé" trên Web/App đặt vé sau khi đăng nhập.
   - Hủy vé trong vòng 24 tiếng trước giờ chạy sẽ không được hỗ trợ hoàn tiền hoặc đổi chuyến.

3. QUY ĐỊNH HÀNH LÝ KÝ GỬI:
   - Mỗi khách hàng được mang miễn phí tối đa 20kg hành lý ký gửi dưới gầm xe. Phụ xe sẽ gắn thẻ hành lý khi kiểm soát xếp xe.
   - Nghiêm cấm mang động vật sống, chất dễ cháy nổ, hóa chất nguy hiểm hoặc vật phẩm bị cấm theo pháp luật lên xe.

4. ƯU ĐÃI THÀNH VIÊN (TÍCH LŨY ĐIỂM):
   - Đặt vé trực tuyến qua tài khoản thành viên sẽ được tích lũy 1% giá trị vé thành điểm (1 điểm = 1.000đ).
   - Điểm này được trừ trực tiếp vào giá vé cho các lần đặt tiếp theo.

5. DỊCH VỤ VẬN CHUYỂN HÀNG HÓA (Á ĐÔNG EXPRESS):
   - Nhận gửi hàng hóa dọc theo các tuyến lộ trình có xe chạy.
   - Cước phí tính theo trọng lượng và phân loại hàng tại quầy giao nhận hàng.
   - Hotline giao nhận hàng: 1900 6068.

6. THÔNG TIN LIÊN HỆ:
   - Tổng đài Đặt vé & CSKH trực tuyến: 1900 6067 (hỗ trợ 24/7).
   - Email hỗ trợ: hotro@adongbus.vn.

QUY TẮC PHẢN HỒI:
- Trả lời bằng tiếng Việt lịch sự, ngắn gọn, súc tích và xưng hô thân mật (Ví dụ: "Á Đông AI xin chào", "Dạ thưa quý khách...", "Á Đông Travel có thể hỗ trợ...").
- Đối với những câu hỏi ngoài lề không liên quan đến dịch vụ nhà xe (như hỏi giải bài tập, viết code, tư vấn tâm lý, hướng dẫn lập trình, ẩm thực ngoài lề...), bạn hãy khéo léo từ chối và hướng đối thoại của khách hàng quay lại các chủ đề đặt vé, tuyến đi, lịch trình hoặc ký gửi hàng của Á Đông Travel.
- Trả lời thẳng vào câu hỏi, tối đa 3-4 câu ngắn gọn, dễ hiểu.
`;

let model = null;

// Initialize Gemini Generative AI
const initGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'fake-key' || apiKey.startsWith('YOUR_')) {
    console.warn('[Gemini Service] Warning: GEMINI_API_KEY is not defined or is placeholder. Chatbot will use rule-based fallback responses.');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // get model with system instructions
    model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION
    });
    console.log('[Gemini Service] Successfully initialized Google Gemini 1.5 Flash.');
    return model;
  } catch (error) {
    console.error('[Gemini Service] Error initializing Gemini Client:', error.message);
    return null;
  }
};

// Fallback rule-based response generator when Gemini is not configured
const getRuleBasedResponse = (userText) => {
  const text = userText.toLowerCase();
  
  if (text.includes('đà lạt') || text.includes('lịch trình') || text.includes('chuyến đi')) {
    return 'Á Đông Travel khai thác tuyến TP. Hồ Chí Minh ↔ Đà Lạt với các dòng xe: Giường nằm 44 chỗ (400k), Limousine 9 phòng (350k), Ghế ngồi (200k - 220k). Thời gian chạy khoảng 7-8 tiếng.';
  }
  
  if (text.includes('cần thơ')) {
    return 'Tuyến TP. Hồ Chí Minh ↔ Cần Thơ có xe Giường nằm 44 chỗ (165k) và Ghế ngồi 16 chỗ (150k). Thời gian chạy khoảng 3 tiếng.';
  }

  if (text.includes('hành lý') || text.includes('đồ đạc') || text.includes('mang theo')) {
    return 'Hành khách được mang theo miễn phí tối đa 20kg hành lý gửi gầm xe. Không mang theo chất cấm,易 cháy nổ và động vật sống lên cabin chính.';
  }

  if (text.includes('hủy vé') || text.includes('hoàn vé') || text.includes('trả vé')) {
    return 'Quý khách được hoàn tiền 100% nếu thực hiện hủy vé trước giờ chạy tối thiểu 24 tiếng tại phần "Quản lý vé". Mọi yêu cầu hủy dưới 24 tiếng sẽ không được hoàn cước.';
  }

  if (text.includes('điểm') || text.includes('thành viên') || text.includes('tích lũy')) {
    return 'Mỗi lần đặt vé thành viên trực tuyến sẽ nhận thêm 1% điểm thưởng tích lũy (1 điểm = 1.000đ) để giảm giá cho các hóa đơn đặt vé kế tiếp.';
  }

  if (text.includes('gửi hàng') || text.includes('bưu phẩm') || text.includes('shipment')) {
    return 'Hệ thống Á Đông Express nhận gửi hàng hóa dọc các tuyến xe chạy. Vui lòng liên hệ tổng đài gửi hàng 1900 6068 để nhận báo giá theo khối lượng.';
  }

  return 'Chào quý khách, tôi là Trợ lý ảo Á Đông AI. Để được giải đáp nhanh chóng về giá vé, tuyến xe, hay hàng ký gửi, quý khách hãy nhập cụ thể câu hỏi hoặc gọi tổng đài cskh 1900 6067 nhé!';
};

const getChatResponse = async (history, newMessage) => {
  // Try to use Gemini first
  if (!model) {
    model = initGemini();
  }

  if (model) {
    try {
      // Map history message format (user -> user, assistant -> model)
      const geminiHistory = (history || []).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Start Chat Session with history context
      const chatSession = model.startChat({
        history: geminiHistory,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        }
      });

      const response = await chatSession.sendMessage(newMessage);
      const textResponse = response.response.text();
      return textResponse;
    } catch (error) {
      console.error('[Gemini Service] API Error:', error.message);
      // Fallback to local rule-based response if API quota exceeded or error occurred
      return getRuleBasedResponse(newMessage);
    }
  }

  // Fallback to rule-based logic
  return getRuleBasedResponse(newMessage);
};

module.exports = {
  getChatResponse
};
