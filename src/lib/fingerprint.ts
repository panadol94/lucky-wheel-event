/**
 * Device / Browser Fingerprint utilities
 * Used for anti-abuse detection
 */

export interface FingerprintData {
  userAgent: string
  acceptLanguage: string
  platform: string
  screenResolution: string
  timezone: string
  canvasFingerprint: string
  webglVendor: string
  webglRenderer: string
}

export async function generateFingerprint(): Promise<string> {
  // This is a simplified fingerprint
  // In production, you'd collect more data client-side via a library like FingerprintJS
  const data: FingerprintData = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    acceptLanguage: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : 'unknown',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown',
    canvasFingerprint: await getCanvasFingerprint(),
    webglVendor: getWebGLVendor(),
    webglRenderer: getWebGLRenderer(),
  }
  
  // Create a simple hash
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36) + str.length.toString(36)
}

async function getCanvasFingerprint(): Promise<string> {
  if (typeof document === 'undefined') return 'server'
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'
    canvas.width = 200
    canvas.height = 50
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('Lucky Wheel 🎰', 2, 15)
    ctx.fillStyle = 'rgba(102,204,0,0.7)'
    ctx.fillText('Fingerprint', 4, 17)
    const dataUrl = canvas.toDataURL()
    let hash = 0
    for (let i = 0; i < dataUrl.length; i++) {
      hash = ((hash << 5) - hash) + dataUrl.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  } catch {
    return 'canvas-error'
  }
}

function getWebGLVendor(): string {
  if (typeof document === 'undefined') return 'server'
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return 'no-webgl'
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return 'no-debug-info'
    return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown'
  } catch {
    return 'webgl-error'
  }
}

function getWebGLRenderer(): string {
  if (typeof document === 'undefined') return 'server'
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return 'no-webgl'
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return 'no-debug-info'
    return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown'
  } catch {
    return 'webgl-error'
  }
}

export function getClientIP(forwardedFor: string | null, realIP: string | null): string {
  // In production with a real proxy, you'd read from x-forwarded-for
  return forwardedFor || realIP || 'unknown'
}
