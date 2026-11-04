import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { BikeForm } from '@/components/bikes/BikeForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { ErrorState, FormError, LoadingState } from '@/components/ui/feedback'
import { useBike, useDeleteBike, useUpdateBike } from '@/lib/data/hooks'

export function EditBikePage() {
  const { bikeId = '' } = useParams()
  const navigate = useNavigate()
  const { data: bike, isPending, error } = useBike(bikeId)
  const update = useUpdateBike(bikeId)
  const remove = useDeleteBike()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (isPending) return <LoadingState />
  if (error) return <ErrorState error={error} />
  if (!bike) return <ErrorState error="Motorcycle not found" />

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit ${bike.nickname}`} backTo={`/bikes/${bike.id}`} />
      <Card>
        <BikeForm
          initial={bike}
          submitLabel="Save changes"
          busy={update.isPending}
          error={update.error}
          onSubmit={(input) => update.mutate(input, { onSuccess: () => navigate(`/bikes/${bike.id}`) })}
        />
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold">Delete motorcycle</h2>
        <p className="mt-1 text-sm text-muted">Removes the bike and its whole service history. This cannot be undone.</p>
        <Button variant="danger" className="mt-4" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" aria-hidden /> Delete
        </Button>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title={`Delete ${bike.nickname}?`}>
        <p className="text-sm text-muted">All service logs and odometer readings for this bike will be deleted.</p>
        <FormError error={remove.error} />
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={remove.isPending}
            onClick={() => remove.mutate(bike.id, { onSuccess: () => navigate('/bikes', { replace: true }) })}
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
