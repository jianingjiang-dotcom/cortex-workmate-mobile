// ============================================================================
// Mock "AI engine": intent detection, natural-language schedule parsing,
// typewriter streaming, tool-call cards, task creation, and approval flow.
// All scripted — no real model. Drives cross-module linkages.
// ============================================================================

import { useStore, type MessageTarget } from '../store/useStore'
import type { AppNotification, Schedule, TaskRunRef, ToolCallCard } from './types'
import { sleep, uid } from './util'
import { WEEKDAYS_EN, WEEKDAYS_ZH } from './time'

const aborted = new Set<string>()
export function abortMessage(id: string) {
  aborted.add(id)
}
const isAborted = (id: string) => aborted.has(id)

function L<T>(zh: T, en: T): T {
  return useStore.getState().lang === 'zh' ? zh : en
}

// ---- Schedule parsing ------------------------------------------------------

const SCHEDULE_KW = /每天|每日|每周|每隔|每\s*\d|定时|提醒我|每个?小时|each day|every\s*day|every\s*\d|daily|weekly|hourly|remind me/i

function parseTime(text: string): { h: number; m: number } | null {
  let m = text.match(/(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (m) return { h: +m[1] % 24, m: +m[2] % 60 }
  m = text.match(/([上下]午|早上|晚上|中午|凌晨)?\s*(\d{1,2})\s*[点點時时]/)
  if (m) {
    let h = +m[2]
    const part = m[1]
    if ((part === '下午' || part === '晚上') && h < 12) h += 12
    if (part === '中午') h = 12
    return { h: h % 24, m: 0 }
  }
  m = text.match(/(\d{1,2})\s*(am|pm)/i)
  if (m) {
    let h = +m[1]
    if (/pm/i.test(m[2]) && h < 12) h += 12
    if (/am/i.test(m[2]) && h === 12) h = 0
    return { h: h % 24, m: 0 }
  }
  return null
}

const CN_WD: Record<string, number> = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }
const EN_WD: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }

function hhmm(h: number, m: number) {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export interface ScheduleParse {
  intent: boolean
  schedule?: Schedule
}

export function parseSchedule(text: string): ScheduleParse {
  const intent = SCHEDULE_KW.test(text)
  if (!intent) return { intent: false }

  // interval, e.g. 每 30 分钟 / every 2 hours
  let m = text.match(/每\s*(\d+)\s*(分钟|分|小时|个小时)|every\s*(\d+)\s*(minutes?|mins?|hours?)/i)
  if (m) {
    const n = +(m[1] || m[3])
    const unit = m[2] || m[4]
    const isHour = /小时|hour/i.test(unit)
    const mins = isHour ? n * 60 : n
    return {
      intent: true,
      schedule: {
        kind: 'interval',
        intervalMinutes: mins,
        humanZh: isHour ? `每 ${n} 小时` : `每 ${n} 分钟`,
        humanEn: isHour ? `Every ${n} hour${n > 1 ? 's' : ''}` : `Every ${n} minute${n > 1 ? 's' : ''}`,
      },
    }
  }

  const time = parseTime(text) || { h: 9, m: 0 }
  const clock = hhmm(time.h, time.m)

  // weekly
  m = text.match(/每周\s*([日天一二三四五六])|every\s*(sun|mon|tue|wed|thu|fri|sat)/i)
  if (m) {
    const wd = m[1] ? CN_WD[m[1]] : EN_WD[(m[2] || '').toLowerCase()]
    return {
      intent: true,
      schedule: {
        kind: 'weekly',
        weekday: wd,
        weekdays: [wd],
        timeOfDay: clock,
        humanZh: `每${WEEKDAYS_ZH[wd]} ${clock}`,
        humanEn: `Every ${WEEKDAYS_EN[wd]} at ${clock}`,
      },
    }
  }

  // daily
  if (/每天|每日|each day|every\s*day|daily/i.test(text) || parseTime(text)) {
    return {
      intent: true,
      schedule: {
        kind: 'daily',
        timeOfDay: clock,
        humanZh: `每天 ${clock}`,
        humanEn: `Every day at ${clock}`,
      },
    }
  }

  return { intent: true } // scheduling intent but no parseable time → clarify
}

function deriveTaskName(text: string): string {
  if (/github|pr|pull request/i.test(text)) return L('整理 GitHub PR', 'Tidy GitHub PRs')
  if (/日历|日程|calendar|schedule/i.test(text)) return L('日历汇总', 'Calendar digest')
  if (/周报|weekly report/i.test(text)) return L('周报提醒', 'Weekly report reminder')
  if (/竞品|巡检|监控|monitor|competitor/i.test(text)) return L('竞品巡检', 'Competitor watch')
  if (/邮件|email|inbox/i.test(text)) return L('邮件汇总', 'Email digest')
  if (/新闻|news|资讯/i.test(text)) return L('每日资讯', 'Daily news')
  return L('定时任务', 'Scheduled task')
}

function deriveCapabilities(text: string): string[] {
  const caps: string[] = []
  if (/github|pr|pull request|代码|repo|codebase/i.test(text)) caps.push('github')
  if (/日历|日程|calendar/i.test(text)) caps.push('calendar')
  if (/邮件|email|inbox/i.test(text)) caps.push('email')
  if (/竞品|巡检|监控|检索|搜索|新闻|news|web|search/i.test(text)) caps.push('web')
  return caps.length ? caps : ['scheduler']
}

// Which MCP servers (by name) a chat-created task will rely on.
function deriveMcpServers(text: string): string[] {
  const out: string[] = []
  if (/github|pull request|\bpr\b/i.test(text)) out.push('GitHub')
  if (/slack/i.test(text)) out.push('Slack')
  if (/jira/i.test(text)) out.push('Jira')
  if (/notion/i.test(text)) out.push('Notion')
  if (/飞书|lark/i.test(text)) out.push('飞书 Lark')
  if (/日历|日程|calendar/i.test(text)) out.push('Google Calendar')
  if (/google\s*docs|谷歌文档/i.test(text)) out.push('Google Docs')
  return out
}

// ---- Approval detection ----------------------------------------------------

const APPROVAL_KW = /日历|日程|calendar|邮件|email|inbox|代码库|codebase|repo|访问我的|连接|connect|read my/i

interface ApprovalSpec {
  tool: string
  titleZh: string
  titleEn: string
  purposeZh: string
  purposeEn: string
  scopesZh: string[]
  scopesEn: string[]
  resultZh: string
  resultEn: string
}

function approvalSpecFor(text: string): ApprovalSpec | null {
  if (/日历|日程|calendar/i.test(text))
    return {
      tool: 'calendar',
      titleZh: '访问日历',
      titleEn: 'Access calendar',
      purposeZh: '读取你的日历事件，以便汇总今日安排并提醒冲突。',
      purposeEn: 'Read your calendar events to summarize today and flag conflicts.',
      scopesZh: ['日历：只读', '当天及未来 7 天的事件'],
      scopesEn: ['Calendar: read-only', 'Events for today + next 7 days'],
      resultZh: '已获授权。今天有 3 个事件：\n\n- **10:00** 产品评审\n- **14:00** 用户访谈\n- **16:30** 1:1 周会\n\n14:00 与 16:30 间隔较紧，注意衔接。',
      resultEn: 'Authorized. You have 3 events today:\n\n- **10:00** Product review\n- **14:00** User interview\n- **16:30** 1:1\n\nThe gap between 14:00 and 16:30 is tight — mind the handoff.',
    }
  if (/邮件|email|inbox/i.test(text))
    return {
      tool: 'email',
      titleZh: '访问邮箱',
      titleEn: 'Access email',
      purposeZh: '读取你最近的邮件，以便汇总重点与待回复。',
      purposeEn: 'Read your recent emails to summarize highlights and pending replies.',
      scopesZh: ['邮件：只读', '最近 24 小时'],
      scopesEn: ['Email: read-only', 'Last 24 hours'],
      resultZh: '已获授权。最近有 2 封需要回复的邮件，已为你标记。',
      resultEn: 'Authorized. 2 emails need a reply — flagged for you.',
    }
  if (/代码库|codebase|repo|github/i.test(text))
    return {
      tool: 'github',
      titleZh: '访问代码库',
      titleEn: 'Access codebase',
      purposeZh: '读取仓库内容以便检索与分析代码。',
      purposeEn: 'Read repository contents to search and analyze code.',
      scopesZh: ['代码库：只读', '指定仓库'],
      scopesEn: ['Codebase: read-only', 'Selected repositories'],
      resultZh: '已获授权，已连接代码库，可以开始检索。',
      resultEn: 'Authorized and connected. Ready to search the codebase.',
    }
  return null
}

// ---- Streaming helpers -----------------------------------------------------

const store = () => useStore.getState()

async function typeThinking(target: MessageTarget, id: string, text: string) {
  store().patchMessage(target, id, { thinking: text, status: 'thinking' })
  await sleep(500)
}

async function runToolCall(
  target: MessageTarget,
  id: string,
  base: Omit<ToolCallCard, 'status' | 'result'>,
  result: string,
  finalStatus: ToolCallCard['status'] = 'success',
) {
  // show "calling…" first
  store().patchMessage(target, id, (m) => ({
    toolCalls: [...(m.toolCalls || []), { ...base, status: 'running' as const }],
  }))
  await sleep(1100)
  if (isAborted(id)) return base.id
  store().patchMessage(target, id, (m) => ({
    toolCalls: (m.toolCalls || []).map((tc) => (tc.id === base.id ? { ...tc, status: finalStatus, result } : tc)),
  }))
  return base.id
}

async function streamText(target: MessageTarget, id: string, full: string) {
  const step = 2
  for (let i = 0; i < full.length; i += step) {
    if (isAborted(id)) {
      store().patchMessage(target, id, { text: full.slice(0, i), status: 'stopped' })
      return false
    }
    store().patchMessage(target, id, { text: full.slice(0, i + step), status: 'streaming' })
    await sleep(15)
  }
  store().patchMessage(target, id, { text: full, status: 'done' })
  return true
}

// ---- General canned answers ------------------------------------------------

function generalAnswer(text: string): { thinking: string; answer: string } {
  if (/总结|概括|summary|summarize|三点|3\s*点|three points/i.test(text)) {
    return {
      thinking: L('提炼要点，控制在三条以内。', 'Distill to at most three key points.'),
      answer: L(
        '帮你总结为三点：\n\n1. **核心**：聚焦一个主目标，避免分散。\n2. **节奏**：小步快跑，定期回顾与调整。\n3. **协作**：明确分工与验收标准，减少返工。\n\n需要我展开其中某一点吗？',
        "Here are three points:\n\n1. **Core**: focus on one main goal, avoid spreading thin.\n2. **Cadence**: ship in small steps, review and adjust regularly.\n3. **Collaboration**: clarify ownership and acceptance criteria to cut rework.\n\nWant me to expand on any of these?",
      ),
    }
  }
  if (/润色|改写|polish|rewrite|professional|专业/i.test(text)) {
    return {
      thinking: L('保持原意，调整语气更正式简洁。', 'Keep the meaning, make the tone more concise and formal.'),
      answer: L(
        '润色后的版本：\n\n> 我们已完成移动端原型的核心框架，跑通了对话与定时任务的主链路；下一阶段将补齐会议模块并进入联调。\n\n如需更口语或更正式，我可以再调。',
        'Polished version:\n\n> We have completed the core framework of the mobile prototype and validated the main flows for chat and scheduled tasks; next we will finish the meetings module and begin integration.\n\nI can make it more casual or more formal if you like.',
      ),
    }
  }
  if (/你好|您好|hi|hello|在吗|hey/i.test(text)) {
    return {
      thinking: L('打个招呼，给出可做的事。', 'Greet and offer next steps.'),
      answer: L(
        '你好！我可以帮你**定时执行重复事项**、**整理会议纪要**，或直接回答问题。试着对我说「每天 9 点整理 GitHub PR」看看？',
        'Hi! I can run **recurring tasks**, turn **meetings into notes**, or just answer questions. Try saying "Tidy my GitHub PRs at 9am every day".',
      ),
    }
  }
  return {
    thinking: L('理解需求，给出结构化回答。', 'Understand the request and answer with structure.'),
    answer: L(
      '明白。基于你的描述，我的建议是：\n\n- **先理清目标**：想达成的结果是什么。\n- **再拆解步骤**：分成可执行的小任务。\n- **设好检查点**：便于回顾与调整。\n\n如果这是件会重复发生的事，你也可以让我「定时」来做 —— 例如「每天 9 点…」。',
      "Got it. Based on what you described, here's my take:\n\n- **Clarify the goal**: what outcome you want.\n- **Break it down**: into small, doable steps.\n- **Set checkpoints**: to review and adjust.\n\nIf this recurs, you can have me do it on a **schedule** — e.g. \"every day at 9am…\".",
    ),
  }
}

// Long, template-style result for the OKR demo (renders multi-line → "show more")
const OKR_TEMPLATE_RESULT = `{
  success: true,
  content: "**周期：** YYYY年MM月 – MM月

**制定人：** @owner

**适用范围：** xx Department / xx Team / Individual

**部门半年工作规划：** <!-- 从父战略文档摘录 1-2 行；frontmatter 中已有 parent 引用 -->

## Objectives

### O1：<Objective 标题>

- **Background:** <!-- replace -->

### KR1: [待填写] @contributor

### KR2: [待填写] @contributor"
}`

// ---- Save-to-memory intent -------------------------------------------------

const MEMORY_KW = /保存.*记忆|记忆\s*[:：]|帮我记住|记住\s*[:：]|save[\s\S]*memory|remember\s*[:：]/i

function extractMemoryContent(text: string): string {
  const m = text.match(/(?:记忆|memory)\s*[:：]\s*([\s\S]+)/i)
  if (m) return m[1].trim()
  const m2 = text.match(/(?:帮我记住|记住|remember(?:\s+that)?)\s*[:：]?\s*([\s\S]+)/i)
  if (m2) return m2[1].trim()
  return ''
}

// ---- MCP connect intent ----------------------------------------------------
// The request mentions a tool whose MCP server isn't connected yet → Workmate
// replies with an inline connect card (rendered from Message.mcpRequestId).

const MCP_TRIGGERS: { re: RegExp; name: string }[] = [
  { re: /slack/i, name: 'Slack' },
  { re: /jira/i, name: 'Jira' },
  { re: /notion/i, name: 'Notion' },
  { re: /飞书|lark/i, name: '飞书 Lark' },
]

// ---- Main generation -------------------------------------------------------

// Contextual mock answer for a follow-up question about a quoted scheduled-task run.
// Render the quoted run's result as a blockquote — prefer the full result text
// (from the linked conversation) over the one-line summary, clipped for chat.
function quoteExcerpt(run: TaskRunRef): string {
  const raw = (run.resultText || run.summary || '').trim()
  const max = 240
  const clipped = raw.length > max ? raw.slice(0, max).trimEnd() + '…' : raw
  return clipped
    .split('\n')
    .map((l) => (l.trim() ? `> ${l}` : '>'))
    .join('\n')
}

function quotedRunAnswer(run: TaskRunRef, userText: string): string {
  const q = userText.trim()
  const block = quoteExcerpt(run)
  if (run.status === 'failed') {
    return L(
      `关于「${run.taskName}」那次失败的执行：\n\n${block}\n\n${q ? `针对你的问题「${q}」：\n\n` : ''}这类失败通常是临时性的（如授权过期或网络超时）。建议：\n1. 检查任务依赖的连接 / 授权是否仍然有效；\n2. 在任务详情页点「立即运行」重试一次；\n3. 若仍失败，可微调任务指令后再试。\n\n需要我帮你重跑或进一步排查吗？`,
      `About the failed run of "${run.taskName}":\n\n${block}\n\n${q ? `Regarding "${q}":\n\n` : ''}Failures like this are usually transient (expired auth or a network timeout). Suggestions:\n1. Verify the task's connections / authorizations are still valid;\n2. Hit "Run now" on the task detail page to retry;\n3. If it still fails, tweak the instruction and try again.\n\nWant me to re-run or dig deeper?`,
    )
  }
  return L(
    `基于「${run.taskName}」这次执行的结果：\n\n${block}\n\n${q ? `针对你的问题「${q}」，我的分析是：\n\n` : ''}这条结果可以继续往下做：对比 / 汇总要点、整理成文档、或基于它生成下一步行动项。你想从哪个角度展开？`,
    `Based on the run of "${run.taskName}":\n\n${block}\n\n${q ? `For your question "${q}", here's my take:\n\n` : ''}We can take this result further — compare / summarize the key points, turn it into a document, or generate next-step action items from it. Which angle would you like?`,
  )
}

export async function generateAssistant(
  target: MessageTarget,
  assistantId: string,
  userText: string,
  quotedRun?: TaskRunRef,
) {
  aborted.delete(assistantId)
  const s = store()
  const conversationId = target.mode === 'normal' ? target.conversationId : undefined

  await sleep(650)
  if (isAborted(assistantId)) {
    s.patchMessage(target, assistantId, { status: 'stopped' })
    return
  }

  // 0a) Quoted scheduled-task run follow-up — referencing an execution result wins
  //     over the keyword branches (the question may mention schedule/connect words).
  if (quotedRun) {
    await typeThinking(
      target,
      assistantId,
      L(
        `回顾「${quotedRun.taskName}」这次执行的结果，再结合你的问题作答。`,
        `Reviewing the result of "${quotedRun.taskName}" to answer in context.`,
      ),
    )
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    await runToolCall(
      target,
      assistantId,
      {
        id: uid('tc_'),
        tool: 'scheduler',
        title: L('读取该次执行结果', 'Read the run result'),
        fn: 'get_run_result',
        params: { taskId: quotedRun.taskId, runId: quotedRun.runId, status: quotedRun.status },
      },
      `{\n  task: ${JSON.stringify(quotedRun.taskName)},\n  status: ${JSON.stringify(quotedRun.status)},\n  result: ${JSON.stringify((quotedRun.resultText || quotedRun.summary || '').slice(0, 300))}\n}`,
      quotedRun.status === 'failed' ? 'error' : 'success',
    )
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    await streamText(target, assistantId, quotedRunAnswer(quotedRun, userText))
    return
  }

  // 0) Save-to-memory intent (must precede scheduling — the content may contain time words)
  if (MEMORY_KW.test(userText)) {
    const content = extractMemoryContent(userText)
    await typeThinking(target, assistantId, L('提取要点并保存到你的记忆。', 'Extracting the key point and saving it to your memory.'))
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    if (!content) {
      await streamText(
        target,
        assistantId,
        L('好的，你想让我**记住什么内容**呢？把它补充在这句话后面发给我即可。', 'Sure — **what should I remember?** Just add it after the sentence and send.'),
      )
      return
    }
    await runToolCall(
      target,
      assistantId,
      {
        id: uid('tc_'),
        tool: 'memory',
        title: L('保存记忆', 'Save memory'),
        fn: 'save_memory',
        params: { content },
      },
      `{\n  success: true,\n  memory: ${JSON.stringify(content)}\n}`,
    )
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    s.addMemory(content)
    await streamText(
      target,
      assistantId,
      L(
        `✅ 已记住：「${content}」\n\n你可以在「我的 → 记忆」里查看或管理它。`,
        `✅ Got it — I'll remember: "${content}".\n\nYou can view or manage it under "Me → Memory".`,
      ),
    )
    return
  }

  // 0.5) MCP connect: the request needs a server that isn't connected yet
  const trig = MCP_TRIGGERS.find((x) => x.re.test(userText))
  if (trig) {
    const server = s.mcpServers.find((m) => m.name === trig.name)
    if (server && !server.enabled) {
      await typeThinking(target, assistantId, L(`这个操作需要先连接 ${trig.name}。`, `This needs ${trig.name} connected first.`))
      if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
      await streamText(
        target,
        assistantId,
        L(
          `要完成这个操作，需要先连接 **${trig.name}**。点下面的卡片完成授权并连接，连上后我就继续。`,
          `To do this I need **${trig.name}** connected. Authorize & connect it in the card below and I'll continue.`,
        ),
      )
      s.patchMessage(target, assistantId, { mcpRequestId: server.id })
      // mirror the in-chat connect card as a notification (oauth connection request)
      s.addNotification({
        id: uid('ntf_'),
        type: 'mcp_connect',
        createdAt: Date.now(),
        read: false,
        title: L(`连接请求 · ${server.name}`, `Connection · ${server.name}`),
        body: L(`需要连接 ${server.name} 才能继续`, `Connect ${server.name} to continue`),
        relatedServerId: server.id,
        relatedMessageId: assistantId,
        relatedMode: target.mode,
        relatedConversationId: conversationId,
      })
      return
    }
  }

  // 1) Scheduling intent
  const sched = parseSchedule(userText)
  if (sched.intent && sched.schedule) {
    await typeThinking(
      target,
      assistantId,
      L('解析触发时机与执行内容，准备创建定时任务。', 'Parsing the trigger and action to create a scheduled task.'),
    )
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    const human = L(sched.schedule.humanZh, sched.schedule.humanEn)
    const taskName = deriveTaskName(userText)
    const caps = deriveCapabilities(userText)
    await runToolCall(
      target,
      assistantId,
      {
        id: uid('tc_'),
        tool: 'scheduler',
        title: L('创建定时任务', 'Create scheduled task'),
        fn: 'create_scheduled_task',
        params: { name: taskName, schedule: human, capabilities: caps },
      },
      `{\n  success: true,\n  schedule: '${human}',\n  capabilities: ${JSON.stringify(caps)}\n}`,
    )
    const task = s.createTaskFromChat({
      name: taskName,
      instruction: userText,
      schedule: sched.schedule,
      capabilities: caps,
      mcpServerNames: deriveMcpServers(userText),
      sourceLabel: L('Workmate 对话', 'Workmate chat'),
    })
    s.patchMessage(target, assistantId, { taskCreatedId: task.id })
    const answer = L(
      `好的，已为你创建定时任务 **${task.name}**，计划 **${human}**。到点我会自动执行，并把结果作为一条对话保存、同时通知你。你可以在「助手 → 定时任务」里管理它。`,
      `Done — I created the scheduled task **${task.name}**, running **${human}**. I'll run it automatically, save each result as a chat, and notify you. Manage it under "Assistant → Scheduled Tasks".`,
    )
    await streamText(target, assistantId, answer)
    return
  }
  if (sched.intent && !sched.schedule) {
    // clarify rather than guessing
    await typeThinking(target, assistantId, L('信息不足，需要澄清触发时机。', 'Not enough detail — clarify the trigger.'))
    const answer = L(
      '好的，我可以帮你定时执行。你希望**多久执行一次、在什么时间**呢？例如「每天 9 点」「每周一上午」或「每 30 分钟」。',
      'Sure, I can run this on a schedule. **How often and at what time** would you like it? For example "every day at 9am", "every Monday morning", or "every 30 minutes".',
    )
    await streamText(target, assistantId, answer)
    return
  }

  // 2) Approval-requiring capability
  const approval = approvalSpecFor(userText)
  if (approval) {
    await typeThinking(
      target,
      assistantId,
      L(`需要访问你的${approval.titleZh.replace('访问', '')}才能继续。`, `I need access to continue.`),
    )
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    const notifId = uid('ntf_')
    const tcId = uid('tc_')
    s.patchMessage(target, assistantId, (m) => ({
      toolCalls: [
        ...(m.toolCalls || []),
        {
          id: tcId,
          tool: approval.tool,
          title: L(approval.titleZh, approval.titleEn),
          status: 'awaiting_approval',
          approvalId: notifId,
          fn: approval.tool === 'calendar' ? 'read_calendar' : approval.tool === 'email' ? 'read_email' : 'read_codebase',
          params: { scope: 'readonly', range: approval.tool === 'calendar' ? 'today..+7d' : 'recent' },
        },
      ],
    }))
    const capLabel = L(
      approval.tool === 'calendar' ? '日历' : approval.tool === 'email' ? '邮件' : '代码库',
      approval.tool === 'calendar' ? 'Calendar' : approval.tool === 'email' ? 'Email' : 'Codebase',
    )
    const notif: AppNotification = {
      id: notifId,
      type: 'approval',
      createdAt: Date.now(),
      read: false,
      // structured + status-stable: capability only, never the verb/status
      title: L(`授权请求 · ${capLabel}`, `Authorization · ${capLabel}`),
      requester: 'Workmate',
      purpose: L(approval.purposeZh, approval.purposeEn),
      scopes: L(approval.scopesZh, approval.scopesEn),
      tool: approval.tool,
      approvalStatus: 'pending',
      relatedMessageId: assistantId,
      relatedMode: target.mode,
      relatedConversationId: conversationId,
    }
    s.addNotification(notif)
    const answer = L(
      '这个操作需要你的授权。我已发起申请，你可以在**下方卡片**或**通知中心**选择授权有效期并同意，我就继续。',
      'This action needs your approval. I\'ve sent a request — approve it below or in the **Notification Center** (you can set a validity period) and I\'ll continue.',
    )
    await streamText(target, assistantId, answer)
    return
  }

  // 2.5) Failure demo: connecting an external data source times out
  if (/连接|数据库|database|同步到|sync to/i.test(userText)) {
    await typeThinking(target, assistantId, L('尝试连接外部数据源…', 'Connecting to the external data source…'))
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    await runToolCall(
      target,
      assistantId,
      {
        id: uid('tc_'),
        tool: 'web',
        title: L('连接外部数据源', 'Connect data source'),
        fn: 'connect_datasource',
        params: { provider: 'postgres', timeoutMs: 5000 },
      },
      '{\n  success: false,\n  error: "ETIMEDOUT: 连接超时，请检查网络或稍后重试"\n}',
      'error',
    )
    await streamText(
      target,
      assistantId,
      L(
        '抱歉，连接数据源失败了：**连接超时（ETIMEDOUT）**。要我稍后再试一次吗？',
        'Sorry, connecting to the data source failed: **timeout (ETIMEDOUT)**. Want me to retry later?',
      ),
    )
    return
  }

  // 2.6) Multi-step demo: tidy OKR → save to Knowledge Hub
  if (/OKR|knowledge ?hub|知识库/i.test(userText)) {
    await typeThinking(target, assistantId, L('整理 OKR 并按模板保存到 Knowledge Hub。', 'Tidying the OKR and saving it to the Knowledge Hub.'))
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    await runToolCall(
      target,
      assistantId,
      {
        id: uid('tc_'),
        tool: 'codebase',
        title: L('获取个人 OKR 模板以确保格式一致', 'Fetch the personal OKR template'),
        fn: 'get_okr_template',
        params: { role: 'individual' },
      },
      OKR_TEMPLATE_RESULT,
    )
    if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
    await runToolCall(
      target,
      assistantId,
      {
        id: uid('tc_'),
        tool: 'codebase',
        title: L('更新用户 5-6 月 OKR 文档，添加 O3 及两个 KR', 'Update the May–Jun OKR doc with O3 and two KRs'),
        fn: 'update_doc',
        params: { docId: 'okr-2026-05', op: 'append', objective: 'O3', krs: ['KR1', 'KR2'] },
      },
      "{\n  success: true,\n  url: 'knowledge-hub/okr-2026-05'\n}",
    )
    await streamText(
      target,
      assistantId,
      L(
        '✅ 已成功保存到 Knowledge Hub！\n\n你的 OKR 现在包含：\n\n📋 **O3**：完成 Cortex App 桌面端和移动端上线，建立 Workmate 7×24 个人助理产品体系\n\n- **KR1**：移动端原型全流程可演示，核心交互满意度 ≥ 4.5/5\n- **KR2**：定时任务执行成功率 ≥ 99.5%，P95 延迟 < 2s',
        '✅ Saved to the Knowledge Hub!\n\nYour OKR now contains:\n\n📋 **O3**: Ship Cortex App on desktop and mobile, building a 7×24 Workmate personal-assistant product.\n\n- **KR1**: Mobile prototype fully demoable, core-interaction satisfaction ≥ 4.5/5\n- **KR2**: Scheduled-task success rate ≥ 99.5%, P95 latency < 2s',
      ),
    )
    return
  }

  // 3) General answer
  const { thinking, answer } = generalAnswer(userText)
  await typeThinking(target, assistantId, thinking)
  if (isAborted(assistantId)) return s.patchMessage(target, assistantId, { status: 'stopped' })
  await streamText(target, assistantId, answer)
}

// ---- Approval resolution (syncs notification <-> in-chat card) -------------

export function resolveApprovalFlow(
  notifId: string,
  status: 'approved' | 'rejected',
  validity?: AppNotification['validity'],
  customDays?: number,
) {
  const s = store()
  s.resolveApproval(notifId, status, validity, customDays)
  const n = s.notifications.find((x) => x.id === notifId)
  if (!n) return
  const spec =
    n.tool === 'calendar'
      ? approvalSpecFor('日历')
      : n.tool === 'email'
        ? approvalSpecFor('邮件')
        : approvalSpecFor('代码库')
  if (!n.relatedMessageId) return
  const target: MessageTarget =
    n.relatedMode === 'normal' && n.relatedConversationId
      ? { mode: 'normal', conversationId: n.relatedConversationId }
      : { mode: 'workmate' }

  s.patchMessage(target, n.relatedMessageId, (m) => ({
    toolCalls: (m.toolCalls || []).map((tc) =>
      tc.approvalId === notifId
        ? {
            ...tc,
            status: status === 'approved' ? ('success' as const) : ('error' as const),
            result:
              status === 'rejected'
                ? L('{ success: false, error: "用户拒绝授权" }', '{ success: false, error: "User declined" }')
                : tc.result,
          }
        : tc,
    ),
  }))
  if (status === 'approved' && spec) {
    // append the result after a short beat
    const target2 = target
    const mid = n.relatedMessageId
    setTimeout(() => {
      store().patchMessage(target2, mid, (m) => ({
        text: m.text + '\n\n' + L(spec.resultZh, spec.resultEn),
      }))
    }, 500)
  } else if (status === 'rejected') {
    const mid = n.relatedMessageId
    store().patchMessage(target, mid, (m) => ({
      text: m.text + '\n\n' + L('你已拒绝授权，未执行该操作。', 'You declined — the action was not performed.'),
    }))
  }
}

// ---- Continue after an inline MCP connect (called by the connect card) ------

export function continueAfterMcpConnect(target: MessageTarget, serverName: string) {
  const s = store()
  const aId = uid('m_')
  s.appendMessage(target, { id: aId, role: 'assistant', text: '', status: 'thinking', createdAt: Date.now() })
  void streamMcpFollowUp(target, aId, serverName)
}

async function streamMcpFollowUp(target: MessageTarget, id: string, name: string) {
  await sleep(500)
  await streamText(
    target,
    id,
    L(
      `✅ 已连接 **${name}**。现在就能用它来帮你完成刚才的请求了 —— 需要我直接开始吗？`,
      `✅ **${name}** is connected. I can use it for your request now — want me to go ahead?`,
    ),
  )
}
