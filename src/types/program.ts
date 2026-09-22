export type ProgramLevel = 'initiation' | 'beginner' | 'intermediate' | 'advanced' | 'competition'

export type Program = {
  id: string
  name: string
  slug: string
  description: string | null
  level: ProgramLevel | null
  minAge: number | null
  maxAge: number | null
  sortOrder: number
  imageUrl: string | null
  isActive: boolean
}
