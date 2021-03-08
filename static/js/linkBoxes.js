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

            $(this).css({top:  parseInt($(this).css("top").split('px')[0]) - 35 + "px"  })

            $(this).css({top: `${linkElm.attr('data-basetop')}px`});
          }
        }
      });


      if (!linkElm.hasClass('hyperlink-display')) {
        linkElm.css({width: '324px'}); // because of need to determine exact size for putting best area

        const loaded = linkElm.attr('data-loaded');

        const padInner = getPadOuter().find('iframe[name="ace_inner"]');
        let targetLeft = e.clientX;
        targetLeft += padInner.offset().left;
        let targetTop = $(e.target).offset().top;
        targetTop += parseInt(padInner.css('padding-top').split('px')[0]);
        targetTop += parseInt(padOuter.find('#outerdocbody').css('padding-top').split('px')[0]);

        linkElm.css({left: `${parseInt(targetLeft) }px`});
        linkElm.css({top: `${parseInt(targetTop) + 35}px`});
        linkElm.addClass('hyperlink-display');
          // linkElm.css({left: `${parseInt(editorLink.position().left) + parseInt(linkElm.css('width').split('px')[0])}px`});
          // linkElm.css({top: `${parseInt(linkElm.css('top').split('px')[0]) + 35}px`});

        if (loaded != 'true') {
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


          // raise for og:title resolving

          if (!(/^http:\/\//.test(hyperlink)) && !(/^https:\/\//.test(hyperlink))) {
            hyperlink = `https://${hyperlink}`;
          }
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
