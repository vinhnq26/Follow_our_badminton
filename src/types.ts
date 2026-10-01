export type ExpenseCategory = 'court' | 'water' | 'shuttlecock' | 'other'

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
  courtNumber: string
  incomeItems: FinanceLine[]
  expenseItems: ExpenseLine[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type MatchDraft = Omit<Match, 'id' | 'createdAt' | 'updatedAt'>
