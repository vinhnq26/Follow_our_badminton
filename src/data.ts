import type { ExpenseCategory, Match } from './types'

const id = () => Math.random().toString(36).slice(2, 10)
const at = (daysFromNow: number, hour: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const line = (label: string, amount: number) => ({ id: id(), label, amount })
const expense = (category: ExpenseCategory, label: string, amount: number) => ({ id: id(), category, label, amount })

export const seedMatches = (): Match[] => {
  const now = new Date().toISOString()
  return [
    {
      id: 'seed-next', startsAt: at(2, 19), venue: 'Nhà thi đấu Phú Thọ', courtNumber: 'Sân 04',
      incomeItems: [line('Đóng góp thành viên', 1800000)],
      expenseItems: [expense('court', 'Tiền sân', 750000), expense('water', 'Nước suối', 120000), expense('shuttlecock', 'Cầu thi đấu', 420000), expense('other', 'Khăn lạnh', 60000)],
      notes: 'Nhớ mang áo nhóm và đến sớm 10 phút để khởi động.', createdAt: now, updatedAt: now,
    },
    {
      id: 'seed-past-1', startsAt: at(-3, 18), venue: 'Cầu lông Tân Bình', courtNumber: 'Sân 02',
      incomeItems: [line('Đóng góp thành viên', 1600000)],
      expenseItems: [expense('court', 'Tiền sân', 680000), expense('water', 'Nước & điện giải', 150000), expense('shuttlecock', 'Cầu Yonex', 360000)],
      notes: 'Buổi giao lưu cuối tuần.', createdAt: now, updatedAt: now,
    },
    {
      id: 'seed-past-2', startsAt: at(-12, 19), venue: 'Nhà thi đấu Phú Thọ', courtNumber: 'Sân 03',
      incomeItems: [line('Đóng góp thành viên', 1700000), line('Quỹ nhóm', 200000)],
      expenseItems: [expense('court', 'Tiền sân', 750000), expense('water', 'Nước suối', 100000), expense('shuttlecock', 'Cầu thi đấu', 480000), expense('other', 'Gửi xe', 80000)],
      createdAt: now, updatedAt: now,
    },
    {
      id: 'seed-past-3', startsAt: at(-41, 18), venue: 'Sân cầu lông Bình Thạnh', courtNumber: 'Sân 01',
      incomeItems: [line('Đóng góp thành viên', 1400000)],
      expenseItems: [expense('court', 'Tiền sân', 620000), expense('water', 'Nước suối', 90000), expense('shuttlecock', 'Cầu thi đấu', 300000)],
      notes: 'Buổi đầu tiên của tháng trước.', createdAt: now, updatedAt: now,
    },
    {
      id: 'seed-past-4', startsAt: at(-68, 19), venue: 'Cầu lông Tân Bình', courtNumber: 'Sân 05',
      incomeItems: [line('Đóng góp thành viên', 1550000)],
      expenseItems: [expense('court', 'Tiền sân', 680000), expense('water', 'Nước & điện giải', 140000), expense('shuttlecock', 'Cầu thi đấu', 350000), expense('other', 'Khăn lạnh', 50000)],
      createdAt: now, updatedAt: now,
    },
  ]
}
