import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { formatKm } from '@/lib/format'
import { serviceOdometer, type ServiceKmMode } from '@/lib/odometer'

/**
 * Km at a service, entered either as the odometer reading at the time or as
 * "km ridden since" (the app works out the reading from the current odometer).
 */
export function ServiceKmField({
  mode,
  value,
  onModeChange,
  onValueChange,
  currentOdometer,
  error,
  id = 'odometer',
}: {
  mode: ServiceKmMode
  value: string
  onModeChange: (mode: ServiceKmMode) => void
  onValueChange: (value: string) => void
  currentOdometer: number | null
  error?: string
  id?: string
}) {
  const parsed = value.trim() === '' ? null : Number(value)
  const preview = mode === 'since' && parsed != null ? serviceOdometer('since', parsed, currentOdometer) : null

  const hint =
    mode === 'reading'
      ? 'Odometer at that service (see the workshop sticker). Empty if unknown.'
      : preview?.ok && preview.odometer != null
        ? `Odometer at the service: ${formatKm(preview.odometer)} (now ${formatKm(currentOdometer ?? 0)})`
        : `How far you've ridden since that service. Odometer now: ${formatKm(currentOdometer ?? 0)}.`

  return (
    <Field label="Km" htmlFor={id} hint={hint} error={error}>
      <div className="space-y-2">
        <Segmented
          label="How to enter km"
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'reading', label: 'Odometer at service' },
            { value: 'since', label: 'Km ridden since', disabled: currentOdometer == null },
          ]}
        />
        <Input
          id={id}
          inputMode="numeric"
          placeholder={mode === 'since' ? 'e.g. 90' : 'e.g. 15230'}
          value={value}
          onChange={(e) => onValueChange(e.target.value.replace(/[^\d]/g, ''))}
        />
      </div>
    </Field>
  )
}
