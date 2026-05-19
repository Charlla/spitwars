import { NextResponse } from 'next/server'
import { issueChallenge } from '@/lib/security/human-verify'

export async function POST() {
  const payload = await issueChallenge()
  return NextResponse.json(payload)
}
