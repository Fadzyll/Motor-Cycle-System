import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { FormError } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateVisit } from '@/lib/data/hooks'
import type { Motorcycle } from '@/lib/data/types'
import { localToday, toDateInputValue } from '@/lib/dates'
import type { ServiceVisit } from '@/lib/maintenance/history'
import { serviceOdometer, type ServiceKmMode } from '@/lib/odometer'
import { parseCost } from '@/lib/validation/service'
import { ServiceKmField } from './ServiceKmField'

/** Fix a logged service: date, km, workshop, notes and each item's cost. */
export function EditVisitDialog({
  bike,
  visit,
  names,
  onClose,
}: {
  bike: Motorcycle
  visit: ServiceVisit
  names: Map<string, string>
  onClose: () => void
}) {
  const update = useUpdateVisit()
  const [performedAt, setPerformedAt] = useState(visit.performedAt)
  const [kmMode, setKmMode] = useState<ServiceKmMode>('reading')
  const [km, setKm] = useState(visit.odometer == null ? '' : String(visit.odometer))
  const [workshop, setWorkshop] = useState(visit.workshopName ?? '')
  const [notes, setNotes] = useState(visit.notes ?? '')
  const [costs, setCosts] = useState<Record<string, string>>(() =>
    Object.fromEntries(visit.logs.map((l) => [l.id, l.cost == null ? '' : String(Number(l.cost))])),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    const today = toDateInputValue(localToday())
    if (!/^\d{4}-\d{2}-\d{2}$/.test(performedAt)) next.performedAt = 'Pick the service date'
    else if (performedAt > today) next.performedAt = 'The date cannot be in the future'
    const odo = serviceOdometer(kmMode, km.trim() === '' ? null : Number(km), bike.current_odometer)
    if (!odo.ok) next.odometer = odo.error
    const parsedCosts: Record<string, number | null> = {}
    for (const [id, text] of Object.entries(costs)) {
      const c = parseCost(text)
      if (c === undefined) next.cost = 'Costs must be numbers like 45 or 45.50'
      else parsedCosts[id] = c
    }
    setErrors(next)
    if (Object.keys(next).length || !odo.ok) return
    update.mutate(
      {
        bike,
        logIds: visit.logs.map((l) => l.id),
        update: {
          performedAt,
          odometer: odo.odometer,
          workshopName: workshop.trim() || null,
          notes: notes.trim() || null,
          costs: parsedCosts,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onClose={onClose} title="Edit service">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Date" htmlFor="edit-date" error={errors.performedAt}>
          <Input
            id="edit-date"
            type="date"
            max={toDateInputValue(localToday())}
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
          />
        </Field>
        <ServiceKmField
          id="edit-km"
          mode={kmMode}
          value={km}
          currentOdometer={bike.current_odometer}
          error={errors.odometer}
          onModeChange={(m) => {
            setKmMode(m)
            setKm(m === 'reading' && visit.odometer != null ? String(visit.odometer) : '')
          }}
          onValueChange={setKm}
        />
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium">Cost per item</legend>
          {visit.logs.map((l) => (
            <div key={l.id} className="flex items-center gap-3">
              <label htmlFor={`edit-cost-${l.id}`} className="min-w-0 flex-1 truncate text-sm">
                {names.get(l.maintenance_type_id) ?? 'Item'}
              </label>
              <Input
                id={`edit-cost-${l.id}`}
                inputMode="decimal"
                placeholder="optional"
                className="h-10 max-w-32"
                value={costs[l.id]}
                onChange={(e) => setCosts((c) => ({ ...c, [l.id]: e.target.value }))}
              />
            </div>
          ))}
          {errors.cost && <p className="text-sm text-danger">{errors.cost}</p>}
        </fieldset>
        <Field label="Workshop" htmlFor="edit-workshop">
          <Input id="edit-workshop" value={workshop} onChange={(e) => setWorkshop(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Notes" htmlFor="edit-notes">
          <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <FormError error={update.error} />
        <Button type="submit" size="lg" className="w-full" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </Dialog>
  )
}
