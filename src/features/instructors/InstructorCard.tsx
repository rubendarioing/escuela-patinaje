import type { Instructor } from '@/types/instructor'

type InstructorCardProps = {
  instructor: Instructor
}

export function InstructorCard({ instructor }: InstructorCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 text-center">
      <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-slate-100">
        {instructor.photoUrl && (
          <img
            src={instructor.photoUrl}
            alt={`${instructor.firstName} ${instructor.lastName}`}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <p className="mt-2 font-semibold text-slate-900">
        {instructor.firstName} {instructor.lastName}
      </p>
      {instructor.specialty && <p className="text-sm text-slate-500">{instructor.specialty}</p>}
      {instructor.bio && <p className="mt-2 text-left text-sm text-slate-600">{instructor.bio}</p>}
    </div>
  )
}
