const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const files = [
  "src/gateway/GatewayProtocol.js",
  "src/gateway/GatewayErrors.js",
  "src/gateway/GatewayResponse.js",
  "src/gateway/GatewayRequestParser.js",
  "src/gateway/CallbackResolver.js",
  "src/security/PermissionGroups.js",
  "src/security/SecretStore.js",
  "src/security/ReplayGuard.js",
  "src/security/AuthPolicy.js",
  "src/filesystem/FileSystemUtils.js",
  "src/filesystem/PathResolver.js",
  "src/filesystem/NoteSerializer.js",
  "src/filesystem/FileSystemService.js",
  "src/actions/PingAction.js",
  "src/actions/ReadAction.js",
  "src/actions/LsAction.js",
  "src/actions/FindAction.js",
  "src/actions/TreeAction.js",
  "src/actions/WriteAction.js",
  "src/actions/DeleteAction.js",
  "src/gateway/GatewayRouter.js",
];

const defaultsStore = {};
const fixture = createFixture();
let uuidCounter = 1;
const context = {
  console,
  Date,
  Math,
  JSON,
  Number,
  isFinite,
  NSUserDefaults: {
    standardUserDefaults() {
      return {
        stringForKey(key) {
          return defaultsStore[key] || "";
        },
        setObjectForKey(value, key) {
          defaultsStore[key] = value;
        },
        synchronize() {},
      };
    },
  },
  NSUUID: {
    UUID() {
      return {
        UUIDString() {
          const suffix = String(uuidCounter++).padStart(12, "0");
          return "00000000-0000-4000-8000-" + suffix;
        },
      };
    },
  },
  Database: {
    sharedInstance() {
      return fixture.db;
    },
  },
  Application: {
    sharedInstance() {
      return fixture.app;
    },
  },
  UndoManager: {
    sharedInstance() {
      return fixture.undoManager;
    },
  },
};

vm.createContext(context);

for (const file of files) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

const fullSecret = "mnsec_full";
const readSecret = "mnsec_read";
const writeSecret = "mnsec_write";
const adminSecret = "mnsec_admin";
const emptySecret = "mnsec_empty";

defaultsStore[context.MNURLSecretStoreDefaultsKey] = JSON.stringify([
  secretRecord("secret_full", fullSecret, [context.MNURLPermissionGroupIds.ALL]),
  secretRecord("secret_read", readSecret, [context.MNURLPermissionGroupIds.READ]),
  secretRecord("secret_write", writeSecret, [context.MNURLPermissionGroupIds.WRITE]),
  secretRecord("secret_admin", adminSecret, [context.MNURLPermissionGroupIds.ADMIN]),
  secretRecord("secret_empty", emptySecret, [context.MNURLPermissionGroupIds.EMPTY]),
]);

const storeForMutation = context.MNURLCreateSecretStore();
defaultsStore[context.MNURLSecretStoreDefaultsKey] = JSON.stringify([]);
const createdNoteA = storeForMutation.createSecret([context.MNURLPermissionGroupIds.READ]);
const createdNoteB = storeForMutation.createSecret([context.MNURLPermissionGroupIds.READ]);
const createdNoteC = storeForMutation.createSecret([context.MNURLPermissionGroupIds.READ]);
assert.strictEqual(createdNoteA.note, "secret");
assert.strictEqual(createdNoteB.note, "secret1");
assert.strictEqual(createdNoteC.note, "secret2");
storeForMutation.updateSecret(createdNoteC.id, { note: "secret" });
assert.strictEqual(findStoredSecretById(createdNoteC.id).note, "secret2");
storeForMutation.updateSecret(createdNoteC.id, { note: "" });
assert.strictEqual(findStoredSecretById(createdNoteC.id).note, "secret2");
storeForMutation.deleteSecret(createdNoteA.id);
storeForMutation.deleteSecret(createdNoteB.id);
storeForMutation.deleteSecret(createdNoteC.id);

defaultsStore[context.MNURLSecretStoreDefaultsKey] = JSON.stringify([
  secretRecord("legacy_a", "mnsec_legacy_a", [context.MNURLPermissionGroupIds.READ]),
  secretRecord("legacy_b", "mnsec_legacy_b", [context.MNURLPermissionGroupIds.READ]),
]);
const normalizedLegacySecrets = storeForMutation.listSecrets();
assert.strictEqual(normalizedLegacySecrets[0].note, "secret");
assert.strictEqual(normalizedLegacySecrets[1].note, "secret1");

defaultsStore[context.MNURLSecretStoreDefaultsKey] = JSON.stringify([
  secretRecord("secret_full", fullSecret, [context.MNURLPermissionGroupIds.ALL], "secret"),
  secretRecord("secret_read", readSecret, [context.MNURLPermissionGroupIds.READ], "secret1"),
  secretRecord("secret_write", writeSecret, [context.MNURLPermissionGroupIds.WRITE], "secret2"),
  secretRecord("secret_admin", adminSecret, [context.MNURLPermissionGroupIds.ADMIN], "secret3"),
  secretRecord("secret_empty", emptySecret, [context.MNURLPermissionGroupIds.EMPTY], "secret4"),
]);

const createdForMutation = storeForMutation.createSecret([context.MNURLPermissionGroupIds.READ]);
storeForMutation.updateSecret(createdForMutation.id, {
  note: "local test note",
  groupIds: [context.MNURLPermissionGroupIds.WRITE],
});
const updatedForMutation = storeForMutation.findSecret(createdForMutation.secret);
assert.strictEqual(updatedForMutation.note, "local test note");
assertJsonEqual(updatedForMutation.groupIds, [context.MNURLPermissionGroupIds.WRITE]);
storeForMutation.deleteSecret(createdForMutation.id);
assert.strictEqual(storeForMutation.findSecret(createdForMutation.secret), null);

function secretRecord(id, secret, groupIds, note) {
  return {
    id,
    secret,
    name: id,
    note: note || "",
    groupIds,
    enabled: true,
    createdAt: "2026-05-18T00:00:00.000Z",
  };
}

function findStoredSecretById(id) {
  const records = context.MNURLCreateSecretStore().listSecrets();
  return records.find((record) => record.id === id) || null;
}

function buildUrl(options) {
  const params = {
    requestId: options.requestId === undefined
      ? "req_" + Math.random().toString(16).slice(2)
      : options.requestId,
    action: options.action || "ping",
    secret: options.secret === undefined ? fullSecret : options.secret,
    "x-success": options.success === undefined ? "myapp://success" : options.success,
    "x-error": options.error === undefined ? "myapp://error" : options.error,
  };

  if (options.payload !== undefined) {
    params.payload = JSON.stringify(options.payload);
  }

  return "marginnote4app://addon/api?" + Object.keys(params)
    .filter((key) => params[key] !== null)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
}

function parseAndPrepare(rawUrl) {
  const request = context.MNURLParseGatewayRequest(rawUrl);
  const callbacks = context.MNURLResolveGatewayCallbacks(request);
  context.MNURLRequireGatewayCallbacks(callbacks);
  return {
    request: context.MNURLPrepareGatewayRequest(request, callbacks),
    callbacks,
  };
}

function authenticateAndAuthorize(request) {
  const authPolicy = context.MNURLCreateAuthPolicy();
  const authentication = authPolicy.authenticate(request);
  if (!authentication.allowed) {
    throw context.MNURLAuthFailed("Authentication failed", authentication);
  }

  const authorization = authPolicy.authorize(request);
  if (!authorization.allowed) {
    throw context.MNURLForbidden("Authorization denied", authorization);
  }
}

function route(url) {
  const parsed = parseAndPrepare(url);
  authenticateAndAuthorize(parsed.request);
  return context.MNURLCreateGatewayRouter().route(parsed.request);
}

function expectGatewayError(fn, code) {
  try {
    fn();
  } catch (error) {
    assert.strictEqual(error.code, code);
    return error;
  }

  assert.fail("Expected gateway error " + code);
}

function assertJsonEqual(actual, expected) {
  assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected));
}

const pingResponse = route(buildUrl({ requestId: "req_ping" }));
assert.strictEqual(pingResponse.code, context.MNURLGatewayProtocol.ERROR_CODES.OK);
assert.strictEqual(pingResponse.requestId, "req_ping");
assert.strictEqual(pingResponse.data.ok, true);

const readResponse = route(buildUrl({
  requestId: "req_read",
  action: "read",
  secret: readSecret,
  payload: { path: "notebook://测试笔记本/第一张卡片" },
}));
assert.strictEqual(readResponse.data.title, "第一张卡片");
assert.strictEqual(readResponse.data.path, "notebook://测试笔记本/第一张卡片");

const lsResponse = route(buildUrl({
  requestId: "req_ls",
  action: "ls",
  secret: readSecret,
  payload: { path: "notebook://", type: "notebook" },
}));
assert.strictEqual(lsResponse.data.items[0].name, "测试笔记本");

const findResponse = route(buildUrl({
  requestId: "req_find",
  action: "find",
  secret: readSecret,
  payload: { pattern: "中文", scope: "notebook://测试笔记本", type: "note" },
}));
assert.strictEqual(findResponse.data.items.length, 1);

const treeResponse = route(buildUrl({
  requestId: "req_tree",
  action: "tree",
  secret: readSecret,
  payload: { path: "notebook://测试笔记本", depth: 2 },
}));
assert.strictEqual(treeResponse.data.tree.children.length, 1);
assert.ok(treeResponse.data.text.indexOf("第一张卡片") >= 0);

const writeResponse = route(buildUrl({
  requestId: "req_write",
  action: "write",
  secret: writeSecret,
  payload: {
    mode: "append",
    path: "@id:note_1",
    content: "追加评论",
  },
}));
assert.strictEqual(writeResponse.data.appended, true);
assert.strictEqual(fixture.notes.note_1.comments.length, 2);

const deleteResponse = route(buildUrl({
  requestId: "req_delete",
  action: "delete",
  secret: adminSecret,
  payload: {
    path: "@id:note_2",
  },
}));
assert.strictEqual(deleteResponse.data.deleted, true);
assert.strictEqual(fixture.notes.note_2.deleted, true);

expectGatewayError(
  () => context.MNURLParseGatewayRequest(buildUrl({ requestId: "", action: "ping" })),
  context.MNURLGatewayProtocol.ERROR_CODES.BAD_REQUEST,
);

expectGatewayError(
  () => context.MNURLParseGatewayRequest(buildUrl({ requestId: "missing_secret", action: "ping", secret: "" })),
  context.MNURLGatewayProtocol.ERROR_CODES.BAD_REQUEST,
);

expectGatewayError(
  () => parseAndPrepare(buildUrl({ requestId: "missing_success", action: "ping", success: "" })),
  context.MNURLGatewayProtocol.ERROR_CODES.BAD_REQUEST,
);

expectGatewayError(
  () => parseAndPrepare(buildUrl({ requestId: "missing_error", action: "ping", error: "" })),
  context.MNURLGatewayProtocol.ERROR_CODES.BAD_REQUEST,
);

expectGatewayError(
  () => authenticateAndAuthorize(parseAndPrepare(buildUrl({
    requestId: "wrong_secret",
    action: "ping",
    secret: "mnsec_wrong",
  })).request),
  context.MNURLGatewayProtocol.ERROR_CODES.AUTH_FAILED,
);

const replayUrl = buildUrl({ requestId: "req_replay", action: "ping" });
authenticateAndAuthorize(parseAndPrepare(replayUrl).request);
expectGatewayError(
  () => authenticateAndAuthorize(parseAndPrepare(replayUrl).request),
  context.MNURLGatewayProtocol.ERROR_CODES.REPLAY_DETECTED,
);

expectGatewayError(
  () => route(buildUrl({
    requestId: "read_cannot_write",
    action: "write",
    secret: readSecret,
    payload: { mode: "append", path: "@id:note_1", content: "no" },
  })),
  context.MNURLGatewayProtocol.ERROR_CODES.FORBIDDEN,
);

expectGatewayError(
  () => route(buildUrl({
    requestId: "write_cannot_delete",
    action: "delete",
    secret: writeSecret,
    payload: { path: "@id:note_1", force: true },
  })),
  context.MNURLGatewayProtocol.ERROR_CODES.FORBIDDEN,
);

expectGatewayError(
  () => route(buildUrl({
    requestId: "empty_cannot_ping",
    action: "ping",
    secret: emptySecret,
  })),
  context.MNURLGatewayProtocol.ERROR_CODES.FORBIDDEN,
);

expectGatewayError(
  () => context.MNURLParsePayload("%7Bbad"),
  context.MNURLGatewayProtocol.ERROR_CODES.BAD_REQUEST,
);

assertJsonEqual(
  context.MNURLResolvePath("notebook://测试笔记本").type,
  "notebook",
);
assertJsonEqual(
  context.MNURLResolvePath("@id:note_1").type,
  "note",
);
expectGatewayError(
  () => context.MNURLResolvePath("notebook://不存在"),
  context.MNURLGatewayProtocol.ERROR_CODES.NOT_FOUND,
);
expectGatewayError(
  () => context.MNURLWriteFileSystem({ mode: "create", path: "notebook://测试笔记本" }),
  context.MNURLGatewayProtocol.ERROR_CODES.BAD_REQUEST,
);

console.log("gateway tests passed");

function createFixture() {
  const notebooks = [];
  const notes = {};
  const notebook = {
    topicId: "nb_1",
    title: "测试笔记本",
    notes: [],
  };

  const note1 = createNote("note_1", "第一张卡片", "正文中文");
  const note2 = createNote("note_2", "子卡片", "子内容");
  note2.parentNote = note1;
  note1.childNotes.push(note2);
  notebook.notes.push(note1, note2);
  notebooks.push(notebook);
  notes.note_1 = note1;
  notes.note_2 = note2;

  const db = {
    allNotebooks() {
      return notebooks;
    },
    getNotebookById(id) {
      return notebooks.find((item) => item.topicId === id) || null;
    },
    getNoteById(id) {
      return notes[id] && !notes[id].deleted ? notes[id] : null;
    },
    createNoteWithTitleTopicid(title, topicId) {
      const created = createNote("note_created_" + Object.keys(notes).length, title, "");
      created.notebookId = topicId;
      notes[created.noteId] = created;
      notebook.notes.push(created);
      return created;
    },
    deleteBookNote(noteId) {
      if (notes[noteId]) {
        notes[noteId].deleted = true;
      }
    },
    deleteBookNoteTree(noteId) {
      markDeleted(notes[noteId]);
    },
  };

  for (const note of Object.values(notes)) {
    note.notebookId = notebook.topicId;
  }

  return {
    db,
    app: {
      refreshed: [],
      focusWindow: {},
      refreshAfterDBChanged(topicId) {
        this.refreshed.push(topicId);
      },
      studyController() {
        return {
          notebookController: {
            notebookId: notebook.topicId,
            focusNote: note1,
          },
        };
      },
    },
    undoManager: {
      undoGrouping(title, topicId, block) {
        block();
      },
    },
    notes,
  };

  function createNote(noteId, title, content) {
    const note = {
      noteId,
      noteTitle: title,
      excerptText: content,
      notesText: "",
      comments: [{ text: "评论", type: "text" }],
      childNotes: [],
      parentNote: null,
      colorIndex: 0,
      fillIndex: 0,
      notebookId: "",
      docMd5: "",
      allNoteText() {
        return [this.noteTitle, this.excerptText].join("\n");
      },
      appendTextComment(text) {
        this.comments.push({ text, type: "text" });
      },
      appendMarkdownComment(text) {
        this.comments.push({ text, type: "markdown", markdown: true });
      },
      removeFromParent() {
        if (!this.parentNote) {
          return;
        }
        this.parentNote.childNotes = this.parentNote.childNotes.filter((child) => child !== this);
        this.parentNote = null;
      },
      addChild(child) {
        child.parentNote = this;
        this.childNotes.push(child);
      },
    };
    return note;
  }

  function markDeleted(note) {
    if (!note) {
      return;
    }
    note.deleted = true;
    for (const child of note.childNotes) {
      markDeleted(child);
    }
  }
}
