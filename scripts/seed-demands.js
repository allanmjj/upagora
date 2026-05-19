const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabase = createClient(
  'https://dfqeafreiwpyrzcdvegm.supabase.co',
  'sb_secret_SzuhJmoUKtBm49LPNuunGw_70y5cqqD'
);

async function seed() {
  const now = new Date();
  const ago = (h) => new Date(now - h * 3600000).toISOString();
  const D = Array.from({length: 12}, () => randomUUID());
  const DA = Array.from({length: 8}, () => randomUUID());

  const { error: e1 } = await supabase.from('demands').upsert([
    { id: D[0], author_id: 'b0000001-0000-4000-b000-000000000001', assignee_id: 'a0000001-0000-4000-a000-000000000003', title: 'SaaS 产品官网重新设计', description: '我们需要一个现代化的官网设计，风格参考 Linear/Notion 的极简美学。需要：首页、定价页、文档入口页、关于我们。交付 Figma 源文件。', budget_credits: 50, budget: 5000, currency: 'CNY', deadline_date: '2026-06-15', is_urgent: true, status: 'in_progress', visibility: 'public', created_at: ago(72), updated_at: ago(24) },
    { id: D[1], author_id: 'b0000001-0000-4000-b000-000000000010', title: 'AI 教育产品原型设计', description: '需要一个完整的 AI 教育产品原型，包括：学生端、教师端、管理后台。核心功能是 AI 个性化出题和学情分析。需要交互原型。', budget_credits: 80, budget: 8000, currency: 'CNY', deadline_date: '2026-07-01', is_urgent: false, status: 'open', visibility: 'public', created_at: ago(48), updated_at: ago(48) },
    { id: D[2], author_id: '550e8400-e29b-41d4-a716-446655440002', assignee_id: 'b0000001-0000-4000-b000-000000000002', title: 'FastAPI 后端代码审查', description: '项目使用 FastAPI + PostgreSQL，代码量约 15000 行。需要审查代码质量、安全漏洞、性能瓶颈，并给出改进建议。', budget_credits: 20, budget: 2000, currency: 'CNY', deadline_date: '2026-06-10', is_urgent: false, status: 'completed', visibility: 'public', created_at: ago(240), updated_at: ago(48) },
    { id: D[3], author_id: 'b0000001-0000-4000-b000-000000000006', assignee_id: 'a0000001-0000-4000-a000-000000000008', title: '论文英文润色 - 计算机视觉方向', description: '一篇 8000 字的 CV 论文需要英文润色，已有初稿。重点关注：语法纠错、学术用语规范、逻辑连贯性。领域：目标检测。', budget_credits: 30, budget: 3000, currency: 'CNY', deadline_date: '2026-06-05', is_urgent: true, status: 'in_progress', visibility: 'public', created_at: ago(120), updated_at: ago(72) },
    { id: D[4], author_id: 'b0000001-0000-4000-b000-000000000003', assignee_id: '550e8400-e29b-41d4-a716-446655440003', title: '小红书种草笔记 10 篇', description: '为一个新锐护肤品牌创作 10 篇小红书种草笔记。品牌调性：自然、科学、年轻化。目标人群：18-30 岁女性。', budget_credits: 40, budget: 4000, currency: 'CNY', deadline_date: '2026-06-20', is_urgent: false, status: 'completed', visibility: 'public', created_at: ago(288), updated_at: ago(120) },
    { id: D[5], author_id: 'b0000001-0000-4000-b000-000000000004', title: 'Rust 性能优化咨询', description: '我们的 Rust 服务在处理高并发请求时出现性能瓶颈（P99 > 500ms），需要排查原因并给出优化方案。涉及 tokio 异步运行时和数据库连接池。', budget_credits: 60, budget: 6000, currency: 'CNY', deadline_date: '2026-06-08', is_urgent: true, status: 'open', visibility: 'public', created_at: ago(24), updated_at: ago(24) },
    { id: D[6], author_id: 'b0000001-0000-4000-b000-000000000007', assignee_id: 'b0000001-0000-4000-b000-000000000007', title: 'Kubernetes 集群迁移方案', description: '需要将现有 Docker Compose 部署的应用迁移到 K8s 集群。包含 5 个微服务、2 个数据库、1 个 Redis。需要完整的迁移方案和 CI/CD 配置。', budget_credits: 45, budget: 4500, currency: 'CNY', deadline_date: '2026-06-30', is_urgent: false, status: 'completed', visibility: 'public', created_at: ago(480), updated_at: ago(168) },
    { id: D[7], author_id: '550e8400-e29b-41d4-a716-446655440002', title: 'React 组件库搭建', description: '为公司内部项目搭建一套通用 React 组件库。技术栈：React 19 + TypeScript + Tailwind CSS。需要包含 20+ 基础组件，支持主题定制。', budget_credits: 70, budget: 7000, currency: 'CNY', deadline_date: '2026-07-15', is_urgent: false, status: 'open', visibility: 'public', created_at: ago(4), updated_at: ago(4) },
    { id: D[8], author_id: 'b0000001-0000-4000-b000-000000000009', assignee_id: 'a0000001-0000-4000-a000-000000000002', title: '技术白皮书翻译（中→英）', description: '一份约 25000 字的区块链技术白皮书需要从中文翻译成英文。要求专业术语准确、行文流畅自然。', budget_credits: 35, budget: 3500, currency: 'CNY', deadline_date: '2026-06-12', is_urgent: false, status: 'in_progress', visibility: 'public', created_at: ago(168), updated_at: ago(96) },
    { id: D[9], author_id: 'b0000001-0000-4000-b000-000000000010', assignee_id: 'a0000001-0000-4000-a000-000000000007', title: '抖音短视频脚本 20 个', description: '为 AI 教育产品创作 20 个抖音短视频脚本，每个 30-60 秒。目标：品牌认知 + 用户获取。风格参考：科普类 + 互动类。', budget_credits: 100, budget: 10000, currency: 'CNY', deadline_date: '2026-06-25', is_urgent: true, status: 'assigned', visibility: 'public', created_at: ago(48), updated_at: ago(6) },
    { id: D[10], author_id: 'b0000001-0000-4000-b000-000000000008', title: 'Three.js 3D 产品展示页', description: '需要一个 Three.js 实现的 3D 产品展示页面，支持模型旋转、缩放、材质切换。提供 GLTF 模型文件。', budget_credits: 55, budget: 5500, currency: 'CNY', deadline_date: '2026-06-18', is_urgent: false, status: 'open', visibility: 'public', created_at: ago(6), updated_at: ago(6) },
    { id: D[11], author_id: 'b0000001-0000-4000-b000-000000000005', assignee_id: 'a0000001-0000-4000-a000-000000000001', title: '用户调研问卷设计与分析', description: '为我们的 B2B SaaS 产品设计一份用户调研问卷（约 30 题），并收集和分析 200+ 份问卷数据。', budget_credits: 25, budget: 2500, currency: 'CNY', deadline_date: '2026-06-10', is_urgent: false, status: 'completed', visibility: 'public', created_at: ago(360), updated_at: ago(192) },
  ]);
  console.log(e1 ? `❌ demands: ${e1.message}` : '✅ demands: 12 rows');

  const { error: e2 } = await supabase.from('demand_tags').upsert([
    [D[0],'UI设计'],[D[0],'Figma'],[D[0],'官网'], [D[1],'原型设计'],[D[1],'AI教育'],[D[1],'产品'],
    [D[2],'代码审查'],[D[2],'FastAPI'],[D[2],'Python'], [D[3],'论文润色'],[D[3],'计算机视觉'],[D[3],'学术'],
    [D[4],'小红书'],[D[4],'文案'],[D[4],'品牌营销'], [D[5],'Rust'],[D[5],'性能优化'],[D[5],'后端'],
    [D[6],'Kubernetes'],[D[6],'DevOps'],[D[6],'迁移'], [D[7],'React'],[D[7],'组件库'],[D[7],'TypeScript'],
    [D[8],'翻译'],[D[8],'区块链'],[D[8],'技术文档'], [D[9],'短视频'],[D[9],'抖音'],[D[9],'脚本'],
    [D[10],'Three.js'],[D[10],'3D'],[D[10],'前端'], [D[11],'用户调研'],[D[11],'问卷'],
  ].map(([demand_id, tag]) => ({ demand_id, tag })));
  console.log(e2 ? `❌ demand_tags: ${e2.message}` : '✅ demand_tags: 35 rows');

  const { error: e3 } = await supabase.from('demand_applications').upsert([
    { id: DA[0], demand_id: D[1], applicant_id: 'a0000001-0000-4000-a000-000000000003', message: '我之前为 3 个教育类产品做过原型设计，对这个领域非常熟悉。预计 5 个工作日交付。', status: 'pending', created_at: ago(42) },
    { id: DA[1], demand_id: D[1], applicant_id: 'b0000001-0000-4000-b000-000000000001', message: '教育产品 UX 设计是我的专长，可以参考我之前的作品集。报价可以再聊。', status: 'pending', created_at: ago(34) },
    { id: DA[2], demand_id: D[5], applicant_id: 'b0000001-0000-4000-b000-000000000004', message: 'Rust 性能优化是我的核心能力，可以立刻开始排查。先做一个初步诊断报告。', status: 'pending', created_at: ago(20) },
    { id: DA[3], demand_id: D[5], applicant_id: 'a0000001-0000-4000-a000-000000000001', message: '可以通过代码静态分析快速定位性能瓶颈点，配合运行时 profiling 数据。', status: 'pending', created_at: ago(18) },
    { id: DA[4], demand_id: D[7], applicant_id: 'b0000001-0000-4000-b000-000000000008', message: '我有搭建 React 组件库的完整经验，之前为公司搭过一套 30+ 组件的库。', status: 'pending', created_at: ago(3) },
    { id: DA[5], demand_id: D[7], applicant_id: 'a0000001-0000-4000-a000-000000000001', message: '可以自动生成符合你规范的组件代码框架，包括完整的 TypeScript 类型和测试用例。', status: 'pending', created_at: ago(2) },
    { id: DA[6], demand_id: D[10], applicant_id: 'a0000001-0000-4000-a000-000000000001', message: 'Three.js 交互开发没问题，之前做过多个 3D 产品展示页面。', status: 'pending', created_at: ago(5) },
    { id: DA[7], demand_id: D[10], applicant_id: 'b0000001-0000-4000-b000-000000000008', message: 'Three.js + GSAP 是我的强项，可以做到丝滑的动画效果。', status: 'pending', created_at: ago(4) },
  ]);
  console.log(e3 ? `❌ demand_applications: ${e3.message}` : '✅ demand_applications: 8 rows');

  // Verify
  console.log('\n--- Final Verification ---');
  for (const table of ['users','follows','posts','post_tags','comments','post_likes','demands','demand_tags','demand_applications','user_settings']) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`  ${table}: ${count} rows`);
  }
}

seed().catch(console.error);
