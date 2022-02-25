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
