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
export async function sendRoomToBook(
  userId: string, title: string, lines: TeacherLine[], pages: PageData[],
): Promise<string> {
  const story = lines.filter(l => !l.sys && !l.hidden)
  if (story.length === 0) throw new Error('보낼 이야기가 아직 없어요')

  const { data: book, error } = await supabase
    .from('books')
    .insert({ user_id: userId, title, is_rtl: false, book_type: 'storybook' })
    .select()
    .single()
  if (error || !book) throw new Error('책을 만들지 못했어요')

  const byseq = new Map(pages.map(p => [p.seq, p]))
  const rows = []
  for (let i = 0; i < story.length; i++) {
    const l = story[i]
    const p = byseq.get(l.seq)
    let mediaUrl: string | null = null
    if (p?.img) {
      try { mediaUrl = await uploadDataUrl(p.img, userId) } catch { mediaUrl = null }
    }
    rows.push({
      book_id: book.id,
      page_number: i + 1,
      text_layers: { content: l.t, imageFit: 'contain', fontSize: p?.font ?? 22 },
      layout_preset: 'full',
      media_url: mediaUrl,
      media_type: mediaUrl ? ('image' as const) : null,
    })
  }
  const { error: pageError } = await supabase.from('pages').insert(rows)
  if (pageError) throw new Error('쪽을 저장하지 못했어요')
  return book.id as string
}
