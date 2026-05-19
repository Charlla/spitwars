import { NextRequest, NextResponse } from 'next/server'
import { verifyDrop } from '@/lib/security/human-verify'

export async function POST(req: NextRequest) {
  try {
    const { challenge, selected } = await req.json()
    const result = await verifyDrop(challenge, selected)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
