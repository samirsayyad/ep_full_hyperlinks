exports.moduleList = (()=>{

	const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
	const _ = require('ep_etherpad-lite/static/js/underscore');
 
// https://github.com/ogt/valid-url

const validUrl = (function() {
	'use strict';

	// private function
	// internal URI spitter method - direct from RFC 3986
	var splitUri = function(uri) {
			var splitted = uri.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
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

			var splitted = [];
			var scheme = '';
			var authority = '';
			var path = '';
			var query = '';
			var fragment = '';
			var out = '';

			// from RFC 3986
			splitted = splitUri(value);
			scheme = splitted[1]; 
			authority = splitted[2];
			path = splitted[3];
			query = splitted[4];
			fragment = splitted[5];

			// scheme and path are required, though the path can be empty
			if (!(scheme && scheme.length && path.length >= 0)) return;

			// if authority is present, the path must be empty or begin with a /
			if (authority && authority.length) {
					if (!(path.length === 0 || /^\//.test(path))) return;
			} else {
					// if authority is not present, the path must not start with //
					if (/^\/\//.test(path)) return;
			}

			// scheme must begin with a letter, then consist of letters, digits, +, ., or -
			if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase()))  return;

			// re-assemble the URL per section 5.3 in RFC 3986
			out += scheme + ':';
			if (authority && authority.length) {
					out += '//' + authority;
			}

			out += path;

			if (query && query.length) {
					out += '?' + query;
			}

			if (fragment && fragment.length) {
					out += '#' + fragment;
			}

			return out;
	}

	function is_http_iri(value, allowHttps) {
			if (!is_iri(value)) {
					return;
			}

			var splitted = [];
			var scheme = '';
			var authority = '';
			var path = '';
			var port = '';
			var query = '';
			var fragment = '';
			var out = '';

			// from RFC 3986
			splitted = splitUri(value);
			scheme = splitted[1]; 
			authority = splitted[2];
			path = splitted[3];
			query = splitted[4];
			fragment = splitted[5];

			if (!scheme)  return;

			if(allowHttps) {
					if (scheme.toLowerCase() != 'https') return;
			} else {
					if (scheme.toLowerCase() != 'http') return;
			}

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

			out += scheme + ':';
			out += '//' + authority;
			
			if (port) {
					out += port;
			}
			
			out += path;
			
			if(query && query.length){
					out += '?' + query;
			}

			if(fragment && fragment.length){
					out += '#' + fragment;
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
	}

})();

'use strict';

const events = (() => {
  const addTextOnClipboard = (e, ace, padInner, removeSelection, links) => {
    let linkIdOnFirstPositionSelected;
    let hasLinkOnSelection;
    ace.callWithAce((ace) => {
      linkIdOnFirstPositionSelected =
				ace.ace_getLinkIdOnFirstPositionSelected();
      hasLinkOnSelection = ace.ace_hasLinkOnSelection();
    });

    if (hasLinkOnSelection) {
      let linksData;
      const range = padInner.contents()[0].getSelection().getRangeAt(0);
      const rawHtml = createHiddenDiv(range);
      let html = rawHtml;
      const onlyTextIsSelected = selectionHasOnlyText(rawHtml);

      // when the range selection is fully inside a tag, 'rawHtml' will have no HTML tag, so we have to
      // build it. Ex: if we have '<span>ab<b>cdef</b>gh</span>" and user selects 'de', the value of
      // 'rawHtml' will be 'de', not '<b>de</b>'. As it is not possible to have two links in the same text
      // linkIdOnFirstPositionSelected is the linkId in this partial selection
      if (onlyTextIsSelected) {
        const textSelected = rawHtml[0].textContent;
        html = buildHtmlToCopyWhenSelectionHasOnlyText(
            textSelected,
            range,
            linkIdOnFirstPositionSelected
        );
      }
      const linkIds = getLinkIds(html);
      linksData = buildLinksData(html, links);
      const htmlToCopy = replaceLinkIdsWithFakeIds(linksData, html);
      linksData = JSON.stringify(linksData);
      e.originalEvent.clipboardData.setData('text/objectLink', linksData);
      // here we override the default copy behavior
      e.originalEvent.clipboardData.setData('text/html', htmlToCopy);
      e.preventDefault();

      // if it is a cut event we have to remove the selection
      if (removeSelection) {
        padInner.contents()[0].execCommand('delete');
      }
    }
  };

  const buildLinkIdToFakeIdMap = (linksData) => {
    const linkIdToFakeId = {};
    _.each(linksData, (link, fakeLinkId) => {
      const linkId = link.data.originalLinkId;
      linkIdToFakeId[linkId] = fakeLinkId;
    });
    return linkIdToFakeId;
  };

  const replaceLinkIdsWithFakeIds = (linksData, html) => {
    const linkIdToFakeId = buildLinkIdToFakeIdMap(linksData);
    _.each(linkIdToFakeId, (fakeLinkId, linkId) => {
      $(html).find(`.${linkId}`).removeClass(linkId).addClass(fakeLinkId);
    });
    const htmlWithFakeLinkIds = getHtml(html);
    return htmlWithFakeLinkIds;
  };

  const buildLinksData = (html, links) => {
    const linksData = {};
    const originalLinkIds = getLinkIds(html);
    _.each(originalLinkIds, (originalLinkId) => {
      const fakeLinkId = generateFakeLinkId();
      const link = links[originalLinkId];
      link.data.originalLinkId = originalLinkId;
      linksData[fakeLinkId] = link;
    });
    return linksData;
  };

  const generateFakeLinkId = () => `fakelink-${randomString(16)}`;

  const getLinkIds = (html) => {
    const allSpans = $(html).find('span');
    const linkIds = [];
    _.each(allSpans, (span) => {
      const cls = $(span).attr('class');
      const classLinkId = /(?:^| )(lc-[A-Za-z0-9]*)/.exec(cls);
      const linkId = classLinkId ? classLinkId[1] : false;
      if (linkId) {
        linkIds.push(linkId);
      }
    });
    const uniqueLinkIds = _.uniq(linkIds);
    return uniqueLinkIds;
  };

  const createHiddenDiv = (range) => {
    const content = range.cloneContents();
    const div = document.createElement('div');
    const hiddenDiv = $(div).html(content);
    return hiddenDiv;
  };

  const getHtml = (hiddenDiv) => $(hiddenDiv).html();

  const selectionHasOnlyText = (rawHtml) => {
    const html = getHtml(rawHtml);
    const htmlDecoded = htmlDecode(html);
    const text = $(rawHtml).text();
    return htmlDecoded === text;
  };

  const buildHtmlToCopyWhenSelectionHasOnlyText = (text, range, linkId) => {
    const htmlWithSpans = buildHtmlWithTwoSpanTags(text, linkId);
    const html = buildHtmlWithFormattingTagsOfSelection(htmlWithSpans, range);

    const htmlToCopy = $.parseHTML(`<div>${html}</div>`);
    return htmlToCopy;
  };

  const buildHtmlWithFormattingTagsOfSelection = (html, range) => {
    const htmlOfParentNode = range.commonAncestorContainer.parentNode;
    const tags = getTagsInSelection(htmlOfParentNode);

    // this case happens when we got a selection with one or more styling (bold, italic, underline, strikethrough)
    // applied in all selection in the same range. For example, <b><i><u>text</u></i></b>
    if (tags) {
      html = buildOpenTags(tags) + html + buildCloseTags(tags);
    }

    return html;
  };

  // FIXME - Allow to copy a link when user copies only one char
  // This is a hack to preserve the link classes when user pastes a link. When user pastes a span like this
  // <span class='link c-124'>thing</span>, chrome removes the classes and keeps only the style of the class. With links
  // chrome keeps the background-color. To avoid this we create two spans. The first one, <span class='link c-124'>thi</span>
  // has the text until the last but one character and second one with the last character <span class='link c-124'>g</span>.
  // Etherpad does a good job joining the two spans into one after the paste is triggered.
  const buildHtmlWithTwoSpanTags = (text, linkId) => {
    const firstSpan = `<span class="link ${linkId}">${text.slice(
        0,
        -1
    )}</span>`; // text until before last char
    const secondSpan = `<span class="link ${linkId}">${text.slice(-1)}</span>`; // last char

    return firstSpan + secondSpan;
  };

  const buildOpenTags = (tags) => {
    let openTags = '';
    tags.forEach((tag) => {
      openTags += `<${tag}>`;
    });
    return openTags;
  };

  const buildCloseTags = (tags) => {
    let closeTags = '';
    var tags = tags.reverse();
    tags.forEach((tag) => {
      closeTags += `</${tag}>`;
    });
    return closeTags;
  };

  const getTagsInSelection = (htmlObject) => {
    const tags = [];
    let tag;
    if ($(htmlObject)[0].hasOwnProperty('localName')) {
      while ($(htmlObject)[0].localName !== 'span') {
        const html = $(htmlObject).prop('outerHTML');
        const stylingTagRegex = /<(b|i|u|s)>/.exec(html);
        tag = stylingTagRegex ? stylingTagRegex[1] : '';
        tags.push(tag);
        htmlObject = $(htmlObject).parent();
      }
    }
    return tags;
  };

  const saveLinks = (e, padInner) => {
    let links = e.originalEvent.clipboardData.getData('text/objectLink');

    if (links) {
      links = JSON.parse(links);
      saveLink(links);
    } else {
      let clipboardData, pastedData;
      let text = '';

      clipboardData = e.originalEvent.clipboardData || window.clipboardData;
      pastedData = clipboardData.getData('text');
      const pastedDataHtml = clipboardData.getData('text/html');
      const range = padInner.contents()[0].getSelection().getRangeAt(0);

      if (!range) return false;

      if (!pastedDataHtml) {
        if (
          new RegExp(
              '([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?'
          ).test(pastedData)
        ) {
          const expression =
						/(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi;
          const matches = pastedData.match(expression);
          const allLinks = {};
          if (matches) {
            for (match in matches.reverse()) {
              // because of characters position need to be fixed and going to add tags from end
              const result = {};
              const newLinkId = shared.generateLinkId();
              result.link = matches[match];

              // allLinks.push(fakeLinkId)
              allLinks[newLinkId] = {
                data: {
                  author: 'empty',
                  linkId: newLinkId,
                  timestamp: new Date().getTime(),
                  text: result.link,
                  originalLinkId: newLinkId,
                  hyperlink: result.link,
                  headerId: null,
                  date: new Date(),
                  formattedDate: new Date(),
                },
              };
              result.startsAt = pastedData.indexOf(matches[match]);
              const openTag = `<span id="${newLinkId}" class="${newLinkId}">`;
              const closeTag = '</span>';
              pastedData = [
                pastedData.slice(0, result.startsAt),
                openTag,
                pastedData.slice(result.startsAt),
              ].join('');
              result.endsAt =
								pastedData.indexOf(matches[match]) + matches[match].length;
              pastedData = [
                pastedData.slice(0, result.endsAt),
                closeTag,
                pastedData.slice(result.endsAt),
              ].join('');
            }
            pastedData = pastedData.replace(/(?:\r\n|\r|\n)/g, '<br>');
            text = $('<div></div>').html(pastedData);
            padInner
                .contents()[0]
                .execCommand(
                    'insertHTML',
                    false,
                    $('<div>').append($(text).clone()).html()
                );
            pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(
                clientVars.padId,
                allLinks
            );
            e.preventDefault();
          }
        }
      } else {
        // it means pasted in html
        e.preventDefault();
        const pastedHtmlHolderElemenet = document.createElement('div');
        pastedHtmlHolderElemenet.innerHTML = pastedDataHtml;
        const allLinksElement =
					pastedHtmlHolderElemenet.getElementsByTagName('a');
        const allLinksData = {};
        _.each(allLinksElement, (eachElemenet) => {
          const tempHyperLink = eachElemenet.href;
          const tempHyperLinkText = eachElemenet.innerHTML;
          const newLinkId = shared.generateLinkId();
          eachElemenet.className = newLinkId;
          eachElemenet.id = newLinkId;
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
        });
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
      }
    }
  };

  const saveLink = (links) => {
    const linksToSave = {};
    const padId = clientVars.padId;

    const mapOriginalLinksId =
			pad.plugins.ep_full_hyperlinks.mapOriginalLinksId;
    const mapFakeLinks = pad.plugins.ep_full_hyperlinks.mapFakeLinks;

    _.each(links, (link, fakeLinkId) => {
      const linkData = buildLinkData(link, fakeLinkId);
      const newLinkId = shared.generateLinkId();
      mapFakeLinks[fakeLinkId] = newLinkId;
      const originalLinkId = link.data.originalLinkId;
      mapOriginalLinksId[originalLinkId] = newLinkId;
      linksToSave[newLinkId] = link;
    });

    pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(padId, linksToSave);
  };

  const buildLinkData = (link, fakeLinkId) => {
    const linkData = {};
    linkData.padId = clientVars.padId;
    linkData.link = link.data;
    linkData.link.linkId = fakeLinkId;
    return linkData;
  };

  // copied from https://css-tricks.com/snippets/javascript/unescape-html-in-js/
  const htmlDecode = (input) => {
    const e = document.createElement('div');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? '' : e.childNodes[0].nodeValue;
  };

  // here we find the link id on a position [line, column]. This function is used to get the link id
  // of one line when there is ONLY text selected. E.g In the line with link, <span class='link...'>something</span>,
  // and user copies the text 'omethin'. The span tags are not copied only the text. So as the link is
  // applied on the selection we get the linkId using the first position selected of the line.
  // P.S: It's not possible to have two or more links when there is only text selected, because for each link
  // created it's generated a <span> and to copy only the text it MUST NOT HAVE any tag on the selection
  const getLinkIdOnFirstPositionSelected = function () {
    const attributeManager = this.documentAttributeManager;
    const rep = this.rep;
    const linkId = _.object(
        attributeManager.getAttributesOnPosition(rep.selStart[0], rep.selStart[1])
    ).link;
    return linkId;
  };

  const hasLinkOnSelection = function () {
    let hasLink;
    const attributeManager = this.documentAttributeManager;
    const rep = this.rep;
    const firstLineOfSelection = rep.selStart[0];
    const firstColumn = rep.selStart[1];
    const lastColumn = rep.selEnd[1];
    const lastLineOfSelection = rep.selEnd[0];
    const selectionOfMultipleLine = hasMultipleLineSelected(
        firstLineOfSelection,
        lastLineOfSelection
    );

    if (selectionOfMultipleLine) {
      hasLink = hasLinkOnMultipleLineSelection(
          firstLineOfSelection,
          lastLineOfSelection,
          rep,
          attributeManager
      );
    } else {
      hasLink = hasLinkOnLine(
          firstLineOfSelection,
          firstColumn,
          lastColumn,
          attributeManager
      );
    }
    return hasLink;
  };

  const hasLinkOnMultipleLineSelection = (
      firstLineOfSelection,
      lastLineOfSelection,
      rep,
      attributeManager
  ) => {
    let foundLineWithLink = false;
    for (
      let line = firstLineOfSelection;
      line <= lastLineOfSelection && !foundLineWithLink;
      line++
    ) {
      const firstColumn = getFirstColumnOfSelection(
          line,
          rep,
          firstLineOfSelection
      );
      const lastColumn = getLastColumnOfSelection(
          line,
          rep,
          lastLineOfSelection
      );
      const hasLink = hasLinkOnLine(
          line,
          firstColumn,
          lastColumn,
          attributeManager
      );
      if (hasLink) {
        foundLineWithLink = true;
      }
    }
    return foundLineWithLink;
  };

  const getFirstColumnOfSelection = (line, rep, firstLineOfSelection) => line !== firstLineOfSelection ? 0 : rep.selStart[1];

  const getLastColumnOfSelection = (line, rep, lastLineOfSelection) => {
    let lastColumnOfSelection;
    if (line !== lastLineOfSelection) {
      lastColumnOfSelection = getLength(line, rep); // length of line
    } else {
      lastColumnOfSelection = rep.selEnd[1] - 1; // position of last character selected
    }
    return lastColumnOfSelection;
  };

  const hasLinkOnLine = (
      lineNumber,
      firstColumn,
      lastColumn,
      attributeManager
  ) => {
    let foundLinkOnLine = false;
    for (
      let column = firstColumn;
      column <= lastColumn && !foundLinkOnLine;
      column++
    ) {
      const linkId = _.object(
          attributeManager.getAttributesOnPosition(lineNumber, column)
      ).link;
      if (linkId !== undefined) {
        foundLinkOnLine = true;
      }
    }
    return foundLinkOnLine;
  };

  const hasMultipleLineSelected = (firstLineOfSelection, lastLineOfSelection) => firstLineOfSelection !== lastLineOfSelection;

  const getLength = (line, rep) => {
    const nextLine = line + 1;
    const startLineOffset = rep.lines.offsetOfIndex(line);
    const endLineOffset = rep.lines.offsetOfIndex(nextLine);

    // lineLength without \n
    const lineLength = endLineOffset - startLineOffset - 1;

    return lineLength;
  };

  return {
    addTextOnClipboard,
    getLinkIdOnFirstPositionSelected,
    hasLinkOnSelection,
    saveLinks,
  };
})();

'use strict'

const linkBoxes = (() => {
	let padOuter;
	const getPadOuter = () =>
		(padOuter = padOuter || $('iframe[name="ace_outer"]').contents());

	const getLinksContainer = () => getPadOuter().find("#linkBoxWrapper");

	/* ***** Public methods: ***** */

	const showLink = (linkId) => getLinksContainer().find(`#${linkId}`).show();

	const hideLink = (linkId) => {
		getLinksContainer().find(`#${linkId}`).hide();
		padOuter.find(`#show-form-${linkId}`).show();
		padOuter.find(`#edit-form-${linkId}`).hide();
	};

	const hideAllLinks = () => getLinksContainer().find(`.link-container`).hide();

	const showLinkModal = (e, linkObj, socket) => {
		const padOuter = $('iframe[name="ace_outer"]').contents();
		const padInner = getPadOuter().find('iframe[name="ace_inner"]');
		const linkId = linkObj.linkId;
		const linkModalAppended =
			getLinksContainer().find(`#${linkId}`).length === 0 ? false : true;

		hideAllLinks();

		// find link modal, if does not exist create a link modal
		let linkModal = getLinksContainer().find(`#${linkId}`);
		if (!linkModalAppended)
			linkModal = $("#linkBoxTemplate").tmpl({ ...linkObj });

		// apppend modal position! where it want appear
		let targetLeft = e.clientX;
		targetLeft += padInner.offset().left;
		let targetTop = $(e.target).offset().top;
		targetTop += parseInt(padInner.css("padding-top").split("px")[0]);
		targetTop += parseInt(
			padOuter.find("#outerdocbody").css("padding-top").split("px")[0]
		);

		linkModal.css({ width: "324px" }); // because of need to determine exact size for putting best area
		linkModal.css({ left: `${parseInt(targetLeft)}px` });
		linkModal.css({ top: `${parseInt(targetTop) + 35}px` });
		linkModal.addClass("hyperlink-display");

		const loaded = linkModal.attr("data-loaded");

		// if the linkModal was not appended, create a modal and append it to #linkBoxWrapper
		if (!linkModalAppended) {
			padOuter.find("#linkBoxWrapper").append(linkModal);
		} else {
			// if the modal was exist update text and hypertext
			linkModal.show();
			// if the old hyperlink was not same as new hyperlink
			if (linkObj.hyperlink !== linkModal.find("#ep_hyperlink_title").attr("href")) {
				linkModal.attr("data-loaded", "false");
			}



			linkModal.attr("data-hyperlink", linkObj.hyperlink);
			linkModal.find("input#hyperlink-url").val(linkObj.hyperlink);


			linkModal.find("a#ep_hyperlink_title").attr({
				title: linkObj.hyperlink,
				href: linkObj.hyperlink,
			});
		}

		// If the text we saved has changed and is different from the contents of the pad
		const text = padInner.contents().find(`.${linkId}`).text()
		linkModal.find("input#hyperlink-text-hidden").val(text);
		linkModal.find("input#hyperlink-text").val(text);

		// TODO: 1/ hyperlink for social and
		// TODO: 2/ inside link
		if (loaded != "true") {
			let hyperlink = linkObj.hyperlink || linkModal.attr("data-hyperlink");
			console.log(hyperlink)
			let dividedUrl;
			try {
				dividedUrl = new URL(hyperlink);
			} catch (error) {
				console.error(`[hyperlink]: ${error}`);
				linkBoxes.hideLink(linkId);
				return
			}


			const ep_hyperlink_img = linkModal.find("#ep_hyperlink_img");
			const ep_hyperlink_title = linkModal.find("#ep_hyperlink_title");
			const card_loading_hyperlink = linkModal.find("#card_loading_hyperlink");
			const ep_hyperlink_description = linkModal.find(
				"#ep_hyperlink_description"
			);

			ep_hyperlink_description.text("");
			ep_hyperlink_title.text(hyperlink);

			ep_hyperlink_img.hide();
			ep_hyperlink_title.show();
			card_loading_hyperlink.show();

			// raise for og:title resolving

			if (!/^http:\/\//.test(hyperlink) && !/^https:\/\//.test(hyperlink)) {
				hyperlink = `https://${hyperlink}`;
			}

			const changeMetaView = function (hyperlink, title, image) {
				ep_hyperlink_img.attr("src", image);
				ep_hyperlink_img.on("load", () => {
					card_loading_hyperlink.fadeOut(500, () => {
						ep_hyperlink_img.fadeIn();
						ep_hyperlink_title.text(
							title.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
						);
						ep_hyperlink_description.text(
							hyperlink.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "")
						);
						linkModal.attr({ "data-loaded": true });
					});
				});
			};
			
			if (!validUrl.isUri(hyperlink)) {
				const img =
					"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png";
				changeMetaView(hyperlink, hyperlink, img);
				return false;
			}
			// ........
			const metaResolverCallBack = function (result) {
				//ep_hyperlink_title.attr('href', hyperlink);

				if (result.metadata.image && result.metadata.title) {
					changeMetaView(
						hyperlink,
						result.metadata.title,
						result.metadata.image
					);
				} else {
					var editedHyperlink = `https://${dividedUrl.hostname}`;
					if (result.last !== true) {
						socket.emit(
							"metaResolver",
							{ padId: clientVars.padId, editedHyperlink, last: true },
							metaResolverCallBack
						);
					} else {
						changeMetaView(
							hyperlink,
							result.metadata.title || hyperlink,
							"../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png"
						);
					}
				}
			};
			// ........
			switch (dividedUrl.hostname) {
				case "twitter.com":
					changeMetaView(
						hyperlink,
						hyperlink,
						"../static/plugins/ep_full_hyperlinks/static/dist/img/twitter.png"
					);
					break;
				default:
					socket.emit(
						"metaResolver",
						{ padId: clientVars.padId, hyperlink, last: false },
						metaResolverCallBack
					);
			}
		}
	};

	// Indicates if event was on one of the elements that does not close link
	const shouldNotCloseLink = function (e) {
		// a link box
		if (
			$(e.target).closest(".link").length ||
			$(e.target).closest(".link-modal").length ||
			$(e.target).closest(".ep_hyperlink_docs_bubble_button_edit").length ||
			$(e.target).closest(".ep_hyperlink_docs_bubble_button_delete").length ||
			$(e.target).closest(".ep_hyperlink_docs_bubble_button_copy").length ||
			$(e.target).closest(".full-display-link").length ||
			$(e.target).closest(".link-title-wrapper").length ||
			$(e.target).closest(".link-edit-form").length ||
			$(e.target).closest(".link-text-text").length ||
			$(e.target).closest(".link-text-hyperlink").length
		) {
			// the link modal
			return true;
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
	};
})();

'use strict'

const newLink = (() => {
  // Create a link object with data filled on the given form
  const buildLinkFrom = (form) => {
    const text = form.find('#hyperlink-text').val();
    const oldText = form.find('#hyperlink-text-hidden').val();
    let hyperlink = form.find('#hyperlink-url').val();

    if (!/^http:\/\//.test(hyperlink) && !/^https:\/\//.test(hyperlink)) {
      hyperlink = `https://${hyperlink}`;
    }

    return {
      text,
      oldText,
      hyperlink,
    };
  };

  // Callback for new link Cancel
  const cancelNewLink = () => hideNewLinkPopup();

  // Callback for new link Submit
  const submitNewLink = function (callback) {
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

    return newLinkPopup;
  };

  const showNewLinkPopup = () => {
    // position below link icon
    $('#newLink').css('left', $('.toolbar .addLink').offset().left);

    // Reset form to make sure it is all clear
    $('#newLink').find('textarea').val('');
    $('#newLink').find('.link-content, .to-value').removeClass('error');

    // Show popup
    $('#newLink').addClass('popup-show');

    // mark selected text, so it is clear to user which text range the link is being applied to
    pad.plugins.ep_full_hyperlinks.preLinkMarker.markSelectedText();

    // focus on hyperlink input

    setTimeout(() => {
      $('#newLink').find('.link-content').focus().select();
    }, 500);
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

  const generateLinkId = function () {
    const linkId = `lc-${randomString(16)}`;
    return linkId;
  };

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