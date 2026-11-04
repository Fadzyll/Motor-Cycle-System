import type { MaintenanceType } from '@/lib/data/types'

const CHAIN_ITEMS = ['Chain clean & lube', 'Chain & sprocket set']
const SCOOTER_ITEMS = ['CVT belt (scooters)']

/**
 * Which default items are switched on for a new bike.
 * Scooters (CVT) have a belt instead of a chain.
 */
export function isActiveByDefault(type: Pick<MaintenanceType, 'name'>, isScooter: boolean): boolean {
  if (CHAIN_ITEMS.includes(type.name)) return !isScooter
  if (SCOOTER_ITEMS.includes(type.name)) return isScooter
  return true
}
