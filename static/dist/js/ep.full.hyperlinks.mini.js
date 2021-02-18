exports.moduleList = (()=>{

	const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
	const _ = require('ep_etherpad-lite/static/js/underscore');
 
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

const linkBoxes = (() => {


	let padOuter;
	const getPadOuter = function() {
		padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
		return padOuter;
	}

  const getLinksContainer = () => getPadOuter().find('#links');

  /* ***** Public methods: ***** */

  const showLink = function (linkId, e) {
    const linkElm = getLinksContainer().find(`#${linkId}`);
    linkElm.show();

    highlightLink(linkId, e);
  };

  const hideLink = function (linkId, hideLinkTitle) {
    const linkElm = getLinksContainer().find(`#${linkId}`);
    if (linkElm.hasClass('hyperlink-display')) {
      // linkElm.css({top:  parseInt(linkElm.css("top").split('px')[0]) - 35 + "px"  })
      linkElm.css({top: `${linkElm.attr('data-basetop')}px`});
      linkElm.removeClass('hyperlink-display');
      linkElm.css({width: '324px'});
      padOuter.find(`#edit-form-${linkId}`).hide();
      padOuter.find(`#show-form-${linkId}`).show();
    }


    // hide even the link title
    // if (hideLinkTitle) linkElm.fadeOut();

    const inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
    inner.contents().find('head .link-style').remove();

    getPadOuter().find('.link-modal').removeClass('popup-show');
  };

  const hideAllLinks = function () {
    // getLinksContainer().find('.sidebar-link').removeClass('full-display');
    // getPadOuter().find('.link-modal').removeClass('popup-show');
    const container = getLinksContainer();
    const inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');

    container.find('.sidebar-link').each(function () {
      inner.contents().find('head .link-style').remove();
      if ($(this).hasClass('hyperlink-display')) {
        $(this).removeClass('hyperlink-display');
        $(this).css({width: '324px'});
        padOuter.find(`#edit-form-${$(this).attr('data-linkid')}`).hide();
        padOuter.find(`#show-form-${$(this).attr('data-linkid')}`).show();
        // $(this).css({top:  parseInt($(this).css("top").split('px')[0]) - 35 + "px"  })

        $(this).css({top: `${$(this).attr('data-basetop')}px`});
      }
    });
  };
  var validURL = function (str) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
  };
  var highlightLink = function (linkId, e, editorLink, socket, padId) {
    const container = getLinksContainer();
    const linkElm = container.find(`#${linkId}`);
    var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');

    if (container.is(':visible')) {
      // hide all other links
      container.find('.sidebar-link').each(function () {
        inner.contents().find('head .link-style').remove();
        if ($(this).attr('data-linkid') != linkId) {
          if ($(this).hasClass('hyperlink-display')) {
            $(this).removeClass('hyperlink-display');

            // back to default showing
            padOuter.find(`#edit-form-${$(this).attr('data-linkid')}`).hide();
            padOuter.find(`#show-form-${$(this).attr('data-linkid')}`).show();

            // $(this).css({top:  parseInt($(this).css("top").split('px')[0]) - 35 + "px"  })

            $(this).css({top: `${linkElm.attr('data-basetop')}px`});
          }
        }
      });


      if (!linkElm.hasClass('hyperlink-display')) {
        linkElm.css({width: '324px'}); // because of need to determine exact size for putting best area

        const loaded = linkElm.attr('data-loaded');
        if (loaded == 'true') {
          linkElm.css({left: `${parseInt(editorLink.position().left) + parseInt(linkElm.css('width').split('px')[0])}px`});
          linkElm.css({top: `${parseInt(linkElm.css('top').split('px')[0]) + 35}px`});
          linkElm.addClass('hyperlink-display');
        } else {
          let hyperlink = linkElm.attr('data-hyperlink');

          const ep_hyperlink_title = linkElm.find('#ep_hyperlink_title');
          ep_hyperlink_title.text(hyperlink);
          const ep_hyperlink_img = linkElm.find('#ep_hyperlink_img');
          const ep_hyperlink_description = linkElm.find('#ep_hyperlink_description');
          ep_hyperlink_description.text('');

          const card_loading_hyperlink = linkElm.find('#card_loading_hyperlink');

          ep_hyperlink_img.hide();
          ep_hyperlink_title.show();
          card_loading_hyperlink.show();


          linkElm.css({left: `${parseInt(editorLink.position().left) + parseInt(linkElm.css('width').split('px')[0])}px`});
          linkElm.css({top: `${parseInt(linkElm.css('top').split('px')[0]) + 35}px`});
          linkElm.addClass('hyperlink-display');
          // raise for og:title resolving

          if (!(/^http:\/\//.test(hyperlink)) && !(/^https:\/\//.test(hyperlink))) {
            hyperlink = `https://${hyperlink}`;
          }
          console.log("what is res ",validURL(hyperlink))
          if(!validURL(hyperlink))
          {
            ep_hyperlink_img.attr('src', '../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png');
                ep_hyperlink_img.on('load', () => {
                  card_loading_hyperlink.fadeOut(500, () => {
                    ep_hyperlink_img.fadeIn();
                    ep_hyperlink_description.text(hyperlink.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0]);
                    linkElm.attr({'data-loaded': true});
                  });
                });
              return false;
          }
          // ........
          const metaResolverCallBack = function (result) {
            console.log(result,hyperlink)
            ep_hyperlink_title.attr('href', hyperlink);

            if (result.metadata.image && result.metadata.title) {
              ep_hyperlink_img.attr('src', result.metadata.image);
              ep_hyperlink_img.on('load', () => {
                card_loading_hyperlink.fadeOut(500, () => {
                  ep_hyperlink_img.fadeIn();
                  ep_hyperlink_title.text(result.metadata.title);
                  ep_hyperlink_description.text(result.metadata.url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0]);
                  linkElm.attr({'data-loaded': true});
                });
              });
            } else {
              const url = new URL(hyperlink);
              hyperlink = `https://${url.hostname}`;
              if (result.last !== true) {
                socket.emit('metaResolver', {padId, hyperlink, last: true}, metaResolverCallBack);
              } else {
                ep_hyperlink_img.attr('src', '../static/plugins/ep_full_hyperlinks/static/dist/img/nometa.png');
                ep_hyperlink_img.on('load', () => {
                  card_loading_hyperlink.fadeOut(500, () => {
                    ep_hyperlink_img.fadeIn();
                    ep_hyperlink_description.text(hyperlink.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0]);
                    linkElm.attr({'data-loaded': true});
                  });
                });
              }
            }


            // //////////// meta resolver
            // if(res){
            //   ep_hyperlink_title.attr('href',hyperlink);

            //   var image = null ;

            //   if(res.image ){
            //     image = res.image
            //   }
            //   else {
            //     if (res.images){
            //       $.each(res.images,function(key,value){
            //         if(isUrlValid(value) && notInTheseUrls(value)){
            //           image = value;
            //           return false;
            //         }
            //       });
            //     }
            //   }
            //   if(isUrlValid(image)){
            //     ep_hyperlink_img.attr('src',image);
            //   }else{
            //     if(isUrlValid(res.url+image)){
            //       ep_hyperlink_img.attr('src',res.url+image);
            //     }else{
            //       if (isUrlValid(res.uri.scheme+"://"+res.uri.host+image)){
            //         ep_hyperlink_img.attr('src',res.uri.scheme+"://"+res.uri.host+image);
            //       }else{
            //         if (isUrlValid(res["forem:logo"])){
            //           ep_hyperlink_img.attr('src',res["forem:logo"]);
            //         }else{
            //           ep_hyperlink_img.attr('src',"#");
            //         }
            //       }
            //     }
            //   }

            //   ep_hyperlink_img.on("load",function(){

            //     card_loading_hyperlink.fadeOut(500,function(){
            //       ep_hyperlink_img.fadeIn()
            //       ep_hyperlink_title.text(res.title)
            //       ep_hyperlink_description.text(res.url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0])
            //       linkElm.attr({"data-loaded":true})
            //     })


            //     // ep_hyperlink_title.fadeIn()

            //       // Animation complete.

            //   })
            // }else{
            //   console.log("res rtide")
            //   var url = new URL(hyperlink);
            //   hyperlink = "https://" + url.hostname;
            //   socket.emit('metaResolver', {padId: padId,hyperlink : hyperlink}, metaResolverCallBack);
            // }
          };
          // ........


          socket.emit('metaResolver', {padId, hyperlink, last: false}, metaResolverCallBack);
        }
      }
      // else{
      //   linkElm.removeClass('hyperlink-display');
      //   linkElm.css({top:  parseInt(linkElm.css("top").split('px')[0]) - 40 + "px"  })

      // }
      // Then highlight new link

      // now if we apply a class such as mouseover to the editor it will go shitty
      // so what we need to do is add CSS for the specific ID to the document...
      // It's fucked up but that's how we do it..
      var inner = $('iframe[name="ace_outer"]').contents().find('iframe[name="ace_inner"]');
      inner.contents().find('head').append(`<style class='link-style'>.${linkId}{ color: #a7680c !important }</style>`);
    } else {
      // make a full copy of the html, including listeners
      const linkElmCloned = linkElm.clone(true, true);

      // before of appending clear the css (like top positionning)
      linkElmCloned.attr('style', '');
      // fix checkbox, because as we are duplicating the sidebar-link, we lose unique input names
      linkElmCloned.find('.label-suggestion-checkbox').click(function () {
        $(this).siblings('input[type="checkbox"]').click();
      });

      // hovering link view
      getPadOuter().find('.link-modal-link').html('').append(linkElmCloned);
      const padInner = getPadOuter().find('iframe[name="ace_inner"]');
      // get modal position
      const containerWidth = getPadOuter().find('#outerdocbody').outerWidth(true);
      const modalWitdh = getPadOuter().find('.link-modal').outerWidth(true);
      var targetLeft = e.clientX;
      let targetTop = $(e.target).offset().top;
      if (editorLink) {
        targetLeft += padInner.offset().left;
        targetTop += parseInt(padInner.css('padding-top').split('px')[0]);
        targetTop += parseInt(padOuter.find('#outerdocbody').css('padding-top').split('px')[0]);
      } else {
        // mean we are clicking from a link Icon
        var targetLeft = $(e.target).offset().left - 20;
      }

      // if positioning modal on target left will make part of the modal to be
      // out of screen, we place it closer to the middle of the screen
      if (targetLeft + modalWitdh > containerWidth) {
        targetLeft = containerWidth - modalWitdh - 25;
      }
      const editorLinkHeight = editorLink ? editorLink.outerHeight(true) : 30;
      getPadOuter().find('.link-modal').addClass('popup-show').css({
        left: `${targetLeft}px`,
        top: `${targetTop + editorLinkHeight}px`,
      });
    }
  };

  // Adjust position of the link detail on the container, to be on the same
  // height of the pad text associated to the link, and return the affected element
  const adjustTopOf = function (linkId, baseTop) {
    const linkElement = getPadOuter().find(`#${linkId}`);
    linkElement.css('top', `${baseTop}px`);
    linkElement.attr('data-basetop', baseTop);

    return linkElement;
  };

  // Indicates if link is on the expected position (baseTop-5)
  const isOnTop = function (linkId, baseTop) {
    const linkElement = getPadOuter().find(`#${linkId}`);
    const expectedTop = `${baseTop}px`;
    return linkElement.css('top') === expectedTop;
  };

  // Indicates if event was on one of the elements that does not close link
  const shouldNotCloseLink = function (e) {
    // a link box
    if (
			$(e.target).closest('.link').length || $(e.target).closest('.link-modal').length ||
			$(e.target).closest('.ep_hyperlink_docs_bubble_button_edit').length ||
			$(e.target).closest('.ep_hyperlink_docs_bubble_button_delete').length ||
			$(e.target).closest('.ep_hyperlink_docs_bubble_button_copy').length ||
			$(e.target).closest('.full-display-link').length ||
			$(e.target).closest('.link-title-wrapper').length ||
			$(e.target).closest('.link-edit-form').length ||
			$(e.target).closest('.link-text-text').length ||
			$(e.target).closest('.link-text-hyperlink').length
    ) { // the link modal
      return true;
    }
    return false;
  };

  return {
    showLink,
    hideLink,
    hideAllLinks,
    highlightLink,
    adjustTopOf,
    isOnTop,
    shouldNotCloseLink,

  };
})();

const linkIcons = (() => {

	// Indicates if Etherpad is configured to display icons
	var displayIcons = function () {
		return clientVars.displayLinkAsIcon;
	};

	// Easier access to outer pad
	var padOuter;
	var getPadOuter = function () {
		padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
		return padOuter;
	};

	// Easier access to inner pad
	var padInner;
	var getPadInner = function () {
		padInner = padInner || getPadOuter().find('iframe[name="ace_inner"]').contents();
		return padInner;
	};

	var getOrCreateIconsContainerAt = function (top) {
		const iconContainer = getPadOuter().find('#linkIcons');
		const iconClass = `icon-at-${top}`;

		// is this the 1st link on that line?
		let iconsAtLine = iconContainer.find(`.${iconClass}`);
		const isFirstIconAtLine = iconsAtLine.length === 0;

		// create container for icons at target line, if it does not exist yet
		if (isFirstIconAtLine) {
			iconContainer.append(`<div class="link-icon-line ${iconClass}"></div>`);
			iconsAtLine = iconContainer.find(`.${iconClass}`);
			iconsAtLine.css('top', `${top}px`);
		}

		return iconsAtLine;
	};

	var targetLinkIdOf = function (e) {
		return e.currentTarget.getAttribute('data-linkid');
	};

	var highlightTargetTextOf = function (linkId) {
		getPadInner().find('head').append(`<style class='link-style'>.${linkId}{ color: #a7680c !important }</style>`);
	};

	var removeHighlightTargetText = function (linkId) {
		getPadInner().find('head .link-style').remove();
	};

	var toggleActiveLinkIcon = function (target) {
		target.toggleClass('active').toggleClass('inactive');
	};

	var addListenersToLinkIcons = function () {
		getPadOuter().find('#linkIcons').on('mouseover', '.link-icon', (e) => {
			removeHighlightTargetText();
			const linkId = targetLinkIdOf(e);
			highlightTargetTextOf(linkId);
		}).on('mouseout', '.link-icon', (e) => {
			const linkId = targetLinkIdOf(e);
			removeHighlightTargetText();
		}).on('click', '.link-icon.active', function (e) {
			toggleActiveLinkIcon($(this));

			const linkId = targetLinkIdOf(e);
			linkBoxes.hideLink(linkId, true);
		}).on('click', '.link-icon.inactive', function (e) {
			// deactivate/hide other link boxes that are opened, so we have only
			// one link box opened at a time
			linkBoxes.hideAllLinks();
			const allActiveIcons = getPadOuter().find('#linkIcons').find('.link-icon.active');
			toggleActiveLinkIcon(allActiveIcons);

			// activate/show only target link
			toggleActiveLinkIcon($(this));
			const linkId = targetLinkIdOf(e);
			linkBoxes.highlightLink(linkId, e);
		});
	};

	// Listen to clicks on the page to be able to close link when clicking
	// outside of it
	var addListenersToCloseOpenedLink = function () {
		// we need to add listeners to the different iframes of the page
		$(document).on('touchstart click', (e) => {
			closeOpenedLinkIfNotOnSelectedElements(e);
		});
		getPadOuter().find('html').on('touchstart click', (e) => {
			closeOpenedLinkIfNotOnSelectedElements(e);
		});
		getPadInner().find('html').on('touchstart click', (e) => {
			closeOpenedLinkIfNotOnSelectedElements(e);
		});
	};

	// Close link if event target was outside of link or on a link icon
	var closeOpenedLinkIfNotOnSelectedElements = function (e) {
		// Don't do anything if clicked on the following elements:
		// any of the link icons
		if (shouldNotCloseLink(e) || linkBoxes.shouldNotCloseLink(e)) { // a link box or the link modal
			return;
		}

		// All clear, can close the link
		const openedLink = findOpenedLink();
		if (openedLink) {
			toggleActiveLinkIcon($(openedLink));

			const linkId = openedLink.getAttribute('data-linkid');
			linkBoxes.hideLink(linkId, true);
		}
	};

	// Search on the page for an opened link
	var findOpenedLink = function () {
		return getPadOuter().find('#linkIcons .link-icon.active').get(0);
	};

	/* ***** Public methods: ***** */

	// Create container to hold link icons
	var insertContainer = function () {
		// we're only doing something if icons will be displayed at all
		if (!displayIcons()) return;

		getPadOuter().find('#sidediv').after('<div id="linkIcons"></div>');
		getPadOuter().find('#links').addClass('with-icons');
		addListenersToLinkIcons();
		addListenersToCloseOpenedLink();
	};

	// Create a new link icon
	var addIcon = function (linkId, link) {
		// we're only doing something if icons will be displayed at all
		if (!displayIcons()) return;

		const inlineLink = getPadInner().find(`.link.${linkId}`);
		const top = inlineLink.get(0).offsetTop;
		const iconsAtLine = getOrCreateIconsContainerAt(top);
		const icon = $('#linkIconTemplate').tmpl(link);

		icon.appendTo(iconsAtLine);
	};

	// Hide link icons from container
	var hideIcons = function () {
		// we're only doing something if icons will be displayed at all
		if (!displayIcons()) return;

		getPadOuter().find('#linkIcons').children().children().each(function () {
			$(this).hide();
		});
	};

	// Adjust position of the link icon on the container, to be on the same
	// height of the pad text associated to the link, and return the affected icon
	var adjustTopOf = function (linkId, baseTop) {
		// we're only doing something if icons will be displayed at all
		if (!displayIcons()) return;

		const icon = getPadOuter().find(`#icon-${linkId}`);
		const targetTop = baseTop;
		const iconsAtLine = getOrCreateIconsContainerAt(targetTop);

		// move icon from one line to the other
		if (iconsAtLine != icon.parent()) icon.appendTo(iconsAtLine);

		icon.show();

		return icon;
	};

	// Indicate if link detail currently opened was shown by a click on
	// link icon.
	var isLinkOpenedByClickOnIcon = function () {
		// we're only doing something if icons will be displayed at all
		if (!displayIcons()) return false;

		const iconClicked = getPadOuter().find('#linkIcons').find('.link-icon.active');
		const linkOpenedByClickOnIcon = iconClicked.length !== 0;

		return linkOpenedByClickOnIcon;
	};

	// Mark link as a link-with-reply, so it can be displayed with a
	// different icon
	var linkHasReply = function (linkId) {
		// we're only doing something if icons will be displayed at all
		if (!displayIcons()) return;

		// change link icon
		const iconForLink = getPadOuter().find('#linkIcons').find(`#icon-${linkId}`);
		iconForLink.addClass('with-reply');
	};

	// Indicate if sidebar link should be shown, checking if it had the characteristics
	// of a link that was being displayed on the screen
	var shouldShow = function (sidebarComent) {
		let shouldShowLink = false;

		if (!displayIcons()) {
			// if icons are not being displayed, we always show links
			shouldShowLink = true;
		} else if (sidebarComent.hasClass('mouseover')) {
			// if icons are being displayed, we only show links clicked by user
			shouldShowLink = true;
		}

		return shouldShowLink;
	};

	// Indicates if event was on one of the elements that does not close link (any of the link icons)
	var shouldNotCloseLink = function (e) {
		return $(e.target).closest('.link-icon').length !== 0;
	};

	return {
		insertContainer,
		addIcon,
		hideIcons,
		adjustTopOf,
		isLinkOpenedByClickOnIcon,
		linkHasReply,
		shouldShow,
		shouldNotCloseLink,

	}
})();

const linkL10n = (() => {
	var localize = function (element) {
		html10n.translateElement(html10n.translations, element.get(0));
	};
	return {
		localize
	}
})();

const newLink = (() => {

	// Create a link object with data filled on the given form
	var buildLinkFrom = function (form) {
		const text = form.find('#hyperlink-text').val();
		const oldText = form.find('#hyperlink-text-hidden').val();
		let hyperlink = form.find('#hyperlink-url').val();
		const changeFrom = form.find('.from-value').text();
		const changeTo = form.find('.to-value').val() || null;
		const link = {};
		if (!(/^http:\/\//.test(hyperlink)) && !(/^https:\/\//.test(hyperlink))) {
			hyperlink = `https://${hyperlink}`;
		}
		link.text = text;
		link.oldText = oldText;
		link.hyperlink = hyperlink;

		if (changeTo) {
			link.changeFrom = changeFrom;
			link.changeTo = changeTo;
		}
		return link;
	};

	// Callback for new link Cancel
	var cancelNewLink = function () {
		hideNewLinkPopup();
	};

	// Callback for new link Submit
	var submitNewLink = function (callback) {
		const index = 0;
		const form = $('#newLink');
		const link = buildLinkFrom(form);
		if ((link.text.length > 0 || link.changeTo && link.changeTo.length > 0) && validURL(link.hyperlink)) {
			form.find('.link-content, .to-value').removeClass('error');
			hideNewLinkPopup();
			callback(link, index);
		} else {
			if (link.text.length == 0) form.find('.link-content').addClass('error');
			if (!validURL(link.hyperlink)) form.find('#hyperlink-url').addClass('error');

			if (link.changeTo && link.changeTo.length == 0) form.find('.to-value').addClass('error');
		}
		return false;
	};

	var validURL = function (str) {
		var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
		  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
		  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
		  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
		  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
		  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
		return !!pattern.test(str);
	  };
	/* ***** Public methods: ***** */

	var localizenewLinkPopup = function () {
		const newLinkPopup = $('#newLink');
		if (newLinkPopup.length !== 0) linkL10n.localize(newLinkPopup);
	};

	// Insert new Link Form
	var insertNewLinkPopupIfDontExist = function (link, callback) {
		$('#newLink').remove();
		var newLinkPopup = $('#newLink');

		link.linkId = '';
		var newLinkPopup = $('#newLinkTemplate').tmpl(link);
		newLinkPopup.appendTo($('#editorcontainerbox'));

		localizenewLinkPopup();

		// Listen for include suggested change toggle
		$('#newLink').find('.suggestion-checkbox').change(function () {
			$('#newLink').find('.suggestion').toggle($(this).is(':checked'));
		});

		// Cancel btn
		newLinkPopup.find('#link-reset').on('click', () => {
			cancelNewLink();
		});
		// Create btn // link-create-btn
		$('#newLink').on('submit', (e) => {
			e.preventDefault();
			return submitNewLink(callback);
		});

		return newLinkPopup;
	};

	var showNewLinkPopup = function () {
		// position below link icon
		$('#newLink').css('left', $('.toolbar .addLink').offset().left);

		// Reset form to make sure it is all clear
		$('#newLink').find('.suggestion-checkbox').prop('checked', false).trigger('change');
		$('#newLink').find('textarea').val('');
		$('#newLink').find('.link-content, .to-value').removeClass('error');

		// Show popup
		$('#newLink').addClass('popup-show');


		// mark selected text, so it is clear to user which text range the link is being applied to
		pad.plugins.ep_full_hyperlinks.preLinkMarker.markSelectedText();

		// focus on hyperlink input


		setTimeout(() => { $('#newLink').find('.link-content').focus().select(); }, 500);
	};

	var hideNewLinkPopup = function () {
		$('#newLink').removeClass('popup-show');

		// force focus to be lost, so virtual keyboard is hidden on mobile devices
		$('#newLink').find(':focus').blur();

		// unmark selected text, as now there is no text being linked
		pad.plugins.ep_full_hyperlinks.preLinkMarker.unmarkSelectedText();
	};
	
	return {
		localizenewLinkPopup,
		insertNewLinkPopupIfDontExist,
		showNewLinkPopup,
		hideNewLinkPopup,

	}

})();

const preLinkMark = (() => {
	
	const MARK_CLASS = 'pre-selected-link';

	var preLinkMarker = function (ace) {
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
	var doNothing = function () {};

	const init = function (ace) {
		return new preLinkMarker(ace);
	};

	return {
		MARK_CLASS,
		init
	}

})();

const timeFormat = (() => {

	var localizable = typeof html10n !== 'undefined';

	l10nKeys = {
		'seconds': 'ep_full_hyperlinks.time.seconds',
		'1 minute ago': 'ep_full_hyperlinks.time.one_minute',
		'minutes': 'ep_full_hyperlinks.time.minutes',
		'1 hour ago': 'ep_full_hyperlinks.time.one_hour',
		'hours': 'ep_full_hyperlinks.time.hours',
		'yesterday': 'ep_full_hyperlinks.time.one_day',
		'days': 'ep_full_hyperlinks.time.days',
		'last week': 'ep_full_hyperlinks.time.one_week',
		'weeks': 'ep_full_hyperlinks.time.weeks',
		'last month': 'ep_full_hyperlinks.time.one_month',
		'months': 'ep_full_hyperlinks.time.months',
		'last year': 'ep_full_hyperlinks.time.one_year',
		'years': 'ep_full_hyperlinks.time.years',
		'last century': 'ep_full_hyperlinks.time.one_century',
		'centuries': 'ep_full_hyperlinks.time.centuries',
	};
	
	var time_formats = [
		[60, 'seconds', 1], // 60
		[120, '1 minute ago', '1 minute from now'], // 60*2
		[3600, 'minutes', 60], // 60*60, 60
		[7200, '1 hour ago', '1 hour from now'], // 60*60*2
		[86400, 'hours', 3600], // 60*60*24, 60*60
		[172800, 'yesterday', 'tomorrow'], // 60*60*24*2
		[604800, 'days', 86400], // 60*60*24*7, 60*60*24
		[1209600, 'last week', 'next week'], // 60*60*24*7*4*2
		[2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
		[4838400, 'last month', 'next month'], // 60*60*24*7*4*2
		[29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
		[58060800, 'last year', 'next year'], // 60*60*24*7*4*12*2
		[2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
		[5806080000, 'last century', 'next century'], // 60*60*24*7*4*12*100*2
		[58060800000, 'centuries', 2903040000], // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
	];
	
	function prettyDate(time) {
		/*
		var time = ('' + date_str).replace(/-/g,"/").replace(/[TZ]/g," ").replace(/^\s\s*/ /* rappel   , '').replace(/\s\s*$/, '');
		if(time.substr(time.length-4,1)==".") time =time.substr(0,time.length-4);
		*/
		let seconds = (new Date() - new Date(time)) / 1000;
		// var seconds = new Date() - new Date(time) / 1000;
		let token = 'ago';
		let list_choice = 1;
		let l10n_appendix = '.past';
	
		if (seconds < 0) {
			seconds = Math.abs(seconds);
			token = 'from now';
			l10n_appendix = '.future';
			list_choice = 2;
		}
	
		let i = 0; let
			format;
		while (format = time_formats[i++]) {
			if (seconds < format[0]) {
				const count = Math.floor(seconds / format[2]);
				var formatted_time;
				if (localizable) {
					const key = l10nKeys[format[1]] + l10n_appendix;
					formatted_time = html10n.get(key, {count});
				}
	
				// Wasn't able to localize properly the date, so use the default:
				if (formatted_time === undefined) {
					if (typeof format[2] === 'string') { formatted_time = format[list_choice]; } else { formatted_time = `${count} ${format[1]} ${token}`; }
				}
				return formatted_time;
			}
		}
		return time;
	}
	
	return {prettyDate}
})();

const shared = (() => {

	var collectContentPre = (hook, context) => {
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
	
		// const tname = context.tname;
		// const state = context.state;
		// const lineAttributes = state.lineAttributes;
		// const tagIndex = tname;
		// const fonts = ['link'];
		// if (fonts.indexOf(tname) !== -1) {
		//   context.cc.doAttrib(state, tname);
		// }
	
		return [];
	};

	const generateLinkId = function () {
		const linkId = `lc-${randomString(16)}`;
		return linkId;
	};

	return {
		collectContentPre,
		generateLinkId,
	}
	
})();
return {
events
,linkBoxes
,linkIcons
,linkL10n
,newLink
,preLinkMark
,timeFormat
,shared
}
})();