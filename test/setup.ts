import '@testing-library/jest-dom'

// lib/supabase.ts valida sus env vars en el scope del módulo y lanza si
// faltan, así que tienen que existir ANTES de cualquier import de la app.
// Valores dummy: los tests que importan lib/voces-session.ts (para probar la
// firma HMAC y el parseo de cookies) no pegan a la red.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key'
