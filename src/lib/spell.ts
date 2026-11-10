// 자주 틀리는 말 힌트 (서버·AI 없이 브라우저에서만). 틀린 게 확실한 것만 담는다.
export interface SpellHint { index: number; len: number; wrong: string; right: string; why: string }

interface Rule { re: RegExp; fix: (m: RegExpExecArray) => string; why: string }
const fixed = (s: string) => () => s

const RULES: Rule[] = [
  { re: /몇\s?일(?!요일)/g, fix: fixed('며칠'), why: '"며칠"이 맞아요. (며칠 동안, 며칠 전)' },
  { re: /어떻해/g, fix: fixed('어떡해'), why: '"어떡해"는 "어떻게 해"를 줄인 말이라 "어떡해"라고 써요.' },
  { re: /왠일/g, fix: fixed('웬일'), why: '"웬일"이 맞아요. 어떻게 된 일이라는 뜻이에요.' },
  { re: /웬지/g, fix: fixed('왠지'), why: '"왠지"는 "왜인지"를 줄인 말이에요.' },
  { re: /되요/g, fix: fixed('돼요'), why: '"되어요"를 줄이면 "돼요"예요. "되어"로 바꿔 읽어 보면 알 수 있어요.' },
  { re: /되서/g, fix: fixed('돼서'), why: '"되어서"를 줄이면 "돼서"예요.' },
  { re: /됬/g, fix: fixed('됐'), why: '"되었"을 줄이면 "됐"이에요. ("됬"이라는 글자는 없어요)' },
  { re: /([할갈올볼줄])께/g, fix: m => m[1] + '게', why: '"~ㄹ게"는 "게"로 써요. (할게, 갈게)' },
  { re: /금새/g, fix: fixed('금세'), why: '"금세"가 맞아요. "금시에"를 줄인 말이에요.' },
  { re: /설레임/g, fix: fixed('설렘'), why: '"설레다"의 이름꼴은 "설렘"이에요.' },
  { re: /희안/g, fix: fixed('희한'), why: '"희한하다"가 맞아요.' },
  { re: /일일히/g, fix: fixed('일일이'), why: '"일일이"가 맞아요.' },
  { re: /깨끗히/g, fix: fixed('깨끗이'), why: '"깨끗이"가 맞아요.' },
  { re: /어의없/g, fix: fixed('어이없'), why: '"어이없다"가 맞아요.' },
  { re: /오랫만/g, fix: fixed('오랜만'), why: '"오랜만"이 맞아요. (오래간만을 줄인 말)' },
  { re: /뵈요/g, fix: fixed('봬요'), why: '"뵈어요"를 줄이면 "봬요"예요.' },
  { re: /구지/g, fix: fixed('굳이'), why: '"굳이"가 맞아요.' },
  { re: /역활/g, fix: fixed('역할'), why: '"역할"이 맞아요.' },
  { re: /바램/g, fix: fixed('바람'), why: '"바라다"의 이름꼴은 "바람"이에요. (소망, 바람)' },
]

export function findSpellHints(text: string): SpellHint[] {
  const out: SpellHint[] = []
  for (const r of RULES) {
    r.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = r.re.exec(text))) {
      out.push({ index: m.index, len: m[0].length, wrong: m[0], right: r.fix(m), why: r.why })
      if (m[0].length === 0) r.re.lastIndex++
    }
  }
  return out.sort((a, b) => a.index - b.index)
}
