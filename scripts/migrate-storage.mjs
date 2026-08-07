// One-time migration: copies the 9 files belonging to the "1화. 단골" book
// from the old (Tokyo) Supabase project's public "uploads" bucket into the
// new (Seoul) project's "uploads" bucket, preserving the exact same paths.
//
// Usage:
//   node --env-file=.env.migration scripts/migrate-storage.mjs
//
// Requires .env.migration with:
//   NEW_SUPABASE_URL=https://cyrjvamuvgqcphqxtcrx.supabase.co
//   NEW_SUPABASE_SERVICE_ROLE_KEY=...  (Project Settings > API > service_role, NEW project only)

import { createClient } from '@supabase/supabase-js'

const OLD_PUBLIC_BASE = 'https://hvfkjnhajkzpntkfrzyk.supabase.co/storage/v1/object/public/uploads'

const FILES = [
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/5nhgwnyxadi_1771572750346.webp', contentType: 'image/webp' },
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/99n4bc0f9we_1771572737674.webp', contentType: 'image/webp' },
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/bgm/giew1yob04k_1779969908559.mp3', contentType: 'audio/mpeg' },
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/bgm/lq0smtqbxpn_1779969835009.mp3', contentType: 'audio/mpeg' },
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/cgmg5ubvrbd_1771572694196.webp', contentType: 'image/webp' },
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/cover/mek4h2b2yik_1771574502679.webp', contentType: 'image/webp' },
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/dgn398c30ek_1771572676414.webp', contentType: 'image/webp' },
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/spxhljtphho_1771572644989.webp', contentType: 'image/webp' },
    { path: '1683f9b9-2838-4eb4-8bcd-f9184b639833/e4996e69-29e3-4d68-a50d-5cf97c26ffcf/uppuv7hu14_1771572709047.webp', contentType: 'image/webp' },
]

const newUrl = process.env.NEW_SUPABASE_URL
const newServiceKey = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY

if (!newUrl || !newServiceKey) {
    console.error('Missing NEW_SUPABASE_URL or NEW_SUPABASE_SERVICE_ROLE_KEY. Create .env.migration first.')
    process.exit(1)
}

const supabase = createClient(newUrl, newServiceKey)

for (const file of FILES) {
    process.stdout.write(`Copying ${file.path} ... `)

    const res = await fetch(`${OLD_PUBLIC_BASE}/${file.path}`)
    if (!res.ok) {
        console.log(`FAILED (download ${res.status})`)
        continue
    }
    const buffer = Buffer.from(await res.arrayBuffer())

    const { error } = await supabase.storage
        .from('uploads')
        .upload(file.path, buffer, { contentType: file.contentType, upsert: true })

    console.log(error ? `FAILED (upload: ${error.message})` : `OK (${buffer.length} bytes)`)
}

console.log('Done.')
