'use strict';

const linkBoxes = (() => {
  let padOuter;
  const getPadOuter = () => (padOuter = padOuter || $('iframe[name="ace_outer"]').contents());  // finds the ace_outer iframe and assigns its contents to padOuter, then returns it

  /**
   * @returns wrapper for all the link modals on the page
   */
  const getLinksContainer = () => getPadOuter().find('#linkBoxWrapper');

  /* ***** Public methods: ***** */

  /**
   * Displays the parent div of a specific link modal.
   * @param {string} linkId   ID of a specific link 
   */
  const showLink = (linkId) => getLinksContainer().find(`#${linkId}`).show();

  /**
   * Hides the parent div of a specific link modal.
   * @param {string} linkId   ID of a specific link
   */
  const hideLink = (linkId) => {
    getLinksContainer().find(`#${linkId}`).hide();  // hides the entire modal (highest in hierarchy)
    padOuter.find(`#show-form-${linkId}`).show();  // removes display:none from the link info viewer
    padOuter.find(`#edit-form-${linkId}`).hide();  // adds display:none to link editor (accessed throughh pen icon on show-form-linkId)
  };

  /**
   * Hides all link modals on the page.
   */
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

		if ($('body').hasClass('mobileView')) {
      linkModal.css({
        left: '50%',
        top: `${newT}px`,
        transform: 'translateX(-50%)',
        width: '96vw',
      });
			linkModal.find('a.ep_hyperlink_title').css({
				'margin-left': '4px',
			});
			linkModal.find('.ep_hyperlink_docs_bubble_button_container').css({
				'margin-left': 'auto',
			});
		} else {
      linkModal.css({left: `${newL}px`, top: `${newT}px`});
		}
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

      if (!/^http:\/\//.test(hyperlink) && !/^https:\/\//.test(hyperlink)) {
        hyperlink = `https://${hyperlink}`;
      }

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
      if (dividedUrl.hostname.indexOf('twitter.com') >= 0) {
        changeMetaView(
          hyperlink,
          "Twitter",
          '../static/plugins/ep_full_hyperlinks/static/dist/img/twitter.png'
        );
      } else if (dividedUrl.protocol.indexOf('mailto') >= 0) {
        changeMetaView(
          hyperlink,
          "Send email",
          '../static/plugins/ep_full_hyperlinks/static/dist/img/envelope.svg'
        );
      } else if (dividedUrl.protocol.indexOf('skype') >= 0) {
        changeMetaView(
          hyperlink,
          "Open Skype",
          '../static/plugins/ep_full_hyperlinks/static/dist/img/skype.svg'
        );
      } else {
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
