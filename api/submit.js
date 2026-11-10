// 클래스로그AI 제출 중계 함수 (비밀키는 이 서버 안에서만 쓴다)
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const baseUrl = (process.env.AISERVICEHUB_BASE_URL || '').replace(/\/+$/, '')
  const apiKey = process.env.CLASS_TOOL_API_KEY
  if (!baseUrl || !apiKey) return res.status(500).json({ error: '서버 설정이 필요해요' })

  // 같은 사이트에서 온 요청만 (보조 수단)
  const origin = req.headers.origin
  if (origin && req.headers.host && new URL(origin).host !== req.headers.host) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const raw = req.body && typeof req.body === 'object' ? req.body : null
  if (!raw) return res.status(400).json({ error: '내용이 비어 있어요' })

  // 허용한 필드만, 길이 제한
  const body = {
    entryCode: str(raw.entryCode, 100),
    studentId: str(raw.studentId, 100) || undefined,
    studentName: str(raw.studentName, 100) || undefined,
    title: str(raw.title, 200),
    resultType: 'text', // 작가의 책상은 글(텍스트)만 낸다
    textContent: str(raw.textContent, 20000),
  }
  if (!body.entryCode || !body.title || !body.textContent) {
    return res.status(400).json({ error: '제목과 글이 필요해요' })
  }

  try {
    const r = await fetch(`${baseUrl}/api/classlog/submission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(body),
    })
    const data = await r.json().catch(() => ({}))
    // 허브가 준 에러 문구가 있으면 그대로(학생용 문구), 없으면 일반 문구
    if (!r.ok) return res.status(r.status).json({ error: typeof data.error === 'string' ? data.error.slice(0, 200) : '제출하지 못했어요' })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('submit proxy failed', err)
    return res.status(502).json({ error: '제출 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.' })
  }
}
