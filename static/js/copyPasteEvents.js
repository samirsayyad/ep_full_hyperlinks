'use strict';

const events = (() => {
  const getSelectionFormated = (padInner, links) => {
    const selection = padInner[0].contentWindow.getSelection().getRangeAt(0);
    const selectedElements = document.createElement('div');

    selectedElements.append(selection.cloneContents());

    selectedElements.querySelectorAll('.link').forEach((el) => {
      const cls = el.getAttribute('class');
      const classLinkId = /(?:^| )(lc-[A-Za-z0-9]*)/.exec(cls);
      const lindId = classLinkId[1];

      // create a tag
      const link = document.createElement('a');
      link.innerHTML = el.innerHTML;
      link.setAttribute('href', links[lindId].data.hyperlink);

      // replace the current node with href node
      const span = selectedElements.querySelector(`.${lindId}`);
      span.replaceWith(link);
    });

    return selectedElements;
  };

  const addTextOnClipboard = (e, ace, padInner, removeSelection, links) => {
    e.preventDefault();
    const getFormatedHrefElements = getSelectionFormated(padInner, links);

    e.originalEvent.clipboardData.setData('text/html', getFormatedHrefElements.outerHTML);

    // if it is a cut event we have to remove the selection
    if (removeSelection) {
      padInner.contents()[0].execCommand('delete');
    }
  };

  const saveLinks = (e, padInner) => {
    let links = e.originalEvent.clipboardData.getData('text/objectLink');

    if (links) {
      links = JSON.parse(links);
      saveLink(links);
    } else {
      makeClipboarRedyForSaveLinks(e, padInner);
    }
  };

  const makeClipboarRedyForSaveLinks = (e, padInner) => {
    let pastedData, clipboardData;
    let text = '';

    clipboardData = e.originalEvent.clipboardData;
    pastedData = clipboardData.getData('text');
    const pastedDataHtml = clipboardData.getData('text/html');
    const range = padInner.contents()[0].getSelection().getRangeAt(0);

    if (!range) return false;

    if (!pastedDataHtml) {
      const test = new RegExp('([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?').test(pastedData);
      if (test) {
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
  };

  const saveLink = (links) => {
    const linksToSave = {};
    const padId = clientVars.padId;

    const mapOriginalLinksId = pad.plugins.ep_full_hyperlinks.mapOriginalLinksId;
    const mapFakeLinks = pad.plugins.ep_full_hyperlinks.mapFakeLinks;

    _.each(links, (link, fakeLinkId) => {
      const newLinkId = shared.generateLinkId();
      mapFakeLinks[fakeLinkId] = newLinkId;
      const originalLinkId = link.data.originalLinkId;
      mapOriginalLinksId[originalLinkId] = newLinkId;
      linksToSave[newLinkId] = link;
    });
    pad.plugins.ep_full_hyperlinks.saveLinkWithoutSelection(padId, linksToSave);
  };

  return {
    addTextOnClipboard,
    saveLinks,
  };
})();
