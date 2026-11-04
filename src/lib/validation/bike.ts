import { z } from 'zod'
import type { BikeInput } from '@/lib/data/api'

const thisYear = new Date().getFullYear()

/** Empty string → null, otherwise a whole number. */
const optionalInt = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), {
      message: `${label} must be a whole number between ${min} and ${max}`,
    })

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))

export const bikeFormSchema = z.object({
  nickname: z.string().trim().min(1, 'Give your bike a name').max(60),
  make: optionalText(40),
  model: optionalText(60),
  year: optionalInt('Year', 1950, thisYear + 1),
  engine_cc: optionalInt('Engine size', 49, 3000),
  plate_number: optionalText(15).transform((v) => (v ? v.toUpperCase().replace(/\s+/g, ' ') : v)),
  /** Optional — empty when the meter is broken; the bike is then tracked by date only. */
  current_odometer: optionalInt('Odometer', 0, 2_000_000),
  purchase_date: optionalText(10),
})

export type BikeFormValues = z.input<typeof bikeFormSchema>

export function toFormValues(bike?: Partial<BikeInput>): BikeFormValues {
  const s = (v: string | number | null | undefined) => (v == null ? '' : String(v))
  return {
    nickname: s(bike?.nickname),
    make: s(bike?.make),
    model: s(bike?.model),
    year: s(bike?.year),
    engine_cc: s(bike?.engine_cc),
    plate_number: s(bike?.plate_number),
    current_odometer: s(bike?.current_odometer),
    purchase_date: s(bike?.purchase_date),
  }
}

/** Field name → first error message. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
