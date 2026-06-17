import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type Account,
  type Agent,
  type AppNotification,
  type ApprovalStatus,
  type ChatMode,
  type ConfirmDialog,
  type Conversation,
  type Lang,
  type McpServer,
  type Meeting,
  type MemoryItem,
  type Message,
  type ModelOption,
  type NavEntry,
  type Persona,
  type Project,
  type Schedule,
  type ScheduledTask,
  type ScreenName,
  type Skill,
  type SummaryTemplate,
  type TabKey,
  type TaskRunRef,
  type Theme,
  type ThemeMode,
  type Toast,
  type ToastKind,
  type ValidityPeriod,
} from '../lib/types'
import { uid } from '../lib/util'
import { computeNextRun } from '../lib/time'
import { translate } from '../i18n/strings'
import {
  buildSeed,
  MODELS,
  genericAnalysis,
  interviewAnalysis,
  reviewAnalysis,
  setSeedLang,
  summaryForTemplate,
} from '../data/seed'

/** Resolve the OS-preferred color scheme (used when themeMode === 'system'). */
export function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export type MessageTarget = { mode: 'workmate' } | { mode: 'normal'; conversationId: string }

type MsgUpdater = (msgs: Message[]) => Message[]

interface AppState {
  // settings
  lang: Lang
  theme: Theme // effective theme actually applied (light/dark)
  themeMode: ThemeMode // user's choice: light / dark / follow-system
  // auth / onboarding
  authStatus: 'loggedOut' | 'onboarding' | 'ready'
  hasOnboarded: boolean
  scanLoginOpen: boolean
  // account
  account: Account
  // navigation (ephemeral)
  activeTab: TabKey
  overlays: NavEntry[]
  // chat
  chatMode: ChatMode
  jumpToMessageId?: string // ephemeral: ask the Workmate thread to scroll/highlight a message
  composeDraft?: string // ephemeral: prefill the Workmate composer (e.g. "save this as memory")
  composeQuote?: TaskRunRef // ephemeral: attach a quoted scheduled-task run to the Workmate composer
  persona: Persona
  agents: Agent[]
  activeAgentId: string // the agent selected in Agents mode (persisted)
  models: ModelOption[]
  workmateMessages: Message[]
  projects: Project[]
  conversations: Conversation[]
  activeConversationId?: string
  // notifications
  notifications: AppNotification[]
  // tasks
  tasks: ScheduledTask[]
  // meetings
  meetings: Meeting[]
  // workmate config
  mcpServers: McpServer[]
  memories: MemoryItem[]
  skills: Skill[]
  // ephemeral UI
  toasts: Toast[]
  confirmDialog: ConfirmDialog | null
  _hydrated: boolean

  // ---- actions ----
  setLang: (l: Lang) => void
  setTheme: (t: Theme) => void // set the effective theme (used by the system-theme listener)
  setThemeMode: (m: ThemeMode) => void // set the user's choice; resolves effective theme

  login: () => void
  setScanLogin: (open: boolean) => void
  completeOnboarding: () => void
  logout: () => void
  updateAccount: (patch: Partial<Account>) => void

  setTab: (t: TabKey) => void
  push: (name: ScreenName, params?: Record<string, any>) => void
  pop: () => void
  popAllOverlays: () => void

  toast: (message: string, kind?: ToastKind) => void
  dismissToast: (id: string) => void
  askConfirm: (d: ConfirmDialog) => void
  closeConfirm: () => void

  setChatMode: (m: ChatMode) => void
  setJumpTo: (id: string) => void
  clearJumpTo: () => void
  mutateMessages: (target: MessageTarget, updater: MsgUpdater) => void
  appendMessage: (target: MessageTarget, msg: Message) => void
  patchMessage: (
    target: MessageTarget,
    id: string,
    patch: Partial<Message> | ((m: Message) => Partial<Message>),
  ) => void
  setActiveConversation: (id?: string) => void
  newConversation: (projectId?: string) => string
  renameConversation: (id: string, title: string) => void
  deleteConversation: (id: string) => void
  moveConversation: (id: string, projectId?: string) => void
  newProject: (name: string) => string
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string, deleteConversations: boolean) => void

  setPersona: (patch: Partial<Persona>) => void
  setModel: (modelId: string) => void
  setActiveAgent: (id: string) => void

  addNotification: (n: AppNotification) => void
  markAllRead: () => void
  markNotificationRead: (id: string) => void
  resolveApproval: (
    id: string,
    status: ApprovalStatus,
    validity?: ValidityPeriod,
    customDays?: number,
  ) => void

  createTaskFromChat: (input: {
    name: string
    instruction: string
    schedule: Schedule
    capabilities: string[]
    mcpServerNames?: string[]
    sourceLabel?: string
  }) => ScheduledTask
  updateTask: (id: string, patch: Partial<ScheduledTask>) => void
  saveTaskEdit: (
    id: string,
    input: { name: string; instruction: string; schedule: Schedule },
  ) => void
  deleteTask: (id: string) => void
  togglePauseTask: (id: string) => void
  runTaskNow: (id: string) => void

  createRecording: (input: { title: string; durationMs: number; source: 'recording' | 'import' }) => Meeting
  uploadMeeting: (id: string) => void // simulated cloud upload; also the retry entry
  renameMeeting: (id: string, title: string) => void
  deleteMeeting: (id: string) => void
  transcribeMeeting: (
    id: string,
    opts: { template: SummaryTemplate; regenerateTranscript?: boolean; note?: string },
  ) => void

  authorizeMcp: (id: string) => void
  setMcpEnabled: (id: string, enabled: boolean) => void
  toggleSkill: (id: string) => void
  addMemory: (text: string) => void
  deleteMemory: (id: string) => void // soft-delete → recycle bin
  restoreMemory: (id: string) => void
  purgeMemory: (id: string) => void // permanently remove from the bin
  setComposeDraft: (text: string) => void
  clearComposeDraft: () => void
  setComposeQuote: (q: TaskRunRef) => void
  clearComposeQuote: () => void
  // build a quote from a historical run + jump to the Workmate composer
  quoteRunInChat: (taskId: string, runId: string) => void

  resetDemo: () => void
}

function freshSeedSlices(lang?: Lang) {
  const s = buildSeed(lang ?? useStore.getState().lang)
  return {
    account: s.account,
    persona: s.persona,
    agents: s.agents,
    activeAgentId: s.agents[0].id, // Auto Agent is the default selection
    workmateMessages: s.workmateMessages,
    projects: s.projects,
    conversations: s.conversations,
    activeConversationId: undefined as string | undefined,
    notifications: s.notifications,
    // always recompute next-run so it's a future time on (re)load
    tasks: s.tasks.map((t) => ({ ...t, nextRunAt: computeNextRun(t.schedule, Date.now()) })),
    meetings: s.meetings,
    mcpServers: s.mcpServers,
    memories: s.memories,
    skills: s.skills,
  }
}

const initialSeed = freshSeedSlices('en')

// Pick a plausible analysis for a meeting being transcribed.
function analysisFor(m: Meeting) {
  if (/访谈|interview/i.test(m.title)) return interviewAnalysis()
  if (/评审|review/i.test(m.title)) return reviewAnalysis()
  return genericAnalysis()
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      lang: 'en',
      theme: 'light',
      themeMode: 'light',
      authStatus: 'loggedOut',
      hasOnboarded: false,
      scanLoginOpen: false,
      activeTab: 'chat',
      overlays: [],
      chatMode: 'workmate',
      models: MODELS,
      ...initialSeed,
      toasts: [],
      confirmDialog: null,
      _hydrated: false,

      setLang: (l) => {
        setSeedLang(l)
        // demo content is generated per-language; switching re-seeds it so every
        // screen reads in the selected language (resets the showcase, not prefs).
        set({
          lang: l,
          ...freshSeedSlices(l),
          chatMode: 'workmate',
          overlays: [],
          activeConversationId: undefined,
        })
      },
      setTheme: (t) => set({ theme: t }),
      setThemeMode: (m) => set({ themeMode: m, theme: m === 'system' ? systemTheme() : m }),

      login: () =>
        set((s) => ({ authStatus: s.hasOnboarded ? 'ready' : 'onboarding', scanLoginOpen: false })),
      setScanLogin: (open) => set({ scanLoginOpen: open }),
      completeOnboarding: () => set({ hasOnboarded: true, authStatus: 'ready' }),
      logout: () =>
        set({ authStatus: 'loggedOut', overlays: [], activeTab: 'chat', scanLoginOpen: false }),
      updateAccount: (patch) => set((s) => ({ account: { ...s.account, ...patch } })),

      setTab: (t) => set({ activeTab: t }),
      push: (name, params) =>
        set((s) => ({ overlays: [...s.overlays, { key: uid('ov_'), name, params }] })),
      pop: () => set((s) => ({ overlays: s.overlays.slice(0, -1) })),
      popAllOverlays: () => set({ overlays: [] }),

      toast: (message, kind = 'info') => {
        const id = uid('t_')
        set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
        }, 2600)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      askConfirm: (d) => set({ confirmDialog: d }),
      closeConfirm: () => set({ confirmDialog: null }),

      setChatMode: (m) => set({ chatMode: m }),
      setJumpTo: (id) => set({ jumpToMessageId: id }),
      clearJumpTo: () => set({ jumpToMessageId: undefined }),

      mutateMessages: (target, updater) =>
        set((s) => {
          if (target.mode === 'workmate') {
            return { workmateMessages: updater(s.workmateMessages) }
          }
          return {
            conversations: s.conversations.map((c) =>
              c.id === target.conversationId
                ? { ...c, messages: updater(c.messages), updatedAt: Date.now() }
                : c,
            ),
          }
        }),
      appendMessage: (target, msg) => get().mutateMessages(target, (arr) => [...arr, msg]),
      patchMessage: (target, id, patch) =>
        get().mutateMessages(target, (arr) =>
          arr.map((m) =>
            m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m,
          ),
        ),

      setActiveConversation: (id) => set({ activeConversationId: id }),
      newConversation: (projectId) => {
        const id = uid('conv_')
        const conv: Conversation = {
          id,
          title: translate(get().lang, 'chat.session.newTitle'),
          projectId,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ conversations: [conv, ...s.conversations], activeConversationId: id }))
        return id
      },
      renameConversation: (id, title) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        })),
      deleteConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeConversationId: s.activeConversationId === id ? undefined : s.activeConversationId,
        })),
      moveConversation: (id, projectId) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, projectId } : c)),
        })),
      newProject: (name) => {
        const id = uid('proj_')
        set((s) => ({ projects: [...s.projects, { id, name, createdAt: Date.now() }] }))
        return id
      },
      renameProject: (id, name) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) })),
      deleteProject: (id, deleteConversations) =>
        set((s) => {
          let conversations = s.conversations
          let activeConversationId = s.activeConversationId
          if (deleteConversations) {
            const removed = new Set(conversations.filter((c) => c.projectId === id).map((c) => c.id))
            conversations = conversations.filter((c) => !removed.has(c.id))
            if (activeConversationId && removed.has(activeConversationId)) activeConversationId = undefined
          } else {
            conversations = conversations.map((c) => (c.projectId === id ? { ...c, projectId: undefined } : c))
          }
          return { projects: s.projects.filter((p) => p.id !== id), conversations, activeConversationId }
        }),

      setPersona: (patch) => set((s) => ({ persona: { ...s.persona, ...patch } })),
      setModel: (modelId) => set((s) => ({ persona: { ...s.persona, modelId } })),
      setActiveAgent: (id) => {
        const agent = get().agents.find((a) => a.id === id)
        if (!agent) return
        set({ activeAgentId: id })
        get().toast(translate(get().lang, 'agent.switched', { name: agent.name }), 'success')
      },

      addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications] })),
      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      resolveApproval: (id, status, validity, customDays) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id
              ? {
                  ...n,
                  approvalStatus: status,
                  validity,
                  customValidityDays: customDays,
                  resolvedAt: Date.now(),
                  read: true,
                }
              : n,
          ),
        })),

      createTaskFromChat: (input) => {
        const now = Date.now()
        const task: ScheduledTask = {
          id: uid('task_'),
          name: input.name,
          instruction: input.instruction,
          schedule: input.schedule,
          status: 'idle',
          paused: false,
          source: 'chat',
          sourceLabel: input.sourceLabel || 'Workmate 对话',
          capabilities: input.capabilities,
          mcpServerNames: input.mcpServerNames || [],
          createdAt: now,
          nextRunAt: computeNextRun(input.schedule, now),
          runs: [],
        }
        const lang = get().lang
        const notif: AppNotification = {
          id: uid('ntf_'),
          type: 'task_status',
          createdAt: now,
          read: false,
          // structured + status-stable: name only; "created" lives in the pill (taskStatusKind)
          title: translate(lang, 'notif.t.task', { name: task.name }),
          body: translate(lang, 'tasks.notif.createdBody', {
            schedule: lang === 'zh' ? task.schedule.humanZh : task.schedule.humanEn,
          }),
          taskStatusKind: 'created',
          relatedTaskId: task.id,
        }
        set((s) => ({ tasks: [task, ...s.tasks], notifications: [notif, ...s.notifications] }))
        return task
      },
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      saveTaskEdit: (id, input) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  name: input.name,
                  instruction: input.instruction,
                  schedule: input.schedule,
                  nextRunAt: t.paused ? undefined : computeNextRun(input.schedule, Date.now()),
                }
              : t,
          ),
        })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      togglePauseTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t
            const paused = !t.paused
            return {
              ...t,
              paused,
              status: paused ? 'paused' : 'idle',
              nextRunAt: paused ? undefined : computeNextRun(t.schedule, Date.now()),
            }
          }),
        })),

      runTaskNow: (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task || task.status === 'running') return
        const now = Date.now()
        const runId = uid('run_')
        // mark running
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'running',
                  runs: [{ id: runId, status: 'running', startedAt: now }, ...t.runs],
                }
              : t,
          ),
        }))

        setTimeout(() => {
          const lang = get().lang
          const cur = get().tasks.find((t) => t.id === id)
          if (!cur) return
          const result = makeRunResult(cur)
          const convId = uid('conv_')
          const triggeredAt = Date.now()
          const conv: Conversation = {
            id: convId,
            title: `${cur.name} · ${translate(lang, 'tasks.run.success')}`,
            messages: [
              {
                id: uid('m_'),
                role: 'assistant',
                status: 'done',
                createdAt: triggeredAt,
                thinking: result.thinking,
                toolCalls: result.toolCalls,
                text: result.text,
              },
            ],
            createdAt: triggeredAt,
            updatedAt: triggeredAt,
            sourceTaskId: cur.id,
            sourceRunId: runId,
            sourceTriggeredAt: triggeredAt,
          }
          const notif: AppNotification = {
            id: uid('ntf_'),
            type: 'task_status',
            createdAt: Date.now(),
            read: false,
            // structured + status-stable: name only; "succeeded" lives in the pill (taskStatusKind)
            title: translate(lang, 'notif.t.task', { name: cur.name }),
            body: result.summary,
            taskStatusKind: 'completed',
            relatedTaskId: cur.id,
            relatedRunId: runId,
          }
          set((s) => ({
            conversations: [conv, ...s.conversations],
            notifications: [notif, ...s.notifications],
            tasks: s.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    // a manual run never un-pauses a paused task; it stays paused
                    status: t.paused ? 'paused' : 'success',
                    lastRunAt: triggeredAt,
                    runs: t.runs.map((r) =>
                      r.id === runId
                        ? {
                            ...r,
                            status: 'success',
                            durationMs: triggeredAt - now,
                            resultSummary: result.summary,
                            conversationId: convId,
                          }
                        : r,
                    ),
                  }
                : t,
            ),
          }))
          get().toast(translate(lang, 'tasks.run.successToast'), 'success')
        }, 2600)
      },

      createRecording: (input) => {
        const m: Meeting = {
          id: uid('meet_'),
          title: input.title,
          createdAt: Date.now(),
          durationMs: input.durationMs,
          status: 'pending',
          source: input.source,
        }
        set((s) => ({ meetings: [m, ...s.meetings] }))
        // created WITHOUT uploadStatus, then upload kicks in (pre-setting 'uploading'
        // here would trip uploadMeeting's re-entry guard and stall at 0%)
        get().uploadMeeting(m.id)
        return m
      },

      // Simulated cloud upload — runs right after save/import, and serves as the
      // detail-page retry. Quiet on success (the list pill is the only feedback).
      uploadMeeting: (id) => {
        const m = get().meetings.find((x) => x.id === id)
        if (!m || m.uploadStatus === 'uploading' || m.status === 'done') return
        set((s) => ({
          meetings: s.meetings.map((x) =>
            x.id === id
              ? { ...x, uploadStatus: 'uploading', uploadProgress: 4, uploadFailReason: undefined }
              : x,
          ),
        }))
        const steps = 14
        let step = 0
        const tick = () => {
          step += 1
          const cur = get().meetings.find((x) => x.id === id)
          // delete / interrupt-reset cancels the ticker naturally
          if (!cur || cur.uploadStatus !== 'uploading') return
          if (step < steps) {
            const progress = Math.min(97, Math.round((step / steps) * 100))
            set((s) => ({
              meetings: s.meetings.map((x) =>
                x.id === id && x.uploadStatus === 'uploading' ? { ...x, uploadProgress: progress } : x,
              ),
            }))
            setTimeout(tick, 320)
          } else {
            // uploaded: clear the upload fields entirely (absent = uploaded)
            set((s) => ({
              meetings: s.meetings.map((x) =>
                x.id === id ? { ...x, uploadStatus: undefined, uploadProgress: undefined } : x,
              ),
            }))
          }
        }
        setTimeout(tick, 320)
      },

      renameMeeting: (id, title) =>
        set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? { ...m, title } : m)) })),
      deleteMeeting: (id) => set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),

      transcribeMeeting: (id, opts) => {
        const m = get().meetings.find((x) => x.id === id)
        // gated until the upload stage clears (uploading or upload-failed → no transcribe)
        if (!m || m.status === 'analyzing' || m.uploadStatus) return
        const { template } = opts
        const firstRun = m.status !== 'done' // pending / failed → no usable transcript yet
        // Re-transcribe a done meeting: only the summary regenerates unless the user opted
        // to also rebuild the transcript (or, defensively, it's somehow missing).
        const summaryOnly = !firstRun && !!m.transcript && opts.regenerateTranscript !== true

        const stages = summaryOnly
          ? ['meet.analyzing.summaryOnly']
          : ['meet.analyzing.stage1', 'meet.analyzing.stage2', 'meet.analyzing.stage3', 'meet.analyzing.stage4']
        const steps = summaryOnly ? 6 : 16

        set((s) => ({
          meetings: s.meetings.map((x) =>
            x.id === id
              ? { ...x, status: 'analyzing', analyzeProgress: summaryOnly ? 8 : 4, analyzeStage: stages[0], failureReason: undefined }
              : x,
          ),
        }))
        let step = 0
        const tick = () => {
          step += 1
          const progress = Math.min(98, Math.round((step / steps) * 100))
          const stageIdx = Math.min(stages.length - 1, Math.floor((step / steps) * stages.length))
          if (step < steps) {
            set((s) => ({
              meetings: s.meetings.map((x) =>
                x.id === id && x.status === 'analyzing'
                  ? { ...x, analyzeProgress: progress, analyzeStage: stages[stageIdx] }
                  : x,
              ),
            }))
            setTimeout(tick, 360)
          } else {
            const cur = get().meetings.find((x) => x.id === id)
            if (!cur || cur.status !== 'analyzing') return
            const note = opts.note?.trim() || undefined
            const summary = summaryForTemplate(template, cur, note)
            // keep the transcript only on a summary-only run that still has one
            const transcript = summaryOnly && cur.transcript ? cur.transcript : analysisFor(cur).transcript
            set((s) => ({
              meetings: s.meetings.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      status: 'done',
                      analyzeProgress: 100,
                      analyzeStage: undefined,
                      transcript,
                      summaryMarkdown: summary,
                      template,
                      summaryNote: note,
                      summaryUpdatedAt: Date.now(),
                    }
                  : x,
              ),
            }))
            const toastKey = firstRun
              ? 'meet.status.done'
              : summaryOnly
                ? 'meet.retranscribe.summaryUpdated'
                : 'meet.retranscribe.bothUpdated'
            get().toast(translate(get().lang, toastKey), 'success')
          }
        }
        setTimeout(tick, 360)
      },

      authorizeMcp: (id) =>
        set((s) => ({
          mcpServers: s.mcpServers.map((m) => (m.id === id ? { ...m, authorized: true } : m)),
        })),
      setMcpEnabled: (id, enabled) =>
        set((s) => ({
          mcpServers: s.mcpServers.map((m) => (m.id === id ? { ...m, enabled } : m)),
        })),
      toggleSkill: (id) =>
        set((s) => ({
          skills: s.skills.map((sk) => (sk.id === id ? { ...sk, enabled: !sk.enabled } : sk)),
        })),
      addMemory: (text) =>
        set((s) => ({ memories: [{ id: uid('mem_'), text, createdAt: Date.now() }, ...s.memories] })),
      deleteMemory: (id) =>
        set((s) => ({ memories: s.memories.map((m) => (m.id === id ? { ...m, deletedAt: Date.now() } : m)) })),
      restoreMemory: (id) =>
        set((s) => ({
          memories: s.memories.map((m) => (m.id === id ? { ...m, deletedAt: undefined } : m)),
        })),
      purgeMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
      setComposeDraft: (text) => set({ composeDraft: text }),
      clearComposeDraft: () => set({ composeDraft: undefined }),
      setComposeQuote: (q) => set({ composeQuote: q }),
      clearComposeQuote: () => set({ composeQuote: undefined }),
      quoteRunInChat: (taskId, runId) => {
        const s = get()
        const task = s.tasks.find((t) => t.id === taskId)
        const run = task?.runs.find((r) => r.id === runId)
        if (!task || !run || run.status === 'running') return // an in-progress run has no result to quote
        // full result text lives on the conversation the run produced (if any)
        const conv =
          s.conversations.find((c) => c.id === run.conversationId) ||
          s.conversations.find((c) => c.sourceRunId === run.id)
        const resultText = conv?.messages.find((m) => m.role === 'assistant')?.text
        const summary =
          run.resultSummary ||
          run.failureReason ||
          (resultText ? resultText.split('\n')[0] : translate(s.lang, 'tasks.run.success'))
        const ref: TaskRunRef = {
          taskId,
          runId,
          taskName: task.name,
          status: run.status,
          startedAt: run.startedAt,
          summary,
          resultText,
        }
        // mirror addViaChat: stash the quote + jump to the Workmate composer
        set({ composeQuote: ref, chatMode: 'workmate', activeTab: 'chat', overlays: [] })
      },

      resetDemo: () =>
        set({
          ...freshSeedSlices(),
          chatMode: 'workmate',
          overlays: [],
          toasts: [],
          confirmDialog: null,
        }),
    }),
    {
      name: 'cortex-workmate-v1',
      version: 6,
      // v2: scheduled-task showcase seed changed (OKR weekly report + multi-weekday).
      // v3: every run now has a linked result/failure conversation (so 打开对话 shows on
      // every run row). Both bumps re-seed the task graph by dropping only those slices
      // (tasks ↔ conversations ↔ notifications ↔ projects share generated ids) so they
      // stay cross-consistent. Everything else (Workmate chat, meetings, memories,
      // persona, prefs) is kept; any stale taskCreatedId/relatedTaskId in preserved data
      // degrades gracefully (TaskCreatedCard / source banners render nothing when absent).
      // v4: scheduled-task showcase expanded to 5 tasks covering all trigger modes
      // (daily / interval+startAt / weekly-Sunday / specific-dates / weekly-MWF), so the
      // task graph is re-seeded again (same drop set keeps task↔conv↔notif↔project consistent).
      migrate: (persisted, version) => {
        const p = persisted as Record<string, unknown>
        if (p && version < 4) {
          for (const k of ['tasks', 'conversations', 'notifications', 'projects']) {
            delete p[k]
          }
        }
        // v5: ship the Workmate mascot as the default persona avatar.
        if (p && version < 5 && p.persona && typeof p.persona === 'object') {
          ;(p.persona as Record<string, unknown>).avatarImage = '/workmate-avatar.png'
        }
        // v6: demo content is now bilingual & language-aware. Re-seed every demo slice
        // in the persisted language so existing (Chinese-only) installs switch correctly.
        if (p && version < 6) {
          const lang = (p.lang as Lang) || 'en'
          setSeedLang(lang)
          Object.assign(p, freshSeedSlices(lang))
        }
        return persisted
      },
      partialize: (s) => ({
        lang: s.lang,
        theme: s.theme,
        themeMode: s.themeMode,
        authStatus: s.authStatus === 'onboarding' ? 'loggedOut' : s.authStatus,
        hasOnboarded: s.hasOnboarded,
        account: s.account,
        activeTab: s.activeTab,
        chatMode: s.chatMode,
        persona: s.persona,
        activeAgentId: s.activeAgentId, // only the selection; the agent catalog is always from seed
        models: s.models,
        workmateMessages: s.workmateMessages,
        projects: s.projects,
        conversations: s.conversations,
        notifications: s.notifications,
        tasks: s.tasks,
        meetings: s.meetings,
        mcpServers: s.mcpServers,
        memories: s.memories,
        skills: s.skills,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // keep the seed language in sync with the restored preference so runtime
        // demo content (meeting transcribe, mcp rebuild) localizes correctly.
        setSeedLang(state.lang)
        // Sanitize anything left mid-flight by a refresh.
        const fixMsgs = (arr: Message[]) =>
          arr.map((m) =>
            m.status === 'streaming' || m.status === 'thinking'
              ? { ...m, status: 'stopped' as const }
              : m,
          )
        state.workmateMessages = fixMsgs(state.workmateMessages || [])
        state.conversations = (state.conversations || []).map((c) => ({
          ...c,
          messages: fixMsgs(c.messages),
        }))
        const CAP_MCP: Record<string, string> = { github: 'GitHub', calendar: 'Google Calendar', slack: 'Slack', notion: 'Notion', jira: 'Jira' }
        state.tasks = (state.tasks || []).map((t) => {
          let nt = t
          if (t.status === 'running') {
            nt = {
              ...nt,
              status: nt.paused ? 'paused' : 'idle',
              runs: nt.runs.map((r) => (r.status === 'running' ? { ...r, status: 'failed' as const, failureReason: '已中断' } : r)),
            }
          }
          // backfill mcpServerNames for tasks persisted before the field existed
          if (nt.mcpServerNames == null) {
            nt = { ...nt, mcpServerNames: (nt.capabilities || []).map((c) => CAP_MCP[c]).filter(Boolean) }
          }
          // recompute next-run so it's always a future time (stored value goes stale)
          nt = { ...nt, nextRunAt: computeNextRun(nt.schedule, Date.now()) }
          return nt
        })
        state.meetings = (state.meetings || []).map((m) => {
          let nm = m
          if (nm.status === 'analyzing') {
            nm = {
              ...nm,
              // a refresh aborts the in-flight analyze. If the meeting already had content
              // (a re-transcribe of a done meeting), fall back to 'done' so its intact
              // transcript/summary stay visible — only a genuine first-run reverts to 'pending'.
              status: nm.transcript || nm.summaryMarkdown ? ('done' as const) : ('pending' as const),
              analyzeProgress: undefined,
              analyzeStage: undefined,
            }
          }
          // a refresh also aborts an in-flight upload → surface as a retryable failure
          if (nm.uploadStatus === 'uploading') {
            nm = {
              ...nm,
              uploadStatus: 'failed' as const,
              uploadProgress: undefined,
              uploadFailReason: 'meet.upload.interrupted',
            }
          }
          return nm
        })
        // Re-seed the MCP catalog (logo/about/tools/publisher/auth) from the latest
        // seed while preserving the user's connect state by name — persisted servers
        // predate these fields, so a plain merge would leave logos/tools missing.
        const fresh = freshSeedSlices(state.lang)
        const prevMcp = (state.mcpServers as McpServer[] | undefined) || []
        state.mcpServers = fresh.mcpServers.map((f) => {
          const prev = prevMcp.find((p) => p.name === f.name)
          return prev ? { ...f, authorized: prev.authorized, enabled: prev.enabled } : f
        })
        // Agents: the catalog is never persisted — always rebuild from seed, and keep the
        // persisted selection only if it still points at a real agent (else fall back).
        state.agents = fresh.agents
        if (!state.agents.some((a) => a.id === state.activeAgentId)) state.activeAgentId = fresh.activeAgentId
        // backfill the account id for users persisted before the profile center existed
        if (state.account && !state.account.id) state.account = { ...state.account, id: fresh.account.id }
        // theme: backfill themeMode for pre-existing users, then resolve 'system' to the
        // current OS scheme so the first paint is correct (no flash).
        if (state.themeMode == null) state.themeMode = state.theme ?? 'light'
        if (state.themeMode === 'system') state.theme = systemTheme()
        state.overlays = []
        state.toasts = []
        state.confirmDialog = null
        state._hydrated = true
      },
    },
  ),
)

// Result content for a "run now" execution, varied by capability.
function makeRunResult(task: ScheduledTask): {
  thinking: string
  toolCalls: Message['toolCalls']
  text: string
  summary: string
} {
  if (task.capabilities.includes('github')) {
    return {
      thinking: '拉取仓库内 open 状态的 PR，按停留时长和优先级排序。',
      toolCalls: [
        {
          id: uid('tc_'),
          tool: 'github',
          title: '读取 GitHub Pull Requests',
          status: 'success',
          fn: 'list_pull_requests',
          params: { state: 'open', sort: 'staleness', repos: ['cortex-app'] },
          result: '{\n  success: true,\n  count: 8,\n  overdue: 0\n}',
        },
      ],
      text: '**当前待审查 PR（8 条）**\n\n1. `#491 通知中心同步` · @lin · 停留 1 天\n2. `#488 会议波形优化` · @zhou · 停留 4 小时\n3. `#486 任务编辑回填` · @zhang · 停留 2 小时\n\n暂无超期 PR，整体健康。',
      summary: '汇总 8 条待审查 PR，无超期',
    }
  }
  if (task.capabilities.includes('web')) {
    return {
      thinking: '检索设定关键词，过滤近 1 小时的新增内容。',
      toolCalls: [
        {
          id: uid('tc_'),
          tool: 'web',
          title: '检索竞品关键词',
          status: 'success',
          fn: 'web_search',
          params: { keywords: ['竞品', '发布', '融资'], window: '1h' },
          result: '{\n  success: true,\n  newItems: 0\n}',
        },
      ],
      text: '本次巡检**未发现新增动态**。下次将继续监控关键词。',
      summary: '无新增动态',
    }
  }
  return {
    thinking: '执行任务并整理结果。',
    toolCalls: [
      {
        id: uid('tc_'),
        tool: 'scheduler',
        title: '执行任务',
        status: 'success',
        fn: 'run_task',
        params: { taskId: task.id },
        result: '{\n  success: true\n}',
      },
    ],
    text: '任务已执行完成，结果已整理。',
    summary: '任务已执行完成',
  }
}
