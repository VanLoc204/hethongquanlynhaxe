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
      let role = decoded.role;
      let name = decoded.name;
      let assignedOffice = decoded.assignedOffice;

      const User = require('../models/User');
      const dbUser = await User.findById(userId).select('role name phone status').lean();
      if (!dbUser) {
        return res.status(401).json({
          success: false,
          message: 'Tài khoản không tồn tại hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        });
      }
      if (!role || role !== dbUser.role) role = dbUser.role;
      if (!name || name !== dbUser.name) name = dbUser.name;

      if (role && role !== 'customer') {
        const EmployeeProfile = require('../models/EmployeeProfile');
        const emp = await EmployeeProfile.findById(userId).lean();
        if (emp && emp.branch) {
          branch = emp.branch;
        }

        if (role === 'ticket_agent') {
          const TicketAgentProfile = require('../models/TicketAgentProfile');
          const agent = await TicketAgentProfile.findById(userId).lean();
          if (agent) {
            assignedOffice = agent.assignedOffice;
            branch = {
              ...(branch || { branchId: 'sg', branchName: 'Chi nhánh TP. Hồ Chí Minh' }),
              assignedOffices: [assignedOffice]
            };
          }
        }
      }

      req.user = { 
        ...decoded, 
        id: userId, 
        _id: userId, 
        branch, 
        role, 
        name, 
        assignedOffice
      };
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

const optionalProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_smart_bus_system_2026');
      const userId = decoded.id || decoded._id;
      req.user = { ...decoded, id: userId, _id: userId };
    } catch (e) {}
    next();
  } catch (err) {
    next();
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

module.exports = { protect, optionalProtect, restrictTo };
