// 함께 쓰는 방 — 서버 창구(RPC) 호출 + 브라우저 저장
import { supabase } from './supabase'

export type RelayMode = 'free' | 'challenge'

export interface RelayMember { seq: number; nickname: string; emoji: number }
export interface RelayLine { seq: number; w: number | null; sys: boolean; t: string; at: string }

export interface RelayState {
  changed: boolean
  ver: number
  turn: number
  turn_started_at: string
  // changed === true 일 때만 아래가 옴
  name?: string
  book?: string | null
  mode?: RelayMode
  time_limit?: number
  status?: 'open' | 'done'
  members?: RelayMember[]
  lines?: RelayLine[]
}

export interface JoinResult { token: string; seq: number; emoji: number }

export interface TeacherRoomSummary {
  code: string
  name: string
  mode: RelayMode
  status: 'open' | 'done'
  created_at: string
  members: number
  lines: number
  turn: string | null
}

export interface TeacherLine { id: number; seq: number; who: string | null; t: string; hidden: boolean; sys: boolean }

// 생성된 DB 타입에 없는 함수라 느슨하게 부른다
type RpcFn = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc: RpcFn = (name, args) => (supabase as unknown as { rpc: RpcFn }).rpc(name, args)

async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(name, args)
  if (error) throw new Error(error.message || '잠시 후 다시 해 보세요')
  return data as T
}

export const relayJoin = (code: string, nickname: string) =>
  call<JoinResult>('wr_join', { p_code: code, p_nickname: nickname })

export const relayCheck = (code: string, token: string, ver: number, since: number) =>
  call<RelayState>('wr_check', { p_code: code, p_token: token, p_ver: ver, p_since: since })

export const relaySubmit = (code: string, token: string, text: string) =>
  call<{ ok: boolean }>('wr_submit', { p_code: code, p_token: token, p_text: text })

export const teacherCreateRoom = (tc: string, name: string, mode: RelayMode, limit: number, max: number) =>
  call<string>('wr_create_room', { p_teacher_code: tc, p_name: name, p_mode: mode, p_limit: limit, p_max: max })

export const teacherOverview = (tc: string) =>
  call<TeacherRoomSummary[]>('wr_teacher_overview', { p_teacher_code: tc })

export const teacherRoom = (tc: string, code: string) =>
  call<TeacherLine[]>('wr_teacher_room', { p_teacher_code: tc, p_code: code })

export const teacherHide = (tc: string, lineId: number, hidden: boolean) =>
  call<void>('wr_hide_line', { p_teacher_code: tc, p_line_id: lineId, p_hidden: hidden })

export const teacherClose = (tc: string, code: string) =>
  call<void>('wr_close_room', { p_teacher_code: tc, p_code: code })

export const teacherSetBook = (tc: string, code: string, book: string | null) =>
  call<{ ok: boolean }>('wr_set_book', { p_teacher_code: tc, p_code: code, p_book: book })

export interface TeacherMember { seq: number; nickname: string; released: boolean }
export const teacherMembers = (tc: string, code: string) =>
  call<TeacherMember[]>('wr_teacher_members', { p_teacher_code: tc, p_code: code })
export const teacherRelease = (tc: string, code: string, seq: number) =>
  call<{ ok: boolean }>('wr_release_seat', { p_teacher_code: tc, p_code: code, p_seq: seq })

// ---- 내 쪽 꾸미기 (쪽 담당제) ----
export interface PageData { seq: number; img: string | null; font: number }
export interface PagesResult { now: string; pages: PageData[] }

export const pageSave = (code: string, token: string, seq: number, img: string | null, font: number) =>
  call<{ ok: boolean }>('wr_page_save', { p_code: code, p_token: token, p_seq: seq, p_img: img, p_font: font })

export const pagesGet = (code: string, token: string, since: string | null) =>
  call<PagesResult>('wr_pages_get', { p_code: code, p_token: token, p_since: since })

export const teacherPages = (tc: string, code: string) =>
  call<PageData[]>('wr_pages_teacher', { p_teacher_code: tc, p_code: code })

// 사진을 작게 줄여 글자(data URL)로 바꾼다. 150,000자 한도 안에 들도록 줄여 간다
export async function shrinkImage(src: Blob | HTMLCanvasElement): Promise<string> {
  let bmp: CanvasImageSource & { width: number; height: number }
  if (src instanceof HTMLCanvasElement) bmp = src
  else bmp = await createImageBitmap(src)
  let w = Math.min(720, bmp.width)
  let q = 0.8
  for (let i = 0; i < 8; i++) {
    const h = Math.round(bmp.height * (w / bmp.width))
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const g = c.getContext('2d')
    if (!g) throw new Error('이 기기에서는 사진을 줄일 수 없어요')
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h)
    g.drawImage(bmp, 0, 0, w, h)
    const url = c.toDataURL('image/jpeg', q)
    if (url.length <= 120000) return url
    q = Math.max(0.5, q - 0.1)
    w = Math.round(w * 0.85)
  }
  throw new Error('사진이 너무 커요. 다른 사진으로 해 볼까요?')
}

// ---- 브라우저 저장 (실패해도 앱이 멈추지 않게) ----
const KEY = 'together.session'
const DRAFT = 'together.draft.'

export interface SavedSession { code: string; token: string; nickname: string; seq: number; emoji: number }

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedSession) : null
  } catch { return null }
}
export function saveSession(s: SavedSession) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* 무시 */ }
  addHistory(s)
}

// 이 기기에서 들어갔던 자리 목록 (나가거나 화면이 튕겨도 이름만 골라 다시 들어오게)
const HIST = 'together.history'
export function loadHistory(): SavedSession[] {
  try {
    const raw = localStorage.getItem(HIST)
    const a = raw ? (JSON.parse(raw) as SavedSession[]) : []
    return Array.isArray(a) ? a : []
  } catch { return [] }
}
function addHistory(s: SavedSession) {
  try {
    const rest = loadHistory().filter(x => !(x.code === s.code && x.nickname === s.nickname))
    localStorage.setItem(HIST, JSON.stringify([s, ...rest].slice(0, 6)))
  } catch { /* 무시 */ }
}
export function dropHistory(code: string, token: string) {
  try { localStorage.setItem(HIST, JSON.stringify(loadHistory().filter(x => !(x.code === code && x.token === token)))) } catch { /* 무시 */ }
}
export function clearSession() {
  try { localStorage.removeItem(KEY) } catch { /* 무시 */ }
}
export function loadDraft(code: string): string {
  try { return localStorage.getItem(DRAFT + code) ?? '' } catch { return '' }
}
export function saveDraft(code: string, text: string) {
  try {
    if (text) localStorage.setItem(DRAFT + code, text)
    else localStorage.removeItem(DRAFT + code)
  } catch { /* 무시 */ }
}

// ---- 모양 약속 (시안과 동일) ----
export const MEMBER_BG = ['#F7C844', '#BFE0F2', '#CDE7B8', '#F5C6C0', '#DCCBF0']
export const MEMBER_EMOJI = ['🦊', '🐰', '🐻', '🐱', '🐶', '🐼']
export const bgOf = (emoji: number) => MEMBER_BG[emoji % MEMBER_BG.length]
export const emojiOf = (emoji: number) => MEMBER_EMOJI[emoji % MEMBER_EMOJI.length]
