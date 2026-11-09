export interface PrivacyHit {
    kind: 'phone' | 'email' | 'address' | 'rrn' | 'school' | 'ownName'
    label: string
    start: number
    end: number
    text: string
}

const RULES: { kind: PrivacyHit['kind']; label: string; re: RegExp }[] = [
    { kind: 'rrn', label: '주민등록번호 모양', re: /\d{6}\s*-\s*[1-4]\d{6}/g },
    { kind: 'phone', label: '전화번호', re: /0\d{1,2}\s*-?\s*\d{3,4}\s*-?\s*\d{4}/g },
    { kind: 'email', label: '이메일', re: /[\w.+-]+@[\w-]+(\.[\w-]+)+/g },
    { kind: 'address', label: '주소', re: /[가-힣]{2,}(시|군|구|읍|면)\s[가-힣]{1,}(구|동|읍|면|리)(\s?\d+(-\d+)?)?|[가-힣]{2,}(로|길)\s?\d+(-\d+)?|\d+동\s?\d+호|[가-힣]{2,}(아파트|빌라)/g },
    { kind: 'school', label: '학교·학원 이름', re: /[가-힣A-Za-z0-9]{1,10}(초등학교|중학교|고등학교|학교|학원)|[가-힣A-Za-z0-9]{2,6}(초|중|고)(?=\s?\d?\s?학년|\s?학생)/g },
]

// 주소 규칙은 일상 낱말("마을", "동화")에 걸리지 않게 짧은 흔한 말을 제외
const IGNORE = new Set(['동', '시', '구', '길', '로', '중', '고', '초'])

export function checkPrivacy(text: string, ownName?: string): PrivacyHit[] {
    const hits: PrivacyHit[] = []
    for (const rule of RULES) {
        for (const m of text.matchAll(rule.re)) {
            const t = m[0].trim()
            if (t.length < 3 || IGNORE.has(t)) continue
            const start = m.index ?? 0
            hits.push({ kind: rule.kind, label: rule.label, start, end: start + m[0].length, text: t })
        }
    }
    const name = ownName?.trim()
    if (name && name.length >= 2) {
        let i = text.indexOf(name)
        while (i !== -1) {
            hits.push({ kind: 'ownName', label: '내 이름', start: i, end: i + name.length, text: name })
            i = text.indexOf(name, i + name.length)
        }
    }
    return hits.sort((a, b) => a.start - b.start)
}

export function maskHits(text: string, hits: PrivacyHit[]): string {
    let out = ''
    let cursor = 0
    for (const h of hits) {
        if (h.start < cursor) continue
        out += text.slice(cursor, h.start) + '○○'
        cursor = h.end
    }
    return out + text.slice(cursor)
}
