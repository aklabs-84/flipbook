// 클래스로그AI 연동: 입장 정보 읽기 + 글 제출 (비밀키는 서버 /api/submit 에만 있다)
export interface ClassLogCtx { entryCode: string | null; studentName: string | null; studentId: string | null }

const KEY = 'desk.classlog'

// 주소의 ?entryCode=…&studentName=… 를 읽고, 새로고침해도 유지되게 이 탭에만 저장
export function getClassLogCtx(): ClassLogCtx {
  const empty: ClassLogCtx = { entryCode: null, studentName: null, studentId: null }
  try {
    const p = new URLSearchParams(window.location.search)
    if (p.get('entryCode')) {
      const c = { entryCode: p.get('entryCode'), studentName: p.get('studentName'), studentId: p.get('studentId') }
      sessionStorage.setItem(KEY, JSON.stringify(c))
      return c
    }
    const raw = sessionStorage.getItem(KEY)
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<ClassLogCtx>) } : empty
  } catch { return empty }
}

export const viaClassLog = (c: ClassLogCtx) => !!(c.entryCode && c.studentName)

export const CLASSLOG_URL = 'https://classlog-ai.vercel.app/'
export const SUBMIT_MAX = 20000

export async function submitToClass(piece: { title: string; genre: string; body: string; fav: string }, c: ClassLogCtx) {
  const favs = piece.fav.split('\n').map(s => s.trim()).filter(Boolean)
  const text = [
    `제목: ${piece.title || '(제목 없음)'}`,
    `장르: ${piece.genre || '글'}`,
    `지은이: ${c.studentName ?? ''}`,
    '',
    piece.body.trim(),
    ...(favs.length ? ['', '──', '내가 고른 마음에 드는 문장:', ...favs.map(f => `· ${f}`)] : []),
  ].join('\n')
  if (text.length > SUBMIT_MAX) throw new Error(`글이 너무 길어서 낼 수 없어요. (${text.length}자 / ${SUBMIT_MAX}자까지)`)
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entryCode: c.entryCode, studentId: c.studentId, studentName: c.studentName, title: piece.title || '(제목 없음)', textContent: text }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({} as { error?: string }))
    throw new Error(e.error || `제출하지 못했어요 (${res.status})`)
  }
}

// 페이지가 열릴 때 바로 한 번 읽어 저장해 둔다 (쓰는 동안 주소가 바뀌어도 입장 정보가 남게)
if (typeof window !== 'undefined') getClassLogCtx()
