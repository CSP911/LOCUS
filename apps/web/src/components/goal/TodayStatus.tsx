'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useGoalStore, type Goal, type GoalStep } from '@/store/goalStore'

// 파스텔 색상 팔레트
const PALETTES = [
  { base: [150, 185, 220], highlight: [190, 210, 235], dark: [85, 115, 160] },
  { base: [225, 170, 150], highlight: [240, 200, 185], dark: [165, 115, 100] },
  { base: [180, 165, 215], highlight: [205, 195, 230], dark: [120, 105, 160] },
  { base: [215, 205, 145], highlight: [230, 225, 185], dark: [155, 145, 90] },
  { base: [170, 210, 180], highlight: [200, 230, 210], dark: [100, 150, 115] },
]

export function TodayStatus() {
  const goals = useGoalStore(s => s.goals)
  const activeGoal = goals.find(g => g.active) || null
  const completedGoals = goals.filter(g => !g.active && g.steps.length > 0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 })
  const dragRef = useRef({ active: false, sx: 0, sy: 0, sox: 0, soy: 0 })
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1 })

  // 배경 별
  const starsRef = useRef<{ x: number; y: number; s: number; b: number; sp: number }[]>([])
  if (starsRef.current.length === 0) {
    for (let i = 0; i < 120; i++) {
      starsRef.current.push({
        x: Math.random(), y: Math.random(),
        s: 0.3 + Math.random() * 1.2,
        b: 0.04 + Math.random() * 0.3,
        sp: 0.3 + Math.random() * 2,
      })
    }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const v = viewRef.current
    const t = Date.now() / 1000

    ctx.clearRect(0, 0, w, h)

    // ── 배경 별 ────────────────────────
    starsRef.current.forEach(star => {
      const tw = 0.5 + 0.5 * Math.sin(t * star.sp + star.x * 12)
      ctx.beginPath()
      ctx.arc(star.x * w, star.y * h, star.s, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${star.b * tw})`
      ctx.fill()
    })

    // ── 은하 그리기 함수 ────────────────
    function drawGalaxy(
      cx: number, cy: number, scale: number,
      goal: Goal, paletteIdx: number,
      isActive: boolean, globalTime: number
    ) {
      if (!ctx) return
      const palette = PALETTES[paletteIdx % PALETTES.length]
      const baseR = 35 * scale
      const steps = goal.steps

      // 궤도 점선
      function dashedOrbit(r: number, alpha: number) {
        if (!ctx) return
        const segs = 40
        for (let i = 0; i < segs; i++) {
          if (i % 2 === 0) continue
          ctx.beginPath()
          ctx.arc(cx, cy, r, (i / segs) * Math.PI * 2, ((i + 1) / segs) * Math.PI * 2)
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      // 은하 중심 글로우
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.5)
      centerGlow.addColorStop(0, `rgba(${palette.highlight[0]},${palette.highlight[1]},${palette.highlight[2]},${isActive ? 0.08 : 0.04})`)
      centerGlow.addColorStop(1, `rgba(${palette.base[0]},${palette.base[1]},${palette.base[2]},0)`)
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = centerGlow
      ctx.fill()

      // 행성 그리기
      function drawPlanet(px: number, py: number, size: number, colors: typeof palette, lit: boolean) {
        if (!ctx) return
        const { base, highlight, dark } = colors

        // 대기 글로우
        const glowR = size * 2.5
        const glow = ctx.createRadialGradient(px, py, size * 0.6, px, py, glowR)
        glow.addColorStop(0, `rgba(${base[0]},${base[1]},${base[2]},${lit ? 0.12 : 0.05})`)
        glow.addColorStop(1, `rgba(${base[0]},${base[1]},${base[2]},0)`)
        ctx.beginPath()
        ctx.arc(px, py, glowR, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // 본체
        const lx = px - size * 0.35, ly = py - size * 0.35
        const bodyGrad = ctx.createRadialGradient(lx, ly, size * 0.1, px, py, size)
        bodyGrad.addColorStop(0, `rgba(${highlight[0]},${highlight[1]},${highlight[2]},1)`)
        bodyGrad.addColorStop(0.4, `rgba(${base[0]},${base[1]},${base[2]},1)`)
        bodyGrad.addColorStop(1, `rgba(${dark[0]},${dark[1]},${dark[2]},1)`)
        ctx.beginPath()
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.fillStyle = bodyGrad
        ctx.fill()

        // 림 라이트
        ctx.beginPath()
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${highlight[0]},${highlight[1]},${highlight[2]},${lit ? 0.15 : 0.06})`
        ctx.lineWidth = size * 0.06
        ctx.stroke()
      }

      const spacing = 10 * scale

      steps.forEach((step, i) => {
        const orbitR = baseR * 0.5 + (i + 1) * spacing
        dashedOrbit(orbitR, isActive ? 0.06 : 0.03)

        const planetSize = (isActive ? 4 : 3) * scale
        const stepPalette = PALETTES[(paletteIdx + i) % PALETTES.length]

        if (step.done && step.doneAt) {
          // 완료: 고정 위치
          const angle = ((step.doneAt || 12) / 24) * Math.PI * 2 - Math.PI / 2
          const px = cx + Math.cos(angle) * orbitR
          const py = cy + Math.sin(angle) * orbitR
          drawPlanet(px, py, planetSize, { base: [130, 200, 160], highlight: [180, 230, 200], dark: [70, 140, 95] }, true)
        } else if (isActive) {
          // 미완료 + 활성: 공전
          const speeds = [0.29, 0.17, 0.115, 0.08]
          const spd = speeds[i % speeds.length]
          const angle = globalTime * spd + i * (Math.PI * 2 / 3)
          const px = cx + Math.cos(angle) * orbitR
          const py = cy + Math.sin(angle) * orbitR

          // 잔상
          for (let j = 1; j <= 5; j++) {
            const ta = angle - j * 0.04
            const tx = cx + Math.cos(ta) * orbitR
            const ty = cy + Math.sin(ta) * orbitR
            ctx.beginPath()
            ctx.arc(tx, ty, (planetSize - j * 0.3) * 0.8, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${stepPalette.base[0]},${stepPalette.base[1]},${stepPalette.base[2]},${0.15 - j * 0.025})`
            ctx.fill()
          }

          drawPlanet(px, py, planetSize, stepPalette, false)
        } else {
          // 미완료 + 비활성 (과거 도전에서 못 한 단계): 희미하게 고정
          const angle = i * (Math.PI * 2 / steps.length)
          const px = cx + Math.cos(angle) * orbitR
          const py = cy + Math.sin(angle) * orbitR
          drawPlanet(px, py, planetSize * 0.7, stepPalette, false)
        }
      })
    }

    // ── 완료된 은하들 (바깥) ─────────────
    const totalCompleted = completedGoals.length
    if (totalCompleted > 0) {
      const centerX = w / 2 + v.offsetX
      const centerY = h / 2 + v.offsetY

      completedGoals.forEach((g, i) => {
        // 원형으로 배치
        const angle = (i / Math.max(totalCompleted, 1)) * Math.PI * 2 - Math.PI / 2
        const dist = (120 + i * 15) * v.scale
        const gx = centerX + Math.cos(angle) * dist
        const gy = centerY + Math.sin(angle) * dist
        const gScale = 0.6 * v.scale

        drawGalaxy(gx, gy, gScale, g, i + 1, false, t)

        // 은하 라벨 (줌아웃 시에만)
        if (v.scale < 0.8 && ctx) {
          ctx.fillStyle = 'rgba(255,255,255,0.1)'
          ctx.font = `${8 * v.scale}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(g.text.slice(0, 8), gx, gy + 30 * gScale)
        }
      })
    }

    // ── 활성 은하 (중앙) ────────────────
    if (activeGoal) {
      const cx = w / 2 + v.offsetX
      const cy = h / 2 + v.offsetY
      drawGalaxy(cx, cy, v.scale, activeGoal, 0, true, t)
    }

    animRef.current = requestAnimationFrame(draw)
  }, [activeGoal, completedGoals])

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  // ── 터치 핸들러 ──────────────────────
  function onPDown(e: React.PointerEvent) {
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, sox: viewRef.current.offsetX, soy: viewRef.current.offsetY }
  }
  function onPMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return
    viewRef.current.offsetX = dragRef.current.sox + (e.clientX - dragRef.current.sx)
    viewRef.current.offsetY = dragRef.current.soy + (e.clientY - dragRef.current.sy)
  }
  function onPUp() { dragRef.current.active = false }

  function onTStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { active: true, startDist: Math.sqrt(dx * dx + dy * dy), startScale: viewRef.current.scale }
    }
  }
  function onTMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current.active) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      viewRef.current.scale = Math.max(0.3, Math.min(4, pinchRef.current.startScale * (Math.sqrt(dx * dx + dy * dy) / pinchRef.current.startDist)))
    }
  }
  function onTEnd() { pinchRef.current.active = false }

  const lastTapRef = useRef(0)
  function onTap() {
    const n = Date.now()
    if (n - lastTapRef.current < 300) viewRef.current = { offsetX: 0, offsetY: 0, scale: 1 }
    lastTapRef.current = n
  }

  if (!activeGoal && completedGoals.length === 0) return null

  return (
    <div className="absolute inset-0" style={{ zIndex: 1 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block', touchAction: 'none' }}
        onPointerDown={onPDown}
        onPointerMove={onPMove}
        onPointerUp={onPUp}
        onPointerLeave={onPUp}
        onTouchStart={onTStart}
        onTouchMove={onTMove}
        onTouchEnd={onTEnd}
        onClick={onTap}
      />
    </div>
  )
}
