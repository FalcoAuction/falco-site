import { NextResponse } from "next/server"
import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: supabaseAdminConfigError },
      { status: 500 }
    )
  }

  const { count, error } = await supabaseAdmin
    .from("vault_listings")
    .select("*", { count: "exact", head: true })

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    vault_listings_count: count ?? 0,
  })
}
