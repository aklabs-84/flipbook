// 작가의 책상 — 서버 창구(RPC) 호출 + 열쇠 코드 브라우저 저장
import { supabase } from './supabase'

export interface DeskPieceItem {
  id: string
  title: string
  genre: string
  color: string
  status: 'draft' | 'done'
  len: number
  updated_at: string
}

export interface DeskPiece {
  id: string
  title: string
  genre: string
  memo: string
  body: string
  fav: string
  color: string
  status: 'draft' | 'done'
  created_at: string
  updated_at: string
}

export interface DeskPieceInput {
  id: string | null
  title: string
  genre: string
  memo: string
  body: string
  fav: string
  color: string
  status: 'draft' | 'done'
}

// 생성된 DB 타입에 없는 함수라 느슨하게 부른다
type RpcFn = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc: RpcFn = (name, args) => (supabase as unknown as { rpc: RpcFn }).rpc(name, args)

async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(name, args)
  if (error) throw new Error(error.message || '잠시 후 다시 해 보세요')
  return data as T
}

export const deskCreateAuthor = (nickname: string) =>
  call<{ key: string; nickname: string }>('dk_create_author', { p_nickname: nickname })

export const deskLogin = (key: string) =>
  call<{ nickname: string }>('dk_login', { p_key: key })

export const deskList = (key: string) =>
  call<DeskPieceItem[]>('dk_list', { p_key: key })

export const deskGet = (key: string, id: string) =>
  call<DeskPiece>('dk_get', { p_key: key, p_id: id })

export const deskSave = (key: string, p: DeskPieceInput) =>
  call<{ id: string }>('dk_save', {
    p_key: key, p_id: p.id, p_title: p.title, p_genre: p.genre, p_memo: p.memo,
    p_body: p.body, p_fav: p.fav, p_color: p.color, p_status: p.status,
  })

export const deskDelete = (key: string, id: string) =>
  call<{ ok: boolean }>('dk_delete', { p_key: key, p_id: id })

// ---- 브라우저 저장 (실패해도 앱이 멈추지 않게) ----
const KEY = 'desk.session'
export interface DeskSession { key: string; nickname: string }

export function loadDeskSession(): DeskSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DeskSession) : null
  } catch { return null }
}
export function saveDeskSession(s: DeskSession) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* 무시 */ }
}
export function clearDeskSession() {
  try { localStorage.removeItem(KEY) } catch { /* 무시 */ }
}

// 쓰다 만 글 임시 보관 (서버에 저장하기 전, 화면이 튕겨도 살리기)
const DRAFT = 'desk.draft'
export function loadDeskDraft(): DeskPieceInput | null {
  try {
    const raw = localStorage.getItem(DRAFT)
    return raw ? (JSON.parse(raw) as DeskPieceInput) : null
  } catch { return null }
}
export function saveDeskDraft(p: DeskPieceInput | null) {
  try {
    if (p) localStorage.setItem(DRAFT, JSON.stringify(p))
    else localStorage.removeItem(DRAFT)
  } catch { /* 무시 */ }
}

// ---- 모양 약속 (DESIGN.md) ----
export const DESK_COLORS = ['#2F5D50', '#8F2F1D', '#2E4A6B', '#6B4E2E', '#4A3B5C', '#7A6F2E']
export const DESK_GENRES = ['일기', '동화', '시', '편지', '소설', '수필']
