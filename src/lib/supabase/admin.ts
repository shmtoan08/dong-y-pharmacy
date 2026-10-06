import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role client — CHỈ dùng ở server, đã qua authz check.
// Không bao giờ import file này vào client component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
