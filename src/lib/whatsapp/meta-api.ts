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
}

/**
 * Verify an Evolution API instance connection state.
 */
export async function verifyPhoneNumber(
  args: VerifyPhoneNumberArgs
): Promise<MetaPhoneInfo> {
  const { phoneNumberId, accessToken, wabaId } = args
  const baseUrl = wabaId || 'http://localhost:8080'
  const url = `${baseUrl}/instance/connectionState/${phoneNumberId}`
  const response = await fetch(url, {
    headers: { apikey: accessToken },
  })
  if (!response.ok) {
    throw new Error(`Evolution API instance state error: ${response.status}`)
  }
  const data = await response.json()
  if (data?.instance?.state !== 'open') {
    throw new Error(`Evolution instance state is "${data?.instance?.state || 'disconnected'}" (needs to be open).`)
  }
  return {
    id: phoneNumberId,
    display_phone_number: phoneNumberId,
    verified_name: `Evolution Instance: ${phoneNumberId}`,
    quality_rating: 'GREEN',
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

