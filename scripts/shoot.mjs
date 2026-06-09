// Capture every screen of Cortex Workmate to docs/screens/*.png + a requirements gallery doc.
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
  '对话',
  '助手（任务 / 会议 / 通知）',
  '我的（账号 / 配置）',
  '深色模式',
  '更多界面与交互态',
]

// each screen: { file, group, desc, req:[...], state, steps?:[{text|aria|svg|type, nth?, wait?}] }
const screens = [
  {
    file: '01_登录页.png', group: '登录与引导', desc: '登录页',
    state: ST({ authStatus: 'loggedOut' }),
    req: [
      '**定位**：未登录用户的入口，传达产品定位（随身的 AI 工作搭子）。',
      '**元素**：产品 Logo + 名称「Cortex Workmate」+ 一句话副标题；主按钮「使用 Google 登录」、次按钮「扫码登录」；底部《服务条款》《隐私政策》同意说明。',
      '**交互**：点 Google 登录走 OAuth（mock 直接成功）；点扫码登录进入扫码界面。',
      '**流转**：首次登录 → 进入新手引导；已完成引导的用户 → 直接进入主界面。',
    ],
  },
  {
    file: '02_引导页-1.png', group: '登录与引导', desc: '新手引导 · 第 1 页（欢迎）',
    state: ST({ authStatus: 'onboarding', hasOnboarded: false }),
    req: [
      '**定位**：首次登录后的 3 页横滑引导第 1 页，品牌欢迎。',
      '**元素**：Logo hero + 漂浮装饰（Sparkles / 对话气泡）；底部页码圆点（当前页加宽高亮）；右上「跳过」；底部「下一步」。',
      '**交互**：左右滑动或点「下一步」翻页；「跳过」直接完成引导。',
    ],
  },
  {
    file: '03_引导页-2.png', group: '登录与引导', desc: '新手引导 · 第 2 页（智能助手）',
    state: ST({ authStatus: 'onboarding', hasOnboarded: false }),
    steps: [{ text: '下一步', wait: 800 }],
    req: [
      '**定位**：第 2 页，介绍 Workmate 是有记忆、能跨工具替你执行的 AI 助手。',
      '**元素**：Sparkles hero + 模拟对话气泡示意。',
      '**交互**：滑动 / 下一步 / 跳过。',
    ],
  },
  {
    file: '04_引导页-3.png', group: '登录与引导', desc: '新手引导 · 第 3 页（核心能力）',
    state: ST({ authStatus: 'onboarding', hasOnboarded: false }),
    steps: [{ text: '下一步', wait: 700 }, { text: '下一步', wait: 800 }],
    req: [
      '**定位**：第 3 页，用卡片列出三大能力：定时任务、会议记录、授权审批。',
      '**元素**：三张能力卡（图标 + 标题 + 一句话描述）；底部按钮变为「开始体验」。',
      '**交互**：点「开始体验」完成引导（标记 hasOnboarded，后续不再出现）→ 进入主界面。',
    ],
  },

  {
    file: '05_Workmate对话主界面.png', group: '对话', desc: 'Workmate 对话主界面',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    req: [
      '**定位**：产品核心 —— 与 Workmate 的一条**连续、不分 session** 的对话流。',
      '**元素**：顶部 [收藏入口] · [Workmate / 普通对话 分段] · [搜索][通知]；消息区（用户气泡靠右；助手回复带头像 + 名称，可含工具调用卡 / 任务创建卡 / MCP 连接卡）；底部输入框（+ 附件、文本、语音）。',
      '**交互**：发送后助手流式回复（思考 → 工具调用 → 正文）；新提问会**顶到页面顶部**（类 ChatGPT 渐进滚动）；助手回复下方有 复制 / 赞 / 踩 / 收藏。',
      '**行为**：消息本地持久化；长流靠搜索 / 收藏回看。',
    ],
  },
  {
    file: '06_Workmate历史搜索.png', group: '对话', desc: 'Workmate 历史搜索',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ aria: 'search', wait: 600 }, { type: '分页', wait: 600 }],
    req: [
      '**定位**：在连续对话流里按关键词检索历史消息。',
      '**元素**：顶部搜索框（自动聚焦）+ 取消；结果列表（头像 + 角色 + 时间 + 高亮片段 + 结果计数）。',
      '**交互**：输入即时过滤；点结果 → 关闭搜索并**跳回该消息** + 1.8s 高亮脉冲。',
      '**边界**：空查询显示引导文案；无结果显示空提示。',
    ],
  },
  {
    file: '07_Workmate收藏中心.png', group: '对话', desc: '收藏中心',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ aria: 'favorites', wait: 700 }],
    req: [
      '**定位**：集中查看收藏的 Workmate 回复，解决长对话流找回难。',
      '**元素**：标题「收藏」+ 副标题；右上搜索；列表按**收藏时间倒序**（头像 + 名称 + 收藏时间 + 两行摘要）；行尾取消收藏（实心书签）。',
      '**交互**：点条目 → 跳回原对话 + 高亮；搜索过滤；取消收藏即时移除。',
      '**边界**：无收藏显示空态与引导。',
    ],
  },
  {
    file: '08_普通对话.png', group: '对话', desc: '普通对话模式',
    state: ST({ activeTab: 'chat', chatMode: 'normal' }),
    req: [
      '**定位**：像通用 AI 助手一样、**按会话 / 项目**组织的对话（与 Workmate 连续流互补）。',
      '**元素**：顶部 [历史] · 分段 · [通知]；会话消息区；输入框。',
      '**交互**：可新建会话、切换历史会话；用户消息可编辑重发。',
    ],
  },
  {
    file: '09_普通对话历史.png', group: '对话', desc: '普通对话历史',
    state: ST({ activeTab: 'chat', chatMode: 'normal' }),
    steps: [{ aria: 'history', wait: 700 }],
    req: [
      '**定位**：浏览普通对话的项目与会话列表。',
      '**元素**：项目分组 + 会话条目（标题 / 时间）；新建会话入口。',
      '**交互**：点会话进入；面板从左侧滑出。',
    ],
  },

  {
    file: '10_助手工作台.png', group: '助手（任务 / 会议 / 通知）', desc: '助手工作台',
    state: ST({ activeTab: 'assistant' }),
    req: [
      '**定位**：Workmate 的功能入口聚合页。',
      '**元素**：「进入对话」hero 卡；「定时任务」「会议记录」入口卡（各带一句话描述 + 计数 / 状态）；右上通知。',
      '**交互**：点卡进入对应功能。',
    ],
  },
  {
    file: '11_定时任务列表.png', group: '助手（任务 / 会议 / 通知）', desc: '定时任务列表',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 700 }],
    req: [
      '**定位**：查看 / 管理托付给 Workmate 周期执行的任务。',
      '**元素**：标题 + 副标题 + 右上「+」；卡片（能力色块图标 + 名称 + 规则 chip + 下次运行 + 上次结果 ✓/✗）；启用任务在前按下次运行升序，**已暂停**分组置灰下沉。',
      '**交互**：整卡点进详情；「+」通过对话创建（预填提示词跳 Workmate）；运行中显示 spinner。',
    ],
  },
  {
    file: '12_定时任务详情.png', group: '助手（任务 / 会议 / 通知）', desc: '定时任务详情',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 600 }, { text: '产品组 OKR 周报', wait: 700 }],
    req: [
      '**定位**：单个任务的总览与操作。',
      '**元素**：概览（状态 生效中 / 已暂停、计划、上次 / 下次运行）；「需要的 MCP 服务器」（已连接 / 未连接，可点进详情）；任务指令全文；运行记录（成功 / 失败 + 时长 + 打开对话）。',
      '**交互**：底部操作栏 —— 主按钮 暂停 / 继续、副按钮 立即运行（等宽）；右上 ⋯ 编辑 / 删除。即时运行**不解除暂停**。',
    ],
  },
  {
    file: '13_定时任务编辑.png', group: '助手（任务 / 会议 / 通知）', desc: '编辑任务',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 600 }, { text: '产品组 OKR 周报', wait: 600 }, { aria: 'more', wait: 400 }, { text: '^编辑$', wait: 600 }],
    req: [
      '**定位**：修改任务名称、指令、触发时机。',
      '**元素**：名称输入、指令多行输入、触发时机（每天 / 每周 / 每隔一段时间）；每周支持**周内多选**；时间 / 间隔选择；底部 取消 / 保存。',
      '**交互**：**未改动前「保存」不可点**（dirty 门控，空名字不算改动）；保存提示成功；可取消返回。',
    ],
  },
  {
    file: '14_执行结果-成功.png', group: '助手（任务 / 会议 / 通知）', desc: '执行结果 · 成功',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 600 }, { text: '整理 GitHub PR', wait: 600 }, { text: '打开对话', wait: 700 }],
    req: [
      '**定位**：查看某次成功执行的完整结果。',
      '**元素**：来源横幅（由定时任务于…触发 + 查看任务）；Workmate 结果消息（工具调用卡 + 结果正文）；**只读**（无输入框），仅保留**复制**按钮；底部「引用提问」。',
      '**交互**：复制结果；点「引用提问」跳回 Workmate 并把该结果**引用进输入框**继续追问。',
    ],
  },
  {
    file: '15_执行结果-失败.png', group: '助手（任务 / 会议 / 通知）', desc: '执行结果 · 失败',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '托付给 Workmate', wait: 600 }, { text: '整理 GitHub PR', wait: 600 }, { text: '打开对话', nth: 2, wait: 700 }],
    req: [
      '**定位**：查看失败执行以便排查。',
      '**元素**：来源横幅；错误工具卡（红色 ✗）+ 失败原因 + 重试 / 检查授权提示；只读 + 复制 + 引用提问。',
      '**交互**：可「引用提问」让 Workmate 协助排查。',
      '**说明**：每次运行（成功 / 失败）都生成可查看的结果对话，列表每行都有「打开对话」。',
    ],
  },
  {
    file: '16_会议记录列表.png', group: '助手（任务 / 会议 / 通知）', desc: '会议记录列表',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '会议记录', wait: 700 }],
    req: [
      '**定位**：管理录音 / 上传的会议及其纪要。',
      '**元素**：标题 + 副标题；按 今天 / 昨天 / 更早 分组的会议列表（图标 + 标题 + 时间·时长 + 状态药丸）；**底部居中「开始录制」录像机式按钮**；**右上「上传音频」**（搜索图标左侧）。',
      '**交互**：点会议进详情；点录制进录音页；上传选本地音频文件。',
    ],
  },
  {
    file: '17_会议记录详情.png', group: '助手（任务 / 会议 / 通知）', desc: '会议记录详情',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '会议记录', wait: 600 }, { text: '产品评审会|用户访谈|团队周会', wait: 800 }],
    req: [
      '**定位**：单场会议的转写、纪要与回放。',
      '**元素**：音频播放器（进度 / 波形）；说话人区分的同步转写；会议摘要（Markdown）；状态（转写中 / 完成 / 失败）。',
      '**交互**：播放联动转写高亮；转写与摘要分区查看。',
    ],
  },
  {
    file: '18_录音页.png', group: '助手（任务 / 会议 / 通知）', desc: '录音中',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ text: '会议记录', wait: 600 }, { text: '开始录制', wait: 800 }],
    req: [
      '**定位**：实时录音并转写成会议。',
      '**元素**：镜像波形动效 + 计时器；录制控制（停止 / 完成）。',
      '**交互**：完成 → 生成会议并进入转写流程；权限被拒时降级为模拟波形并提示改用上传。',
    ],
  },
  {
    file: '19_通知中心.png', group: '助手（任务 / 会议 / 通知）', desc: '通知中心',
    state: ST({ activeTab: 'assistant' }),
    steps: [{ svg: 'bell', wait: 700 }],
    req: [
      '**定位**：集中处理授权审批与任务状态通知。',
      '**元素**：待处理（授权审批卡：请求方 / 用途 / 权限范围 / 有效期选择 + 拒绝 / 同意）；更早（任务 完成 / 失败 / 创建 状态）；右上「全部已读」。',
      '**交互**：审批 通过 / 拒绝 并与对话内卡片同步；点任务状态跳到对应运行结果对话。',
    ],
  },

  {
    file: '20_我的-浅色.png', group: '我的（账号 / 配置）', desc: '我的',
    state: ST({ activeTab: 'me' }),
    req: [
      '**定位**：账号与 Workmate 配置中心。',
      '**元素**：账号卡（头像 + 姓名 + 邮箱，可点进个人信息）；「Workmate」配置区（基础配置 / MCP 服务器 / 记忆 / 技能，各带一行说明）；偏好（语言 / 模式）；支持（版本 / 重置演示数据）；退出登录。',
      '**交互**：点各行进入对应页 / 选择器。',
    ],
  },
  {
    file: '21_个人信息.png', group: '我的（账号 / 配置）', desc: '个人信息中心',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: 'jianing.jiang@cobo.com', wait: 700 }],
    req: [
      '**定位**：查看用户 ID、编辑姓名与头像。',
      '**元素**：大头像（相机角标，可 上传 / 更换 / 移除照片）；可编辑「姓名」；只读「用户 ID」（点击复制）、「邮箱」。',
      '**交互**：右上「保存」**未改动不可点**；返回有未保存确认；保存后「我的」卡片即时同步。',
    ],
  },
  {
    file: '22_基础配置.png', group: '我的（账号 / 配置）', desc: 'Workmate 基础配置（人设）',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '基础配置', wait: 700 }],
    req: [
      '**定位**：定制 Workmate 的人设、系统提示词与模型。',
      '**元素**：头像（可上传）；人设名称、描述、系统提示词；模型选择（真实厂商 Logo）。',
      '**交互**：右上「保存」**未改动不可点**；返回有未保存确认。',
    ],
  },
  {
    file: '23_MCP服务器列表.png', group: '我的（账号 / 配置）', desc: 'MCP 服务器列表',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: 'MCP 服务器', wait: 700 }],
    req: [
      '**定位**：连接外部工具 / 数据源，扩展 Workmate 能力。',
      '**元素**：标题 + 副标题 + 搜索；服务器列表（真实 Logo + 名称 + 徽章[团队共享 / 已授权] + 描述 + 右侧 开关 或「连接」）。',
      '**交互**：需 OAuth 的先「连接」（浏览器授权流 + 连接中 loading）后才出现开关；无需授权的直接开关；开关切换带渐变动效。',
    ],
  },
  {
    file: '24_MCP服务器详情.png', group: '我的（账号 / 配置）', desc: 'MCP 服务器详情（已连接）',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: 'MCP 服务器', wait: 600 }, { text: '飞书', wait: 700 }],
    req: [
      '**定位**：单个 MCP 服务器的说明与能力。',
      '**元素**：头部（Logo + 名称 + 发布方·授权类型）；启用 / 连接控制；「关于」；「工具」列表（函数名 + 说明）。',
      '**交互**：已授权只显示开关（不再出现连接按钮，除非授权失效）。',
    ],
  },
  {
    file: '25_记忆列表.png', group: '我的（账号 / 配置）', desc: '记忆',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '^记忆$', wait: 700 }],
    req: [
      '**定位**：查看 Workmate 长期记住的偏好与事实。',
      '**元素**：标题 + 副标题 + 搜索；记忆条目（文本 + 删除）；右上「+」（通过对话新增记忆）；底部「回收站(N)」入口。',
      '**交互**：删除为**软删除**（移入回收站，无需确认）；「+」跳 Workmate 预填「请帮我把以下的内容保存为我的记忆：」并触发 save_memory 工具调用。',
    ],
  },
  {
    file: '26_记忆回收站.png', group: '我的（账号 / 配置）', desc: '记忆回收站',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '^记忆$', wait: 600 }, { aria: 'delete', wait: 500 }, { text: '回收站', wait: 700 }],
    req: [
      '**定位**：找回或彻底删除已删除的记忆。',
      '**元素**：标题 + 说明；已删除条目（恢复 / 彻底删除）。',
      '**交互**：恢复 → 回到记忆列表；彻底删除需二次确认（不可恢复）。',
    ],
  },
  {
    file: '27_技能列表.png', group: '我的（账号 / 配置）', desc: '技能',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '^技能$', wait: 700 }],
    req: [
      '**定位**：管理可复用的自动化能力。',
      '**元素**：标题 + 副标题 + 搜索；技能条目（图标 + 名称 + 描述 + 开关）。',
      '**交互**：开关启用 / 停用，带渐变动效。',
    ],
  },
  {
    file: '28_模式选择.png', group: '我的（账号 / 配置）', desc: '主题模式选择',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '^模式', wait: 600 }],
    req: [
      '**定位**：切换 浅色 / 深色 / 跟随系统 主题。',
      '**元素**：底部选择表「模式」：白天模式 / 黑夜模式 / 跟随系统（当前项打勾）+ 取消。',
      '**交互**：选择后整页配色**渐变切换**（View Transitions 交叉淡入）；「跟随系统」实时跟随 OS、加载时正确解析（无闪白）。',
    ],
  },

  {
    file: '29_我的-深色.png', group: '深色模式', desc: '我的（深色模式）',
    state: ST({ activeTab: 'me', theme: 'dark', themeMode: 'dark' }),
    req: [
      '**说明**：所有界面均支持深色主题（语义色板，由 `.dark` 切换）。',
      '首屏前由内联脚本应用 `.dark`，避免深色用户刷新闪白。',
    ],
  },
  {
    file: '30_Workmate对话-深色.png', group: '深色模式', desc: 'Workmate 对话（深色模式）',
    state: ST({ activeTab: 'chat', chatMode: 'workmate', theme: 'dark', themeMode: 'dark' }),
    req: ['**说明**：对话流的气泡 / 卡片 / 操作行 / 输入框在深色下均已适配。'],
  },

  {
    file: '31_扫码登录.png', group: '更多界面与交互态', desc: '扫码登录',
    state: ST({ authStatus: 'loggedOut' }),
    steps: [{ text: '扫码登录', wait: 700 }],
    req: [
      '**定位**：登录的备选方式（扫码）。',
      '**元素**：扫码界面（深色背景 + 二维码 / 扫描提示）。',
      '**交互**：扫码完成 → 进入与 Google 登录一致的后续流程。',
    ],
  },
  {
    file: '32_附件选择.png', group: '更多界面与交互态', desc: '添加附件',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ aria: 'add attachment', wait: 600 }],
    req: [
      '**定位**：在对话中添加附件。',
      '**元素**：底部 ActionSheet「照片 / 文件」+ 取消。',
      '**交互**：选择后调系统选择器；图片生成缩略图、文件显示类型；待发送区可逐个移除。',
    ],
  },
  {
    file: '33_语音输入.png', group: '更多界面与交互态', desc: '语音输入',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ svg: 'mic', wait: 700 }],
    req: [
      '**定位**：语音听写输入。',
      '**元素**：底部语音面板（动态波形 + 计时 + 取消 / 完成）。',
      '**交互**：完成 → 把识别文本填入输入框（mock 预置短语）。',
    ],
  },
  {
    file: '34_全屏输入.png', group: '更多界面与交互态', desc: '全屏输入编辑器',
    state: ST({ activeTab: 'chat', chatMode: 'workmate' }),
    steps: [{ type: '帮我把这周的进展整理成一段周报', wait: 300 }, { aria: 'expand input', wait: 600 }],
    req: [
      '**定位**：长文本输入的全屏编辑态，**保留顶部头部与底部标签栏**。',
      '**元素**：编辑区填充对话区（头部下、标签栏上）；右上收起；底部 + 与 发送。',
      '**交互**：输入框有内容时出现展开入口；展开 / 收起为渐变；草稿在展开 / 收起间保留。',
    ],
  },
  {
    file: '35_MCP授权连接.png', group: '更多界面与交互态', desc: 'MCP 服务器详情（未授权）',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: 'MCP 服务器', wait: 600 }, { text: 'Slack', wait: 700 }],
    req: [
      '**定位**：未授权 MCP 服务器的授权入口态。',
      '**元素**：头部 + 「授权并连接」主按钮 + 关于 + 工具列表。',
      '**交互**：点「授权并连接」走浏览器授权流（mock）→ 连接中 loading → 显示开关。',
    ],
  },
  {
    file: '36_语言选择.png', group: '更多界面与交互态', desc: '语言选择',
    state: ST({ activeTab: 'me' }),
    steps: [{ text: '语言', wait: 700 }],
    req: [
      '**定位**：切换界面语言。',
      '**元素**：底部选择表「语言」：简体中文 / English（当前项打勾）+ 取消。',
      '**交互**：切换即时生效（界面 chrome 全量 i18n；已生成内容保留原语言）。',
    ],
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
    try {
      await page.goto(URL, { waitUntil: 'load' })
      await page.evaluate((st) => localStorage.setItem('cortex-workmate-v1', st), s.state)
      await page.reload({ waitUntil: 'networkidle2' })
      await sleep(750)
      for (const step of s.steps || []) {
        if (step.text) await clickText(page, step.text, step.nth || 0)
        if (step.aria) await clickAria(page, step.aria)
        if (step.svg) await clickSvg(page, step.svg)
        if (step.type) await typeInto(page, step.type)
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
    '# Cortex Workmate · 全界面截图与需求说明',
    '',
    `> 共 ${screens.length} 个界面，按场景分组；每个界面含截图 + 需求要点（定位 / 元素 / 交互 / 边界）。`,
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
