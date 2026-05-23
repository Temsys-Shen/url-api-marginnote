function MNURLResolvePath(path) {
  var targetPath = path || "notebook://";

  if (targetPath === "@root" || targetPath === "notebook://") {
    return {
      type: "root",
      notebook: null,
      note: null,
      path: "notebook://",
    };
  }

  if (targetPath === "@current") {
    return MNURLResolveCurrentPath();
  }

  if (targetPath.indexOf("@id:") === 0) {
    return MNURLResolvePathById(targetPath.slice(4), targetPath);
  }

  if (targetPath.indexOf("notebook://") === 0) {
    return MNURLResolveNotebookPath(targetPath);
  }

  throw MNURLBadRequest("Unsupported path", {
    path: targetPath,
  });
}

function MNURLResolveCurrentPath() {
  var app = MNURLGetApplication();
  var studyController = app.studyController(app.focusWindow);
  if (!studyController || !studyController.notebookController) {
    throw MNURLBadRequest("No active study controller for @current", {
      path: "@current",
    });
  }

  var notebookController = studyController.notebookController;
  var note = notebookController.focusNote || notebookController.visibleFocusNote;
  var notebookId = note ? note.notebookId : notebookController.notebookId;
  var notebook = notebookId ? MNURLGetDatabase().getNotebookById(notebookId) : null;

  if (note) {
    return {
      type: "note",
      notebook: notebook,
      note: note,
      path: MNURLBuildNotePath(note, notebook),
    };
  }

  if (notebook) {
    return {
      type: "notebook",
      notebook: notebook,
      note: null,
      path: "notebook://" + notebook.title,
    };
  }

  throw MNURLBadRequest("No current notebook or note", {
    path: "@current",
  });
}

function MNURLResolvePathById(id, originalPath) {
  var db = MNURLGetDatabase();
  var note = db.getNoteById(id);
  if (note) {
    return {
      type: "note",
      notebook: db.getNotebookById(note.notebookId),
      note: note,
      path: originalPath,
    };
  }

  var notebook = db.getNotebookById(id);
  if (notebook) {
    return {
      type: "notebook",
      notebook: notebook,
      note: null,
      path: "notebook://" + notebook.title,
    };
  }

  throw MNURLNotFound("Path not found", {
    path: originalPath,
  });
}

function MNURLResolveNotebookPath(path) {
  var rest = path.slice("notebook://".length);
  if (!rest) {
    return {
      type: "root",
      notebook: null,
      note: null,
      path: "notebook://",
    };
  }

  var parts = rest.split("/").filter(function (part) {
    return part !== "";
  });
  var notebook = MNURLFindNotebookByTitle(parts[0]);
  if (!notebook) {
    throw MNURLNotFound("Notebook not found", {
      path: path,
      title: parts[0],
    });
  }

  if (parts.length === 1) {
    return {
      type: "notebook",
      notebook: notebook,
      note: null,
      path: "notebook://" + notebook.title,
    };
  }

  var currentNote = null;
  for (var i = 1; i < parts.length; i++) {
    var children = currentNote
      ? MNURLToArray(currentNote.childNotes)
      : MNURLGetRootNotes(notebook);
    currentNote = MNURLFindChildNoteByTitle(children, parts[i]);

    if (!currentNote) {
      throw MNURLNotFound("Note path not found", {
        path: path,
        title: parts[i],
      });
    }
  }

  return {
    type: "note",
    notebook: notebook,
    note: currentNote,
    path: MNURLBuildNotePath(currentNote, notebook),
  };
}

function MNURLFindNotebookByTitle(title) {
  var notebooks = MNURLToArray(MNURLGetDatabase().allNotebooks());
  for (var i = 0; i < notebooks.length; i++) {
    if (String(notebooks[i].title) === String(title)) {
      return notebooks[i];
    }
  }
  return null;
}

function MNURLFindChildNoteByTitle(notes, title) {
  for (var i = 0; i < notes.length; i++) {
    if (MNURLGetNoteTitle(notes[i]) === String(title)) {
      return notes[i];
    }
  }
  return null;
}

function MNURLGetRootNotes(notebook) {
  var notes = MNURLToArray(notebook ? notebook.notes : []);
  var roots = [];
  for (var i = 0; i < notes.length; i++) {
    if (!notes[i].parentNote) {
      roots.push(notes[i]);
    }
  }
  return roots;
}

function MNURLBuildNotePath(note, notebook) {
  if (!note) {
    return notebook ? "notebook://" + notebook.title : "notebook://";
  }

  var parts = [];
  var current = note;
  while (current) {
    parts.unshift(MNURLGetNoteTitle(current));
    current = current.parentNote;
  }

  var targetNotebook = notebook || MNURLGetDatabase().getNotebookById(note.notebookId);
  if (targetNotebook) {
    parts.unshift(targetNotebook.title);
  }

  return "notebook://" + parts.join("/");
}
