function MNURLSerializeNotebook(notebook) {
  return {
    type: "notebook",
    id: MNURLStringValue(notebook.topicId),
    name: MNURLStringValue(notebook.title),
    path: "notebook://" + MNURLStringValue(notebook.title),
    noteCount: MNURLToArray(notebook.notes).length,
  };
}

function MNURLSerializeNoteSummary(note, notebook, depth) {
  var children = MNURLToArray(note.childNotes);
  var summary = {
    type: "note",
    id: MNURLStringValue(note.noteId),
    name: MNURLGetNoteTitle(note),
    path: MNURLBuildNotePath(note, notebook),
    hasChildren: children.length > 0,
    childCount: children.length,
    colorIndex: note.colorIndex,
    fillIndex: note.fillIndex,
  };

  if (depth && depth > 1) {
    summary.children = MNURLSerializeNoteSummaryList(children, notebook, depth - 1);
  }

  return summary;
}

function MNURLSerializeNoteSummaryList(notes, notebook, depth) {
  var result = [];
  for (var i = 0; i < notes.length; i++) {
    result.push(MNURLSerializeNoteSummary(notes[i], notebook, depth));
  }
  return result;
}

function MNURLSerializeNoteDetail(note, notebook) {
  return {
    type: "note",
    id: MNURLStringValue(note.noteId),
    title: MNURLStringValue(note.noteTitle),
    content: MNURLStringValue(note.excerptText),
    notesText: MNURLStringValue(note.notesText),
    allText: note.allNoteText ? MNURLStringValue(note.allNoteText()) : "",
    comments: MNURLSerializeComments(note),
    colorIndex: note.colorIndex,
    fillIndex: note.fillIndex,
    docMd5: MNURLStringValue(note.docMd5),
    notebookId: MNURLStringValue(note.notebookId),
    parentId: note.parentNote ? MNURLStringValue(note.parentNote.noteId) : null,
    children: MNURLSerializeChildIds(note),
    path: MNURLBuildNotePath(note, notebook),
  };
}

function MNURLSerializeComments(note) {
  var comments = MNURLToArray(note.comments);
  var result = [];
  for (var i = 0; i < comments.length; i++) {
    var comment = comments[i];
    result.push({
      index: i,
      type: MNURLStringValue(comment.type || "text"),
      text: MNURLStringValue(comment.text),
      html: MNURLStringValue(comment.html),
      markdown: comment.markdown === true,
    });
  }
  return result;
}

function MNURLSerializeChildIds(note) {
  var children = MNURLToArray(note.childNotes);
  var result = [];
  for (var i = 0; i < children.length; i++) {
    result.push(MNURLStringValue(children[i].noteId));
  }
  return result;
}
