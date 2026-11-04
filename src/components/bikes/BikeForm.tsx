import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { BikeInput } from '@/lib/data/api'
import { bikeFormSchema, fieldErrors, toFormValues, type BikeFormValues } from '@/lib/validation/bike'

export function BikeForm({
  initial,
  submitLabel,
  showScooterOption,
  busy,
  error,
  onSubmit,
}: {
  initial?: Partial<BikeInput>
  submitLabel: string
  showScooterOption?: boolean
  busy?: boolean
  error?: unknown
  onSubmit: (input: BikeInput, opts: { isScooter: boolean }) => void
}) {
  const [values, setValues] = useState<BikeFormValues>(() => toFormValues(initial))
  const [isScooter, setIsScooter] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const bind = (name: keyof BikeFormValues) => ({
    id: name,
    name,
    value: values[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: e.target.value })),
    'aria-invalid': errors[name] ? true : undefined,
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = bikeFormSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    onSubmit(parsed.data, { isScooter })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Name *" htmlFor="nickname" hint='e.g. "My Y15" or "Work bike"' error={errors.nickname}>
        <Input {...bind('nickname')} autoComplete="off" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Make" htmlFor="make" error={errors.make}>
          <Input {...bind('make')} placeholder="Yamaha" autoComplete="off" />
        </Field>
        <Field label="Model" htmlFor="model" error={errors.model}>
          <Input {...bind('model')} placeholder="Y15ZR" autoComplete="off" />
        </Field>
        <Field label="Year" htmlFor="year" error={errors.year}>
          <Input {...bind('year')} inputMode="numeric" placeholder="2021" />
        </Field>
        <Field label="Engine (cc)" htmlFor="engine_cc" error={errors.engine_cc}>
          <Input {...bind('engine_cc')} inputMode="numeric" placeholder="150" />
        </Field>
      </div>

      <Field label="Plate number" htmlFor="plate_number" error={errors.plate_number}>
        <Input {...bind('plate_number')} autoCapitalize="characters" autoComplete="off" />
      </Field>

      <Field
        label="Current odometer (km)"
        htmlFor="current_odometer"
        hint="Optional. Leave empty if your meter is broken — the bike will be tracked by date only, and you can add the reading later."
        error={errors.current_odometer}
      >
        <Input {...bind('current_odometer')} inputMode="numeric" placeholder="15230" />
      </Field>

      <Field label="Purchase date" htmlFor="purchase_date" hint="Optional." error={errors.purchase_date}>
        <Input {...bind('purchase_date')} type="date" />
      </Field>

      {showScooterOption && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium" id="scooter-label">
              Scooter / automatic (CVT)
            </p>
            <p className="text-xs text-muted">Tracks the CVT belt instead of the chain.</p>
          </div>
          <Switch checked={isScooter} onChange={setIsScooter} label="Scooter / automatic (CVT)" />
        </div>
      )}

      <FormError error={error} />

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
