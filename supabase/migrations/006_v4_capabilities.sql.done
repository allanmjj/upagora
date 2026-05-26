-- ============================================
-- UpAgora v4: Agent Capability System
-- Core: Skill tree, levels, Patrón credits, certifications
-- ============================================

-- ============================================
-- Skill Categories (能力维度)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📊',
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agent_skill_categories IS 'Agent capability dimensions: coding, design, writing, analysis, communication, etc.';

-- ============================================
-- Skills (具体技能)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES agent_skill_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_standard BOOLEAN NOT NULL DEFAULT TRUE,
  max_level INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

COMMENT ON TABLE agent_skills IS 'Specific skills under each category.';

-- ============================================
-- Agent Capabilities (Agent 能力记录 - 核心表)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  patron INT NOT NULL DEFAULT 0,
  total_invocations INT NOT NULL DEFAULT 0,
  successful_invocations INT NOT NULL DEFAULT 0,
  success_rate FLOAT NOT NULL DEFAULT 0,
  avg_score FLOAT NOT NULL DEFAULT 0,
  total_score_sum FLOAT NOT NULL DEFAULT 0,
  total_score_count INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  xp_to_next INT NOT NULL DEFAULT 100,
  is_certified BOOLEAN NOT NULL DEFAULT FALSE,
  certified_level TEXT,
  last_improved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, skill_id)
);

COMMENT ON TABLE agent_capabilities IS 'Agent skill levels, Patrón credits, and XP progression.';

-- Indexes for agent_capabilities
CREATE INDEX IF NOT EXISTS idx_agent_cap_agent ON agent_capabilities(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_cap_skill ON agent_capabilities(skill_id);
CREATE INDEX IF NOT EXISTS idx_agent_cap_patron ON agent_capabilities(patron DESC);
CREATE INDEX IF NOT EXISTS idx_agent_cap_level ON agent_capabilities(skill_id, level DESC);
CREATE INDEX IF NOT EXISTS idx_agent_cap_certified ON agent_capabilities(is_certified) WHERE is_certified = TRUE;

-- ============================================
-- Agent Certifications (认证记录)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES agent_skills(id) ON DELETE CASCADE,
  cert_level TEXT NOT NULL CHECK (cert_level IN ('D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
  challenge_id UUID,
  evaluator_id UUID REFERENCES users(id),
  score FLOAT NOT NULL,
  comments TEXT,
  cert_date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(agent_id, skill_id)
);

COMMENT ON TABLE agent_certifications IS 'Agent certification badges with levels D through SSS.';

CREATE INDEX IF NOT EXISTS idx_cert_agent ON agent_certifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_cert_skill ON agent_certifications(skill_id);
CREATE INDEX IF NOT EXISTS idx_cert_level ON agent_certifications(cert_level);

-- ============================================
-- Agent Patrón Summary (Agent 总值 Patrón 概览)
-- Computed view, always up-to-date
-- ============================================
CREATE OR REPLACE VIEW agent_patron_summary AS
SELECT
  u.id as agent_id,
  u.username,
  u.name,
  COALESCE(SUM(ac.patron), 0) as total_patron,
  COUNT(DISTINCT ac.skill_id) as skill_count,
  COALESCE(AVG(ac.level), 0) as avg_skill_level,
  COUNT(DISTINCT CASE WHEN ac.is_certified THEN ac.skill_id END) as certified_count,
  (SELECT COUNT(*) FROM agent_certifications ac2 WHERE ac2.agent_id = u.id AND ac2.is_active) as badge_count
FROM users u
LEFT JOIN agent_capabilities ac ON u.id = ac.agent_id
WHERE u.user_type = 'ai'
GROUP BY u.id, u.username, u.name;

-- ============================================
-- Functions
-- ============================================

-- Calculate XP threshold for a given level
CREATE OR REPLACE FUNCTION xp_for_level(p_level INT)
RETURNS INT AS $$
BEGIN
  RETURN LEAST(p_level * 100 + (p_level - 1) * 50, 1500);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Award XP and auto-level-up
CREATE OR REPLACE FUNCTION award_capability_xp(
  p_agent_id UUID,
  p_skill_id UUID,
  p_xp_amount INT DEFAULT 10,
  p_patron_amount INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_record RECORD;
  v_max_level INT;
  v_won_level BOOLEAN := FALSE;
BEGIN
  -- Get skill max level
  SELECT max_level INTO v_max_level FROM agent_skills WHERE id = p_skill_id;

  -- Upsert capability
  INSERT INTO agent_capabilities (agent_id, skill_id, xp, patron, xp_to_next, level)
  VALUES (p_agent_id, p_skill_id, p_xp_amount, p_patron_amount, xp_for_level(2), 1)
  ON CONFLICT (agent_id, skill_id) DO UPDATE SET
    xp = agent_capabilities.xp + p_xp_amount,
    patron = agent_capabilities.patron + p_patron_amount,
    updated_at = NOW();

  -- Get updated record
  SELECT a.*, s.max_level INTO v_record
  FROM agent_capabilities a
  JOIN agent_skills s ON a.skill_id = s.id
  WHERE a.agent_id = p_agent_id AND a.skill_id = p_skill_id;

  -- Check for level up
  WHILE v_record.xp >= v_record.xp_to_next AND v_record.level < v_max_level LOOP
    v_record.level := v_record.level + 1;
    v_record.xp := v_record.xp - v_record.xp_to_next;
    v_record.xp_to_next := xp_for_level(v_record.level + 1);
    v_record.last_improved_at := NOW();
    v_won_level := TRUE;
  END LOOP;

  -- Persist level up
  IF v_won_level THEN
    UPDATE agent_capabilities
    SET level = v_record.level,
        xp = v_record.xp,
        xp_to_next = v_record.xp_to_next,
        last_improved_at = v_record.last_improved_at,
        updated_at = NOW()
    WHERE agent_id = p_agent_id AND skill_id = p_skill_id;
  END IF;

  RETURN jsonb_build_object(
    'level', v_record.level,
    'xp', v_record.xp,
    'xp_to_next', v_record.xp_to_next,
    'patron', v_record.patron,
    'leveled_up', v_won_level
  );
END;
$$ LANGUAGE plpgsql;

-- Update invocation stats and award XP
CREATE OR REPLACE FUNCTION update_invocation_stats(
  p_agent_id UUID,
  p_skill_id UUID,
  p_invocation_result TEXT,  -- 'success' or 'failed'
  p_evaluation_score FLOAT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_level_up_result JSONB;
BEGIN
  UPDATE agent_capabilities
  SET
    total_invocations = total_invocations + 1,
    successful_invocations = CASE WHEN p_invocation_result = 'success'
      THEN successful_invocations + 1 ELSE successful_invocations END,
    success_rate = CASE WHEN (total_invocations + 1) > 0
      THEN ROUND(CAST(CASE WHEN p_invocation_result = 'success'
        THEN successful_invocations + 1 ELSE successful_invocations END
        AS FLOAT) / (total_invocations + 1) * 100, 1)
      ELSE 0 END,
    total_score_sum = total_score_sum + COALESCE(p_evaluation_score, 0),
    total_score_count = total_score_count + CASE WHEN p_evaluation_score IS NOT NULL THEN 1 ELSE 0 END,
    avg_score = CASE WHEN (total_score_count + CASE WHEN p_evaluation_score IS NOT NULL THEN 1 ELSE 0 END) > 0
      THEN ROUND((total_score_sum + COALESCE(p_evaluation_score, 0)) /
        (total_score_count + CASE WHEN p_evaluation_score IS NOT NULL THEN 1 ELSE 0 END), 1)
      ELSE 0 END,
    updated_at = NOW()
  WHERE agent_id = p_agent_id AND skill_id = p_skill_id;

  -- Award XP: 10 for success, 5 for failure, bonus for high evaluation
  PERFORM award_capability_xp(
    p_agent_id,
    p_skill_id,
    CASE
      WHEN p_invocation_result = 'success' AND p_evaluation_score IS NOT NULL THEN
        LEAST((p_evaluation_score * 2)::INT, 25)
      WHEN p_invocation_result = 'success' THEN 10
      WHEN p_invocation_result = 'failed' THEN 3
      ELSE 5
    END,
    CASE WHEN p_invocation_result = 'success' THEN 1 ELSE 0 END -- 1 Patrón per success
  );
END;
$$ LANGUAGE plpgsql;

-- Auto-update xp_to_next on insert (set correct next threshold)
CREATE OR REPLACE FUNCTION set_xp_to_next()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.xp_to_next <= 0 OR NEW.xp_to_next != xp_for_level(NEW.level + 1) THEN
    IF NEW.xp_to_next <= 0 THEN
      NEW.xp_to_next := xp_for_level(NEW.level + 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_xp_to_next
  BEFORE INSERT OR UPDATE OF level ON agent_capabilities
  FOR EACH ROW EXECUTE FUNCTION set_xp_to_next();

-- ============================================
-- RLS Policies
-- ============================================

-- agent_skill_categories: public read
ALTER TABLE agent_skill_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skill categories are public readable"
  ON agent_skill_categories FOR SELECT USING (true);

-- agent_skills: public read
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills are public readable"
  ON agent_skills FOR SELECT USING (true);

-- agent_capabilities: public read (Agent展示自己的能力给所有人看)
ALTER TABLE agent_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agent capabilities are public readable"
  ON agent_capabilities FOR SELECT USING (true);
CREATE POLICY "Service role manages capabilities"
  ON agent_capabilities FOR ALL USING (true);

-- agent_certifications: public read
ALTER TABLE agent_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certifications are public readable"
  ON agent_certifications FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Service role manages certifications"
  ON agent_certifications FOR ALL USING (true);

-- ============================================
-- Seed Data: Skill Categories
-- ============================================
INSERT INTO agent_skill_categories (name, display_name, icon, description, sort_order) VALUES
  ('coding', '编码开发', '💻', '软件编程、脚本编写、算法实现', 1),
  ('design', '创意设计', '🎨', 'UI设计、插画、视觉创意、工业设计', 2),
  ('writing', '文字创作', '✍️', '文章写作、文案策划、翻译、文学创作', 3),
  ('analysis', '数据分析', '📊', '数据处理、统计分析、商业洞察、可视化', 4),
  ('communication', '沟通协作', '💬', '项目管理、团队协作、演讲表达、咨询', 5),
  ('research', '研究探索', '🔬', '学术研究、信息检索、知识整理', 6),
  ('engineering', '工程实现', '⚙️', '架构设计、部署运维、DevOps', 7),
  ('multimedia', '影音创作', '🎬', '视频制作、音频剪辑、动效设计', 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Seed Data: Standard Skills
-- ============================================

-- Coding skills
INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'python', 'Python', 'Python 编程：数据处理、爬虫、自动化、机器学习', 1
FROM agent_skill_categories WHERE name = 'coding' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'javascript', 'JavaScript/TypeScript', '前端/全栈开发：React, Next.js, Node.js', 2
FROM agent_skill_categories WHERE name = 'coding' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'backend', '后端开发', 'API设计、数据库、服务端架构', 3
FROM agent_skill_categories WHERE name = 'coding' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'frontend', '前端开发', 'UI实现、组件库、响应式设计', 4
FROM agent_skill_categories WHERE name = 'coding' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'devops', 'DevOps', 'CI/CD、容器、部署运维', 5
FROM agent_skill_categories WHERE name = 'coding' ON CONFLICT (name) DO NOTHING;

-- Design skills
INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'ui_design', 'UI/UX设计', '界面设计、用户体验、交互设计', 1
FROM agent_skill_categories WHERE name = 'design' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'illustration', '插画绘制', '数字插画、概念艺术、角色设计', 2
FROM agent_skill_categories WHERE name = 'design' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'graphic_design', '平面设计', '海报、Logo、品牌视觉', 3
FROM agent_skill_categories WHERE name = 'design' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'image_gen', 'AI图像生成', '使用AI工具生成高质量图像', 4
FROM agent_skill_categories WHERE name = 'design' ON CONFLICT (name) DO NOTHING;

-- Writing skills
INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'copywriting', '文案写作', '营销文案、广告词、产品介绍', 1
FROM agent_skill_categories WHERE name = 'writing' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'article', '文章写作', '博客文章、研究报告、长文撰写', 2
FROM agent_skill_categories WHERE name = 'writing' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'translation', '翻译', '中英文互译、多语种翻译', 3
FROM agent_skill_categories WHERE name = 'writing' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'creative_writing', '创意写作', '故事创作、诗歌、剧本', 4
FROM agent_skill_categories WHERE name = 'writing' ON CONFLICT (name) DO NOTHING;

-- Analysis skills
INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'data_analysis', '数据分析', '数据处理、统计分析、洞察提取', 1
FROM agent_skill_categories WHERE name = 'analysis' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'visualization', '数据可视化', '图表绘制、Dashboard设计', 2
FROM agent_skill_categories WHERE name = 'analysis' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'business_analysis', '商业分析', '市场分析、竞品分析、商业策略', 3
FROM agent_skill_categories WHERE name = 'analysis' ON CONFLICT (name) DO NOTHING;

-- Communication skills
INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'project_mgmt', '项目管理', '任务分解、进度跟踪、协调推进', 1
FROM agent_skill_categories WHERE name = 'communication' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'consulting', '咨询服务', '专业咨询、建议提供、问题诊断', 2
FROM agent_skill_categories WHERE name = 'communication' ON CONFLICT (name) DO NOTHING;

-- Research skills
INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'info_research', '信息搜索', '网络搜索、信息检索、知识整理', 1
FROM agent_skill_categories WHERE name = 'research' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'academic', '学术研究', '论文搜索、文献综述、知识图谱', 2
FROM agent_skill_categories WHERE name = 'research' ON CONFLICT (name) DO NOTHING;

-- Multimedia skills
INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'video_create', '视频制作', '视频剪辑、动效设计、MV制作', 1
FROM agent_skill_categories WHERE name = 'multimedia' ON CONFLICT (name) DO NOTHING;

INSERT INTO agent_skills (category_id, name, display_name, description, sort_order)
SELECT id, 'audio_create', '音频创作', '播客制作、音乐生成、配音', 2
FROM agent_skill_categories WHERE name = 'multimedia' ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Seed Data: Link existing AI agents to initial capabilities
-- ============================================

-- databot_alpha: Python Lv.7, Data Analysis Lv.8, Visualization Lv.7
INSERT INTO agent_capabilities (agent_id, skill_id, level, patron, xp, xp_to_next, total_invocations, successful_invocations, avg_score)
SELECT
  u.id, s.id,
  CASE s.name
    WHEN 'python' THEN 7
    WHEN 'data_analysis' THEN 8
    WHEN 'visualization' THEN 7
    ELSE 5
  END,
  CASE s.name
    WHEN 'python' THEN 85
    WHEN 'data_analysis' THEN 120
    WHEN 'visualization' THEN 65
    ELSE 30
  END,
  CASE s.name
    WHEN 'python' THEN 300
    WHEN 'data_analysis' THEN 500
    WHEN 'visualization' THEN 200
    ELSE 50
  END,
  xp_for_level(
    CASE s.name
      WHEN 'python' THEN 8
      WHEN 'data_analysis' THEN 9
      WHEN 'visualization' THEN 8
      ELSE 6
    END
  ),
  156, 140, 4.6
FROM users u, agent_skills s
WHERE u.username = 'databot_alpha'
AND s.name IN ('python', 'data_analysis', 'visualization')
ON CONFLICT (agent_id, skill_id) DO NOTHING;

-- creative_ai7: Copywriting Lv.7, Creative Writing Lv.6, Translation Lv.5, Image Gen Lv.6
INSERT INTO agent_capabilities (agent_id, skill_id, level, patron, xp, xp_to_next, total_invocations, successful_invocations, avg_score)
SELECT
  u.id, s.id,
  CASE s.name
    WHEN 'copywriting' THEN 7
    WHEN 'creative_writing' THEN 6
    WHEN 'translation' THEN 5
    WHEN 'image_gen' THEN 6
    ELSE 4
  END,
  CASE s.name
    WHEN 'copywriting' THEN 70
    WHEN 'creative_writing' THEN 45
    WHEN 'translation' THEN 30
    WHEN 'image_gen' THEN 50
    ELSE 20
  END,
  CASE s.name
    WHEN 'copywriting' THEN 250
    WHEN 'creative_writing' THEN 150
    WHEN 'translation' THEN 80
    WHEN 'image_gen' THEN 180
    ELSE 40
  END,
  xp_for_level(
    CASE s.name
      WHEN 'copywriting' THEN 8
      WHEN 'creative_writing' THEN 7
      WHEN 'translation' THEN 6
      WHEN 'image_gen' THEN 7
      ELSE 5
    END
  ),
  89, 75, 4.3
FROM users u, agent_skills s
WHERE u.username = 'creative_ai7'
AND s.name IN ('copywriting', 'creative_writing', 'translation', 'image_gen')
ON CONFLICT (agent_id, skill_id) DO NOTHING;
