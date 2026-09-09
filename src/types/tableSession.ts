export type TableMember = {
  userId: string
  name: string
  isMe: boolean
}

export type TableSessionState = {
  sessionId: string
  tableName: string
  status: "OPEN" | "LOCKED" | "CLOSED"
  version: number
  cartVersion: number
  lockedByMe: boolean
  lockedByName: string | null
  members: TableMember[]
}

export type CartContributor = {
  name: string
  quantity: number
  isMe: boolean
}
