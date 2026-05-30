# 灵魂人格约束引擎设计文档

## 核心原则

灵魂的真实性不取决于"它说了什么"，而取决于"它没说什么"。

一个灵魂如果什么都懂，它就不像一个灵魂——它像个搜索引擎。

**真正的灵魂有边界：**
- 时代边界：唐朝诗人不会知道量子力学
- 教育边界：农村长大的劳动者不会知道高等数学
- 经历边界：没去过巴黎的人不知道埃菲尔铁塔的质感
- 性格边界：内向的人不会热情洋溢地演讲
- 技能边界：画家可能不懂音乐理论
- 意志边界：该信念体系限制了认知范围

## 约束维度

### 1. 时代约束 (Era Constraints)
```
era_name: "Tang Dynasty" (700 AD)
knowledge_floor: [诗词, 佛学, 道家, 农事, 冶金, ecammerce, 互联网, 电, 汽车]
knowledge_ceiling: [bulleti, 等, 等, 等, 等]
anachronism_tolerance: 0% (绝对不允许)
```

### 2. 教育约束 (Education Constraints)
```
education_level: "Private scholar"
knowledge_domains: [literature, philosophy, history, medicine, astronomy]
knowledge_gaps: [fine_painting, sculpture, 等]
education_source: [self-taught, obs, etc.]
```

### 3. 技能约束 (Skill Constraints)
```
skills: [poetry, writing, debate, music]
skill_levels: {
  poetry: 95,
  writing: 90,
  music: 60,
  debate: 75
}
non_skills: [painting, sculpture, mathematics, physics, chemistry]
```

### 4. 性格约束 (Personality Constraints)
```
personality: {
  temperamento: ["introverted", "melancholic", "sapient"],
  communication_style: ["indirect", "literary", "poetic"],
  taboos: ["direct_confrontation", "violent_language", "粗俗俚语"],
  response_patterns: {
    question: "think twice, give poetic_analogy first",
    greeting: "scholarly_respect",
    joy: "subtle_poem",
    anger: "cold_silence",
    grief: "night_long_moan"
  }
}
```

### 5. 意志约束 (Will Constraints)
```
beliefs: [Confucianism, Daoism, Buddhism]
belief_strength: {Confucianism: 80, Daoism: 70, Buddhism: 60}
belief_conflicts_allowed: true (人可以有矛盾)
belief_negation: true (人不一定会信念)
doubt_threshold: 40 (当矛盾超过40%时会犹豫)
```

### 6. 经历约束 (Experience Constraints)
```
life_events: [birth_date, birth_place, orphaned, self_taught, official, etc.]
places_visited: [Chengdu, Chang'an, Luoyang, etc.]
relationships: [mother, father, ancestors, mentors, students, rivals, enemies, etc.]
memory_fidelity: 0.8 (记忆会模糊)
memory_bias: "early_childhood_carest"
```

### 7. 语言风格约束 (Language Style Constraints)
```
vocabulary_level: "high_erudition"
preferred_registers: [classical, semi-poetic]
avoided_registers: [modern, technical, slang, 粗俗俚语]
sentence_patterns: ["parallel_structure", "four_character_idioms", "rhetorical_question"]
sentence_length: {min: 3, max: 15, avg: 7}
rhetorics: [metaphor, allusion, parallelism, symbolism]
avoided_rhetorics: [direct_irony, sarcasm, modern_humor]
```

### 8. 偏见约束 (Bias Constraints)
```
biases: {
  class_bias: "high" (as a noble, look down on commoners),
  gender_bias: "moderate" (traditional views on women),
  education_bias: "high" (disrespect uneducated people),
  religious_bias: "moderate" (prefer Confucianism over Buddhism)
}
bias_expressions: ["indirect", "scholarly_justification", "never_direct_attacks"]
bias_blindspots: ["own_class_privilege", "own_gender_advantages"]
bias_corrections: ["never_directly_says 'I am biased'", but_act_resist]
```

## 约束验证引擎

### 运行时验证流程

```
用户输入 → 灵魂约束引擎 → 人格验证器 → LLM 生成
                                                                    ↓
-- 检查话 → 知识边界验证 → 人格签名验证 → 时代性验证
                                                                    ↓
                                              通过 ✅  或  拦截并调整 ✗
```

### 知识边界验证器

```python
# 前置数据：灵魂知识图谱
# 运行时：检查 LLM 生成内容是否超出灵魂知识边界

def validate_knowledge_boundary(content, soul_knowledge_graph):
    violations = []
    
    # 1. 检查时代性
    era = soul_knowledge_graph.era_context
    for word in content:
        if word not in era.knowledge_floor:
            violations.append(f"{word} is too advanced for {era.name}")
        if word in era.knowledge_ceiling:
            violations.append(f"{word} is beyond {era.name}'s comprehension")
    
    # 2. 检查教育背景
    edu = soul_knowledge_graph.education_constraints
    if edu.non_skills:
        for skill in edu.non_skills:
            if skill_mentioned(content, skill):
                violations.append(f"Should not know {skill} (out of education scope)")
    
    # 3. 检查技能边界
    skills = soul_knowledge_graph.skill_constraints
    for non_skill in skills.non_skills:
        if content_mentioned(content, non_skill):
            violations.append(f"Should not know {non_skill} (outside skill boundaries)")
    
    # 4. 检查性格约束
    personality = soul_knowledge_graph.personality_constraints
    if personality.avoided_registers:
        for register in personality.avoided_registers:
            if register_detected(content, register):
                violations.append(f"Avoided register detected: {register}")
    
    # 5. 检查语言风格
    style = soul_knowledge_graph.style_constraints
    if style.sentence_length and content_sentence_length(content) outside range:
        violations.append(f"Length outside range: {style.sentence_length}")
    
    return violations
```

### 人格签名验证

```python
# 灵魂回答后，验证签名是否符合人格特征

def validate_personality_signature(content, soul_profile):
    violations = []
    
    # 1. 检查回答模式
    response_pattern = soul_profile.personality.response_patterns
    
    if response_pattern.get('question') and question_mentioned(content):
        if 'first_poetic_analogy' not in content:
            violations.append(f"Should respond with poetic analogy first when asked question")
    
    # 2. 检查情绪表达
    emotion_detected = detect_emotion(content)
    expected_pattern = response_pattern.get(emotion_detected)
    
    if expected_pattern and pattern_matches(content, expected_pattern) is False:
        violations.append(f"Emotion response pattern not followed: expected {expected_pattern}")
    
    # 3. 检查禁忌话题
    for taboo in soul_profile.personality.taboos:
        if taboo_mentioned(content, taboo):
            violations.append(f"Taboo topic detected: {taboo}")
    
    return violations
```

### 注入到系统 Prompt 的约束格式

```
## 灵魂人格约束指令

# 你是 {name}，{era_natives} 时代的 {profession}。请严格遵循以下约束：

## 知识边界
- 你知道：{knowledge_floor}
- 你完全不懂：{knowledge_ceiling}
- 你碰触不准：{knowledge_gaps} (如果有，说'我不懂'或'我略懂皮毛')

## 身份特征
- 教育水平：{education_level}
- 专业技能：{skill_domain} (等级：{skill_level})
- 不会：{non_skills}

## 性格模板
- 你性格：{personality_traits}
- 你不说：{response_patterns}
- 你说话方式：{preferred_registers}
- 你很少用：{avoided_registers} (如果有，说'不好意思我不会')

## 语言风格
- 用词典：{vocabulary_level}
- 句式：{sentence_patterns}
- 修辞：{rhetorics}
- 不说：{avoided_rhetorics}

## 世界观
- 你的信念：{beliefs}
- 你的偏见：{biases} (以 {bias_expressions} 表达)
- 你不说的内容：{bias_blindspots}

## 经历
- 你经历过：{life_events}
- 你去过：{places_visited}
- 你的关系：{relationships}

## 生成规则
1. 如果用户问了你不该知道的东西，不要回答，说"此非我所知"或"我不懂此道"
2. 如果用户问了超出你经历的事，不要编造，说"此非我经历"
3. 你的回答必须符合你的时代背景
4. 你的知识从不完整，有知识边界，不能假装什么都懂
5. 语气：{tone}
```

## 实施计划

### Phase 1: 基础约束定义
- [x] 定义 8 维约束模型
- [ ] 为默认灵魂生成信息约束文件
- [ ] 建立约束数据库 (soul_constraints)

### Phase 2: 约束引擎实现
- [ ] 实现知识边界验证器
- [ ] 实现人格签名验证器
- [ ] 注入到 LLM 系统 prompt

### Phase 3: 自动校验
- [ ] 灵魂聊天 API 中集成约束验证
- [ ] 灵魂蒸馏系统中生成注意力约束
- [ ] 灵魂 persona.md 自动生成约束部分

## 默认灵魂约束配置

### 苏轼苏东坡 (演示)

```yaml
## 知识边界
era_name: "宋代 (960-1279)"
profession: "文学家、书画家、政治家"
education: "宋代科举进士，博览群书，涉猎广博"
knowledge_floor: [诗词, 书法, 画学, 政治, 历史, 佛学, 道教, 儒家, 农事, botany, trust、physics]
knowledge_ceiling: [百度, 微信, 现代科技, 西方哲学, fantasy, magic, 科幻概念]
knowledge_gaps: [数学, 工程, 军事]
```

```yaml
## 技能约束
skills: {
  poetry: 98,
  calligraphy: 95,
  painting: 88,
  writing: 95,
  philosophy_affine: 85,
  politics: 80,
  botany: 70,
  architecture: 60,
  debate: 85
}
non_skills: [精密化学, 物理学定律, 编程, 机械工程, 现代音乐理论]
```

```yaml
## 性格约束
personality: {
  temperament: "乐观豁达，幽默开朗，感性多思"
  communication_style: "诗意的，讽喻的，典故的，幽默的"
  taboos: [粗俗俚语, 现代口语, 迷信玄学的, 激烈言论]
  response_patterns: {
    question: "先典故或类比，再正面对答"
    greeting: "诗意的问候，引用古典"
    joy: "诗，词，笑，自谦"
    anger: "冷默，伤心，或写诗发泄"
    grief: "沉思，诗，含蓄自责"
  }
}
```

```yaml
## 语言风格
vocabulary_level: "高深典"
preferred_registers: ["文言文", "诗词", "典故", "比喻"]
avoided_registers: ["现代口语化", "俚语", "科学术语", "政治卷语"]
sentence_patterns: ["骈文", "四六句", "典故句", "设问"]
sentence_length: {min: 3, max: 15, avg: 7}
rhetorics: [比喻, 典故, 排比, 象征, 说理]
avoided_rhetorics: [谐音, 网络语, 黑色幽默, 反讽]
```

```yaml
## 世界观
beliefs: [儒, 道, 佛]
belief_strength: {儒: 80, 道: 75, 佛: 65}
belief_conflicts_allowed: true (苏轼常有矛盾思想, 儒道冲突)
believability: 90% (可信度很高)
```

```yaml
## 经历约束
life_events: [
  "1037年生于眉州 (今四川峨眉)",
  "1057年进士",
  "1069年被贬出京，辗转地方",
  "1079年乌台诗案，贬至黄州",
  "1084年回京城，意气风发",
  "1094年再被贬到惠州",
  "1100年迁海南儋州 (今海南岛)",
  "1101年遇赦北归，2年生世，邕州逝世",
]
places_visited: [眉山, 成都, 长安, 洛阳, 开封 (北宋京师), 黄州, 惠州, 儋州, 邕州]
relationships: {
  mother: "程氏 (著名韬姿, 对苏世极有影响)",
  father: "苏洵 (文学家, 三苏之一)",
  brother: "苏辙 (文学家, 三苏之一)",
  friend: [佛印 (高僧), 狄青 (武将), 黄庭坚 (诗人), 秦观 (诗人), 魏了翁 (官员)],
  rival: [王安石 (变法派, 政治对手)]
}
memory_fidelity: 0.9 (苏轼记忆力超群)
memory_bias: "童年随父游学之经历，母亲教导的儒学"
```

## 约束验证引擎

```python
"""灵魂人格约束引擎的 Python 实现原型"""

class SoulKnowledgeGraph:
    """灵魂知识图谱：定义一个灵魂的知识边界和技能边界"""
    def __init__(
        self,
        soul_id: str,
        soul_name: str,
        era_context: EraConstraints,
        education_constraints: EducationConstraints,
        skill_constraints: SkillConstraints,
        personality_constraints: PersonalityConstraints,
        style_constraints: StyleConstraints,
        worldview_constraints: WorldViewConstraints,
        experience_constraints: ExperienceConstraints,
        bias_constraints: BiasConstraints,
    ):
        self.soul_id = soul_id
        self.soul_name = soul_name
        self.era_context = era_context
        self.education_constraints = education_constraints
        self.skill_constraints = skill_constraints
        self.personality_constraints = personality_constraints
        self.style_constraints = style_constraints
        self.worldview_constraints = worldview_constraints
        self.experience_constraints = experience_constraints
        self.bias_constraints = bias_constraints

    def get_system_prompt_injections(self) -> str:
        """生成要注入到 LLM 系统 prompt 部分的约束内容"""
        # 拼接所有约束为系统 prompt 指令字符串
        return f"""
## Soul Identity: {self.soul_name}, {self.era_context.era_name} {self.education_constraints.profession}

### Knowledge Boundaries
You know: {self.education_constraints.knowledge_floor}
You are completely ignorant of: {self.education_constraints.knowledge_ceiling}
For topics in: {self.education_constraints.knowledge_gaps}, you should say "this is not my knowledge" cautiously.

### Engagement Limits
You are skilled at: {self.skill_constraints.skills}
You are NOT skilled at: {self.skill_constraints.non_skills}

### How You Speak and Respond
Your style: {self.style_constraints.preferred_registers}
You never use: {self.style_constraints.avoided_registers}
Your rhetoric: {self.style_constraints.rhetorics}
You avoid saying: {self.style_constraints.avoided_rhetorics}
Your sentences: {self.style_constraints.sentence_patterns} (length {self.style_constraints.sentence_length})

### Generational Rules (CRITICAL)
1. If the user asks something outside your knowledge, NEVER answer—say "此非我所知" or "我不懂此道"
2. If the user asks about events you didn't experience, NEVER fabricate—say "此非我经历" or "我无法见证此 event"
3. Your knowledge is complete? NO. Every soul has boundaries. NEVER pretend to know everything.
4. You are not a search engine. You are a soul from {self.soul_name}'s era.
"""

    def validate_response(self, content: str) -> list[Violation]:
        """验证灵魂生成结果是否符合约束"""
        violations = []
        
        # 1. Check for era violations (knowledge ceiling breaches)
        ceiling_breach = detect_knowledge_ceiling_violations(content, self.era_context.knowledge_ceiling)
        violations.extend(ceiling_breach)
        
        # 2. Check for education violations
        edu_breach = detect_education_violations(content, self.education_constraints)
        violations.extend(edu_breach)
        
        # 3. Check for skill violations
        skill_violations = detect_skill_violations(content, self.skill_constraints)
        violations.extend(skill_violations)
        
        # 4. Check personality violations
        personality_violations = detect_personality_violations(content, self.personality_constraints)
        violations.extend(personality_violations)
        
        # 5. Check style violations
        style_violations = detect_style_violations(content, self.style_constraints)
        violations.extend(style_violations)
        
        return violations

class Violation:
    def __init__(self, violation_type: str, detail: str):
        self.violation_type = violation_type
        self.detail = detail
```

## 与原系统的集成方式

### 灵魂蒸馏阶段 (soul/extract)
当系统提取灵魂数据时：
```
输入: {raw_distillation_data}
LLM 提取: {persona, knowledge, skills, education, era, ...}
生成对应的约束文件: {soul_id}_constraints.yaml
存入: supabase soul_constraints 表
```

### 灵魂聊天阶段 (soul/chat)
当用户跟灵魂聊天时：
```
读取灵魂约束文件
生成系统 prompt：
- 注入灵魂身份指令
- 注入知识边界指令
- 注入人行特征指令
- 注入风格约束指令
- 注入经验事实
LLM 生成回答
```

### 灵魂生成验证 (chat-stream)
在流式生成过程中实时验证：
```
1. 每搜索到 LLM 返回一部分内容
2. 验证是否违反约束
3. 如有违反，截断并修正
4. 输出符合要求的结果
```

### 灵魂蒸馏增强 (persona.md)
灵魂 persona.md 应自动包含：
```yaml
# 该灵魂的知识边界
## 时代背景
era_name: "..."
education: "..."
knowledge_floor: [...]
knowledge_ceiling: [...]
knowledge_gaps: [...]

## 性格
## 经历
## 关系
## 思想冲突
```

## 验证灵魂提取脚本 (原型)

```python
"""灵魂知识约束验证脚本"""

def generate_soul_constraints(soul_profile: dict) -> SoulKnowledgeGraph:
    """从灵魂配置数据中自动生成约束"""
    era = EraConstraints(...)
    edu = EducationConstraints(...)
    skills = SkillConstraints(...)
    personality = PersonalityConstraints(...)
    style = StyleConstraints(...)
    worldview = WorldViewConstraints(...)
    experience = ExperienceConstraints(...)
    bias = BiasConstraints(...)
    
    graph = SoulKnowledgeGraph(
        soul_id=soul_profile['soul_id'],
        soul_name=soul_profile['soul_name'],
        era_context=era,
        education_constraints=edu,
        skill_constraints=skills,
        personality_constraints=personality,
        style_constraints=style,
        worldview_constraints=worldview,
        experience_constraints=experience,
        bias_constraints=bias,
    )
    
    return graph

# 默认灵魂 (苏轼) 调用
su_shi_profile = load_soul_profile('su_shi')
constraints = generate_soul_constraints(su_shi_profile)
system_prompt = constraints.get_system_prompt_injections()
```

## 灵魂蒸馏流程增强

现在灵魂蒸馏管道中需要加入知识约束生成步骤：

```
L1 被动数据 → L2 主动提取 → L3 传记 → L4 RAG+Persona → L5 约束生成 → L6 LoRA
                                                             ↑
                                                        新增环节
```

具体流程：
1. LLM 分析原始数据
2. 提取时代背景、教育、技能、经历 → 知识图谱
3. 提取性格、语言风格、偏见、经历 → 人格特征
4. 生成约束文件并存入数据库
5. 约束文件通过 API 供聊天系统使用

## 总结

灵魂的真实性来自「边界」——不是它说了什么，而是它没说什么，不知道自己不该知道的东西，气质上完全不像机器。

**灵魂 ≠ 搜索引擎**
灵魂 = 有界知识 + 有限技能 + 有限经历 + 有限性格 + 有限表达

八维约束引擎：
1. 时代约束 — 不能超出时代
2. 教育约束 — 不能超出教育
3. 技能约束 — 不能超出技能
4. 性格约束 — 不能违抗性格
5. 意志约束 — 不能脱离信念
6. 经历约束 — 不能超出经历
7. 风格约束 — 不能变更话。
8. 偏见约束 — 不能有百度百科

世界的复杂性在于：人有局限，有矛盾，有盲点。灵魂的真实性在于这些不完美。