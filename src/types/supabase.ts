export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            books: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    is_rtl: boolean
                    password_hash: string | null
                    is_public: boolean
                    cover_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title?: string
                    is_rtl?: boolean
                    password_hash?: string | null
                    is_public?: boolean
                    cover_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    is_rtl?: boolean
                    password_hash?: string | null
                    is_public?: boolean
                    cover_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            pages: {
                Row: {
                    id: string
                    book_id: string
                    page_number: number
                    media_url: string | null
                    media_type: 'image' | 'video' | null
                    text_layers: Json
                    layout_preset: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    book_id: string
                    page_number: number
                    media_url?: string | null
                    media_type?: 'image' | 'video' | null
                    text_layers?: Json
                    layout_preset?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    book_id?: string
                    page_number?: number
                    media_url?: string | null
                    media_type?: 'image' | 'video' | null
                    text_layers?: Json
                    layout_preset?: string
                    created_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
