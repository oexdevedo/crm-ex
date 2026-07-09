import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { connectInstance, connectWahaInstance } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 }
      )
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('phone_number_id, waba_id, access_token')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'WhatsApp is not configured. Please save your settings first.' },
        { status: 400 }
      )
    }

    const isWaha = config.phone_number_id?.startsWith('waha:')
    const accessToken = decrypt(config.access_token)

    try {
      if (isWaha) {
        const [_, sessionName] = config.phone_number_id.split(':')
        const connectResult = await connectWahaInstance({
          baseUrl: config.waba_id || '',
          accessToken,
          sessionName,
        })
        return NextResponse.json(connectResult)
      } else {
        const connectResult = await connectInstance({
          phoneNumberId: config.phone_number_id,
          accessToken,
          wabaId: config.waba_id || undefined,
        })
        return NextResponse.json(connectResult)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect instance'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (error) {
    console.error('Error in /api/whatsapp/connect:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
