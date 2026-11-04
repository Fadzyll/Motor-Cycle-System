import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { ItemIcon } from '@/components/maintenance/ItemIcon'
import { StatusBadge } from '@/components/maintenance/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { ErrorState, FormError, LoadingState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBikeStatus, useCurrency, useLogService } from '@/lib/data/hooks'
import type { Motorcycle } from '@/lib/data/types'
import { localToday, toDateInputValue } from '@/lib/dates'
import { formatMoney } from '@/lib/format'
import type { StatusItem } from '@/lib/maintenance/status'
import { cn } from '@/lib/utils'
import { parseCost, validateService, type ServiceFormErrors, type ServiceFormValues } from '@/lib/validation/service'

export function LogServicePage() {
  const { bikeId = '' } = useParams()
  const { bike, items, isPending, error } = useBikeStatus(bikeId)

  if (isPending) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!bike || !items) return <ErrorState error="Motorcycle not found" />
  return <LogServiceForm bike={bike} items={items} />
}

function LogServiceForm({ bike, items }: { bike: Motorcycle; items: StatusItem[] }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const currency = useCurrency()
  const logService = useLogService()

  const preselected = params.get('item')
  const [values, setValues] = useState<ServiceFormValues>(() => ({
    performedAt: toDateInputValue(localToday()),
    odometer: bike.current_odometer == null ? '' : String(bike.current_odometer),
    items: preselected && items.some((i) => i.typeId === preselected) ? { [preselected]: '' } : {},
    workshopName: '',
    notes: '',
  }))
  const [errors, setErrors] = useState<ServiceFormErrors>({})

  const set = <K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  function toggle(typeId: string) {
    setValues((v) => {
      const next = { ...v.items }
      if (typeId in next) delete next[typeId]
      else next[typeId] = ''
      return { ...v, items: next }
    })
  }

  const total = Object.values(values.items).reduce((sum, c) => sum + (parseCost(c) ?? 0), 0)
  const selectedCount = Object.keys(values.items).length

  function submit(e: FormEvent) {
    e.preventDefault()
    const result = validateService(values)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    logService.mutate(
      { bike, input: result.input },
      { onSuccess: () => navigate(`/bikes/${bike.id}`, { replace: true }) },
    )
  }

  return (
    <>
      <PageHeader title="Log service" subtitle={bike.nickname} backTo={`/bikes/${bike.id}`} />

      <form onSubmit={submit} noValidate className="space-y-4">
        <Card className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="performedAt" error={errors.performedAt}>
            <Input
              id="performedAt"
              type="date"
              max={toDateInputValue(localToday())}
              value={values.performedAt}
              onChange={(e) => set('performedAt', e.target.value)}
            />
          </Field>
          <Field label="Odometer (km)" htmlFor="odometer" hint="Leave empty if the meter is broken" error={errors.odometer}>
            <Input
              id="odometer"
              inputMode="numeric"
              value={values.odometer}
              onChange={(e) => set('odometer', e.target.value.replace(/[^\d]/g, ''))}
            />
          </Field>
        </Card>

        <Card className="p-0">
          <div className="flex items-baseline justify-between px-4 pt-4">
            <h2 className="font-semibold">What was done?</h2>
            <span className="text-xs text-muted">{selectedCount} selected</span>
          </div>
          {errors.items && <p className="px-4 pt-1 text-sm text-danger">{errors.items}</p>}
          <ul className="mt-2 divide-y divide-border">
            {items.map((item) => {
              const checked = item.typeId in values.items
              return (
                <li key={item.typeId}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(item.typeId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg"
                  >
                    <span
                      className={cn(
                        'grid h-6 w-6 shrink-0 place-items-center rounded-md border',
                        checked ? 'border-primary bg-primary text-primary-fg' : 'border-border',
                      )}
                    >
                      {checked && <Check className="h-4 w-4" aria-hidden />}
                    </span>
                    <ItemIcon icon={item.icon} className="h-5 w-5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.due.status !== 'ok' && item.due.status !== 'unknown' && (
                      <StatusBadge status={item.due.status} />
                    )}
                  </button>
                  {checked && (
                    <div className="flex items-center gap-2 px-4 pb-3 pl-13">
                      <label htmlFor={`cost-${item.typeId}`} className="text-sm text-muted">
                        Cost
                      </label>
                      <Input
                        id={`cost-${item.typeId}`}
                        inputMode="decimal"
                        placeholder="optional"
                        className="h-10 max-w-36"
                        value={values.items[item.typeId]}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, items: { ...v.items, [item.typeId]: e.target.value } }))
                        }
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {errors.cost && <p className="px-4 pb-2 text-sm text-danger">{errors.cost}</p>}
          {total > 0 && (
            <div className="flex justify-between border-t border-border px-4 py-3 text-sm font-semibold">
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <Field label="Workshop" htmlFor="workshopName" hint="Leave empty if you did it yourself.">
            <Input
              id="workshopName"
              value={values.workshopName}
              onChange={(e) => set('workshopName', e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              value={values.notes}
              placeholder="e.g. Motul 7100 10W-40, 1.0 L"
              onChange={(e) => set('notes', e.target.value)}
            />
          </Field>
        </Card>

        <FormError error={logService.error} />
        <Button type="submit" size="lg" className="w-full" disabled={logService.isPending}>
          {logService.isPending ? 'Saving…' : `Save service${selectedCount > 1 ? ` (${selectedCount} items)` : ''}`}
        </Button>
      </form>
    </>
  )
}
