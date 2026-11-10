# 规划工具调用范例

先读主 Skill，再按当前需要选一个范例。示例 ID 和 revision 须替换成真实读取值，requestId 须为本次唯一值。ref 只在同一 apply 内有效；后续使用返回 mapping。

先用 planning.pages 按用途定位画布，再带 pageId 读 planning.groups 与 planning.list/search。读命中事件用 planning.get；目录层级看 parentId/groupId，真实前后关系看 flow。整理已有内容可直接选文末“收进文件夹”或“组织成阶段”的范例；这两种操作保留原卡及连线，不需要新开画布。

创建后用 planning.layout 安放本页新增对象：pageId 取返回的新页 ID 或所选页，expectedSequence 取刚返回的 sequence。默认 missing 保留所有已摆放卡片；并非每轮都全图整理。

## 新建独立讨论页与便签

```json
{
  "action": "planning.apply",
  "args": {
    "requestId": "new-independent-page-unique",
    "reason": "另开一页讨论远行篇，不混入当前路线",
    "operations": [
      {
        "op": "page.create",
        "ref": "journey",
        "value": {
          "name": "远行篇 · 讨论",
          "summary": "离开雨城后的独立情节，还未决定采用。"
        }
      },
      {
        "op": "node.create",
        "ref": "arrival",
        "value": {
          "pageId": "journey",
          "title": "抵达陌生港口",
          "summary": "旅途的第一处落脚点，先核对人物目标。",
          "content": "这是备选事件，具体冲突等待作者讨论。"
        }
      },
      {
        "op": "decoration.create",
        "ref": "question",
        "value": {
          "pageId": "journey",
          "kind": "note",
          "title": "待讨论",
          "content": "这一段的驱动力来自人物主动选择，还是外界压力？",
          "color": "sand",
          "fontSize": 18
        }
      }
    ]
  }
}
```

## 三线汇合的局部沙盘

```json
{
  "action": "planning.apply",
  "args": {
    "requestId": "dock-sandbox-unique",
    "reason": "用局部沙盘推演三方行动及交汇点",
    "operations": [
      {
        "op": "page.create",
        "ref": "dock",
        "value": {
          "name": "码头决战推演",
          "summary": "主角、守方和第三方的行动如何交汇；方案尚未采用。"
        }
      },
      {
        "op": "group.create",
        "ref": "hero-frame",
        "value": {
          "name": "主角 · 取回账本",
          "pageId": "dock"
        }
      },
      {
        "op": "group.create",
        "ref": "guard-frame",
        "value": {
          "name": "守方 · 诱敌入局",
          "pageId": "dock"
        }
      },
      {
        "op": "group.create",
        "ref": "third-frame",
        "value": {
          "name": "第三方 · 借乱行动",
          "pageId": "dock"
        }
      },
      {
        "op": "node.create",
        "ref": "infiltrate",
        "value": {
          "pageId": "dock",
          "title": "主角潜入仓库",
          "summary": "为找回账本绕开正门，进入守方视线。",
          "content": "讨论入口与主角掌握的信息。",
          "threads": [
            "主角"
          ],
          "groupId": "hero-frame"
        }
      },
      {
        "op": "node.create",
        "ref": "alarm",
        "value": {
          "pageId": "dock",
          "title": "发现诱饵，触发警报",
          "summary": "假账本暴露陷阱，主角必须改变路线。",
          "content": "让警报来自识破诱饵后的行动，避免无缘无故暴露。",
          "threads": [
            "主角"
          ],
          "groupId": "hero-frame"
        }
      },
      {
        "op": "node.create",
        "ref": "ambush",
        "value": {
          "pageId": "dock",
          "title": "守方布置诱饵",
          "summary": "以假账本吸引潜入者，真账本另有人看守。",
          "content": "推演守方目标与行动依据。",
          "threads": [
            "守方"
          ],
          "groupId": "guard-frame"
        }
      },
      {
        "op": "node.create",
        "ref": "block",
        "value": {
          "pageId": "dock",
          "title": "警报后封锁出口",
          "summary": "守方从伏击转为围堵，压缩主角选择。",
          "content": "核对封锁需要的时间，以及守方不知道的信息。",
          "threads": [
            "守方"
          ],
          "groupId": "guard-frame"
        }
      },
      {
        "op": "node.create",
        "ref": "observe",
        "value": {
          "pageId": "dock",
          "title": "第三方等候交火",
          "summary": "借两方冲突制造夺取账本的机会。",
          "content": "第三方另有目标，不默认与主角合作。",
          "threads": [
            "第三方"
          ],
          "groupId": "third-frame"
        }
      },
      {
        "op": "node.create",
        "ref": "blackout",
        "value": {
          "pageId": "dock",
          "title": "趁封锁切断照明",
          "summary": "断电打乱围堵，也给第三方靠近账本的机会。",
          "content": "让断电有行动成本与事先准备。",
          "threads": [
            "第三方"
          ],
          "groupId": "third-frame"
        }
      },
      {
        "op": "node.create",
        "ref": "converge",
        "value": {
          "pageId": "dock",
          "title": "黑暗中抢夺账本",
          "summary": "警报、围堵与断电汇合，三方在同一处正面冲突。",
          "content": "共同讨论谁先拿到账本、谁付出代价，以及冲突留下的后果。"
        }
      },
      {
        "op": "edge.create",
        "value": {
          "from": "infiltrate",
          "to": "alarm"
        }
      },
      {
        "op": "edge.create",
        "value": {
          "from": "ambush",
          "to": "block"
        }
      },
      {
        "op": "edge.create",
        "value": {
          "from": "observe",
          "to": "blackout"
        }
      },
      {
        "op": "edge.create",
        "value": {
          "from": "alarm",
          "to": "converge"
        }
      },
      {
        "op": "edge.create",
        "value": {
          "from": "block",
          "to": "converge"
        }
      },
      {
        "op": "edge.create",
        "value": {
          "from": "blackout",
          "to": "converge"
        }
      },
      {
        "op": "decoration.create",
        "ref": "choice",
        "value": {
          "pageId": "dock",
          "kind": "note",
          "title": "结局待讨论",
          "content": "账本完整带走，还是付出损失才能保住关键证据？选定后更新汇合节点。",
          "color": "sand",
          "fontSize": 18
        }
      }
    ]
  }
}
```

## 补充原事件

```json
{
  "action": "planning.apply",
  "args": {
    "requestId": "update-scene-unique",
    "reason": "补充暂不揭穿假账的动机",
    "operations": [
      {
        "op": "node.update",
        "id": "SCENE_ID",
        "expectedRevision": 1,
        "value": {
          "summary": "主角压下质问冲动，准备沿送账人的去向追查。",
          "content": "留存可疑账册。主角没有当场质问，因为惊动送账人会使幕后线索中断；他准备先核对送账人的去向。"
        }
      }
    ]
  }
}
```

## 从起点续接

```json
{
  "action": "planning.continue",
  "args": {
    "nodeId": "SCENE_ID",
    "expectedRevision": 1,
    "requestId": "continue-scene-unique",
    "value": {
      "title": "暗中跟踪送账人",
      "summary": "送账人没有回账房，而是走向废弃码头。",
      "content": "这是尚未采用的下一步：跟踪可能找到幕后人，也可能让主角暴露。",
      "status": "idea"
    }
  }
}
```

## 在已有箭头中插入事件

```json
{
  "action": "planning.apply",
  "args": {
    "requestId": "insert-scene-unique",
    "reason": "在发现假账与追查码头之间补上线索",
    "operations": [
      {
        "op": "node.create",
        "ref": "clue",
        "value": {
          "pageId": "SCENE_PAGE_ID",
          "title": "核对送账时间",
          "summary": "账本时间与码头收据不符，提供追查方向。",
          "content": "由人物主动核对得出线索，避免突然知道目的地。",
          "groupId": "PLAN_GROUP_ID",
          "status": "idea"
        }
      },
      {
        "op": "edge.delete",
        "id": "DIRECT_EDGE_ID",
        "expectedRevision": 1,
        "confirm": true
      },
      {
        "op": "edge.create",
        "value": {
          "from": "SCENE_ID",
          "to": "clue"
        }
      },
      {
        "op": "edge.create",
        "value": {
          "from": "clue",
          "to": "NEXT_SCENE_ID"
        }
      }
    ]
  }
}
```


## 原阶段直接包含子情节

先定位原阶段 SCENE_ID；细化写入同一画布，以 parentId 包含子情节，原阶段摘要就是收纳后的概括。人物引用 CHARACTER_ID 来自当前设定检索，不创建同名副本；不确定时可先不关联。子情节的因果关系另用边表达：

```json
{"action":"planning.apply","args":{"requestId":"expand-existing-stage-unique","reason":"在原阶段中细化人物行动","operations":[{"op":"node.create","ref":"arrival","value":{"title":"来客登门","summary":"来客带来旧账册，希望主角辨认","parentId":"SCENE_ID","pageId":"SCENE_PAGE_ID","groupId":"PLAN_GROUP_ID","memoryRefs":["CHARACTER_ID"]}},{"op":"node.create","ref":"questioning","value":{"title":"主角追问账册来源","summary":"旧址线索让主角怀疑来客的说法","parentId":"SCENE_ID","pageId":"SCENE_PAGE_ID","groupId":"PLAN_GROUP_ID","memoryRefs":["CHARACTER_ID"]}},{"op":"edge.create","value":{"from":"arrival","to":"questioning"}}]}}
```

planning.get 返回的 resources 仅为这些引用的有限当前摘要；状态或摘要不足以判断动机时再 graph.get。没有“读取完所有设定才准写入”的要求。

## 把已有同级事件收进嵌套文件夹

先读原卡的 pageId、groupId、parentId、revision，并读 planning.groups 核对目标路径。此例两张卡原在 PLAN_GROUP_ID 下；新建子文件夹后仅调整 groupId，原来的事件关系与坐标保留。如果卡片属于同一个阶段，移动整个阶段通常更清楚；按作者要整理的范围决定。

```json
{
  "action": "planning.apply",
  "args": {
    "requestId": "collect-existing-scenes-unique",
    "reason": "把假账追查的已有事件归到同一子文件夹",
    "operations": [
      {"op":"group.create","ref":"collected","value":{"name":"假账追查","pageId":"SCENE_PAGE_ID","parentId":"PLAN_GROUP_ID"}},
      {"op":"node.update","id":"SCENE_ID","expectedRevision":1,"value":{"groupId":"collected"}},
      {"op":"node.update","id":"NEXT_SCENE_ID","expectedRevision":1,"value":{"groupId":"collected"}}
    ]
  }
}
```

已有子文件夹也可收进来：读它的 revision 后，用 planning.group.update 的 groupId 指定原夹、parentId 指定新父夹；同一 apply 内对应 group.update 的 id 和 value.parentId。这里的 parentId 属于文件夹，不是情节阶段。

## 把已有同级事件组织成阶段

作者需要一个概括事件来展开、收纳整段剧情时，先复用合适的原阶段；确实没有再创建。此例原事件位于同一画布、同一文件夹中，新建一个阶段，将原卡的 parentId 指向它。原本“发现假账 → 追查码头”的推进关系保留；不用新增“阶段 → 子项”的因果边表示包含。

```json
{
  "action": "planning.apply",
  "args": {
    "requestId": "group-existing-stage-unique",
    "reason": "用一个阶段概括已有假账追查情节",
    "operations": [
      {"op":"node.create","ref":"phase","value":{"title":"假账追查","summary":"从发现疑点到追查码头，逐步收紧线索。","pageId":"SCENE_PAGE_ID","groupId":"PLAN_GROUP_ID"}},
      {"op":"node.update","id":"SCENE_ID","expectedRevision":1,"value":{"parentId":"phase"}},
      {"op":"node.update","id":"NEXT_SCENE_ID","expectedRevision":1,"value":{"parentId":"phase"}}
    ]
  }
}
```

完成后回读阶段的 children 或文件夹的 path，向作者说明“已整理到哪张画布、哪一级目录”。展开、折叠及目录同级手动排序仍是界面操作，不向节点写入 folded/order 等虚构字段。需要重排画布时另用布局工具。
