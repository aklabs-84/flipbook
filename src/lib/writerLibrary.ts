import type { LibraryItem, QuestRecord, Writer } from '../types/writer'
import { getGenre } from '../data/genres'
import { checkPrivacy } from './privacyCheck'
import { styleCard } from './writerPrompt'

// AI와 함께 쓴 글(도장을 다 찍은 퀘스트)에서 폐기를 뺀 최종 글
export function questText(q: QuestRecord): string {
    return q.stanzas.filter((s) => s.stamp !== 'discard').map((s) => s.fixedText || s.text).join('\n\n')
}

export interface ExportSource { label: string; title: string; text: string }

export function exportSources(library: LibraryItem[], quests: QuestRecord[]): ExportSource[] {
    const own = library.map((x) => ({ label: x.source === 'desk' ? '작가의 책상' : '이야기 교실', title: x.title, text: x.text }))
    const withAi = quests.filter((q) => q.status === 'done').map((q) => ({ label: 'AI와 함께 쓴 글', title: getGenre(q.genre).title, text: questText(q) }))
    return [...own, ...withAi].filter((x) => x.text.trim())
}

// 개인정보(이름·학교·전화번호 등)가 든 글 목록. 비어 있어야 내려받을 수 있다
export function privacyProblems(sources: ExportSource[], ownName: string) {
    return sources.flatMap((s) => {
        const hits = checkPrivacy(s.text, ownName)
        return hits.length ? [{ title: s.title, found: [...new Set(hits.map((h) => h.label))].join(', ') }] : []
    })
}

// ChatGPT 프로젝트 파일 / Gemini 노트북 소스로 올릴 한 장짜리 글 모음
export function buildExportText(writer: Writer, sources: ExportSource[]): string {
    const card = styleCard(sources.map((s) => s.text))
    return [
        `# ${writer.name}의 내 글 모음`,
        `만든 날: ${new Date().toLocaleDateString('ko-KR')}`,
        '',
        '## 내 글의 특징 카드',
        ...card.map((c) => `- ${c}`),
        '',
        '## 사용법',
        '아래 글은 모두 내(학생)가 쓴 글이에요. 새 글을 쓸 때 이 글들의 말투, 자주 쓰는 표현, 문장 길이를 닮게 써 주세요.',
        '',
        ...sources.flatMap((s, i) => [`## 글 ${i + 1}. ${s.title} (${s.label})`, s.text.trim(), '']),
    ].join('\n')
}

export function downloadText(filename: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
