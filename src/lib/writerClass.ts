// AI 작가 교실 — 선생님께 "숫자 요약"만 보여주는 창구 (글 내용은 절대 보내지 않는다)
import { useEffect } from 'react'
import { supabase } from './supabase'
import { useWriterStore } from '../store/writerStore'
import type { QuestRecord, LibraryItem, Writer } from '../types/writer'

type RpcFn = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc: RpcFn = (name, args) => (supabase as unknown as { rpc: RpcFn }).rpc(name, args)

async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await rpc(name, args)
    if (error) throw new Error(error.message || '잠시 후 다시 해 보세요')
    return data as T
}

// ---- 학생 쪽 ----
export interface ClassMembership { code: string; token: string; nickname: string }
const KEY = 'ai-writer-class'

export function loadMembership(): ClassMembership | null {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return null
        const m = JSON.parse(raw) as Partial<ClassMembership>
        return m.code && m.token && m.nickname ? (m as ClassMembership) : null
    } catch { return null }
}
function saveMembership(m: ClassMembership | null) {
    try { if (m) localStorage.setItem(KEY, JSON.stringify(m)); else localStorage.removeItem(KEY) } catch { /* 저장 못 해도 계속 */ }
    window.dispatchEvent(new Event('ai-writer-class-change'))
}

// 서버로 가는 것은 숫자와 이름뿐이다
export function buildReport(w: Writer, quests: QuestRecord[], library: LibraryItem[]) {
    let adopt = 0, fix = 0, discard = 0
    for (const q of quests) for (const s of q.stanzas) {
        if (s.stamp === 'adopt') adopt++
        else if (s.stamp === 'fix') fix++
        else if (s.stamp === 'discard') discard++
    }
    return {
        p_writer: w.name, p_level: w.level, p_xp: w.xp,
        p_imagination: w.stats.imagination, p_expression: w.stats.expression,
        p_judgment: w.stats.judgment, p_persistence: w.stats.persistence,
        p_adopt: adopt, p_fix: fix, p_discard: discard,
        p_quests: quests.filter((q) => q.status === 'done').length,
        p_library: library.length,
    }
}

export async function sendReport(m: ClassMembership): Promise<'ok' | 'gone'> {
    const { writer, quests, library } = useWriterStore.getState()
    if (!writer) return 'ok'
    try {
        await call('aw_report', { p_code: m.code, p_token: m.token, ...buildReport(writer, quests, library) })
        return 'ok'
    } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('학생이 아니에요') || msg.includes('닫힌')) return 'gone'
        return 'ok' // 네트워크 문제 등은 다음 기회에 다시
    }
}

export async function joinClass(code: string, nickname: string): Promise<ClassMembership> {
    const c = code.replace(/\D/g, '')
    if (c.length !== 6) throw new Error('교실 번호는 숫자 6자리예요')
    const nick = nickname.trim()
    const token = await call<string>('aw_join', { p_code: c, p_nickname: nick })
    const m = { code: c, token, nickname: nick }
    saveMembership(m)
    await sendReport(m)
    return m
}

export async function leaveClass(m: ClassMembership): Promise<void> {
    try { await call('aw_leave', { p_code: m.code, p_token: m.token }) } catch { /* 이미 없어도 괜찮아요 */ }
    saveMembership(null)
}

export function forgetMembership() { saveMembership(null) }

// 방이 열려 있는 동안: 숫자가 바뀌면 2.5초 뒤 한 번만 보낸다 (화면이 보일 때만, 계속 확인하지 않음)
export function useClassSync() {
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined
        let last = ''
        const fire = async () => {
            const m = loadMembership()
            if (!m || document.visibilityState !== 'visible') return
            const { writer, quests, library } = useWriterStore.getState()
            if (!writer) return
            const sig = JSON.stringify(buildReport(writer, quests, library))
            if (sig === last) return
            last = sig
            if ((await sendReport(m)) === 'gone') forgetMembership()
        }
        const schedule = () => { clearTimeout(timer); timer = setTimeout(fire, 2500) }
        const unsub = useWriterStore.subscribe(schedule)
        const onVis = () => { if (document.visibilityState === 'visible') schedule() }
        document.addEventListener('visibilitychange', onVis)
        schedule()
        return () => { clearTimeout(timer); unsub(); document.removeEventListener('visibilitychange', onVis) }
    }, [])
}

// ---- 선생님 쪽 ----
export interface ClassSummary { code: string; name: string; status: 'open' | 'closed'; created_at: string; max: number; students: number }
export interface ClassStudent {
    id: string; nickname: string; writer: string; level: number; xp: number
    imagination: number; expression: number; judgment: number; persistence: number
    adopt: number; fix: number; discard: number; quests: number; library: number
    joined_at: string; updated_at: string
}
export const teacherClasses = (tc: string) => call<ClassSummary[]>('aw_teacher_overview', { p_teacher_code: tc })
export const teacherCreateClass = (tc: string, name: string, max: number) => call<string>('aw_create_class', { p_teacher_code: tc, p_name: name, p_max: max })
export const teacherStudents = (tc: string, code: string) => call<ClassStudent[]>('aw_teacher_list', { p_teacher_code: tc, p_code: code })
export const teacherRemoveStudent = (tc: string, code: string, id: string) => call<void>('aw_remove_student', { p_teacher_code: tc, p_code: code, p_id: id })
export const teacherCloseClass = (tc: string, code: string) => call<void>('aw_close_class', { p_teacher_code: tc, p_code: code })
export const teacherDeleteClass = (tc: string, code: string) => call<void>('aw_delete_class', { p_teacher_code: tc, p_code: code })
export { amTeacher } from './relay'
