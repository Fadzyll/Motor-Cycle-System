import { Bike, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function EmptyBikes() {
  const navigate = useNavigate()
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <Bike className="h-10 w-10 text-muted" aria-hidden />
      <div>
        <p className="font-medium">No motorcycles yet</p>
        <p className="text-sm text-muted">Add your bike to start tracking oil, coolant, tyres and more.</p>
      </div>
      <Button onClick={() => navigate('/bikes/new')}>
        <Plus className="h-4 w-4" aria-hidden /> Add motorcycle
      </Button>
    </Card>
  )
}
