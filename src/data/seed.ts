import {
  type Account,
  type Agent,
  type AppNotification,
  type Conversation,
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

// ---- Models ----------------------------------------------------------------

export const MODELS: ModelOption[] = [
  { id: 'claude-opus-4-8', vendor: 'Anthropic', name: 'Claude Opus 4.8', desc: '最强推理 · Most capable' },
  { id: 'claude-sonnet-4-6', vendor: 'Anthropic', name: 'Claude Sonnet 4.6', desc: '均衡快速 · Balanced' },
  { id: 'gpt-5-5', vendor: 'OpenAI', name: 'GPT-5.5', desc: '通用 · General' },
  { id: 'gemini-3-1-pro', vendor: 'Google', name: 'Gemini 3.1 Pro', desc: '长上下文 · Long context' },
  { id: 'deepseek-v3', vendor: 'DeepSeek', name: 'DeepSeek V3', desc: '高性价比 · Cost-efficient' },
]

export const DEFAULT_MODEL_ID = 'claude-sonnet-4-6'

// ---- Meeting analysis templates (content stays in the recorded language) ---

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
      seg('主持人', 0, 0, 7000, '好，我们开始今天的产品评审，主要过一下 Q3 路线图，先请产品同学讲一下整体规划。'),
      seg('产品 · 林悦', 1, 7000, 22000, 'Q3 我们聚焦三件事：第一是 Workmate 的多端打通，第二是定时任务的稳定性，第三是会议纪要的转写质量。优先级上，多端打通排第一。'),
      seg('研发 · 张航', 2, 22000, 37000, '多端打通这块，移动端我评估下来大概需要三周，主要是状态同步和离线处理。定时任务的稳定性我建议这个季度做灰度，先覆盖 20% 的用户。'),
      seg('主持人', 0, 37000, 44000, '灰度的指标怎么定？我们得有个明确的成功标准。'),
      seg('研发 · 张航', 2, 44000, 58000, '我建议任务执行成功率到 99.5% 以上，并且 P95 延迟控制在两秒内，连续观察一周达标就全量。'),
      seg('设计 · 周敏', 3, 58000, 74000, '会议纪要这块，我希望转写完成后能自动高亮待办项，用户一眼能看到要跟进什么。这个体验上很关键。'),
      seg('产品 · 林悦', 1, 74000, 88000, '同意，那我们把"待办自动提取"列为会议模块的 must-have，放进 Q3 范围。'),
      seg('主持人', 0, 88000, 99000, '好，那我总结一下行动项：张航负责多端打通的排期和灰度方案，周敏出会议纪要的交互稿，林悦更新路线图文档。'),
      seg('产品 · 林悦', 1, 99000, 110000, '没问题，我周五之前把更新后的路线图同步到文档里，也会同步给管理层。'),
      seg('主持人', 0, 110000, 118000, '那今天就到这里，谢谢大家。'),
    ],
    summary: `## 会议总结

**主题**：Q3 产品路线图评审

### 关键结论
- Q3 聚焦三大方向，**多端打通**为最高优先级。
- 定时任务稳定性本季度采用**灰度发布**（先覆盖 20% 用户）。
- 会议纪要新增**待办自动提取**，列为 must-have。

### 待办事项
- [ ] **张航**：输出多端打通排期与灰度方案（成功标准：执行成功率 ≥ 99.5%，P95 延迟 < 2s）
- [ ] **周敏**：完成会议纪要"待办高亮"的交互稿
- [ ] **林悦**：周五前更新路线图文档并同步管理层

### 风险与关注
- 移动端状态同步与离线处理为主要技术风险，预计需 3 周。`,
  }
}

export function interviewAnalysis(): Analysis {
  return {
    transcript: [
      seg('访谈员', 0, 0, 9000, '感谢你抽时间参加访谈，想先了解下，你平时在工作里最花时间、又比较重复的事情是什么？'),
      seg('受访者 · 用户A', 1, 9000, 26000, '说实话，最烦的是每天要去几个系统里收集信息，然后手动整理成日报。基本上每天早上要花半小时做这件事。'),
      seg('访谈员', 0, 26000, 34000, '那如果有个助手能每天自动帮你整理好，你会用吗？'),
      seg('受访者 · 用户A', 1, 34000, 50000, '当然会，前提是它整理得准，而且我能信任它。如果它要去连我的邮箱或者日历，我希望我能控制它能看哪些、不能看哪些。'),
      seg('访谈员', 0, 50000, 58000, '理解。那在"信任"这件事上，什么会让你更安心？'),
      seg('受访者 · 用户A', 1, 58000, 74000, '每次它要动我的数据，最好先问我一下，我点同意它才做。而且授权能设个期限，比如就这一周有效，过了自动收回。'),
      seg('访谈员', 0, 74000, 82000, '非常清楚，这对我们很有帮助，谢谢你的分享。'),
    ],
    summary: `## 用户访谈纪要

**主题**：增长方向 · 重复性工作与信任机制

### 核心洞察
- 用户每天约 **30 分钟**用于跨系统收集信息、手工整理日报，痛点明确。
- 愿意使用自动整理助手，但前提是**准确**且**可信任**。

### 关键诉求
- **细粒度授权**：可控制助手能访问哪些数据源。
- **逐次确认**：助手访问数据前先征求同意。
- **授权有效期**：支持设置期限（如本周有效），到期自动收回。

### 产品启示
- 验证了"工具调用审批 + 授权有效期"的设计方向。`,
  }
}

export function genericAnalysis(): Analysis {
  return {
    transcript: [
      seg('说话人 1', 0, 0, 8000, '我们先同步一下本周的进展，然后看看有没有需要协调的地方。'),
      seg('说话人 2', 1, 8000, 21000, '这周我主要在推进对接的事情，整体顺利，预计下周能完成联调。'),
      seg('说话人 1', 0, 21000, 30000, '好的，那有没有什么阻塞，需要其他同学支持的？'),
      seg('说话人 2', 1, 30000, 42000, '暂时没有，如果联调出问题我会及时同步。另外建议下周开始准备测试用例。'),
      seg('说话人 1', 0, 42000, 50000, '可以，那我们下周再对齐一次进度。'),
    ],
    summary: `## 会议总结

### 进展
- 对接工作推进顺利，预计下周完成联调。

### 待办事项
- [ ] 下周开始准备测试用例
- [ ] 下周再对齐一次进度

### 备注
- 当前无阻塞项。`,
  }
}

// ---- Summary templates -----------------------------------------------------
// The template decides the SUMMARY content FORMAT only; the transcript (raw dialogue)
// stays scenario-based via analysisFor(). Names/descriptions live in i18n (meet.template.*).

export const SUMMARY_TEMPLATES: { key: SummaryTemplate }[] = [
  { key: 'meeting' },
  { key: 'customer' },
  { key: 'interview' },
  { key: 'generic' },
  { key: 'actions' },
]

// Guess a summary template from the recording title (keyword routing). Used to pre-select
// a sensible template both for the auto-转译 kicked off at save and for the detail-page
// template picker's default. Mirrors analysisFor()'s scenario routing.
export function guessTemplate(title: string): SummaryTemplate {
  if (/面试|访谈|interview/i.test(title)) return 'interview'
  if (/客户|customer|client/i.test(title)) return 'customer'
  if (/评审|会议|周会|review|meeting/i.test(title)) return 'meeting'
  return 'generic'
}

// Mock summary generator — each template returns a visibly different markdown FORMAT.
// `m.title` is woven into the heading so the summary reads as belonging to this recording;
// an optional `note` (user-provided background) is surfaced as a blockquote under the heading
// so it's visible the AI took it into account.
export function summaryForTemplate(key: SummaryTemplate, m?: { title?: string }, note?: string): string {
  const base = summaryBody(key, m)
  const trimmed = note?.trim()
  if (!trimmed) return base
  const [head, ...rest] = base.split('\n\n')
  return `${head}\n\n> 背景补充：${trimmed}\n\n${rest.join('\n\n')}`
}

function summaryBody(key: SummaryTemplate, m?: { title?: string }): string {
  const title = m?.title ? `：${m.title}` : ''
  switch (key) {
    case 'meeting':
      return `## 会议纪要${title}

### 决议事项
- 本季度聚焦三大方向，**多端打通**为最高优先级。
- 定时任务稳定性采用**灰度发布**，先覆盖 20% 用户。
- 「待办自动提取」列为会议模块的 must-have。

### 待办事项
- [ ] **@张航**：输出多端打通排期与灰度方案
- [ ] **@周敏**：完成会议纪要交互稿
- [ ] **@林悦**：更新路线图文档并同步管理层

### 风险与关注
- 移动端状态同步与离线处理为主要技术风险，预计需 3 周。`
    case 'customer':
      return `## 客户沟通总结${title}

### 客户背景
- 中型团队，当前用多套工具拼接日报流程，痛点明确。

### 核心诉求
- 希望一处**自动汇总**跨系统信息，减少人工整理。
- 对数据**授权与可控**高度敏感，需要细粒度权限。

### 承诺与下一步
- [ ] 本周内提供一版可演示的自动汇总流程
- [ ] 补充企业版安全合规材料

### 商机评估
- **意向度**：中高　**预计规模**：30–50 席位　**关键阻力**：安全合规审批`
    case 'interview':
      return `## 面试评估${title}

### 评价维度
- **专业能力**：4 / 5 — 项目经验扎实，能讲清权衡取舍。
- **沟通表达**：4 / 5 — 表达清晰，能照顾听众背景。
- **文化匹配**：3.5 / 5 — 主动性强，需确认对节奏的适应。

### 亮点
- 有从 0 到 1 的完整落地经验，结果导向。

### 顾虑
- 大规模协作经验偏少，需在下一轮深入考察。

### 录用建议
- **倾向**：推荐进入下一轮（侧重系统设计与协作）。`
    case 'actions':
      return `## 行动项清单${title}

- [ ] **@张航**：输出多端打通排期与灰度方案 · 截止 周五
- [ ] **@周敏**：完成会议纪要「待办高亮」交互稿 · 截止 下周三
- [ ] **@林悦**：更新路线图文档并同步管理层 · 截止 周五
- [ ] **@你**：跟进上线前的回归测试 · 截止 本周内

> 共 4 项行动，其中 2 项本周到期。`
    case 'generic':
    default:
      return `## 纪要${title}

### 进展
- 对接工作推进顺利，预计下周完成联调。

### 待办事项
- [ ] 下周开始准备测试用例
- [ ] 下周再对齐一次进度

### 备注
- 当前无阻塞项。`
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

export function buildSeed(): SeedData {
  const now = Date.now()

  const account: Account = {
    id: 'U-7F3A9C21',
    name: 'Jianing',
    email: 'jianing.jiang@cobo.com',
    avatarGradient: 'brand',
  }

  const persona: Persona = {
    name: 'Workmate',
    description: '你的专属 AI 工作助理',
    avatarGradient: 'brand',
    systemPrompt:
      '你是 Jianing 的专属工作助理 Workmate。你有记忆，能跨工具替用户办事。\n\n你的风格：简洁、专业、主动。回答优先给结论，再给要点。\n当用户让你"定时做某事"时，先确认时间与范围，再创建定时任务；信息不全时主动反问澄清，不要乱建。\n在动用外部能力（如日历、代码库、邮件）前，先向用户申请授权。',
    modelId: DEFAULT_MODEL_ID,
  }

  // Agents shown in the Agents-mode switcher. STABLE literal ids: the catalog is
  // never persisted (always rebuilt from seed) — only `activeAgentId` persists — so
  // ids must stay constant across reloads or the saved selection wouldn't match.
  const agents: Agent[] = [
    // Built-in (system-provided)
    { id: 'agent_auto', name: 'Auto Agent', org: 'builtin', builtin: true, avatarGradient: 'brand', desc: '自动路由到最合适的智能体' },
    { id: 'agent_knowledge', name: 'KnowledgeAgent', org: 'builtin', builtin: true, avatarGradient: 'ocean', desc: '检索知识库，回答业务问题' },
    { id: 'agent_okrkg', name: 'OKRKGAgent', org: 'builtin', builtin: true, avatarGradient: 'violet', desc: '对齐 OKR 与知识图谱' },
    { id: 'agent_planning', name: 'Planning Agent', org: 'builtin', builtin: true, avatarGradient: 'mint', desc: '拆解目标，生成执行计划' },
    { id: 'agent_strategy', name: 'StrategyAgent', org: 'builtin', builtin: true, avatarGradient: 'sunset', desc: '竞品与市场策略分析' },
    // Cobo
    { id: 'agent_cobo_support', name: '客服助手', org: 'cobo', avatarGradient: 'ocean', desc: '处理客户工单与常见问题' },
    { id: 'agent_cobo_compliance', name: '合规审查助手', org: 'cobo', avatarGradient: 'violet', desc: 'KYT / KYC 合规初筛' },
    // Sales & BD
    { id: 'agent_sales_lead', name: '线索挖掘助手', org: 'salesBd', avatarGradient: 'amber', desc: '挖掘并初筛销售线索' },
    { id: 'agent_sales_brief', name: '客户简报助手', org: 'salesBd', avatarGradient: 'sunset', desc: '生成客户背景简报' },
    // Operation & Growth
    { id: 'agent_growth_metrics', name: '增长指标助手', org: 'opsGrowth', avatarGradient: 'mint', desc: '拉取并解读增长指标' },
    // RD
    { id: 'agent_rd_pr', name: 'PR 巡检助手', org: 'rd', avatarGradient: 'ocean', desc: '巡检 PR 与代码评审' },
    { id: 'agent_rd_oncall', name: 'On-call 助手', org: 'rd', avatarGradient: 'violet', desc: '汇总告警与值班事项' },
    // Default
    { id: 'agent_blank', name: '空白助手', org: 'default', avatarGradient: 'brand', desc: '无预设，从零开始' },
  ]

  // Stable ids shared across slices (notification ↔ in-chat card ↔ MCP server).
  // Declared up-front so the seeded Workmate cards and their notifications stay linked.
  const calNotifId = uid('ntf_') // calendar approval (pending) — jumps to its in-chat card
  const calMsgId = uid('m_') // the Workmate assistant message holding that approval card
  const slackNotifId = uid('ntf_') // Slack connection request (oauth) — jumps to its connect card
  const slackMsgId = uid('m_') // the Workmate assistant message holding that connect card
  // More "回到 Workmate 确认" mocks — each notification jumps back to a live in-chat card.
  const mailNotifId = uid('ntf_') // email-access approval (pending)
  const mailMsgId = uid('m_')
  const codeNotifId = uid('ntf_') // codebase-access approval (pending)
  const codeMsgId = uid('m_')
  const jiraNotifId = uid('ntf_') // Jira oauth connection request
  const jiraMsgId = uid('m_')
  // Stable (non-uid) ids: onRehydrate rebuilds mcpServers from a fresh seed (regenerating
  // uids), so a uid here would be orphaned from the seeded card/notification references on
  // reload. A fixed id stays identical across every freshSeedSlices() build, keeping the
  // mcp_connect notification ↔ in-chat connect card linkage intact.
  const slackId = 'mcp_slack_seed' // the Slack MCP server (referenced by both card + notification)
  const jiraId = 'mcp_jira_seed' // the Jira MCP server (referenced by both card + notification)

  // ---- Workmate continuous history (deep backlog so scroll-up paging is visible) ----
  const wm = (
    role: 'user' | 'assistant',
    text: string,
    createdAt: number,
    extra: Partial<Message> = {},
  ): Message => ({ id: uid('m_'), role, text, status: 'done', createdAt, ...extra })

  const workmateMessages: Message[] = [
    wm('user', '帮我列一下这周的工作重点', now - 10 * DAY),
    wm(
      'assistant',
      '这周建议聚焦三件事：\n\n1. **完成移动端原型**：跑通核心链路。\n2. **准备 Q3 评审**：整理路线图材料。\n3. **跟进招聘**：安排两场面试。',
      now - 10 * DAY + 25000,
    ),
    wm('user', '把竞品最近的动态整理一下', now - 9 * DAY),
    wm(
      'assistant',
      '近期竞品动态：\n\n- **A 公司**：上线了新版协作功能。\n- **B 公司**：完成新一轮融资。\n\n我们的差异点仍是"持续协作 + 跨工具自动化"。',
      now - 9 * DAY + 25000,
    ),
    wm('user', '这段产品介绍帮我润色得更专业一些', now - 8 * DAY),
    wm(
      'assistant',
      '润色后：\n\n> Cortex Workmate 是你的随身 AI 工作助理：有记忆、能跨工具替你执行重复事务，并在关键动作上征求你的授权。',
      now - 8 * DAY + 25000,
    ),
    wm('user', '用三点总结一下敏捷开发', now - 7 * DAY),
    wm(
      'assistant',
      '1. **小步快跑**：短迭代、频繁交付。\n2. **持续反馈**：快速验证与调整。\n3. **协作透明**：信息对齐，减少返工。',
      now - 7 * DAY + 25000,
      { reaction: 'up' },
    ),
    wm('user', '帮我起草一封周会通知', now - 6 * DAY),
    wm(
      'assistant',
      '【周会通知】本周五 15:00 在 3 号会议室召开例会。\n\n议题：进度同步 · 风险对齐 · 下周计划。请提前准备各自模块的更新。',
      now - 6 * DAY + 25000,
    ),
    wm('user', '评审一下这个分页接口的设计', now - 5 * DAY),
    wm(
      'assistant',
      '建议用基于**游标（cursor）**的分页：\n\n- 数据量大时性能更稳定\n- 插入/删除不会错页\n\n返回里带上 `next_cursor` 即可。',
      now - 5 * DAY + 25000,
      { favoritedAt: now - 2 * HR },
    ),
    wm('user', '我想做个用户增长实验，给点思路', now - 4 * DAY),
    wm(
      'assistant',
      '可以分三步：\n\n1. **明确指标**：如激活率 / 次日留存。\n2. **小范围 A/B**：只动一个变量。\n3. **看到显著性再放量**。',
      now - 4 * DAY + 25000,
    ),
    wm('user', '把上周的 OKR 草稿再精简一下', now - 3 * DAY),
    wm(
      'assistant',
      '精简版：\n\n- **O**：让移动端体验达到可演示标准。\n- **KR1**：核心链路全部跑通。\n- **KR2**：关键交互满意度 ≥ 4.5/5。',
      now - 3 * DAY + 25000,
      { favoritedAt: now - 1 * DAY },
    ),
    wm('user', '帮我准备产品评审会的开场白', now - 2 * DAY - 8 * HR),
    wm(
      'assistant',
      '开场可以这样说：\n\n"今天我们用 30 分钟过一遍 Q3 路线图，重点对齐优先级与成功标准，欢迎随时打断提问。"',
      now - 2 * DAY - 8 * HR + 25000,
    ),
    wm('user', '简单解释一下 MPC 钱包的原理', now - 2 * DAY - 4 * HR),
    wm(
      'assistant',
      'MPC 钱包把私钥拆成多个分片，由不同方分别保管；签名时各方协作计算，**私钥从不完整出现**，从而降低单点泄露风险。',
      now - 2 * DAY - 4 * HR + 25000,
    ),
    wm('user', '帮我看看这周有哪些重要的事', now - 2 * DAY - 3 * HR),
    wm(
      'assistant',
      '这周有三件重点：\n\n1. **周三**：Q3 路线图评审（你是主讲）\n2. **周四**：与增长团队的用户访谈\n3. **周五**：提交季度 OKR 草稿\n\n要我把评审材料先整理一版吗？',
      now - 2 * DAY - 3 * HR + 20000,
      { thinking: '回顾本周日历与待办，挑出优先级高的事项。' },
    ),
    wm('user', '先把上次的竞品分析整理成要点', now - 1 * DAY - 5 * HR),
    wm(
      'assistant',
      '已整理为要点：\n\n- **定位差异**：竞品偏通用助手，我们强调"持续协作 + 跨工具执行"。\n- **核心壁垒**：记忆与定时自动化是我们的差异点。\n- **风险**：对方在转写质量上领先，需要我们补齐。\n\n需要我做成一页纸的对比表吗？',
      now - 1 * DAY - 5 * HR + 18000,
      { reaction: 'up' },
    ),
    // --- Live approval card: a pending calendar authorization the user can resolve here.
    //     The notification (calNotifId) points back to this message.
    wm('user', '看下我今天的日历安排', now - 26 * MIN),
    wm(
      'assistant',
      '这个操作需要你的授权。我已发起申请，你可以在**下方卡片**或**通知中心**选择授权有效期并同意，我就继续。',
      now - 25 * MIN,
      {
        id: calMsgId,
        thinking: '需要访问你的日历才能继续。',
        toolCalls: [
          {
            id: uid('tc_'),
            tool: 'calendar',
            title: '访问日历',
            status: 'awaiting_approval',
            approvalId: calNotifId,
            fn: 'read_calendar',
            params: { scope: 'readonly', range: 'today..+7d' },
          },
        ],
      },
    ),
    // --- Live connect card: a Slack oauth connection request the user can complete here.
    //     The notification (slackNotifId) points back to this message.
    wm('user', '把刚才这条整理同步到 Slack', now - 21 * MIN),
    wm(
      'assistant',
      '要完成这个操作，需要先连接 **Slack**。点下面的卡片完成授权并连接，连上后我就继续。',
      now - 20 * MIN,
      { id: slackMsgId, thinking: '这个操作需要先连接 Slack。', mcpRequestId: slackId },
    ),
    // --- More live "回到 Workmate 确认" cards (email / codebase approvals + Jira connect).
    wm('user', '帮我看看最近有哪些邮件需要回复', now - 19 * MIN),
    wm(
      'assistant',
      '这个操作需要你的授权。可在**下方卡片**或**通知中心**选择授权有效期并同意，我就继续。',
      now - 18 * MIN,
      {
        id: mailMsgId,
        thinking: '需要访问你的邮箱才能继续。',
        toolCalls: [
          {
            id: uid('tc_'),
            tool: 'email',
            title: '访问邮箱',
            status: 'awaiting_approval',
            approvalId: mailNotifId,
            fn: 'read_email',
            params: { scope: 'readonly', range: 'last_24h' },
          },
        ],
      },
    ),
    wm('user', '在我的代码库里搜一下登录相关的实现', now - 17 * MIN),
    wm(
      'assistant',
      '这个操作需要你的授权。可在**下方卡片**或**通知中心**选择授权有效期并同意，我就继续。',
      now - 16 * MIN,
      {
        id: codeMsgId,
        thinking: '需要访问你的代码库才能继续。',
        toolCalls: [
          {
            id: uid('tc_'),
            tool: 'github',
            title: '访问代码库',
            status: 'awaiting_approval',
            approvalId: codeNotifId,
            fn: 'read_codebase',
            params: { scope: 'readonly', repos: 'selected' },
          },
        ],
      },
    ),
    wm('user', '把这个 bug 在 Jira 里建个工单', now - 15 * MIN),
    wm(
      'assistant',
      '要完成这个操作，需要先连接 **Jira**。点下面的卡片完成授权并连接，连上后我就继续。',
      now - 14 * MIN,
      { id: jiraMsgId, thinking: '这个操作需要先连接 Jira。', mcpRequestId: jiraId },
    ),
  ]

  // ---- Projects ----
  const projProduct: Project = { id: uid('proj_'), name: '产品迭代', createdAt: now - 10 * DAY }
  const projGrowth: Project = { id: uid('proj_'), name: '增长实验', createdAt: now - 8 * DAY }
  const projects = [projProduct, projGrowth]

  // ---- Tasks (created earlier via chat) ----
  const ghTask: ScheduledTask = {
    id: uid('task_'),
    name: '整理 GitHub PR',
    instruction:
      '每天早上 9 点，汇总我负责仓库里所有待审查（open）的 Pull Request，按优先级排序，列出标题、作者、停留时长，并标出超过 2 天未处理的 PR。',
    schedule: {
      kind: 'daily',
      timeOfDay: '09:00',
      humanZh: '每天 09:00',
      humanEn: 'Every day at 09:00',
    },
    status: 'success',
    paused: false,
    source: 'chat',
    sourceLabel: 'Workmate 对话',
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
    name: '竞品动态巡检',
    instruction: '每 4 小时检索一次设定关键词（竞品名 + "发布"/"融资"），有新动态时汇总要点。',
    schedule: buildSchedule({ mode: 'interval', intervalMinutes: 240, startAt: now - 2 * DAY }),
    status: 'success',
    paused: false,
    source: 'chat',
    sourceLabel: 'Workmate 对话',
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
    name: '产品组 OKR 周报',
    instruction:
      '每周日晚上 8 点，自动汇总产品组同事本周的 OKR 进展，生成一份结构化的中文周报并发送给我。\n\n' +
      '执行要求：\n' +
      '1. 确定范围：定位「产品组」的全体成员，只统计该组同事，不遗漏、也不混入其他团队。\n' +
      '2. 获取周期：读取当前正在生效的 OKR 周期，确保统计的是本周期目标，而非历史周期。\n' +
      '3. 逐人核对：依次检查每位同事本周的 OKR 更新与周报记录，提取关键进展、完成度（KR 百分比）与风险 / 阻塞项。\n' +
      '4. 结构化输出：用中文输出一份结构清晰的报告，包含「整体概览」「按人汇总（姓名 · 目标 · 本周进展 · 完成度 · 风险）」「需重点关注的风险项」三个部分。\n' +
      '5. 数据来源：严格基于我有权限访问的文档与系统，不要编造或推测；无法访问的内容请明确标注「暂无数据」。\n' +
      '6. 发送结果：将最终报告以邮件形式发送给我（jianing.jiang@cobo.com）。',
    schedule: {
      kind: 'weekly',
      weekday: 0,
      weekdays: [0],
      timeOfDay: '20:00',
      humanZh: '每周日 20:00',
      humanEn: 'Every Sun at 20:00',
    },
    status: 'success',
    paused: false,
    source: 'chat',
    sourceLabel: 'Workmate 对话',
    capabilities: ['email'],
    mcpServerNames: ['飞书 Lark', 'Notion'],
    createdAt: now - 12 * DAY,
    runs: [],
    lastRunAt: now - 2 * DAY,
    nextRunAt: computeNextRun(
      { kind: 'weekly', weekday: 0, weekdays: [0], timeOfDay: '20:00', humanZh: '', humanEn: '' },
      now,
    ),
  }
  weeklyTask.runs = [
    {
      id: uid('run_'),
      status: 'success',
      startedAt: now - 2 * DAY,
      durationMs: 58000,
      resultSummary: '汇总产品组 6 位同事本周 OKR，2 项存在风险',
    },
    {
      id: uid('run_'),
      status: 'success',
      startedAt: now - 9 * DAY,
      durationMs: 51000,
      resultSummary: '汇总产品组 6 位同事本周 OKR，全部按计划推进',
    },
  ]

  // ---- A conversation created by a task run (linkage showcase) ----
  const runConvId = uid('conv_')
  const ghRunId = uid('run_')
  const runConversation: Conversation = {
    id: runConvId,
    title: '整理 GitHub PR · 执行结果',
    messages: [
      {
        id: uid('m_'),
        role: 'assistant',
        status: 'done',
        createdAt: now - 5 * HR,
        thinking: '拉取 open 状态的 PR，按停留时长与优先级排序。',
        toolCalls: [
          {
            id: uid('tc_'),
            tool: 'github',
            title: '读取 GitHub Pull Requests',
            status: 'success',
            fn: 'list_pull_requests',
            params: { state: 'open', sort: 'staleness', repos: ['cortex-app'] },
            result: '{\n  success: true,\n  count: 12,\n  overdue: 1\n}',
          },
        ],
        text: '**今日待审查 PR（12 条）**\n\n按优先级：\n\n1. `#482 修复登录态丢失` · @zhang · 停留 **3 天** ⚠️\n2. `#479 移动端波形组件` · @zhou · 停留 1 天\n3. `#475 任务灰度开关` · @lin · 停留 1 天\n\n有 **1 条**超过 2 天未处理，建议优先跟进 `#482`。',
      },
    ],
    createdAt: now - 5 * HR,
    updatedAt: now - 5 * HR,
    sourceTaskId: ghTask.id,
    sourceRunId: ghRunId,
    sourceTriggeredAt: now - 5 * HR,
  }

  ghTask.runs = [
    {
      id: ghRunId,
      status: 'success',
      startedAt: now - 5 * HR,
      durationMs: 42000,
      resultSummary: '汇总 12 条待审查 PR，1 条超期',
      conversationId: runConvId,
    },
    {
      id: uid('run_'),
      status: 'success',
      startedAt: now - 1 * DAY - 5 * HR,
      durationMs: 38000,
      resultSummary: '汇总 9 条待审查 PR',
    },
    {
      id: uid('run_'),
      status: 'failed',
      startedAt: now - 2 * DAY - 5 * HR,
      durationMs: 12000,
      failureReason: 'GitHub 授权已过期，请重新授权',
    },
  ]

  watchTask.runs = [
    { id: uid('run_'), status: 'success', startedAt: now - 2 * HR, durationMs: 9000, resultSummary: '无新增动态' },
    { id: uid('run_'), status: 'success', startedAt: now - 6 * HR, durationMs: 11000, resultSummary: '发现 1 条竞品融资动态，已汇总' },
    { id: uid('run_'), status: 'success', startedAt: now - 10 * HR, durationMs: 8000, resultSummary: '无新增动态' },
    { id: uid('run_'), status: 'failed', startedAt: now - 14 * HR, durationMs: 5000, failureReason: '数据源请求超时' },
    { id: uid('run_'), status: 'success', startedAt: now - 18 * HR, durationMs: 10000, resultSummary: '发现 2 条新品发布动态' },
    { id: uid('run_'), status: 'success', startedAt: now - 22 * HR, durationMs: 9500, resultSummary: '无新增动态' },
  ]

  // ---- A 'dates' task (runs once on each specific date) ----
  const reviewTask: ScheduledTask = {
    id: uid('task_'),
    name: '季度业务复盘',
    instruction: '在指定日期生成一份季度业务复盘报告：汇总关键指标、目标达成情况与下一步建议，并发送给我。',
    schedule: buildSchedule({ mode: 'dates', dates: [now - 4 * DAY, now + 6 * DAY, now + 13 * DAY] }),
    status: 'success',
    paused: false,
    source: 'chat',
    sourceLabel: 'Workmate 对话',
    capabilities: ['web'],
    mcpServerNames: ['Notion'],
    createdAt: now - 20 * DAY,
    runs: [
      { id: uid('run_'), status: 'success', startedAt: now - 4 * DAY, durationMs: 42000, resultSummary: '生成 Q2 业务复盘报告，覆盖 5 项核心指标' },
    ],
    lastRunAt: now - 4 * DAY,
    nextRunAt: 0,
  }
  reviewTask.nextRunAt = computeNextRun(reviewTask.schedule, now)

  // ---- A weekly multi-day task (paused) ----
  const standupTask: ScheduledTask = {
    id: uid('task_'),
    name: '站会纪要推送',
    instruction: '每周一、三、五早上 9:30，汇总昨日进展与今日计划，整理成站会纪要推送到团队群。',
    schedule: buildSchedule({ mode: 'recurring', time: '09:30', weekdays: [1, 3, 5] }),
    status: 'paused',
    paused: true,
    source: 'chat',
    sourceLabel: 'Workmate 对话',
    capabilities: ['email'],
    mcpServerNames: ['飞书 Lark'],
    createdAt: now - 15 * DAY,
    runs: [
      { id: uid('run_'), status: 'success', startedAt: now - 1 * DAY, durationMs: 16000, resultSummary: '已推送站会纪要给 8 位成员' },
      { id: uid('run_'), status: 'success', startedAt: now - 3 * DAY, durationMs: 15000, resultSummary: '已推送站会纪要给 8 位成员' },
      { id: uid('run_'), status: 'success', startedAt: now - 5 * DAY, durationMs: 17000, resultSummary: '已推送站会纪要给 7 位成员' },
      { id: uid('run_'), status: 'success', startedAt: now - 8 * DAY, durationMs: 15000, resultSummary: '已推送站会纪要给 8 位成员' },
      { id: uid('run_'), status: 'success', startedAt: now - 10 * DAY, durationMs: 14000, resultSummary: '已推送站会纪要给 8 位成员' },
    ],
    lastRunAt: now - 1 * DAY,
    nextRunAt: 0,
  }
  standupTask.nextRunAt = computeNextRun(standupTask.schedule, now)

  const tasks = [ghTask, watchTask, weeklyTask, reviewTask, standupTask]

  // Every run gets a viewable result conversation (success → result, failed → diagnosis)
  // so the run-records list can always offer 打开对话 — including failures, to investigate.
  const runResultConvs: Conversation[] = []
  for (const task of tasks) {
    for (const run of task.runs) {
      if (run.conversationId) continue // ghTask's first run keeps the rich showcase conv
      const failed = run.status === 'failed'
      const cap = task.capabilities[0] || 'scheduler'
      const message: Message = failed
        ? {
            id: uid('m_'),
            role: 'assistant',
            status: 'done',
            createdAt: run.startedAt,
            thinking: `执行「${task.name}」，过程中出现错误。`,
            toolCalls: [
              {
                id: uid('tc_'),
                tool: cap,
                title: `执行 ${task.name}`,
                status: 'error',
                fn: 'run_task',
                result: `{\n  success: false,\n  error: ${JSON.stringify(run.failureReason || '执行失败')}\n}`,
              },
            ],
            text: `❌ 本次执行失败：${run.failureReason || '未知错误'}\n\n你可以在任务详情页点「立即运行」重试，或检查任务所需的连接 / 授权后再试。`,
          }
        : {
            id: uid('m_'),
            role: 'assistant',
            status: 'done',
            createdAt: run.startedAt,
            text: `✅ ${run.resultSummary || '执行完成'}`,
          }
      const id = uid('conv_')
      runResultConvs.push({
        id,
        title: `${task.name} · ${failed ? '执行失败' : '执行结果'}`,
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

  // ---- Normal-mode conversations ----
  const conversations: Conversation[] = [
    runConversation,
    ...runResultConvs,
    {
      id: uid('conv_'),
      title: 'API 设计讨论',
      projectId: projProduct.id,
      createdAt: now - 1 * DAY,
      updatedAt: now - 1 * DAY,
      messages: [
        { id: uid('m_'), role: 'user', text: '帮我评审一下这个分页接口的设计', status: 'done', createdAt: now - 1 * DAY },
        {
          id: uid('m_'),
          role: 'assistant',
          status: 'done',
          createdAt: now - 1 * DAY + 15000,
          text: '建议用基于游标（cursor）的分页而不是 offset：\n\n- 数据量大时性能更稳定\n- 插入/删除不会导致错页\n\n返回里带上 `next_cursor` 即可。',
        },
      ],
    },
    {
      id: uid('conv_'),
      title: '周报草稿',
      createdAt: now - 3 * HR,
      updatedAt: now - 3 * HR,
      messages: [
        { id: uid('m_'), role: 'user', text: '把这几点扩写成一段周报', status: 'done', createdAt: now - 3 * HR },
        {
          id: uid('m_'),
          role: 'assistant',
          status: 'done',
          createdAt: now - 3 * HR + 12000,
          text: '本周完成移动端原型的主要框架搭建，跑通了对话与定时任务的核心链路；下周计划补齐会议模块并进入联调阶段。',
        },
      ],
    },
    {
      id: uid('conv_'),
      title: '增长实验复盘',
      projectId: projGrowth.id,
      createdAt: now - 4 * DAY,
      updatedAt: now - 4 * DAY,
      messages: [
        { id: uid('m_'), role: 'user', text: '这次 A/B 实验的结论是什么', status: 'done', createdAt: now - 4 * DAY },
        {
          id: uid('m_'),
          role: 'assistant',
          status: 'done',
          createdAt: now - 4 * DAY + 14000,
          text: '实验组转化率提升 **8.3%**，达到显著性（p < 0.05）。建议全量上线，并继续观察留存。',
        },
      ],
    },
  ]

  // ---- Notifications ----
  // Titles are structured + status-stable (noun only); the changing status lives in
  // a live-derived pill, never in the title. Three categories: task_status / approval /
  // mcp_connect — each row jumps to where the user resolves or reviews it.
  const notifications: AppNotification[] = [
    {
      id: calNotifId,
      type: 'approval',
      createdAt: now - 25 * MIN,
      read: false,
      title: '授权请求 · 日历',
      requester: 'Workmate',
      purpose: '读取你的日历事件，以便汇总今日安排并提醒冲突。',
      scopes: ['日历：只读', '当天及未来 7 天的事件'],
      tool: 'calendar',
      approvalStatus: 'pending',
      // jump back to the in-chat approval card (approvals happen mostly in Workmate)
      relatedMessageId: calMsgId,
      relatedMode: 'workmate',
    },
    {
      id: slackNotifId,
      type: 'mcp_connect',
      createdAt: now - 20 * MIN,
      read: false,
      title: '连接请求 · Slack',
      body: '需要连接 Slack 才能继续',
      relatedServerId: slackId,
      // jump back to the in-chat connect card to complete the oauth connection
      relatedMessageId: slackMsgId,
      relatedMode: 'workmate',
    },
    {
      id: mailNotifId,
      type: 'approval',
      createdAt: now - 18 * MIN,
      read: false,
      title: '授权请求 · 邮件',
      requester: 'Workmate',
      purpose: '读取你最近的邮件，以便汇总重点与待回复。',
      scopes: ['邮件：只读', '最近 24 小时'],
      tool: 'email',
      approvalStatus: 'pending',
      relatedMessageId: mailMsgId,
      relatedMode: 'workmate',
    },
    {
      id: codeNotifId,
      type: 'approval',
      createdAt: now - 16 * MIN,
      read: false,
      title: '授权请求 · 代码库',
      requester: 'Workmate',
      purpose: '读取仓库内容以便检索与分析代码。',
      scopes: ['代码库：只读', '指定仓库'],
      tool: 'github',
      approvalStatus: 'pending',
      relatedMessageId: codeMsgId,
      relatedMode: 'workmate',
    },
    {
      id: jiraNotifId,
      type: 'mcp_connect',
      createdAt: now - 14 * MIN,
      read: false,
      title: '连接请求 · Jira',
      body: '需要连接 Jira 才能继续',
      relatedServerId: jiraId,
      relatedMessageId: jiraMsgId,
      relatedMode: 'workmate',
    },
    {
      id: uid('ntf_'),
      type: 'task_status',
      createdAt: now - 5 * HR,
      read: false,
      title: '定时任务 · 整理 GitHub PR',
      body: '汇总 12 条待审查 PR，1 条超期未处理。',
      taskStatusKind: 'completed',
      relatedTaskId: ghTask.id,
      relatedRunId: ghRunId,
    },
    {
      id: uid('ntf_'),
      type: 'task_status',
      // yesterday — populates the 昨天 time-bucket in the grouped list
      createdAt: now - 1 * DAY - 5 * HR,
      read: true,
      title: '定时任务 · 整理 GitHub PR',
      body: 'GitHub 授权已过期，请重新授权。',
      taskStatusKind: 'failed',
      relatedTaskId: ghTask.id,
    },
    {
      id: uid('ntf_'),
      type: 'task_status',
      createdAt: now - 6 * DAY,
      read: true,
      title: '定时任务 · 整理 GitHub PR',
      body: '计划：每天 09:00。',
      taskStatusKind: 'created',
      relatedTaskId: ghTask.id,
    },
  ]

  // ---- Meetings ----
  const review = reviewAnalysis()
  const meetings: Meeting[] = [
    {
      id: uid('meet_'),
      title: '产品评审会 · Q3 路线图',
      createdAt: now - 1 * DAY - 2 * HR,
      durationMs: 118000,
      status: 'done',
      source: 'recording',
      transcript: review.transcript,
      summaryMarkdown: review.summary,
      template: 'meeting',
      summaryUpdatedAt: now - 1 * DAY - 2 * HR,
    },
    {
      // 转译失败 demo: red 转译失败 pill in the list → 重试转译 in detail → 转译中 → done.
      // (转译 = upload + transcribe unified; a failure in either stage surfaces here.)
      id: uid('meet_'),
      title: '客户拜访沟通',
      createdAt: now - 3 * HR,
      durationMs: 65000,
      status: 'failed',
      source: 'recording',
      failureReason: 'meet.fail.network',
    },
    {
      // another 转译失败 — an imported file, different reason
      id: uid('meet_'),
      title: '导入音频 · 季度复盘',
      createdAt: now - 4 * HR,
      durationMs: 143000,
      status: 'failed',
      source: 'import',
      failureReason: 'meet.fail.quota',
    },
    {
      id: uid('meet_'),
      title: '电话沟通 · 供应商对接',
      createdAt: now - 5 * HR,
      durationMs: 38000,
      status: 'failed',
      source: 'recording',
      failureReason: 'meet.fail.timeout',
    },
    {
      id: uid('meet_'),
      title: '用户访谈 · 增长方向',
      createdAt: now - 6 * HR,
      durationMs: 82000,
      status: 'pending',
      source: 'recording',
    },
    {
      id: uid('meet_'),
      title: '导入音频 · 团队周会',
      createdAt: now - 30 * MIN,
      durationMs: 50000,
      status: 'failed',
      source: 'import',
      failureReason: 'meet.failedReason',
    },
  ]

  // ---- Workmate config: MCP servers ----------------------------------------
  const SI = (slug: string) => `https://cdn.simpleicons.org/${slug}`
  const FAV = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  const mcpServers: McpServer[] = [
    // authorized + on (OAuth already completed)
    {
      id: uid('mcp_'), name: '飞书 Lark', desc: '读写文档、日历与多维表格', auth: 'oauth', authorized: true, enabled: true,
      gradient: 'ocean', letter: '飞', shared: true, publisher: '字节跳动', logo: FAV('feishu.cn'),
      about: '连接飞书（Lark），让 Workmate 读写云文档、多维表格、日历与即时消息，把协作和办公自动化串起来。',
      tools: [
        { name: 'send_message', desc: '向群组或个人发送飞书消息' },
        { name: 'create_doc', desc: '新建云文档并写入内容' },
        { name: 'search_wiki', desc: '在知识库 / Wiki 中检索文档' },
        { name: 'create_calendar_event', desc: '创建日程并邀请参与人' },
        { name: 'search_bitable', desc: '查询多维表格记录' },
      ],
    },
    {
      id: uid('mcp_'), name: 'Google Docs', desc: '创建与编辑 Google 文档', auth: 'oauth', authorized: true, enabled: true,
      gradient: 'brand', letter: 'D', publisher: 'Google', logo: SI('googledocs'),
      about: '连接 Google Docs，让 Workmate 直接创建、读取并编辑文档——起草、整理、替换内容都能交给它。',
      tools: [
        { name: 'create_document', desc: '新建一个 Google 文档' },
        { name: 'get_document', desc: '读取文档的标题与正文内容' },
        { name: 'insert_text', desc: '在指定位置插入文本' },
        { name: 'replace_text', desc: '查找并替换文档中的文本' },
        { name: 'append_paragraph', desc: '在文档末尾追加段落' },
      ],
    },
    {
      id: uid('mcp_'), name: 'GitHub', desc: '读取仓库、Issue 与 Pull Request', auth: 'oauth', authorized: true, enabled: true,
      gradient: 'violet', letter: 'G', shared: true, publisher: 'GitHub', logo: SI('github'),
      about: '连接 GitHub，让 Workmate 检索代码、查看与创建 Issue / Pull Request，把研发协作纳入对话。',
      tools: [
        { name: 'search_repositories', desc: '按关键词搜索仓库' },
        { name: 'get_file_contents', desc: '读取仓库中某个文件的内容' },
        { name: 'search_code', desc: '在代码库中全文检索' },
        { name: 'create_issue', desc: '在仓库中创建 Issue' },
        { name: 'list_pull_requests', desc: '列出仓库的 Pull Request' },
        { name: 'create_pull_request', desc: '发起一个 Pull Request' },
      ],
    },
    // OAuth required, not yet authorized → show 连接 button first
    {
      id: slackId, name: 'Slack', desc: '发送与读取频道消息', auth: 'oauth', authorized: false, enabled: false,
      gradient: 'sunset', letter: 'S', publisher: 'Slack', logo: FAV('slack.com'),
      about: '连接 Slack，让 Workmate 收发频道与私信消息、汇总讨论、按需通知团队。',
      tools: [
        { name: 'list_channels', desc: '列出工作区的频道' },
        { name: 'post_message', desc: '向频道或私信发送消息' },
        { name: 'reply_to_thread', desc: '在消息的话题串中回复' },
        { name: 'get_channel_history', desc: '读取频道的历史消息' },
        { name: 'add_reaction', desc: '给消息添加 emoji 表情回应' },
      ],
    },
    {
      id: jiraId, name: 'Jira', desc: '管理需求、缺陷与迭代看板', auth: 'oauth', authorized: false, enabled: false,
      gradient: 'ocean', letter: 'J', shared: true, publisher: 'Atlassian', logo: SI('jira'),
      about: '连接 Jira，让 Workmate 用 JQL 检索事项、创建与流转工单、跟进迭代进度。',
      tools: [
        { name: 'search_issues', desc: '用 JQL 搜索事项' },
        { name: 'get_issue', desc: '获取某个事项的详情' },
        { name: 'create_issue', desc: '创建需求 / 缺陷工单' },
        { name: 'update_issue', desc: '更新事项字段' },
        { name: 'add_comment', desc: '给事项添加评论' },
        { name: 'transition_issue', desc: '推进事项到下一个状态' },
      ],
    },
    {
      id: uid('mcp_'), name: 'Google Calendar', desc: '查询日程、创建会议邀请', auth: 'oauth', authorized: false, enabled: false,
      gradient: 'mint', letter: 'C', publisher: 'Google', logo: SI('googlecalendar'),
      about: '连接 Google Calendar，让 Workmate 查看日程、创建与调整会议、寻找空闲时间。',
      tools: [
        { name: 'list_events', desc: '列出指定时间范围的日程' },
        { name: 'create_event', desc: '创建日程并发送邀请' },
        { name: 'update_event', desc: '修改已有日程' },
        { name: 'delete_event', desc: '删除一个日程' },
        { name: 'find_free_time', desc: '在参与人之间寻找空闲时段' },
      ],
    },
    // no auth needed → toggle directly
    {
      id: uid('mcp_'), name: 'Notion', desc: '检索与更新知识库页面', auth: 'none', authorized: true, enabled: false,
      gradient: 'violet', letter: 'N', publisher: 'Notion', logo: SI('notion'),
      about: '连接 Notion，让 Workmate 搜索页面、读写内容、查询数据库，把知识库变成可对话的工作台。',
      tools: [
        { name: 'search', desc: '搜索页面与数据库' },
        { name: 'get_page', desc: '读取页面内容' },
        { name: 'create_page', desc: '新建页面' },
        { name: 'update_page', desc: '更新页面属性与内容' },
        { name: 'query_database', desc: '按条件查询数据库' },
        { name: 'append_block', desc: '向页面追加内容块' },
      ],
    },
    {
      id: uid('mcp_'), name: '数据透视 DataHub', desc: '查询指标与生成分析报表', auth: 'none', authorized: true, enabled: false,
      gradient: 'amber', letter: 'H', publisher: 'Acryl Data', logo: FAV('datahubproject.io'),
      about: '连接 DataHub 元数据平台，让 Workmate 检索数据资产、查看血缘与业务术语，辅助数据分析。',
      tools: [
        { name: 'search_entities', desc: '搜索数据集、看板等元数据实体' },
        { name: 'get_dataset', desc: '获取数据集的 schema 与说明' },
        { name: 'get_lineage', desc: '查询数据血缘上下游' },
        { name: 'list_glossary_terms', desc: '列出业务术语表' },
      ],
    },
  ]

  // ---- Workmate config: saved memories (auto-saved during chats) ------------
  const memories: MemoryItem[] = [
    { id: uid('mem_'), text: '负责 Cobo Portal 内的智能合约钱包（Smart Contract Wallet）。', createdAt: now - 2 * DAY },
    { id: uid('mem_'), text: '正在设计一款同时支持资金池与非资金池两种模式的链上钱包产品。', createdAt: now - 4 * DAY },
    { id: uid('mem_'), text: '做产品决策时偏好从第一性原理出发分析。', createdAt: now - 9 * DAY },
    { id: uid('mem_'), text: '对 AI 相关知识与资讯有浓厚兴趣，喜欢理解其背后的底层逻辑与驱动因素。', createdAt: now - 12 * DAY },
    { id: uid('mem_'), text: '所在公司是一家虚拟货币托管机构。', createdAt: now - 18 * DAY },
    { id: uid('mem_'), text: '沟通偏好中文，回答希望先给结论再给要点。', createdAt: now - 25 * DAY },
    { id: uid('mem_'), text: '主要拍摄风光题材 / 喜欢风光摄影。', createdAt: now - 40 * DAY },
  ]

  // ---- Workmate config: skills ---------------------------------------------
  const skills: Skill[] = [
    { id: uid('skill_'), name: '周报生成', desc: '汇总本周进展，按结论 + 要点生成周报', enabled: true, gradient: 'brand', letter: '周' },
    { id: uid('skill_'), name: '竞品分析', desc: '抓取竞品信息并整理成对比要点', enabled: true, gradient: 'violet', letter: '竞' },
    { id: uid('skill_'), name: '会议待办提取', desc: '从会议纪要中自动提取待办项', enabled: true, gradient: 'ocean', letter: '会' },
    { id: uid('skill_'), name: '邮件起草', desc: '根据要点起草中英文邮件', enabled: false, gradient: 'sunset', letter: '邮' },
    { id: uid('skill_'), name: 'PRD 评审', desc: '基于第一性原理检查 PRD 漏洞', enabled: false, gradient: 'mint', letter: 'P' },
    { id: uid('skill_'), name: '数据透视', desc: '把原始数据透视成图表与洞察', enabled: false, gradient: 'amber', letter: '数' },
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
