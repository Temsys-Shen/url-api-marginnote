function MNURLListFileSystem(payload) {
  var target = MNURLResolvePath(payload.path || "notebook://");
  var depth = MNURLNormalizeDepth(payload.depth, 1);
  var type = payload.type || "all";

  if (target.type === "root") {
    return {
      path: "notebook://",
      items: MNURLListRootItems(type),
    };
  }

  if (target.type === "notebook") {
    return {
      path: target.path,
      notebook: MNURLSerializeNotebook(target.notebook),
      items: MNURLListNotebookItems(target.notebook, depth, type),
    };
  }

  return {
    path: target.path,
    item: MNURLSerializeNoteSummary(target.note, target.notebook, depth),
    items: MNURLSerializeNoteSummaryList(
      MNURLToArray(target.note.childNotes),
      target.notebook,
      depth,
    ),
  };
}

function MNURLReadFileSystem(payload) {
  var target = MNURLResolvePath(MNURLRequirePayloadString(payload, "path"));

  if (target.type === "root") {
    return {
      path: target.path,
      type: "root",
      notebooks: MNURLListRootItems("notebook"),
    };
  }

  if (target.type === "notebook") {
    return {
      path: target.path,
      type: "notebook",
      notebook: MNURLSerializeNotebook(target.notebook),
      notes: MNURLListNotebookItems(target.notebook, 1, "note"),
    };
  }

  return MNURLSerializeNoteDetail(target.note, target.notebook);
}

function MNURLFindFileSystem(payload) {
  var pattern = MNURLRequirePayloadString(payload, "pattern").toLowerCase();
  var scope = payload.scope || "notebook://";
  var type = payload.type || "note";
  var target = MNURLResolvePath(scope);
  var results = [];

  if (type === "all" || type === "notebook") {
    MNURLFindNotebooks(pattern, target, results);
  }

  if (type === "all" || type === "note") {
    MNURLFindNotes(pattern, target, results);
  }

  return {
    pattern: payload.pattern,
    scope: scope,
    type: type,
    items: results,
  };
}

function MNURLBuildFileSystemTree(payload) {
  var target = MNURLResolvePath(payload.path || "notebook://");
  var depth = MNURLNormalizeDepth(payload.depth, 3);
  var node = MNURLBuildTreeNode(target, depth);

  return {
    path: target.path,
    text: MNURLRenderTreeText(node, 0).join("\n"),
    tree: node,
  };
}

function MNURLWriteFileSystem(payload) {
  var mode = MNURLRequirePayloadString(payload, "mode");

  if (mode === "create") {
    return MNURLCreateNoteFromPayload(payload);
  }

  if (mode === "update") {
    return MNURLUpdateNoteFromPayload(payload);
  }

  if (mode === "append") {
    return MNURLAppendNoteFromPayload(payload);
  }

  if (mode === "move") {
    return MNURLMoveNoteFromPayload(payload);
  }

  throw MNURLBadRequest("Unsupported write mode", {
    mode: mode,
  });
}

function MNURLDeleteFileSystem(payload) {
  var target = MNURLResolvePath(MNURLRequirePayloadString(payload, "path"));
  if (target.type !== "note") {
    throw MNURLBadRequest("Delete only supports note paths", {
      path: payload.path,
      type: target.type,
    });
  }

  var recursive = payload.recursive === true;
  var force = payload.force === true;
  var childCount = MNURLToArray(target.note.childNotes).length;
  if (childCount > 0 && !recursive && !force) {
    throw MNURLBadRequest("Cannot delete note with children without recursive or force", {
      path: payload.path,
      childCount: childCount,
    });
  }

  var noteId = MNURLStringValue(target.note.noteId);
  var notebookId = MNURLStringValue(target.note.notebookId);
  MNURLWithUndo("URL API delete note", notebookId, function () {
    if (recursive) {
      MNURLGetDatabase().deleteBookNoteTree(noteId);
      return;
    }

    MNURLGetDatabase().deleteBookNote(noteId);
  });

  return {
    deleted: true,
    recursive: recursive,
    force: force,
    id: noteId,
    path: payload.path,
  };
}

function MNURLListRootItems(type) {
  var notebooks = MNURLToArray(MNURLGetDatabase().allNotebooks());
  var result = [];

  if (type !== "all" && type !== "notebook") {
    return result;
  }

  for (var i = 0; i < notebooks.length; i++) {
    result.push(MNURLSerializeNotebook(notebooks[i]));
  }

  return result;
}

function MNURLListNotebookItems(notebook, depth, type) {
  if (type !== "all" && type !== "note") {
    return [];
  }

  return MNURLSerializeNoteSummaryList(
    MNURLGetRootNotes(notebook),
    notebook,
    depth,
  );
}

function MNURLFindNotebooks(pattern, target, results) {
  var notebooks = target.type === "root"
    ? MNURLToArray(MNURLGetDatabase().allNotebooks())
    : [target.notebook];

  for (var i = 0; i < notebooks.length; i++) {
    if (String(notebooks[i].title).toLowerCase().indexOf(pattern) >= 0) {
      results.push(MNURLSerializeNotebook(notebooks[i]));
    }
  }
}

function MNURLFindNotes(pattern, target, results) {
  var roots = [];
  if (target.type === "root") {
    var notebooks = MNURLToArray(MNURLGetDatabase().allNotebooks());
    for (var i = 0; i < notebooks.length; i++) {
      MNURLFindNotesInList(MNURLGetRootNotes(notebooks[i]), notebooks[i], pattern, results);
    }
    return;
  }

  if (target.type === "notebook") {
    roots = MNURLGetRootNotes(target.notebook);
  } else {
    roots = [target.note];
  }

  MNURLFindNotesInList(roots, target.notebook, pattern, results);
}

function MNURLFindNotesInList(notes, notebook, pattern, results) {
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    var title = MNURLGetNoteTitle(note).toLowerCase();
    var content = MNURLStringValue(note.excerptText).toLowerCase();
    if (title.indexOf(pattern) >= 0 || content.indexOf(pattern) >= 0) {
      results.push(MNURLSerializeNoteSummary(note, notebook, 1));
    }

    MNURLFindNotesInList(MNURLToArray(note.childNotes), notebook, pattern, results);
  }
}

function MNURLBuildTreeNode(target, depth) {
  if (target.type === "root") {
    return {
      type: "root",
      name: "notebook://",
      path: "notebook://",
      children: MNURLBuildNotebookTreeNodes(MNURLToArray(MNURLGetDatabase().allNotebooks()), depth),
    };
  }

  if (target.type === "notebook") {
    return MNURLBuildNotebookTreeNode(target.notebook, depth);
  }

  return MNURLBuildNoteTreeNode(target.note, target.notebook, depth);
}

function MNURLBuildNotebookTreeNodes(notebooks, depth) {
  var nodes = [];
  for (var i = 0; i < notebooks.length; i++) {
    nodes.push(MNURLBuildNotebookTreeNode(notebooks[i], depth));
  }
  return nodes;
}

function MNURLBuildNotebookTreeNode(notebook, depth) {
  return {
    type: "notebook",
    id: MNURLStringValue(notebook.topicId),
    name: MNURLStringValue(notebook.title),
    path: "notebook://" + MNURLStringValue(notebook.title),
    children: depth > 0
      ? MNURLBuildNoteTreeNodes(MNURLGetRootNotes(notebook), notebook, depth - 1)
      : [],
  };
}

function MNURLBuildNoteTreeNodes(notes, notebook, depth) {
  var nodes = [];
  for (var i = 0; i < notes.length; i++) {
    nodes.push(MNURLBuildNoteTreeNode(notes[i], notebook, depth));
  }
  return nodes;
}

function MNURLBuildNoteTreeNode(note, notebook, depth) {
  return {
    type: "note",
    id: MNURLStringValue(note.noteId),
    name: MNURLGetNoteTitle(note),
    path: MNURLBuildNotePath(note, notebook),
    children: depth > 0
      ? MNURLBuildNoteTreeNodes(MNURLToArray(note.childNotes), notebook, depth - 1)
      : [],
  };
}

function MNURLRenderTreeText(node, indent) {
  var lines = [];
  var prefix = "";
  for (var i = 0; i < indent; i++) {
    prefix += "  ";
  }

  lines.push(prefix + "- " + node.name + " [" + node.type + "]");

  var children = node.children || [];
  for (var j = 0; j < children.length; j++) {
    lines = lines.concat(MNURLRenderTreeText(children[j], indent + 1));
  }

  return lines;
}

function MNURLCreateNoteFromPayload(payload) {
  var parentPath = payload.parentPath || payload.path;
  var parentTarget = MNURLResolvePath(parentPath || "notebook://");
  if (parentTarget.type === "root") {
    throw MNURLBadRequest("Create requires a notebook or note parent", {
      parentPath: parentPath,
    });
  }

  var title = MNURLRequirePayloadString(payload, "title");
  var notebook = parentTarget.notebook;
  var createdNote = null;

  MNURLWithUndo("URL API create note", notebook.topicId, function () {
    createdNote = MNURLGetDatabase().createNoteWithTitleTopicid(title, notebook.topicId);
    MNURLApplyWritableNoteFields(createdNote, payload);

    if (parentTarget.type === "note") {
      parentTarget.note.addChild(createdNote);
    }
  });

  return {
    created: true,
    note: MNURLSerializeNoteDetail(createdNote, notebook),
  };
}

function MNURLUpdateNoteFromPayload(payload) {
  var target = MNURLRequireNoteTarget(payload.path);
  MNURLWithUndo("URL API update note", target.note.notebookId, function () {
    MNURLApplyWritableNoteFields(target.note, payload);
  });

  return {
    updated: true,
    note: MNURLSerializeNoteDetail(target.note, target.notebook),
  };
}

function MNURLAppendNoteFromPayload(payload) {
  var target = MNURLRequireNoteTarget(payload.path);
  var content = MNURLRequirePayloadString(payload, "content");

  MNURLWithUndo("URL API append note", target.note.notebookId, function () {
    if (payload.markdown === true) {
      target.note.appendMarkdownComment(content);
      return;
    }

    target.note.appendTextComment(content);
  });

  return {
    appended: true,
    note: MNURLSerializeNoteDetail(target.note, target.notebook),
  };
}

function MNURLMoveNoteFromPayload(payload) {
  var target = MNURLRequireNoteTarget(payload.path);
  var destination = MNURLResolvePath(MNURLRequirePayloadString(payload, "dstPath"));
  if (destination.type === "root") {
    throw MNURLBadRequest("Move destination must be a notebook or note", {
      dstPath: payload.dstPath,
    });
  }

  MNURLWithUndo("URL API move note", target.note.notebookId, function () {
    target.note.removeFromParent();
    if (destination.type === "note") {
      destination.note.addChild(target.note);
    }
  });

  return {
    moved: true,
    note: MNURLSerializeNoteDetail(target.note, destination.notebook),
  };
}

function MNURLRequireNoteTarget(path) {
  var target = MNURLResolvePath(MNURLRequirePayloadString({ path: path }, "path"));
  if (target.type !== "note") {
    throw MNURLBadRequest("Path must resolve to a note", {
      path: path,
      type: target.type,
    });
  }

  return target;
}

function MNURLApplyWritableNoteFields(note, payload) {
  if (payload.title !== undefined) {
    note.noteTitle = String(payload.title);
  }

  if (payload.content !== undefined) {
    note.excerptText = String(payload.content);
  }

  if (payload.colorIndex !== undefined) {
    note.colorIndex = payload.colorIndex;
  }

  if (payload.fillIndex !== undefined) {
    note.fillIndex = payload.fillIndex;
  }
}

function MNURLRequirePayloadString(payload, field) {
  var value = payload ? payload[field] : undefined;
  if (value === undefined || value === null || value === "") {
    throw MNURLBadRequest("Missing required payload field", {
      field: field,
    });
  }

  return String(value);
}

function MNURLNormalizeDepth(value, defaultDepth) {
  if (value === undefined || value === null || value === "") {
    return defaultDepth;
  }

  var depth = Number(value);
  if (!isFinite(depth) || depth < 0) {
    throw MNURLBadRequest("Invalid depth", {
      depth: value,
    });
  }

  return Math.floor(depth);
}
