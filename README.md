# ESP32 WLED 控制脚本

这是一个用 Node.js 通过串口控制 ESP32/WLED 灯效的小工具。当前主要用于在不同任务状态下切换灯光颜色，例如运行中、成功、错误、等待审核和完成。

## 环境要求

- Node.js
- pnpm
- 已刷入 WLED 的 ESP32 设备
- 设备通过串口连接到本机

## 安装

```bash
pnpm install
```

## 构建

项目使用 TypeScript 编写，并通过 `tsdown` 打包 CLI：

```bash
pnpm typecheck
pnpm build
```

构建产物位于 `dist/wled.mjs`，也是 `package.json` 中声明的 CLI 入口。

## 配置

配置文件位于 `scripts/wled-profiles.json`：

```json
{
  "port": "/dev/cu.usbserial-0001",
  "baudRate": 115200,
  "defaults": {
    "ledRange": {
      "start": 0,
      "stop": null
    }
  },
  "profiles": {
    "running": {
      "payload": {
        "on": true,
        "bri": 160,
        "seg": [
          {
            "fx": 2,
            "sx": 128,
            "ix": 128,
            "col": [[0, 0, 255]]
          }
        ]
      }
    },
    "success": {
      "color": [0, 255, 0]
    },
    "error": {
      "color": [255, 0, 0]
    },
    "review": {
      "color": [255, 160, 0]
    },
    "finish": {
      "color": [255, 255, 255]
    }
  }
}
```

字段说明：

- `port`：ESP32 串口路径。
- `baudRate`：串口波特率。
- `defaults.ledRange`：默认灯珠控制范围。
- `defaults.ledRange.start`：起始灯珠索引，从 `0` 开始。
- `defaults.ledRange.stop`：结束灯珠索引，不包含该位置；设为 `null` 表示不限制结束位置。
- `profiles`：本地快捷配置，不对应 WLED 设备里的 preset。
- `profiles.*.color`：简写 RGB 颜色，格式为 `[红, 绿, 蓝]`，取值范围为 `0-255`。
- `profiles.*.payload`：完整 WLED JSON payload；如果配置了 `payload`，会优先使用它。

例如只控制前 10 颗灯：

```json
"defaults": {
  "ledRange": {
    "start": 0,
    "stop": 10
  }
}
```

如果不确定串口路径，先运行：

```bash
pnpm wled:ports
```

## 可用命令

```bash
pnpm wled
pnpm wled:running
pnpm wled:success
pnpm wled:error
pnpm wled:review
pnpm wled:finish
pnpm wled:off
pnpm wled:ports
```

也可以直接使用 CLI：

```bash
node dist/wled.mjs --help
node dist/wled.mjs send --help
node dist/wled.mjs running
node dist/wled.mjs success
node dist/wled.mjs error
node dist/wled.mjs review
node dist/wled.mjs finish
node dist/wled.mjs off
node dist/wled.mjs ports
```

命令含义：

- `wled`：显示 CLI 帮助。
- `wled:running`：应用 `running` profile。
- `wled:success`：应用 `success` profile。
- `wled:error`：应用 `error` profile。
- `wled:review`：应用 `review` profile。
- `wled:finish`：应用 `finish` profile。
- `wled:off`：关闭灯光。
- `wled:ports`：列出本机可用串口。

## 灵活发送

`send` 子命令用于像 `curl` 一样发送自定义 WLED JSON：

```bash
node dist/wled.mjs send --json '{"on":true,"bri":128}'
node dist/wled.mjs send --json '{"on":true,"seg":[{"col":[[0,255,0]]}]}'
node dist/wled.mjs send --file payload.json
cat payload.json | node dist/wled.mjs send --stdin
```

也可以用参数生成常见 payload：

```bash
node dist/wled.mjs send --color 255,0,0
node dist/wled.mjs send --color 0,0,255 --brightness 160 --range 0:20
node dist/wled.mjs send --off
node dist/wled.mjs running --off-after 3000
node dist/wled.mjs send --color 255,0,0 --off-after 5000
node dist/wled.mjs running --owner esp32 --off-after 3000
```

`--range 0:20` 表示控制索引 `0` 到 `19` 的 20 颗灯。
`--off-after 3000` 表示发送当前灯效后等待 3000 毫秒再自动关闭。
`--owner esp32` 表示这次灯效属于 `esp32`；延迟关灯前会检查 owner，避免另一个会话已经接管灯光时被误关。未传 `--owner` 时，CLI 会根据当前 git 根目录自动生成 owner。

## HTTP 网关

如果 ESP32 无法连接内网，可以在连接串口的机器上启动 HTTP 到串口的转发服务：

```bash
pnpm server
```

默认监听 `127.0.0.1:8787`。如果需要给内网其他机器访问：

```bash
node dist/wled-server.mjs --host 0.0.0.0 --port 8787
```

接口示例：

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/ports
curl -X POST http://127.0.0.1:8787/profile/running
curl -X POST 'http://127.0.0.1:8787/profile/error?offAfter=5000&owner=esp32'
curl -X POST http://127.0.0.1:8787/off
curl -X POST http://127.0.0.1:8787/send \
  -H 'content-type: application/json' \
  -d '{"on":true,"bri":160,"seg":[{"fx":2,"col":[[0,0,255]]}]}'
```

`/send` 也支持包装格式，便于传 `owner/offAfter`：

```bash
curl -X POST 'http://127.0.0.1:8787/send?owner=esp32&offAfter=3000' \
  -H 'content-type: application/json' \
  -d '{"payload":{"on":true,"bri":160}}'
```

需要自定义 profile 名称时，直接传给 CLI：

```bash
node dist/wled.mjs profile running
```

## Codex 集成

项目级 hooks 位于 `.codex/hooks.json`，使用 Codex 官方 hooks 格式：

- `UserPromptSubmit`：切换到 `running`。
- `PermissionRequest`：切换到 `review`。
- `PostToolUse`：调用 `.codex/hooks/post-tool-use.mjs`，仅在工具返回非 0 退出码时切换到 `error --owner esp32 --off-after 5000`。
- `Stop`：切换到 `finish --owner esp32 --off-after 3000`。

项目还提供了 skill：`.codex/skills/wled/SKILL.md`。当 AI 需要测试、配置或主动控制物理状态灯时，可以按该 skill 的说明调用 CLI。

## 灯光说明

当前脚本直接通过串口发送 WLED JSON，不依赖 WLED 设备内保存的预设。默认 profile 当前都配置为呼吸灯效果。

| 状态 | 颜色值 | 效果 | 含义 |
| --- | ---: | --- | --- |
| `running` | `[0, 0, 255]` | 蓝色呼吸灯 | 任务正在运行 |
| `success` | `[0, 255, 0]` | 绿色呼吸灯 | 任务成功 |
| `error` | `[255, 0, 0]` | 红色较快呼吸灯 | 任务失败或异常 |
| `review` | `[255, 160, 0]` | 黄色或橙黄色呼吸灯 | 等待审核 |
| `finish` | `[255, 255, 255]` | 白色慢速呼吸灯 | 任务完成 |
| `off` | - | 关闭灯光 | 关闭灯光 |

如果要调整颜色或效果，修改 `scripts/wled-profiles.json` 中对应 profile 的 `payload` 即可。

呼吸灯使用 WLED effect `fx: 2`，`sx` 控制速度，`ix` 控制强度。例如蓝色呼吸灯：

```json
"running": {
  "payload": {
    "on": true,
    "bri": 160,
    "seg": [
      {
        "fx": 2,
        "sx": 128,
        "ix": 128,
        "col": [[0, 0, 255]]
      }
    ]
  }
}
```

## 项目结构

```text
.
├── .codex
│   ├── hooks
│   │   └── post-tool-use.mjs
│   └── skills
│       └── wled
│           └── SKILL.md
├── dist
│   ├── wled.mjs
│   └── wled-server.mjs
├── package.json
├── pnpm-lock.yaml
├── scripts
│   └── wled-profiles.json
└── src
    ├── cli.ts
    ├── config.ts
    ├── server.ts
    └── wled.ts
```

## 当前问题

- `scripts/wled-profiles.json` 直接记录本机串口路径；换设备或换机器后通常需要修改。
- `defaults.ledRange.stop` 默认是 `null`，表示不限制灯珠数量；如果只想点亮部分灯珠，需要明确设置。

## 排查建议

- 先用 `pnpm wled:ports` 确认串口路径。
- 确认 `scripts/wled-profiles.json` 中的 `port` 与实际串口一致。
- 如果命令执行成功但灯光无变化，优先检查串口权限、波特率和 WLED 串口 JSON 支持状态。
