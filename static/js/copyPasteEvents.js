const events = (() => {

	const addTextOnClipboard = function (e, ace, padInner, removeSelection, links, replies) {
		let linkIdOnFirstPositionSelected;
		let hasLinkOnSelection;
		ace.callWithAce((ace) => {
			linkIdOnFirstPositionSelected = ace.ace_getLinkIdOnFirstPositionSelected();
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
				html = buildHtmlToCopyWhenSelectionHasOnlyText(textSelected, range, linkIdOnFirstPositionSelected);
			}
			const linkIds = getLinkIds(html);
			linksData = buildLinksData(html, links);
			const htmlToCopy = replaceLinkIdsWithFakeIds(linksData, html);
			linksData = JSON.stringify(linksData);
			let replyData = getReplyData(replies, linkIds);
			replyData = JSON.stringify(replyData);
			e.originalEvent.clipboardData.setData('text/objectReply', replyData);
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
	
	var getReplyData = function (replies, linkIds) {
		let replyData = {};
		_.each(linkIds, (linkId) => {
			replyData = _.extend(getRepliesFromLinkId(replies, linkId), replyData);
		});
		return replyData;
	};
	
	var getRepliesFromLinkId = function (replies, linkId) {
		const repliesFromLinkID = {};
		_.each(replies, (reply, replyId) => {
			if (reply.linkId === linkId) {
				repliesFromLinkID[replyId] = reply;
			}
		});
		return repliesFromLinkID;
	};
	
	var buildLinkIdToFakeIdMap = function (linksData) {
		const linkIdToFakeId = {};
		_.each(linksData, (link, fakeLinkId) => {
			const linkId = link.data.originalLinkId;
			linkIdToFakeId[linkId] = fakeLinkId;
		});
		return linkIdToFakeId;
	};
	
	var replaceLinkIdsWithFakeIds = function (linksData, html) {
		const linkIdToFakeId = buildLinkIdToFakeIdMap(linksData);
		_.each(linkIdToFakeId, (fakeLinkId, linkId) => {
			$(html).find(`.${linkId}`).removeClass(linkId).addClass(fakeLinkId);
		});
		const htmlWithFakeLinkIds = getHtml(html);
		return htmlWithFakeLinkIds;
	};
	
	var buildLinksData = function (html, links) {
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
	
	var generateFakeLinkId = function () {
		const linkId = `fakelink-${randomString(16)}`;
		return linkId;
	};
	
	var getLinkIds = function (html) {
		const allSpans = $(html).find('span');
		const linkIds = [];
		_.each(allSpans, (span) => {
			const cls = $(span).attr('class');
			const classLinkId = /(?:^| )(lc-[A-Za-z0-9]*)/.exec(cls);
			const linkId = (classLinkId) ? classLinkId[1] : false;
			if (linkId) {
				linkIds.push(linkId);
			}
		});
		const uniqueLinkIds = _.uniq(linkIds);
		return uniqueLinkIds;
	};
	
	var createHiddenDiv = function (range) {
		const content = range.cloneContents();
		const div = document.createElement('div');
		const hiddenDiv = $(div).html(content);
		return hiddenDiv;
	};
	
	var getHtml = function (hiddenDiv) {
		return $(hiddenDiv).html();
	};
	
	var selectionHasOnlyText = function (rawHtml) {
		const html = getHtml(rawHtml);
		const htmlDecoded = htmlDecode(html);
		const text = $(rawHtml).text();
		return htmlDecoded === text;
	};
	
	var buildHtmlToCopyWhenSelectionHasOnlyText = function (text, range, linkId) {
		const htmlWithSpans = buildHtmlWithTwoSpanTags(text, linkId);
		const html = buildHtmlWithFormattingTagsOfSelection(htmlWithSpans, range);
	
		const htmlToCopy = $.parseHTML(`<div>${html}</div>`);
		return htmlToCopy;
	};
	
	var buildHtmlWithFormattingTagsOfSelection = function (html, range) {
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
	var buildHtmlWithTwoSpanTags = function (text, linkId) {
		const firstSpan = `<span class="link ${linkId}">${text.slice(0, -1)}</span>`; // text until before last char
		const secondSpan = `<span class="link ${linkId}">${text.slice(-1)}</span>`; // last char
	
		return firstSpan + secondSpan;
	};
	
	var buildOpenTags = function (tags) {
		let openTags = '';
		tags.forEach((tag) => {
			openTags += `<${tag}>`;
		});
		return openTags;
	};
	
	var buildCloseTags = function (tags) {
		let closeTags = '';
		var tags = tags.reverse();
		tags.forEach((tag) => {
			closeTags += `</${tag}>`;
		});
		return closeTags;
	};
	
	var getTagsInSelection = function (htmlObject) {
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
	
	const saveLinksAndReplies = function (e) {
		let links = e.originalEvent.clipboardData.getData('text/objectLink');
		let replies = e.originalEvent.clipboardData.getData('text/objectReply');
		if (links && replies) {
			links = JSON.parse(links);
			replies = JSON.parse(replies);
			saveLinks(links);
			saveReplies(replies);
		}
	};
	
	var saveLinks = function (links) {
		const linksToSave = {};
		const padId = clientVars.padId;
	
		const mapOriginalLinksId = pad.plugins.ep_full_hyperlinks.mapOriginalLinksId;
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
	
	var saveReplies = function (replies) {
		const repliesToSave = {};
		const padId = clientVars.padId;
		const mapOriginalLinksId = pad.plugins.ep_full_hyperlinks.mapOriginalLinksId;
		_.each(replies, (reply, replyId) => {
			const originalLinkId = reply.linkId;
			// as the link copied has got a new linkId, we set this id in the reply as well
			reply.linkId = mapOriginalLinksId[originalLinkId];
			repliesToSave[replyId] = reply;
		});
		pad.plugins.ep_full_hyperlinks.saveLinkReplies(padId, repliesToSave);
	};
	
	var buildLinkData = function (link, fakeLinkId) {
		const linkData = {};
		linkData.padId = clientVars.padId;
		linkData.link = link.data;
		linkData.link.linkId = fakeLinkId;
		return linkData;
	};
	
	// copied from https://css-tricks.com/snippets/javascript/unescape-html-in-js/
	var htmlDecode = function (input) {
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
		const linkId = _.object(attributeManager.getAttributesOnPosition(rep.selStart[0], rep.selStart[1])).link;
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
		const selectionOfMultipleLine = hasMultipleLineSelected(firstLineOfSelection, lastLineOfSelection);
	
		if (selectionOfMultipleLine) {
			hasLink = hasLinkOnMultipleLineSelection(firstLineOfSelection, lastLineOfSelection, rep, attributeManager);
		} else {
			hasLink = hasLinkOnLine(firstLineOfSelection, firstColumn, lastColumn, attributeManager);
		}
		return hasLink;
	};
	
	var hasLinkOnMultipleLineSelection = function (firstLineOfSelection, lastLineOfSelection, rep, attributeManager) {
		let foundLineWithLink = false;
		for (let line = firstLineOfSelection; line <= lastLineOfSelection && !foundLineWithLink; line++) {
			const firstColumn = getFirstColumnOfSelection(line, rep, firstLineOfSelection);
			const lastColumn = getLastColumnOfSelection(line, rep, lastLineOfSelection);
			const hasLink = hasLinkOnLine(line, firstColumn, lastColumn, attributeManager);
			if (hasLink) {
				foundLineWithLink = true;
			}
		}
		return foundLineWithLink;
	};
	
	var getFirstColumnOfSelection = function (line, rep, firstLineOfSelection) {
		return line !== firstLineOfSelection ? 0 : rep.selStart[1];
	};
	
	var getLastColumnOfSelection = function (line, rep, lastLineOfSelection) {
		let lastColumnOfSelection;
		if (line !== lastLineOfSelection) {
			lastColumnOfSelection = getLength(line, rep); // length of line
		} else {
			lastColumnOfSelection = rep.selEnd[1] - 1; // position of last character selected
		}
		return lastColumnOfSelection;
	};
	
	var hasLinkOnLine = function (lineNumber, firstColumn, lastColumn, attributeManager) {
		let foundLinkOnLine = false;
		for (let column = firstColumn; column <= lastColumn && !foundLinkOnLine; column++) {
			const linkId = _.object(attributeManager.getAttributesOnPosition(lineNumber, column)).link;
			if (linkId !== undefined) {
				foundLinkOnLine = true;
			}
		}
		return foundLinkOnLine;
	};
	
	var hasMultipleLineSelected = function (firstLineOfSelection, lastLineOfSelection) {
		return firstLineOfSelection !== lastLineOfSelection;
	};
	
	var getLength = function (line, rep) {
		const nextLine = line + 1;
		const startLineOffset = rep.lines.offsetOfIndex(line);
		const endLineOffset = rep.lines.offsetOfIndex(nextLine);
	
		// lineLength without \n
		const lineLength = endLineOffset - startLineOffset - 1;
	
		return lineLength;
	};

	return {
		addTextOnClipboard,
		saveLinksAndReplies,
		getLinkIdOnFirstPositionSelected,
		hasLinkOnSelection,

	}
})();
