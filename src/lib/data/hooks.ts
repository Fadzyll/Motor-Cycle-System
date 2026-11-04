import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { buildBikeStatus, type StatusItem } from '@/lib/maintenance/status'
import * as api from './api'
import type { Motorcycle } from './types'

export const keys = {
  profile: ['profile'] as const,
  bikes: ['bikes'] as const,
  bike: (id: string) => ['bikes', id] as const,
  schedules: (bikeId?: string) => ['schedules', bikeId ?? 'all'] as const,
  logs: (bikeId?: string) => ['logs', bikeId ?? 'all'] as const,
  readings: (bikeId?: string) => ['readings', bikeId ?? 'all'] as const,
  rides: (bikeId: string) => ['rides', bikeId] as const,
}

export function useProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: api.getProfile, staleTime: 5 * 60_000 })
}

export function useCurrency(): string {
  return useProfile().data?.currency ?? 'MYR'
}

export function useBikes() {
  return useQuery({ queryKey: keys.bikes, queryFn: api.listBikes })
}

export function useBike(id: string) {
  return useQuery({ queryKey: keys.bike(id), queryFn: () => api.getBike(id) })
}

export function useSchedules(bikeId?: string) {
  return useQuery({ queryKey: keys.schedules(bikeId), queryFn: () => api.listSchedules(bikeId) })
}

export function useLogs(bikeId?: string) {
  return useQuery({ queryKey: keys.logs(bikeId), queryFn: () => api.listLogs(bikeId) })
}

export function useReadings(bikeId?: string) {
  return useQuery({ queryKey: keys.readings(bikeId), queryFn: () => api.listReadings(bikeId) })
}

export interface BikeWithStatus {
  bike: Motorcycle
  items: StatusItem[]
}

/** Every bike with its computed maintenance status (one round of queries for all bikes). */
export function useAllBikeStatus() {
  const bikes = useBikes()
  const schedules = useSchedules()
  const logs = useLogs()
  const readings = useReadings()
  const queries = [bikes, schedules, logs, readings]

  const data = useMemo<BikeWithStatus[] | undefined>(() => {
    if (!bikes.data || !schedules.data || !logs.data || !readings.data) return undefined
    return bikes.data.map((bike) => ({
      bike,
      items: buildBikeStatus({ bike, schedules: schedules.data, logs: logs.data, readings: readings.data }),
    }))
  }, [bikes.data, schedules.data, logs.data, readings.data])

  return {
    data,
    isPending: queries.some((q) => q.isPending),
    error: queries.find((q) => q.error)?.error ?? null,
  }
}

/** One bike with its computed maintenance status. */
export function useBikeStatus(bikeId: string) {
  const bike = useBike(bikeId)
  const schedules = useSchedules(bikeId)
  const logs = useLogs(bikeId)
  const readings = useReadings(bikeId)
  const queries = [bike, schedules, logs, readings]

  const items = useMemo(() => {
    if (!bike.data || !schedules.data || !logs.data || !readings.data) return undefined
    return buildBikeStatus({ bike: bike.data, schedules: schedules.data, logs: logs.data, readings: readings.data })
  }, [bike.data, schedules.data, logs.data, readings.data])

  return {
    bike: bike.data,
    items,
    isPending: queries.some((q) => q.isPending),
    error: queries.find((q) => q.error)?.error ?? null,
  }
}

/** Refetch everything after a change — data is small, so this keeps things simple and correct. */
function useInvalidateAll() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      [keys.bikes, ['schedules'], ['logs'], ['readings'], ['rides']].map((queryKey) => qc.invalidateQueries({ queryKey })),
    )
}

export function useCreateBike() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ input, isScooter }: { input: api.BikeInput; isScooter: boolean }) =>
      api.createBike(input, { isScooter }),
    onSuccess: invalidate,
  })
}

export function useUpdateBike(id: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (input: Partial<api.BikeInput>) => api.updateBike(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteBike() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: api.deleteBike, onSuccess: invalidate })
}

export function useUpdateOdometer() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ bike, odometer }: { bike: Motorcycle; odometer: number }) => api.updateOdometer(bike, odometer),
    onSuccess: invalidate,
  })
}

export function useLogService() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ bike, input }: { bike: Motorcycle; input: api.ServiceInput }) => api.logService(bike, input),
    onSuccess: invalidate,
  })
}

export function useDeleteLog() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: api.deleteLog, onSuccess: invalidate })
}

export function useUpdateSchedules() {
  const invalidate = useInvalidateAll()
  return useMutation({ mutationFn: api.updateSchedules, onSuccess: invalidate })
}

export function useAddCustomItem(bikeId: string) {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: (item: Parameters<typeof api.addCustomItem>[1]) => api.addCustomItem(bikeId, item),
    onSuccess: invalidate,
  })
}

export function useRides(bikeId: string) {
  return useQuery({ queryKey: keys.rides(bikeId), queryFn: () => api.listRides(bikeId) })
}

export function useSaveRide() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ bike, ride }: { bike: Motorcycle; ride: api.RideInput }) => api.saveRide(bike, ride),
    onSuccess: invalidate,
  })
}

export function useAddKmRidden() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ bike, km }: { bike: Motorcycle; km: number }) => api.addKmRidden(bike, km),
    onSuccess: invalidate,
  })
}

export function useUpdateVisit() {
  const invalidate = useInvalidateAll()
  return useMutation({
    mutationFn: ({ bike, logIds, update }: { bike: Motorcycle; logIds: string[]; update: api.VisitUpdate }) =>
      api.updateVisit(bike, logIds, update),
    onSuccess: invalidate,
  })
}
