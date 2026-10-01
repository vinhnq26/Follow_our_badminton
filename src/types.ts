export type ExpenseCategory = 'court' | 'water' | 'shuttlecock' | 'other'

export type GroupProfile = {
  name: string
  address: string
  defaultVenue: string
  playDay: 5
}

export type Member = {
  id: string
  name: string
  active: boolean
  removedAt?: string
}

export type FinanceLine = {
  id: string
  label: string
  amount: number
}

export type ExpenseLine = FinanceLine & {
  category: ExpenseCategory
}

export type Match = {
  id: string
  startsAt: string
  venue: string
  address: string
  courtNumber: string
  incomeItems: FinanceLine[]
  expenseItems: ExpenseLine[]
  attendanceIds: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type MatchDraft = Omit<Match, 'id' | 'createdAt' | 'updatedAt'>
