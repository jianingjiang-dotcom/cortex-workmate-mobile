// Capture every screen of Cortex Workmate to docs/screens/*.png + a gallery doc.
// Drives the running dev server (localhost:5173) with the system Chrome via puppeteer-core.
//   pnpm dev        (in another terminal)
//   node scripts/shoot.mjs            # capture all screenshots + write docs/app-screens.md
//   node scripts/shoot.mjs --doc-only # only regenerate docs/app-screens.md from saved PNGs
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = 'http://localhost:5173'
const OUT = path.resolve('docs/screens')
const DOC_ONLY = process.argv.includes('--doc-only')
// --only=<substring> re-shoots just the matching screens (doc is always fully rewritten)
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7)
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const ST = (over = {}) =>
  JSON.stringify({
    state: {
      authStatus: 'ready',
      hasOnboarded: true,
      lang: 'zh',
      theme: 'light',
      themeMode: 'light',
      activeTab: 'chat',
      chatMode: 'workmate',
      ...over,
    },
    version: 3,
  })

const GROUP_ORDER = [
  '登录与引导',
  '对话（Workmate / Agents）',
  '助手 · 定时任务',
  '助手 · 会议记录',
  '通知中心',
  '我的（账号 / 配置）',
  '深色模式',
  '更多界面与交互态',
]

// each screen: { file, group, desc, req:[...], state, steps?:[{text|aria|svg|type, nth?, wait?}] }
const screens = [
  // ---- 登录与引导 ----
  {
    file: '01_登录页.png', group: '登录与引导', desc: '登录页',
    state: ST({ authStatus: 'loggedOut' }),
    req: [
      '**定位**：未登录用户的入口，传达产品定位（随身的 AI 工作搭子）。',
      '**元素**：Logo + 「Cortex Workmate」+ 副标题；「使用 Google 登录」主按钮、「扫码登录」次入口；底部条款说明。',
      '**交互**：登录成功后首次进引导、老用户直接进主界面。',
    ],
  },
  {
    file: '02_引导页-1.png', group: '登录与引导', desc: '新手引导 · 第 1 页（欢迎）',
    state: ST({ authStatus: 'onboarding', hasOnboarded: false }),
    req: [
      '**定位**：3 页横滑引导的品牌欢迎页。',
      '**元素**：Logo hero + 漂浮装饰；页码圆点；右上「跳过」、底部「下一步」。',
    ],
  },
  {
    file: '03_引导页-2.png', group: '登录与引导', desc: '新手引导 · 第 2 页（智能助手）',
    state: ST({ authStatus: 'onboarding', hasOnboarded: false }),
    steps: [{ text: '下一步', wait: 800 }],
    req: ['**定位**：介绍 Workmate 是有记忆、能跨工具替你执行的持续助理。'],
  },
  {
    file: '04_引导页-3.png', group: '登录与引导', desc: '新手引导 · 第 3 页（核心能力）',
    state: ST({ authStatus: 'onboarding', hasOnboarded: false }),
    steps: [{ text: '下一步', wait: 700 }, { text: '下一步', wait: 800 }],
    req: [
      '**定位**：三大能力卡（定时任务 / 会议记录 / 授权审批），按钮变「开始体验」。',
      '**交互**：完成引导后不再出现。',
    ],
  },

  // ---- 对话 ----
  {
    file: '05_Workmate对话主界面.png', group: '对话（Workmate / Agents）', desc: 'Workmate 对话主界面',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    req: [
      '**定位**：产品核心 —— 与 Workmate 的一条**连续、不分 session**的对话流。',
      '**元素**：顶部 [收藏] · [Workmate / Agents 分段] · [搜索][通知]；消息流（含工具调用卡 / 审批卡 / MCP 连接卡）；底部输入框（附件 / 全屏编辑）。',
      '**交互**：流式回复（思考 → 工具调用 → 正文）；回复下方 复制 / 赞 / 踩 / 收藏。',
    ],
  },
  {
    file: '06_Workmate历史搜索.png', group: '对话（Workmate / Agents）', desc: 'Workmate 历史搜索',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ aria: 'search', wait: 600 }, { type: '分页', wait: 600 }],
    req: [
      '**定位**：在连续对话流里按关键词检索历史消息。',
      '**交互**：输入即时过滤；点结果跳回该消息并高亮 1.8s。',
    ],
  },
  {
    file: '07_Workmate收藏中心.png', group: '对话（Workmate / Agents）', desc: '收藏中心',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ aria: 'favorites', wait: 700 }],
    req: [
      '**定位**：集中查看收藏的 Workmate 回复（按收藏时间倒序）。',
      '**交互**：点条目跳回原对话并高亮；行尾实心书签取消收藏；支持搜索。',
    ],
  },
  {
    file: '08_通知跳回-审批卡.png', group: '对话（Workmate / Agents）', desc: '通知跳回 · 对话内授权审批卡',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ svg: 'bell', wait: 700 }, { text: '授权请求 · 日历', wait: 1100 }],
    req: [
      '**定位**：点「授权请求」通知 → 跳回 Workmate 对话内的审批卡（带高亮框，外框与图标留有安全间距）。',
      '**元素**：审批卡**第一级（折叠态）即可操作**：拒绝 / 同意（同意默认授予 7 天有效期，已同意态展示「已同意 · 有效期 7 天」）；展开仅追加函数与参数。',
      '**交互**：同意 / 拒绝后卡片状态与通知中心药丸同步更新。',
    ],
  },
  {
    file: '09_通知跳回-连接卡.png', group: '对话（Workmate / Agents）', desc: '通知跳回 · 对话内 MCP 连接卡',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ svg: 'bell', wait: 700 }, { text: '连接请求 · Slack', wait: 1100 }],
    req: [
      '**定位**：点「连接请求」通知 → 跳回对话内的 MCP 连接卡，在原上下文完成 OAuth 连接。',
      '**元素**：连接卡（服务 Logo + 名称 + 描述 + 「连接」按钮）；连接成功后变绿色「已连接」并继续任务。',
    ],
  },
  {
    file: '10_Agents对话主界面.png', group: '对话（Workmate / Agents）', desc: 'Agents 对话主界面',
    state: ST({ activeTab: 'chat', chatMode: 'normal' }),
    req: [
      '**定位**：与 Workmate 连续流互补的**多智能体对话**，按会话 / 项目组织。',
      '**元素**：顶部 [历史] · 分段 · [通知]；输入框上方 **Agent 栏**（左：当前智能体选择 pill；右：MCP 服务器 pill + 已启用计数）；助手回复带智能体署名。',
      '**交互**：可切换智能体 / 快捷管理 MCP；用户消息可编辑重发。',
    ],
  },
  {
    file: '11_智能体选择器.png', group: '对话（Workmate / Agents）', desc: '选择智能体',
    state: ST({ activeTab: 'chat', chatMode: 'normal' }),
    steps: [{ text: 'Auto Agent', wait: 800 }],
    req: [
      '**定位**：在 Agents 模式切换当前智能体。',
      '**元素**：底部弹窗「选择智能体」+ 搜索；按组织分组（内置智能体 / Cobo / Sales & BD / Operation & Growth / RD / Default）；行 = 头像 + 名称 + 描述，当前项打勾。',
      '**交互**：点选即切换（toast 提示），后续回复以该智能体署名。',
    ],
  },
  {
    file: '12_MCP快捷面板.png', group: '对话（Workmate / Agents）', desc: 'MCP 服务器快捷面板',
    state: ST({ activeTab: 'chat', chatMode: 'normal' }),
    steps: [{ text: '服务器$', wait: 800 }],
    req: [
      '**定位**：对话内快捷启停 MCP 服务器，不必跳设置页。',
      '**元素**：底部弹窗（服务 Logo + 名称 + 描述 + 开关 / 「连接」按钮；共享 / 已授权徽标）。',
      '**交互**：未授权的先连接（OAuth mock）再启用；启用数实时回显在 pill 上。',
    ],
  },
  {
    file: '13_普通对话历史.png', group: '对话（Workmate / Agents）', desc: '会话历史（项目 / 会话）',
    state: ST({ activeTab: 'chat', chatMode: 'normal' }),
    steps: [{ aria: 'history', wait: 700 }],
    req: [
      '**定位**：浏览 Agents 模式的项目与会话。',
      '**交互**：点会话切换；支持 新建 / 重命名 / 移动到项目 / 删除。',
    ],
  },

  // ---- 助手 · 定时任务 ----
  {
    file: '14_助手工作台.png', group: '助手 · 定时任务', desc: '助手工作台',
    state: ST({ activeTab: 'assistant' }),
    req: [
      '**定位**：Workmate 的功能入口聚合页。',
      '**元素**：「进入对话」hero 卡；「定时任务」「会议记录」入口卡（一句话描述 + 计数）。',
    ],
  },
  {
    file: '15_定时任务列表.png', group: '助手 · 定时任务', desc: '定时任务列表',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 700 }],
    req: [
      '**定位**：查看 / 管理托付给 Workmate 周期执行的任务。',
      '**元素**：卡片（名称 + 调度规则 chip + 下次运行 + 上次结果 ✓/✗）；已暂停分组置灰下沉。',
      '**交互**：整卡进详情；「+」走对话创建。',
    ],
  },
  {
    file: '16_定时任务详情.png', group: '助手 · 定时任务', desc: '定时任务详情',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 600 }, { text: '产品组 OKR 周报', wait: 700 }],
    req: [
      '**元素**：概览（状态 / 计划 / 上次 / 下次运行）；需要的 MCP 服务器；任务指令；运行记录（每行可「打开对话」）。',
      '**交互**：底部 暂停/继续 + 立即运行（暂停任务也可立即运行且**保持暂停**）；右上 ⋯ 编辑 / 删除。',
    ],
  },
  {
    file: '17_定时任务编辑.png', group: '助手 · 定时任务', desc: '编辑任务',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 600 }, { text: '产品组 OKR 周报', wait: 600 }, { aria: 'more', wait: 400 }, { text: '^编辑$', wait: 600 }],
    req: [
      '**元素**：名称 / 指令 / 触发时机三模式：周期重复（周内多选 + 每天快捷）· 指定日期（多选具体日期时间，各运行一次）· 每隔一段时间（N 分钟/小时/天，可设开始时间）。',
      '**交互**：未改动「保存」不可点（dirty 门控）；空名保存时回退原名称。',
    ],
  },
  {
    file: '18_执行结果-成功.png', group: '助手 · 定时任务', desc: '执行结果 · 成功',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 600 }, { text: '整理 GitHub PR', wait: 600 }, { text: '打开对话', wait: 700 }],
    req: [
      '**元素**：来源横幅（由定时任务于…触发）；结果消息（工具调用卡 + 正文）；**只读** + 复制；底部「引用提问」。',
      '**交互**：「引用提问」把该结果引用进 Workmate 输入框继续追问。',
    ],
  },
  {
    file: '19_执行结果-失败.png', group: '助手 · 定时任务', desc: '执行结果 · 失败',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 600 }, { text: '整理 GitHub PR', wait: 600 }, { text: '打开对话', nth: 2, wait: 700 }],
    req: [
      '**元素**：错误工具卡（红 ✗）+ 失败原因；同样支持 复制 / 引用提问 协助排查。',
    ],
  },

  // ---- 助手 · 会议记录 ----
  {
    file: '20_会议记录列表.png', group: '助手 · 会议记录', desc: '会议记录列表',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '会议记录', wait: 700 }],
    req: [
      '**元素**：按 今天 / 昨天 / 更早 分组；行 = 来源图标（录音/导入配色区分）+ 标题 + 时间·时长 + 状态药丸（未完成统一中性「未转写」，已完成无药丸；**云端上传阶段例外**：上传中=蓝色药丸内嵌进度填充，上传失败=红色「上传失败」，详情内重试）；底部居中「开始录制」；右上「上传音频」。',
      '**行为**：录音保存 / 导入后自动上传云盘（mock）；上传完成前转译被门控；刷新中断标记上传失败，详情「重试上传」。',
    ],
  },
  {
    file: '21_会议详情-逐字稿.png', group: '助手 · 会议记录', desc: '会议详情 · 逐字稿',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '会议记录', wait: 600 }, { text: '产品评审会', wait: 800 }],
    req: [
      '**元素**：常驻播放器（进度 / ±15s / 倍速）；转写 | 总结 分段；说话人着色的逐字稿，点击可定位播放。',
      '**交互**：右上搜索可检索转写内容；⋯ 菜单含 重新转译 / 复制全文 / 重命名 / 删除。',
    ],
  },
  {
    file: '22_会议详情-总结.png', group: '助手 · 会议记录', desc: '会议详情 · AI 总结（模板 chip + 更新时间）',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '会议记录', wait: 600 }, { text: '产品评审会', wait: 700 }, { text: '^总结$', wait: 600 }],
    req: [
      '**元素**：总结卡上方显示**当前模板 chip**（如 会议纪要）与「总结更新于 …」时间；Markdown 总结 + 复制按钮。',
      '**说明**：时间戳让「仅重新生成总结」也有可见变化。',
    ],
  },
  {
    file: '23_转译模板选择.png', group: '助手 · 会议记录', desc: '转译 · 选择总结模板（含总结备注）',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '会议记录', wait: 600 }, { text: '用户访谈', wait: 700 }, { text: '^转译$', wait: 800 }],
    req: [
      '**定位**：点「转译」先选总结模板，不同模板 = 不同的总结内容格式。',
      '**元素**：5 个模板单选（会议纪要 / 客户总结 / 面试记录 / 通用 / 行动项清单，各带一行描述，默认按标题智能推荐）；**「总结备注（可选）」**输入框（给 AI 补背景，会以“背景补充”写进总结）；底部「开始转译」。',
    ],
  },
  {
    file: '24_重新转译.png', group: '助手 · 会议记录', desc: '重新转译（重选模板 + 可选重生成逐字稿）',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '会议记录', wait: 600 }, { text: '产品评审会', wait: 700 }, { aria: 'more', wait: 500 }, { text: '^重新转译$', wait: 800 }],
    req: [
      '**定位**：已完成的会议可重跑：**总结一定重新生成**；逐字稿是否重生成由开关决定（默认关）。',
      '**元素**：模板单选（预选当前模板）+「同时重新生成逐字稿」开关 + hint + 总结备注（回填上次）+「开始」。',
      '**交互**：仅总结 → toast「已更新总结」；含逐字稿 → toast「已重新生成逐字稿与总结」。',
    ],
  },
  {
    file: '25_录音页.png', group: '助手 · 会议记录', desc: '录音中',
    state: ST({ activeTab: 'assistant' }),
    // headless Chrome has no mic → walk the denied path into the simulated-waveform demo
    steps: [
      { text: '会议记录', wait: 600 },
      { text: '开始录制', wait: 800 },
      { text: '允许使用麦克风', wait: 2200 },
      { text: '用模拟波形继续', wait: 2000 },
    ],
    req: [
      '**元素**：滚动镜像波形 + 大号计时器；中间 暂停/继续 大圆钮 + 右侧「结束」。',
      '**交互**：结束 → 命名保存 → 回列表（未转写态，再进详情转译）。',
    ],
  },

  // ---- 通知中心 ----
  {
    file: '26_通知中心.png', group: '通知中心', desc: '通知中心（按时间聚合）',
    state: ST({ activeTab: 'chat' }),
    steps: [{ svg: 'bell', wait: 800 }],
    req: [
      '**定位**：三类通知 —— 定时任务状态 / Tool Call 审批 / MCP 连接请求，各自点击跳到处理页。',
      '**元素**：按 今天 / 昨天 / 具体日期 分组；行 = 未读蓝点 + 分类图标 + **结构化稳定标题**（定时任务·名 / 授权请求·能力 / 连接请求·服务）+ 时间，第二行为**状态药丸**（待审批 / 已同意 / 待连接 / 执行成功…）。',
      '**说明**：状态变化只改药丸、**不改标题**；审批 / 连接跳回 Workmate 对话内卡片完成。',
    ],
  },
  {
    file: '27_通知筛选.png', group: '通知中心', desc: '通知筛选（多选）',
    state: ST({ activeTab: 'chat' }),
    steps: [{ svg: 'bell', wait: 700 }, { aria: 'filter', wait: 800 }],
    req: [
      '**元素**：底部弹窗「筛选通知」：定时任务完成 / Tool Call 审批 / 连接请求 三类多选（勾选显示）+「完成」。',
      '**交互**：取消勾选即时过滤，漏斗图标高亮带点；右上「全部已读」需二次确认。',
    ],
  },

  // ---- 我的 ----
  {
    file: '28_我的.png', group: '我的（账号 / 配置）', desc: '我的',
    state: ST({ activeTab: 'me' }),
    req: [
      '**元素**：账号卡（可点进个人信息）；Workmate 配置（基础配置 / MCP 服务器 / 记忆 / 技能）；偏好（语言 / 模式）；版本 / 重置演示数据 / 退出。',
    ],
  },
  {
    file: '29_个人信息.png', group: '我的（账号 / 配置）', desc: '个人信息中心',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: 'jianing.jiang@cobo.com', wait: 700 }],
    req: [
      '**元素**：大头像（可上传 / 更换 / 移除）；可编辑姓名；只读 用户 ID（点击复制）/ 邮箱。',
      '**交互**：未改动「保存」不可点；返回有未保存确认。',
    ],
  },
  {
    file: '30_基础配置.png', group: '我的（账号 / 配置）', desc: 'Workmate 基础配置（人设）',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '基础配置', wait: 700 }],
    req: [
      '**元素**：头像 / 名称 / 描述 / 系统提示词 / 模型选择（真实厂商 Logo）。',
      '**交互**：未改动「保存」不可点。',
    ],
  },
  {
    file: '31_MCP服务器列表.png', group: '我的（账号 / 配置）', desc: 'MCP 服务器列表',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: 'MCP 服务器', wait: 700 }],
    req: [
      '**元素**：真实 Logo + 名称 + 徽章（团队共享 / 已授权）+ 描述 + 开关或「连接」。',
      '**交互**：OAuth 服务先连接再启用。',
    ],
  },
  {
    file: '32_MCP服务器详情.png', group: '我的（账号 / 配置）', desc: 'MCP 服务器详情（已连接）',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: 'MCP 服务器', wait: 600 }, { text: '飞书', wait: 700 }],
    req: ['**元素**：头部（Logo / 发布方）+ 启用开关 + 关于 + 工具列表（函数名 + 说明）。'],
  },
  {
    file: '33_记忆列表.png', group: '我的（账号 / 配置）', desc: '记忆',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '^记忆$', wait: 700 }],
    req: [
      '**元素**：记忆条目 + 删除（软删除入回收站）；右上「+」走对话保存记忆；底部回收站入口。',
    ],
  },
  {
    file: '34_记忆回收站.png', group: '我的（账号 / 配置）', desc: '记忆回收站',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '^记忆$', wait: 600 }, { aria: 'delete', wait: 500 }, { text: '回收站', wait: 700 }],
    req: ['**交互**：恢复 → 回列表；彻底删除需二次确认。'],
  },
  {
    file: '35_技能列表.png', group: '我的（账号 / 配置）', desc: '技能',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '^技能$', wait: 700 }],
    req: ['**元素**：技能条目（图标 + 名称 + 描述 + 开关）。'],
  },
  {
    file: '36_模式选择.png', group: '我的（账号 / 配置）', desc: '主题模式选择',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '^模式', wait: 600 }],
    req: [
      '**元素**：白天模式 / 黑夜模式 / 跟随系统（当前项打勾）。',
      '**交互**：切换时整页配色**渐变过渡**（View Transitions）；跟随系统实时响应。',
    ],
  },

  // ---- 深色模式 ----
  {
    file: '37_我的-深色.png', group: '深色模式', desc: '我的（深色）',
    state: ST({ activeTab: 'me', theme: 'dark', themeMode: 'dark' }),
    req: ['**说明**：全部界面支持深色主题；首屏前内联脚本应用 `.dark`，无闪白。'],
  },
  {
    file: '38_Workmate对话-深色.png', group: '深色模式', desc: 'Workmate 对话（深色）',
    state: ST({ activeTab: 'chat', chatMode: 'workmate', theme: 'dark', themeMode: 'dark' }),
    req: ['**说明**：气泡 / 工具卡 / 审批卡 / 连接卡 / 输入框深色全适配。'],
  },
  {
    file: '39_通知中心-深色.png', group: '深色模式', desc: '通知中心（深色）',
    state: ST({ activeTab: 'chat', theme: 'dark', themeMode: 'dark' }),
    steps: [{ svg: 'bell', wait: 800 }],
    req: ['**说明**：分组标题 / 状态药丸（语义色）在深色下保持对比度。'],
  },

  // ---- 更多 ----
  {
    file: '40_扫码登录.png', group: '更多界面与交互态', desc: '扫码登录',
    state: ST({ authStatus: 'loggedOut' }),
    steps: [{ text: '扫码登录', wait: 700 }],
    req: ['**元素**：相机取景框 + 扫描线动画 + 相册 / 手电筒；识别成功走统一登录流程。'],
  },
  {
    file: '41_附件选择.png', group: '更多界面与交互态', desc: '添加附件',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ aria: 'add attachment', wait: 600 }],
    req: ['**元素**：底部弹窗「照片 / 文件」；图片出缩略图、文件显类型，可逐个移除。'],
  },
  {
    file: '42_全屏输入.png', group: '更多界面与交互态', desc: '全屏输入编辑器',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ type: '帮我把这周的进展整理成一段周报', wait: 300 }, { aria: 'expand input', wait: 600 }],
    req: ['**交互**：输入有内容时出现展开入口；全屏编辑保留头部与标签栏；草稿在展开 / 收起间保留。'],
  },
  {
    file: '43_MCP授权连接.png', group: '更多界面与交互态', desc: 'MCP 服务器详情（未授权）',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: 'MCP 服务器', wait: 600 }, { text: 'Slack', wait: 700 }],
    req: ['**元素**：「授权并连接」主按钮；点按走浏览器授权（mock）→ 连接中 → 出现开关。'],
  },
  {
    file: '44_语言选择.png', group: '更多界面与交互态', desc: '语言选择',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '语言', wait: 700 }],
    req: ['**元素**：简体中文 / English（当前项打勾）；切换即时生效，界面全量双语。'],
  },
]

async function clickText(page, src, nth = 0) {
  return page.evaluate(
    (reStr, n) => {
      const rx = new RegExp(reStr)
      const els = [...document.querySelectorAll('button,a,[role="button"]')].filter(
        (e) => e.offsetParent !== null && rx.test((e.innerText || '').replace(/\s+/g, ' ').trim()),
      )
      const el = els[n]
      if (el) { el.click(); return true }
      return false
    },
    src, nth,
  )
}
const clickAria = (page, label) =>
  page.evaluate((l) => { const e = document.querySelector(`[aria-label="${l}"]`); if (e) { e.click(); return true } return false }, label)
const clickSvg = (page, lucide) =>
  page.evaluate((name) => { const s = document.querySelector(`svg.lucide-${name}`); const b = s && s.closest('button'); if (b) { b.click(); return true } return false }, lucide)
const typeInto = (page, value) =>
  page.evaluate((v) => {
    const input = [...document.querySelectorAll('input,textarea')].find((i) => i.type !== 'file' && i.offsetParent !== null)
    if (!input) return false
    const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(input, v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  }, value)

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars'],
    defaultViewport: { width: 480, height: 956, deviceScaleFactor: 2 },
  })
  const page = await browser.newPage()
  for (const s of screens) {
    if (ONLY && !s.file.includes(ONLY)) continue
    try {
      await page.goto(URL, { waitUntil: 'load' })
      await page.evaluate((st) => localStorage.setItem('cortex-workmate-v1', st), s.state)
      await page.reload({ waitUntil: 'networkidle2' })
      await sleep(750)
      for (const step of s.steps || []) {
        let ok = true
        if (step.text) ok = await clickText(page, step.text, step.nth || 0)
        if (step.aria) ok = await clickAria(page, step.aria)
        if (step.svg) ok = await clickSvg(page, step.svg)
        if (step.type) ok = await typeInto(page, step.type)
        if (!ok) console.warn('  step missed:', s.file, JSON.stringify(step))
        await sleep(step.wait || 600)
      }
      await sleep(250)
      await page.screenshot({ path: path.join(OUT, s.file) })
      console.log('shot', s.file)
    } catch (e) {
      console.error('FAILED', s.file, e.message)
    }
  }
  await browser.close()
}

function writeDoc() {
  const md = [
    '# Cortex Workmate · 全界面截图与说明',
    '',
    `> 共 ${screens.length} 个界面，按场景分组；每个界面含截图 + 要点说明（定位 / 元素 / 交互）。`,
    '> 纯前端高保真原型（mock，无后端）；中文为默认、界面全量双语。截图与文档由 \`scripts/shoot.mjs\` 生成。',
    '',
  ]
  for (const g of GROUP_ORDER) {
    const items = screens.filter((s) => s.group === g)
    if (!items.length) continue
    md.push(`## ${g}`, '')
    for (const s of items) {
      md.push(`### ${s.desc}`, '', `![${s.desc}](./screens/${encodeURI(s.file)})`, '', ...s.req.map((r) => `- ${r}`), '')
    }
  }
  fs.writeFileSync(path.resolve('docs/app-screens.md'), md.join('\n'))
  console.log('WROTE docs/app-screens.md (', screens.length, 'screens )')
}

if (!DOC_ONLY) await capture()
writeDoc()
