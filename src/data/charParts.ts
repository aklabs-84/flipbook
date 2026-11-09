import type { Look } from '../types/writer'

export interface Part { id: string; label: string; unlockLevel: number; color?: string }

export const GENDER_PARTS: Part[] = [
    { id: 'f', label: '여성', unlockLevel: 1 },
    { id: 'm', label: '남성', unlockLevel: 1 },
]
export const SKIN_PARTS: Part[] = [
    { id: 's1', label: '밝은 살색', unlockLevel: 1, color: '#FFE0C2' },
    { id: 's2', label: '보통 살색', unlockLevel: 1, color: '#F5C9A0' },
    { id: 's3', label: '구릿빛', unlockLevel: 1, color: '#E3A97C' },
    { id: 's4', label: '진한 살색', unlockLevel: 1, color: '#B97B52' },
    { id: 's5', label: '아주 진한 살색', unlockLevel: 1, color: '#8A5636' },
]
// 그림자 색 (피부색마다 손으로 고른 값)
export const SKIN_SHADE: Record<string, string> = { s1: '#E9B995', s2: '#DDA97F', s3: '#C98B5E', s4: '#9A6140', s5: '#6E3F26' }

export const FACE_PARTS: Part[] = [
    { id: 'round', label: '동글', unlockLevel: 1 },
    { id: 'oval', label: '갸름', unlockLevel: 1 },
    { id: 'square', label: '네모', unlockLevel: 1 },
    { id: 'heart', label: '하트', unlockLevel: 1 },
]
export const EYES_PARTS: Part[] = [
    { id: 'dot', label: '동그란 눈', unlockLevel: 1 },
    { id: 'big', label: '큰 눈', unlockLevel: 1 },
    { id: 'narrow', label: '가는 눈', unlockLevel: 1 },
    { id: 'smile', label: '웃는 눈', unlockLevel: 1 },
    { id: 'sleepy', label: '졸린 눈', unlockLevel: 1 },
]
export const BROWS_PARTS: Part[] = [
    { id: 'normal', label: '보통', unlockLevel: 1 },
    { id: 'thick', label: '굵은', unlockLevel: 1 },
    { id: 'sad', label: '처진', unlockLevel: 1 },
    { id: 'up', label: '올라간', unlockLevel: 1 },
]
export const NOSE_PARTS: Part[] = [
    { id: 'dot', label: '점', unlockLevel: 1 },
    { id: 'round', label: '동글', unlockLevel: 1 },
    { id: 'point', label: '뾰족', unlockLevel: 1 },
]
export const MOUTH_PARTS: Part[] = [
    { id: 'smile', label: '미소', unlockLevel: 1 },
    { id: 'grin', label: '활짝', unlockLevel: 1 },
    { id: 'small', label: '작은 입', unlockLevel: 1 },
    { id: 'flat', label: '일자', unlockLevel: 1 },
]
export const HAIR_PARTS: Part[] = [
    { id: 'short', label: '짧은 머리', unlockLevel: 1 },
    { id: 'bob', label: '단발', unlockLevel: 1 },
    { id: 'long', label: '긴 머리', unlockLevel: 1 },
    { id: 'twin', label: '양갈래', unlockLevel: 1 },
    { id: 'bald', label: '민머리', unlockLevel: 1 },
    { id: 'braid', label: '땋은 머리', unlockLevel: 2 },
    { id: 'bun', label: '묶음 머리', unlockLevel: 2 },
    { id: 'curly', label: '곱슬머리', unlockLevel: 3 },
]
export const HAIR_COLOR_PARTS: Part[] = [
    { id: 'black', label: '검정', unlockLevel: 1, color: '#3A2A24' },
    { id: 'brown', label: '갈색', unlockLevel: 1, color: '#7A4B2A' },
    { id: 'blonde', label: '금발', unlockLevel: 1, color: '#E3B65B' },
    { id: 'red', label: '빨강', unlockLevel: 2, color: '#C8502E' },
    { id: 'purple', label: '보라', unlockLevel: 3, color: '#7A5BC4' },
]
export const BODY_PARTS: Part[] = [
    { id: 'mustard', label: '노랑 옷', unlockLevel: 1, color: '#F7C844' },
    { id: 'sky', label: '하늘 옷', unlockLevel: 1, color: '#8EC5E6' },
    { id: 'coral', label: '분홍 옷', unlockLevel: 2, color: '#F2A08F' },
    { id: 'lilac', label: '연보라 옷', unlockLevel: 2, color: '#B9A4E0' },
    { id: 'grass', label: '초록 옷', unlockLevel: 3, color: '#8FCB6E' },
    { id: 'navy', label: '남색 옷', unlockLevel: 4, color: '#4A5A78' },
]
export const HAT_PARTS: Part[] = [
    { id: 'none', label: '없음', unlockLevel: 1 },
    { id: 'cap', label: '모자', unlockLevel: 1 },
    { id: 'ribbon', label: '리본', unlockLevel: 1 },
    { id: 'beret', label: '베레모', unlockLevel: 2 },
    { id: 'flower', label: '꽃핀', unlockLevel: 2 },
    { id: 'phones', label: '헤드폰', unlockLevel: 3 },
    { id: 'crown', label: '작은 왕관', unlockLevel: 4 },
]
export const ACC_PARTS: Part[] = [
    { id: 'none', label: '없음', unlockLevel: 1 },
    { id: 'glasses', label: '안경', unlockLevel: 1 },
    { id: 'freckle', label: '주근깨', unlockLevel: 1 },
    { id: 'scarf', label: '목도리', unlockLevel: 2 },
    { id: 'bowtie', label: '나비넥타이', unlockLevel: 2 },
    { id: 'round', label: '동그란 안경', unlockLevel: 3 },
    { id: 'earring', label: '귀걸이', unlockLevel: 3 },
    { id: 'necklace', label: '목걸이', unlockLevel: 4 },
    { id: 'cape', label: '망토', unlockLevel: 4 },
]
export const HOLD_PARTS: Part[] = [
    { id: 'pen', label: '펜', unlockLevel: 1 },
    { id: 'none', label: '없음', unlockLevel: 1 },
    { id: 'notebook', label: '공책', unlockLevel: 2 },
    { id: 'wand', label: '마법봉', unlockLevel: 3 },
]

export const DEFAULT_LOOK: Look = {
    gender: 'm', skin: 's1', face: 'round', eyes: 'dot', brows: 'normal', nose: 'dot', mouth: 'smile',
    hair: 'short', hairColor: 'black', body: 'mustard', hat: 'none', accessory: 'none', hold: 'pen',
}

export const PARTS_BY_FIELD: Record<keyof Look, Part[]> = {
    gender: GENDER_PARTS, skin: SKIN_PARTS, face: FACE_PARTS, eyes: EYES_PARTS, brows: BROWS_PARTS, nose: NOSE_PARTS,
    mouth: MOUTH_PARTS, hair: HAIR_PARTS, hairColor: HAIR_COLOR_PARTS, body: BODY_PARTS, hat: HAT_PARTS, accessory: ACC_PARTS, hold: HOLD_PARTS,
}

// 옛 저장 내용(body·hat·accessory만 있음)이나 알 수 없는 값은 기본값으로 채운다
export function normalizeLook(look: Partial<Look> | null | undefined): Look {
    const out = { ...DEFAULT_LOOK }
    if (!look) return out
    ;(Object.keys(PARTS_BY_FIELD) as (keyof Look)[]).forEach((k) => {
        const v = look[k]
        if (typeof v === 'string' && PARTS_BY_FIELD[k].some((p) => p.id === v)) (out as Record<string, string>)[k] = v
    })
    return out
}
