import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { ItemIcon } from '@/components/maintenance/ItemIcon'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { ErrorState, FormError, LoadingState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { ScheduleUpdate } from '@/lib/data/api'
import { useAddCustomItem, useBike, useSchedules, useUpdateSchedules } from '@/lib/data/hooks'
import type { ScheduleWithType } from '@/lib/data/types'
import { formatInterval } from '@/lib/format'
import { cn } from '@/lib/utils'

type Row = { active: boolean; km: string; days: string }

const toRow = (s: ScheduleWithType): Row => ({
  active: s.active,
  km: s.interval_km?.toString() ?? '',
  days: s.interval_days?.toString() ?? '',
})

/** '' → null; positive whole number → number; anything else → undefined (invalid). */
function parseInterval(v: string): number | null | undefined {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

export function SchedulePage() {
  const { bikeId = '' } = useParams()
  const bike = useBike(bikeId)
  const schedules = useSchedules(bikeId)

  if (bike.isPending || schedules.isPending) return <LoadingState />
  const error = bike.error ?? schedules.error
  if (error) return <ErrorState error={error} />
  if (!bike.data || !schedules.data) return <ErrorState error="Motorcycle not found" />

  // key: remount the editor with fresh values after data changes (e.g. a custom item was added)
  return (
    <ScheduleEditor
      key={schedules.data.map((s) => s.id).join()}
      bikeId={bikeId}
      bikeName={bike.data.nickname}
      schedules={schedules.data}
    />
  )
}

function ScheduleEditor({
  bikeId,
  bikeName,
  schedules,
}: {
  bikeId: string
  bikeName: string
  schedules: ScheduleWithType[]
}) {
  const navigate = useNavigate()
  const save = useUpdateSchedules()
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(schedules.map((s) => [s.id, toRow(s)])),
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const setRow = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }))

  function onSave() {
    const updates: ScheduleUpdate[] = []
    for (const s of schedules) {
      const row = rows[s.id]
      const km = parseInterval(row.km)
      const days = parseInterval(row.days)
      if (km === undefined || days === undefined) {
        setFormError(`${s.maintenance_types.name}: intervals must be whole numbers above 0`)
        return
      }
      if (row.active !== s.active || km !== s.interval_km || days !== s.interval_days) {
        updates.push({ id: s.id, active: row.active, interval_km: km, interval_days: days })
      }
    }
    setFormError(null)
    if (updates.length === 0) return navigate(`/bikes/${bikeId}`)
    save.mutate(updates, { onSuccess: () => navigate(`/bikes/${bikeId}`) })
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Maintenance schedule"
        subtitle={`${bikeName} — service every X km or Y days, whichever comes first. Check your owner's manual.`}
        backTo={`/bikes/${bikeId}`}
      />

      <Card className="divide-y divide-border p-0">
        {schedules.map((s) => {
          const row = rows[s.id]
          const km = parseInterval(row.km)
          const days = parseInterval(row.days)
          return (
            <div key={s.id} className={cn('px-4 py-3', !row.active && 'opacity-60')}>
              <div className="flex items-center gap-3">
                <ItemIcon icon={s.maintenance_types.icon} className="h-5 w-5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.maintenance_types.name}</p>
                  <p className="truncate text-xs text-muted">
                    {row.active ? formatInterval(km ?? null, days ?? null) : 'Not tracked'}
                  </p>
                </div>
                <Switch
                  checked={row.active}
                  onChange={(active) => setRow(s.id, { active })}
                  label={`Track ${s.maintenance_types.name}`}
                />
              </div>
              {row.active && (
                <div className="mt-3 grid grid-cols-2 gap-3 pl-8">
                  <label className="text-xs text-muted">
                    Every (km)
                    <Input
                      className="mt-1 h-10"
                      inputMode="numeric"
                      placeholder="—"
                      value={row.km}
                      onChange={(e) => setRow(s.id, { km: e.target.value.replace(/[^\d]/g, '') })}
                    />
                  </label>
                  <label className="text-xs text-muted">
                    Every (days)
                    <Input
                      className="mt-1 h-10"
                      inputMode="numeric"
                      placeholder="—"
                      value={row.days}
                      onChange={(e) => setRow(s.id, { days: e.target.value.replace(/[^\d]/g, '') })}
                    />
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </Card>

      <Button variant="outline" className="mt-4 w-full" onClick={() => setAddOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden /> Add custom item
      </Button>

      <div className="mt-4 space-y-2">
        <FormError error={formError ?? save.error} />
        <Button size="lg" className="w-full" onClick={onSave} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save schedule'}
        </Button>
      </div>

      <AddCustomItemDialog bikeId={bikeId} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function AddCustomItemDialog({ bikeId, open, onClose }: { bikeId: string; open: boolean; onClose: () => void }) {
  const add = useAddCustomItem(bikeId)
  const [name, setName] = useState('')
  const [km, setKm] = useState('')
  const [days, setDays] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const k = parseInterval(km)
    const d = parseInterval(days)
    if (!name.trim()) return setError('Enter a name')
    if (k === undefined || d === undefined) return setError('Intervals must be whole numbers above 0')
    if (k === null && d === null) return setError('Set a km or days interval')
    setError(null)
    add.mutate(
      { name: name.trim().slice(0, 60), interval_km: k, interval_days: d },
      {
        onSuccess: () => {
          setName('')
          setKm('')
          setDays('')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add custom item">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name" htmlFor="custom-name" hint='e.g. "Fork oil" or "Valve clearance"'>
          <Input id="custom-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Every (km)" htmlFor="custom-km">
            <Input id="custom-km" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ''))} />
          </Field>
          <Field label="Every (days)" htmlFor="custom-days">
            <Input id="custom-days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/[^\d]/g, ''))} />
          </Field>
        </div>
        <FormError error={error ?? add.error} />
        <Button type="submit" size="lg" className="w-full" disabled={add.isPending}>
          {add.isPending ? 'Adding…' : 'Add item'}
        </Button>
      </form>
    </Dialog>
  )
}
