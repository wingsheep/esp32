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

## 配置

配置文件位于 `scripts/wled-config.json`：

```json
{
  "port": "/dev/cu.usbserial-0001",
  "baudRate": 115200,
  "ledRange": {
    "start": 0,
    "stop": null
  },
  "presets": {
    "running": 1,
    "success": 2,
    "error": 3,
    "review": 4,
    "finish": 5
  },
  "states": {
    "running": {
      "color": [0, 0, 255]
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
- `ledRange`：灯珠控制范围。
- `ledRange.start`：起始灯珠索引，从 `0` 开始。
- `ledRange.stop`：结束灯珠索引，不包含该位置；设为 `null` 表示不限制结束位置。
- `presets`：历史保留字段，记录任务状态与 WLED 预设编号的映射；当前脚本不依赖该字段。
- `states`：当前实际使用的灯光状态配置。
- `states.*.color`：RGB 颜色，格式为 `[红, 绿, 蓝]`，取值范围为 `0-255`。

例如只控制前 10 颗灯：

```json
"ledRange": {
  "start": 0,
  "stop": 10
}
```

如果不确定串口路径，先运行：

```bash
pnpm ports
```

## 可用命令

```bash
pnpm wled:running
pnpm wled:success
pnpm wled:error
pnpm wled:review
pnpm wled:finish
pnpm wled:off
pnpm ports
```

命令含义：

- `wled:running`：切换到运行中灯光。
- `wled:success`：切换到成功灯光。
- `wled:error`：切换到错误灯光。
- `wled:review`：切换到审核灯光。
- `wled:finish`：切换到完成灯光。
- `wled:off`：关闭灯光。
- `ports`：列出本机可用串口。

## 灯光说明

当前脚本直接通过串口发送 RGB 颜色，不依赖 WLED 设备内保存的预设。

| 状态 | 颜色值 | 灯光 |
| --- | ---: | --- |
| `running` | `[0, 0, 255]` | 蓝色，表示任务正在运行 |
| `success` | `[0, 255, 0]` | 绿色，表示任务成功 |
| `error` | `[255, 0, 0]` | 红色，表示任务失败或异常 |
| `review` | `[255, 160, 0]` | 黄色或橙黄色，表示等待审核 |
| `finish` | `[255, 255, 255]` | 白色，表示任务完成 |
| `off` | - | 关闭灯光 |

如果要调整颜色，修改 `scripts/wled-config.json` 中对应状态的 `color` 即可。

## 项目结构

```text
.
├── package.json
├── pnpm-lock.yaml
└── scripts
    ├── wled-config.json
    ├── wled-hook.js
    ├── wled-off.js
    └── wled-ports.js
```

## 当前问题

- `package.json` 的 `test` 命令固定失败；如果暂时不需要测试，建议改成占位成功命令或删除。
- `scripts/wled-config.json` 直接记录本机串口路径；换设备或换机器后通常需要修改。
- `ledRange.stop` 默认是 `null`，表示不限制灯珠数量；如果只想点亮部分灯珠，需要明确设置。
- `presets` 字段当前只是历史保留；如果确认不再使用 WLED 预设，可以删除。
- 脚本对未知状态直接静默退出，排查命令拼写错误时不够直观。

## 排查建议

- 先用 `pnpm ports` 确认串口路径。
- 确认 `scripts/wled-config.json` 中的 `port` 与实际串口一致。
- 如果命令执行成功但灯光无变化，优先检查串口权限、波特率和 WLED 串口 JSON 支持状态。
