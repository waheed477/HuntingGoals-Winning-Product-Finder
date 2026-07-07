import { useQuery } from '@tanstack/react-query'
import { fetchProducts, fetchTopProducts } from '../api/products.js'
import useStore from '../store/useStore.js'

export function useProducts() {
  const selectedCity = useStore((s) => s.selectedCity)
  const selectedCategory = useStore((s) => s.selectedCategory)
  const minWinScore = useStore((s) => s.minWinScore)

  return useQuery({
    queryKey: ['products', selectedCity, selectedCategory, minWinScore],
    queryFn: () => fetchProducts(selectedCity, selectedCategory, minWinScore),
  })
}

export function useTopProducts(limit = 10) {
  return useQuery({
    queryKey: ['top-products', limit],
    queryFn: () => fetchTopProducts(limit),
  })
}
