type SectionTitleProps = {
  title: string
  subtitle?: string
}

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-slate-600">{subtitle}</p>}
    </div>
  )
}
