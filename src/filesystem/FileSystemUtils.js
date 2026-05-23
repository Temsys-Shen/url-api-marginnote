function MNURLToArray(nativeArray) {
  if (!nativeArray) {
    return [];
  }

  if (Array.isArray(nativeArray)) {
    return nativeArray;
  }

  if (nativeArray.count && nativeArray.objectAtIndex) {
    var result = [];
    for (var i = 0; i < nativeArray.count(); i++) {
      result.push(nativeArray.objectAtIndex(i));
    }
    return result;
  }

  return [];
}

function MNURLGetDatabase() {
  return Database.sharedInstance();
}

function MNURLGetApplication() {
  return Application.sharedInstance();
}

function MNURLRefreshNotebook(topicId) {
  MNURLGetApplication().refreshAfterDBChanged(topicId);
}

function MNURLWithUndo(title, topicId, block) {
  UndoManager.sharedInstance().undoGrouping(title, topicId, block);
  MNURLRefreshNotebook(topicId);
}

function MNURLGetNoteTitle(note) {
  return note && note.noteTitle ? String(note.noteTitle) : "[Untitled]";
}

function MNURLStringValue(value) {
  return value === undefined || value === null ? "" : String(value);
}
