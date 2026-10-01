import type { GroupProfile, Member } from './types'

export const GROUP_PROFILE: GroupProfile = {
  name: 'Nhóm cầu lông Vé Xe Rẻ nè',
  address: '10 Bế Văn Cấm, Tân Hưng, Hồ Chí Minh',
  defaultVenue: 'Sân cầu lông PIXIHUB',
  playDay: 5,
}

const roster = [
  'Nguyễn Hoài Nhân',
  'Nguyễn Thị Ý',
  'Phạm Ngọc Bích Trâm',
  'Trần Thị Thân Thương',
  'Bạch Thị Mỹ Hạnh',
  'Hồ Bảo Vy',
  'Trần Thái Xông',
  'Danh Minh Hoà',
  'Lê Thị Gia Hân',
  'Phan Nguyễn Anh Vinh',
  'Nguyễn Quốc Vinh'
]

export const initialMembers: Member[] = roster.map((name, index) => ({
  id: `member-${index + 1}`,
  name,
  active: true,
}))

export const nextFriday = (from = new Date()) => {
  const date = new Date(from)
  date.setHours(19, 0, 0, 0)
  const daysUntilFriday = (5 - date.getDay() + 7) % 7
  if (daysUntilFriday === 0 && date.getTime() <= from.getTime()) date.setDate(date.getDate() + 7)
  else date.setDate(date.getDate() + daysUntilFriday)
  return date
}
