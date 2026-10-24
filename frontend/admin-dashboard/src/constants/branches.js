/**
 * Danh mục 3 Chi nhánh trọng điểm của hệ thống An Bình Lines
 * Áp dụng phân cấp cho Quản lý phòng vé (ticket_manager) và Nhân viên bán vé (ticket_agent)
 */

export const BRANCHES = [
  {
    branchId: 'sg',
    branchName: 'Chi nhánh TP. Hồ Chí Minh',
    name: 'Chi nhánh TP. Hồ Chí Minh',
    shortName: 'TP.HCM',
    province: 'TP. Hồ Chí Minh',
    keywords: ['hồ chí minh', 'sài gòn', 'tp.hcm', 'tp. hồ chí minh', 'bxmđ', 'bxmt', 'hcm'],
    offices: [
      { id: 'sg-bxmd', name: 'Văn phòng Sài Gòn (BXMĐ)', address: '292 Đinh Bộ Lĩnh, P.26, Q. Bình Thạnh' },
      { id: 'sg-bxmt', name: 'Văn phòng Sài Gòn (BXMT)', address: '395 Kinh Dương Vương, P. An Lạc, Q. Bình Tân' }
    ]
  },
  {
    branchId: 'dl',
    branchName: 'Chi nhánh Đà Lạt',
    name: 'Chi nhánh Đà Lạt',
    shortName: 'Đà Lạt',
    province: 'Lâm Đồng',
    keywords: ['đà lạt', 'lâm đồng', 'bx liên tỉnh', 'bùi thị xuân', 'da lat'],
    offices: [
      { id: 'dl-bxlt', name: 'Văn phòng Đà Lạt (BX Liên Tỉnh)', address: '01 Tô Hiến Thành, Phường 3, TP. Đà Lạt' },
      { id: 'dl-btx', name: 'Văn phòng Đà Lạt (Bùi Thị Xuân)', address: 'Bùi Thị Xuân, Phường 2, TP. Đà Lạt' }
    ]
  },
  {
    branchId: 'ct',
    branchName: 'Chi nhánh Cần Thơ',
    name: 'Chi nhánh Cần Thơ',
    shortName: 'Cần Thơ',
    province: 'Cần Thơ',
    keywords: ['cần thơ', 'bx trung tâm', 'ninh kiều', 'can tho'],
    offices: [
      { id: 'ct-bxtt', name: 'Văn phòng Cần Thơ (BX Trung Tâm)', address: 'Khu Đô Thị Nam Cần Thơ, Q. Cái Răng' },
      { id: 'ct-nk', name: 'Văn phòng Cần Thơ (Ninh Kiều)', address: 'Đại lộ Hòa Bình, Q. Ninh Kiều, Cần Thơ' }
    ]
  }
];

export const BRANCH_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả Chi nhánh (Toàn mạng lưới)' },
  { value: 'sg', label: 'Chi nhánh TP. Hồ Chí Minh' },
  { value: 'dl', label: 'Chi nhánh Đà Lạt' },
  { value: 'ct', label: 'Chi nhánh Cần Thơ' }
];

export function getBranchById(branchId) {
  if (!branchId) return null;
  return BRANCHES.find(b => b.branchId === String(branchId).toLowerCase().trim()) || null;
}

export function getBranchName(branchId) {
  const branch = getBranchById(branchId);
  return branch ? branch.branchName : '';
}

export function getOfficesByBranchId(branchId) {
  const branch = getBranchById(branchId);
  return branch ? branch.offices : [];
}
