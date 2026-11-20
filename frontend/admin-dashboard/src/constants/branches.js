/**
 * Danh mục 3 Chi nhánh trọng điểm của hệ thống An Bình Lines
 * Áp dụng phân cấp cho Quản lý phòng vé (ticket_manager) và Nhân viên bán vé (ticket_agent)
 */

export const BRANCHES = [
  {
    branchId: 'sg',
    branchName: 'Chi nhánh TP. Hồ Chí Minh',
    name: 'Chi nhánh TP. Hồ Chí Minh',
    shortName: 'TP. Hồ Chí Minh',
    province: 'Hồ Chí Minh',
    keywords: ['hồ chí minh', 'sài gòn', 'tp.hcm', 'tp. hồ chí minh', 'bxmđ', 'bxmt', 'hcm', 'miền đông', 'miền tây'],
    offices: [
      { id: 'sg-bxmd', name: 'Văn phòng Bến xe Miền Đông', address: '292 Đinh Bộ Lĩnh, Phường 26, Quận Bình Thạnh' },
      { id: 'sg-bxmt', name: 'Văn phòng Bến xe Miền Tây', address: '395 Kinh Dương Vương, Phường An Lạc, Quận Bình Tân' }
    ]
  },
  {
    branchId: 'dl',
    branchName: 'Chi nhánh Đà Lạt',
    name: 'Chi nhánh Đà Lạt',
    shortName: 'Đà Lạt',
    province: 'Lâm Đồng',
    keywords: ['đà lạt', 'lâm đồng', 'bx liên tỉnh', 'bùi thị xuân', 'da lat', 'liên tỉnh'],
    offices: [
      { id: 'dl-bxlt', name: 'Văn phòng Bến xe Liên Tỉnh', address: '01 Tô Hiến Thành, Phường 3, Đà Lạt' },
      { id: 'dl-btx', name: 'Văn phòng Bùi Thị Xuân', address: 'Bùi Thị Xuân, Phường 2, Đà Lạt' }
    ]
  },
  {
    branchId: 'ct',
    branchName: 'Chi nhánh Cần Thơ',
    name: 'Chi nhánh Cần Thơ',
    shortName: 'Cần Thơ',
    province: 'Cần Thơ',
    keywords: ['cần thơ', 'bx trung tâm', 'ninh kiều', 'can tho', 'trung tâm'],
    offices: [
      { id: 'ct-bxtt', name: 'Văn phòng Bến xe Trung Tâm', address: 'Khu Đô Thị Nam Cần Thơ, Quận Cái Răng' },
      { id: 'ct-nk', name: 'Văn phòng Ninh Kiều', address: 'Đại lộ Hòa Bình, Quận Ninh Kiều, Cần Thơ' }
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
