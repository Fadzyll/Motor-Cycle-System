import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { useAddKmRidden, useUpdateOdometer } from '@/lib/data/hooks'
import type { Motorcycle } from '@/lib/data/types'
import { formatKm } from '@/lib/format'
import { addKm } from '@/lib/odometer'

type Mode = 'add' | 'reading'

/** Update the odometer by typing the new reading, or by adding the km ridden. */
export function OdometerDialog({ bike, open, onClose }: { bike: Motorcycle; open: boolean; onClose: () => void }) {
  // "Add km ridden" first: riders usually know how far they went, not the exact reading.
  const [mode, setMode] = useState<Mode>('add')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const setReading = useUpdateOdometer()
  const add = useAddKmRidden()
  const pending = setReading.isPending || add.isPending
  const mutationError = mode === 'add' ? add.error : setReading.error

  const n = value.trim() === '' ? null : Number(value)
  const preview = mode === 'add' && n != null && n > 0 ? addKm(bike.current_odometer, n) : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (n == null || !Number.isInteger(n) || n < 0 || (mode === 'add' && n === 0)) {
      setError(mode === 'add' ? 'Enter the km you rode' : 'Enter the odometer in whole km')
      return
    }
    setError(null)
    try {
      if (mode === 'add') await add.mutateAsync({ bike, km: n })
      else await setReading.mutateAsync({ bike, odometer: n })
      setValue('')
      onClose()
    } catch {
      // shown via mutationError
    }
  }

  const current = bike.current_odometer

  return (
    <Dialog open={open} onClose={onClose} title={current == null ? 'Set odometer' : 'Update odometer'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Segmented
          label="How to update"
          value={mode}
          onChange={(m) => {
            setMode(m)
            setValue('')
            setError(null)
          }}
          options={[
            { value: 'add', label: 'Add km ridden' },
            { value: 'reading', label: 'New meter reading' },
          ]}
        />
        {mode === 'add' ? (
          <Field
            label="Km ridden"
            htmlFor="km-ridden"
            hint={
              preview != null
                ? `Odometer: ${current == null ? 'starts at 0 km' : formatKm(current)} → ${formatKm(preview)}`
                : current == null
                  ? 'Your meter is not set, so the app counts from 0 km.'
                  : `Now: ${formatKm(current)}`
            }
            error={error ?? undefined}
          >
            <Input
              id="km-ridden"
              inputMode="numeric"
              autoFocus
              placeholder="e.g. 25"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))}
            />
          </Field>
        ) : (
          <Field
            label="Odometer now (km)"
            htmlFor="odometer-now"
            hint={
              current == null
                ? 'Enter what your meter shows. Items with a km interval will start being tracked.'
                : `Last reading: ${formatKm(current)}`
            }
            error={error ?? undefined}
          >
            <Input
              id="odometer-now"
              inputMode="numeric"
              autoFocus
              placeholder={current == null ? 'e.g. 15230' : String(current)}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))}
            />
          </Field>
        )}
        <FormError error={mutationError} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Saving…' : mode === 'add' ? 'Add km' : 'Save reading'}
        </Button>
      </form>
    </Dialog>
  )
}
