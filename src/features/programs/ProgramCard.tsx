import type { Program } from '@/types/program'

type ProgramCardProps = {
  program: Program
}

const formatAgeRange = (minAge: number | null, maxAge: number | null) => {
  if (minAge != null && maxAge != null) return `${minAge} a ${maxAge} años`
  if (minAge != null) return `Desde ${minAge} años`
  if (maxAge != null) return `Hasta ${maxAge} años`
  return 'Todas las edades'
}

export function ProgramCard({ program }: ProgramCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">{program.name}</p>
      <p className="mt-1 text-sm text-slate-600">
        {formatAgeRange(program.minAge, program.maxAge)}
      </p>
      {program.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{program.description}</p>
      )}
    </div>
  )
}
