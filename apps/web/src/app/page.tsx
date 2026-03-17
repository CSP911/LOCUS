import dynamic from 'next/dynamic'
import { ThrowInput } from '@/components/field/ThrowInput'

// Three.js Canvas must skip SSR
const StarField = dynamic(
  () => import('@/components/field/StarField').then(m => ({ default: m.StarField })),
  { ssr: false },
)

export default function FieldPage() {
  return (
    <main className="relative w-full h-screen overflow-hidden bg-locus-bg">
      {/* 3D Star Field — LŌCUS 핵심 공간 */}
      <StarField />

      {/* 하단 입력 인터페이스 */}
      <ThrowInput />
    </main>
  )
}
