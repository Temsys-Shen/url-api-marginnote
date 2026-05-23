# URL API网关

这是一个MarginNote4插件，用 `marginnote4app://addon/api?...`暴露URL API。当前实现覆盖网关认证、标准回调、权限组、防重放，以及MarginNote笔记对象的读写删动作。

## 开发命令

```bash
pnpm install
pnpm dev
pnpm live
pnpm live:stop
pnpm build
```

轻量测试：

```bash
pnpm test:gateway
pnpm test:urlscheme -- --secret mnsec_xxx --action ping
```

## 公开协议

入口固定为：

```text
marginnote4app://addon/api?requestId=...&action=...&secret=...&x-success=...&x-error=...&payload=...
```

请求控制字段：

- `requestId`：调用方生成的唯一请求ID，参与防重放
- `action`：`ping/read/ls/find/tree/write/delete`
- `secret`：管理面板生成的Secret
- `x-success`：成功回调URL
- `x-error`：错误回调URL
- `payload`：`urlencode(JSON.stringify(payload))`

`callbackSuccess/callbackError`仍可兼容旧客户端，但推荐使用标准 `x-success/x-error`。`payload.callbacks`不再作为主协议。

响应会追加到回调URL的 `payload`参数：

```json
{
  "code": "OK",
  "message": "OK",
  "requestId": "req_001",
  "data": {},
  "details": null
}
```

错误码包括 `BAD_REQUEST`、`AUTH_FAILED`、`FORBIDDEN`、`NOT_FOUND`、`REPLAY_DETECTED`、`INTERNAL_ERROR`。

## 认证与权限

工具栏按钮会打开Secret管理面板。生成Secret时会展示并复制：

```text
secret=mnsec_xxx
```

权限组可叠加，最终权限按并集计算：

- 空权限：不允许调用任何action
- 只读权限：`ping/read/ls/find/tree`
- 写入权限：只读权限加 `write`
- 管理权限：写入权限加 `delete`
- 全部权限：通配全部action，便于本地测试

## 路径模型

当前路径语义对齐MarginNote自带 `MNFileSystem.js`：

- `notebook://`：全部笔记本根
- `notebook://笔记本名/卡片名`：按标题路径定位
- `@id:noteId`：按笔记ID定位
- `@current`：当前学习窗口中的聚焦笔记或当前笔记本
- `@root`：根路径

## Actions

### ping

无需payload，返回版本、时间和 `ok:true`。

### ls

```json
{
  "path": "notebook://",
  "depth": 1,
  "type": "all"
}
```

`type`可为 `all/notebook/note`。

### read

```json
{
  "path": "@id:noteId"
}
```

返回笔记本或笔记详情，笔记详情包含标题、正文、评论、子节点、父节点和路径。

### find

```json
{
  "pattern": "关键词",
  "scope": "notebook://笔记本名",
  "type": "note"
}
```

`type`可为 `all/notebook/note`。

### tree

```json
{
  "path": "notebook://笔记本名",
  "depth": 3
}
```

返回树文本和结构化节点。

### write

创建：

```json
{
  "mode": "create",
  "path": "notebook://笔记本名",
  "title": "新卡片",
  "content": "正文"
}
```

更新：

```json
{
  "mode": "update",
  "path": "@id:noteId",
  "title": "新标题",
  "content": "新正文"
}
```

追加评论：

```json
{
  "mode": "append",
  "path": "@id:noteId",
  "content": "追加内容",
  "markdown": true
}
```

移动：

```json
{
  "mode": "move",
  "path": "@id:noteId",
  "dstPath": "notebook://笔记本名/目标父卡片"
}
```

### delete

```json
{
  "path": "@id:noteId",
  "recursive": false,
  "force": false
}
```

默认不删除有子节点的笔记。`recursive:true`会调用 `deleteBookNoteTree`删除整棵子树。

## 本地URLScheme测试

示例：

```bash
pnpm test:urlscheme -- --secret mnsec_xxx --action ping
pnpm test:urlscheme -- --secret mnsec_xxx --action ls --payload '{"path":"notebook://"}'
pnpm test:urlscheme -- --secret mnsec_xxx --action read --payload '{"path":"@current"}'
```

脚本会启动本地HTTP回调服务，自动打开MarginNote URLScheme，收到回调后打印解码后的响应JSON。
