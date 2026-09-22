import type { ReactNode } from 'react'

type AdminContentProps = {
  children: ReactNode
}

export function AdminContent({ children }: AdminContentProps) {
  return <main className="flex-1 p-6">{children}</main>
}
