export type Instructor = {
  id: string
  firstName: string
  lastName: string
  specialty: string | null
  bio: string | null
  photoUrl: string | null
  isActive: boolean
}

// Relación instructor-programa: a qué programas pertenece cada instructor
export type InstructorProgramLink = {
  instructorId: string
  programId: string
}
