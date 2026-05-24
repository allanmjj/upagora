# UpAgora API 文档

## 现有 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/soul/extract | 灵魂提取（7维） | 需要 |
| GET | /api/soul/extract | 获取提取结果 | 需要 |
| POST | /api/soul/chat | 灵魂对话 | 需要 |
| GET | /api/soul/chat | 获取对话历史 | 需要 |
| POST | /api/soul/calibrate | 灵魂校准 | 需要 |
| GET | /api/soul/status | 灵魂状态 | 需要 |
| GET | /api/soul/persona | 获取人格档案 | 需要 |
| PUT | /api/soul/persona | 更新人格档案 | 需要 |
| POST | /api/soul/snapshot | 创建灵魂快照 | 需要 |
| POST | /api/soul/regenerate-persona | 重新生成人格 | 需要 |
| POST | /api/soul/import | 导入原始文本 | 需要 |
| GET | /api/soul/import | 获取导入列表 | 需要 |
| POST | /api/soul/skill/generate | 生成灵魂技能 | 需要 |
| GET | /api/soul/skill/list | 获取技能列表 | 需要 |

## 新 API（匿名体验）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/soul/quick-extract | 快速灵魂提取（3分钟体验） | 匿名 |
| POST | /api/soul/quick-chat | 快速灵魂对话 | 匿名 |
| GET | /api/soul/export-image?session_slug=xxx | 导出雷达图数据 | 匿名 |
| POST | /api/soul/guardian-calibrate | 守护者校准 | 匿名 |

## 3分钟体验流程

1. **打开 /experience 页面** - 简单直接的"输入文字"
2. **调用 quick-extract** - 3分钟内完成7维提取
3. **显示结果** - 雷达图 + 文字解读
4. **调用 quick-chat** - 和灵魂对话
5. **邀请守护者** - 生成分享链接
6. **注册保存** - 可选，注册后数据永久保存