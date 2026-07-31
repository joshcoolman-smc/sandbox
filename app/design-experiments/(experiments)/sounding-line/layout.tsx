import type { Metadata } from 'next'
import { experimentMetadata } from '@/lib/experiments/metadata'

// Server shell whose only job is the social/SEO card — this experiment's
// page.tsx is a client component and can't export metadata itself.
export const metadata: Metadata = experimentMetadata('sounding-line')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
