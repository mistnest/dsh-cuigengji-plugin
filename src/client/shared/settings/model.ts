import type {IconName} from '../icons.tsx';
export const categories=[
  {id:'editor',title:'编辑与外观',description:'调整正文阅读和工作台的显示习惯。',icon:'edit'},
  {id:'writing',title:'AI与写作',description:'设置当前对话如何使用催更姬，以及当前作品的写作要求。',icon:'plan'},
  {id:'pet',title:'桌宠与记录',description:'选择桌面的陪伴角色，回顾每天的写作进度。',icon:'person'},
  {id:'data',title:'数据与备份',description:'管理作品的导入、导出和作品库备份。',icon:'book'},
] as const satisfies readonly {id:string;title:string;description:string;icon:IconName}[];
export type SettingsCategory=typeof categories[number]['id'];
export const settingsItems={
  font:{category:'editor',title:'正文字号',keywords:'字体 大小 阅读 编辑 显示'},
  leading:{category:'editor',title:'正文行距',keywords:'行高 紧凑 宽松 阅读'},
  lineNumbers:{category:'editor',title:'显示正文行号',keywords:'定位 跳转 章节 实际换行 Ctrl G'},
  directory:{category:'editor',title:'默认展开正文目录',keywords:'章节 侧栏 收起 首次打开'},
  motion:{category:'editor',title:'动画效果',keywords:'动态 减少 系统 外观'},
  'canvas-links':{category:'editor',title:'画布连线样式',keywords:'规划 设定 关系 经典 曲线 整理 圆角 分支 汇合 导出 图片'},
  'canvas-scroll':{category:'editor',title:'画布滚动操作',keywords:'规划 设定 触摸板 鼠标 滚轮 双指 平移 缩放 捏合 手势'},
  guidance:{category:'writing',title:'当前会话写作指引',keywords:'提示词 开启 关闭 注入 聊天 代码 工具 MCP'},
  preset:{category:'writing',title:'写作预设',keywords:'提示词 文风 叙述 风格 表达 要求'},
  variables:{category:'writing',title:'剧情变量',keywords:'状态 属性 等级 物品 MVU 酒馆 初始化 快照 角色 变量'},
  'pet-visible':{category:'pet',title:'开启桌宠',keywords:'显示 隐藏 桌面 陪伴'},
  'pet-role':{category:'pet',title:'陪伴角色',keywords:'大肥鱼 催更姬 模型 形象'},
  'pet-position':{category:'pet',title:'桌宠位置',keywords:'重置 右下角 找不到'},
  'pet-status':{category:'pet',title:'桌宠运行状态',keywords:'桌面 窗口 唤醒 启动 错误 重试'},
  records:{category:'pet',title:'写作记录',keywords:'字数 日期 统计 趋势 进度 历史'},
  'pet-usage':{category:'pet',title:'用量、费用与气泡',keywords:'Token 余额 价格 预算 额度 统计 提醒 声音 音效 素材 图片 角色 动图 账本'},
  transfer:{category:'data',title:'数据管理',keywords:'导入 导出 备份 恢复 全库 作品 世界书 角色卡 预设 文件'},
  directoryPath:{category:'data',title:'作品库目录',keywords:'存储 文件夹 路径 位置 数据'},
} as const;
export type SettingId=keyof typeof settingsItems;
export function matchesSetting(id:SettingId,query:string) {
  const item=settingsItems[id],category=categories.find(value=>value.id===item.category)!;
  const text=`${item.title} ${item.keywords} ${category.title}`.toLocaleLowerCase();
  return query.trim().toLocaleLowerCase().split(/\s+/).every(word=>text.includes(word));
}
