import { useQuery } from '@tanstack/react-query'
import { fetchAllTrends, fetchCategoryTrends, fetchRisingFalling } from '../api/trends.js'

export function useAllTrends(range = 30) {
  return useQuery({
    queryKey: ['trends', range],
    queryFn: () => fetchAllTrends(range),
  })
}

export function useCategoryTrends() {
  return useQuery({
    queryKey: ['category-trends'],
    queryFn: fetchCategoryTrends,
  })
}

export function useRisingFalling() {
  return useQuery({
    queryKey: ['rising-falling'],
    queryFn: fetchRisingFalling,
  })
}
