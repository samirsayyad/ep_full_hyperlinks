export const MARK_CLASS = 'pre-selected-link';

// we do nothing on callWithAce; actions will be handled on aceEditEvent
const doNothing = () => { };
const PreLinkMarker = function (ace) {
  this.ace = ace;
  const self = this;

  // do nothing if this feature is not enabled
  if (!this.highlightSelectedText()) return;

  // remove any existing marks, as there is no link being added on plugin initialization
  // (we need the timeout to let the plugin be fully initialized before starting to remove
  // marked texts)
  setTimeout(() => {
    self.unmarkSelectedText();
  }, 0);
};

export const init = (ace) => new PreLinkMarker(ace);

// Indicates if Etherpad is configured to highlight text
PreLinkMarker.prototype.highlightSelectedText = function () {
  return clientVars.highlightSelectedText;
};

PreLinkMarker.prototype.markSelectedText = function () {
  // do nothing if this feature is not enabled
  if (!this.highlightSelectedText()) return;

  this.ace.callWithAce(doNothing, 'markPreSelectedTextToLink', true);
};

PreLinkMarker.prototype.unmarkSelectedText = function () {
  // do nothing if this feature is not enabled
  if (!this.highlightSelectedText()) return;

  this.ace.callWithAce(doNothing, 'unmarkPreSelectedTextToLink', true);
};

PreLinkMarker.prototype.performNonUnduableEvent = function (eventType, callstack, action) {
  callstack.startNewEvent('nonundoable');
  action();
  callstack.startNewEvent(eventType);
};

PreLinkMarker.prototype.handleMarkText = function (context) {
  const editorInfo = context.editorInfo;
  const rep = context.rep;
  const callstack = context.callstack;

  // first we need to unmark any existing text, otherwise we'll have 2 text ranges marked
  this.removeMarks(editorInfo, rep, callstack);

  this.addMark(editorInfo, callstack);
};

PreLinkMarker.prototype.handleUnmarkText = function (context) {
  const editorInfo = context.editorInfo;
  const rep = context.rep;
  const callstack = context.callstack;

  this.removeMarks(editorInfo, rep, callstack);
};

PreLinkMarker.prototype.addMark = function (editorInfo, callstack) {
  const eventType = callstack.editEvent.eventType;

  // we don't want the text marking to be undoable
  this.performNonUnduableEvent(eventType, callstack, () => {
    editorInfo.ace_setAttributeOnSelection(MARK_CLASS, clientVars.userId);
  });
};

PreLinkMarker.prototype.removeMarks = function (editorInfo, rep, callstack) {
  const eventType = callstack.editEvent.eventType;
  const originalSelStart = rep.selStart;
  const originalSelEnd = rep.selEnd;

  // we don't want the text marking to be undoable
  this.performNonUnduableEvent(eventType, callstack, () => {
    // remove marked text
    const padInner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
    const selector = `.${MARK_CLASS}`;
    const repArr = editorInfo.ace_getRepFromSelector(selector, padInner);
    // repArr is an array of reps
    $.each(repArr, (index, rep) => {
      editorInfo.ace_performSelectionChange(rep[0], rep[1], true);
      editorInfo.ace_setAttributeOnSelection(MARK_CLASS, false);
    });

    // make sure selected text is back to original value
    editorInfo.ace_performSelectionChange(originalSelStart, originalSelEnd, true);
  });
};
