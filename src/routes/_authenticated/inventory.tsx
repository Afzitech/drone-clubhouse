import { createFileRoute } from '@tanstack/react-router'
import Inventory from '@/pages/Inventory'

export const Route = createFileRoute('/_authenticated/inventory')({
  component: () => <Inventory />
})
