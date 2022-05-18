exports.moduleList = (()=>{

	const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
	const _ = require('ep_etherpad-lite/static/js/underscore');
 
// https://github.com/ogt/valid-url

const validUrl = (function () {
  'use strict';

  // private function
  // internal URI spitter method - direct from RFC 3986
  const splitUri = function (uri) {
    const splitted = uri.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
    return splitted;
  };

  function is_iri(value) {
    if (!value) {
      return;
    }

    // check for illegal characters
    if (/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(value)) return;

    // check for hex escapes that aren't complete
    if (/%[^0-9a-f]/i.test(value)) return;
    if (/%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)) return;

    let splitted = [];
    let scheme = '';
    let authority = '';
    let path = '';
    let query = '';
    let fragment = '';
    let out = '';

    // from RFC 3986
    splitted = splitUri(value);
    scheme = splitted[1];
    authority = splitted[2];
    path = splitted[3];
    query = splitted[4];
    fragment = splitted[5];

    // if authority is present, the path must be empty or begin with a /
    if (authority && authority.length) {
      if (!(path.length === 0 || /^\//.test(path))) return;
    } else {
      // if authority is not present, the path must not start with //
      if (/^\/\//.test(path)) return;
    }

    if (scheme && scheme.length) {
      // scheme must begin with a letter, then consist of letters, digits, +, ., or -
      if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase())) return;
    }

    // re-assemble the URL per section 5.3 in RFC 3986
    if (scheme && scheme.length) {
      out += `${scheme}:`;
    }
    if (authority && authority.length) {
      out += `//${authority}`;
    }

    out += path;

    if (query && query.length) {
      out += `?${query}`;
    }

    if (fragment && fragment.length) {
      out += `#${fragment}`;
    }

    return out;
  }

  function is_http_iri(value, allowHttps) {
    if (!is_iri(value)) {
      return;
    }

    let splitted = [];
    let scheme = '';
    let authority = '';
    let path = '';
    let port = '';
    let query = '';
    let fragment = '';
    let out = '';

    // from RFC 3986
    splitted = splitUri(value);
    scheme = splitted[1];
    authority = splitted[2];
    path = splitted[3];
    query = splitted[4];
    fragment = splitted[5];

    if (!scheme) return;

    if (allowHttps) {
      if (scheme.toLowerCase() != 'https') return;
    } else if (scheme.toLowerCase() != 'http') { return; }

    // fully-qualified URIs must have an authority section that is
    // a valid host
    if (!authority) {
      return;
    }

    // enable port component
    if (/:(\d+)$/.test(authority)) {
      port = authority.match(/:(\d+)$/)[0];
      authority = authority.replace(/:\d+$/, '');
    }

    out += `${scheme}:`;
    out += `//${authority}`;

    if (port) {
      out += port;
    }

    out += path;

    if (query && query.length) {
      out += `?${query}`;
    }

    if (fragment && fragment.length) {
      out += `#${fragment}`;
    }

    return out;
  }

  function is_https_iri(value) {
    return is_http_iri(value, true);
  }

  function is_web_iri(value) {
    return (is_http_iri(value) || is_https_iri(value));
  }

  return {
    is_uri: is_iri,
    is_http_uri: is_http_iri,
    is_https_uri: is_https_iri,
    is_web_uri: is_web_iri,
    isUri: is_iri,
    isHttpUri: is_http_iri,
    isHttpsUri: is_https_iri,
    isWebUri: is_web_iri,
  };
})();

'use strict';

const events = (() => {
  const getSelectionFormated = (padInner, links) => {
    const selection = padInner[0].contentWindow.getSelection().getRangeAt(0);
    const selectedElements = document.createElement('div');

    selectedElements.append(selection.cloneContents());

    try {
      selectedElements.querySelectorAll('.link').forEach((el) => {
        const cls = el.getAttribute('class');
        const classLinkId = /(?:^| )(lc-[A-Za-z0-9]*)/.exec(cls);
        const lindId = classLinkId[1];

        let newTag;

        if (!links[lindId]) {
          newTag = document.createElement('span');
          newTag.innerHTML = el.innerHTML;
        } else {
        // create a tag
          newTag = document.createElement('a');
          newTag.innerHTML = el.innerHTML;
          newTag.setAttribute('href', links[lindId].data.hyperlink);
        }

        // replace the current node with href node
        const span = selectedElements.querySelector(`.${lindId}`);
        span.replaceWith(newTag);
      });
    } catch (error) {
      console.error('[ep_full_hyperlinks]: copy data has an error', error);
    }

    return selectedElements;
  };

  const addTextOnClipboard = (e, padInner, removeSelection, links) => {
    e.preventDefault();
    const getFormatedHrefElements = getSelectionFormated(padInner, links);

    e.originalEvent.clipboardData.setData('text/html', getFormatedHrefElements.outerHTML);

    // if it is a cut event we have to remove the selection
    if (removeSelection) {
      padInner.contents()[0].execCommand('delete');
    }
  };

  const makeClipboarRedyForSaveLinks = (e, padInner) => {
    const clipboardData = e.originalEvent.clipboardData;
    const pastedDataHtml = clipboardData.getData('text/html');
    const range = padInner.contents()[0].getSelection().getRangeAt(0);

    if (!range) return false;

    e.preventDefault();
    const pastedHtmlHolderElemenet = document.createElement('div');
    pastedHtmlHolderElemenet.innerHTML = pastedDataHtml;
    const allLinksElement = pastedHtmlHolderElemenet.getElementsByTagName('a');
    const allLinksData = {};

    for (const element of allLinksElement) {
      const tempHyperLink = element.href;
      const tempHyperLinkText = element.innerHTML;
      const newLinkId = shared.generateLinkId();
      element.className = newLinkId;
      element.id = newLinkId;
      allLinksData[newLinkId] = {
        data: {
          author: 'empty',
          linkId: newLinkId,
          timestamp: new Date().getTime(),
          text: tempHyperLinkText,
          originalLinkId: newLinkId,
          hyperlink: tempHyperLink,
          headerId: null,
          date: new Date(),
          formattedDate: new Date(),
        },
      };
    }

    pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(
        clientVars.padId,
        allLinksData
    );

    padInner
        .contents()[0]
        .execCommand(
            'insertHTML',
            false,
            $('<div>').append($(pastedHtmlHolderElemenet).clone()).html()
        );
  };

  const saveLinks = (e, padInner) => {
    makeClipboarRedyForSaveLinks(e, padInner);
  };

  return {
    addTextOnClipboard,
    saveLinks,
  };
})();

'use strict';

const linkBoxes = (() => {
  let padOuter;
  const getPadOuter = () => (padOuter = padOuter || $('iframe[name="ace_outer"]').contents());

  const getLinksContainer = () => getPadOuter().find('#linkBoxWrapper');

  /* ***** Public methods: ***** */

  const showLink = (linkId) => getLinksContainer().find(`#${linkId}`).show();

  const hideLink = (linkId) => {
    getLinksContainer().find(`#${linkId}`).hide();
    padOuter.find(`#show-form-${linkId}`).show();
    padOuter.find(`#edit-form-${linkId}`).hide();
  };

  const hideAllLinks = () => getLinksContainer().find('.link-container').hide();


  const getPosition = (e) => {
    let posx = 0;
    let posy = 0;

    if (!e) e = window.event;

    if (e.pageX || e.pageY) {
      posx = e.pageX;
      posy = e.pageY;
    } else if (e.clientX || e.clientY) {
      posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

    return {x: posx, y: posy};
  };


  const setPositionModal = (e, linkModal, padInner) => {
    const clickCoords = getPosition(e);
    const clickCoordsX = clickCoords.x;
    const clickCoordsY = clickCoords.y;

    const modalWith = linkModal.innerWidth();
    const modalHeight = linkModal.outerHeight(true);

    const windowWidth = padInner.innerWidth();
    const windowHeight = padInner.outerHeight(true);

    const windoPaddingTop = parseInt(padInner.css('padding-top'));
    const linkElementTop = parseInt($(e.target).offset().top);
    const linkElementHeight = parseInt($(e.target).outerHeight(true));

    let newL = e.clientX + padInner.offset().left;
    let newT = linkElementTop + linkElementHeight + (windoPaddingTop / 2);

    if ((windowWidth - clickCoordsX) < modalWith) {
      newL = windowWidth - modalWith - 16;
    }

    if ((windowHeight - clickCoordsY) < modalHeight) {
      newT = windowHeight - modalHeight;
    }

    if (!$('body').hasClass('mobileView')) {
      newT += 35;
    }

    linkModal.css({left: `${newL}px`, top: `${newT}px`});
  };


  const showLinkModal = (e, linkObj, socket) => {
    const padOuter = $('iframe[name="ace_outer"]').contents();
    const padInner = getPadOuter().find('iframe[name="ace_inner"]');
    const linkId = linkObj.linkId;
    const linkModalAppended =
			getLinksContainer().find(`#${linkId}`).length === 0 ? false : true;

    hideAllLinks();

    if (!linkObj.hyperlink) {
      console.error('[hyperlink]: link does not exist', linkObj);
      return false;
    }

    // find link modal, if does not exist create a link modal
    let linkModal = getLinksContainer().find(`#${linkId}`);
    if (!linkModalAppended) linkModal = $('#linkBoxTemplate').tmpl({...linkObj});

    const loaded = linkModal.attr('data-loaded');

    // if the linkModal was not appended, create a modal and append it to #linkBoxWrapper
    if (!linkModalAppended) {
      padOuter.find('#linkBoxWrapper').append(linkModal);
    } else {
      // if the modal was exist update text and hypertext
      linkModal.show();
      // if the old hyperlink was not same as new hyperlink
      if (linkObj.hyperlink !== linkModal.find('a.ep_hyperlink_title').attr('href')) {
        linkModal.attr('data-loaded', 'false');
      }

      linkModal.attr('data-hyperlink', linkObj.hyperlink);
      linkModal.find('input#hyperlink-url').val(linkObj.hyperlink);

      linkModal.find('a.ep_hyperlink_title').attr({
        title: linkObj.hyperlink,
        href: linkObj.hyperlink,
      });
    }

    // If the text we saved has changed and is different from the contents of the pad
    const text = padInner.contents().find(`.${linkId}`).text();
    linkModal.find('input#hyperlink-text-hidden').val(text);
    linkModal.find('input#hyperlink-text').val(text);

    // TODO: 1/ hyperlink for social and
    // TODO: 2/ inside link
    if (loaded != 'true') {
      let hyperlink = linkObj.hyperlink || linkModal.attr('data-hyperlink');
      if (!/^http:\/\//.test(hyperlink) && !/^https:\/\//.test(hyperlink) && !/^ftp:\/\//.test(hyperlink)) {
        hyperlink = `https://${hyperlink}`;
      }
      let dividedUrl;
      try {
        dividedUrl = new URL(hyperlink);
      } catch (error) {
        console.error(`[hyperlink]: ${error}`);
        linkBoxes.hideLink(linkId);
        return;
      }

      const ep_hyperlink_img = linkModal.find('#ep_hyperlink_img');
      const ep_hyperlink_title = linkModal.find('a.ep_hyperlink_title');
      const card_loading_hyperlink = linkModal.find('#card_loading_hyperlink');
      const ep_hyperlink_description = linkModal.find(
          '#ep_hyperlink_description'
      );

      ep_hyperlink_description.text('');
      ep_hyperlink_title.text(hyperlink);

      ep_hyperlink_img.hide();
      ep_hyperlink_title.show();
      card_loading_hyperlink.show();

      // raise for og:title resolving

      const changeMetaView = function (hyperlink, title, image) {
        ep_hyperlink_img.attr('src', image);
        ep_hyperlink_img.on('load', () => {
          card_loading_hyperlink.fadeOut(500, () => {
            ep_hyperlink_img.fadeIn();
            ep_hyperlink_title.text(
                title.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
            );
            ep_hyperlink_description.text(
                hyperlink.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
            );
            linkModal.attr({'data-loaded': true});
          });
        });
      };

      if (!validUrl.isUri(hyperlink)) {
        const img =
					'../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png';
        changeMetaView(hyperlink, hyperlink, img);
        return false;
      }
      // ........
      const metaResolverCallBack = function (result) {
        if (result.metadata.image && result.metadata.title) {
          changeMetaView(
              hyperlink,
              result.metadata.title,
              result.metadata.image
          );
        } else {
          const editedHyperlink = `https://${dividedUrl.hostname}`;
          if (result.last !== true) {
            socket.emit(
                'metaResolver',
                {padId: clientVars.padId, editedHyperlink, last: true},
                metaResolverCallBack
            );
          } else {
            changeMetaView(
                hyperlink,
                result.metadata.title || hyperlink,
                '../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png'
            );
          }
        }
      };
      // ........
      switch (dividedUrl.hostname) {
        case 'twitter.com':
          changeMetaView(
              hyperlink,
              hyperlink,
              '../static/plugins/ep_full_hyperlinks/static/dist/img/twitter.png'
          );
          break;
        default:
          socket.emit(
              'metaResolver',
              {padId: clientVars.padId, hyperlink, last: false},
              metaResolverCallBack
          );
      }
    }

    setPositionModal(e, linkModal, padInner);
    linkModal.addClass('hyperlink-display');
  };

  // Indicates if event was on one of the elements that does not close link
  const shouldNotCloseLink = function (e) {
    // a link box
    if (
      $(e.target).closest('.link').length ||
			$(e.target).closest('.link-modal').length ||
			$(e.target).closest('.ep_hyperlink_docs_bubble_button_edit').length ||
			$(e.target).closest('.ep_hyperlink_docs_bubble_button_delete').length ||
			$(e.target).closest('.ep_hyperlink_docs_bubble_button_copy').length ||
			$(e.target).closest('.full-display-link').length ||
			$(e.target).closest('.link-title-wrapper').length ||
			$(e.target).closest('.link-edit-form').length ||
			$(e.target).closest('.link-text-text').length ||
			$(e.target).closest('.link-text-hyperlink').length
    ) {
      // the link modal
      return true;
    }
    return false;
  };

  const isLinkInternal = (url) => {
    const incomeURL = new URL(url);
    let result = false;

    // 1/ check the origin
    if (incomeURL.origin !== location.origin) return false;


    // 2/ origin the same but diff pad name
    // check if the income url related to filter url
    if (incomeURL.origin === location.origin) {
      // does have p
      const doesPInURL = location.pathname.split('/').indexOf('p') > 0;
      const padName = clientVars.padId;
      const padMainPathname = doesPInURL ? `/p/${padName}` : `/${padName}`;
      // check if the income url pad name is the same current pad name
      if (location.pathname.substring(0, padMainPathname.length) === padMainPathname) result = true;

      // does single pad active
      if (clientVars.ep_singlePad.active) result = true;
    }

    return result;
  };

  const doesLinkHaveFilter = (url) => {
    const result = [];
    const padName = clientVars.padId;

    const currentPathname = url.pathname.split('/');

    let padNameIndex = currentPathname.indexOf(padName) + 1;

    if (clientVars.ep_singlePad.active) padNameIndex = 0;

    const filters = [...currentPathname].splice(padNameIndex, currentPathname.length - 1);

    result.push(...filters);

    return result;
  };

  // internal link
  // other plugin must listen for pushstate to get new data and excute they part.
  const internalLinkClick = function (event) {
    event.preventDefault();
    event.stopPropagation();
    const href = $(this).attr('href');

    if (isLinkInternal(href)) {
      const incomeURL = new URL(href);
      let targetPath = `${incomeURL.search}`;
      const filters = doesLinkHaveFilter(incomeURL);

      if (filters.length > 0) {
        const doesPInURL = location.pathname.split('/').indexOf('p') > 0;
        targetPath = doesPInURL ? '/p' : '';
        if (!clientVars.ep_singlePad.active) targetPath += `/${clientVars.padId}`;
        targetPath += `/${filters.join('/')}${incomeURL.search}`;
      }

      if (incomeURL.search.length === 0) targetPath = href;

      // The Target is which plugin should listen more for more functionality
      // In this example, if we find a slug filter in your URL,
      // the target should be the filter plugin
      const tartge = filters.length > 0 ? 'filter' : 'other';

      window.history.pushState({type: 'hyperLink', href, target: tartge}, document.title, targetPath);
      // close all link
      hideAllLinks();
    } else {
      window.open(href, '_blank');
    }
    return false;
  };

  return {
    showLink,
    hideLink,
    hideAllLinks,
    showLinkModal,
    getLinksContainer,
    shouldNotCloseLink,
    internalLinkClick,
  };
})();

'use strict';

const newLink = (() => {
  // Create a link object with data filled on the given form
  const buildLinkFrom = (form) => {
    const text = form.find('#hyperlink-text').val();
    const oldText = form.find('#hyperlink-text-hidden').val();
    const hyperlink = form.find('#hyperlink-url').val();

    return {
      text,
      oldText,
      hyperlink,
    };
  };

  // Callback for new link Cancel
  const cancelNewLink = () => hideNewLinkPopup();

  // Callback for new link Submit
  const submitNewLink = (callback) => {
    const index = 0;
    const form = $(document).find('#newLink');
    const link = buildLinkFrom(form);
    if (link.text.length > 0 && validUrl.isUri(link.hyperlink)) {
      form.find('#hyperlink-text, #hyperlink-url').removeClass('error');
      hideNewLinkPopup();
      callback(link, index);
    } else {
      if (link.text.length === 0) form.find('#hyperlink-text').addClass('error');
      if (!validUrl.isUri(link.hyperlink)) form.find('#hyperlink-url').addClass('error');
    }
    return false;
  };

  /* ***** Public methods: ***** */

  // Insert new Link Form
  const insertNewLinkPopupIfDontExist = (link, callback) => {
    $('#newLink').remove();
    link.linkId = '';
    const newLinkPopup = $('#newLinkTemplate').tmpl(link);
    newLinkPopup.appendTo($('#editorcontainerbox'));

    // Cancel btn
    $('#newLink #link-cancel-btn').on('click', (e) => cancelNewLink());

    // Create btn // link-create-btn
    $('#newLink #link-create-btn').on('click', (e) => submitNewLink(callback));

    $(document).on('submit', 'form.link-edit-form', (e) => {
      e.preventDefault();
      submitNewLink(callback);
    });

    return newLinkPopup;
  };

  const showNewLinkPopup = () => {
    if (!$('body').hasClass('mobileView')) {
      // position below link icon
      $('#newLink').css('left', $('.toolbar .addLink').offset().left);
    }


    // Reset form to make sure it is all clear
    $('#newLink').find('textarea').val('');
    $('#newLink').find('.link-content, .to-value').removeClass('error');

    // Show popup
    $('#newLink').addClass('popup-show');

    // mark selected text, so it is clear to user which text range the link is being applied to
    pad.plugins.ep_full_hyperlinks.preLinkMarker.markSelectedText();

    // focus on hyperlink input
    setTimeout(() => $('#newLink #hyperlink-url').focus().select(), 500);
  };

  const hideNewLinkPopup = () => {
    $('#newLink').removeClass('popup-show');

    // force focus to be lost, so virtual keyboard is hidden on mobile devices
    $('#newLink').find(':focus').blur();

    // unmark selected text, as now there is no text being linked
    pad.plugins.ep_full_hyperlinks.preLinkMarker.unmarkSelectedText();
  };

  return {
    // localizenewLinkPopup,
    insertNewLinkPopupIfDontExist,
    showNewLinkPopup,
    hideNewLinkPopup,
  };
})();

'use strict';

const preLinkMark = (() => {
  const MARK_CLASS = 'pre-selected-link';

  const preLinkMarker = function (ace) {
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

  // Indicates if Etherpad is configured to highlight text
  preLinkMarker.prototype.highlightSelectedText = function () {
    return clientVars.highlightSelectedText;
  };

  preLinkMarker.prototype.markSelectedText = function () {
    // do nothing if this feature is not enabled
    if (!this.highlightSelectedText()) return;

    this.ace.callWithAce(doNothing, 'markPreSelectedTextToLink', true);
  };

  preLinkMarker.prototype.unmarkSelectedText = function () {
    // do nothing if this feature is not enabled
    if (!this.highlightSelectedText()) return;

    this.ace.callWithAce(doNothing, 'unmarkPreSelectedTextToLink', true);
  };

  preLinkMarker.prototype.performNonUnduableEvent = function (eventType, callstack, action) {
    callstack.startNewEvent('nonundoable');
    action();
    callstack.startNewEvent(eventType);
  };

  preLinkMarker.prototype.handleMarkText = function (context) {
    const editorInfo = context.editorInfo;
    const rep = context.rep;
    const callstack = context.callstack;

    // first we need to unmark any existing text, otherwise we'll have 2 text ranges marked
    this.removeMarks(editorInfo, rep, callstack);

    this.addMark(editorInfo, callstack);
  };

  preLinkMarker.prototype.handleUnmarkText = function (context) {
    const editorInfo = context.editorInfo;
    const rep = context.rep;
    const callstack = context.callstack;

    this.removeMarks(editorInfo, rep, callstack);
  };

  preLinkMarker.prototype.addMark = function (editorInfo, callstack) {
    const eventType = callstack.editEvent.eventType;

    // we don't want the text marking to be undoable
    this.performNonUnduableEvent(eventType, callstack, () => {
      editorInfo.ace_setAttributeOnSelection(MARK_CLASS, clientVars.userId);
    });
  };

  preLinkMarker.prototype.removeMarks = function (editorInfo, rep, callstack) {
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

  // we do nothing on callWithAce; actions will be handled on aceEditEvent
  const doNothing = () => {};

  const init = (ace) => new preLinkMarker(ace);

  return {
    MARK_CLASS,
    init,
  };
})();

'use strict';

const shared = (() => {
  const collectContentPre = (hook, context) => {
    const link = /(?:^| )(lc-[A-Za-z0-9]*)/.exec(context.cls);
    const fakeLink = /(?:^| )(fakelink-[A-Za-z0-9]*)/.exec(context.cls);

    if (link && link[1]) {
      context.cc.doAttrib(context.state, `link::${link[1]}`);
    }

    // a fake link is a link copied from this or another pad. To avoid conflicts
    // with existing links, a fake linkId is used, so then we generate a new one
    // when the link is saved
    if (fakeLink) {
      const mapFakeLinks = pad.plugins.ep_full_hyperlinks.getMapfakeLinks();
      const fakeLinkId = fakeLink[1];
      const linkId = mapFakeLinks[fakeLinkId];
      context.cc.doAttrib(context.state, `link::${linkId}`);
    }

    return [];
  };

  const generateLinkId = () => `lc-${randomString(16)}`;

  return {
    collectContentPre,
    generateLinkId,
  };
})();
return {
validUrl
,events
,linkBoxes
,newLink
,preLinkMark
,shared
}
})();