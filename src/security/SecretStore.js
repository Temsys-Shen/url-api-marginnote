var MNURLSecretStoreDefaultsKey = "top.museday.urlapi.secrets.v1";
var MNURLHardcodedTestSecret = "mnsec_test_all_please_delete";

function MNURLCreateSecretStore() {
  return {
    listSecrets: function () {
      return MNURLReadSecretRecords();
    },
    createSecret: function (groupIds) {
      MNURLValidatePermissionGroupIds(groupIds);

      var records = MNURLReadSecretRecords();
      var secret = MNURLGenerateSecretValue();
      var record = {
        id: MNURLGenerateRecordId(),
        secret: secret,
        name: "Secret " + (records.length + 1),
        note: MNURLCreateUniqueSecretNote("secret", records, ""),
        groupIds: groupIds.slice(0),
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      records.push(record);
      MNURLWriteSecretRecords(records);
      return record;
    },
    findSecret: function (secret) {
      if (secret === MNURLHardcodedTestSecret) {
        return MNURLCreateHardcodedTestSecretRecord();
      }

      var records = MNURLReadSecretRecords();
      for (var i = 0; i < records.length; i++) {
        if (records[i].secret === secret) {
          return records[i];
        }
      }

      return null;
    },
    updateSecret: function (recordId, changes) {
      var records = MNURLReadSecretRecords();
      var updated = null;
      for (var i = 0; i < records.length; i++) {
        if (records[i].id === recordId) {
          updated = MNURLApplySecretChanges(records[i], changes, records);
          records[i] = updated;
          break;
        }
      }

      if (!updated) {
        throw MNURLNotFound("Secret not found", {
          id: recordId,
        });
      }

      MNURLWriteSecretRecords(records);
      return updated;
    },
    deleteSecret: function (recordId) {
      var records = MNURLReadSecretRecords();
      var nextRecords = [];
      var deleted = null;
      for (var i = 0; i < records.length; i++) {
        if (records[i].id === recordId) {
          deleted = records[i];
        } else {
          nextRecords.push(records[i]);
        }
      }

      if (!deleted) {
        throw MNURLNotFound("Secret not found", {
          id: recordId,
        });
      }

      MNURLWriteSecretRecords(nextRecords);
      return deleted;
    },
    clearSecrets: function () {
      MNURLWriteSecretRecords([]);
    },
  };
}

function MNURLReadSecretRecords() {
  var rawValue = NSUserDefaults
    .standardUserDefaults()
    .stringForKey(MNURLSecretStoreDefaultsKey);

  if (!rawValue) {
    return [];
  }

  try {
    var records = JSON.parse(String(rawValue));
    if (!Array.isArray(records)) {
      throw new Error("Stored secret value is not an array");
    }

    var normalized = MNURLNormalizeSecretRecords(records);
    if (normalized.changed) {
      MNURLWriteSecretRecords(normalized.records);
    }

    for (var i = 0; i < normalized.records.length; i++) {
      MNURLValidateSecretRecord(normalized.records[i], i);
    }

    return normalized.records;
  } catch (error) {
    throw MNURLInternalError("Cannot read secret store", {
      defaultsKey: MNURLSecretStoreDefaultsKey,
      error: error.message,
    });
  }
}

function MNURLApplySecretChanges(record, changes, allRecords) {
  var nextRecord = {
    id: record.id,
    secret: record.secret,
    name: record.name,
    note: record.note || "",
    groupIds: record.groupIds.slice(0),
    enabled: record.enabled,
    createdAt: record.createdAt,
  };

  if (changes.note !== undefined) {
    nextRecord.note = MNURLCreateUniqueSecretNote(
      changes.note || record.note || "secret",
      allRecords || [],
      record.id,
    );
  }

  if (changes.groupIds !== undefined) {
    MNURLValidatePermissionGroupIds(changes.groupIds);
    nextRecord.groupIds = changes.groupIds.slice(0);
  }

  MNURLValidateSecretRecord(nextRecord, 0);
  return nextRecord;
}

function MNURLNormalizeSecretRecords(records) {
  var usedNotes = {};
  var changed = false;
  var result = [];

  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    var nextRecord = {
      id: record.id,
      secret: record.secret,
      name: record.name,
      note: record.note,
      groupIds: record.groupIds,
      enabled: record.enabled,
      createdAt: record.createdAt,
    };

    var normalizedNote = MNURLCreateUniqueSecretNoteFromMap(
      nextRecord.note || "secret",
      usedNotes,
    );
    if (normalizedNote !== nextRecord.note) {
      nextRecord.note = normalizedNote;
      changed = true;
    }

    usedNotes[nextRecord.note] = true;
    result.push(nextRecord);
  }

  return {
    records: result,
    changed: changed,
  };
}

function MNURLCreateUniqueSecretNote(input, records, currentRecordId) {
  var usedNotes = {};
  for (var i = 0; i < records.length; i++) {
    if (records[i].id !== currentRecordId && records[i].note) {
      usedNotes[String(records[i].note)] = true;
    }
  }

  return MNURLCreateUniqueSecretNoteFromMap(input, usedNotes);
}

function MNURLCreateUniqueSecretNoteFromMap(input, usedNotes) {
  var base = MNURLNormalizeSecretNote(input);
  var candidate = base;
  var index = 1;

  while (usedNotes[candidate]) {
    candidate = base + index;
    index++;
  }

  return candidate;
}

function MNURLNormalizeSecretNote(input) {
  var note = String(input || "").replace(/^\s+|\s+$/g, "");
  return note ? note : "secret";
}

function MNURLCreateHardcodedTestSecretRecord() {
  return {
    id: "secret_hardcoded_test",
    secret: MNURLHardcodedTestSecret,
    name: "Hardcoded Test Secret",
    note: "Hardcoded test secret. Delete from SecretStore.js before release.",
    groupIds: [MNURLPermissionGroupIds.ALL],
    enabled: true,
    createdAt: "2026-05-23T00:00:00.000Z",
  };
}

function MNURLWriteSecretRecords(records) {
  NSUserDefaults
    .standardUserDefaults()
    .setObjectForKey(JSON.stringify(records), MNURLSecretStoreDefaultsKey);
  NSUserDefaults.standardUserDefaults().synchronize();
}

function MNURLValidateSecretRecord(record, index) {
  if (!record || typeof record !== "object") {
    throw new Error("Secret record at index " + index + " is not an object");
  }

  if (!record.id || !record.secret || !Array.isArray(record.groupIds)) {
    throw new Error("Secret record at index " + index + " is incomplete");
  }

  MNURLValidatePermissionGroupIds(record.groupIds);
}

function MNURLValidatePermissionGroupIds(groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) {
    throw MNURLBadRequest("Secret must have at least one permission group", {
      groupIds: groupIds,
    });
  }

  for (var i = 0; i < groupIds.length; i++) {
    MNURLGetPermissionGroup(groupIds[i]);
  }
}

function MNURLGenerateSecretValue() {
  return "mnsec_" + MNURLGenerateCompactUuid() + MNURLGenerateCompactUuid();
}

function MNURLGenerateRecordId() {
  return "secret_" + MNURLGenerateCompactUuid();
}

function MNURLGenerateCompactUuid() {
  return String(NSUUID.UUID().UUIDString()).replace(/-/g, "").toLowerCase();
}
