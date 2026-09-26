const systemLogs = [];
const systemErrors = [];

// Friendly action description mapper
const getActionDescription = (method, url) => {
  if (url.includes('/auth/login')) return 'Đăng nhập hệ thống';
  if (url.includes('/users/staff') && method === 'POST') return 'Tạo tài khoản nhân viên mới';
  if (url.includes('/users/staff') && method === 'PUT') return 'Cập nhật thông tin nhân viên';
  if (url.includes('/users/staff') && method === 'DELETE') return 'Xóa tài khoản nhân viên';
  if (url.includes('/users/staff') && method === 'GET') return 'Xem danh sách nhân sự';
  if (url.includes('/users/leave') && method === 'POST') return 'Nộp đơn xin nghỉ phép';
  if (url.includes('/users/admin/leaves')) return 'Cập nhật phê duyệt nghỉ phép';
  if (url.includes('/agent/book')) return 'Đặt vé xe trực tiếp tại quầy';
  if (url.includes('/agent/tickets')) return 'Tra cứu & Quản lý vé quầy';
  if (url.includes('/trips/ops/routes') && method === 'POST') return 'Đề xuất Tạo tuyến đường mới';
  if (url.includes('/trips/ops/trips') && method === 'POST') return 'Lên lịch Chuyến xe mới';
  if (url.includes('/trips/fleet/buses')) return 'Quản lý Hồ sơ Đội xe';
  if (url.includes('/system/redis/clear')) return 'Xóa bộ nhớ đệm Redis Cache';
  if (url.includes('/system/db/health-check')) return 'Kiểm tra Sức khỏe CSDL MongoDB';
  
  return `${method} ${url}`;
};

const systemLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Filter out internal system health polling from cluttering audit logs
    if (req.originalUrl.startsWith('/api/v1/system/health') || req.originalUrl === '/health') {
      return;
    }

    const actionDesc = getActionDescription(req.method, req.originalUrl);

    const forwardedFor = req.headers['x-forwarded-for'];
    let clientIp = 
      req.headers['cf-connecting-ip'] || 
      req.headers['x-real-ip'] || 
      (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || 
      req.ip || 
      req.socket.remoteAddress || 
      '127.0.0.1';

    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
      clientIp = '127.0.0.1';
    } else if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    const logEntry = {
      id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toLocaleString('vi-VN'),
      user: req.user?.name || req.user?.email || req.user?.phone || 'Vãng lai / Guest',
      role: req.user?.role || 'Guest',
      ip: clientIp,
      action: `${actionDesc} (${req.method} ${req.originalUrl})`,
      module: req.originalUrl.split('/')[3]?.toUpperCase() || 'SYSTEM',
      level: statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARNING' : 'SUCCESS',
      details: `Phản hồi HTTP ${statusCode} trong ${duration}ms`
    };

    systemLogs.unshift(logEntry);
    if (systemLogs.length > 100) systemLogs.pop();

    // Record HTTP error 4xx / 5xx into errors list
    if (statusCode >= 400) {
      const existingError = systemErrors.find(e => e.endpoint === `${req.method} ${req.originalUrl}` && e.code.startsWith(statusCode.toString()));
      if (existingError) {
        existingError.count += 1;
        existingError.lastOccurred = 'Vài giây trước';
        existingError.timestamp = new Date().toLocaleString('vi-VN');
      } else {
        const errorEntry = {
          id: 'ERR-' + Math.floor(100 + Math.random() * 900),
          code: `${statusCode} ${res.statusMessage || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : 'BAD_REQUEST')}`,
          endpoint: `${req.method} ${req.originalUrl}`,
          count: 1,
          lastOccurred: 'Vừa xong',
          timestamp: new Date().toLocaleString('vi-VN'),
          level: statusCode >= 500 ? 'CRITICAL' : 'WARNING',
          status: 'Đang ghi nhận',
          description: `Phát sinh ngoại lệ HTTP ${statusCode} tại đường dẫn ${req.originalUrl}`
        };
        systemErrors.unshift(errorEntry);
        if (systemErrors.length > 50) systemErrors.pop();
      }
    }
  });

  next();
};

const getSystemLogs = () => systemLogs;
const getSystemErrors = () => systemErrors;

module.exports = {
  systemLogger,
  getSystemLogs,
  getSystemErrors
};
