// ============================================================================
// Core domain types for the Cortex Workmate mobile prototype.
// Everything here is mock data; no real backend.
// ============================================================================

export type Lang = 'zh' | 'en'
export type Theme = 'light' | 'dark' // effective (resolved) theme applied to the UI
export type ThemeMode = 'light' | 'dark' | 'system' // user's preference; 'system' follows the OS
export type AuthStatus = 'loggedOut' | 'onboarding' | 'ready'
export type TabKey = 'chat' | 'assistant' | 'me'
export type ChatMode = 'workmate' | 'normal'

// ---- Chat ------------------------------------------------------------------

export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'streaming' | 'thinking' | 'done' | 'error' | 'stopped'
export type Reaction = 'up' | 'down' | null

export interface Attachment {
  id: string
  kind: 'image' | 'file'
  name: string
  size: number // bytes
  previewUrl?: string // data URL for images, undefined for files
  ext?: string
}

export type ToolCallStatus = 'running' | 'success' | 'error' | 'awaiting_approval'

export interface ToolCallCard {
  id: string
  tool: string // capability id: 'github' | 'calendar' | 'scheduler' | 'web' | 'email' | 'codebase'
  title: string
  status: ToolCallStatus
  fn?: string // function name shown when expanded, e.g. 'get_okr_template'
  params?: Record<string, unknown> // call parameters, rendered as a JSON code block
  result?: string // result content (pre-formatted), rendered as a code block
  approvalId?: string // -> AppNotification.id when awaiting approval
}

export interface Message {
  id: string
  role: MessageRole
  text: string
  status: MessageStatus
  createdAt: number
  attachments?: Attachment[]
  thinking?: string
  toolCalls?: ToolCallCard[]
  reaction?: Reaction
  downvoteReason?: string
  taskCreatedId?: string // renders a "task created" card linking to a ScheduledTask
  mcpRequestId?: string // renders an inline "connect MCP server" card (McpServer.id)
  quotedRun?: TaskRunRef // renders a "quoted scheduled-task run" block above the user bubble
  edited?: boolean
  favoritedAt?: number // when bookmarked (Workmate thread); absent = not favorited
}

// A self-contained snapshot of one historical scheduled-task execution, used to
// "quote" that run in the Workmate composer and carry it on the sent message.
// Snapshot (not just ids) so the chip/quote block still renders if the task is
// later edited or deleted — mirrors the graceful-degradation choices elsewhere.
export interface TaskRunRef {
  taskId: string
  runId: string
  taskName: string
  status: 'success' | 'failed' | 'running'
  startedAt: number
  summary: string // short line for the chip/bubble (resultSummary || failureReason)
  resultText?: string // full run result (from the linked conversation) for engine context
}

export interface Project {
  id: string
  name: string
  createdAt: number
}

export interface Conversation {
  id: string
  title: string
  projectId?: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  // Task-run linkage (6.4)
  sourceTaskId?: string
  sourceRunId?: string
  sourceTriggeredAt?: number
}

// ---- Persona & Models ------------------------------------------------------

export interface ModelOption {
  id: string
  vendor: string
  name: string
  desc?: string
}

export interface Persona {
  name: string
  description: string
  avatarGradient: string // gradient preset key (fallback when no uploaded image)
  avatarImage?: string // user-uploaded avatar (downscaled data URL)
  systemPrompt: string
  modelId: string
}

// ---- Agents (Agents-mode switcher, grouped by organization/team) -----------

// Grouping key for the agent picker; rendered via i18n `agent.org.<key>`.
export type AgentOrg = 'builtin' | 'cobo' | 'salesBd' | 'opsGrowth' | 'rd' | 'default'

export interface Agent {
  id: string // STABLE literal id (agents are never persisted — only the selection is)
  name: string
  org: AgentOrg // grouping bucket in the picker
  desc?: string // one-line subtitle
  avatarGradient: string // gradient preset key for the agent tile
  builtin?: boolean // part of the system-provided 'builtin' group
}

// ---- Notifications (6.3) ---------------------------------------------------

export type NotificationType = 'approval' | 'task_status' | 'mcp_connect'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ValidityPeriod = '1d' | '7d' | 'never' | 'custom'
export type TaskStatusKind = 'created' | 'completed' | 'failed' | 'started'

export interface AppNotification {
  id: string
  type: NotificationType
  createdAt: number
  read: boolean
  title: string
  body?: string

  // approval-specific
  requester?: string
  purpose?: string
  scopes?: string[]
  tool?: string
  approvalStatus?: ApprovalStatus
  validity?: ValidityPeriod
  customValidityDays?: number
  resolvedAt?: number
  relatedMessageId?: string // in-chat card sync
  relatedConversationId?: string
  relatedMode?: ChatMode

  // task-status-specific
  taskStatusKind?: TaskStatusKind
  relatedTaskId?: string
  relatedRunId?: string

  // mcp-connect-specific (oauth connection request)
  relatedServerId?: string // -> McpServer.id; pill reflects that server's live enabled state
}

// ---- Scheduled tasks (6.4) -------------------------------------------------

export type TaskStatus = 'idle' | 'running' | 'success' | 'failed' | 'paused'
export type ScheduleKind = 'daily' | 'interval' | 'weekly' | 'once' | 'dates'

export interface Schedule {
  kind: ScheduleKind
  timeOfDay?: string // 'HH:MM'
  intervalMinutes?: number
  startAt?: number // interval: anchor (first occurrence) epoch ms; absent = "from now"
  weekday?: number // legacy single weekday 0 (Sun) - 6 (Sat); kept for back-compat
  weekdays?: number[] // weekly: selected weekdays (0=Sun..6=Sat) — supports multi-select
  dates?: number[] // 'dates': full date+time epoch ms, each runs once, stored ascending
  humanZh: string
  humanEn: string
}

export interface RunRecord {
  id: string
  status: 'success' | 'failed' | 'running'
  startedAt: number
  durationMs?: number
  resultSummary?: string
  failureReason?: string
  conversationId?: string
}

export interface ScheduledTask {
  id: string
  name: string
  instruction: string
  schedule: Schedule
  status: TaskStatus
  paused: boolean
  source: 'chat'
  sourceLabel: string // e.g. 'Workmate 对话'
  capabilities: string[]
  mcpServerNames?: string[] // MCP servers this task relies on (matched by McpServer.name)
  createdAt: number
  lastRunAt?: number
  nextRunAt?: number
  runs: RunRecord[]
}

// ---- Meetings (6.5) --------------------------------------------------------

export type MeetingStatus = 'pending' | 'analyzing' | 'done' | 'failed'

// Summary template — decides the SUMMARY content FORMAT only (the transcript is the raw
// dialogue, independent of template). Chosen before (re-)transcribing.
export type SummaryTemplate = 'meeting' | 'customer' | 'interview' | 'generic' | 'actions'

export interface TranscriptSegment {
  id: string
  speaker: string
  speakerIndex: number
  startMs: number
  endMs: number
  text: string
}

export interface Meeting {
  id: string
  title: string
  createdAt: number
  durationMs: number
  status: MeetingStatus
  source: 'recording' | 'import'
  analyzeProgress?: number
  analyzeStage?: string
  failureReason?: string
  transcript?: TranscriptSegment[]
  summaryMarkdown?: string
  template?: SummaryTemplate // which template the current summary was generated with
  summaryNote?: string // optional background note the user gave the AI for the summary
  summaryUpdatedAt?: number // last time the summary was (re)generated — used to surface
  // "only the summary was updated" even when the transcript is byte-identical
}
// NOTE: 转译 ("transcribe") is one unified action that internally does cloud-upload +
// transcription. Its whole lifecycle rides the single `status` field — 'analyzing' is
// shown as 转译中 (with analyzeProgress), 'failed' as 转译失败. There is no separate
// upload status: upload is just the first stage of an 'analyzing' run.

// ---- Account ---------------------------------------------------------------

export interface Account {
  id: string // user ID shown in the profile center
  name: string
  email: string
  avatarGradient: string
  avatarImage?: string // user-uploaded avatar (downscaled data URL); falls back to gradient+initial
}

// ---- Ephemeral UI ----------------------------------------------------------

export type ToastKind = 'success' | 'error' | 'info'
export interface Toast {
  id: string
  message: string
  kind: ToastKind
}

export interface ConfirmDialog {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
}

// ---- Workmate config (MCP servers / memories / skills) ---------------------

export interface McpTool {
  name: string // function name, e.g. 'slack_post_message'
  desc: string
}

export interface McpServer {
  id: string
  name: string
  desc: string // short one-liner (list subtitle)
  about?: string // fuller description (detail "About"); falls back to desc
  publisher?: string // e.g. 'Slack' / 'GitHub' / 'Atlassian'
  logo?: string // brand logo URL (falls back to gradient+letter tile on error)
  tools?: McpTool[] // tools the server exposes (detail "Tools" list)
  auth: 'oauth' | 'none' // 'oauth' must be authorized (browser flow) before it can be enabled
  authorized: boolean // OAuth completed; always treat 'none' servers as connectable
  enabled: boolean
  gradient?: string // gradient preset key for the icon tile fallback
  letter?: string // single-letter fallback shown on the icon tile
  shared?: boolean // mock "team shared" badge
}

// NB: `MemoryItem` (not `Memory`) — `Memory` is a DOM lib global.
export interface MemoryItem {
  id: string
  text: string
  createdAt: number
  deletedAt?: number // set when soft-deleted into the recycle bin; absent = active
}

export interface Skill {
  id: string
  name: string
  desc: string
  enabled: boolean
  gradient?: string
  letter?: string
}

export type ScreenName =
  | 'notifications'
  | 'taskList'
  | 'taskDetail'
  | 'meetingList'
  | 'meetingDetail'
  | 'recording'
  | 'persona'
  | 'profile' // personal info center (account id + edit name/avatar)
  | 'about' // app version / check-for-update
  | 'history' // normal-mode chat history (projects + sessions)
  | 'chatSearch' // search the Workmate continuous history
  | 'chatFavorites' // saved/bookmarked Workmate replies
  | 'conversation' // overlay conversation opened from a task run / notification
  | 'mcpList' // Workmate config: MCP servers
  | 'mcpDetail' // Workmate config: a single MCP server's detail
  | 'memoryList' // Workmate config: saved memories
  | 'memoryTrash' // Workmate config: recently-deleted memories (recycle bin)
  | 'skillList' // Workmate config: skills

export interface NavEntry {
  key: string
  name: ScreenName
  params?: Record<string, any>
}

export interface OverlayScreenProps {
  params?: Record<string, any>
  onBack: () => void
}
