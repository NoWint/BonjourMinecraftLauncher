export function generateCRTScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opacity: number = 0.03
) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1)
  }
}

export function generateCRTVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, width * 0.4,
    width / 2, height / 2, width * 0.8
  )
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

export function generateWashiTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(245, 240, 232, 0.06)'
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(200, 180, 150, 0.03)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const len = 3 + Math.random() * 15
    const angle = Math.random() * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }

  for (let i = 0; i < 400; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const r = Math.random() * 0.8
    const alpha = 0.01 + Math.random() * 0.03
    ctx.fillStyle = `rgba(180, 160, 130, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}