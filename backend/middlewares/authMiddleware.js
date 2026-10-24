const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Bạn cần đăng nhập để truy cập tài nguyên này.'
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_smart_bus_system_2026');
      const userId = decoded.id || decoded._id;
      let branch = decoded.branch;
      if (!branch) {
        const User = require('../models/User');
        const dbUser = await User.findById(userId).select('branch role name').lean();
        if (dbUser && dbUser.branch) {
          branch = dbUser.branch;
        }
      }
      req.user = { ...decoded, id: userId, _id: userId, branch }; // Ensure both id and _id exist, and branch is populated
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn.'
      });
    }
  } catch (error) {
    console.error('Lỗi xác thực middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi xác thực tài khoản.'
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này.'
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
