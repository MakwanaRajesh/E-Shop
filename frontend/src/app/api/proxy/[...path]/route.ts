import { NextRequest, NextResponse } from 'next/server'

const RAW_BACKEND_URL =
  process.env.API_URL?.trim() ||
  process.env.BACKEND_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  ''

const BACKEND_BASE = RAW_BACKEND_URL.replace(/\/+$/, '')

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
  } catch {
    return false
  }
}

async function handleProxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const joined = path.join('/')

  // Allow only backend API routes and reject traversal/scheme injection
  if (
    !joined ||
    !joined.startsWith('api/') ||
    joined.includes('..') ||
    joined.includes('\\') ||
    joined.includes('://')
  ) {
    return NextResponse.json({ message: 'Invalid proxy API path.' }, { status: 400 })
  }

  const isProdRuntime =
    process.env.NODE_ENV === 'production' && !isLocalhostUrl(req.nextUrl.origin)

  const targetBase = BACKEND_BASE || (isProdRuntime ? '' : 'http://localhost:5000')

  if (!targetBase || (isProdRuntime && isLocalhostUrl(targetBase))) {
    return NextResponse.json(
      {
        message:
          'Production backend URL is not configured. Set NEXT_PUBLIC_API_URL (or API_URL) in your frontend hosting environment variables.',
      },
      { status: 503 },
    )
  }

  // Prevent infinite loop if misconfigured to point at same Next.js origin
  if (targetBase === req.nextUrl.origin) {
    return NextResponse.json(
      { message: 'Misconfigured API URL points to frontend origin.' },
      { status: 500 },
    )
  }

  const targetUrl = `${targetBase}/${joined}${req.nextUrl.search}`
  const headers = new Headers()
  const authHeader = req.headers.get('authorization')
  const contentType = req.headers.get('content-type')
  const accept = req.headers.get('accept')
  if (authHeader) headers.set('authorization', authHeader)
  if (contentType) headers.set('content-type', contentType)
  if (accept) headers.set('accept', accept)

  const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase())
  const body = hasBody ? await req.arrayBuffer() : undefined

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(55000),
    })

    const respHeaders = new Headers()
    const upstreamType = upstream.headers.get('content-type')
    const cacheControl = upstream.headers.get('cache-control')
    if (upstreamType) respHeaders.set('content-type', upstreamType)
    if (cacheControl) respHeaders.set('cache-control', cacheControl)

    const payload = await upstream.arrayBuffer()
    return new NextResponse(payload, {
      status: upstream.status,
      headers: respHeaders,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Upstream connection failed'
    return NextResponse.json(
      {
        message: `Backend server (${targetBase}) is unreachable or waking up: ${detail}`,
      },
      { status: 502 },
    )
  }
}

export const GET = handleProxy
export const POST = handleProxy
export const PUT = handleProxy
export const PATCH = handleProxy
export const DELETE = handleProxy
