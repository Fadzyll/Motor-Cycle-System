import { useNavigate } from 'react-router'
import { BikeForm } from '@/components/bikes/BikeForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { useCreateBike } from '@/lib/data/hooks'

export function NewBikePage() {
  const navigate = useNavigate()
  const create = useCreateBike()

  return (
    <>
      <PageHeader
        title="Add motorcycle"
        subtitle="We'll set up a maintenance schedule with common intervals — you can adjust it to your owner's manual."
        backTo="/bikes"
      />
      <Card>
        <BikeForm
          submitLabel="Add motorcycle"
          showScooterOption
          busy={create.isPending}
          error={create.error}
          onSubmit={(input, { isScooter }) =>
            create.mutate({ input, isScooter }, { onSuccess: (bike) => navigate(`/bikes/${bike.id}`, { replace: true }) })
          }
        />
      </Card>
    </>
  )
}
