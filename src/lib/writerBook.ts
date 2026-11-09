import { supabase } from './supabase'
import type { QuestRecord, Writer } from '../types/writer'
import { getGenre } from '../data/genres'
import { STAMP_LABEL } from './writerPrompt'

export const finalText = (s: { text: string; fixedText?: string }) => s.fixedText || s.text

export function buildPages(writer: Writer, quest: QuestRecord, title: string): string[] {
    const g = getGenre(quest.genre)
    const pages: string[] = [`${title}\n\n글 · ${writer.name}`]
    pages.push(`작가 소개\n\n${writer.name}\n성격: ${writer.persona.personality || '-'}\n말투: ${writer.persona.tone || '-'}\n좋아하는 것: ${writer.persona.likes || '-'}`)
    quest.stanzas.filter((s) => s.stamp && s.stamp !== 'discard').forEach((s) => pages.push(finalText(s)))
    const notes = quest.stanzas
        .map((s, i) => (s.stamp ? `${i + 1}. [${STAMP_LABEL[s.stamp]}] ${s.reason}` : ''))
        .filter(Boolean)
        .join('\n')
    pages.push(`제작 노트 (${g.title})\n\n내가 AI의 글을 이렇게 다뤘어요\n${notes}`)
    return pages
}

// createBook과 같은 모양(storybook)으로 책을 만들고, 글 내용이 든 페이지를 한 번에 넣는다
export async function sendToBook(userId: string, writer: Writer, quest: QuestRecord, title: string): Promise<string | null> {
    const { data: book, error } = await supabase
        .from('books')
        .insert({ user_id: userId, title, is_rtl: false, book_type: 'storybook' })
        .select()
        .single()
    if (error || !book) {
        console.error('책 만들기 실패', error)
        return null
    }
    const rows = buildPages(writer, quest, title).map((content, i) => ({
        book_id: book.id,
        page_number: i + 1,
        text_layers: { content, imageFit: 'contain', fontSize: 22 },
        layout_preset: 'full',
    }))
    const { error: pageError } = await supabase.from('pages').insert(rows)
    if (pageError) {
        console.error('페이지 저장 실패', pageError)
        return null
    }
    return book.id
}
