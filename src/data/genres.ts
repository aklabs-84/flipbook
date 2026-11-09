import type { GenreId } from '../types/writer'

export interface Genre {
    id: GenreId
    title: string
    emoji: string
    unlockLevel: number
    intro: string
    traits: string[]
    mission: string
    // 지침 글 끝에 붙는 장르별 부탁
    ask: string
    // 어떻게 나눠 도장을 찍을지 안내
    splitHint: string
}

export const GENRES: Genre[] = [
    {
        id: 'fairytale',
        title: '동화',
        emoji: '📖',
        unlockLevel: 1,
        intro: '이야기가 "옛날 옛적에"로 시작해서 교훈이나 따뜻한 끝맺음으로 마무리되는 글이에요.',
        traits: ['주인공이 어려움을 만나요', '쉬운 말로 짧게 써요', '끝에 마음에 남는 한 줄이 있어요'],
        mission: '만들어 낸 주인공(동물도 좋아요)이 작은 어려움을 이겨 내는 짧은 동화를 완성해 보세요.',
        ask: '위 작가의 성격과 말투로, 아래 이야기 씨앗을 가지고 짧은 동화를 써 줘. 문단은 4~6개로 나눠 주고, 문단 사이는 빈 줄을 넣어 줘.',
        splitHint: '빈 줄로 나뉜 문단마다 도장을 찍어요.',
    },
    {
        id: 'letter',
        title: '편지·일기',
        emoji: '✉️',
        unlockLevel: 1,
        intro: '누군가에게 말을 거는 글(편지)이나 하루를 돌아보는 글(일기)이에요. 마음이 솔직하게 드러나요.',
        traits: ['받는 사람(또는 나)이 있어요', '그날의 일과 마음을 함께 써요', '진짜 이름 대신 별명을 써요'],
        mission: '만들어 낸 인물이 누군가에게 보내는 편지, 또는 그 인물의 하루 일기를 써 보세요.',
        ask: '위 작가의 성격과 말투로, 아래 상황에 맞는 편지나 일기를 써 줘. 문단은 3~5개로 나눠 주고, 문단 사이는 빈 줄을 넣어 줘.',
        splitHint: '빈 줄로 나뉜 문단마다 도장을 찍어요.',
    },
    {
        id: 'poem',
        title: '시',
        emoji: '🌙',
        unlockLevel: 2,
        intro: '짧은 말에 느낌을 꾹 눌러 담는 글이에요. 비유(~처럼, ~같은)와 반복이 맛을 내요.',
        traits: ['줄을 나눠 써요', '비유로 느낌을 보여 줘요', '짧아도 괜찮아요'],
        mission: '오늘 떠오르는 장면이나 느낌 하나로 3~4연짜리 시를 완성해 보세요.',
        ask: '위 작가의 성격과 말투로, 아래 소재로 시를 써 줘. 3~4연으로 쓰고, 연 사이는 빈 줄을 넣어 줘.',
        splitHint: '빈 줄로 나뉜 연마다 도장을 찍어요.',
    },
]

export const getGenre = (id: GenreId): Genre => GENRES.find((g) => g.id === id) ?? GENRES[0]
