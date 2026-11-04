import {
  Battery,
  Circle,
  CircleDot,
  Cog,
  Droplet,
  Droplets,
  FileText,
  Filter,
  Gauge,
  Link,
  RefreshCw,
  Thermometer,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Keys match the `icon` column of the seeded maintenance_types.
const icons: Record<string, LucideIcon> = {
  droplet: Droplet,
  droplets: Droplets,
  filter: Filter,
  thermometer: Thermometer,
  circle: Circle,
  gauge: Gauge,
  link: Link,
  cog: Cog,
  disc: CircleDot,
  zap: Zap,
  wind: Wind,
  battery: Battery,
  'refresh-cw': RefreshCw,
  'file-text': FileText,
  wrench: Wrench,
}

export function ItemIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && icons[icon]) || Wrench
  return <Icon className={className} aria-hidden />
}
