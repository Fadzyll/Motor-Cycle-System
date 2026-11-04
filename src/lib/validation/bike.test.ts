import { describe, expect, it } from 'vitest'
import { bikeFormSchema, toFormValues } from './bike'

describe('bikeFormSchema', () => {
  it('converts form strings into a bike row', () => {
    const parsed = bikeFormSchema.parse({
      ...toFormValues(),
      nickname: '  Y15 ',
      make: 'Yamaha',
      year: '2021',
      plate_number: 'wxy  1234',
      current_odometer: '15230',
    })
    expect(parsed).toMatchObject({
      nickname: 'Y15',
      make: 'Yamaha',
      model: null,
      year: 2021,
      engine_cc: null,
      plate_number: 'WXY 1234',
      current_odometer: 15230,
      purchase_date: null,
    })
  })

  it('allows an empty odometer (broken meter)', () => {
    const parsed = bikeFormSchema.parse({ ...toFormValues(), nickname: 'Old bike' })
    expect(parsed.current_odometer).toBeNull()
  })

  it('rejects missing name, bad odometer and bad year', () => {
    const r = bikeFormSchema.safeParse({ ...toFormValues(), current_odometer: '-5', year: '1800' })
    expect(r.success).toBe(false)
    const paths = r.error!.issues.map((i) => i.path[0])
    expect(paths).toEqual(expect.arrayContaining(['nickname', 'current_odometer', 'year']))
  })
})
