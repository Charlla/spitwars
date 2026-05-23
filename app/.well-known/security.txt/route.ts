export const dynamic = 'force-static'

export function GET() {
  const body = [
    'Contact: mailto:bot@botandbotty.com',
    'Expires: 2026-08-21T23:59:59Z',
    'Preferred-Languages: en',
    '',
  ].join('\n')
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
