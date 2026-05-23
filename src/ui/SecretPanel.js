var MNURLSecretPanelWidth = 520;
var MNURLSecretPanelHeight = 460;
var MNURLSecretPanelRightMargin = 80;
var MNURLSecretPanelTag = 8172601;
var MNURLSecretPanelRowBaseTag = 8173000;

function MNURLToggleSecretPanel(context) {
  if (context.secretPanelView) {
    MNURLRemoveSecretPanel(context);
    return;
  }

  MNURLShowSecretPanel(context);
}

function MNURLShowSecretPanel(context) {
  MNURLRemoveSecretPanel(context);

  var hostView = MNURLGetSecretPanelHostView();
  var hostBounds = hostView.bounds;
  var panel = new UIView({
    x: Math.max(16, hostBounds.width - MNURLSecretPanelWidth - MNURLSecretPanelRightMargin),
    y: 72,
    width: MNURLSecretPanelWidth,
    height: MNURLSecretPanelHeight,
  });

  panel.tag = MNURLSecretPanelTag;
  panel.backgroundColor = UIColor.whiteColor();
  panel.layer.borderWidth = 1;
  panel.layer.borderColor = UIColor.blackColor();

  context.secretPanelView = panel;
  context.secretPanelSelectedId = context.secretPanelSelectedId || "";
  context.secretPanelRowIdMap = {};
  hostView.addSubview(panel);
  MNURLRenderSecretPanel(context);
}

function MNURLRemoveSecretPanel(context) {
  if (context.secretPanelView) {
    context.secretPanelView.removeFromSuperview();
    context.secretPanelView = null;
  }
}

function MNURLRenderSecretPanel(context) {
  var panel = context.secretPanelView;
  if (!panel) {
    return;
  }

  MNURLRemovePanelSubviews(panel);

  var records = MNURLCreateSecretStore().listSecrets();
  MNURLNormalizeSecretPanelSelection(context, records);
  var selectedRecord = MNURLFindRecordById(records, context.secretPanelSelectedId);

  MNURLAddLabel(panel, "URL API", 16, 14, 160, 24, 18, true);
  MNURLAddLabel(panel, "SECRET MANAGER", 16, 38, 180, 18, 11, false);
  MNURLAddButton(panel, context, "CLOSE", "onSecretPanelClose:", 444, 14, 60, 28, 0);
  MNURLAddRule(panel, 16, 66, 488);

  MNURLRenderSecretGenerator(panel, context);
  MNURLRenderSecretList(panel, context, records);
  MNURLRenderSecretDetail(panel, context, selectedRecord);
}

function MNURLNormalizeSecretPanelSelection(context, records) {
  if (records.length === 0) {
    context.secretPanelSelectedId = "";
    return;
  }

  if (MNURLFindRecordById(records, context.secretPanelSelectedId)) {
    return;
  }

  context.secretPanelSelectedId = records[0].id;
}

function MNURLRenderSecretGenerator(panel, context) {
  MNURLAddLabel(panel, "CREATE", 16, 82, 90, 18, 11, false);
  MNURLAddButton(panel, context, "EMPTY", "onSecretPanelGenerateEmpty:", 16, 108, 62, 30, 0);
  MNURLAddButton(panel, context, "READ", "onSecretPanelGenerateRead:", 84, 108, 56, 30, 0);
  MNURLAddButton(panel, context, "WRITE", "onSecretPanelGenerateWrite:", 146, 108, 64, 30, 0);
  MNURLAddButton(panel, context, "ADMIN", "onSecretPanelGenerateAdmin:", 216, 108, 64, 30, 0);
  MNURLAddButton(panel, context, "ALL", "onSecretPanelGenerateAll:", 286, 108, 58, 30, 0);
}

function MNURLRenderSecretList(panel, context, records) {
  MNURLAddRule(panel, 16, 156, 226);
  MNURLAddLabel(panel, "SECRETS " + records.length, 16, 172, 120, 18, 11, false);

  var scrollView = new UIScrollView({ x: 16, y: 198, width: 226, height: 232 });
  scrollView.backgroundColor = UIColor.whiteColor();
  scrollView.layer.borderWidth = 1;
  scrollView.layer.borderColor = UIColor.blackColor();
  scrollView.showsVerticalScrollIndicator = true;
  scrollView.contentSize = {
    width: 226,
    height: Math.max(232, records.length * 54 + 8),
  };
  panel.addSubview(scrollView);

  if (records.length === 0) {
    MNURLAddLabel(scrollView, "No secret yet.", 10, 12, 180, 22, 13, false);
    return;
  }

  context.secretPanelRowIdMap = {};
  for (var i = 0; i < records.length; i++) {
    MNURLAddSecretRow(scrollView, context, records[i], i);
  }
}

function MNURLAddSecretRow(scrollView, context, record, index) {
  var rowTag = MNURLSecretPanelRowBaseTag + index;
  var selected = record.id === context.secretPanelSelectedId;
  var row = new UIView({ x: 8, y: 8 + index * 54, width: 210, height: 46 });
  row.backgroundColor = selected
    ? UIColor.colorWithWhiteAlpha(0.92, 1)
    : UIColor.whiteColor();
  row.layer.borderWidth = 1;
  row.layer.borderColor = UIColor.blackColor();

  MNURLAddLabel(row, record.note, 8, 6, 194, 18, 13, true);
  MNURLAddLabel(row, MNURLBuildSecretRowMeta(record), 8, 26, 194, 14, 10, false);

  var button = new UIButton({ x: 0, y: 0, width: 210, height: 46 });
  button.tag = rowTag;
  button.backgroundColor = UIColor.colorWithWhiteAlpha(1, 0);
  button.layer.borderWidth = 0;
  button.setTitleForState("", 0);
  button.addTargetActionForControlEvents(context, "onSecretPanelSelectSecret:", 1 << 6);
  row.addSubview(button);
  scrollView.addSubview(row);
  context.secretPanelRowIdMap[String(rowTag)] = record.id;
}

function MNURLRenderSecretDetail(panel, context, record) {
  MNURLAddRule(panel, 258, 156, 246);
  MNURLAddLabel(panel, "DETAIL", 258, 172, 100, 18, 11, false);

  if (!record) {
    MNURLAddLabel(panel, "Select a secret.", 258, 206, 160, 22, 13, false);
    return;
  }

  MNURLAddLabel(panel, "ID", 258, 202, 80, 18, 11, false);
  MNURLAddLabel(panel, record.id, 320, 202, 184, 18, 10, false);
  MNURLAddLabel(panel, "SECRET", 258, 226, 80, 18, 11, false);
  MNURLAddLabel(panel, MNURLMaskSecret(record.secret), 320, 226, 184, 18, 10, false);
  MNURLAddLabel(panel, "PERMISSION", 258, 250, 90, 18, 11, false);
  MNURLAddLabel(panel, record.groupIds.join("+").toUpperCase(), 350, 250, 154, 18, 10, false);

  MNURLAddLabel(panel, "NOTE", 258, 282, 80, 18, 11, false);
  context.secretPanelNoteField = new UITextField({ x: 258, y: 306, width: 246, height: 32 });
  context.secretPanelNoteField.text = record.note || "";
  context.secretPanelNoteField.placeholder = "Short remark";
  context.secretPanelNoteField.textColor = UIColor.blackColor();
  context.secretPanelNoteField.font = UIFont.systemFontOfSize(12);
  context.secretPanelNoteField.borderStyle = 1;
  panel.addSubview(context.secretPanelNoteField);

  MNURLAddButton(panel, context, "SAVE NOTE", "onSecretPanelSaveNote:", 258, 346, 88, 30, 0);
  MNURLAddButton(panel, context, "COPY", "onSecretPanelCopy:", 356, 346, 58, 30, 0);
  MNURLAddButton(panel, context, "DELETE", "onSecretPanelDelete:", 424, 346, 80, 30, 0);

  MNURLAddLabel(panel, "SET PERMISSION", 258, 392, 120, 18, 11, false);
  MNURLAddButton(panel, context, "EMPTY", "onSecretPanelSetEmpty:", 258, 418, 46, 28, 0);
  MNURLAddButton(panel, context, "READ", "onSecretPanelSetRead:", 308, 418, 42, 28, 0);
  MNURLAddButton(panel, context, "WRITE", "onSecretPanelSetWrite:", 354, 418, 46, 28, 0);
  MNURLAddButton(panel, context, "ADMIN", "onSecretPanelSetAdmin:", 404, 418, 48, 28, 0);
  MNURLAddButton(panel, context, "ALL", "onSecretPanelSetAll:", 456, 418, 38, 28, 0);
}

function MNURLGenerateSecretFromPanel(context, groupIds) {
  var store = MNURLCreateSecretStore();
  var record = store.createSecret(groupIds);
  context.secretPanelSelectedId = record.id;
  UIPasteboard.generalPasteboard().string = "secret=" + record.secret;
  console.log("[Url Apis] generated secret:", MNURLMaskSecret(record.secret));
  MNURLRenderSecretPanel(context);
}

function MNURLDeleteSelectedSecretFromPanel(context) {
  if (!context.secretPanelSelectedId) {
    return;
  }

  MNURLCreateSecretStore().deleteSecret(context.secretPanelSelectedId);
  context.secretPanelSelectedId = "";
  MNURLRenderSecretPanel(context);
}

function MNURLSaveSelectedSecretNoteFromPanel(context) {
  if (!context.secretPanelSelectedId || !context.secretPanelNoteField) {
    return;
  }

  MNURLCreateSecretStore().updateSecret(context.secretPanelSelectedId, {
    note: context.secretPanelNoteField.text || "",
  });
  MNURLRenderSecretPanel(context);
}

function MNURLCopySelectedSecretFromPanel(context) {
  var record = MNURLGetSelectedSecretRecord(context);
  if (!record) {
    return;
  }

  UIPasteboard.generalPasteboard().string = "secret=" + record.secret;
}

function MNURLSetSelectedSecretPermissionFromPanel(context, groupId) {
  if (!context.secretPanelSelectedId) {
    return;
  }

  MNURLCreateSecretStore().updateSecret(context.secretPanelSelectedId, {
    groupIds: [groupId],
  });
  MNURLRenderSecretPanel(context);
}

function MNURLSelectSecretFromPanel(context, sender) {
  var recordId = context.secretPanelRowIdMap[String(sender.tag)];
  if (!recordId) {
    return;
  }

  context.secretPanelSelectedId = recordId;
  MNURLRenderSecretPanel(context);
}

function MNURLGetSelectedSecretRecord(context) {
  var records = MNURLCreateSecretStore().listSecrets();
  return MNURLFindRecordById(records, context.secretPanelSelectedId);
}

function MNURLFindRecordById(records, recordId) {
  if (!recordId) {
    return null;
  }

  for (var i = 0; i < records.length; i++) {
    if (records[i].id === recordId) {
      return records[i];
    }
  }

  return null;
}

function MNURLBuildSecretRowMeta(record) {
  return record.groupIds.join("+").toUpperCase() + "  " + MNURLMaskSecret(record.secret);
}

function MNURLGetSecretPanelHostView() {
  var app = Application.sharedInstance();
  var studyController = app.studyController(app.focusWindow);
  if (!studyController || !studyController.view) {
    throw MNURLInternalError("Cannot open secret panel without active study view", null);
  }

  return studyController.view;
}

function MNURLAddLabel(panel, text, x, y, width, height, fontSize, bold) {
  var label = new UILabel({ x: x, y: y, width: width, height: height });
  label.text = text;
  label.textColor = UIColor.blackColor();
  label.font = bold ? UIFont.boldSystemFontOfSize(fontSize) : UIFont.systemFontOfSize(fontSize);
  label.numberOfLines = 2;
  panel.addSubview(label);
  return label;
}

function MNURLAddButton(panel, context, title, selector, x, y, width, height, tag) {
  var button = new UIButton({ x: x, y: y, width: width, height: height });
  button.tag = tag || 0;
  button.backgroundColor = UIColor.whiteColor();
  button.layer.borderWidth = 1;
  button.layer.borderColor = UIColor.blackColor();
  button.setTitleForState(title, 0);
  button.setTitleColorForState(UIColor.blackColor(), 0);
  button.titleLabel.font = UIFont.systemFontOfSize(10);
  button.addTargetActionForControlEvents(context, selector, 1 << 6);
  panel.addSubview(button);
  return button;
}

function MNURLAddRule(panel, x, y, width) {
  var rule = new UIView({ x: x, y: y, width: width, height: 1 });
  rule.backgroundColor = UIColor.blackColor();
  panel.addSubview(rule);
  return rule;
}

function MNURLRemovePanelSubviews(panel) {
  var subviews = MNURLToArray(panel.subviews);
  for (var i = 0; i < subviews.length; i++) {
    subviews[i].removeFromSuperview();
  }
}

function MNURLMaskSecret(secret) {
  var text = String(secret);
  if (text.length <= 16) {
    return text;
  }

  return text.slice(0, 12) + "..." + text.slice(text.length - 6);
}
