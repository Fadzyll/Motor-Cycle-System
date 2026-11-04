import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { useUpdateOdometer } from '@/lib/data/hooks'
import type { Motorcycle } from '@/lib/data/types'
import { formatKm } from '@/lib/format'

export function OdometerDialog({ bike, open, onClose }: { bike: Motorcycle; open: boolean; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const update = useUpdateOdometer()

  async function submit(e: FormEvent) {
    e.preventDefault()
    const odometer = Number(value.trim())
    if (!value.trim() || !Number.isInteger(odometer) || odometer < 0) {
      setError('Enter the odometer in whole km')
      return
    }
    setError(null)
    try {
      await update.mutateAsync({ bike, odometer })
      setValue('')
      onClose()
    } catch {
      // shown via update.error
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={bike.current_odometer == null ? 'Set odometer' : 'Update odometer'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          label="Odometer now (km)"
          htmlFor="odometer-now"
          hint={
            bike.current_odometer == null
              ? 'Enter what your meter shows. Items with a km interval will start being tracked.'
              : `Last reading: ${formatKm(bike.current_odometer)}`
          }
          error={error ?? undefined}
        >
          <Input
            id="odometer-now"
            inputMode="numeric"
            autoFocus
            placeholder={bike.current_odometer == null ? 'e.g. 15230' : String(bike.current_odometer)}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ''))}
          />
        </Field>
        <FormError error={update.error} />
        <Button type="submit" size="lg" className="w-full" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save reading'}
        </Button>
      </form>
    </Dialog>
  )
}
