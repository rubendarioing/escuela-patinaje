type SectionTitleProps = {
  title: string
  subtitle?: string
  level?: 'h1' | 'h2'
}

export function SectionTitle({ title, subtitle, level = 'h2' }: SectionTitleProps) {
  const Heading = level

  return (
    <div className="space-y-1">
      <Heading className="text-2xl font-bold text-slate-900">{title}</Heading>
      {subtitle && <p className="text-slate-600">{subtitle}</p>}
    </div>
  )
}
