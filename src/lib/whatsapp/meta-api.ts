/**
 * Evolution API helpers (reusing Meta-compatible interfaces).
 */

export interface MetaSendResult {
  messageId: string
}

export interface MetaPhoneInfo {
  id: string
  display_phone_number: string
  verified_name?: string
  quality_rating?: string
}

// ============================================================
// Phone number / account (Instance Connection State)
// ============================================================

export interface VerifyPhoneNumberArgs {
  phoneNumberId: string
  accessToken: string
  wabaId?: string
  allowClosed?: boolean
}

/**
 * Create an instance in Evolution API.
 */
export async function createInstance(
  args: { phoneNumberId: string; accessToken: string; wabaId?: string }
): Promise<void> {
  const { phoneNumberId, accessToken, wabaId } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/instance/create`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: accessToken,
    },
    body: JSON.stringify({
      instanceName: phoneNumberId,
      qrcode: true,
    }),
  })
  if (!response.ok) {
    throw new Error(`Evolution API createInstance error: ${response.status}`)
  }
}

/**
 * Verify an Evolution API instance connection state.
 */
export async function verifyPhoneNumber(
  args: VerifyPhoneNumberArgs
): Promise<MetaPhoneInfo> {
  const { phoneNumberId, accessToken, wabaId, allowClosed = false } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/instance/connectionState/${phoneNumberId}`
  
  let response = await fetch(url, {
    headers: { apikey: accessToken },
  })
  
  if (response.status === 404) {
    // Auto-create instance if it doesn't exist
    await createInstance({ phoneNumberId, accessToken, wabaId })
    // Re-check state after creation
    response = await fetch(url, {
      headers: { apikey: accessToken },
    })
  }
  
  if (!response.ok) {
    throw new Error(`Evolution API instance state error: ${response.status}`)
  }
  
  const data = await response.json()
  const state = data?.instance?.state || data?.state
  if (state !== 'open' && !allowClosed) {
    throw new Error(`Evolution instance state is "${state || 'disconnected'}" (needs to be open).`)
  }
  
  return {
    id: phoneNumberId,
    display_phone_number: phoneNumberId,
    verified_name: `Evolution Instance: ${phoneNumberId}`,
    quality_rating: 'GREEN',
  }
}

export interface ConnectInstanceArgs {
  phoneNumberId: string
  accessToken: string
  wabaId?: string
}

export interface ConnectInstanceResult {
  base64?: string
  status?: string
}

/**
 * Fetch QR Code / connection payload from Evolution API.
 */
export async function connectInstance(
  args: ConnectInstanceArgs
): Promise<ConnectInstanceResult> {
  const { phoneNumberId, accessToken, wabaId } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/instance/connect/${phoneNumberId}`
  const response = await fetch(url, {
    headers: { apikey: accessToken },
  })
  if (!response.ok) {
    throw new Error(`Evolution API connect error: ${response.status}`)
  }
  const data = await response.json()
  return {
    base64: data?.qrcode?.base64 || data?.base64 || undefined,
    status: data?.instance?.status || data?.status || 'unknown',
  }
}

// ============================================================
// Cloud API registration (bypassed for Evolution API)
// ============================================================

export interface RegisterPhoneNumberArgs {
  phoneNumberId: string
  accessToken: string
  pin: string
  wabaId?: string
}

export interface RegisterPhoneNumberResult {
  success: boolean
  alreadyRegistered: boolean
}

export async function registerPhoneNumber(
  args: RegisterPhoneNumberArgs
): Promise<RegisterPhoneNumberResult> {
  return { success: true, alreadyRegistered: true }
}

export interface SubscribeWabaToAppArgs {
  wabaId: string
  accessToken: string
}

export async function subscribeWabaToApp(
  args: SubscribeWabaToAppArgs
): Promise<void> {
  return
}

export interface GetSubscribedAppsArgs {
  wabaId: string
  accessToken: string
}

export interface SubscribedApp {
  whatsapp_business_api_data?: {
    id?: string
    name?: string
    link?: string
  }
}

export async function getSubscribedApps(
  args: GetSubscribedAppsArgs
): Promise<SubscribedApp[]> {
  return [
    {
      whatsapp_business_api_data: {
        id: 'evolution',
        name: 'Evolution API Integration',
      },
    },
  ]
}

// ============================================================
// Sending
// ============================================================

export interface SendTextMessageArgs {
  phoneNumberId: string
  accessToken: string
  to: string
  text: string
  contextMessageId?: string
  wabaId?: string
}

/**
 * Send a plain text message via Evolution API.
 */
export async function sendTextMessage(
  args: SendTextMessageArgs
): Promise<MetaSendResult> {
  const { phoneNumberId, accessToken, to, text, wabaId } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/message/sendText/${phoneNumberId}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: accessToken,
    },
    body: JSON.stringify({
      number: to,
      textMessage: { text },
    }),
  })
  if (!response.ok) {
    throw new Error(`Evolution API sendText error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data?.key?.id || data?.message?.key?.id || `evo_${Date.now()}`
  return { messageId }
}

export type MediaKind = 'image' | 'video' | 'document' | 'audio'

export interface SendMediaMessageArgs {
  phoneNumberId: string
  accessToken: string
  to: string
  kind: MediaKind
  link: string
  caption?: string
  filename?: string
  contextMessageId?: string
  wabaId?: string
}

/**
 * Send a media message via Evolution API.
 */
export async function sendMediaMessage(
  args: SendMediaMessageArgs
): Promise<MetaSendResult> {
  const { phoneNumberId, accessToken, to, kind, link, caption, filename, wabaId } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/message/sendMedia/${phoneNumberId}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: accessToken,
    },
    body: JSON.stringify({
      number: to,
      mediaMessage: {
        mediatype: kind === 'audio' ? 'audio' : kind,
        media: link,
        fileName: filename || `${kind}_file`,
        caption: caption || '',
      },
    }),
  })
  if (!response.ok) {
    throw new Error(`Evolution API sendMedia error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data?.key?.id || data?.message?.key?.id || `evo_${Date.now()}`
  return { messageId }
}

import type { MessageTemplate } from '@/types'

export interface SendTemplateMessageArgs {
  phoneNumberId: string
  accessToken: string
  to: string
  templateName: string
  language?: string
  params?: string[]
  template?: MessageTemplate
  messageParams?: any
  contextMessageId?: string
  wabaId?: string
}

function formatTemplateBody(bodyText: string, params: string[]): string {
  let text = bodyText
  params.forEach((param, index) => {
    text = text.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), param)
  })
  return text
}

/**
 * Send a template message formatted as plain text via Evolution API.
 */
export async function sendTemplateMessage(
  args: SendTemplateMessageArgs
): Promise<MetaSendResult> {
  const {
    phoneNumberId,
    accessToken,
    to,
    templateName,
    template,
    messageParams,
    params,
    wabaId,
  } = args
  let bodyText = `Template: ${templateName}`
  if (template) {
    const values = messageParams?.body ?? params ?? []
    bodyText = formatTemplateBody(template.body_text, values)
  }
  return sendTextMessage({
    phoneNumberId,
    accessToken,
    to,
    text: bodyText,
    wabaId,
  })
}

// ============================================================
// Interactive
// ============================================================

export interface InteractiveButton {
  id: string
  title: string
}

export interface SendInteractiveButtonsArgs {
  phoneNumberId: string
  accessToken: string
  to: string
  bodyText: string
  headerText?: string
  footerText?: string
  buttons: InteractiveButton[]
  contextMessageId?: string
  wabaId?: string
}

export async function sendInteractiveButtons(
  args: SendInteractiveButtonsArgs
): Promise<MetaSendResult> {
  const {
    phoneNumberId,
    accessToken,
    to,
    bodyText,
    headerText,
    footerText,
    buttons,
    wabaId,
  } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/message/sendButtons/${phoneNumberId}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: accessToken,
    },
    body: JSON.stringify({
      number: to,
      title: headerText || '',
      description: bodyText,
      footer: footerText || '',
      buttons: buttons.map((btn) => ({
        buttonId: btn.id,
        buttonText: {
          displayText: btn.title,
        },
        type: 1,
      })),
    }),
  })
  if (!response.ok) {
    throw new Error(`Evolution API sendButtons error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data?.key?.id || data?.message?.key?.id || `evo_${Date.now()}`
  return { messageId }
}

export interface InteractiveListRow {
  id: string
  title: string
  description?: string
}

export interface InteractiveListSection {
  title?: string
  rows: InteractiveListRow[]
}

export interface SendInteractiveListArgs {
  phoneNumberId: string
  accessToken: string
  to: string
  bodyText: string
  buttonLabel: string
  headerText?: string
  footerText?: string
  sections: InteractiveListSection[]
  contextMessageId?: string
  wabaId?: string
}

export async function sendInteractiveList(
  args: SendInteractiveListArgs
): Promise<MetaSendResult> {
  const {
    phoneNumberId,
    accessToken,
    to,
    bodyText,
    buttonLabel,
    headerText,
    footerText,
    sections,
    wabaId,
  } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/message/sendList/${phoneNumberId}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: accessToken,
    },
    body: JSON.stringify({
      number: to,
      title: headerText || '',
      description: bodyText,
      buttonText: buttonLabel,
      footerText: footerText || '',
      sections: sections.map((sec) => ({
        title: sec.title || '',
        rows: sec.rows.map((row) => ({
          title: row.title,
          description: row.description || '',
          rowId: row.id,
        })),
      })),
    }),
  })
  if (!response.ok) {
    throw new Error(`Evolution API sendList error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data?.key?.id || data?.message?.key?.id || `evo_${Date.now()}`
  return { messageId }
}

// ============================================================
// Media
// ============================================================

export interface GetMediaUrlArgs {
  mediaId: string
  accessToken: string
}

export async function getMediaUrl(
  args: GetMediaUrlArgs
): Promise<{ url: string; mimeType: string }> {
  return { url: args.mediaId, mimeType: 'application/octet-stream' }
}

export interface DownloadMediaArgs {
  downloadUrl: string
  accessToken: string
}

export async function downloadMedia(
  args: DownloadMediaArgs
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(args.downloadUrl, {
    headers: { apikey: args.accessToken },
  })
  if (!response.ok) {
    throw new Error(`Evolution API media download failed: ${response.status}`)
  }
  const contentType =
    response.headers.get('content-type') || 'application/octet-stream'
  const buffer = Buffer.from(await response.arrayBuffer())
  return { buffer, contentType }
}

export interface SendReactionMessageArgs {
  phoneNumberId: string
  accessToken: string
  to: string
  targetMessageId: string
  emoji: string
  wabaId?: string
}

export async function sendReactionMessage(
  args: SendReactionMessageArgs
): Promise<MetaSendResult> {
  const { phoneNumberId, accessToken, to, targetMessageId, emoji, wabaId } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/message/sendReaction/${phoneNumberId}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: accessToken,
    },
    body: JSON.stringify({
      number: to,
      reaction: emoji || '',
      messageId: targetMessageId,
    }),
  })
  if (!response.ok) {
    throw new Error(`Evolution API sendReaction error: ${response.status}`)
  }
  const data = await response.json()
  const messageId = data?.key?.id || data?.message?.key?.id || `evo_${Date.now()}`
  return { messageId }
}

export async function deleteMessageTemplate(args: any): Promise<{ success: boolean }> {
  return { success: true }
}

export async function editMessageTemplate(args: any): Promise<{ success: boolean }> {
  return { success: true }
}

export async function submitMessageTemplate(args: any): Promise<{ success: boolean; id: string; status: string }> {
  return { success: true, id: 'template_id', status: 'PENDING' }
}

export async function uploadResumableMedia(args: any): Promise<{ handle: string }> {
  return { handle: 'resumable_handle' }
}

export const INTERACTIVE_LIMITS = {
  bodyMaxLength: 1024,
  headerTextMaxLength: 60,
  footerMaxLength: 60,
  buttonTitleMaxLength: 20,
  maxButtons: 3,
  maxListSections: 10,
  maxListRowsTotal: 10,
  listRowTitleMaxLength: 24,
  listRowDescriptionMaxLength: 72,
}

/**
 * Verify a Chatwoot connection.
 */
export async function verifyChatwootConnection(args: {
  baseUrl: string
  accessToken: string
  accountId: string
  inboxId: string
}): Promise<MetaPhoneInfo> {
  const { baseUrl, accessToken, accountId, inboxId } = args
  const url = `${baseUrl}/api/v1/accounts/${accountId}/inboxes`
  const response = await fetch(url, {
    headers: { api_access_token: accessToken },
  })
  if (!response.ok) {
    throw new Error(`Chatwoot connection failed: ${response.status}`)
  }
  const inboxes = await response.json()
  const exists = inboxes?.some((ib: any) => ib.id === parseInt(inboxId))
  if (!exists) {
    throw new Error(`Chatwoot Inbox ID ${inboxId} not found in account ${accountId}`)
  }
  return {
    id: `chatwoot:${accountId}:${inboxId}`,
    display_phone_number: `Chatwoot Inbox #${inboxId}`,
    verified_name: `Chatwoot Connection`,
    quality_rating: 'GREEN',
  }
}

/**
 * Send a message via Chatwoot API.
 */
export async function sendChatwootMessage(args: {
  baseUrl: string
  accessToken: string
  accountId: string
  inboxId: string
  to: string
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template'
  content?: string
  mediaUrl?: string
  filename?: string
}): Promise<string> {
  const { baseUrl, accessToken, accountId, inboxId, to, messageType, content, mediaUrl, filename } = args

  // 1. Search for contact by phone number
  const formattedPhone = to.startsWith('+') ? to : `+${to}`
  const searchUrl = `${baseUrl}/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(formattedPhone)}`
  const searchRes = await fetch(searchUrl, {
    headers: { api_access_token: accessToken },
  })
  
  let contactId: number | null = null
  if (searchRes.ok) {
    const searchData = await searchRes.json()
    if (searchData?.payload && searchData.payload.length > 0) {
      contactId = searchData.payload[0].id
    }
  }

  // 2. Create contact if not found
  if (!contactId) {
    const createContactUrl = `${baseUrl}/api/v1/accounts/${accountId}/contacts`
    const createRes = await fetch(createContactUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        api_access_token: accessToken,
      },
      body: JSON.stringify({
        name: `WhatsApp Contact ${to}`,
        phone_number: formattedPhone,
      }),
    })
    if (!createRes.ok) {
      throw new Error(`Chatwoot failed to create contact: ${createRes.status}`)
    }
    const contactData = await createRes.json()
    contactId = contactData?.payload?.contact?.id || contactData?.id
  }

  if (!contactId) {
    throw new Error('Could not resolve or create Chatwoot contact.')
  }

  // 3. Find or create conversation
  const convsUrl = `${baseUrl}/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`
  const convsRes = await fetch(convsUrl, {
    headers: { api_access_token: accessToken },
  })
  
  let conversationId: number | null = null
  if (convsRes.ok) {
    const convsData = await convsRes.json()
    const activeConv = convsData?.payload?.find((c: any) => c.inbox_id === parseInt(inboxId) && c.status !== 'resolved')
    if (activeConv) {
      conversationId = activeConv.id
    }
  }

  if (!conversationId) {
    const createConvUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations`
    const createRes = await fetch(createConvUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        api_access_token: accessToken,
      },
      body: JSON.stringify({
        inbox_id: parseInt(inboxId),
        contact_id: contactId,
      }),
    })
    if (!createRes.ok) {
      throw new Error(`Chatwoot failed to create conversation: ${createRes.status}`)
    }
    const convData = await createRes.json()
    conversationId = convData?.id
  }

  if (!conversationId) {
    throw new Error('Could not resolve or create Chatwoot conversation.')
  }

  // 4. Send message
  const msgUrl = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`
  
  if (mediaUrl && ['image', 'video', 'audio', 'document'].includes(messageType)) {
    // Media message
    const mediaRes = await fetch(mediaUrl)
    if (!mediaRes.ok) {
      throw new Error(`Failed to download media from: ${mediaUrl}`)
    }
    const blob = await mediaRes.blob()
    const file = new File([blob], filename || 'file', { type: blob.type })
    
    const formData = new FormData()
    formData.append('content', content || '')
    formData.append('message_type', 'outgoing')
    formData.append('private', 'false')
    formData.append('attachments[]', file)

    const response = await fetch(msgUrl, {
      method: 'POST',
      headers: {
        api_access_token: accessToken,
      },
      body: formData,
    })
    if (!response.ok) {
      throw new Error(`Chatwoot failed to send media message: ${response.status}`)
    }
    const data = await response.json()
    return data?.id?.toString() || `cw_msg_${Date.now()}`
  } else {
    // Text message / fallback
    const textToSend = content || ''
    const response = await fetch(msgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        api_access_token: accessToken,
      },
      body: JSON.stringify({
        content: textToSend,
        message_type: 'outgoing',
        private: false,
      }),
    })
    if (!response.ok) {
      throw new Error(`Chatwoot failed to send text message: ${response.status}`)
    }
    const data = await response.json()
    return data?.id?.toString() || `cw_msg_${Date.now()}`
  }
}

/**
 * Create/Start a session in WAHA.
 */
export async function createWahaSession(
  args: { sessionName: string; accessToken: string; baseUrl: string }
): Promise<void> {
  const { sessionName, accessToken, baseUrl } = args
  const url = `${baseUrl}/api/sessions`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': accessToken,
    },
    body: JSON.stringify({
      name: sessionName,
    }),
  })
  
  // 422 means session already exists, which is acceptable
  if (!response.ok && response.status !== 422) {
    throw new Error(`WAHA createSession error: ${response.status}`)
  }

  // Ensure the session is started
  const startUrl = `${baseUrl}/api/sessions/${sessionName}/start`
  const startResponse = await fetch(startUrl, {
    method: 'POST',
    headers: {
      'X-Api-Key': accessToken,
    },
  })
  
  // 422 means session is already started, which is acceptable
  if (!startResponse.ok && startResponse.status !== 422) {
    throw new Error(`WAHA startSession error: ${startResponse.status}`)
  }
}

/**
 * Verify a WAHA connection state.
 */
export async function verifyWahaConnection(args: {
  baseUrl: string
  accessToken: string
  sessionName: string
  allowClosed?: boolean
}): Promise<MetaPhoneInfo> {
  const { baseUrl, accessToken, sessionName, allowClosed = false } = args
  const url = `${baseUrl}/api/sessions/${sessionName}/status`
  
  let response = await fetch(url, {
    headers: { 'X-Api-Key': accessToken },
  })
  
  if (response.status === 404) {
    // Session doesn't exist, create it and start it
    await createWahaSession({ sessionName, accessToken, baseUrl })
    // Re-check
    response = await fetch(url, {
      headers: { 'X-Api-Key': accessToken },
    })
  } else if (response.ok) {
    const data = await response.json()
    // If session exists but is stopped, start it
    if (data?.status === 'STOPPED') {
      const startUrl = `${baseUrl}/api/sessions/${sessionName}/start`
      const startResponse = await fetch(startUrl, {
        method: 'POST',
        headers: {
          'X-Api-Key': accessToken,
        },
      })
      if (startResponse.ok || startResponse.status === 422) {
        // Re-check
        response = await fetch(url, {
          headers: { 'X-Api-Key': accessToken },
        })
      }
    }
  }
  
  if (!response.ok) {
    throw new Error(`WAHA session status check failed: ${response.status}`)
  }
  
  const data = await response.json()
  const status = data?.status
  
  if (status !== 'WORKING' && !allowClosed) {
    throw new Error(`WAHA session status is "${status || 'unknown'}" (needs to be WORKING).`)
  }
  
  return {
    id: `waha:${sessionName}`,
    display_phone_number: `WAHA Session: ${sessionName}`,
    verified_name: `WAHA Connection`,
    quality_rating: 'GREEN',
  }
}

/**
 * Fetch QR Code image from WAHA.
 */
export async function connectWahaInstance(args: {
  baseUrl: string
  accessToken: string
  sessionName: string
}): Promise<ConnectInstanceResult> {
  const { baseUrl, accessToken, sessionName } = args

  // Check session status first
  const statusUrl = `${baseUrl}/api/sessions/${sessionName}/status`
  try {
    const statusRes = await fetch(statusUrl, {
      headers: { 'X-Api-Key': accessToken },
    })
    if (statusRes.ok) {
      const statusData = await statusRes.json()
      if (statusData?.status === 'WORKING') {
        return {
          status: 'connected',
        }
      }
    }
  } catch (err) {
    console.warn('WAHA session status check failed in connectWahaInstance:', err)
  }

  const url = `${baseUrl}/api/${sessionName}/auth/qr`
  const response = await fetch(url, {
    headers: { 'X-Api-Key': accessToken },
  })
  
  if (!response.ok) {
    if (response.status === 422) {
      // Session is not ready for QR or already starting.
      return {
        status: 'connecting',
      }
    }
    throw new Error(`WAHA qr check failed: ${response.status}`)
  }
  
  const blob = await response.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  const base64 = `data:image/png;base64,${buffer.toString('base64')}`
  return {
    base64,
    status: 'connecting',
  }
}

/**
 * Send message via WAHA API.
 */
export async function sendWahaMessage(args: {
  baseUrl: string
  accessToken: string
  sessionName: string
  to: string
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template'
  content?: string
  mediaUrl?: string
  filename?: string
}): Promise<string> {
  const { baseUrl, accessToken, sessionName, to, messageType, content, mediaUrl, filename } = args
  
  const cleanPhone = to.replace(/\D/g, '')
  const chatId = `${cleanPhone}@c.us`

  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Key': accessToken,
  }

  if (mediaUrl && ['image', 'video', 'audio', 'document'].includes(messageType)) {
    let mimetype = 'application/octet-stream'
    if (messageType === 'image') mimetype = 'image/jpeg'
    else if (messageType === 'video') mimetype = 'video/mp4'
    else if (messageType === 'audio') mimetype = 'audio/mp4'
    else if (messageType === 'document') mimetype = 'application/pdf'

    const url = `${baseUrl}/api/sendFile`
    const body = {
      session: sessionName,
      chatId,
      file: {
        url: mediaUrl,
        mimetype,
        filename: filename || 'file',
      },
      caption: content || undefined,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`WAHA sendFile failed: ${response.status}`)
    }
    const data = await response.json()
    return data?.id || `waha_msg_${Date.now()}`
  } else {
    const url = `${baseUrl}/api/sendText`
    const body = {
      session: sessionName,
      chatId,
      text: content || '',
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`WAHA sendText failed: ${response.status}`)
    }
    const data = await response.json()
    return data?.id || `waha_msg_${Date.now()}`
  }
}

