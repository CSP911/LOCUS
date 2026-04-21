'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useGoalStore, type GoalStep } from '@/store/goalStore'

export function TodayStatus() {
  const goals = useGoalStore(s => s.goals)
  const goal = goals.find(g => g.active) || null
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const viewRef = useRef({ offsetX: 0, offsetY: 0, scale: 1 })
  const dragRef = useRef({ active: false, sx: 0, sy: 0, sox: 0, soy: 0 })
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 1 })

  const todayStr = new Date().toISOString().slice(0, 10)
  const doneSteps = goals
    .filter(g => g.date === todayStr && !g.active)
    .flatMap(g => g.steps.filter(s => s.done && s.doneAt))
  const activeSteps = goal?.steps || []

  // 별 배경 (한 번 생성)
  const starsRef = useRef<{ x: number; y: number; s: number; b: number; sp: number }[]>([])
  if (starsRef.current.length === 0) {
    for (let i = 0; i < 100; i++) {
      starsRef.current.push({
        x: Math.random(), y: Math.random(),
        s: 0.3 + Math.random() * 1.5,
        b: 0.05 + Math.random() * 0.35,
        sp: 0.3 + Math.random() * 2.5,
      })
    }
  }

  // 행성 색상 팔레트
  // 파스텔톤 행성 색상
  const PLANET_COLORS = [
    { base: [150, 185, 220], highlight: [190, 210, 235], dark: [85, 115, 160] },  // 파스텔 블루
    { base: [225, 170, 150], highlight: [240, 200, 185], dark: [165, 115, 100] }, // 파스텔 코랄
    { base: [180, 165, 215], highlight: [205, 195, 230], dark: [120, 105, 160] }, // 파스텔 라벤더
    { base: [215, 205, 145], highlight: [230, 225, 185], dark: [155, 145, 90] },  // 파스텔 옐로
  ]

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
    const cx = w / 2 + v.offsetX
    const cy = h / 2 + v.offsetY
    const baseR = Math.min(w, h) * 0.3 * v.scale
    const t = Date.now() / 1000
    const now = new Date()
    const curHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600

    ctx.clearRect(0, 0, w, h)

    // ── 별 배경 ────────────────────────
    starsRef.current.forEach(star => {
      const tw = 0.5 + 0.5 * Math.sin(t * star.sp + star.x * 12)
      ctx.beginPath()
      ctx.arc(star.x * w, star.y * h, star.s, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${star.b * tw})`
      ctx.fill()
    })

    // ── 궤도 점선 함수 ─────────────────
    function dashedOrbit(r: number, alpha: number) {
      if (!ctx) return
      const segs = 80
      for (let i = 0; i < segs; i++) {
        if (i % 2 === 0) continue
        ctx.beginPath()
        ctx.arc(cx, cy, r, (i / segs) * Math.PI * 2, ((i + 1) / segs) * Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`
        ctx.lineWidth = 0.7
        ctx.stroke()
      }
    }

    // ── 행성 그리기 함수 ────────────────
    function drawPlanet(px: number, py: number, size: number, colors: { base: number[]; highlight: number[]; dark: number[] }, lit: boolean) {
      if (!ctx) return
      const { base, highlight, dark } = colors

      // 1) 부드러운 대기 글로우
      const glowR = size * 3
      const glow = ctx.createRadialGradient(px, py, size * 0.6, px, py, glowR)
      glow.addColorStop(0, `rgba(${base[0]},${base[1]},${base[2]},${lit ? 0.15 : 0.06})`)
      glow.addColorStop(0.5, `rgba(${base[0]},${base[1]},${base[2]},${lit ? 0.05 : 0.02})`)
      glow.addColorStop(1, `rgba(${base[0]},${base[1]},${base[2]},0)`)
      ctx.beginPath()
      ctx.arc(px, py, glowR, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // 2) 행성 본체 — 구형 느낌의 방사형 그라디언트
      // 빛은 왼쪽 위에서, 그림자는 오른쪽 아래
      const lightX = px - size * 0.35
      const lightY = py - size * 0.35
      const bodyGrad = ctx.createRadialGradient(lightX, lightY, size * 0.1, px, py, size)
      bodyGrad.addColorStop(0, `rgba(${highlight[0]},${highlight[1]},${highlight[2]},1)`)
      bodyGrad.addColorStop(0.4, `rgba(${base[0]},${base[1]},${base[2]},1)`)
      bodyGrad.addColorStop(0.75, `rgba(${Math.round(base[0]*0.7)},${Math.round(base[1]*0.7)},${Math.round(base[2]*0.7)},1)`)
      bodyGrad.addColorStop(1, `rgba(${dark[0]},${dark[1]},${dark[2]},1)`)

      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.fillStyle = bodyGrad
      ctx.fill()

      // 3) 대륙 패턴 — seed 기반 고유 지형
      ctx.save()
      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.clip()

      // 자전 — 표면이 천천히 왼쪽에서 오른쪽으로 흐름
      const seed = size * 137 + (lit ? 77 : 33)
      const rot = t * 0.015 // 매우 느린 자전

      // 대륙 (밝은 패치 — 자전에 따라 이동)
      for (let c = 0; c < 4; c++) {
        const baseX = Math.sin(seed + c * 3.7) * 0.5
        const baseY = Math.cos(seed + c * 2.3) * 0.5
        const rx = baseX + Math.sin(rot + c * 0.5) * 0.3
        const wx = ((rx % 1) + 1) % 1 - 0.5
        const edgeFade = Math.max(0, 1 - Math.abs(wx) * 2.5)
        const cw = size * (0.3 + Math.abs(Math.sin(seed + c * 5.1)) * 0.4) * (0.6 + edgeFade * 0.4)
        const ch = cw * (0.4 + Math.abs(Math.cos(seed + c * 4.2)) * 0.5)
        const ca = (seed + c * 1.8) % (Math.PI * 2)
        ctx.beginPath()
        ctx.ellipse(px + wx * size * 0.9, py + baseY * size, cw, ch, ca, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${highlight[0]},${highlight[1]},${highlight[2]},${edgeFade * 0.25})`
        ctx.fill()
      }

      // 바다 (어두운 패치 — 자전과 함께)
      for (let o = 0; o < 3; o++) {
        const bx = Math.cos(seed + o * 4.5 + 1) * 0.4
        const rx = bx + Math.sin(rot + o * 0.7) * 0.2
        const wx = ((rx % 1) + 1) % 1 - 0.5
        const oy = Math.sin(seed + o * 3.8 + 2) * size * 0.4
        const or2 = size * (0.15 + Math.abs(Math.sin(seed + o * 6.2)) * 0.2)
        ctx.beginPath()
        ctx.arc(px + wx * size * 0.9, py + oy, or2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},0.12)`
        ctx.fill()
      }

      // 구름 (자전보다 살짝 빠르게)
      const cRot = t * 0.022
      for (let cl = 0; cl < 3; cl++) {
        const cly = py + (cl - 1) * size * 0.4 + Math.sin(seed + cl * 2) * size * 0.15
        const cx2 = Math.cos(seed + cl + cRot) * size * 0.3
        const clw = size * (0.5 + Math.abs(Math.sin(seed + cl * 7)) * 0.4)
        ctx.beginPath()
        ctx.ellipse(px + cx2, cly, clw, size * 0.05, Math.sin(seed + cl) * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.07)'
        ctx.fill()
      }

      // 표면 밴드 (미세한 줄무늬)
      for (let b = -3; b <= 3; b++) {
        const by = py + b * size * 0.3
        ctx.beginPath()
        ctx.ellipse(px, by, size * 1.1, size * 0.04, 0, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${dark[0]},${dark[1]},${dark[2]},0.05)`
        ctx.fill()
      }

      ctx.restore()

      // 4) 터미네이터 (낮/밤 경계)
      ctx.save()
      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.clip()
      const termGrad = ctx.createLinearGradient(px - size * 0.1, py, px + size, py)
      termGrad.addColorStop(0, 'rgba(0,0,0,0)')
      termGrad.addColorStop(0.4, 'rgba(0,0,0,0.03)')
      termGrad.addColorStop(1, 'rgba(0,0,0,0.2)')
      ctx.fillStyle = termGrad
      ctx.fillRect(px - size, py - size, size * 2, size * 2)
      ctx.restore()

      // 5) 부드러운 하이라이트 (빛 반사점)
      const hGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, size * 0.45)
      hGrad.addColorStop(0, `rgba(255,255,255,${lit ? 0.3 : 0.12})`)
      hGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(lightX, lightY, size * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = hGrad
      ctx.fill()

      // 6) 림 라이트 (가장자리 빛) — 대기 가장자리가 빛나는 효과
      ctx.beginPath()
      ctx.arc(px, py, size, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${highlight[0]},${highlight[1]},${highlight[2]},${lit ? 0.2 : 0.08})`
      ctx.lineWidth = size * 0.08
      ctx.stroke()
    }

    function hourToAngle(h: number) {
      return (h / 24) * Math.PI * 2 - Math.PI / 2
    }

    function posOnOrbit(h: number, r: number) {
      const a = hourToAngle(h)
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
    }

    // ── 외곽 궤도 ─────────────────────
    dashedOrbit(baseR, 0.08)

    // ── 각 행성 궤도 + 행성 ────────────
    const innerR = baseR * 0.65
    const spacing = 18 * v.scale

    // 미완료 행성 궤도
    activeSteps.forEach(step => {
      if (!step.done) {
        dashedOrbit(innerR + step.order * spacing, 0.06)
      }
    })

    // 과거 완료 점
    doneSteps.forEach(s => {
      if (!s.doneAt) return
      const p = posOnOrbit(s.doneAt, baseR)
      drawPlanet(p.x, p.y, 3 * v.scale, PLANET_COLORS[0], false)
    })

    // 활성 행성
    activeSteps.forEach(step => {
      const ci = (step.order - 1) % PLANET_COLORS.length
      const colors = PLANET_COLORS[ci]

      if (step.done && step.doneAt) {
        // 완료: 실제 시간에 고정
        const p = posOnOrbit(step.doneAt, baseR)
        drawPlanet(p.x, p.y, 3.5 * v.scale, { base: [100, 200, 150], highlight: [160, 240, 200], dark: [40, 130, 80] }, true)
      } else {
        // 공전 중
        const speeds = [0.29, 0.17, 0.115, 0.08]
        const spd = speeds[(step.order - 1) % speeds.length]
        const phase = step.order * (Math.PI * 2 / 3)
        const angle = t * spd + phase
        const orbitR = innerR + step.order * spacing

        const px = cx + Math.cos(angle) * orbitR
        const py = cy + Math.sin(angle) * orbitR

        const isNear = Math.abs(curHour - step.checkinTime) < 1

        // 잔상 — 부드러운 꼬리
        for (let i = 1; i <= 8; i++) {
          const ta = angle - i * 0.04
          const ttx = cx + Math.cos(ta) * orbitR
          const tty = cy + Math.sin(ta) * orbitR
          const alpha = 0.22 - i * 0.025
          const tr = (3.5 - i * 0.3) * v.scale
          if (alpha <= 0 || tr <= 0) continue
          ctx.beginPath()
          ctx.arc(ttx, tty, tr, 0, Math.PI * 2)
          ctx.fillStyle = isNear
            ? `rgba(230,210,155,${alpha})`
            : `rgba(${colors.base[0]},${colors.base[1]},${colors.base[2]},${alpha})`
          ctx.fill()
        }

        // 행성
        const planetSize = (isNear ? 5.4 : 3.9) * v.scale
        const drawColors = isNear
          ? { base: [230, 210, 155], highlight: [245, 235, 200], dark: [170, 155, 95] }
          : colors
        drawPlanet(px, py, planetSize, drawColors, isNear)
      }
    })

    // ── 현재 시간 점 ──────────────────
    const np = posOnOrbit(curHour, baseR)
    const na = 0.4 + 0.3 * Math.sin(t * 1.5)
    ctx.beginPath()
    ctx.arc(np.x, np.y, 2.5 * v.scale, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,255,255,${na})`
    ctx.fill()

    animRef.current = requestAnimationFrame(draw)
  }, [activeSteps, doneSteps, PLANET_COLORS])

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
      viewRef.current.scale = Math.max(0.4, Math.min(4, pinchRef.current.startScale * (Math.sqrt(dx * dx + dy * dy) / pinchRef.current.startDist)))
    }
  }
  function onTEnd() { pinchRef.current.active = false }

  const lastTapRef = useRef(0)
  function onTap() {
    const n = Date.now()
    if (n - lastTapRef.current < 300) viewRef.current = { offsetX: 0, offsetY: 0, scale: 1 }
    lastTapRef.current = n
  }

  if (!goal && doneSteps.length === 0) return null

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
