import * as validUrl from './validUrl';
/**
 * Create a link object with data filled on the given form
 * @param {jQuery} form .link-edit-form
 * @returns link object (vars text, oldText, hyperlink)
 */
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

export const hideNewLinkPopup = () => {
  $('#newLink').removeClass('popup-show');

  // force focus to be lost, so virtual keyboard is hidden on mobile devices
  $('#newLink').find(':focus').blur();

  // unmark selected text, as now there is no text being linked
  pad.plugins.ep_full_hyperlinks.preLinkMarker.unmarkSelectedText();
};

// Callback for new link Cancel
const cancelNewLink = () => hideNewLinkPopup();

// Callback for new link Submit
const submitNewLink = (callback) => {
  const index = 0;
  const form = $(document).find('#newLink');
  const link = buildLinkFrom(form);

  // if scheme not present, add "https://"
  if (link.hyperlink.length !== 0 && !validUrl.splitUri(link.hyperlink).scheme) {
    link.hyperlink = `https://${link.hyperlink}`;
  }

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
export const insertNewLinkPopupIfDontExist = (link, callback) => {
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

export const showNewLinkPopup = () => {
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
