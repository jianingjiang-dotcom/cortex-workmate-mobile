import {
  type Account,
  type Agent,
  type AppNotification,
  type Conversation,
  type Lang,
  type Meeting,
  type McpServer,
  type MemoryItem,
  type Message,
  type ModelOption,
  type Persona,
  type Project,
  type ScheduledTask,
  type Skill,
  type SummaryTemplate,
  type TranscriptSegment,
} from '../lib/types'
import { computeNextRun } from '../lib/time'
import { buildSchedule } from '../lib/schedule'
import { uid } from '../lib/util'

const MIN = 60 * 1000
const HR = 60 * MIN
const DAY = 24 * HR

// ---- Localization ----------------------------------------------------------
// Demo content is generated in the active language. `_seedLang` is set by
// buildSeed(lang) and kept in sync by the store (setLang / rehydrate / migrate),
// so the runtime analysis + summary helpers below also localize correctly.
let _seedLang: Lang = 'en'
export function setSeedLang(l: Lang) {
  _seedLang = l
}
function L<T>(zh: T, en: T): T {
  return _seedLang === 'zh' ? zh : en
}

// ---- Models ----------------------------------------------------------------

export const MODELS: ModelOption[] = [
  { id: 'claude-opus-4-8', vendor: 'Anthropic', name: 'Claude Opus 4.8', desc: 'Most capable' },
  { id: 'claude-sonnet-4-6', vendor: 'Anthropic', name: 'Claude Sonnet 4.6', desc: 'Balanced' },
  { id: 'gpt-5-5', vendor: 'OpenAI', name: 'GPT-5.5', desc: 'General' },
  { id: 'gemini-3-1-pro', vendor: 'Google', name: 'Gemini 3.1 Pro', desc: 'Long context' },
  { id: 'deepseek-v3', vendor: 'DeepSeek', name: 'DeepSeek V3', desc: 'Cost-efficient' },
]

export const DEFAULT_MODEL_ID = 'claude-sonnet-4-6'

// ---- Meeting analysis templates --------------------------------------------

interface Analysis {
  transcript: TranscriptSegment[]
  summary: string
}

function seg(
  speaker: string,
  speakerIndex: number,
  startMs: number,
  endMs: number,
  text: string,
): TranscriptSegment {
  return { id: uid('seg_'), speaker, speakerIndex, startMs, endMs, text }
}

export function reviewAnalysis(): Analysis {
  return {
    transcript: [
      seg(L('主持人', 'Host'), 0, 0, 7000, L('好，我们开始今天的产品评审，主要过一下 Q3 路线图，先请产品同学讲一下整体规划。', "Alright, let's start today's product review. We'll mainly walk through the Q3 roadmap — Product, please take us through the overall plan first.")),
      seg(L('产品 · 林悦', 'Product · Lin Yue'), 1, 7000, 22000, L('Q3 我们聚焦三件事：第一是 Workmate 的多端打通，第二是定时任务的稳定性，第三是会议纪要的转写质量。优先级上，多端打通排第一。', 'For Q3 we focus on three things: first, cross-device Workmate; second, scheduled-task reliability; third, meeting-notes transcription quality. By priority, cross-device comes first.')),
      seg(L('研发 · 张航', 'Eng · Zhang Hang'), 2, 22000, 37000, L('多端打通这块，移动端我评估下来大概需要三周，主要是状态同步和离线处理。定时任务的稳定性我建议这个季度做灰度，先覆盖 20% 的用户。', "For cross-device, mobile will take about three weeks — mostly state sync and offline handling. For scheduled-task reliability I'd suggest a staged rollout this quarter, starting at 20% of users.")),
      seg(L('主持人', 'Host'), 0, 37000, 44000, L('灰度的指标怎么定？我们得有个明确的成功标准。', 'How do we define the rollout metrics? We need a clear success bar.')),
      seg(L('研发 · 张航', 'Eng · Zhang Hang'), 2, 44000, 58000, L('我建议任务执行成功率到 99.5% 以上，并且 P95 延迟控制在两秒内，连续观察一周达标就全量。', "I'd propose a task success rate above 99.5% with P95 latency under two seconds; if it holds for a week, we go to full rollout.")),
      seg(L('设计 · 周敏', 'Design · Zhou Min'), 3, 58000, 74000, L('会议纪要这块，我希望转写完成后能自动高亮待办项，用户一眼能看到要跟进什么。这个体验上很关键。', 'For meeting notes, I want to-do items auto-highlighted once transcription finishes, so users see follow-ups at a glance. That experience is key.')),
      seg(L('产品 · 林悦', 'Product · Lin Yue'), 1, 74000, 88000, L('同意，那我们把“待办自动提取”列为会议模块的 must-have，放进 Q3 范围。', "Agreed — let's make 'auto-extract action items' a must-have for the meetings module and put it in Q3 scope.")),
      seg(L('主持人', 'Host'), 0, 88000, 99000, L('好，那我总结一下行动项：张航负责多端打通的排期和灰度方案，周敏出会议纪要的交互稿，林悦更新路线图文档。', "Okay, let me sum up the action items: Zhang Hang owns the cross-device schedule and rollout plan, Zhou Min drafts the meeting-notes interaction, Lin Yue updates the roadmap doc.")),
      seg(L('产品 · 林悦', 'Product · Lin Yue'), 1, 99000, 110000, L('没问题，我周五之前把更新后的路线图同步到文档里，也会同步给管理层。', "No problem — I'll sync the updated roadmap to the doc before Friday and share it with leadership.")),
      seg(L('主持人', 'Host'), 0, 110000, 118000, L('那今天就到这里，谢谢大家。', "Let's wrap there. Thanks, everyone.")),
    ],
    summary: L(
      `## 会议总结

**主题**：Q3 产品路线图评审

### 关键结论
- Q3 聚焦三大方向，**多端打通**为最高优先级。
- 定时任务稳定性本季度采用**灰度发布**（先覆盖 20% 用户）。
- 会议纪要新增**待办自动提取**，列为 must-have。

### 待办事项
- [ ] **张航**：输出多端打通排期与灰度方案（成功标准：执行成功率 ≥ 99.5%，P95 延迟 < 2s）
- [ ] **周敏**：完成会议纪要“待办高亮”的交互稿
- [ ] **林悦**：周五前更新路线图文档并同步管理层

### 风险与关注
- 移动端状态同步与离线处理为主要技术风险，预计需 3 周。`,
      `## Meeting Summary

**Topic**: Q3 Product Roadmap Review

### Key decisions
- Q3 focuses on three areas, with **cross-device** as the top priority.
- Scheduled-task reliability ships via a **staged rollout** this quarter (starting at 20% of users).
- Meeting notes add **auto-extracted action items**, listed as a must-have.

### Action items
- [ ] **Zhang Hang**: deliver the cross-device schedule and rollout plan (success bar: success rate ≥ 99.5%, P95 latency < 2s)
- [ ] **Zhou Min**: finish the "action-item highlight" interaction for meeting notes
- [ ] **Lin Yue**: update the roadmap doc and share with leadership before Friday

### Risks & watch-items
- Mobile state sync and offline handling are the main technical risks, est. 3 weeks.`,
    ),
  }
}

export function interviewAnalysis(): Analysis {
  return {
    transcript: [
      seg(L('访谈员', 'Interviewer'), 0, 0, 9000, L('感谢你抽时间参加访谈，想先了解下，你平时在工作里最花时间、又比较重复的事情是什么？', "Thanks for making time. To start — what takes up the most time in your work and feels most repetitive?")),
      seg(L('受访者 · 用户A', 'Participant · User A'), 1, 9000, 26000, L('说实话，最烦的是每天要去几个系统里收集信息，然后手动整理成日报。基本上每天早上要花半小时做这件事。', "Honestly, the worst part is gathering info from several systems every day and manually compiling a daily report. It takes about half an hour each morning.")),
      seg(L('访谈员', 'Interviewer'), 0, 26000, 34000, L('那如果有个助手能每天自动帮你整理好，你会用吗？', 'If an assistant could compile that for you automatically every day, would you use it?')),
      seg(L('受访者 · 用户A', 'Participant · User A'), 1, 34000, 50000, L('当然会，前提是它整理得准，而且我能信任它。如果它要去连我的邮箱或者日历，我希望我能控制它能看哪些、不能看哪些。', "Of course — as long as it's accurate and I can trust it. If it connects to my email or calendar, I want to control what it can and can't see.")),
      seg(L('访谈员', 'Interviewer'), 0, 50000, 58000, L('理解。那在“信任”这件事上，什么会让你更安心？', 'Understood. On the trust side, what would make you more comfortable?')),
      seg(L('受访者 · 用户A', 'Participant · User A'), 1, 58000, 74000, L('每次它要动我的数据，最好先问我一下，我点同意它才做。而且授权能设个期限，比如就这一周有效，过了自动收回。', "Every time it touches my data, it should ask me first and only act once I approve. And authorization should have an expiry — say, valid for a week, then revoked automatically.")),
      seg(L('访谈员', 'Interviewer'), 0, 74000, 82000, L('非常清楚，这对我们很有帮助，谢谢你的分享。', "Very clear — that's really helpful. Thanks for sharing.")),
    ],
    summary: L(
      `## 用户访谈纪要

**主题**：增长方向 · 重复性工作与信任机制

### 核心洞察
- 用户每天约 **30 分钟**用于跨系统收集信息、手工整理日报，痛点明确。
- 愿意使用自动整理助手，但前提是**准确**且**可信任**。

### 关键诉求
- **细粒度授权**：可控制助手能访问哪些数据源。
- **逐次确认**：助手访问数据前先征求同意。
- **授权有效期**：支持设置期限（如本周有效），到期自动收回。

### 产品启示
- 验证了“工具调用审批 + 授权有效期”的设计方向。`,
      `## User Interview Notes

**Topic**: Growth direction · Repetitive work & trust mechanisms

### Key insights
- The user spends about **30 minutes** daily gathering cross-system info and compiling a report by hand — a clear pain point.
- Willing to use an auto-compiling assistant, but only if it's **accurate** and **trustworthy**.

### Core needs
- **Fine-grained authorization**: control which data sources the assistant can access.
- **Per-action confirmation**: ask before accessing data each time.
- **Authorization expiry**: support time limits (e.g. valid this week), auto-revoked on expiry.

### Product implications
- Validates the "tool-call approval + authorization expiry" design direction.`,
    ),
  }
}

export function genericAnalysis(): Analysis {
  return {
    transcript: [
      seg(L('说话人 1', 'Speaker 1'), 0, 0, 8000, L('我们先同步一下本周的进展，然后看看有没有需要协调的地方。', "Let's sync this week's progress first, then see if anything needs coordinating.")),
      seg(L('说话人 2', 'Speaker 2'), 1, 8000, 21000, L('这周我主要在推进对接的事情，整体顺利，预计下周能完成联调。', "This week I've mainly been pushing the integration; it's going smoothly and I expect to finish joint testing next week.")),
      seg(L('说话人 1', 'Speaker 1'), 0, 21000, 30000, L('好的，那有没有什么阻塞，需要其他同学支持的？', 'Good — any blockers where you need support from others?')),
      seg(L('说话人 2', 'Speaker 2'), 1, 30000, 42000, L('暂时没有，如果联调出问题我会及时同步。另外建议下周开始准备测试用例。', "Not for now; I'll flag it if joint testing hits issues. Also, I'd suggest we start preparing test cases next week.")),
      seg(L('说话人 1', 'Speaker 1'), 0, 42000, 50000, L('可以，那我们下周再对齐一次进度。', "Sounds good — let's align on progress again next week.")),
    ],
    summary: L(
      `## 会议总结

### 进展
- 对接工作推进顺利，预计下周完成联调。

### 待办事项
- [ ] 下周开始准备测试用例
- [ ] 下周再对齐一次进度

### 备注
- 当前无阻塞项。`,
      `## Meeting Summary

### Progress
- Integration is going smoothly; joint testing expected to finish next week.

### Action items
- [ ] Start preparing test cases next week
- [ ] Re-align on progress next week

### Notes
- No blockers at the moment.`,
    ),
  }
}

// ---- Summary templates -----------------------------------------------------

export const SUMMARY_TEMPLATES: { key: SummaryTemplate }[] = [
  { key: 'meeting' },
  { key: 'customer' },
  { key: 'interview' },
  { key: 'generic' },
  { key: 'actions' },
]

export function summaryForTemplate(key: SummaryTemplate, m?: { title?: string }, note?: string): string {
  const base = summaryBody(key, m)
  const trimmed = note?.trim()
  if (!trimmed) return base
  const [head, ...rest] = base.split('\n\n')
  return `${head}\n\n> ${L('背景补充', 'Context')}：${trimmed}\n\n${rest.join('\n\n')}`
}

function summaryBody(key: SummaryTemplate, m?: { title?: string }): string {
  const title = m?.title ? (L('：', ': ') + m.title) : ''
  switch (key) {
    case 'meeting':
      return L(
        `## 会议纪要${title}

### 决议事项
- 本季度聚焦三大方向，**多端打通**为最高优先级。
- 定时任务稳定性采用**灰度发布**，先覆盖 20% 用户。
- 「待办自动提取」列为会议模块的 must-have。

### 待办事项
- [ ] **@张航**：输出多端打通排期与灰度方案
- [ ] **@周敏**：完成会议纪要交互稿
- [ ] **@林悦**：更新路线图文档并同步管理层

### 风险与关注
- 移动端状态同步与离线处理为主要技术风险，预计需 3 周。`,
        `## Meeting Notes${title}

### Decisions
- Three focus areas this quarter, with **cross-device** as the top priority.
- Scheduled-task reliability ships via a **staged rollout**, starting at 20% of users.
- "Auto-extract action items" is listed as a must-have for the meetings module.

### Action items
- [ ] **@Zhang Hang**: deliver the cross-device schedule and rollout plan
- [ ] **@Zhou Min**: finish the meeting-notes interaction draft
- [ ] **@Lin Yue**: update the roadmap doc and share with leadership

### Risks & watch-items
- Mobile state sync and offline handling are the main technical risks, est. 3 weeks.`,
      )
    case 'customer':
      return L(
        `## 客户沟通总结${title}

### 客户背景
- 中型团队，当前用多套工具拼接日报流程，痛点明确。

### 核心诉求
- 希望一处**自动汇总**跨系统信息，减少人工整理。
- 对数据**授权与可控**高度敏感，需要细粒度权限。

### 承诺与下一步
- [ ] 本周内提供一版可演示的自动汇总流程
- [ ] 补充企业版安全合规材料

### 商机评估
- **意向度**：中高　**预计规模**：30–50 席位　**关键阻力**：安全合规审批`,
        `## Customer Call Summary${title}

### Customer background
- Mid-sized team currently stitching together a daily-report process across several tools — a clear pain point.

### Core needs
- Wants a single place to **auto-aggregate** cross-system info and reduce manual work.
- Highly sensitive to data **authorization and control**; needs fine-grained permissions.

### Commitments & next steps
- [ ] Provide a demoable auto-aggregation flow this week
- [ ] Supply enterprise security & compliance materials

### Opportunity assessment
- **Intent**: medium-high　**Est. size**: 30–50 seats　**Key blocker**: security & compliance review`,
      )
    case 'interview':
      return L(
        `## 面试评估${title}

### 评价维度
- **专业能力**：4 / 5 — 项目经验扎实，能讲清权衡取舍。
- **沟通表达**：4 / 5 — 表达清晰，能照顾听众背景。
- **文化匹配**：3.5 / 5 — 主动性强，需确认对节奏的适应。

### 亮点
- 有从 0 到 1 的完整落地经验，结果导向。

### 顾虑
- 大规模协作经验偏少，需在下一轮深入考察。

### 录用建议
- **倾向**：推荐进入下一轮（侧重系统设计与协作）。`,
        `## Interview Assessment${title}

### Evaluation dimensions
- **Technical ability**: 4 / 5 — solid project experience, articulates trade-offs clearly.
- **Communication**: 4 / 5 — clear, adapts to the audience.
- **Culture fit**: 3.5 / 5 — strong initiative; confirm adaptability to pace.

### Strengths
- Full 0-to-1 delivery experience, results-oriented.

### Concerns
- Limited large-scale collaboration experience; probe further next round.

### Recommendation
- **Leaning**: advance to the next round (focus on system design & collaboration).`,
      )
    case 'actions':
      return L(
        `## 行动项清单${title}

- [ ] **@张航**：输出多端打通排期与灰度方案 · 截止 周五
- [ ] **@周敏**：完成会议纪要「待办高亮」交互稿 · 截止 下周三
- [ ] **@林悦**：更新路线图文档并同步管理层 · 截止 周五
- [ ] **@你**：跟进上线前的回归测试 · 截止 本周内

> 共 4 项行动，其中 2 项本周到期。`,
        `## Action Items${title}

- [ ] **@Zhang Hang**: deliver cross-device schedule & rollout plan · due Fri
- [ ] **@Zhou Min**: finish the "action-item highlight" interaction · due next Wed
- [ ] **@Lin Yue**: update roadmap doc & share with leadership · due Fri
- [ ] **@You**: follow up on pre-launch regression testing · due this week

> 4 actions total, 2 due this week.`,
      )
    case 'generic':
    default:
      return L(
        `## 纪要${title}

### 进展
- 对接工作推进顺利，预计下周完成联调。

### 待办事项
- [ ] 下周开始准备测试用例
- [ ] 下周再对齐一次进度

### 备注
- 当前无阻塞项。`,
        `## Notes${title}

### Progress
- Integration going smoothly; joint testing expected to finish next week.

### Action items
- [ ] Start preparing test cases next week
- [ ] Re-align on progress next week

### Notes
- No blockers at the moment.`,
      )
  }
}

// ---- Seed builder ----------------------------------------------------------

export interface SeedData {
  account: Account
  persona: Persona
  agents: Agent[]
  workmateMessages: Message[]
  projects: Project[]
  conversations: Conversation[]
  notifications: AppNotification[]
  tasks: ScheduledTask[]
  meetings: Meeting[]
  mcpServers: McpServer[]
  memories: MemoryItem[]
  skills: Skill[]
}

export function buildSeed(lang: Lang = _seedLang): SeedData {
  _seedLang = lang
  const now = Date.now()

  const account: Account = {
    id: 'U-7F3A9C21',
    name: 'Jianing',
    email: 'jianing.jiang@cobo.com',
    avatarGradient: 'brand',
  }

  const persona: Persona = {
    name: 'Workmate',
    description: L('你的专属 AI 工作助理', 'Your personal AI work assistant'),
    avatarGradient: 'brand',
    avatarImage: '/workmate-avatar.png',
    systemPrompt: L(
      '你是 Jianing 的专属工作助理 Workmate。你有记忆，能跨工具替用户办事。\n\n你的风格：简洁、专业、主动。回答优先给结论，再给要点。\n当用户让你"定时做某事"时，先确认时间与范围，再创建定时任务；信息不全时主动反问澄清，不要乱建。\n在动用外部能力（如日历、代码库、邮件）前，先向用户申请授权。',
      "You are Workmate, Jianing's personal work assistant. You have memory and can act across tools on the user's behalf.\n\nYour style: concise, professional, proactive. Lead with the conclusion, then the key points.\nWhen the user asks you to \"do something on a schedule\", confirm the time and scope first, then create a scheduled task; if details are missing, ask to clarify rather than guessing.\nBefore using external capabilities (calendar, codebase, email), request the user's authorization first.",
    ),
    modelId: DEFAULT_MODEL_ID,
  }

  const agents: Agent[] = [
    { id: 'agent_auto', name: 'Auto Agent', org: 'builtin', builtin: true, avatarGradient: 'brand', desc: L('自动路由到最合适的智能体', 'Routes to the best-fit agent automatically') },
    { id: 'agent_knowledge', name: 'KnowledgeAgent', org: 'builtin', builtin: true, avatarGradient: 'ocean', desc: L('检索知识库，回答业务问题', 'Searches the knowledge base to answer business questions') },
    { id: 'agent_okrkg', name: 'OKRKGAgent', org: 'builtin', builtin: true, avatarGradient: 'violet', desc: L('对齐 OKR 与知识图谱', 'Aligns OKRs with the knowledge graph') },
    { id: 'agent_planning', name: 'Planning Agent', org: 'builtin', builtin: true, avatarGradient: 'mint', desc: L('拆解目标，生成执行计划', 'Breaks goals into an execution plan') },
    { id: 'agent_strategy', name: 'StrategyAgent', org: 'builtin', builtin: true, avatarGradient: 'sunset', desc: L('竞品与市场策略分析', 'Competitor and market strategy analysis') },
    { id: 'agent_cobo_support', name: L('客服助手', 'Support Agent'), org: 'cobo', avatarGradient: 'ocean', desc: L('处理客户工单与常见问题', 'Handles customer tickets and FAQs') },
    { id: 'agent_cobo_compliance', name: L('合规审查助手', 'Compliance Agent'), org: 'cobo', avatarGradient: 'violet', desc: L('KYT / KYC 合规初筛', 'KYT / KYC compliance pre-screening') },
    { id: 'agent_sales_lead', name: L('线索挖掘助手', 'Lead-Gen Agent'), org: 'salesBd', avatarGradient: 'amber', desc: L('挖掘并初筛销售线索', 'Sources and pre-qualifies sales leads') },
    { id: 'agent_sales_brief', name: L('客户简报助手', 'Account Brief Agent'), org: 'salesBd', avatarGradient: 'sunset', desc: L('生成客户背景简报', 'Generates customer background briefs') },
    { id: 'agent_growth_metrics', name: L('增长指标助手', 'Growth Metrics Agent'), org: 'opsGrowth', avatarGradient: 'mint', desc: L('拉取并解读增长指标', 'Pulls and interprets growth metrics') },
    { id: 'agent_rd_pr', name: L('PR 巡检助手', 'PR Review Agent'), org: 'rd', avatarGradient: 'ocean', desc: L('巡检 PR 与代码评审', 'Patrols PRs and code reviews') },
    { id: 'agent_rd_oncall', name: L('On-call 助手', 'On-call Agent'), org: 'rd', avatarGradient: 'violet', desc: L('汇总告警与值班事项', 'Summarizes alerts and on-call items') },
    { id: 'agent_blank', name: L('空白助手', 'Blank Agent'), org: 'default', avatarGradient: 'brand', desc: L('无预设，从零开始', 'No presets — start from scratch') },
  ]

  const calNotifId = uid('ntf_')
  const calMsgId = uid('m_')
  const slackNotifId = uid('ntf_')
  const slackMsgId = uid('m_')
  const mailNotifId = uid('ntf_')
  const mailMsgId = uid('m_')
  const codeNotifId = uid('ntf_')
  const codeMsgId = uid('m_')
  const jiraNotifId = uid('ntf_')
  const jiraMsgId = uid('m_')
  const slackId = 'mcp_slack_seed'
  const jiraId = 'mcp_jira_seed'
  const reviewMeetingId = uid('meet_')
  const importMeetingId = uid('meet_')

  const wm = (
    role: 'user' | 'assistant',
    text: string,
    createdAt: number,
    extra: Partial<Message> = {},
  ): Message => ({ id: uid('m_'), role, text, status: 'done', createdAt, ...extra })

  const workmateMessages: Message[] = [
    wm('user', L('帮我列一下这周的工作重点', 'List my priorities for this week'), now - 10 * DAY),
    wm('assistant', L(
      '这周建议聚焦三件事：\n\n1. **完成移动端原型**：跑通核心链路。\n2. **准备 Q3 评审**：整理路线图材料。\n3. **跟进招聘**：安排两场面试。',
      'I suggest focusing on three things this week:\n\n1. **Finish the mobile prototype**: get the core flows working.\n2. **Prep the Q3 review**: organize the roadmap materials.\n3. **Follow up on hiring**: schedule two interviews.',
    ), now - 10 * DAY + 25000),
    wm('user', L('把竞品最近的动态整理一下', 'Summarize recent competitor activity'), now - 9 * DAY),
    wm('assistant', L(
      '近期竞品动态：\n\n- **A 公司**：上线了新版协作功能。\n- **B 公司**：完成新一轮融资。\n\n我们的差异点仍是"持续协作 + 跨工具自动化"。',
      'Recent competitor activity:\n\n- **Company A**: launched a new collaboration feature.\n- **Company B**: closed a new funding round.\n\nOur differentiator remains "continuous collaboration + cross-tool automation".',
    ), now - 9 * DAY + 25000),
    wm('user', L('这段产品介绍帮我润色得更专业一些', 'Polish this product blurb to sound more professional'), now - 8 * DAY),
    wm('assistant', L(
      '润色后：\n\n> Cortex Workmate 是你的随身 AI 工作助理：有记忆、能跨工具替你执行重复事务，并在关键动作上征求你的授权。',
      'Polished:\n\n> Cortex Workmate is your on-the-go AI work assistant: it remembers context, runs repetitive tasks across your tools, and asks for your authorization on the actions that matter.',
    ), now - 8 * DAY + 25000),
    wm('user', L('用三点总结一下敏捷开发', 'Summarize agile development in three points'), now - 7 * DAY),
    wm('assistant', L(
      '1. **小步快跑**：短迭代、频繁交付。\n2. **持续反馈**：快速验证与调整。\n3. **协作透明**：信息对齐，减少返工。',
      '1. **Small, fast steps**: short iterations, frequent delivery.\n2. **Continuous feedback**: validate and adjust quickly.\n3. **Transparent collaboration**: aligned info, less rework.',
    ), now - 7 * DAY + 25000, { reaction: 'up' }),
    wm('user', L('帮我起草一封周会通知', 'Draft a weekly-meeting notice for me'), now - 6 * DAY),
    wm('assistant', L(
      '【周会通知】本周五 15:00 在 3 号会议室召开例会。\n\n议题：进度同步 · 风险对齐 · 下周计划。请提前准备各自模块的更新。',
      '[Weekly Meeting] This Friday 15:00 in Meeting Room 3.\n\nAgenda: progress sync · risk alignment · next-week plan. Please prepare updates for your module in advance.',
    ), now - 6 * DAY + 25000),
    wm('user', L('评审一下这个分页接口的设计', 'Review the design of this pagination API'), now - 5 * DAY),
    wm('assistant', L(
      '建议用基于**游标（cursor）**的分页：\n\n- 数据量大时性能更稳定\n- 插入/删除不会错页\n\n返回里带上 `next_cursor` 即可。',
      'I recommend **cursor**-based pagination:\n\n- More stable performance at scale\n- Inserts/deletes won\'t mis-page\n\nJust include `next_cursor` in the response.',
    ), now - 5 * DAY + 25000, { favoritedAt: now - 2 * HR }),
    wm('user', L('我想做个用户增长实验，给点思路', 'I want to run a growth experiment — give me some ideas'), now - 4 * DAY),
    wm('assistant', L(
      '可以分三步：\n\n1. **明确指标**：如激活率 / 次日留存。\n2. **小范围 A/B**：只动一个变量。\n3. **看到显著性再放量**。',
      'Three steps:\n\n1. **Define the metric**: e.g. activation rate / next-day retention.\n2. **Small-scale A/B**: change only one variable.\n3. **Scale up only once it\'s significant**.',
    ), now - 4 * DAY + 25000),
    wm('user', L('把上周的 OKR 草稿再精简一下', 'Trim down last week\'s OKR draft'), now - 3 * DAY),
    wm('assistant', L(
      '精简版：\n\n- **O**：让移动端体验达到可演示标准。\n- **KR1**：核心链路全部跑通。\n- **KR2**：关键交互满意度 ≥ 4.5/5。',
      'Trimmed:\n\n- **O**: bring the mobile experience to a demoable standard.\n- **KR1**: all core flows working end-to-end.\n- **KR2**: key-interaction satisfaction ≥ 4.5/5.',
    ), now - 3 * DAY + 25000, { favoritedAt: now - 1 * DAY }),
    wm('user', L('帮我准备产品评审会的开场白', 'Help me prepare the opening for the product review'), now - 2 * DAY - 8 * HR),
    wm('assistant', L(
      '开场可以这样说：\n\n"今天我们用 30 分钟过一遍 Q3 路线图，重点对齐优先级与成功标准，欢迎随时打断提问。"',
      'You could open like this:\n\n"Today we\'ll spend 30 minutes walking through the Q3 roadmap, focusing on aligning priorities and success criteria. Feel free to jump in with questions anytime."',
    ), now - 2 * DAY - 8 * HR + 25000),
    wm('user', L('简单解释一下 MPC 钱包的原理', 'Briefly explain how MPC wallets work'), now - 2 * DAY - 4 * HR),
    wm('assistant', L(
      'MPC 钱包把私钥拆成多个分片，由不同方分别保管；签名时各方协作计算，**私钥从不完整出现**，从而降低单点泄露风险。',
      'An MPC wallet splits the private key into shares held by different parties; signing is computed collaboratively, so the **full private key never exists in one place**, reducing single-point-of-failure risk.',
    ), now - 2 * DAY - 4 * HR + 25000),
    wm('user', L('帮我看看这周有哪些重要的事', 'Show me the important things this week'), now - 2 * DAY - 3 * HR),
    wm('assistant', L(
      '这周有三件重点：\n\n1. **周三**：Q3 路线图评审（你是主讲）\n2. **周四**：与增长团队的用户访谈\n3. **周五**：提交季度 OKR 草稿\n\n要我把评审材料先整理一版吗？',
      'Three priorities this week:\n\n1. **Wed**: Q3 roadmap review (you\'re presenting)\n2. **Thu**: user interview with the growth team\n3. **Fri**: submit the quarterly OKR draft\n\nWant me to put together a first draft of the review materials?',
    ), now - 2 * DAY - 3 * HR + 20000, { thinking: L('回顾本周日历与待办，挑出优先级高的事项。', 'Reviewing this week\'s calendar and to-dos to pick out the high-priority items.') }),
    wm('user', L('先把上次的竞品分析整理成要点', 'First, turn the last competitor analysis into key points'), now - 1 * DAY - 5 * HR),
    wm('assistant', L(
      '已整理为要点：\n\n- **定位差异**：竞品偏通用助手，我们强调"持续协作 + 跨工具执行"。\n- **核心壁垒**：记忆与定时自动化是我们的差异点。\n- **风险**：对方在转写质量上领先，需要我们补齐。\n\n需要我做成一页纸的对比表吗？',
      'Organized into key points:\n\n- **Positioning**: competitors lean toward general assistants; we emphasize "continuous collaboration + cross-tool execution".\n- **Core moat**: memory and scheduled automation are our differentiators.\n- **Risk**: they lead on transcription quality — we need to catch up.\n\nWant me to turn this into a one-page comparison table?',
    ), now - 1 * DAY - 5 * HR + 18000, { reaction: 'up' }),
    wm('user', L('看下我今天的日历安排', 'Check my calendar for today'), now - 26 * MIN),
    wm('assistant', L(
      '这个操作需要你的授权。我已发起申请，你可以在**下方卡片**或**通知中心**选择授权有效期并同意，我就继续。',
      'This action needs your authorization. I\'ve sent a request — you can choose an authorization period and approve it in the **card below** or in the **notification center**, and I\'ll continue.',
    ), now - 25 * MIN, {
      id: calMsgId,
      thinking: L('需要访问你的日历才能继续。', 'I need access to your calendar to continue.'),
      toolCalls: [
        { id: uid('tc_'), tool: 'calendar', title: L('访问日历', 'Access calendar'), status: 'awaiting_approval', approvalId: calNotifId, fn: 'read_calendar', params: { scope: 'readonly', range: 'today..+7d' } },
      ],
    }),
    wm('user', L('把刚才这条整理同步到 Slack', 'Sync that summary to Slack'), now - 21 * MIN),
    wm('assistant', L(
      '要完成这个操作，需要先连接 **Slack**。点下面的卡片完成授权并连接，连上后我就继续。',
      'To do this I need to connect **Slack** first. Tap the card below to authorize and connect, and I\'ll continue once it\'s linked.',
    ), now - 20 * MIN, { id: slackMsgId, thinking: L('这个操作需要先连接 Slack。', 'This action requires connecting Slack first.'), mcpRequestId: slackId }),
    wm('user', L('帮我看看最近有哪些邮件需要回复', 'Show me which recent emails need a reply'), now - 19 * MIN),
    wm('assistant', L(
      '这个操作需要你的授权。可在**下方卡片**或**通知中心**选择授权有效期并同意，我就继续。',
      'This action needs your authorization. Choose an authorization period and approve it in the **card below** or the **notification center**, and I\'ll continue.',
    ), now - 18 * MIN, {
      id: mailMsgId,
      thinking: L('需要访问你的邮箱才能继续。', 'I need access to your email to continue.'),
      toolCalls: [
        { id: uid('tc_'), tool: 'email', title: L('访问邮箱', 'Access email'), status: 'awaiting_approval', approvalId: mailNotifId, fn: 'read_email', params: { scope: 'readonly', range: 'last_24h' } },
      ],
    }),
    wm('user', L('在我的代码库里搜一下登录相关的实现', 'Search my codebase for the login implementation'), now - 17 * MIN),
    wm('assistant', L(
      '这个操作需要你的授权。可在**下方卡片**或**通知中心**选择授权有效期并同意，我就继续。',
      'This action needs your authorization. Choose an authorization period and approve it in the **card below** or the **notification center**, and I\'ll continue.',
    ), now - 16 * MIN, {
      id: codeMsgId,
      thinking: L('需要访问你的代码库才能继续。', 'I need access to your codebase to continue.'),
      toolCalls: [
        { id: uid('tc_'), tool: 'github', title: L('访问代码库', 'Access codebase'), status: 'awaiting_approval', approvalId: codeNotifId, fn: 'read_codebase', params: { scope: 'readonly', repos: 'selected' } },
      ],
    }),
    wm('user', L('把这个 bug 在 Jira 里建个工单', 'Create a Jira ticket for this bug'), now - 15 * MIN),
    wm('assistant', L(
      '要完成这个操作，需要先连接 **Jira**。点下面的卡片完成授权并连接，连上后我就继续。',
      'To do this I need to connect **Jira** first. Tap the card below to authorize and connect, and I\'ll continue once it\'s linked.',
    ), now - 14 * MIN, { id: jiraMsgId, thinking: L('这个操作需要先连接 Jira。', 'This action requires connecting Jira first.'), mcpRequestId: jiraId }),
  ]

  // ---- Projects ----
  const projProduct: Project = { id: uid('proj_'), name: L('产品迭代', 'Product Iteration'), createdAt: now - 10 * DAY }
  const projGrowth: Project = { id: uid('proj_'), name: L('增长实验', 'Growth Experiments'), createdAt: now - 8 * DAY }
  const projects = [projProduct, projGrowth]

  const SRC_LABEL = L('Workmate 对话', 'Workmate chat')

  // ---- Tasks ----
  const ghTask: ScheduledTask = {
    id: uid('task_'),
    name: L('整理 GitHub PR', 'Tidy GitHub PRs'),
    instruction: L(
      '每天早上 9 点，汇总我负责仓库里所有待审查（open）的 Pull Request，按优先级排序，列出标题、作者、停留时长，并标出超过 2 天未处理的 PR。',
      'Every day at 9am, summarize all open pull requests awaiting review in the repos I own, sorted by priority, listing title, author, and time open, and flag any PR untouched for more than 2 days.',
    ),
    schedule: { kind: 'daily', timeOfDay: '09:00', humanZh: '每天 09:00', humanEn: 'Every day at 09:00' },
    status: 'success',
    paused: false,
    source: 'chat',
    sourceLabel: SRC_LABEL,
    capabilities: ['github'],
    mcpServerNames: ['GitHub'],
    createdAt: now - 6 * DAY,
    runs: [],
    nextRunAt: 0,
    lastRunAt: now - 5 * HR,
  }
  ghTask.nextRunAt = computeNextRun(ghTask.schedule, now)

  const watchTask: ScheduledTask = {
    id: uid('task_'),
    name: L('竞品动态巡检', 'Competitor Watch'),
    instruction: L(
      '每 4 小时检索一次设定关键词（竞品名 + "发布"/"融资"），有新动态时汇总要点。',
      'Every 4 hours, search the configured keywords (competitor name + "launch"/"funding") and summarize the key points whenever there\'s something new.',
    ),
    schedule: buildSchedule({ mode: 'interval', intervalMinutes: 240, startAt: now - 2 * DAY }),
    status: 'success',
    paused: false,
    source: 'chat',
    sourceLabel: SRC_LABEL,
    capabilities: ['web'],
    mcpServerNames: [],
    createdAt: now - 3 * DAY,
    runs: [],
    lastRunAt: now - 2 * HR,
    nextRunAt: 0,
  }
  watchTask.nextRunAt = computeNextRun(watchTask.schedule, now)

  const weeklyTask: ScheduledTask = {
    id: uid('task_'),
    name: L('产品组 OKR 周报', 'Product Team OKR Digest'),
    instruction: L(
      '每周日晚上 8 点，自动汇总产品组同事本周的 OKR 进展，生成一份结构化的中文周报并发送给我。\n\n' +
        '执行要求：\n' +
        '1. 确定范围：定位「产品组」的全体成员，只统计该组同事，不遗漏、也不混入其他团队。\n' +
        '2. 获取周期：读取当前正在生效的 OKR 周期，确保统计的是本周期目标，而非历史周期。\n' +
        '3. 逐人核对：依次检查每位同事本周的 OKR 更新与周报记录，提取关键进展、完成度（KR 百分比）与风险 / 阻塞项。\n' +
        '4. 结构化输出：用中文输出一份结构清晰的报告，包含「整体概览」「按人汇总（姓名 · 目标 · 本周进展 · 完成度 · 风险）」「需重点关注的风险项」三个部分。\n' +
        '5. 数据来源：严格基于我有权限访问的文档与系统，不要编造或推测；无法访问的内容请明确标注「暂无数据」。\n' +
        '6. 发送结果：将最终报告以邮件形式发送给我（jianing.jiang@cobo.com）。',
      'Every Sunday at 8pm, automatically compile the product team\'s OKR progress for the week into a structured digest and email it to me.\n\n' +
        'Requirements:\n' +
        '1. Scope: identify every member of the "Product team" — count only that team, missing no one and mixing in no other teams.\n' +
        '2. Cycle: read the currently active OKR cycle, ensuring you report on this cycle\'s goals, not past ones.\n' +
        '3. Per-person review: check each teammate\'s OKR updates and weekly notes, extracting key progress, completion (KR %), and risks / blockers.\n' +
        '4. Structured output: produce a clearly structured report with three sections — "Overview", "By person (name · goal · progress · completion · risk)", and "Risks to watch".\n' +
        '5. Data sources: rely strictly on docs and systems I can access; do not fabricate or guess — mark anything inaccessible as "No data".\n' +
        '6. Delivery: email the final report to me (jianing.jiang@cobo.com).',
    ),
    schedule: { kind: 'weekly', weekday: 0, weekdays: [0], timeOfDay: '20:00', humanZh: '每周日 20:00', humanEn: 'Every Sun at 20:00' },
    status: 'success',
    paused: false,
    source: 'chat',
    sourceLabel: SRC_LABEL,
    capabilities: ['email'],
    mcpServerNames: [L('飞书 Lark', 'Lark'), 'Notion'],
    createdAt: now - 12 * DAY,
    runs: [],
    lastRunAt: now - 2 * DAY,
    nextRunAt: computeNextRun({ kind: 'weekly', weekday: 0, weekdays: [0], timeOfDay: '20:00', humanZh: '', humanEn: '' }, now),
  }
  weeklyTask.runs = [
    { id: uid('run_'), status: 'success', startedAt: now - 2 * DAY, durationMs: 58000, resultSummary: L('汇总产品组 6 位同事本周 OKR，2 项存在风险', 'Compiled OKRs for 6 product teammates; 2 items at risk') },
    { id: uid('run_'), status: 'success', startedAt: now - 9 * DAY, durationMs: 51000, resultSummary: L('汇总产品组 6 位同事本周 OKR，全部按计划推进', 'Compiled OKRs for 6 product teammates; all on track') },
  ]

  const runConvId = uid('conv_')
  const ghRunId = uid('run_')
  const runConversation: Conversation = {
    id: runConvId,
    title: L('整理 GitHub PR · 执行结果', 'Tidy GitHub PRs · Result'),
    messages: [
      {
        id: uid('m_'),
        role: 'assistant',
        status: 'done',
        createdAt: now - 5 * HR,
        thinking: L('拉取 open 状态的 PR，按停留时长与优先级排序。', 'Pulling open PRs, sorted by time open and priority.'),
        toolCalls: [
          { id: uid('tc_'), tool: 'github', title: L('读取 GitHub Pull Requests', 'Read GitHub pull requests'), status: 'success', fn: 'list_pull_requests', params: { state: 'open', sort: 'staleness', repos: ['cortex-app'] }, result: '{\n  success: true,\n  count: 12,\n  overdue: 1\n}' },
        ],
        text: L(
          '**今日待审查 PR（12 条）**\n\n按优先级：\n\n1. `#482 修复登录态丢失` · @zhang · 停留 **3 天** ⚠️\n2. `#479 移动端波形组件` · @zhou · 停留 1 天\n3. `#475 任务灰度开关` · @lin · 停留 1 天\n\n有 **1 条**超过 2 天未处理，建议优先跟进 `#482`。',
          '**PRs awaiting review today (12)**\n\nBy priority:\n\n1. `#482 Fix lost login session` · @zhang · open **3 days** ⚠️\n2. `#479 Mobile waveform component` · @zhou · open 1 day\n3. `#475 Task rollout toggle` · @lin · open 1 day\n\n**1** has been open over 2 days — suggest prioritizing `#482`.',
        ),
      },
    ],
    createdAt: now - 5 * HR,
    updatedAt: now - 5 * HR,
    sourceTaskId: ghTask.id,
    sourceRunId: ghRunId,
    sourceTriggeredAt: now - 5 * HR,
  }

  ghTask.runs = [
    { id: ghRunId, status: 'success', startedAt: now - 5 * HR, durationMs: 42000, resultSummary: L('汇总 12 条待审查 PR，1 条超期', 'Compiled 12 PRs awaiting review, 1 overdue'), conversationId: runConvId },
    { id: uid('run_'), status: 'success', startedAt: now - 1 * DAY - 5 * HR, durationMs: 38000, resultSummary: L('汇总 9 条待审查 PR', 'Compiled 9 PRs awaiting review') },
    { id: uid('run_'), status: 'failed', startedAt: now - 2 * DAY - 5 * HR, durationMs: 12000, failureReason: L('GitHub 授权已过期，请重新授权', 'GitHub authorization expired — please re-authorize') },
  ]

  watchTask.runs = [
    { id: uid('run_'), status: 'success', startedAt: now - 2 * HR, durationMs: 9000, resultSummary: L('无新增动态', 'No new activity') },
    { id: uid('run_'), status: 'success', startedAt: now - 6 * HR, durationMs: 11000, resultSummary: L('发现 1 条竞品融资动态，已汇总', 'Found 1 competitor funding update; summarized') },
    { id: uid('run_'), status: 'success', startedAt: now - 10 * HR, durationMs: 8000, resultSummary: L('无新增动态', 'No new activity') },
    { id: uid('run_'), status: 'failed', startedAt: now - 14 * HR, durationMs: 5000, failureReason: L('数据源请求超时', 'Data source request timed out') },
    { id: uid('run_'), status: 'success', startedAt: now - 18 * HR, durationMs: 10000, resultSummary: L('发现 2 条新品发布动态', 'Found 2 product-launch updates') },
    { id: uid('run_'), status: 'success', startedAt: now - 22 * HR, durationMs: 9500, resultSummary: L('无新增动态', 'No new activity') },
  ]

  const reviewTask: ScheduledTask = {
    id: uid('task_'),
    name: L('季度业务复盘', 'Quarterly Business Review'),
    instruction: L(
      '在指定日期生成一份季度业务复盘报告：汇总关键指标、目标达成情况与下一步建议，并发送给我。',
      'On the specified dates, generate a quarterly business review: summarize key metrics, goal attainment, and next-step recommendations, and send it to me.',
    ),
    schedule: buildSchedule({ mode: 'dates', dates: [now - 4 * DAY, now + 6 * DAY, now + 13 * DAY] }),
    status: 'success',
    paused: false,
    source: 'chat',
    sourceLabel: SRC_LABEL,
    capabilities: ['web'],
    mcpServerNames: ['Notion'],
    createdAt: now - 20 * DAY,
    runs: [
      { id: uid('run_'), status: 'success', startedAt: now - 4 * DAY, durationMs: 42000, resultSummary: L('生成 Q2 业务复盘报告，覆盖 5 项核心指标', 'Generated the Q2 business review covering 5 core metrics') },
    ],
    lastRunAt: now - 4 * DAY,
    nextRunAt: 0,
  }
  reviewTask.nextRunAt = computeNextRun(reviewTask.schedule, now)

  const standupTask: ScheduledTask = {
    id: uid('task_'),
    name: L('站会纪要推送', 'Standup Notes Push'),
    instruction: L(
      '每周一、三、五早上 9:30，汇总昨日进展与今日计划，整理成站会纪要推送到团队群。',
      'Every Mon/Wed/Fri at 9:30am, summarize yesterday\'s progress and today\'s plan into standup notes and push them to the team channel.',
    ),
    schedule: buildSchedule({ mode: 'recurring', time: '09:30', weekdays: [1, 3, 5] }),
    status: 'paused',
    paused: true,
    source: 'chat',
    sourceLabel: SRC_LABEL,
    capabilities: ['email'],
    mcpServerNames: [L('飞书 Lark', 'Lark')],
    createdAt: now - 15 * DAY,
    runs: [
      { id: uid('run_'), status: 'success', startedAt: now - 1 * DAY, durationMs: 16000, resultSummary: L('已推送站会纪要给 8 位成员', 'Pushed standup notes to 8 members') },
      { id: uid('run_'), status: 'success', startedAt: now - 3 * DAY, durationMs: 15000, resultSummary: L('已推送站会纪要给 8 位成员', 'Pushed standup notes to 8 members') },
      { id: uid('run_'), status: 'success', startedAt: now - 5 * DAY, durationMs: 17000, resultSummary: L('已推送站会纪要给 7 位成员', 'Pushed standup notes to 7 members') },
      { id: uid('run_'), status: 'success', startedAt: now - 8 * DAY, durationMs: 15000, resultSummary: L('已推送站会纪要给 8 位成员', 'Pushed standup notes to 8 members') },
      { id: uid('run_'), status: 'success', startedAt: now - 10 * DAY, durationMs: 14000, resultSummary: L('已推送站会纪要给 8 位成员', 'Pushed standup notes to 8 members') },
    ],
    lastRunAt: now - 1 * DAY,
    nextRunAt: 0,
  }
  standupTask.nextRunAt = computeNextRun(standupTask.schedule, now)

  const tasks = [ghTask, watchTask, weeklyTask, reviewTask, standupTask]

  const runResultConvs: Conversation[] = []
  for (const task of tasks) {
    for (const run of task.runs) {
      if (run.conversationId) continue
      const failed = run.status === 'failed'
      const cap = task.capabilities[0] || 'scheduler'
      const message: Message = failed
        ? {
            id: uid('m_'),
            role: 'assistant',
            status: 'done',
            createdAt: run.startedAt,
            thinking: L(`执行「${task.name}」，过程中出现错误。`, `Running "${task.name}" — an error occurred.`),
            toolCalls: [
              { id: uid('tc_'), tool: cap, title: L(`执行 ${task.name}`, `Run ${task.name}`), status: 'error', fn: 'run_task', result: `{\n  success: false,\n  error: ${JSON.stringify(run.failureReason || L('执行失败', 'Run failed'))}\n}` },
            ],
            text: L(
              `❌ 本次执行失败：${run.failureReason || '未知错误'}\n\n你可以在任务详情页点「立即运行」重试，或检查任务所需的连接 / 授权后再试。`,
              `❌ This run failed: ${run.failureReason || 'Unknown error'}\n\nYou can tap "Run now" on the task detail page to retry, or check the task's required connections / authorizations and try again.`,
            ),
          }
        : {
            id: uid('m_'),
            role: 'assistant',
            status: 'done',
            createdAt: run.startedAt,
            text: `✅ ${run.resultSummary || L('执行完成', 'Run complete')}`,
          }
      const id = uid('conv_')
      runResultConvs.push({
        id,
        title: L(`${task.name} · ${failed ? '执行失败' : '执行结果'}`, `${task.name} · ${failed ? 'Failed' : 'Result'}`),
        messages: [message],
        createdAt: run.startedAt,
        updatedAt: run.startedAt,
        sourceTaskId: task.id,
        sourceRunId: run.id,
        sourceTriggeredAt: run.startedAt,
      })
      run.conversationId = id
    }
  }

  const conversations: Conversation[] = [
    runConversation,
    ...runResultConvs,
    {
      id: uid('conv_'),
      title: L('API 设计讨论', 'API design discussion'),
      projectId: projProduct.id,
      createdAt: now - 1 * DAY,
      updatedAt: now - 1 * DAY,
      messages: [
        { id: uid('m_'), role: 'user', text: L('帮我评审一下这个分页接口的设计', 'Review the design of this pagination API'), status: 'done', createdAt: now - 1 * DAY },
        { id: uid('m_'), role: 'assistant', status: 'done', createdAt: now - 1 * DAY + 15000, text: L(
          '建议用基于游标（cursor）的分页而不是 offset：\n\n- 数据量大时性能更稳定\n- 插入/删除不会导致错页\n\n返回里带上 `next_cursor` 即可。',
          'Use cursor-based pagination instead of offset:\n\n- More stable performance at scale\n- Inserts/deletes won\'t cause mis-paging\n\nJust include `next_cursor` in the response.',
        ) },
      ],
    },
    {
      id: uid('conv_'),
      title: L('周报草稿', 'Weekly report draft'),
      createdAt: now - 3 * HR,
      updatedAt: now - 3 * HR,
      messages: [
        { id: uid('m_'), role: 'user', text: L('把这几点扩写成一段周报', 'Expand these points into a weekly report'), status: 'done', createdAt: now - 3 * HR },
        { id: uid('m_'), role: 'assistant', status: 'done', createdAt: now - 3 * HR + 12000, text: L(
          '本周完成移动端原型的主要框架搭建，跑通了对话与定时任务的核心链路；下周计划补齐会议模块并进入联调阶段。',
          'This week we built the main framework of the mobile prototype and got the chat and scheduled-task core flows working; next week we plan to complete the meetings module and move into joint testing.',
        ) },
      ],
    },
    {
      id: uid('conv_'),
      title: L('增长实验复盘', 'Growth experiment retro'),
      projectId: projGrowth.id,
      createdAt: now - 4 * DAY,
      updatedAt: now - 4 * DAY,
      messages: [
        { id: uid('m_'), role: 'user', text: L('这次 A/B 实验的结论是什么', 'What\'s the conclusion from this A/B test?'), status: 'done', createdAt: now - 4 * DAY },
        { id: uid('m_'), role: 'assistant', status: 'done', createdAt: now - 4 * DAY + 14000, text: L(
          '实验组转化率提升 **8.3%**，达到显著性（p < 0.05）。建议全量上线，并继续观察留存。',
          'The treatment group\'s conversion rose **8.3%**, reaching significance (p < 0.05). Recommend full rollout while continuing to watch retention.',
        ) },
      ],
    },
  ]

  const notifications: AppNotification[] = [
    {
      id: calNotifId, type: 'approval', createdAt: now - 25 * MIN, read: false,
      title: L('授权请求 · 日历', 'Authorization request · Calendar'),
      requester: 'Workmate',
      purpose: L('读取你的日历事件，以便汇总今日安排并提醒冲突。', 'Read your calendar events to summarize today\'s schedule and flag conflicts.'),
      scopes: [L('日历：只读', 'Calendar: read-only'), L('当天及未来 7 天的事件', 'Events for today and the next 7 days')],
      tool: 'calendar', approvalStatus: 'pending', relatedMessageId: calMsgId, relatedMode: 'workmate',
    },
    {
      id: slackNotifId, type: 'mcp_connect', createdAt: now - 20 * MIN, read: false,
      title: L('连接请求 · Slack', 'Connection request · Slack'),
      body: L('需要连接 Slack 才能继续', 'Connect Slack to continue'),
      relatedServerId: slackId, relatedMessageId: slackMsgId, relatedMode: 'workmate',
    },
    {
      id: mailNotifId, type: 'approval', createdAt: now - 18 * MIN, read: false,
      title: L('授权请求 · 邮件', 'Authorization request · Email'),
      requester: 'Workmate',
      purpose: L('读取你最近的邮件，以便汇总重点与待回复。', 'Read your recent email to summarize highlights and pending replies.'),
      scopes: [L('邮件：只读', 'Email: read-only'), L('最近 24 小时', 'Last 24 hours')],
      tool: 'email', approvalStatus: 'pending', relatedMessageId: mailMsgId, relatedMode: 'workmate',
    },
    {
      id: codeNotifId, type: 'approval', createdAt: now - 16 * MIN, read: false,
      title: L('授权请求 · 代码库', 'Authorization request · Codebase'),
      requester: 'Workmate',
      purpose: L('读取仓库内容以便检索与分析代码。', 'Read repository contents to search and analyze code.'),
      scopes: [L('代码库：只读', 'Codebase: read-only'), L('指定仓库', 'Selected repositories')],
      tool: 'github', approvalStatus: 'pending', relatedMessageId: codeMsgId, relatedMode: 'workmate',
    },
    {
      id: jiraNotifId, type: 'mcp_connect', createdAt: now - 14 * MIN, read: false,
      title: L('连接请求 · Jira', 'Connection request · Jira'),
      body: L('需要连接 Jira 才能继续', 'Connect Jira to continue'),
      relatedServerId: jiraId, relatedMessageId: jiraMsgId, relatedMode: 'workmate',
    },
    {
      id: uid('ntf_'), type: 'task_status', createdAt: now - 5 * HR, read: false,
      title: L('定时任务 · 整理 GitHub PR', 'Scheduled task · Tidy GitHub PRs'),
      body: L('汇总 12 条待审查 PR，1 条超期未处理。', 'Compiled 12 PRs awaiting review; 1 overdue.'),
      taskStatusKind: 'completed', relatedTaskId: ghTask.id, relatedRunId: ghRunId,
    },
    {
      id: uid('ntf_'), type: 'task_status', createdAt: now - 1 * DAY - 5 * HR, read: true,
      title: L('定时任务 · 整理 GitHub PR', 'Scheduled task · Tidy GitHub PRs'),
      body: L('GitHub 授权已过期，请重新授权。', 'GitHub authorization expired — please re-authorize.'),
      taskStatusKind: 'failed', relatedTaskId: ghTask.id,
    },
    {
      id: uid('ntf_'), type: 'task_status', createdAt: now - 6 * DAY, read: true,
      title: L('定时任务 · 整理 GitHub PR', 'Scheduled task · Tidy GitHub PRs'),
      body: L('计划：每天 09:00。', 'Schedule: every day at 09:00.'),
      taskStatusKind: 'created', relatedTaskId: ghTask.id,
    },
    {
      id: uid('ntf_'), type: 'meeting', createdAt: now - 1 * DAY - 2 * HR, read: false,
      title: L('会议纪要已生成 · 产品评审会', 'Meeting notes ready · Product Review'),
      body: L('转写完成，已生成结构化纪要与待办。', 'Transcription complete — structured notes and action items are ready.'),
      meetingStatusKind: 'ready', relatedMeetingId: reviewMeetingId,
    },
    {
      id: uid('ntf_'), type: 'meeting', createdAt: now - 30 * MIN, read: false,
      title: L('转写失败 · 导入音频 · 团队周会', 'Transcription failed · Imported Audio · Team Weekly'),
      body: L('音频处理失败，请重试。', 'Audio processing failed — please retry.'),
      meetingStatusKind: 'failed', relatedMeetingId: importMeetingId,
    },
    {
      id: uid('ntf_'), type: 'contact_request', createdAt: now - 1 * DAY + 3 * HR, read: false,
      title: L('junwei 的 Workmate 想与你建立连接', "junwei's Workmate wants to connect"),
      requesterName: 'junwei', requesterGradient: 'ocean', approvalStatus: 'pending',
    },
    {
      id: uid('ntf_'), type: 'contact_request', createdAt: now - 2 * DAY, read: true,
      title: L('Mia 的 Workmate 想与你建立连接', "Mia's Workmate wants to connect"),
      requesterName: 'Mia', requesterGradient: 'sunset', approvalStatus: 'approved',
    },
  ]

  const review = reviewAnalysis()
  const meetings: Meeting[] = [
    {
      id: reviewMeetingId, title: L('产品评审会 · Q3 路线图', 'Product Review · Q3 Roadmap'),
      createdAt: now - 1 * DAY - 2 * HR, durationMs: 118000, status: 'done', source: 'recording',
      transcript: review.transcript, summaryMarkdown: review.summary, template: 'meeting', summaryUpdatedAt: now - 1 * DAY - 2 * HR,
    },
    {
      id: uid('meet_'), title: L('客户拜访沟通', 'Customer Visit Call'),
      createdAt: now - 3 * HR, durationMs: 65000, status: 'pending', source: 'recording',
      uploadStatus: 'failed', uploadFailReason: 'meet.upload.failedReason',
    },
    {
      id: uid('meet_'), title: L('用户访谈 · 增长方向', 'User Interview · Growth'),
      createdAt: now - 6 * HR, durationMs: 82000, status: 'pending', source: 'recording',
    },
    {
      id: importMeetingId, title: L('导入音频 · 团队周会', 'Imported Audio · Team Weekly'),
      createdAt: now - 30 * MIN, durationMs: 50000, status: 'failed', source: 'import', failureReason: 'meet.failedReason',
    },
  ]

  // ---- MCP servers ----
  const SI = (slug: string) => `https://cdn.simpleicons.org/${slug}`
  const FAV = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  const mcpServers: McpServer[] = [
    {
      id: uid('mcp_'), name: L('飞书 Lark', 'Lark'), desc: L('读写文档、日历与多维表格', 'Read/write docs, calendar, and Base'), auth: 'oauth', authorized: true, enabled: true,
      gradient: 'ocean', letter: L('飞', 'L'), shared: true, publisher: L('字节跳动', 'ByteDance'), logo: FAV('feishu.cn'),
      about: L('连接飞书（Lark），让 Workmate 读写云文档、多维表格、日历与即时消息，把协作和办公自动化串起来。', 'Connect Lark so Workmate can read/write docs, Base tables, calendar, and messages — wiring collaboration and office automation together.'),
      tools: [
        { name: 'send_message', desc: L('向群组或个人发送飞书消息', 'Send a Lark message to a group or person') },
        { name: 'create_doc', desc: L('新建云文档并写入内容', 'Create a doc and write content') },
        { name: 'search_wiki', desc: L('在知识库 / Wiki 中检索文档', 'Search docs in the wiki / knowledge base') },
        { name: 'create_calendar_event', desc: L('创建日程并邀请参与人', 'Create an event and invite attendees') },
        { name: 'search_bitable', desc: L('查询多维表格记录', 'Query Base records') },
      ],
    },
    {
      id: uid('mcp_'), name: 'Google Docs', desc: L('创建与编辑 Google 文档', 'Create and edit Google Docs'), auth: 'oauth', authorized: true, enabled: true,
      gradient: 'brand', letter: 'D', publisher: 'Google', logo: SI('googledocs'),
      about: L('连接 Google Docs，让 Workmate 直接创建、读取并编辑文档——起草、整理、替换内容都能交给它。', 'Connect Google Docs so Workmate can create, read, and edit documents — drafting, organizing, and replacing content.'),
      tools: [
        { name: 'create_document', desc: L('新建一个 Google 文档', 'Create a new Google Doc') },
        { name: 'get_document', desc: L('读取文档的标题与正文内容', 'Read a document\'s title and body') },
        { name: 'insert_text', desc: L('在指定位置插入文本', 'Insert text at a position') },
        { name: 'replace_text', desc: L('查找并替换文档中的文本', 'Find and replace text in a document') },
        { name: 'append_paragraph', desc: L('在文档末尾追加段落', 'Append a paragraph at the end') },
      ],
    },
    {
      id: uid('mcp_'), name: 'GitHub', desc: L('读取仓库、Issue 与 Pull Request', 'Read repos, issues, and pull requests'), auth: 'oauth', authorized: true, enabled: true,
      gradient: 'violet', letter: 'G', shared: true, publisher: 'GitHub', logo: SI('github'),
      about: L('连接 GitHub，让 Workmate 检索代码、查看与创建 Issue / Pull Request，把研发协作纳入对话。', 'Connect GitHub so Workmate can search code, view and create issues / pull requests, bringing dev collaboration into the chat.'),
      tools: [
        { name: 'search_repositories', desc: L('按关键词搜索仓库', 'Search repositories by keyword') },
        { name: 'get_file_contents', desc: L('读取仓库中某个文件的内容', 'Read a file\'s contents in a repo') },
        { name: 'search_code', desc: L('在代码库中全文检索', 'Full-text search across code') },
        { name: 'create_issue', desc: L('在仓库中创建 Issue', 'Create an issue in a repo') },
        { name: 'list_pull_requests', desc: L('列出仓库的 Pull Request', 'List a repo\'s pull requests') },
        { name: 'create_pull_request', desc: L('发起一个 Pull Request', 'Open a pull request') },
      ],
    },
    {
      id: slackId, name: 'Slack', desc: L('发送与读取频道消息', 'Send and read channel messages'), auth: 'oauth', authorized: false, enabled: false,
      gradient: 'sunset', letter: 'S', publisher: 'Slack', logo: FAV('slack.com'),
      about: L('连接 Slack，让 Workmate 收发频道与私信消息、汇总讨论、按需通知团队。', 'Connect Slack so Workmate can send/read channel and DM messages, summarize discussions, and notify the team.'),
      tools: [
        { name: 'list_channels', desc: L('列出工作区的频道', 'List the workspace\'s channels') },
        { name: 'post_message', desc: L('向频道或私信发送消息', 'Post a message to a channel or DM') },
        { name: 'reply_to_thread', desc: L('在消息的话题串中回复', 'Reply within a message thread') },
        { name: 'get_channel_history', desc: L('读取频道的历史消息', 'Read a channel\'s message history') },
        { name: 'add_reaction', desc: L('给消息添加 emoji 表情回应', 'Add an emoji reaction to a message') },
      ],
    },
    {
      id: jiraId, name: 'Jira', desc: L('管理需求、缺陷与迭代看板', 'Manage stories, bugs, and sprint boards'), auth: 'oauth', authorized: false, enabled: false,
      gradient: 'ocean', letter: 'J', shared: true, publisher: 'Atlassian', logo: SI('jira'),
      about: L('连接 Jira，让 Workmate 用 JQL 检索事项、创建与流转工单、跟进迭代进度。', 'Connect Jira so Workmate can search issues with JQL, create and transition tickets, and track sprint progress.'),
      tools: [
        { name: 'search_issues', desc: L('用 JQL 搜索事项', 'Search issues with JQL') },
        { name: 'get_issue', desc: L('获取某个事项的详情', 'Get an issue\'s details') },
        { name: 'create_issue', desc: L('创建需求 / 缺陷工单', 'Create a story / bug ticket') },
        { name: 'update_issue', desc: L('更新事项字段', 'Update issue fields') },
        { name: 'add_comment', desc: L('给事项添加评论', 'Add a comment to an issue') },
        { name: 'transition_issue', desc: L('推进事项到下一个状态', 'Move an issue to the next state') },
      ],
    },
    {
      id: uid('mcp_'), name: 'Google Calendar', desc: L('查询日程、创建会议邀请', 'Query schedule, create meeting invites'), auth: 'oauth', authorized: false, enabled: false,
      gradient: 'mint', letter: 'C', publisher: 'Google', logo: SI('googlecalendar'),
      about: L('连接 Google Calendar，让 Workmate 查看日程、创建与调整会议、寻找空闲时间。', 'Connect Google Calendar so Workmate can view your schedule, create and adjust meetings, and find free time.'),
      tools: [
        { name: 'list_events', desc: L('列出指定时间范围的日程', 'List events in a time range') },
        { name: 'create_event', desc: L('创建日程并发送邀请', 'Create an event and send invites') },
        { name: 'update_event', desc: L('修改已有日程', 'Modify an existing event') },
        { name: 'delete_event', desc: L('删除一个日程', 'Delete an event') },
        { name: 'find_free_time', desc: L('在参与人之间寻找空闲时段', 'Find free slots among attendees') },
      ],
    },
    {
      id: uid('mcp_'), name: 'Notion', desc: L('检索与更新知识库页面', 'Search and update knowledge-base pages'), auth: 'none', authorized: true, enabled: false,
      gradient: 'violet', letter: 'N', publisher: 'Notion', logo: SI('notion'),
      about: L('连接 Notion，让 Workmate 搜索页面、读写内容、查询数据库，把知识库变成可对话的工作台。', 'Connect Notion so Workmate can search pages, read/write content, and query databases — turning your knowledge base into a conversational workspace.'),
      tools: [
        { name: 'search', desc: L('搜索页面与数据库', 'Search pages and databases') },
        { name: 'get_page', desc: L('读取页面内容', 'Read page content') },
        { name: 'create_page', desc: L('新建页面', 'Create a page') },
        { name: 'update_page', desc: L('更新页面属性与内容', 'Update page properties and content') },
        { name: 'query_database', desc: L('按条件查询数据库', 'Query a database by criteria') },
        { name: 'append_block', desc: L('向页面追加内容块', 'Append a content block to a page') },
      ],
    },
    {
      id: uid('mcp_'), name: L('数据透视 DataHub', 'DataHub'), desc: L('查询指标与生成分析报表', 'Query metrics and build analytics reports'), auth: 'none', authorized: true, enabled: false,
      gradient: 'amber', letter: 'H', publisher: 'Acryl Data', logo: FAV('datahubproject.io'),
      about: L('连接 DataHub 元数据平台，让 Workmate 检索数据资产、查看血缘与业务术语，辅助数据分析。', 'Connect the DataHub metadata platform so Workmate can search data assets, view lineage and business glossary, and assist analysis.'),
      tools: [
        { name: 'search_entities', desc: L('搜索数据集、看板等元数据实体', 'Search metadata entities like datasets and dashboards') },
        { name: 'get_dataset', desc: L('获取数据集的 schema 与说明', 'Get a dataset\'s schema and description') },
        { name: 'get_lineage', desc: L('查询数据血缘上下游', 'Query upstream/downstream data lineage') },
        { name: 'list_glossary_terms', desc: L('列出业务术语表', 'List business glossary terms') },
      ],
    },
  ]

  const memories: MemoryItem[] = [
    { id: uid('mem_'), text: L('负责 Cobo Portal 内的智能合约钱包（Smart Contract Wallet）。', 'Owns the Smart Contract Wallet within Cobo Portal.'), createdAt: now - 2 * DAY },
    { id: uid('mem_'), text: L('正在设计一款同时支持资金池与非资金池两种模式的链上钱包产品。', 'Designing an on-chain wallet product that supports both pooled and non-pooled modes.'), createdAt: now - 4 * DAY },
    { id: uid('mem_'), text: L('做产品决策时偏好从第一性原理出发分析。', 'Prefers reasoning from first principles when making product decisions.'), createdAt: now - 9 * DAY },
    { id: uid('mem_'), text: L('对 AI 相关知识与资讯有浓厚兴趣，喜欢理解其背后的底层逻辑与驱动因素。', 'Keenly interested in AI knowledge and news, and likes understanding the underlying logic and drivers.'), createdAt: now - 12 * DAY },
    { id: uid('mem_'), text: L('所在公司是一家虚拟货币托管机构。', 'Works at a digital-asset custody company.'), createdAt: now - 18 * DAY },
    { id: uid('mem_'), text: L('沟通偏好中文，回答希望先给结论再给要点。', 'Prefers communicating in Chinese, with the conclusion first and key points after.'), createdAt: now - 25 * DAY },
    { id: uid('mem_'), text: L('主要拍摄风光题材 / 喜欢风光摄影。', 'Mainly shoots landscapes / enjoys landscape photography.'), createdAt: now - 40 * DAY },
  ]

  const skills: Skill[] = [
    { id: uid('skill_'), name: L('周报生成', 'Weekly Report'), desc: L('汇总本周进展，按结论 + 要点生成周报', 'Compiles weekly progress into a conclusion + key-points report'), enabled: true, icon: 'report', gradient: 'brand', letter: L('周', 'W') },
    { id: uid('skill_'), name: L('竞品分析', 'Competitor Analysis'), desc: L('抓取竞品信息并整理成对比要点', 'Gathers competitor info into comparison points'), enabled: true, icon: 'search', gradient: 'violet', letter: L('竞', 'C') },
    { id: uid('skill_'), name: L('会议待办提取', 'Action-Item Extraction'), desc: L('从会议纪要中自动提取待办项', 'Auto-extracts action items from meeting notes'), enabled: true, icon: 'checklist', gradient: 'ocean', letter: L('会', 'A') },
    { id: uid('skill_'), name: L('邮件起草', 'Email Drafting'), desc: L('根据要点起草中英文邮件', 'Drafts emails in Chinese or English from key points'), enabled: false, icon: 'mail', gradient: 'sunset', letter: L('邮', 'E') },
    { id: uid('skill_'), name: L('PRD 评审', 'PRD Review'), desc: L('基于第一性原理检查 PRD 漏洞', 'Checks PRDs for gaps from first principles'), enabled: false, icon: 'review', gradient: 'mint', letter: 'P' },
    { id: uid('skill_'), name: L('数据透视', 'Data Pivot'), desc: L('把原始数据透视成图表与洞察', 'Pivots raw data into charts and insights'), enabled: false, icon: 'chart', gradient: 'amber', letter: L('数', 'D') },
  ]

  return {
    account,
    persona,
    agents,
    workmateMessages,
    projects,
    conversations,
    notifications,
    tasks,
    meetings,
    mcpServers,
    memories,
    skills,
  }
}
