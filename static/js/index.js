
const _ = require('underscore');
const padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;

const {
	linkBoxes,
	newLink,
	preLinkMark,
	events,
	shared
} = require('../dist/js/ep.full.hyperlinks.mini').moduleList;

const getLinkIdOnFirstPositionSelected = events.getLinkIdOnFirstPositionSelected;
const hasLinkOnSelection = events.hasLinkOnSelection;
const browser = require('ep_etherpad-lite/static/js/browser');
const cssFiles = ['ep_full_hyperlinks/static/css/link.css', 'ep_full_hyperlinks/static/dist/css/linkIcon.css'];

/** **********************************************************************/
/*                         ep_links Plugin                           */
/** **********************************************************************/

// Container
function ep_links(context) {
  this.container = null;
  this.padOuter = null;
  this.padInner = null;
  this.ace = context.ace;

  // Required for instances running on weird ports
  // This probably needs some work for instances running on root or not on /p/
  const loc = document.location;
  const port = loc.port == '' ? (loc.protocol == 'https:' ? 443 : 80) : loc.port;
  const url = `${loc.protocol}//${loc.hostname}:${port}/` + 'link';
  this.socket = io.connect(url);

  this.padId = clientVars.padId;
  this.links = [];
  this.mapFakeLinks = [];
  this.mapOriginalLinksId = [];
  this.shouldCollectLink = false;
  this.init();
  this.preLinkMarker = preLinkMark.init(this.ace);
}

// Init Etherpad plugin link pads
ep_links.prototype.init = function () {
  const self = this;
  const ace = this.ace;

  // Init prerequisite
  this.findContainers();
  this.insertContainers(); // Insert link containers in sidebar


  // Get all links
  this.getLinks((links) => {
    if (!$.isEmptyObject(links)) {
      self.setLinks(links);
    }
  });

  // Init add push event
  this.pushLink('add', (linkId, link) => {
    self.setLink(linkId, link);
  });

  // On click link icon toolbar
  $('.addLink').on('click', (e) => {
    e.preventDefault(); // stops focus from being lost
    self.displayNewLinkForm();
  });

  // submit the edition on the text and update the link text
  this.container.parent().on('click', '.link-edit-submit', function (e) {
    e.preventDefault();
    e.stopPropagation();
    const $linkBox = $(this).closest('.link-container');
    const $linkForm = $(this).closest('.link-edit-form');
    const linkId = $linkBox.data('linkid');
    const linkText = $linkForm.find('#hyperlink-text').val();
    let hyperlink = $linkForm.find('#hyperlink-url').val();
    const oldLinkText = $linkForm.find('#hyperlink-text-hidden').val();
    $linkForm.find('.link-text-text-old').val(linkText);
    const padOuter = $('iframe[name="ace_outer"]').contents();
    const padInner = padOuter.find('iframe[name="ace_inner"]');
    const selector = `.${linkId}`;
    const ace = self.ace;
    ace.callWithAce((aceTop) => {
      const repArr = aceTop.ace_getRepFromSelector(selector, padInner);
      if (oldLinkText !== linkText) {
        aceTop.ace_replaceRange(repArr[0][0], repArr[0][1], linkText);
        if (oldLinkText.length > linkText.length) {
          repArr[0][1][1] -= oldLinkText.length - linkText.length;
        } else if (oldLinkText.length < linkText.length) {
          repArr[0][1][1] += linkText.length - oldLinkText.length;
        }
      }
      ace.callWithAce((ace) => {
        ace.ace_performSelectionChange(repArr[0][0], repArr[0][1], true);
        ace.ace_setAttributeOnSelection('link', linkId);

        // Note that this is the correct way of doing it, instead of there being
        // a linkId we now flag it as "link-deleted"
      });
    }, 'editLinkedSelection', true);


    if (!(/^http:\/\//.test(hyperlink)) && !(/^https:\/\//.test(hyperlink))) {
      hyperlink = `http://${hyperlink}`;
    }
    const data = {};
    data.linkId = linkId;
    data.padId = clientVars.padId;
    data.linkText = linkText;
    data.oldLinkText = oldLinkText;
    data.hyperlink = hyperlink;
    self.socket.emit('updateLinkText', data, (err) => {
			console.log(data)
      if (!err) {
        // $linkForm.remove();
        $linkBox.removeClass('editing');
        self.updateLinkBoxText(linkId, linkText, hyperlink);
        linkBoxes.hideLink(linkId);

        // reverting modal to show because we change it to edit mode
        self.padOuter.find(`#show-form-${linkId}`).show();
        self.padOuter.find(`#edit-form-${linkId}`).hide();
        $linkBox.attr({'data-loaded': false});
        // although the link was saved on the data base successfully, it needs
        // to update the link variable with the new text saved
        self.setLinkNewText(linkId, linkText, hyperlink);
      }
    });

  });

	this.container.on('click', '#link-cancel-btn', function(){
		const linkId = $(this).closest('.link-container')[0].id;
		self.padOuter.find(`#show-form-${linkId}`).show();
    self.padOuter.find(`#edit-form-${linkId}`).hide();
    linkBoxes.hideLink(linkId);
	})

  this.container.parent().on('click', '.ep_hyperlink_docs_bubble_button_edit', function (e) {
    const linkId = $(this).closest('.link-container')[0].id;
    self.padOuter.find(`#show-form-${linkId}`).hide();
    self.padOuter.find(`#edit-form-${linkId}`).show();
  });

  this.container.parent().on('click', '.ep_hyperlink_docs_bubble_button_copy', function (e) {
    const dummy = document.createElement('input');
    document.body.appendChild(dummy);
    dummy.value = this.getAttribute('data-hyperlink');
    dummy.select();
    document.execCommand('copy');
    document.body.removeChild(dummy);
    $.gritter.add({
      text: 'Link copied to clipboard',
    });
    const linkId = $(this).closest('.link-container')[0].id;
    linkBoxes.hideLink(linkId);
  });

  this.container.parent().on('click', '.ep_hyperlink_docs_bubble_button_delete', function () {
    const linkId = $(this).closest('.link-container')[0].id;
    self.deleteLink(linkId);
    const padOuter = $('iframe[name="ace_outer"]').contents();
    const padInner = padOuter.find('iframe[name="ace_inner"]');
    const selector = `.${linkId}`;
    const ace = self.ace;
    ace.callWithAce((aceTop) => {
      const repArr = aceTop.ace_getRepFromSelector(selector, padInner);
      // rep is an array of reps..  I will need to iterate over each to do something meaningful..
      $.each(repArr, (index, rep) => {
        // I don't think we need this nested call
        ace.callWithAce((ace) => {
          ace.ace_performSelectionChange(rep[0], rep[1], true);
          ace.ace_setAttributeOnSelection('link', 'link-deleted');
          // Note that this is the correct way of doing it, instead of there being
          // a linkId we now flag it as "link-deleted"
        });
      });
    }, 'deleteLinkedSelection', true);
    // dispatch event
    self.socket.emit('deleteLink', {padId: self.padId, linkId}, () => {});
  });

	let hideLinkTimer;
  this.container.on('mouseover', '.sidebar-link', (e) => {
    // highlight link
    clearTimeout(hideLinkTimer);
  }).on('mouseout', '.sidebar-link', (e) => {
    // do not hide directly the link, because sometime the mouse get out accidently
    hideLinkTimer = setTimeout(() => {
			const linkId = e.currentTarget.id;
      linkBoxes.hideLink(linkId);
    }, 3000);
  });

  this.padInner.contents().on('click', '.link', function (event) {
		event.preventDefault();
		clearTimeout(hideLinkTimer);
      const linkId = self.linkIdOf(event);
			fetch(`/pluginfw/hyperlink/${clientVars.padId}/links/${linkId}`)
			.then(res => res.json())
			.then(res => {
				const linkObj = {...res.link, linkId}
				linkBoxes.showLinkModal(event, linkObj, self.socket)
			});
  });

	this.container.parent()
		.on('click', 'a.ep_hyperlink_title', linkBoxes.internalLinkClick)


  this.addListenersToCloseOpenedLink();

  // Enable and handle cookies
  if (padcookie.getPref('links') === false) {
    self.padOuter.find('#links').removeClass('active');
    $('#options-links').attr('checked', 'unchecked');
    $('#options-links').attr('checked', false);
  } else {
    $('#options-links').attr('checked', 'checked');
  }

  $('#options-links').on('change', () => {
    if ($('#options-links').is(':checked')) {
      enableLinks();
    } else {
      disableLinks();
    }
  });

  function enableLinks() {
    padcookie.setPref('links', true);
    self.padOuter.find('#links').addClass('active');
    $('body').addClass('links-active');
    $('iframe[name="ace_outer"]').contents().find('body').addClass('links-active');
  }

  function disableLinks() {
    padcookie.setPref('links', false);
    self.padOuter.find('#links').removeClass('active');
    $('body').removeClass('links-active');
    $('iframe[name="ace_outer"]').contents().find('body').removeClass('links-active');
  }

  // Check to see if we should show already..
  $('#options-links').trigger('change');

  // TODO - Implement to others browser like, Microsoft Edge, Opera, IE
  // Override  copy, cut, paste events on Google chrome and Mozilla Firefox.
  // When an user copies a link and selects only the span, or part of it, Google chrome
  // does not copy the classes only the styles, for example:
  // <link class='link'><span>text to be copied</span></link>
  // As the link classes are not only used for styling we have to add these classes when it pastes the content
  // The same does not occur when the user selects more than the span, for example:
  // text<link class='link'><span>to be copied</span></link>
  if (browser.chrome || browser.firefox) {
    self.padInner.contents().on('copy', (e) => {
      events.addTextOnClipboard(e, self.ace, self.padInner, false, self.links);
    });

    self.padInner.contents().on('cut', (e) => {
      events.addTextOnClipboard(e, self.ace, self.padInner, true, self.links);
    });

    self.padInner.contents().on('paste', (e) => {
      events.saveLinks(e,self.padInner);
    });
  }
};

// Insert links container on element use for linenumbers
ep_links.prototype.findContainers = function () {
  const padOuter = $('iframe[name="ace_outer"]').contents();
  this.padOuter = padOuter;
  this.padInner = padOuter.find('iframe[name="ace_inner"]');
  this.outerBody = padOuter.find('#outerdocbody');
};

// set the text of the link
ep_links.prototype.setLinkNewText = function (linkId, text, hyperlink) {
  if (this.links[linkId]) {
    this.links[linkId].data.text = text;
    this.links[linkId].data.hyperlink = hyperlink;
  } else if (this.linkReplies[linkId]) {
    this.linkReplies[linkId].text = text;
    this.linkReplies[linkId].hyperlink = hyperlink;
  }
};

ep_links.prototype.addListenersToCloseOpenedLink = function () {
  const self = this;

  // we need to add listeners to the different iframes of the page
  $(document).on('touchstart click', (e) => {
    self.closeOpenedLinkIfNotOnSelectedElements(e);
  });
  this.padOuter.find('html').on('touchstart click', (e) => {
    self.closeOpenedLinkIfNotOnSelectedElements(e);
  });
  this.padInner.contents().find('html').on('touchstart click', (e) => {
    self.closeOpenedLinkIfNotOnSelectedElements(e);
  });
};

// Close link that is opened
ep_links.prototype.closeOpenedLink = function (e) {
  // var linkId = this.linkIdOf(e);
  // linkBoxes.hideLink(linkId);
  // it was using like above but I decide check hideAllLink
  linkBoxes.hideAllLinks();
};

// Close link if event target was outside of link or on a link icon
ep_links.prototype.closeOpenedLinkIfNotOnSelectedElements = function (e) {
	// Don't do anything if clicked on the allowed elements:
  // any of the link icons
  if (linkBoxes.shouldNotCloseLink(e)) { // a link box or the link modal
    return;
  }
  // All clear, can close the link
  this.closeOpenedLink(e);
};

ep_links.prototype.linkIdOf = function (e) {
  const cls = e.currentTarget.classList;
  const classLinkId = /(?:^| )(lc-[A-Za-z0-9]*)/.exec(cls);

  return (classLinkId) ? classLinkId[1] : null;
};

// Insert link container in sidebar
ep_links.prototype.insertContainers = function () {
  const linkBoxWrapper = $('iframe[name="ace_outer"]').contents()
		.find('#outerdocbody')
		.prepend('<div id="linkBoxWrapper"></div>');

  this.container = linkBoxWrapper;
};

// Set links content data
ep_links.prototype.setLinks = function (links) {
  for (const linkId in links) {
    this.setLink(linkId, links[linkId]);
  }
};

// Set link data
ep_links.prototype.setLink = function (linkId, link) {
  const links = this.links;
  // link.date = timeFormat.prettyDate(link.timestamp);
  link.formattedDate = new Date(link.timestamp).toISOString();

  if (links[linkId] == null) links[linkId] = {};
  links[linkId].data = link;
};

// set the text of the link
ep_links.prototype.setLinkNewText = function (linkId, text, hyperlink) {
  if (!this.links[linkId]) return
	this.links[linkId].data.text = text;
	this.links[linkId].data.hyperlink = hyperlink;
};

// Get all links
ep_links.prototype.getLinks = function (callback) {
  const req = {padId: this.padId};

  this.socket.emit('getLinks', req, (res) => {
    callback(res.links);
  });
};

ep_links.prototype.getLinkData = function () {
  const data = {};

  // Insert link data
  data.padId = this.padId;
  data.link = {};
  data.link.author = clientVars.userId;
  data.link.name = pad.myUserInfo.name;
  data.link.timestamp = new Date().getTime();

  // If client is anonymous
  if (data.link.name === undefined) {
    data.link.name = clientVars.userAgent;
  }

  return data;
};

// Delete a pad link
ep_links.prototype.deleteLink = function (linkId) {
  $('iframe[name="ace_outer"]').contents().find(`#${linkId}`).remove();
};

// start modal of new link
ep_links.prototype.displayNewLinkForm = function () {
  const self = this;
  const rep = {};
  const ace = this.ace;
  ace.callWithAce((ace) => {
    const saveRep = ace.ace_getRep();
    rep.lines = saveRep.lines;
    rep.selStart = saveRep.selStart;
    rep.selEnd = saveRep.selEnd;
  }, 'saveLinkedSelection', true);

  const selectedText = self.getSelectedText(rep);

  // we have nothing selected, do nothing
  const noTextSelected = (selectedText.length === 0);
  if (noTextSelected) {
    $.gritter.add({text: 'Please first select the text to link'});
    return;
  }

  self.createNewLinkFormIfDontExist(rep);

  // Display form
  newLink.showNewLinkPopup();

  // Check if the first element selected is visible in the viewport
  const $firstSelectedElement = self.getFirstElementSelected();
  const firstSelectedElementInViewport = self.isElementInViewport($firstSelectedElement);

  if (!firstSelectedElementInViewport) {
    self.scrollViewportIfSelectedTextIsNotVisible($firstSelectedElement);
  }

  // add selected text to form
  $('#newLink').find('#hyperlink-text').val(selectedText);
  $('#newLink').find('#hyperlink-text-hidden').val(selectedText);
};

ep_links.prototype.scrollViewportIfSelectedTextIsNotVisible = function ($firstSelectedElement) {
  // Set the top of the form to be the same Y as the target Rep
  const y = $firstSelectedElement.offsetTop;
  const padOuter = $('iframe[name="ace_outer"]').contents();
  padOuter.find('#outerdocbody').scrollTop(y); // Works in Chrome
  padOuter.find('#outerdocbody').parent().scrollTop(y); // Works in Firefox
};

ep_links.prototype.isElementInViewport = function (element) {
  const elementPosition = element.getBoundingClientRect();
  const scrollTopFirefox = $('iframe[name="ace_outer"]').contents().find('#outerdocbody').parent().scrollTop(); // works only on firefox
  const scrolltop = $('iframe[name="ace_outer"]').contents().find('#outerdocbody').scrollTop() || scrollTopFirefox;
  // position relative to the current viewport
  const elementPositionTopOnViewport = elementPosition.top - scrolltop;
  const elementPositionBottomOnViewport = elementPosition.bottom - scrolltop;

  const $ace_outer = $('iframe[name="ace_outer"]');
  const ace_outerHeight = $ace_outer.height();
  const ace_outerPaddingTop = this.getIntValueOfCSSProperty($ace_outer, 'padding-top');

  const clientHeight = ace_outerHeight - ace_outerPaddingTop;

  const elementAboveViewportTop = elementPositionTopOnViewport < 0;
  const elementBelowViewportBottom = elementPositionBottomOnViewport > clientHeight;

  return !(elementAboveViewportTop || elementBelowViewportBottom);
};

ep_links.prototype.getIntValueOfCSSProperty = function ($element, property) {
  const valueString = $element.css(property);
  return parseInt(valueString) || 0;
};

ep_links.prototype.getFirstElementSelected = function () {
  let element;

  this.ace.callWithAce((ace) => {
    const rep = ace.ace_getRep();
    const line = rep.lines.atIndex(rep.selStart[0]);
    const key = `#${line.key}`;
    const padOuter = $('iframe[name="ace_outer"]').contents();
    const padInner = padOuter.find('iframe[name="ace_inner"]').contents();
    element = padInner.find(key);
  }, 'getFirstElementSelected', true);

  return element[0];
};

// Indicates if user selected some text on editor
ep_links.prototype.checkNoTextSelected = function (rep) {
  const noTextSelected = ((rep.selStart[0] == rep.selEnd[0]) && (rep.selStart[1] == rep.selEnd[1]));

  return noTextSelected;
};

// Create form to add link
ep_links.prototype.createNewLinkFormIfDontExist = function (rep) {
  const data = this.getLinkData();
  const self = this;

  // If a new link box doesn't already exist, create one
  newLink.insertNewLinkPopupIfDontExist(data, (link, index) => {
    data.link.oldText = link.oldText;
    data.link.text = link.text;
    data.link.hyperlink = link.hyperlink;
    self.saveLink(data, rep);
  });
};

// Get a string representation of the text selected on the editor
ep_links.prototype.getSelectedText = function (rep) {
  const self = this;
  const firstLine = rep.selStart[0];
  const lastLine = self.getLastLine(firstLine, rep);
  let selectedText = '';

  _(_.range(firstLine, lastLine + 1)).each((lineNumber) => {
    // rep looks like -- starts at line 2, character 1, ends at line 4 char 1
    /*
     {
        rep.selStart[2,0],
        rep.selEnd[4,2]
     }
     */
    const line = rep.lines.atIndex(lineNumber);
    // If we span over multiple lines
    if (rep.selStart[0] === lineNumber) {
      // Is this the first line?
      if (rep.selStart[1] > 0) {
        var posStart = rep.selStart[1];
      } else {
        var posStart = 0;
      }
    }
    if (rep.selEnd[0] === lineNumber) {
      if (rep.selEnd[1] <= line.text.length) {
        var posEnd = rep.selEnd[1];
      } else {
        var posEnd = 0;
      }
    }
    let lineText = line.text.substring(posStart, posEnd);
    // When it has a selection with more than one line we select at least the beginning
    // of the next line after the first line. As it is not possible to select the beginning
    // of the first line, we skip it.
    if (lineNumber > firstLine) {
      // if the selection takes the very beginning of line, and the element has a lineMarker,
      // it means we select the * as well, so we need to clean it from the text selected
      lineText = self.cleanLine(line, lineText);
      lineText = `\n${lineText}`;
    }
    selectedText += lineText;
  });
  return selectedText;
};

ep_links.prototype.getLastLine = function (firstLine, rep) {
  let lastLineSelected = rep.selEnd[0];

  if (lastLineSelected > firstLine) {
    // Ignore last line if the selected text of it it is empty
    if (this.lastLineSelectedIsEmpty(rep, lastLineSelected)) {
      lastLineSelected--;
    }
  }
  return lastLineSelected;
};

ep_links.prototype.lastLineSelectedIsEmpty = function (rep, lastLineSelected) {
  const line = rep.lines.atIndex(lastLineSelected);
  // when we've a line with line attribute, the first char line position
  // in a line is 1 because of the *, otherwise is 0
  const firstCharLinePosition = this.lineHasMarker(line) ? 1 : 0;
  const lastColumnSelected = rep.selEnd[1];

  return lastColumnSelected === firstCharLinePosition;
};

ep_links.prototype.lineHasMarker = function (line) {
  return line.lineMarker === 1;
};

ep_links.prototype.cleanLine = function (line, lineText) {
  const hasALineMarker = this.lineHasMarker(line);
  if (hasALineMarker) {
    lineText = lineText.substring(1);
  }
  return lineText;
};

// Save link
ep_links.prototype.saveLink = function (data, rep) {
  const self = this;
  self.socket.emit('addLink', data, (linkId, link) => {
    link.linkId = linkId;
    self.ace.callWithAce((ace) => {
      if (data.link.text !== data.link.oldText) {
        ace.ace_replaceRange(rep.selStart, rep.selEnd, data.link.text);
        if (data.link.oldText.length > data.link.text.length) {
          rep.selEnd[1] -= data.link.oldText.length - data.link.text.length;
        } else if (data.link.oldText.length < data.link.text.length) {
          rep.selEnd[1] += data.link.text.length - data.link.oldText.length;
        }
      }
      ace.ace_performSelectionChange(rep.selStart, rep.selEnd, true);
      ace.ace_setAttributeOnSelection('link', linkId);
    }, 'insertLink', true);

    self.setLink(linkId, link);
  });
};

// linkData = {c-newLinkId123: data:{author:..., date:..., ...}, c-newLinkId124: data:{...}}
ep_links.prototype.saveLinkWithoutSelection = function (padId, linkData) {
  const self = this;
  const data = self.buildLinks(linkData);
  self.socket.emit('bulkAddLink', padId, data, (links) => {
    self.setLinks(links);
    self.shouldCollectLink = true;
  });
};

ep_links.prototype.buildLinks = function (linksData) {
  const self = this;
  const links = _.map(linksData, (linkData, linkId) => self.buildLink(linkId, linkData.data));
  return links;
};

// linkData = {c-newLinkId123: data:{author:..., date:..., ...}, ...
ep_links.prototype.buildLink = function (linkId, linkData) {
  const data = {};
  data.padId = this.padId;
  data.linkId = linkId;
  data.text = linkData.text;
  data.hyperlink = linkData.hyperlink;
  data.changeTo = linkData.changeTo;
  data.changeFrom = linkData.changeFrom;
  data.name = linkData.name;
  data.timestamp = parseInt(linkData.timestamp);

  return data;
};

ep_links.prototype.getMapfakeLinks = function () {
  return this.mapFakeLinks;
};

ep_links.prototype.findLinkText = function ($linkBox) {
  return $linkBox.find('.compact-display-content .link-text-text, .full-display-link .link-title-wrapper .link-text-text');
};
ep_links.prototype.findHyperLinkText = function ($linkBox) {
  return $linkBox.find('.compact-display-content .link-text-hyperlink, .full-display-link .link-title-wrapper .link-text-hyperlink');
};

ep_links.prototype.updateLinkBoxText = function (linkId, linkText, hyperlink) {
  const $link = this.container.parent().find(`[data-linkid='${linkId}']`);
  $link.attr('data-hyperlink', hyperlink);

  const textBox = this.findLinkText($link);
  // textBox.text(linkText)
  textBox.val(linkText);

  const linkBox = this.findHyperLinkText($link);
  // linkBox.text(hyperlink)
  linkBox.val(hyperlink);
};

ep_links.prototype.showChangeAsAccepted = function (linkId) {
  const self = this;

  // Get the link
  const link = this.container.parent().find(`[data-linkid='${linkId}']`);
  // Revert other link that have already been accepted
  link.closest('.sidebar-link')
      .find('.link-container.change-accepted').addBack('.change-accepted')
      .each(function () {
        $(this).removeClass('change-accepted');
        const data = {linkId: $(this).attr('data-linkid'), padId: self.padId};
        self.socket.emit('revertChange', data, () => {});
      });

  // this link get accepted
  link.addClass('change-accepted');
};

ep_links.prototype.showChangeAsReverted = function (linkId) {
  const self = this;
  // Get the link
  const link = self.container.parent().find(`[data-linkid='${linkId}']`);
  link.removeClass('change-accepted');
};

// Push link from collaborators
ep_links.prototype.pushLink = function (eventType, callback) {
  const socket = this.socket;
  const self = this;

	socket.on('textLinkUpdated', (linkId, linkText, hyperlink) => {
    self.updateLinkBoxText(linkId, linkText, hyperlink);
  });

  socket.on('linkDeleted', (linkId) => {
    self.deleteLink(linkId);
  });

  socket.on('changeAccepted', (linkId) => {
    self.showChangeAsAccepted(linkId);
  });

  socket.on('changeReverted', (linkId) => {
    self.showChangeAsReverted(linkId);
  });

  // On collaborator add a link in the current pad
  if (eventType == 'add') {
    socket.on('pushAddLink', (linkId, link) => {
      callback(linkId, link);
    });
  }
};

/** **********************************************************************/
/*                           Etherpad Hooks                             */
/** **********************************************************************/

var hooks = {

  // Init pad links
  postAceInit: (hook, context) => {
    if (!pad.plugins) pad.plugins = {};
    const Links = new ep_links(context);
    pad.plugins.ep_full_hyperlinks = Links;

    if (!$('#editorcontainerbox').hasClass('flex-layout')) {
      $.gritter.add({
        title: 'Error',
        text: 'ep_full_hyperlinks: Please upgrade to etherpad 1.8.3 for this plugin to work correctly',
        sticky: true,
        class_name: 'error',
      });
    }
    return [];
  },

  aceEditEvent: (hook, context) => {
    if (!pad.plugins) pad.plugins = {};
    // first check if some text is being marked/unmarked to add link to it
    const eventType = context.callstack.editEvent.eventType;

    if (eventType == 'setup' || eventType == 'setBaseText' || eventType == 'importText') return;

		if (eventType === 'unmarkPreSelectedTextToLink') {
      pad.plugins.ep_full_hyperlinks.preLinkMarker.handleUnmarkText(context);
    } else if (eventType === 'markPreSelectedTextToLink') {
      pad.plugins.ep_full_hyperlinks.preLinkMarker.handleMarkText(context);
    }

    return [];
  },

  // Insert links classes
  aceAttribsToClasses: (hook, context, cb) => {
    if (context.key === 'link' && context.value !== 'link-deleted') {
      return ['link', context.value];
    }
    // only read marks made by current user
    if (context.key === preLinkMark.MARK_CLASS && context.value === clientVars.userId) {
      return [preLinkMark.MARK_CLASS, context.value];
    }
    return [];
  },

  aceEditorCSS: (hookName, context, cb) => cssFiles,
};

function getUrlVars(url) {
  const vars = []; let
    hash;
  const hashes = url.slice(url.indexOf('?') + 1).split('&');
  for (let i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}
// Given a CSS selector and a target element (in this case pad inner)
// return the rep as an array of array of tuples IE [[[0,1],[0,2]], [[1,3],[1,5]]]
// We have to return an array of a array of tuples because there can be multiple reps
// For a given selector
// A more sane data structure might be an object such as..
/*
0:{
  xStart: 0,
  xEnd: 1,
  yStart: 0,
  yEnd: 1
},
1:...
*/
// Alas we follow the Etherpad convention of using tuples here.
function getRepFromSelector(selector, container) {
  const attributeManager = this.documentAttributeManager;

  const repArr = [];

  // first find the element
  const elements = container.contents().find(selector);
  // One might expect this to be a rep for the entire document
  // However what we actually need to do is find each selection that includes
  // this link and remove it.  This is because content can be pasted
  // Mid link which would mean a remove selection could have unexpected consequences

  $.each(elements, (index, span) => {
    // create a rep array container we can push to..
    const rep = [[], []];

    // span not be the div so we have to go to parents until we find a div
    const parentDiv = $(span).closest('div');
    // line Number is obviously relative to entire document
    // So find out how many elements before in this parent?
    const lineNumber = $(parentDiv).prevAll('div').length;
    // We can set beginning of rep Y (lineNumber)
    rep[0][0] = lineNumber;

    // We can also update the end rep Y
    rep[1][0] = lineNumber;

    // Given the link span, how many characters are before it?

    // All we need to know is the number of characters before .foo
    /*

    <div id="boo">
      hello
      <span class='nope'>
        world
      </span>
      are you
      <span class='foo'>
        here?
      </span>
    </div>

    */
    // In the example before the correct number would be 21
    // I guess we could do prevAll each length?
    // If there are no spans before we get 0, simples!
    // Note that this only works if spans are being used, which imho
    // Is the correct container however if block elements are registered
    // It's plausable that attributes are not maintained :(
    let leftOffset = 0;

    // If the line has a lineAttribute then leftOffset should be +1
    // Get each line Attribute on this line..
    let hasLineAttribute = false;
    const attrArr = attributeManager.getAttributesOnLine(lineNumber);
    $.each(attrArr, (attrK, value) => {
      if (value[0] === 'lmkr') hasLineAttribute = true;
    });
    if (hasLineAttribute) leftOffset++;

    $(span).prevAll('span').each(function () {
      const spanOffset = $(this).text().length;
      leftOffset += spanOffset;
    });
    rep[0][1] = leftOffset;

    // All we need to know is span text length and it's left offset in chars
    const spanLength = $(span).text().length;

    rep[1][1] = rep[0][1] + $(span).text().length; // Easy!
    repArr.push(rep);
  });
  return repArr;
}
// Once ace is initialized, we set ace_doInsertHeading and bind it to the context
exports.aceInitialized = function (hook, context) {
  const editorInfo = context.editorInfo;
  editorInfo.ace_getRepFromSelector = _(getRepFromSelector).bind(context);
  editorInfo.ace_getLinkIdOnFirstPositionSelected = _(getLinkIdOnFirstPositionSelected).bind(context);
  editorInfo.ace_hasLinkOnSelection = _(hasLinkOnSelection).bind(context);
};

exports.aceEditorCSS = hooks.aceEditorCSS;
exports.postAceInit = hooks.postAceInit;
exports.aceAttribsToClasses = hooks.aceAttribsToClasses;
exports.aceEditEvent = hooks.aceEditEvent;
exports.collectContentPre = shared.collectContentPre
