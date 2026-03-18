import dynamic from 'next/dynamic'
import { ThrowInput } from '@/components/field/ThrowInput'
import { SignalLine } from '@/components/signal/SignalLine'
import { CorePerspective } from '@/components/signal/CorePerspective'

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

      {/* Signal — 조용한 한 줄 제안 (상단) */}
      <SignalLine />

      {/* Core Perspective — Gravity 관찰문 (하단 입력 위) */}
      <CorePerspective />

      {/* 하단 입력 인터페이스 */}
      <ThrowInput />
    </main>
  )
}
