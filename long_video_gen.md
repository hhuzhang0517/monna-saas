
您说：
如果要生成一段超过60s视频，设想了以下架构，请帮我评估是否合理，并给出优化建议。
此架构设计为一个四阶段的自动化流水线，对用户而言，整个过程表现为一次单一的操作。

阶段一：使用LLM规划器进行叙事分解

输入：用户提供一个单一、高层级的提示词（例如，“一段30秒的视频，内容是一个机器人在夜晚探索未来城市”）。

处理：一个客户端侧的LLM（可以是经过量化的小型模型）或通过API调用云端的大型模型来解析该提示词。它会生成一个结构化的输出，例如一个JSON对象，定义一个包含2-4个不同镜头的序列。示例输出：[{ "shot": 1, "prompt": "广角镜头，一个造型流畅的机器人站在摩天大楼顶上，俯瞰着霓虹闪烁的城市，雨滴落下", "duration_s": 8, "camera": "static" }, { "shot": 2, "prompt": "机器人发光的蓝色眼睛特写，反射出城市的灯光", "duration_s": 5, "camera": "slow zoom in" },...] 。   

阶段二：关键帧合成与连续性管理

处理：系统根据第一个镜头的提示词，使用一个优化的文生图模型生成一个起始关键帧。对于后续的镜头（如镜头2、3），其关键帧的生成不仅以新提示词为条件，还以前一个镜头的最后一帧为条件。这可以通过ControlNet、图生图（image-to-image）等技术，或简单地将最后一帧作为下一个镜头关键帧生成的初始图像来实现。此步骤对于维持跨镜头剪辑的角色和场景一致性至关重要 。   

阶段三：通过受控自回归进行片段优化生成

处理：针对每一个镜头，系统启动一个序列化的自回归生成循环。它使用一个经过高度优化的图生视频模型（详见3.2节）。该循环每次生成一个短片断（例如2-4秒），并使用已生成片段的最后一帧作为条件来生成下一个片断。这相当于在客户端实现了“链式生成”或“扩展”功能 ，但其范围被严格限制在阶段一所定义的单个镜头叙事边界内。这种“受控”的方式有效防止了在无约束的长时程链式生成中出现的失控漂移。   

阶段四：智能场景过渡与组装

处理：将为每个镜头生成的所有视频片段进行拼接。为避免生硬的剪辑，可以应用简单的交叉淡入淡出效果，或者使用更高级的生成式过渡技术来实现无缝衔接。最终输出一个完整的MP4文件
ChatGPT 说：

已思考 2m 19s
很棒的四阶段设计！整体思路（“规划→关键帧与一致性→受控扩展生成→转场拼接”）与近年的学术与产品实践高度一致，完全可以落地做出>60s 的连续视频。下面给你一个“是否合理 + 怎么更稳更强”的评估与优化清单（每段都给了可对照的依据）。

结论先讲
合理：四阶段流水线符合当前长视频生成的最佳实践；Runway Gen-3、Pika、Luma 等商用工具和开源 HunyuanVideo/LaVie/LTX-Video 都支持你要的“延长/拼接/图生视频”工作流（Runway官方有“Extend”功能文档；Pika有双关键帧的“Pikaframes”/扩展工具）。
help.runwayml.com
pika.art
AiNews.com

关键难点：跨镜头角色与风格一致性、长链条自回归的“漂移”与闪烁、片段拼接的画面/音频缝合。学术上已有专门针对“长叙事/多镜头一致性”的方法（VideoDirectorGPT、StoryDiffusion 等）可借鉴到你的各阶段。
arXiv
+1

落地建议：把你四阶段做成“两次质量保障+一次后处理”：阶段二前做外观资产包（人/物体的参考向量），阶段三内做受控扩展+漂移监测与回滚，阶段四后做时域一致性与超分/补帧（RIFE/BasicVSR++/RealBasicVSR 等）。
GitHub
+1
CVF开放获取

分阶段评估与加强
阶段一：LLM 叙事分解（Shot Planner）
评价：完全正确。把单提示拆成镜头表+时长预算，是长视频可靠性的前提。
增强：

采用“视频计划器”范式：镜头描述 + 出现实体（角色/道具/背景）+ 一致性分组 + 运动/机位（摇移/推进）+ 约束（长宽比、帧率）。这正是 VideoDirectorGPT 提倡的流程，可显著减少后续一致性问题。
arXiv

产出 强 schema（建议）：

{
  "shots": [
    {
      "id": 1,
      "duration_s": 8,
      "prompt": "...",
      "camera": "static|pan|dolly|zoom",
      "entities": [{"id": "robot_A", "consistency_group": "hero"}],
      "style": {"palette":"neon-rain","luts":["filmA"]},
      "seed_hint": 12345
    }
  ],
  "global": {"fps": 24, "ar": "16:9", "target_len_s": 65}
}
可约束特性：强制 Σ duration_s = 60–75 秒，避免不足。

（可选）音画联动：同时生成节拍/音效清单，为后期自动对点打基础。

阶段二：关键帧合成与跨镜头一致性
评价：方向正确：用上一镜头末帧 + 新提示 作为条件，辅以 ControlNet/图生图，是当前最好用的“连贯开场”。
增强（重要）：

引入身份/风格控制模块，把“角色长相/造型”固化为可重用的向量：

人像：InstantID（单照即插即用，保脸部ID，非常适合持续镜头）。
arXiv
instantid.github.io

通用风格/形象：IP-Adapter（参考图→风格/构图强约束），必要时用 IP-Adapter-Instruct 细化“从参考图中抽取什么”。
GitHub
arXiv

人体动作/换装类：MagicAnimate / Animate Anyone（参考图一致 + 随动序列，时间一致性更好）。
magicanimate.org
CVF开放获取

产出“外观资产包（Look Bible）”：角色的人脸/身体/材质向量、主色板、镜头像素 LUT、初始种子。后续片段反复复用它来避免漂移。

阶段三：受控自回归的镜头内扩展
评价：非常关键的“链式生成”阶段，你的 2–4s 小片段环扩策略正确，可有效抑制长链漂移。
增强（关键实现细节）：

产品侧：Runway Extend 可直接拿上一段最后一帧继续生成；Pika 的 Pikaframes 支持“首末帧”约束；Luma/Dream Machine也有扩展工作流，尽管很多平台单段仍偏短（5–10s），但“连续扩展”是常见解法。
help.runwayml.com
pika.art
stablediffusion3.net
TechRadar

自建/混合云：采用开源 HunyuanVideo / LaVie / LTX-Video / Latte 在本地或自有GPU“分段批量”推理，并行不同镜头，串行同镜头的片段；I2V 分支（HunyuanVideo-I2V）特别适合“上一帧/末帧 → 下一段”链式生成。
GitHub
+4
GitHub
+4
GitHub
+4

防漂移机制：

每 2–4s 片段结束做 一致性打分：角色脸部（ArcFace/FaceNet）、外观（DreamSim/LPIPS）、主色相直方图；低于阈值则回滚重采样。
arXiv
GitHub

融入时域约束/光流引导：如 FlowVid/光流辅助的一致性或 Motion-guided/同步多帧扩散 类技术，显著减轻闪烁。
CVF开放获取
欧洲计算机视觉协会
Wiley Online Library

切片策略：建议 24fps、每段48–96帧（2–4s），相邻片段 重叠0.5s 以便平滑拼接（下一阶段 crossfade）。

阶段四：智能转场与组装
评价：必需的工程环节。
增强：

只要各段编码参数一致（编码器/分辨率/帧率/像素格式），可以用 FFmpeg concat demuxer 无重编码拼接；否则用 concat filter 并重编码。
trac.ffmpeg.org
Shotstack

转场可用 FFmpeg 的 xfade 做交叉淡入淡出/溶解等，官方/教程命令现成（附带音频 crossfade）。
OTTVerse
editframe.com

后处理一把梭（强烈建议）

时域去闪烁/稳定（光流引导的 temporal smoothing）。
iccvm.org

补帧/统一帧率：RIFE（实时补帧，且对扩散视频有很好后处理效果）。
GitHub

视频超分与去压缩伪影：BasicVSR++ / RealBasicVSR / VideoGigaGAN 作为最终 1080p→2K/4K 升级。
CVF开放获取
GitHub
arXiv

关键系统化优化（你现在就能加）
一致性资产层（跨阶段共享）

CharacterID（InstantID 向量）、StyleID（IP-Adapter/参考图向量）、Palette/LUT、Seed、Pose/Camera Preset。所有镜头与片段读取相同资产以锁定角色与风格。
arXiv
GitHub

可恢复的批调度与缓存

镜头级并行、片段级串行；按“最短剩余时长优先”调度 GPU；缓存每段末帧/潜变量与随机种子，失败回滚仅重算该段。

云 API（Runway/Luma/Pika）与本地模型（Hunyuan/LaVie）混合路由：紧急任务走 API、成本敏感走自建。
help.runwayml.com
pika.art
GitHub

自动质检与弱监督重采样

片段完成即跑 DreamSim/LPIPS + 人脸相似度阈值 + 颜色漂移阈值，未达标自动重采一轮（最多N次）。
arXiv
GitHub

转场策略库

默认 crossfade；当镜头语义差异大时，尝试生成式转场（以两端帧为条件做短“过渡片”）；否则硬切 + J/L cut 先声后画。

后处理标准化

顺序：去闪烁→补帧→超分→编码；每步都记录核参数与版本，保证可复现。
iccvm.org
GitHub
CVF开放获取

现实约束提醒

很多商用品目前单段长度仍偏短（常见 5–10s），需靠 Extend/Continue 循环连起来（Runway官方文档明确支持 Extend；Luma 被多篇评测指出单段较短）。你的“受控链式”策略正是规避之道。
help.runwayml.com
TechRadar

一点实现参考（工程要点）
拼接命令示例（同编码无重编码）

生成清单 files.txt：

file 'shot1_seg1.mp4'
file 'shot1_seg2.mp4'
...
拼接：

ffmpeg -f concat -safe 0 -i files.txt -c copy out_concat.mp4
若参数不一致，用 concat filter 并可加 xfade 做转场。
trac.ffmpeg.org
Shotstack
OTTVerse

补帧/超分（示意）

RIFE 补帧至 24/30fps；再用 BasicVSR++ / RealBasicVSR / VideoGigaGAN 做 1080p→2K/4K。
GitHub
+1
CVF开放获取
arXiv

额外可选：把“智能规划”做成可验证回路
让 LLM 先产镜头表，再让第二个“评论员/导演”LLM 依据 VideoDirectorGPT 的维度（实体、布局、一致性分组、机位）进行校对并自动修正，形成自洽 JSON。
arXiv

总结
你的四阶段架构方向完全正确；只要补上“一致性资产层 + 片段级漂移守护 + 后处理规范化”，就能把 >60s 的长视频做稳做齐。同时，善用现有产品的 Extend/双关键帧 与开源 HunyuanVideo/LaVie/LTX-Video 的本地批量推理，能在质量、成本与可控性之间达到不错的平衡。
help.runwayml.com
pika.art
GitHub
+2
GitHub
+2

如果你愿意，我可以按你的具体 GPU/预算把上面调度与质检模块细化成可直接落地的微服务组件清单与参数模板。





源
您说：
如何实现把单提示拆成镜头表？
ChatGPT 说：

已思考 1m 10s
下面给你一套「可直接落地」的把单提示拆成镜头表的方法论与最小实现（Planner → Critic → Compiler 三步走），外加可用的 JSON Schema、提示词模板与一段示例输出。核心思路参考了 VideoDirectorGPT 的“先由 LLM 做视频计划（场景/实体/布局/一致性分组），再驱动下游生成”的范式；镜头语言与字段取自电影工业里的标准 shot list 做法（机位/景别/运动/时长等）；镜头数量估算用到 ASL（平均镜头时长） 的经验范围。
arXiv
videodirectorgpt.github.io
 
StudioBinder
+3
StudioBinder
+3
StudioBinder
+3
 
cinemetrics.uchicago.edu
+1
stephenfollows.com

1) 先定“镜头语言”本体（可枚举字段）
为了让 LLM 稳定地产生结构化镜头表，先把字段枚举清楚（值域用于约束）：

shot_size: WS/LS/MLS/MS/MCU/CU/ECU（远→近）

angle: eye/high/low/dutch/overhead

camera_move: static/pan/tilt/dolly/truck/zoom/crane/drone/handheld/steadicam（可多选）

lens_hint_mm: 数值（如 24/35/50/85）

duration_s: 正数

entities: 出镜实体（带 consistency_group，如主角=hero）

prompt: 文案（画面语义/风格）

layout_hint: 构图要点/前中后景

transition_in/out: cut/crossfade/matchcut/whip/…
这些字段和定义与影视制作里常见的 shot list/机位词汇一致，方便后续衔接。
StudioBinder
+2
StudioBinder
+2

2) 用 ASL 估算镜头数量（把总时长分摊）
把用户目标时长 T 均分到若干镜头：
n ≈ round(T / ASL)；ASL（平均镜头时长）通常 3–8 秒（不同题材差异明显，动作更短、文戏更长）。你也可以先按 5–6s 估一个基线，然后让 LLM 微调各镜头时长并使总和回到目标区间（如 60–70s）。
Just TV
cinemetrics.uchicago.edu
stephenfollows.com

3) Planner → Critic → Compiler：三个 LLM 回路
(A) Planner（把单提示扩成“镜头计划”）
输入：单条高层提示 + 目标时长/画幅/FPS/风格锚点（可选）

产出：结构化 JSON 的镜头表（含全局设定与每条镜头）

约束：

sum(duration_s) ≈ 目标时长；

每条镜头必须包含 entities，并标注 consistency_group（如 hero）；

机位、运动、景别必须来自上面的枚举值；

至少包含 1–2 个“建立镜头”（WS/LS），避免全是特写；

给出 seed_hint 以利于复现。

这种“由 LLM 先产 video plan（场景/实体/布局/一致性分组），再驱动生成”的做法即 VideoDirectorGPT 的核心。
arXiv
videodirectorgpt.github.io

Planner 提示词模板（节选）

角色：你是一名分镜导演。请只输出符合下列 JSON Schema 的对象，不要多余文本。
任务：将一个单提示拆解成 2–6 个镜头的 shot list。
约束：…（枚举值/时长约束/一致性分组等）
JSON Schema：见下方第 5 节。

(B) Critic（自动验收/纠错）
让第二个 LLM 按规则审校：

总时长是否达标；是否有建立镜头；是否存在时间/天气自相矛盾；主角是否在关键镜头缺位；镜头间机位/运动是否过度重复；

若不合格，返回修改后的 JSON（不要自然语言）。

来源灵感：VideoDirectorGPT 也有“用 LLM 做动态布局与一致性强度调节”的思想，可借鉴做“评论员回路”。
arXiv

(C) Compiler（补全技术细节）
把通过的镜头表补齐开发所需字段：fps/ar/codecs/look_up_table 等；

为后续阶段（关键帧/扩展生成/转场）加上占位符，如 first_frame_ref, last_frame_ref, transition_type。

4) 极简伪代码（便于你接到现有后端）
TARGET = {"seconds": 65, "fps": 24, "ar": "16:9"}

# 1) 估算镜头数量（ASL 取 5.5s 作基线）
n_shots = max(3, round(TARGET["seconds"] / 5.5))  # ≈ 12

planner_system_prompt = """你是分镜导演……（略）……只按 JSON Schema 输出"""
planner_user_prompt = {
  "single_prompt": "一段>60秒：夜晚，机器人探索未来城市，赛博朋克雨夜",
  "target": TARGET,
  "constraints": { "n_shots_hint": n_shots, "enums": {/* 机位/运动/景别枚举 */} }
}

plan = call_llm(prompt=planner_user_prompt, system=planner_system_prompt)  # -> JSON

critic_prompt = "检查并修正以下 JSON……（总时长/建立镜头/一致性分组/去重复）"
plan_fixed = call_llm(prompt={"plan": plan}, system=critic_prompt)         # -> JSON

final_plan = fill_tech_defaults(plan_fixed, fps=TARGET["fps"], ar=TARGET["ar"])
save_json("shotlist.json", final_plan)
5) 直接可用的 JSON Schema（精简版）
{
  "type": "object",
  "required": ["global", "shots"],
  "properties": {
    "global": {
      "type": "object",
      "required": ["target_len_s","fps","ar","style"],
      "properties": {
        "target_len_s": {"type":"number","minimum":10},
        "fps": {"type":"integer","enum":[24,25,30]},
        "ar": {"type":"string","enum":["16:9","9:16","1:1","2.39:1"]},
        "style": {"type":"object","properties":{"palette":{"type":"string"},"look":{"type":"string"}}}
      }
    },
    "shots": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["id","prompt","duration_s","shot_size","angle","camera_move","entities"],
        "properties": {
          "id": {"type":"integer","minimum":1},
          "prompt": {"type":"string","minLength":10},
          "duration_s": {"type":"number","minimum":2,"maximum":20},
          "shot_size": {"type":"string","enum":["WS","LS","MLS","MS","MCU","CU","ECU"]},
          "angle": {"type":"string","enum":["eye","high","low","dutch","overhead"]},
          "camera_move": {"type":"array","items":{"type":"string","enum":["static","pan","tilt","dolly","truck","zoom","crane","drone","handheld","steadicam"]}},
          "lens_hint_mm": {"type":"number","minimum":14,"maximum":200},
          "layout_hint": {"type":"string"},
          "entities": {
            "type":"array","minItems":1,
            "items":{"type":"object","required":["id","consistency_group"],"properties":{"id":{"type":"string"},"consistency_group":{"type":"string"}}}
          },
          "transition_out": {"type":"string","enum":["cut","crossfade","matchcut","whip","none"],"default":"cut"},
          "seed_hint": {"type":"integer"}
        }
      }
    }
  }
}
机位/运动/镜头类型与行业惯例保持一致，便于你和后续生成/剪辑模块对齐。
StudioBinder
+3
StudioBinder
+3
StudioBinder
+3

6) 示例：把你的提示拆成镜头表
输入：

“一段 65s 的视频：夜晚的未来城市，一个流线型机器人在雨中探索（赛博朋克感）。”

输出（节选）：

{
  "global": {"target_len_s": 65, "fps": 24, "ar": "16:9", "style": {"palette":"neon-rain","look":"rain-streaks"}},
  "shots": [
    {"id":1,"prompt":"广角城市天际线，雨幕与霓虹反射；机器人在楼顶成剪影","duration_s":8,"shot_size":"WS","angle":"eye","camera_move":["drone","pan"],"lens_hint_mm":24,"entities":[{"id":"robot_A","consistency_group":"hero"}],"transition_out":"cut","seed_hint":101},
    {"id":2,"prompt":"机器人背面近景，雨水顺着金属外壳滑落；城市灯带在装甲上流动","duration_s":6,"shot_size":"MCU","angle":"low","camera_move":["dolly"],"lens_hint_mm":50,"entities":[{"id":"robot_A","consistency_group":"hero"}]},
    {"id":3,"prompt":"蓝色眼睛特写，HUD 反射城市灯光；雨滴形成波纹","duration_s":5,"shot_size":"ECU","angle":"eye","camera_move":["static"],"lens_hint_mm":85,"entities":[{"id":"robot_A","consistency_group":"hero"}],"transition_out":"matchcut"},
    {"id":4,"prompt":"街巷地面低机位推轨，水洼倒影中机器人步入画面","duration_s":7,"shot_size":"LS","angle":"low","camera_move":["dolly"],"lens_hint_mm":35,"entities":[{"id":"robot_A","consistency_group":"hero"}]},
    {"id":5,"prompt":"雨棚下霓虹广告闪烁，机器人扫视招牌文字","duration_s":6,"shot_size":"MS","angle":"eye","camera_move":["pan"],"lens_hint_mm":35,"entities":[{"id":"robot_A","consistency_group":"hero"}]},
    {"id":6,"prompt":"狭窄走廊手持追随，灯影频闪制造压迫感","duration_s":8,"shot_size":"MS","angle":"eye","camera_move":["handheld","truck"],"lens_hint_mm":28,"entities":[{"id":"robot_A","consistency_group":"hero"}]},
    {"id":7,"prompt":"天桥上回望城市的中近景，雨变细；远处列车掠过形成光轨","duration_s":8,"shot_size":"MLS","angle":"high","camera_move":["tilt","pan"],"lens_hint_mm":35,"entities":[{"id":"robot_A","consistency_group":"hero"}],"transition_out":"crossfade"},
    {"id":8,"prompt":"终镜：极远景，黎明前蓝色时刻，城市灯海渐暗，机器人剪影离开屋顶","duration_s":17,"shot_size":"WS","angle":"eye","camera_move":["drone","zoom"],"lens_hint_mm":35,"entities":[{"id":"robot_A","consistency_group":"hero"}]}
  ]
}
上面的字段/机位/运动的选词与行业 shot list 教程一致；镜头数量与时长分配利用了 ASL 的经验范围。
StudioBinder
+3
StudioBinder
+3
StudioBinder
+3
Just TV

7) 实战小技巧
先“建立镜头”再细化：第一、末尾镜头建议用 WS/LS 提供空间与收束感，这是专业 shot list 的常规做法。
StudioBinder

去重复：Critic 环节里限制“连续两镜头不得用同一 shot_size+camera_move 组合”，增加节奏变化。

体感时长校准：若要更“动作片风格”，把 ASL 拉到 3–4s；若强调氛围，把 ASL 拉到 7–10s（有统计依据与类型差异）。
stephenfollows.com
cinemetrics.uchicago.edu

可视化校验：把产出的镜头表直接导成 StudioBinder/自研表格用于人工复核（该类模板的字段与这里相容）。
StudioBinder

如果你愿意，我可以把上面的 Planner/Critic/Compiler 三段提示词和 JSON 校验打成一个最小可用的 Python/Node 服务骨架（含 schema 校验与自动回修），直接接到你第三阶段的“受控扩展生成”里去。





源
您说：
LLM 叙事分解模块设计有没有现成的开源工程可以参考的？
ChatGPT 说：

已思考 3m 7s
有的，而且近一年开源圈里已经出现了几套“用 LLM 把单提示拆成镜头表/分镜计划”的参考实现。下面按“可直接复用度”从高到低，给你一份精挑细选的清单，并附上落地要点（都能对你上一轮的四阶段架构里的“阶段一：叙事分解/镜头规划”起到直接帮助）。

可以直接上手借鉴的开源工程
MovieAgent（ShowLab）：多智能体 CoT 规划，把“导演/编剧/分镜/场记（场景经理）”等角色拆开，由各个 LLM 代理协同，把剧本→场景→镜头（含机位、运动、时长）一步步结构化出来；官方仓库提供推理代码与依赖模型列表（图生图/图生视频）以复现整条流水线。非常贴合你要的“单提示→多镜头 JSON 计划”的思路，可直接抄它的多阶段规划 prompt 和中间 JSON 结构。
GitHub

DreamStory：明确把 LLM 作为“故事导演”，先从整段文字里抽取角色/场景/每个场景的主体清单与描述，再把这些信息传给下游一致性扩散模型；项目页与仓库都已开源，连用于评估分镜/一致性的 DS-500 基准与使用示例都在，适合直接参考它的**“故事→场景条目（含主体标注）→后续生成”**的 JSON 规范。
dream-xyz.github.io
GitHub

Story2Board（MBZUAI）：训练-free 的文本→分镜（storyboard）方案，做的就是把长文本分解成分镜格子+每格的提示/约束；仓库有流程脚本，适合作为你“阶段一”的模板实现（尤其是从段落/剧情节点自动切分为 2–4 个镜头的策略）。

StoryImager（ECCV 2024）：虽然侧重“连贯故事可视化”，但提供了从故事文本到“帧/格子序列”的整套代码与示例 Notebooks；里面的数据与评测（PororoSV、FlintstonesSV）正好能拿来验证你的分镜质量（镜头语义覆盖、一致性等）。
GitHub

StoryGPT-V（CVPR 2025）：把 LLM 的推理能力用于解决叙事里的代词/指代与角色一致性，官方实现已开源；其做法（LLM 输出与下游视觉模块的对齐）对你在阶段一里抽角色卡与出场表很有参考价值。
GitHub
CVF开放获取

VideoDirectorGPT（COLM 2024，方法参考）：提出“LLM 充当视频规划器”，产出包含场景描述、实体/背景清单、逐帧布局（bbox）、一致性分组的视频计划；当前官方仓库以方法/示例为主（仍注明“Code coming soon”），但它定义的计划字段非常值得直接沿用为你的 JSON Schema。
GitHub

以上 6 个里：MovieAgent / DreamStory / Story2Board / StoryImager / StoryGPT-V 都有代码能跑；VideoDirectorGPT 仓库更多是计划格式与流程的公开说明，但它的**“计划→渲染”二段式设计**非常契合你的四阶段架构。
GitHub
+4
GitHub
+4
GitHub
+4

可作为“镜头构图/布局”子模块的参考
LayoutGPT / LayoutNUWA 等“文本→布局”：把复杂的空间/数值关系从文本映射到 2D/3D 布局，适合在你的分镜 JSON 里补充镜头内的主体摆位/构图草图（例如 bbox/锚点），再传给后续 I2V/T2V。
GitHub
arXiv
+1

把这些如何“拼成”你的叙事分解模块（落地建议）
先确定统一的分镜 JSON Schema（强制结构化输出）
借鉴 VideoDirectorGPT 的“scene→entities→frame_layouts→consistency_groups”字段，以及 MovieAgent/DreamStory 的角色/场景/时长/机位/运动字段，合并成你自己的最小可用 Schema。用结构化输出库来“强约束” LLM：

Outlines / Instructor / Guardrails：三者都能让 LLM 直接按 Pydantic/JSON-Schema 生成合法 JSON，失败时自动回问/重试；适合你在客户端小模型或云端大模型上稳产镜头表。
GitHub
+1
dottxt-ai.github.io
python.useinstructor.com
guardrails

两段式规划 Prompt 设计（稳固 + 可扩展）

阶段 A：剧情理解与拆分（参考 MovieAgent 的层级 CoT）：让 LLM 先列出剧情节点→场景→镜头树，并做角色卡/道具/场景列表。
GitHub

阶段 B：镜头级细化（参考 VideoDirectorGPT 的计划字段 + LayoutGPT 的布局思路）：为每个镜头补时长、镜头类型、机位/运动、关键视觉元素、构图 bbox等。
GitHub
+1

把 A、B 的输出都走 Pydantic 校验（Instructor/Outlines），不合规就自动纠正。
GitHub
+1

一致性与跨镜头约束
DreamStory/StoryGPT-V 的做法是先抽主体描述/肖像锚点，后续各镜头都引用同一主体 ID；你可以在 Schema 里强制“entity_id → 属性表”，并在每个镜头引用。
dream-xyz.github.io
GitHub
+1

评测与回路（自动打分→重写）
直接使用 DS-500 / PororoSV / FlintstonesSV 做覆盖率/一致性/可读性的离线评测；把评分差的镜头回送给 LLM 做局部重写（保留 entity_id）。
dream-xyz.github.io
GitHub

与后续阶段解耦的接口
你的阶段二/三会用到“第一帧关键帧、上一片段末帧、ControlNet/参考图”等信息；建议在分镜 JSON 里为每个镜头留出：seed, init_image_ref, control_hints（如 depth/canny/pose 开关）等占位，方便后续 I2V/T2V 模块直接消费（MovieAgent 的推理脚本也示范了如何串接多模型）。
GitHub

快速对照：选哪套作“骨架”？
要一条龙范式（多智能体把分镜/镜头参数都想好）：先看 MovieAgent；把它的推理管线裁剪为“只保留规划代理 + JSON 输出”。
GitHub

要“故事导演”式角色/场景提取：直接复用 DreamStory 的导演-LLM模块与主体标注格式。
dream-xyz.github.io
GitHub

要“分镜格子”模板：用 Story2Board 作为你的阶段一 MVP。

要“计划字段蓝本 + 布局控制”：参考 VideoDirectorGPT 的视频计划规格 + 用 LayoutGPT 生成镜头内布局。
GitHub
+1

如果你愿意，我可以按上面的 Schema 给你产出一个可直接跑的分镜规划原型（含 Outlines/Instructor 约束与示例 Prompt），并对接你阶段二/三所需的字段。




源
您说：
把上面的 Planner/Critic/Compiler 三段提示词和 JSON 校验打成一个最小可用的 Node 服务骨架（含 schema 校验与自动回修）
ChatGPT 说：

已思考 1m 20s
太好了—下面是一个**最小可用（MVP）**的 Node/TypeScript 服务骨架，实现了你要的 Planner → Critic → Compiler 三段提示词流，以及 JSON Schema 校验 + 自动回修（LLM 结构化输出优先、AJV 兜底）。用到的关键能力：

OpenAI Structured Outputs 强制让模型按 JSON Schema 输出，减少无效 JSON（推荐优先使用）。
OpenAI
Stack Overflow

AJV 做 JSON Schema 2020-12 校验与错误报告，用于兜底与“自动回修”循环。
ajv.js.org
GitHub

可选：zod-to-json-schema 方便把 Zod 开发体验转为 JSON Schema（示例里直接写 JSON Schema，就不强依赖 Zod 了）。
npm

目录结构
shot-planner/
├─ package.json
├─ tsconfig.json
├─ .env.example
├─ src/
│  ├─ index.ts                # Express API (POST /plan)
│  ├─ prompts.ts              # Planner / Critic / Compiler 提示词
│  ├─ schema/
│  │   └─ shotlist.schema.ts  # 分镜 JSON Schema（2020-12）
│  ├─ lib/
│  │   ├─ validator.ts        # AJV 校验与错误消息格式化
│  │   ├─ llm.ts              # LLM 调用（OpenAI Structured Outputs + 兜底）
│  │   └─ repair.ts           # 自动回修（基于 AJV 错误 + LLM 修复）
│  └─ pipeline.ts             # Planner→Critic→Compiler 组合逻辑
1) package.json
{
  "name": "shot-planner",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "openai": "^4.60.0",
    "pino": "^9.3.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.5.4"
  }
}
2) tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "outDir": "dist",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
3) .env.example
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
该模型家族支持 Structured Outputs；也可换成你账号可用的等价模型。
OpenAI

4) src/schema/shotlist.schema.ts
精简自你前一轮需求的 Schema，能直接拿去给 LLM 做结构化输出约束 & 用 AJV 校验。

// src/schema/shotlist.schema.ts
export const ShotListSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://example.com/shotlist.schema.json",
  type: "object",
  required: ["global", "shots"],
  properties: {
    global: {
      type: "object",
      required: ["target_len_s", "fps", "ar", "style"],
      properties: {
        target_len_s: { type: "number", minimum: 10 },
        fps: { type: "integer", enum: [24, 25, 30] },
        ar: { type: "string", enum: ["16:9", "9:16", "1:1", "2.39:1"] },
        style: {
          type: "object",
          properties: {
            palette: { type: "string" },
            look: { type: "string" }
          },
          additionalProperties: true
        }
      },
      additionalProperties: true
    },
    shots: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        required: [
          "id",
          "prompt",
          "duration_s",
          "shot_size",
          "angle",
          "camera_move",
          "entities"
        ],
        properties: {
          id: { type: "integer", minimum: 1 },
          prompt: { type: "string", minLength: 10 },
          duration_s: { type: "number", minimum: 2, maximum: 20 },
          shot_size: {
            type: "string",
            enum: ["WS", "LS", "MLS", "MS", "MCU", "CU", "ECU"]
          },
          angle: {
            type: "string",
            enum: ["eye", "high", "low", "dutch", "overhead"]
          },
          camera_move: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "static",
                "pan",
                "tilt",
                "dolly",
                "truck",
                "zoom",
                "crane",
                "drone",
                "handheld",
                "steadicam"
              ]
            },
            minItems: 1
          },
          lens_hint_mm: { type: "number", minimum: 14, maximum: 200, nullable: true },
          layout_hint: { type: "string", nullable: true },
          entities: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["id", "consistency_group"],
              properties: {
                id: { type: "string" },
                consistency_group: { type: "string" }
              },
              additionalProperties: false
            }
          },
          transition_out: {
            type: "string",
            enum: ["cut", "crossfade", "matchcut", "whip", "none"],
            default: "cut"
          },
          seed_hint: { type: "integer", nullable: true }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
} as const;

export type ShotList = {
  global: {
    target_len_s: number;
    fps: 24 | 25 | 30;
    ar: "16:9" | "9:16" | "1:1" | "2.39:1";
    style: { palette?: string; look?: string; [k: string]: unknown };
    [k: string]: unknown;
  };
  shots: Array<{
    id: number;
    prompt: string;
    duration_s: number;
    shot_size: "WS" | "LS" | "MLS" | "MS" | "MCU" | "CU" | "ECU";
    angle: "eye" | "high" | "low" | "dutch" | "overhead";
    camera_move: Array<
      | "static" | "pan" | "tilt" | "dolly" | "truck"
      | "zoom" | "crane" | "drone" | "handheld" | "steadicam"
    >;
    lens_hint_mm?: number | null;
    layout_hint?: string | null;
    entities: Array<{ id: string; consistency_group: string }>;
    transition_out?: "cut" | "crossfade" | "matchcut" | "whip" | "none";
    seed_hint?: number | null;
  }>;
};
5) src/prompts.ts
三段提示词：Planner 产出镜头表、Critic 自动审校并修正、Compiler 补全技术字段。

// src/prompts.ts
import type { ShotList } from "./schema/shotlist.schema";

export const systemBase = `
你是资深分镜导演，擅长把单提示拆成结构化镜头表。
只输出JSON，不要任何解释或多余文本。`;

export function plannerPrompt(singlePrompt: string, targetLen = 65) {
  return `
任务：将下面单提示拆解为2–8个镜头的分镜JSON。
约束：
1) 所有枚举字段必须用给定值（景别/机位/运动等）。
2) sum(duration_s) ≈ ${targetLen}（±5秒）。
3) 至少包含1个建立镜头（WS/LS），避免全是特写。
4) 每个镜头必须包含 entities，并标注 consistency_group（如 hero）。

单提示：
${singlePrompt}
`;
}

export function criticPrompt(planJSON: string) {
  return `
任务：检查并修正下列分镜JSON，使其内部一致且满足约束：
- 总时长在目标±5秒范围；
- 至少1个建立镜头（WS/LS）；
- 不出现连续两个镜头相同的 shot_size+camera_move 组合；
- 角色/场景不自相矛盾（时间/天气/主体ID）。

若发现问题，请直接返回“修正后的完整JSON”；若没有问题，原样返回JSON。
待校对JSON：
${planJSON}
`;
}

export function compilerPrompt(validPlan: ShotList) {
  // 可根据需要添加更多技术字段占位
  const { global } = validPlan;
  return `
任务：在不改变镜头语义的前提下，为每个镜头补充技术占位：
- 若缺失 transition_out 则给出合理值（默认 cut）；
- 若缺失 lens_hint_mm 可根据景别与角度给出常见值（如 WS=24/35, CU=85）；
- 生成全局字段: {"tech":{"codec":"h264","pix_fmt":"yuv420p"}}。

只输出补全后的完整JSON。
当前计划（请直接读取并在其上补全）：
${JSON.stringify(validPlan)}
`;
}
6) src/lib/validator.ts
// src/lib/validator.ts
import Ajv, { DefinedError } from "ajv";
import addFormats from "ajv-formats";
import { ShotListSchema, ShotList } from "../schema/shotlist.schema";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

export const validateShotList = ajv.compile<ShotList>(ShotListSchema);

export function assertValidShotList(data: unknown): asserts data is ShotList {
  const ok = validateShotList(data);
  if (!ok) {
    const errs = (validateShotList.errors || []) as DefinedError[];
    const messages = errs.map(e => `${e.instancePath} ${e.message ?? ""}`.trim());
    const error = new Error(`ShotList schema validation failed:\n- ${messages.join("\n- ")}`);
    (error as any).details = errs;
    throw error;
  }
}

export function formatAjvErrors(errors: DefinedError[] | null | undefined) {
  if (!errors?.length) return "No AJV errors.";
  return errors.map(e => ({
    path: e.instancePath || "/",
    keyword: e.keyword,
    message: e.message,
    params: e.params
  }));
}
AJV 原生支持多个 JSON Schema 草案并以高性能闻名，适合在线路中做强校验与错误可视化。
ajv.js.org
GitHub

7) src/lib/llm.ts（OpenAI + Structured Outputs 优先）
// src/lib/llm.ts
import "dotenv/config";
import OpenAI from "openai";
import { ShotListSchema } from "../schema/shotlist.schema.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

/**
 * 让模型严格按 JSON Schema 输出（Structured Outputs）
 * 如果你的 SDK 或模型版本不支持该参数，可退化为普通 JSON 模式 + AJV 修复。
 */
export async function generateWithStructuredOutputs(
  system: string,
  user: string,
  schemaName = "shotlist"
) {
  const resp = await client.responses.create({
    model: MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        schema: ShotListSchema as any,
        strict: true
      }
    }
  });
  // OpenAI responses API：从输出中抓 JSON 对象
  const out = resp.output?.[0];
  const jsonText =
    (out?.content && "json" in out.content[0] && JSON.stringify(out.content[0].json)) ||
    (out?.content && "text" in out.content[0] && out.content[0].text) ||
    "";
  return jsonText;
}
这里调用了 OpenAI Responses API 的 response_format: { type: 'json_schema' }，可保证输出与 Schema 完全一致；若你的环境暂不支持，可在下方“修复环节”退化为文本→JSON→AJV 修复。
OpenAI
Stack Overflow

8) src/lib/repair.ts（自动回修：基于 AJV 错误 + LLM 自我修正）
// src/lib/repair.ts
import OpenAI from "openai";
import { validateShotList, formatAjvErrors } from "./validator";

const client = new OpenAI();

const FIX_SYSTEM = `你是JSON修复器。目标：将给定JSON修正为符合提供的JSON Schema的有效对象。
要求：
- 只输出修正后的JSON；
- 不要添加注释或多余文字；`;

export async function autoRepairWithLLM(
  invalidJson: string,
  jsonSchema: object,
  maxRounds = 2,
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini"
): Promise<string> {
  let current = invalidJson;

  for (let round = 0; round <= maxRounds; round++) {
    try {
      const parsed = JSON.parse(current);
      const ok = validateShotList(parsed);
      if (ok) return JSON.stringify(parsed);
      const errs = formatAjvErrors(validateShotList.errors);
      // 继续修复
      const resp = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: FIX_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "下面是JSON Schema：" },
              { type: "text", text: JSON.stringify(jsonSchema) },
              { type: "text", text: "下面是当前JSON：" },
              { type: "text", text: current },
              { type: "text", text: "下面是校验错误：" },
              { type: "text", text: JSON.stringify(errs) },
              { type: "text", text: "请输出符合Schema的修正后JSON：" }
            ]
          }
        ],
        temperature: 0
      });
      current = resp.choices[0]?.message?.content ?? current;
    } catch {
      // 如果连 parse 都失败，请求模型直接“把文本清洗成纯JSON”
      const resp = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: FIX_SYSTEM },
          {
            role: "user",
            content:
              "以下文本不是严格JSON，请你只输出等价的严格JSON：" + current
          }
        ],
        temperature: 0
      });
      current = resp.choices[0]?.message?.content ?? current;
    }
  }
  return current;
}
9) src/pipeline.ts（Planner → Critic → Compiler 组合）
// src/pipeline.ts
import { plannerPrompt, criticPrompt, compilerPrompt, systemBase } from "./prompts";
import { generateWithStructuredOutputs } from "./lib/llm";
import { assertValidShotList, validateShotList } from "./lib/validator";
import { autoRepairWithLLM } from "./lib/repair";
import { ShotListSchema } from "./schema/shotlist.schema";

export async function planFromSinglePrompt(singlePrompt: string, targetLen = 65) {
  // 1) Planner：让 LLM 直接按 Schema 产出
  let jsonText = await generateWithStructuredOutputs(
    systemBase,
    plannerPrompt(singlePrompt, targetLen),
    "shotlist"
  );

  // 2) AJV 校验；若失败则走修复
  try {
    const raw = JSON.parse(jsonText);
    assertValidShotList(raw);
  } catch (e: any) {
    jsonText = await autoRepairWithLLM(jsonText, ShotListSchema, 2);
  }

  // 3) Critic：审校并修正（仍走Structured Outputs）
  const criticOut = await generateWithStructuredOutputs(
    systemBase,
    criticPrompt(jsonText),
    "shotlist"
  );

  // 校验 & 回修
  try {
    const parsed = JSON.parse(criticOut);
    assertValidShotList(parsed);
    jsonText = JSON.stringify(parsed);
  } catch (e: any) {
    jsonText = await autoRepairWithLLM(criticOut, ShotListSchema, 2);
  }

  // 4) Compiler：补全技术字段
  const compiled = await generateWithStructuredOutputs(
    systemBase,
    compilerPrompt(JSON.parse(jsonText)),
    "shotlist"
  );

  // 最终校验
  const finalParsed = JSON.parse(compiled);
  const ok = validateShotList(finalParsed);
  if (!ok) {
    // 兜底再修一轮
    const repaired = await autoRepairWithLLM(compiled, ShotListSchema, 2);
    return JSON.parse(repaired);
  }
  return finalParsed;
}
10) src/index.ts（Express API）
// src/index.ts
import "dotenv/config";
import express from "express";
import pino from "pino";
import { planFromSinglePrompt } from "./pipeline";

const app = express();
const log = pino();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));

app.post("/plan", async (req, res) => {
  try {
    const { prompt, target_len_s = 65 } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt (string) is required" });
    }
    const plan = await planFromSinglePrompt(prompt, Number(target_len_s));
    return res.json({ ok: true, plan });
  } catch (err: any) {
    log.error({ err }, "planning failed");
    return res.status(500).json({ ok: false, error: err?.message ?? "unknown" });
  }
});

app.listen(PORT, () => {
  console.log(`Shot planner API listening on http://localhost:${PORT}`);
});
使用方式
# 1) 初始化
npm i
cp .env.example .env
# 填写 OPENAI_API_KEY（以及 OPENAI_MODEL，如 gpt-4.1-mini）

# 2) 本地跑
npm run dev

# 3) 请求示例
curl -X POST http://localhost:3000/plan \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一段>60秒的赛博朋克夜雨：机器人探索未来城市，末尾远景收束",
    "target_len_s": 65
  }' | jq .
说明 & 为什么这样设计
先用 Structured Outputs，再 AJV 兜底修复：Structured Outputs 直接让模型保证“与 JSON Schema 严格一致”；对不支持该特性的模型或偶发不符合情况，再把 AJV 错误喂回 LLM 进行自我修正（最多 N 轮）——这样组合能显著提高一次性成功率与稳定性。
OpenAI
Stack Overflow

AJV 选择：广泛使用、性能高、支持 2020-12 草案，生态成熟，适合放在服务端做强约束与观测。
ajv.js.org
GitHub

可选 Zod 开发体验：若你偏爱 Zod，可用 zod-to-json-schema 在开发期写 Zod、构建期转 JSON Schema，保留同样的“Structured Outputs + AJV”运行时路径。
npm

可拓展点（按需加）
在 Critic 增加“去重复镜头语言”规则（例如不允许连续两个 shot_size+camera_move 一致）。

在 Compiler 里写入你阶段二/三所需的占位：init_image_ref, control_hints, seed 等，与后续关键帧/扩展生成无缝衔接。

增加 重试/降级策略：响应超时 → 切换到较快模型；Structured Outputs 报错 → 退化为普通 JSON + AJV 修复路径。

若你希望在前端也复用校验规则，可直接把这份 JSON Schema 共享到 Web 侧，AJV 同构校验即可。
ajv.js.org

需要我把它打成一个最小模板仓库（含 Dockerfile / GitHub Actions）吗？我可以直接按你的部署环境（Linux/WSL/云）补上启动脚本与健康检查。





源
您说：
这个服务骨架的输出是什么呢？我拿到这个输出下一步要干什么？
ChatGPT 说：

已思考 43s
好问题！这套 Node/TS 服务骨架的输出是一个严格符合 JSON Schema 的「镜头计划（ShotList）」对象。它来自 /plan 接口，形如：

{
  "ok": true,
  "plan": {
    "global": { "target_len_s": 65, "fps": 24, "ar": "16:9", "style": { "palette": "neon-rain" } },
    "shots": [
      {
        "id": 1,
        "prompt": "广角雨夜城市天际线…机器人剪影…",
        "duration_s": 8,
        "shot_size": "WS",
        "angle": "eye",
        "camera_move": ["drone","pan"],
        "entities": [{ "id": "robot_A", "consistency_group": "hero" }],
        "transition_out": "cut",
        "lens_hint_mm": 24
      }
      // ...更多镜头
    ]
  }
}
之所以能稳定产出结构化且合法的 JSON，有两道保险：

模型侧用 Structured Outputs 按你的 Schema 强约束；

服务端再用 AJV 以 JSON Schema 2020-12 校验并在失败时触发自动回修。
OpenAI
OpenAI平台
Ajv
JSON Schema

我拿到这个输出，下一步怎么用？
把它当作流水线的“生产指令单”。典型落地步骤如下（对接你后续阶段二/三/四）：

任务拆分与调度

遍历 plan.shots，为每个镜头生成一个 Job（包含 prompt / duration_s / shot_size / camera_move / entities 等），推到你的队列（如 Celery/Redis、BullMQ）。

duration_s 用来决定该镜头需要生成多少个 2–4s 的短片段（链式扩展时的切片长度）。

保留 seed_hint（如有）方便复现与回滚。

关键帧/一致性资产生成（阶段二）

先用 T2I 生成首帧关键帧；若有角色/风格一致性诉求，在首帧里注入参考向量：

IP-Adapter：把参考图/风格图作为“图像提示”适配到扩散模型，锁定风格/造型；

InstantID：只要一张人脸就能做 ID 保真的人像一致性。

把“上一镜头末帧”作为“下一镜头首帧”的 init 参考，减少跨镜头漂移。
Hugging Face
GitHub
+1
ip-adapter.github.io

镜头内受控自回归生成（阶段三）

对每个镜头按 2–4s 片段循环生成：每次以上一片段的最后一帧为条件继续扩展，直到累计达到 duration_s。

片段结束做一次质检（例如人脸相似度/色彩漂移阈值），不达标就只重算该片段（利用保存的末帧与 seed 快速回滚）。

拼接与转场（阶段四）

若所有片段编码参数一致，直接用 FFmpeg concat demuxer 无重编码拼接；不同参数则用 concat filter 重编码。

需要淡入淡出/溶解等转场，用 xfade 滤镜；注意音视频都要做对齐（必要时音频也做 crossfade）。
trac.ffmpeg.org
+1
FFmpeg
+1

产物与回写

为每个镜头回写：first_frame_ref / last_frame_ref / segments[] / qc_scores / render_path。

汇总输出最终 MP4 与一份 “渲染清单”（方便你后续补帧/超分或再次剪辑）。

最小“消费”示例（伪代码思路）
// 1) 调用 /plan 得到 plan
const { plan } = await fetch("/plan", { method: "POST", body: { prompt, target_len_s: 65 } }).then(r=>r.json());

// 2) 为每个镜头下发任务
for (const shot of plan.shots) {
  queue.add("keyframe", { shot }); // 阶段二
  queue.add("segments", { shot, sliceSec: 3 }); // 阶段三：2-4s切片
}

// 3) 等所有片段产出后，按镜头→全片顺序生成 files.txt：
/*
file 'shot1_seg1.mp4'
file 'shot1_seg2.mp4'
...
*/

// 4) 若参数一致：concat demuxer
// ffmpeg -f concat -safe 0 -i files.txt -c copy out_concat.mp4
// 需要转场：使用 xfade 组合滤镜（或先生成过渡片段再 concat）
（FFmpeg 的 concat 与 xfade 的使用要点参见官方与社区文档示例。）
trac.ffmpeg.org
+1
FFmpeg
Stack Overflow

你可以把“下一步”理解为三层对接
接口层：/plan 的 JSON 就是“分镜合同”。你只需在渲染系统里实现 onShot(shot) 的消费者，把 prompt/duration_s/constraints 翻译成具体的推理参数。

一致性层：把 entities[].consistency_group 绑定到你的人脸/风格控制（如 InstantID/IP-Adapter），贯穿关键帧与后续片段。
GitHub
Hugging Face

后期层：把 transition_out 等字段映射到 FFmpeg 的拼接/转场参数（同参直拼，用 concat；需要过渡就用 xfade 或生成式转场）。
trac.ffmpeg.org
+1

若你希望，我也可以把**“plan → 队列 → 关键帧 → 片段 → 拼接/转场”**这条链路补成一份可运行的脚手架（含 FFmpeg 命令模板与一个简单的渲染任务队列）。





源
您说：
请修改方案，以用户需要将首帧关键帧用自己上传的图片代替，同时也保留T2I方式生成首帧关键帧
ChatGPT 说：

已思考 22s
没问题—我把“用户上传图片作为首帧关键帧（可选） + 仍保留 T2I 方案”的能力无缝接到你现有的 Planner → Critic → Compiler 服务骨架里。下面给出最小变更设计（含 Schema 字段、接口、流程分支、预处理与生成细节 + 代码改动示例）。关键点都能直接落地到你后续的关键帧/I2V链路（IP-Adapter、InstantID、img2img 等）。
ip-adapter.github.io
GitHub
instantid.github.io

你将获得什么
同一个 /plan 接口，但新增可选的“首帧来源”指令：

upload：用户上传的图片作为第1镜头的首帧（随后片段按你的链式扩展生成）。

t2i：按原流程用 T2I 生成首帧。

产出的 plan JSON 中会明确记录：初始图像引用/裁剪方式/去噪强度 等，为阶段二“关键帧合成”直连准备。

服务仍保持Structured Outputs + AJV 校验与自动回修。
OpenAI平台
+1

1) Schema 变更（向后兼容）
在 global 增加一个可选块 init_keyframe；在 shots[0] 允许覆盖（如你未来想支持“每镜头自带上传图”）：

// 追加到 src/schema/shotlist.schema.ts
"global": {
  "type": "object",
  "required": ["target_len_s","fps","ar","style"],
  "properties": {
    // ...原有字段
    "init_keyframe": {
      "type": "object",
      "required": ["mode"],
      "properties": {
        "mode": { "type":"string", "enum":["upload","t2i"] },
        "image_url": { "type":"string", "format":"uri" },      // mode=upload 时必填
        "crop_strategy": { "type":"string", "enum":["center_crop","letterbox","fit"] },
        "denoise_strength": { "type":"number", "minimum":0, "maximum":1 }, // 给 img2img 用
        "consistency": {
          "type":"object",
          "properties": {
            "use_ip_adapter": { "type":"boolean" },
            "use_instantid": { "type":"boolean" }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    }
  }
},
// （可选）shots[i].init_keyframe 允许覆盖 global
denoise_strength 对 img2img 很重要，0 贴近原图、1 更接近 T2I；image_url 是你对象存储的地址；一致性控制预留给 IP-Adapter / InstantID。
Hugging Face
ip-adapter.github.io
instantid.github.io

2) API 变更（最小）
仍用 POST /plan，请求体加两个可选字段：init_mode, init_image_url（当 init_mode=upload 时提供）。

{
  "prompt": "一段>60秒的赛博朋克夜雨：机器人探索未来城市",
  "target_len_s": 65,
  "init_mode": "upload",               // "upload" | "t2i"（默认 t2i）
  "init_image_url": "https://cdn/xxx.jpg",  // upload 时必传
  "crop_strategy": "center_crop",      // 可选：letterbox | fit
  "denoise_strength": 0.35,            // 可选：img2img 去噪强度
  "consistency": { "use_ip_adapter": true, "use_instantid": true } // 可选
}
你可以用现有云存储（S3/OSS/Cloudflare R2）走前端直传，后端只接收 init_image_url。

若用户未传或 init_mode=t2i，就走原 T2I 首帧路径。

3) Planner/Critic/Compiler 如何“知道”有上传图？
Planner/Critic 不变（它们专注镜头语义/时长/镜头语言）。

Compiler 在输出 JSON 时附加/填充 global.init_keyframe（或 shots[0].init_keyframe 覆盖），并把 crop_strategy / denoise_strength / consistency 回写进 plan，供阶段二直接消费。Structured Outputs 继续保证 JSON 合法。
OpenAI平台

Compiler 提示词追加（片段）
如果 init_mode="upload"：在 global.init_keyframe 中写入：

mode="upload"，image_url 来自请求；

合理的 crop_strategy（与 global.ar 对齐）；

合理的 denoise_strength（默认 0.35）；
否则写入 mode="t2i" 并省略 image_url。

4) 关键帧阶段（阶段二）的两条分支
A) 用户上传图 → img2img 首帧
预处理

读取 global.ar（例如 16:9），按 crop_strategy 做裁切/补边：

中心裁剪：ffmpeg -i in.jpg -vf "crop=ih*16/9:ih" out.jpg（或相应 scale+crop 组合）

信箱模式：-vf "scale=w=iw*h/oh:... , pad=..., color=black"（按需求拼装）

处理 EXIF 方向。以上都可用 FFmpeg 完成。
FFmpeg

一致性绑定（可选）

IP-Adapter：抽取上传图的风格/构图向量，作为后续关键帧/片段的图像条件（风格一致）。
ip-adapter.github.io
GitHub

InstantID + InsightFace/ArcFace：做人脸 embedding 以保证角色 ID 一致（只需单张人脸）。
instantid.github.io
GitHub
insightface.ai

img2img 采样：用 denoise_strength≈0.35 起步；风格改造强时可调高（0.5–0.7）。
Hugging Face

B) T2I 首帧（原方案）
直接按 shots[0] 的 prompt + 你的一致性资产（IP-Adapter/InstantID 也可参与）生成首帧。
ip-adapter.github.io
instantid.github.io

两条路径产物一致：一个“已定版的首帧”，随后进入你的镜头内受控自回归扩展（2–4s 切片→链式延长），并保持上一片段末帧作为条件继续生成。

5) 拼接与转场（不变）
编码参数一致 → concat demuxer 无重编码拼接。

需要转场 → xfade；音频用 acrossfade。官方文档+实践教程可参考：
FFmpeg
+1
trac.ffmpeg.org
+1
OTTVerse

6) 代码改动（最小 diff）
(1) 接口与编排：src/index.ts
// 读取新增参数
const { prompt, target_len_s=65, init_mode="t2i", init_image_url, crop_strategy, denoise_strength, consistency } = req.body;

// 传给 pipeline
const plan = await planFromSinglePrompt(prompt, Number(target_len_s), {
  init_mode, init_image_url, crop_strategy, denoise_strength, consistency
});
(2) Pipeline：src/pipeline.ts
export async function planFromSinglePrompt(prompt: string, targetLen=65, init?: {
  init_mode?: "upload"|"t2i",
  init_image_url?: string,
  crop_strategy?: "center_crop"|"letterbox"|"fit",
  denoise_strength?: number,
  consistency?: { use_ip_adapter?: boolean; use_instantid?: boolean }
}) {
  // 生成基础 plan（与原相同）
  // ...

  // 在 Compiler 前，把 init 信息注入（让 Compiler 以最终 JSON 形式输出）
  const compiled = await generateWithStructuredOutputs(
    systemBase,
    compilerPrompt({
      ...JSON.parse(jsonText),
      global: {
        ...JSON.parse(jsonText).global,
        init_keyframe: {
          mode: init?.init_mode ?? "t2i",
          image_url: init?.init_image_url,
          crop_strategy: init?.crop_strategy ?? "center_crop",
          denoise_strength: init?.denoise_strength ?? 0.35,
          consistency: init?.consistency ?? { use_ip_adapter: true, use_instantid: true }
        }
      }
    }),
    "shotlist"
  );
  // 校验与回修沿用原逻辑
  // ...
}
(3) Prompts：src/prompts.ts（Compiler 追加）
export function compilerPrompt(plan: ShotList & { global: any }) {
  return `
在不改变镜头语义的前提下补全技术占位：
- 若存在 global.init_keyframe：
  - 校正: mode 必为 "upload" 或 "t2i"；
  - mode="upload" 时必须包含 image_url（URI）；
  - 若缺 crop_strategy, 用 "center_crop"；
  - 若缺 denoise_strength, 用 0.35；
- 为每个镜头补默认 lens_hint_mm 与 transition_out；
- 生成全局 tech: {"codec":"h264","pix_fmt":"yuv420p"}。
只输出完整JSON：
${JSON.stringify(plan)}
`;
}
7) 运行时流程小抄（你后端消费这个 plan）
if (plan.global.init_keyframe?.mode === "upload") {
  // (A) 预处理: 等比缩放 + 裁剪/补边到 global.ar（FFmpeg）
  // (B) 一致性: 可抽 IP-Adapter 风格向量；若有人脸则跑 InstantID/ArcFace 向量
  // (C) img2img: denoise_strength=plan.global.init_keyframe.denoise_strength
} else {
  // 直接 T2I 生成第1帧（可同时用 IP-Adapter/InstantID 提升一致性）
}
8) 风险与合规（强烈建议）
肖像/版权：上传图触发你的合规开关（NSFW 检测、授权勾选、不可含他人可识别人脸等，按你法务要求）；若检测到人脸且用户取消“InstantID绑定”，明确提示后果（可能丢失 ID 一致性）。

尺寸与AR：自动对齐到 global.ar；建议把裁剪预览回显给用户再开始渲染。

缓存与复现：记录 image_url 的文件指纹（hash）、denoise_strength、模型版本与随机种子，便于回滚与重算。

为什么这样设计
img2img（上传图作为初始潜空间） 是工业界稳定的“把用户图变成首帧”的方式，可精确控制“保真 vs 风格化”的力度（靠 denoise_strength）。
Hugging Face

IP-Adapter / InstantID 分别解决“风格/构图一致性”和“人脸 ID 一致性”，与 img2img/T2I 都能叠加使用，插件化最强。
ip-adapter.github.io
GitHub
instantid.github.io

继续用 Structured Outputs + AJV，保证计划 JSON 始终可用、可修复、可审计。
OpenAI平台
+1

拼接/转场保持 FFmpeg 标准做法（concat/xfade/acrossfade），成熟高效。
FFmpeg
+1
trac.ffmpeg.org
+1

如果你要，我可以把 FFmpeg 预处理（裁剪/补边/EXIF 方向） 和 IP-Adapter + InstantID 的最小推理脚本也补上（Python 或 Node 任选），直接读 plan.global.init_keyframe 即可。




源
您说：
1、把 FFmpeg 预处理（裁剪/补边/EXIF 方向） 和 IP-Adapter + InstantID 的最小推理脚本也补上，优选Node，
2、另外把**“plan → 队列 → 关键帧 → 片段 → 拼接/转场”**这条链路补成一份可运行的脚手架（含 FFmpeg 命令模板与一个简单的渲染任务队列）
ChatGPT 说：

已思考 1m 14s
太好了！我把你要的两部分都补齐了：

FFmpeg 预处理（裁剪/补边/EXIF 方向）+ IP-Adapter & InstantID 最小“推理”脚本（Node 优先，走 ComfyUI API）；

一条可运行的 “plan → 队列 → 关键帧 → 片段 → 拼接/转场” 脚手架（BullMQ 队列、FFmpeg 命令模板、ComfyUI API 调用）。

下面给出开箱即用的最小骨架。需要的外部事实和 API 端点我都给了权威出处（FFmpeg 拼接/转场/EXIF；ComfyUI 的 /prompt、/history、/queue、/object_info 等接口；ComfyUI 的 IP-Adapter 与 InstantID 扩展）。
FFmpeg Trac
+1
FFmpeg
ComfyUI 官方文档

项目结构
video-pipeline/
├─ package.json
├─ .env.example
├─ src/
│  ├─ index.ts                  # 启动 HTTP API（/plan、健康检查）
│  ├─ config.ts                 # 读取 .env
│  ├─ queue/
│  │   ├─ queues.ts             # BullMQ 队列定义
│  │   ├─ workers/
│  │   │   ├─ keyframe.worker.ts# 关键帧：upload/img2img 或 T2I
│  │   │   ├─ segment.worker.ts # 片段：2–4s 自回归扩展（调用 ComfyUI 工作流）
│  │   │   └─ stitch.worker.ts  # 拼接与转场（concat / xfade / acrossfade）
│  ├─ ffmpeg/
│  │   ├─ image-pre.ts          # EXIF/裁剪/补边到目标画幅
│  │   └─ video-stitch.ts       # 拼接命令模板（含转场）
│  ├─ comfy/
│  │   ├─ client.ts             # ComfyUI HTTP API 客户端（/prompt /history /queue /object_info）
│  │   ├─ ipadapter_instantid.ts# 最小工作流：IP-Adapter + InstantID 关键帧/T2I
│  │   └─ workflows/            # 放你的 API 格式工作流模板（AnimateDiff/HunyuanVideo 等）
│  ├─ storage/
│  │   └─ fs.ts                 # 本地持久化（可替换 S3/OSS）
│  └─ types.ts                  # ShotList / JobPayload 类型
ComfyUI API 路由（/prompt、/history/{id}、/queue、/object_info 等）见官方文档；你可以直接用这些端点排队执行工作流、查询结果、取图。
ComfyUI 官方文档

IP-Adapter/InstantID 官方与 ComfyUI 扩展：GitHub（tencent-ailab/IP-Adapter、InstantID、ComfyUI_IPAdapter_plus、ComfyUI_InstantID）。
GitHub
+2
GitHub
+2

依赖与环境
package.json（节选）

{
  "name": "video-pipeline",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "workers": "ts-node-dev --respawn --transpile-only src/queue/workers/*"
  },
  "dependencies": {
    "axios": "^1.7.7",
    "bullmq": "^5.7.10",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "execa": "^9.5.2",
    "form-data": "^4.0.0",
    "ioredis": "^5.4.1",
    "pino": "^9.3.2",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.6.2"
  }
}
.env.example

PORT=3000
REDIS_URL=redis://127.0.0.1:6379

# ComfyUI 本地/远程
COMFY_BASE=http://127.0.0.1:8188
COMFY_API_KEY=                                   # 如开启了API Key
COMFY_TIMEOUT_MS=600000                           # 10min

# 输出目录
OUT_DIR=./outputs
一、FFmpeg 预处理脚本（裁剪/补边/EXIF）
EXIF 方向：FFmpeg 默认“自动按 EXIF 旋转”，可用 -noautorotate 关闭（很多人被这个默认坑过）。
Super User
GitHub

裁剪/补边：按目标分辨率（如 1920×1080）选择 center_crop 或 letterbox（pad）。示例表达式与用法参考 FFmpeg Wiki/社区答案。
FFmpeg Trac
Super User
Stack Overflow

// src/ffmpeg/image-pre.ts
import { execa } from "execa";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ensureDir } from "../storage/fs";

export type CropMode = "center_crop" | "letterbox" | "fit";

export async function preprocessImage({
  input,
  outDir,
  targetW,
  targetH,
  mode = "center_crop",
  respectExif = true
}: {
  input: string; outDir: string; targetW: number; targetH: number;
  mode?: CropMode; respectExif?: boolean;
}) {
  await ensureDir(outDir);
  const out = join(outDir, `${randomUUID()}.png`);

  // EXIF：默认自动旋转；如不需要，可加 -noautorotate
  const autorotate = respectExif ? [] : ["-noautorotate"];

  let vf = "";
  if (mode === "center_crop") {
    // 先等比缩放，后中心裁剪到精确分辨率
    vf = `scale=${targetW}:${targetH}:force_original_aspect_ratio=cover,crop=${targetW}:${targetH}`;
  } else if (mode === "letterbox") {
    // 先等比缩放，后补边到目标分辨率（pad）
    vf = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2`;
  } else {
    // fit：仅缩放到最长边，可能不满屏
    vf = `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`;
  }

  await execa("ffmpeg", [
    ...autorotate,
    "-y",
    "-i", input,
    "-vf", vf,
    "-pix_fmt", "rgba",
    out
  ]);
  return out;
}
上面用到了 scale+crop（居中裁切）与 scale+pad（信箱补边）组合，这是 FFmpeg 官方与社区常见做法。
FFmpeg Trac
Super User

二、ComfyUI API 客户端 + 最小 IP-Adapter & InstantID 推理
ComfyUI 提供 /prompt（提交工作流）、/history/{prompt_id}（取结果）、/queue（队列状态）、/object_info（节点列表）等 HTTP 路由。
ComfyUI 官方文档

IP-Adapter 与 InstantID 的 ComfyUI 扩展（含节点）见这两个仓库；若节点类名有出入，可用 /object_info 动态查询。
GitHub
 
GitHub

// src/comfy/client.ts
import axios from "axios";
import { readFileSync } from "node:fs";

const base = process.env.COMFY_BASE!;
const apiKey = process.env.COMFY_API_KEY;

export async function comfyPostPrompt(prompt: any) {
  const { data } = await axios.post(`${base}/prompt`, { prompt }, {
    headers: apiKey ? { "x-api-key": apiKey } : undefined,
    timeout: Number(process.env.COMFY_TIMEOUT_MS || 600000)
  });
  return data; // { prompt_id }
}

export async function comfyGetHistory(prompt_id: string) {
  const { data } = await axios.get(`${base}/history/${prompt_id}`, {
    headers: apiKey ? { "x-api-key": apiKey } : undefined
  });
  return data;
}

export async function comfyGetQueue() {
  const { data } = await axios.get(`${base}/queue`, {
    headers: apiKey ? { "x-api-key": apiKey } : undefined
  });
  return data;
}

export async function comfyGetObjectInfo() {
  const { data } = await axios.get(`${base}/object_info`, {
    headers: apiKey ? { "x-api-key": apiKey } : undefined
  });
  return data;
}

export async function comfyUploadImage(buffer: Buffer, filename: string) {
  // 也可以用 /upload/image；此处留给你按需要实现
  return { uploaded: false, filename };
}
最小工作流：IP-Adapter + InstantID 生成“首帧关键帧”
输入：

t2i：文本 prompt（可叠加 IP-Adapter 风格图/InstantID 人脸）

upload：用户图像（img2img）+（可选）IP-Adapter/InstantID 加强一致性

实现：在 ComfyUI 中加载基础模型 → 加载 IP-Adapter 模型 → （如需）InstantID 模型/人脸分析 → 采样 → 输出

IP-Adapter 论文/仓库、Diffusers 文档（何为“图像提示适配器”）；InstantID 论文/仓库（单照 ID 保真）。
IP-Adapter
GitHub
+1
Hugging Face

// src/comfy/ipadapter_instantid.ts
import { comfyPostPrompt, comfyGetHistory } from "./client";
import { randomUUID } from "node:crypto";

/**
 * 注意：
 * 1) 不同扩展的节点类名可能略有差异（IPAdapterAdvanced / ApplyIPAdapter 等），
 *    可用 /object_info 查到准确类名与入参。:contentReference[oaicite:10]{index=10}
 * 2) 下面 workflow 仅示意 API 格式结构（“节点图”）；按你的模型与节点实际命名做调整。
 */
export async function generateKeyframeWithComfyUI({
  prompt,
  initImagePath,        // 若有：走 img2img；否则走纯 T2I
  refImagePath,         // 若有：IP-Adapter 参考图
  useInstantID = false, // 若 true：做人脸一致性（需要安装 ComfyUI_InstantID）:contentReference[oaicite:11]{index=11}
  outPrefix = "keyframe"
}: {
  prompt: string;
  initImagePath?: string;
  refImagePath?: string;
  useInstantID?: boolean;
  outPrefix?: string;
}) {
  const prompt_id = randomUUID();

  // ——— 极简 API-Graph（请根据 /object_info 的节点签名调整字段名）———
  const workflow: any = {
    "3": { // Load Checkpoint
      "class_type": "CheckpointLoaderSimple",
      "inputs": { "ckpt_name": "sd_xl_base_1.0.safetensors" }
    },
    "4": { // CLIP Text Encode
      "class_type": "CLIPTextEncode",
      "inputs": { "clip": [ "3", 1 ], "text": prompt }
    },
    "5": { // VAE
      "class_type": "VAELoader",
      "inputs": { "vae_name": "sdxl_vae.safetensors" }
    },
    ...(refImagePath ? {
      "10": { // Load IP-Adapter model（扩展：ComfyUI_IPAdapter_plus）:contentReference[oaicite:12]{index=12}
        "class_type": "IPAdapterModelLoader",
        "inputs": { "ipadapter_file": "ip-adapter_sdxl.safetensors" }
      },
      "11": {
        "class_type": "IPAdapterApply",
        "inputs": {
          "ipadapter": [ "10", 0 ],
          "image": { "image": refImagePath }, // 本地/用户目录
          "weight": 0.65
        }
      }
    } : {}),
    ...(useInstantID ? {
      "20": { // InstantID 模型节点（扩展：ComfyUI_InstantID）:contentReference[oaicite:13]{index=13}
        "class_type": "InstantIDLoader",
        "inputs": { "instantid_model": "instantid.safetensors" }
      },
      "21": { // 人脸特征/关键点
        "class_type": "InstantIDFaceAnalysis",
        "inputs": { "image": { "image": initImagePath || refImagePath } }
      },
      "22": { // 应用 InstantID 条件
        "class_type": "InstantIDApply",
        "inputs": {
          "instantid": [ "20", 0 ],
          "face_embed": [ "21", 0 ],
          "strength": 0.8
        }
      }
    } : {}),
    ...(initImagePath ? {
      "30": { // img2img：把 init 图编码进 VAE
        "class_type": "VAEEncode",
        "inputs": { "vae": [ "5", 0 ], "image": { "image": initImagePath } }
      }
    } : {}),
    "40": { // 采样（KSampler）
      "class_type": "KSampler",
      "inputs": {
        "model": [ "3", 0 ],
        "positive": [ "4", 0 ],
        "negative": "",
        ...(initImagePath ? { "latent_image": [ "30", 0 ], "denoise": 0.35 } : {}),
        "steps": 30, "cfg": 6.5, "sampler_name": "euler",
        "seed": 123456789
      }
    },
    "50": { // 解码 & 保存
      "class_type": "VAEDecode",
      "inputs": { "vae": [ "5", 0 ], "samples": [ "40", 0 ] }
    },
    "60": {
      "class_type": "SaveImage",
      "inputs": { "images": [ "50", 0 ], "filename_prefix": outPrefix }
    }
  };

  const { prompt_id: queuedId } = await comfyPostPrompt(workflow);
  const id = queuedId || prompt_id;

  // 轮询取结果（也可用 WebSocket 模式；此处为最小实现）
  // 参考：/history/{prompt_id} 返回输出路径与元数据。:contentReference[oaicite:14]{index=14}
  for (;;) {
    const h = await comfyGetHistory(id);
    const entry = h?.[id];
    const done = entry && entry.status?.completed;
    if (done) {
      const out = entry?.outputs?.["60"]?.images?.[0]; // SaveImage 节点输出
      return out; // { filename, subfolder, type }
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}
上面演示了Node 端调用 ComfyUI API 的基本套路：提交 API 格式工作流（不是 GUI 里的 workflow.json）、等待队列完成、到 /history/{prompt_id} 取到输出（再到 /view 拉图）。官方/社区已经沉淀了相当多的 API 示例与最佳实践。
ComfyUI 官方文档
9elements
Medium

三、拼接 & 转场（FFmpeg 命令模板）
参数一致 → concat demuxer 无重编码。

参数不一致或要做转场 → concat filter + xfade（视频）/ acrossfade（音频）。
这些是 FFmpeg 官方文档与 Wiki 的主推方法。
FFmpeg Trac
+1
Stack Overflow
FFmpeg

// src/ffmpeg/video-stitch.ts
import { execa } from "execa";
import { promises as fs } from "node:fs";
import { join } from "node:path";

export async function concatCopy(inputs: string[], outPath: string) {
  const list = inputs.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  const listFile = join(process.env.OUT_DIR || "./outputs", "files.txt");
  await fs.writeFile(listFile, list, "utf8");
  await execa("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", outPath]);
  return outPath;
}

export async function xfadePair(v1: string, v2: string, out: string, offsetSec=0, durSec=1) {
  // 经典 xfade + acrossfade 组合（注意 offset 对齐）:contentReference[oaicite:17]{index=17}
  await execa("ffmpeg", [
    "-y",
    "-i", v1, "-i", v2,
    "-filter_complex",
    `"[0:v][1:v]xfade=transition=crossfade:offset=${offsetSec}:duration=${durSec}[v];
      [0:a][1:a]acrossfade=d=${durSec}[a]"`,
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
    "-c:a", "aac", "-b:a", "192k",
    out
  ]);
  return out;
}
四、队列脚手架（plan → keyframe → segments → stitch）
队列用 BullMQ + Redis，非常轻量；你也可以用你现有的 Celery/Arq。

queues.ts

// src/queue/queues.ts
import { Queue } from "bullmq";
import { redis } from "./redis";

export const keyframeQ = new Queue("keyframe", { connection: redis });
export const segmentQ  = new Queue("segment",  { connection: redis });
export const stitchQ   = new Queue("stitch",   { connection: redis });
keyframe.worker.ts（首帧生成：upload/img2img 或 T2I）

import { Worker } from "bullmq";
import { redis } from "../redis";
import { preprocessImage } from "../../ffmpeg/image-pre";
import { generateKeyframeWithComfyUI } from "../../comfy/ipadapter_instantid";
import { saveLocal } from "../../storage/fs";

export const keyframeWorker = new Worker("keyframe", async job => {
  const { shot, global } = job.data;
  const ar = global.ar === "16:9" ? [1920,1080] : [1080,1920]; // 简化示例
  let initPath: string | undefined;

  if (global.init_keyframe?.mode === "upload" && global.init_keyframe.image_url) {
    // 下载到本地（略）→ FFmpeg 预处理
    initPath = await preprocessImage({
      input: global.init_keyframe.image_url,
      outDir: process.env.OUT_DIR || "./outputs",
      targetW: ar[0], targetH: ar[1],
      mode: global.init_keyframe.crop_strategy || "center_crop",
      respectExif: true
    });
  }

  const out = await generateKeyframeWithComfyUI({
    prompt: shot.prompt,
    initImagePath: initPath,
    refImagePath: initPath, // 也可单独传风格参考图
    useInstantID: !!global.init_keyframe?.consistency?.use_instantid,
    outPrefix: `shot${shot.id}_keyframe`
  });

  // ComfyUI /history 返回的 {filename, subfolder, type}，此处略作封装保存
  return await saveLocal(out);
}, { connection: redis });
segment.worker.ts（片段扩展）

这个 Worker 预留了“视频模型提供者”的接口（如 ComfyUI 的 AnimateDiff / HunyuanVideo 工作流 JSON），仍通过 ComfyUI /prompt 提交 + /history 拉取。关于如何把自定义工作流变成 API-prompt，可参考官方/社区教程。
Medium
9elements

import { Worker } from "bullmq";
import { redis } from "../redis";
import { comfyPostPrompt, comfyGetHistory } from "../../comfy/client";

export const segmentWorker = new Worker("segment", async job => {
  const { shot, sliceSec, lastFramePath } = job.data;

  // TODO: 替换成你的“视频生成工作流模板”，把 lastFramePath 作为初始帧/条件
  const workflow = {/* 你的 AnimateDiff / HunyuanVideo 节点图 */};

  const { prompt_id } = await comfyPostPrompt(workflow);
  for (;;) {
    const h = await comfyGetHistory(prompt_id);
    const done = h?.[prompt_id]?.status?.completed;
    if (done) return h?.[prompt_id]?.outputs; // 返回片段文件信息
    await new Promise(r => setTimeout(r, 1500));
  }
}, { connection: redis });
stitch.worker.ts（拼接与转场）

import { Worker } from "bullmq";
import { redis } from "../redis";
import { concatCopy, xfadePair } from "../../ffmpeg/video-stitch";

export const stitchWorker = new Worker("stitch", async job => {
  const { segments, transitions, out } = job.data as {
    segments: string[]; transitions: ("cut"|"crossfade")[]; out: string;
  };

  // 简化：只有 cut / crossfade 两种
  let current = segments[0];
  for (let i=1;i<segments.length;i++) {
    if (transitions[i-1] === "crossfade") {
      const faded = out.replace(".mp4", `_${i}_xfade.mp4`);
      await xfadePair(current, segments[i], faded, /*offset*/ Math.max(0, -1), /*dur*/ 1);
      current = faded;
    } else {
      // 同参可一次性 concat；这里逐段拼更直观
      const merged = out.replace(".mp4", `_${i}_cat.mp4`);
      await concatCopy([current, segments[i]], merged);
      current = merged;
    }
  }
  return current;
}, { connection: redis });
concat demuxer 适用于“编码参数一致”的拼接；要做转场则用 xfade（视频）+ acrossfade（音频）。这些用法在 FFmpeg 官方/社区都有详尽示例。
FFmpeg Trac
+1
FFmpeg

五、HTTP 入口：接收 plan & 投递队列
// src/index.ts
import "dotenv/config";
import express from "express";
import pino from "pino";
import { keyframeQ, segmentQ, stitchQ } from "./queue/queues";

const app = express();
app.use(express.json({ limit: "1mb" }));
const log = pino();
const PORT = Number(process.env.PORT || 3000);

app.post("/plan", async (req, res) => {
  const { plan } = req.body; // 直接接你上游 Planner 的 ShotList
  const first = plan.shots[0];

  // 1) 首帧
  const keyframeJob = await keyframeQ.add("keyframe", { shot: first, global: plan.global });

  // 2) 每个镜头切成 2–4s 片段（示例：3s），链式扩展（略）
  // 实际里：等 keyframe 完成后，用 keyframe 的图做第一段的初始帧
  const segJobs = []; // await segmentQ.add(...)

  // 3) 拼接与转场
  // const stitched = await stitchQ.add("stitch", { segments: [...], transitions: [...], out: "final.mp4" })

  return res.json({ ok: true, keyframe_job: keyframeJob.id });
});

app.listen(PORT, () => log.info(`API on :${PORT}`));
跑起来 & 必要准备
准备 ComfyUI（本地或远程 GPU），安装扩展：

IP-Adapter（ComfyUI_IPAdapter_plus 或官方 comfyorg/comfyui-ipadapter）；
GitHub
+1

InstantID（cubiq/ComfyUI_InstantID）并按说明放置模型文件/InsightFace 依赖。
GitHub

ComfyUI 的 HTTP 路由参考官方文档“Core API Routes”。
ComfyUI 官方文档

安装 FFmpeg（命令行可用），EXIF 自动旋转为默认行为（若不想自动旋转，加 -noautorotate）。
Super User

Redis（BullMQ 队列），REDIS_URL 指向它。

npm i && cp .env.example .env，填好 COMFY_BASE 等。

npm run dev 启动 API，另开终端跑 npm run workers 启动 Worker。

你能立刻获得什么
首帧关键帧：

用户上传图 → image-pre.ts 先对齐画幅 & EXIF → ipadapter_instantid.ts 走 img2img（可叠加 IP-Adapter/InstantID）；

或纯 T2I → ipadapter_instantid.ts 走文本生成（可叠加 IP-Adapter/InstantID）。

片段扩展：segment.worker.ts 占位了“视频模型工作流”，你只要把 AnimateDiff / HunyuanVideo 的 API-prompt（ComfyUI 导出的 API 格式 工作流）贴进去即可，提交 /prompt → 轮询 /history/{id} 拉回片段文件。
Medium

拼接/转场：video-stitch.ts 已给出 concat 与 xfade+acrossfade 的模板命令（官方/社区最佳实践）。
FFmpeg Trac
+1
FFmpeg

小贴士（常见坑）
ComfyUI 工作流 JSON：GUI 里的 workflow.json 与 API-prompt 不是同一格式，API 端需要“节点图”形式；很多教程教你如何从 GUI 导出 API 格式 或用工具转换。
GitHub
Medium

查询节点类名：不同扩展的节点类名会变，用 /object_info 动态发现最稳。
ComfyUI 官方文档

EXIF 方向：默认会自动旋转，如想保留原始朝向请加 -noautorotate。
Super User

转场对齐：xfade 的 offset 与 duration 要与上一段/下一段时长对齐，社区有大量示例与进阶（自定义缓动曲线）。
Stack Overflow
GitHub

同参直拼：想避免重编码，先把所有片段统一参数（编解码器、分辨率、帧率、像素格式），就能走 concat demuxer 直拼。
FFmpeg Trac

如果你要，我可以再给你一份 AnimateDiff/HunyuanVideo 的 API-prompt 模板（ComfyUI 版），把“上一片段末帧 → 下一片段初始条件”的链式扩展写成可直接替换到 segment.worker.ts 的 JSON。





源
您说：
我希望基于OpenAI的LLM实现把单提示拆成镜头表，基于Runway实现视频生成，支持用户输入关键帧图片和T2I输入关键帧，支持每个镜头片段提取尾帧作为下一片段的首帧输入，以保持连续性
ChatGPT 说：

已思考 2m 39s
太好了，这个目标完全能落地：用 OpenAI 做“单提示 → 镜头表（shotlist）”，然后用 Runway 的 API 逐段生成视频；首帧既可用用户上传图片，也可用 T2I 生成；并在每个片段间用尾帧作为下一段的首帧以保持连续性。下面给你一套最小可运行的 Node 服务骨架（Express + OpenAI + Runway SDK + FFmpeg），以及关键命令/注意事项。

参考要点（可点开对照）
• Runway 官方 Node SDK：image_to_video/text_to_image、任务轮询、版本头、模型与时长/分辨率限制等。
Runway API
+2
Runway API
+2

• OpenAI「Structured Outputs」：response_format: { type: "json_schema", strict: true } 生成严格符合 schema 的 JSON。
OpenAI平台
Microsoft Learn

• FFmpeg：concat demuxer 拼接；提取视频最后一帧作为图片（-sseof + -update 1）。
FFmpeg
Super User

一、服务骨架（Express）
环境准备

npm i express openai @runwayml/sdk execa undici mime-types
# 需要已安装 FFmpeg/FFprobe；环境变量：
# OPENAI_API_KEY=...
# RUNWAYML_API_SECRET=...  (Runway 后台获取)
// server.ts (TS/JS 均可)
// tsconfig 请将 "moduleResolution":"bundler" 或用 JS 直接运行
import express from 'express';
import { OpenAI } from 'openai';
import RunwayML, { TaskFailedError } from '@runwayml/sdk';
import { execa } from 'execa';
import fs from 'fs/promises';
import path from 'path';
import * as mime from 'mime-types';
import { fetch } from 'undici';

const app = express();
app.use(express.json({ limit: '20mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const runway = new RunwayML(); // SDK 会读取 RUNWAYML_API_SECRET；底层会附带 X-Runway-Version（也可自行在 fetch 里设置）

/** --- 1) 用 OpenAI 将单提示拆成镜头表（严格 JSON） --- */
const shotSchema = {
  name: 'shot_plan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ratio', 'total_seconds', 'shots'],
    properties: {
      ratio: { type: 'string', enum: ['1280:720','720:1280','960:960','1104:832','832:1104','1584:672'] }, // 参考 Runway 可用分辨率
      total_seconds: { type: 'integer', minimum: 3, maximum: 120 },
      shots: {
        type: 'array',
        minItems: 1,
        maxItems: 12,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id','prompt','duration_s','camera'],
          properties: {
            id: { type: 'integer' },
            prompt: { type: 'string' },
            // 建议与模型时长对齐：gen4_turbo 支持 5s/10s；act_two 最长 30s
            duration_s: { type: 'integer', minimum: 3, maximum: 30 },
            camera: { type: 'string' } // e.g. "static", "slow zoom in"
          }
        }
      }
    }
  }
};

app.post('/plan', async (req, res) => {
  const { user_prompt, target_seconds = 30, ratio = '1280:720' } = req.body || {};
  try {
    const r = await openai.responses.create({
      model: 'gpt-4o-2024-08-06', // 支持 Structured Outputs 的快照之一
      input: [
        {
          role: 'system',
          content:
            '你是电影分镜师。把用户的高层提示分解成镜头序列（shots）。' +
            '遵守模型时长约束：若使用 Runway gen4_turbo，单段建议 5s 或 10s；act_two 可到 30s。' +
            '总时长接近 target_seconds，shots 之间保证叙事连续与主体一致。'
        },
        {
          role: 'user',
          content: `高层提示: ${user_prompt}\n目标总时长(秒): ${target_seconds}\n画幅比: ${ratio}`
        }
      ],
      response_format: { type: 'json_schema', json_schema: shotSchema }
    });
    const plan = JSON.parse(r.output_text!);
    // 简单校正：把 duration_s 量化到 5/10/30
    plan.shots = plan.shots.map((s: any) => {
      const q = s.duration_s <= 7 ? 5 : s.duration_s <= 15 ? 10 : Math.min(30, s.duration_s);
      return { ...s, duration_s: q };
    });
    res.json(plan);
  } catch (e: any) {
    res.status(500).json({ error: e.message, tip: '检查 OPENAI_API_KEY 与请求体' });
  }
});

/** --- 2) 工具函数 --- */
async function fileToDataUri(p: string) {
  const buf = await fs.readFile(p);
  const ct = mime.lookup(p) || 'image/png';
  return `data:${ct};base64,${buf.toString('base64')}`;
}

async function download(url: string, outPath: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download failed: ${r.status}`);
  const f = await fs.open(outPath, 'w');
  await r.body?.pipeTo(f.createWriteStream());
}

async function extractLastFrame(inputMp4: string, outPng: string) {
  // 使用 -sseof 从倒数若干秒开始读取，并用 -update 1 只保留最后一帧
  await execa('ffmpeg', ['-y', '-sseof', '-3', '-i', inputMp4, '-update', '1', '-q:v', '2', outPng]);
}

async function concatByDemuxer(files: string[], outMp4: string) {
  const listTxt = outMp4.replace(/\.mp4$/, '.txt');
  await fs.writeFile(listTxt, files.map(f => `file '${path.resolve(f)}'`).join('\n'));
  await execa('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listTxt, '-c', 'copy', outMp4]);
}

/** --- 3) 可选：T2I 生成首帧（Runway 的 text_to_image） --- */
async function t2iKeyframe(promptText: string, ratio: string, model: 'gen4_image' | 'gen4_image_turbo' = 'gen4_image') {
  const imgTask = await runway.textToImage.create({
    model,
    promptText,
    ratio
  }).waitForTaskOutput();
  return imgTask.output[0] as string; // URL
}

/** --- 4) 每段生成：image_to_video（以图生视频） --- */
async function imageToVideoFromDataUri(dataUri: string, promptText: string, ratio: string, duration: number, model = 'gen4_turbo') {
  const vTask = await runway.imageToVideo.create({
    model,
    promptImage: dataUri,
    promptText,
    ratio,
    duration
  }).waitForTaskOutput();
  return vTask.output[0] as string; // URL
}

/** --- 5) 渲染主流程：支持 upload 与 T2I 两种首帧来源；每段用上段尾帧做连续性 --- */
app.post('/render', async (req, res) => {
  /**
   * body:
   * {
   *   plan: { ratio, shots: [...] },
   *   init: { mode: 'upload'|'t2i', imagePath?: string, t2iPrompt?: string, t2iModel?: 'gen4_image'|'gen4_image_turbo' },
   *   model?: 'gen4_turbo'|'act_two',
   *   workDir?: string
   * }
   */
  const { plan, init, model = 'gen4_turbo', workDir = './out' } = req.body || {};
  await fs.mkdir(workDir, { recursive: true });

  try {
    const ratio = plan.ratio;
    let currentKeyframeDataUri: string;

    // ① 准备首帧
    if (init?.mode === 'upload') {
      // 直接把用户图转 Data URI（可在此处用 FFmpeg/Sharp 进行裁剪/补边到 ratio）
      currentKeyframeDataUri = await fileToDataUri(init.imagePath);
    } else {
      // 用 T2I 生成首帧（Runway），再下载转 Data URI
      const url = await t2iKeyframe(init?.t2iPrompt || plan.shots[0].prompt, ratio, init?.t2iModel || 'gen4_image');
      const keyP = path.join(workDir, 't2i_key.png');
      await download(url, keyP);
      currentKeyframeDataUri = await fileToDataUri(keyP);
    }

    const allSegments: string[] = [];
    let prevSegmentPath: string | null = null;

    for (const shot of plan.shots) {
      let remain = shot.duration_s;
      while (remain > 0) {
        const segDur = Math.min(remain, model === 'gen4_turbo' ? (remain <= 7 ? 5 : 10) : Math.min(30, remain));
        const segUrl = await imageToVideoFromDataUri(
          currentKeyframeDataUri,
          shot.prompt, // 也可把 camera、风格等拼入提示
          ratio,
          segDur,
          model
        );
        const segPath = path.join(workDir, `shot${shot.id}_d${segDur}s_${Date.now()}.mp4`);
        await download(segUrl, segPath);
        allSegments.push(segPath);

        // 取尾帧 → 作为下一段的首帧
        const tailPng = segPath.replace(/\.mp4$/, '_tail.png');
        await extractLastFrame(segPath, tailPng);
        currentKeyframeDataUri = await fileToDataUri(tailPng);

        prevSegmentPath = segPath;
        remain -= segDur;
      }
    }

    const finalOut = path.join(workDir, `stitched_${Date.now()}.mp4`);
    await concatByDemuxer(allSegments, finalOut);

    res.json({ ok: true, output: finalOut, segments: allSegments });
  } catch (err: any) {
    if (err instanceof TaskFailedError) {
      return res.status(500).json({ error: 'Runway 任务失败', details: err.taskDetails });
    }
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('OK on http://localhost:3000'));
二、如何用
让 LLM 产出镜头表
POST /plan

{
  "user_prompt": "一个机器人在夜晚探索未来城市",
  "target_seconds": 30,
  "ratio": "1280:720"
}
得到：

{
  "ratio":"1280:720",
  "total_seconds":30,
  "shots":[
    {"id":1,"prompt":"广角…雨夜霓虹…","duration_s":10,"camera":"static"},
    {"id":2,"prompt":"蓝色眼睛特写…","duration_s":5,"camera":"slow zoom in"},
    {"id":3,"prompt":"俯冲至街道…","duration_s":10,"camera":"dolly in"},
    {"id":4,"prompt":"尾声…","duration_s":5,"camera":"handheld"}
  ]
}
渲染（两种首帧来源二选一）

用户上传首帧：
POST /render

{
  "plan": { "...见上..." },
  "init": { "mode": "upload", "imagePath": "./assets/user_key.png" },
  "model": "gen4_turbo",
  "workDir": "./runs/001"
}
T2I 首帧（用 Runway 先生一张，再 I2V 出第一段）：

{
  "plan": { "...见上..." },
  "init": { "mode": "t2i", "t2iPrompt": "夜晚霓虹城市天台站立的流线型机器人", "t2iModel":"gen4_image" },
  "model": "gen4_turbo",
  "workDir": "./runs/002"
}
服务会：

每个镜头按 5s/10s（或 act_two 最长 30s）切片生成；

取上一段的尾帧（FFmpeg 提取）作为下一段 I2V 的 promptImage，从而实现尾接头的连续性；

用 concat demuxer 无损合并为最终 MP4。
Runway API
FFmpeg

三、关键点与坑
Runway SDK 与任务轮询
Node SDK 自带 waitForTaskOutput()，避免你自己写轮询；失败会抛 TaskFailedError。
Runway API

可用模型与时长/分辨率
gen4_turbo：5s / 10s；多种 720p 附近比例；act_two：到 30s；upscale_v1：可把成片（≤30s）升到 4K（边长上限 4096）。据此设置 duration_s 与 ratio。
Runway API

Structured Outputs（强约束 JSON）
使用 response_format: { type: "json_schema", json_schema: { strict: true, schema: ... } }，减少解析失败；上文 /plan 就是该写法。
OpenAI平台
Microsoft Learn

尾帧提取命令
推荐：

ffmpeg -sseof -3 -i input.mp4 -update 1 -q:v 2 last.png
-sseof -3 从倒数 3 秒开始读取，-update 1 只保留“最后写入”的那帧 → 即最终帧。
Super User

拼接
同编码/参数可用 concat demuxer 无重编码拼接（最快最稳）：

# mylist.txt:
# file '/abs/path/seg1.mp4'
# file '/abs/path/seg2.mp4'
ffmpeg -f concat -safe 0 -i mylist.txt -c copy output.mp4
若你要加交叉淡入淡出，可改用 xfade 做有损合成。
FFmpeg

四、为什么这套实现能满足你的需求
“单提示 → 镜头表”：用 OpenAI 的 Structured Outputs 把大纲拆成严格 schema 的 JSON，可直接喂到渲染管线；比纯文本稳。
OpenAI平台

“首帧可上传或 T2I”：上面 /render 的 init.mode 即开关；T2I 走 Runway text_to_image，上传图走本地 Data URI；再统一接 image_to_video。
Runway API

“片段尾接头保证连续性”：每段结束即提取尾帧（FFmpeg），作为下一段 I2V 的 promptImage，序列化自回归地推进叙事。
Super User

“基于 Runway 生成视频”：全流程使用 Runway 官方 SDK / API，含任务轮询、模型能力（时长/比例/费用）等。
Runway API
+2
Runway API
+2

要不要我再给你补一份Dockerfile + PM2 的部署脚本、以及跨镜头过渡（xfade）和自动升格到 4K 的可选步骤？

