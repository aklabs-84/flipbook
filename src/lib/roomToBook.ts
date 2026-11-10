import { supabase } from './supabase'
import { uploadMedia } from '../services/storageService'
import type { TeacherLine, PageData } from './relay'

// 글자(data URL)로 저장된 그림을 파일로 바꿔 올린다
async function uploadDataUrl(dataUrl: string, folder: string): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], 'page.jpg', { type: blob.type || 'image/jpeg' })
  return uploadMedia(file, 'uploads', folder)
}

// 함께 쓰는 방 한 개를 플립북(storybook) 한 권으로 만든다. 숨긴 글·알림 글은 빼고 쓴 순서대로 쪽을 만든다
// 그림·글자 크기가 바뀌었는지 알아보는 짧은 표시
function sigOf(img: string | null, font: number): string {
  let h = 5381
  for (let i = 0; i < (img?.length ?? 0); i++) h = ((h * 33) ^ img!.charCodeAt(i)) >>> 0
  return `${h}:${img?.length ?? 0}:${font}`
}

export interface SendResult { bookId: string; lastLine: number; added: number; filled: number }

export async function sendRoomToBook(
  userId: string, title: string, lines: TeacherLine[], pages: PageData[],
  append?: { bookId: string; afterLine: number },
): Promise<SendResult> {
  const all = lines.filter(l => !l.sys && !l.hidden)
  const story = append ? all.filter(l => l.id > append.afterLine) : all
  const byseq = new Map(pages.map(p => [p.seq, p]))
  // 이어 붙이기: 이미 만든 쪽의 그림·글자 크기가 그 뒤에 바뀌었으면 새 것으로 바꿔 준다(글 내용으로 짝을 찾음)
  let filled = 0
  if (append) {
    const { data: old } = await supabase.from('pages').select('id, text_layers, media_url').eq('book_id', append.bookId)
    for (const l of all.filter(x => x.id <= append.afterLine)) {
      const pd = byseq.get(l.seq)
      const sig = sigOf(pd?.img ?? null, pd?.font ?? 22)
      const hit = (old ?? []).find(o => (o.text_layers as { content?: string } | null)?.content === l.t)
      if (!hit) continue
      const tl = (hit.text_layers ?? {}) as Record<string, unknown>
      if (tl.imgSig === sig) continue
      if (tl.imgSig === undefined && !hit.media_url && !pd?.img) continue
      try {
        const url = pd?.img ? await uploadDataUrl(pd.img, userId) : null
        const { error: ue } = await supabase.from('pages').update({
          media_url: url, media_type: url ? 'image' : null,
          text_layers: { ...tl, fontSize: pd?.font ?? 22, imgSig: sig },
        }).eq('id', hit.id)
        if (!ue) { filled++; tl.imgSig = sig }
      } catch { /* 한 장 실패해도 계속 */ }
    }
  }
  if (story.length === 0 && append) return { bookId: append.bookId, lastLine: append.afterLine, added: 0, filled }
  if (story.length === 0) throw new Error('보낼 이야기가 아직 없어요')

  let bookId: string
  let start = 0
  if (append) {
    const { data: last, error: e } = await supabase
      .from('pages').select('page_number').eq('book_id', append.bookId)
      .order('page_number', { ascending: false }).limit(1)
    if (e) throw new Error('기존 책을 찾지 못했어요')
    bookId = append.bookId
    start = (last?.[0]?.page_number as number | undefined) ?? 0
  } else {
    const { data: book, error } = await supabase
      .from('books')
      .insert({ user_id: userId, title, is_rtl: false, book_type: 'storybook' })
      .select()
      .single()
    if (error || !book) throw new Error('책을 만들지 못했어요')
    bookId = book.id as string
  }

  const rows = []
  for (let i = 0; i < story.length; i++) {
    const l = story[i]
    const p = byseq.get(l.seq)
    let mediaUrl: string | null = null
    if (p?.img) {
      try { mediaUrl = await uploadDataUrl(p.img, userId) } catch { mediaUrl = null }
    }
    rows.push({
      book_id: bookId,
      page_number: start + i + 1,
      text_layers: { content: l.t, imageFit: 'contain', fontSize: p?.font ?? 22, imgSig: sigOf(p?.img ?? null, p?.font ?? 22) },
      layout_preset: 'full',
      media_url: mediaUrl,
      media_type: mediaUrl ? ('image' as const) : null,
    })
  }
  const { error: pageError } = await supabase.from('pages').insert(rows)
  if (pageError) throw new Error('쪽을 저장하지 못했어요')
  return { bookId, lastLine: Math.max(...story.map(l => l.id)), added: story.length, filled }
}
