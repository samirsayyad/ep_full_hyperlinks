/* TODO:
- lable reply textarea
- Make the chekbox appear above the suggested changes even when activated
*/


var _, $, jQuery;

var shared = require('./shared');
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;
var prettyDate = require('ep_full_hyperlinks/static/js/timeFormat').prettyDate;
var linkBoxes = require('ep_full_hyperlinks/static/js/linkBoxes');
var linkIcons = require('ep_full_hyperlinks/static/js/linkIcons');
var newLink = require('ep_full_hyperlinks/static/js/newLink');
var preLinkMark = require('ep_full_hyperlinks/static/js/preLinkMark');
var linkL10n = require('ep_full_hyperlinks/static/js/linkL10n');
var events = require('ep_full_hyperlinks/static/js/copyPasteEvents');
var getLinkIdOnFirstPositionSelected = events.getLinkIdOnFirstPositionSelected;
var hasLinkOnSelection = events.hasLinkOnSelection;
var browser = require('ep_etherpad-lite/static/js/browser');

var cssFiles = ['ep_full_hyperlinks/static/css/link.css', 'ep_full_hyperlinks/static/css/linkIcon.css'];

var UPDATE_LINK_LINE_POSITION_EVENT = 'updateLinkLinePosition';

/************************************************************************/
/*                         ep_links Plugin                           */
/************************************************************************/

// Container
function ep_links(context){
  this.container = null;
  this.padOuter  = null;
  this.padInner  = null;
  this.ace       = context.ace;

  // Required for instances running on weird ports
  // This probably needs some work for instances running on root or not on /p/
  var loc = document.location;
  var port = loc.port == "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port;
  var url = loc.protocol + "//" + loc.hostname + ":" + port + "/" + "link";
  this.socket     = io.connect(url);

  this.padId      = clientVars.padId;
  this.links   = [];
  this.linkReplies = {};
  this.mapFakeLinks = [];
  this.mapOriginalLinksId = [];
  this.shouldCollectLink = false;
  this.init();
  this.preLinkMarker = preLinkMark.init(this.ace);
}

// Init Etherpad plugin link pads
ep_links.prototype.init = function(){
  var self = this;
  var ace = this.ace;

  // Init prerequisite
  this.findContainers();
  this.insertContainers(); // Insert link containers in sidebar

  // Init icons container
  linkIcons.insertContainer();

  // Get all links
  this.getLinks(function (links){
    if (!$.isEmptyObject(links)){
      self.setLinks(links);
      self.collectLinks();
    }
  });

  this.getLinkReplies(function (replies){
    if (!$.isEmptyObject(replies)){
      // console.log("collecting link replies");
      self.linkReplies = replies;
      self.collectLinkReplies();
    }
    self.linkRepliesListen();
    self.linkListen();
  });

  // Init add push event
  this.pushLink('add', function (linkId, link){
    self.setLink(linkId, link);
    // console.log('pushLink', link);
    self.collectLinksAfterSomeIntervalsOfTime();
  });

  // When language is changed, we need to reload the links to make sure
  // all templates are localized
  html10n.bind('localized', function() {
    self.localizeExistingLinks();
  });

  // Recalculate position when editor is resized
  $('#settings input, #skin-variant-full-width').on('change', function(e) {
    self.setYofLinks();
  });
  this.padInner.contents().on(UPDATE_LINK_LINE_POSITION_EVENT, function(e){
    self.setYofLinks();
  });
  $(window).resize(_.debounce( function() { self.setYofLinks() }, 100 ) );

  // On click link icon toolbar
  $('.addLink').on('click', function(e){
    e.preventDefault(); // stops focus from being lost
    self.displayNewLinkForm();
  });

  // Import for below listener : we are using this.container.parent() so we include
  // events on both link-modal and sidebar

  // Listen for events to delete a link
  // All this does is remove the link attr on the selection
  this.container.parent().on("click", ".link-delete", function(){
    var linkId = $(this).closest('.link-container')[0].id;
    self.deleteLink(linkId);
    var padOuter = $('iframe[name="ace_outer"]').contents();
    var padInner = padOuter.find('iframe[name="ace_inner"]');
    var selector = "."+linkId;
    var ace = self.ace;
    ace.callWithAce(function(aceTop){
      var repArr = aceTop.ace_getRepFromSelector(selector, padInner);
      // rep is an array of reps..  I will need to iterate over each to do something meaningful..
      $.each(repArr, function(index, rep){
        // I don't think we need this nested call
        ace.callWithAce(function (ace){
          ace.ace_performSelectionChange(rep[0],rep[1],true);
          ace.ace_setAttributeOnSelection('link', 'link-deleted');
          // Note that this is the correct way of doing it, instead of there being
          // a linkId we now flag it as "link-deleted"
        });
      });
    },'deleteLinkedSelection', true);
    // dispatch event
    self.socket.emit('deleteLink', {padId: self.padId, linkId: linkId}, function (){});
  });

  // Listen for events to edit a link
  // Here, it adds a form to edit the link text
  this.container.parent().on("click", ".link-edit", function(){
    var $linkBox = $(this).closest('.link-container');
    $linkBox.addClass('editing');

    var textBox = self.findLinkText($linkBox).last();

    // if edit form not already there
    if (textBox.siblings('.link-edit-form').length == 0) {
      // add a form to edit the field
      var data = {};
      data.text = textBox.text();
      var content = $("#editLinkTemplate").tmpl(data);
      // localize the link/reply edit form
      linkL10n.localize(content);
      // insert form
      textBox.before(content);
    }
  });

  // submit the edition on the text and update the link text
  this.container.parent().on("click", ".link-edit-submit", function(e){
    e.preventDefault();
    e.stopPropagation();
    var $linkBox = $(this).closest('.link-container');
    var $linkForm = $(this).closest('.link-edit-form');
    var linkId = $linkBox.data('linkid');
    var linkText = $linkForm.find('.link-edit-text').val();
    var data = {};
    data.linkId = linkId;
    data.padId = clientVars.padId;
    data.linkText = linkText;

    self.socket.emit('updateLinkText', data, function (err){
      if(!err) {
        $linkForm.remove();
        $linkBox.removeClass('editing');
        self.updateLinkBoxText(linkId, linkText);

        // although the link or reply was saved on the data base successfully, it needs
        // to update the link or link reply variable with the new text saved
        self.setLinkOrReplyNewText(linkId, linkText);
      }
    });
  });

  // hide the edit form and make the link author and text visible again
  this.container.parent().on("click", ".link-edit-cancel", function(e){
    e.preventDefault();
    e.stopPropagation();
    var $linkBox = $(this).closest('.link-container');
    var textBox = self.findLinkText($linkBox).last();
    textBox.siblings('.link-edit-form').remove();
    $linkBox.removeClass('editing');
  });

  // Listen for include suggested change toggle
  this.container.parent().on("change", '.suggestion-checkbox', function(){
    var parentLink = $(this).closest('.link-container');
    var parentSuggest = $(this).closest('.link-reply');

    if($(this).is(':checked')){
      var linkId = parentLink.data('linkid');
      var padOuter = $('iframe[name="ace_outer"]').contents();
      var padInner = padOuter.find('iframe[name="ace_inner"]');

      var currentString = padInner.contents().find("."+linkId).html();

      parentSuggest.find(".from-value").html(currentString);
      parentSuggest.find('.suggestion').show();
    }else{
      parentSuggest.find('.suggestion').hide();
    }
  });

  // User accepts or revert a change
  this.container.parent().on("submit", ".link-changeTo-form", function(e){
    e.preventDefault();
    var data = self.getLinkData();
    var linkEl = $(this).closest('.link-container');
    data.linkId = linkEl.data('linkid');
    var padOuter = $('iframe[name="ace_outer"]').contents();
    var padInner = padOuter.find('iframe[name="ace_inner"]').contents();

    // Are we reverting a change?
    var isRevert = linkEl.hasClass("change-accepted");
    var newString = isRevert ? $(this).find(".from-value").html() : $(this).find(".to-value").html();

    // In case of suggested change is inside a reply, the parentId is different from the linkId (=replyId)
    var parentId = $(this).closest('.sidebar-link').data('linkid');
    // Nuke all that aren't first lines of this link
    padInner.find("."+parentId+":not(:first)").html("");

    var padLinkSpan = padInner.find("."+parentId).first();
    newString = newString.replace(/(?:\r\n|\r)/g, '<br />');

    // Write the new pad contents
    padLinkSpan.html(newString);

    if(isRevert){
      // Tell all users this change was reverted
      self.socket.emit('revertChange', data, function (){});
      self.showChangeAsReverted(data.linkId);
    }else{
      // Tell all users this change was accepted
      self.socket.emit('acceptChange', data, function (){});
      // Update our own links container with the accepted change
      self.showChangeAsAccepted(data.linkId);
    }

    // TODO: we need ace editor to commit the change so other people get it
    // currently after approving or reverting, you need to do other thing on the pad
    // for ace to commit
  });

  // When input reply is focused we display more option
  this.container.parent().on("focus", ".link-content", function(e){
    $(this).closest('.new-link').addClass('editing');
  });
  // When we leave we reset the form option to its minimal (only input)
  this.container.parent().on('mouseleave', ".link-container", function(e) {
    $(this).find('.suggestion-checkbox').prop('checked', false);
    $(this).find('.new-link').removeClass('editing');
  });

  // When a reply get submitted
  this.container.parent().on("submit", ".new-link", function(e){
    e.preventDefault();

    var data = self.getLinkData();
    data.linkId = $(this).closest('.link-container').data('linkid');
    data.reply = $(this).find(".link-content").val();
    data.changeTo = $(this).find(".to-value").val() || null;
    data.changeFrom = $(this).find(".from-value").text() || null;
    self.socket.emit('addLinkReply', data, function (){
      self.getLinkReplies(function(replies){
        self.linkReplies = replies;
        self.collectLinkReplies();

        // Once the new reply is displayed, we clear the form
        $('iframe[name="ace_outer"]').contents().find('.new-link').removeClass('editing');
      });
    });

    $(this).trigger('reset_reply');
  });
  this.container.parent().on("reset_reply", ".new-link", function(e){
    // Reset the form
    $(this).find('.link-content').val('');
    $(this).find(':focus').blur();
    $(this).find('.to-value').val('');
    $(this).find('.suggestion-checkbox').prop('checked', false);
    $(this).removeClass('editing');
  });
  // When click cancel reply
  this.container.parent().on("click", ".btn-cancel-reply", function(e) {
    $(this).closest('.new-link').trigger('reset_reply')
  });


  // Enable and handle cookies
  if (padcookie.getPref("links") === false) {
    self.padOuter.find('#links, #linkIcons').removeClass("active");
    $('#options-links').attr('checked','unchecked');
    $('#options-links').attr('checked',false);
  } else {
    $('#options-links').attr('checked','checked');
  }

  $('#options-links').on('change', function() {
    if($('#options-links').is(':checked')){
      enableLinks()
    }else{
      disableLinks();
    }
  });

  function enableLinks() {
    padcookie.setPref("links", true);
    self.padOuter.find('#links, #linkIcons').addClass("active");
    $('body').addClass('links-active')
    $('iframe[name="ace_outer"]').contents().find('body').addClass('links-active')
  }

  function disableLinks() {
    padcookie.setPref("links", false);
    self.padOuter.find('#links, #linkIcons').removeClass("active");
    $('body').removeClass('links-active')
    $('iframe[name="ace_outer"]').contents().find('body').removeClass('links-active')
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
  if(browser.chrome || browser.firefox){
    self.padInner.contents().on("copy", function(e) {
      events.addTextOnClipboard(e, self.ace, self.padInner, false, self.links, self.linkReplies);
    });

    self.padInner.contents().on("cut", function(e) {
      events.addTextOnClipboard(e, self.ace, self.padInner, true);
    });

    self.padInner.contents().on("paste", function(e) {
      events.saveLinksAndReplies(e);
    });
  }
};

ep_links.prototype.findLinkText = function($linkBox) {
  var isReply = $linkBox.hasClass('sidebar-link-reply')
  if (isReply)
    return $linkBox.find(".link-text");
  else
    return $linkBox.find('.compact-display-content .link-text, .full-display-content .link-title-wrapper .link-text');
}
// This function is useful to collect new links on the collaborators
ep_links.prototype.collectLinksAfterSomeIntervalsOfTime = function() {
  var self = this;
  window.setTimeout(function() {
    self.collectLinks();

    var count_links=0;
    for(var key in self.links)  {count_links++;}
    var padOuter = $('iframe[name="ace_outer"]').contents();
    this.padOuter = padOuter;
    this.padInner = padOuter.find('iframe[name="ace_inner"]');
    var padLink  = this.padInner.contents().find('.link');
    if( count_links > padLink.length ) {
       window.setTimeout(function() {
          self.collectLinks();
          var count_links=0;
          for(var key in self.links)  {count_links++;}
          var padLink  = this.padInner.contents().find('.link');
          if( count_links > padLink.length ) {
             window.setTimeout(function() {
                self.collectLinks();
                var count_links=0;
                for(var key in self.links)  {count_links++;}
                var padLink  = this.padInner.contents().find('.link');
                if( count_links > padLink.length ) {
                   window.setTimeout(function() {
                      self.collectLinks();

                    }, 9000);
                }
              }, 3000);
          }
        }, 1000);
    }
  }, 300);
}

// Insert links container on element use for linenumbers
ep_links.prototype.findContainers = function(){
  var padOuter = $('iframe[name="ace_outer"]').contents();
  this.padOuter = padOuter;
  this.padInner = padOuter.find('iframe[name="ace_inner"]');
  this.outerBody = padOuter.find('#outerdocbody');
};

// Collect Links and link text content to the links div
ep_links.prototype.collectLinks = function(callback){
  var self        = this;
  var container   = this.container;
  var links    = this.links;
  var padLink  = this.padInner.contents().find('.link');

  padLink.each(function(it){
    var $this           = $(this);
    var cls             = $this.attr('class');
    var classLinkId  = /(?:^| )(c-[A-Za-z0-9]*)/.exec(cls);
    var linkId       = (classLinkId) ? classLinkId[1] : null;
    if(!linkId){
      // console.log("returning due to no link id, probably due to a deleted link");
      return;
    }

    self.padInner.contents().find("#innerdocbody").addClass("links");

    if (linkId === null) {
      var isAuthorClassName = /(?:^| )(a.[A-Za-z0-9]*)/.exec(cls);
      if (isAuthorClassName) self.removeLink(isAuthorClassName[1], it);
      return;
    }
    var linkId   = classLinkId[1];
    var linkElm  = container.find('#'+ linkId);

    var link     = links[linkId];
    if(link){
      if (link !== null) {
        // If link is not in sidebar insert it
        if (linkElm.length == 0) {
          self.insertLink(linkId, link.data, it);
        }
        // localize link element
        linkL10n.localize(linkElm);
      }
    }
    var prevLinkElm = linkElm.prev();
    var linkPos;

    if (prevLinkElm.length == 0) {
      linkPos = 0;
    } else {
      var prevLinkPos = prevLinkElm.css('top');
      var prevLinkHeight = prevLinkElm.innerHeight();

      linkPos = parseInt(prevLinkPos) + prevLinkHeight + 30;
    }

    linkElm.css({ 'top': linkPos });
  });

  // HOVER SIDEBAR LINK
  var hideLinkTimer;
  this.container.on("mouseover", ".sidebar-link", function(e){
    // highlight link
    clearTimeout(hideLinkTimer);
    linkBoxes.highlightLink(e.currentTarget.id, e);

  }).on("mouseout", ".sidebar-link", function(e){
    // do not hide directly the link, because sometime the mouse get out accidently
    hideLinkTimer = setTimeout(function() {
      linkBoxes.hideLink(e.currentTarget.id);
    },1000);
  });

  // HOVER OR CLICK THE LINKED TEXT IN THE EDITOR
  // hover event
  this.padInner.contents().on("mouseover", ".link", function(e){
    if (container.is(':visible')) { // not on mobile
      clearTimeout(hideLinkTimer);
      var linkId = self.linkIdOf(e);
      linkBoxes.highlightLink(linkId, e, $(this));
    }
  });

  // click event
  this.padInner.contents().on("click", ".link", function(e){
    var linkId = self.linkIdOf(e);
    linkBoxes.highlightLink(linkId, e, $(this));
  });

  this.padInner.contents().on("mouseleave", ".link", function(e){
    var linkOpenedByClickOnIcon = linkIcons.isLinkOpenedByClickOnIcon();
    // only closes link if it was not opened by a click on the icon
    if (!linkOpenedByClickOnIcon && container.is(':visible')) {
      hideLinkTimer = setTimeout(function() {
        self.closeOpenedLink(e);
      }, 1000);
    }
  });

  self.addListenersToCloseOpenedLink();

  self.setYofLinks();
  if(callback) callback();
};

ep_links.prototype.addListenersToCloseOpenedLink = function() {
  var self = this;

  // we need to add listeners to the different iframes of the page
  $(document).on("touchstart click", function(e){
    self.closeOpenedLinkIfNotOnSelectedElements(e);
  });
  this.padOuter.find('html').on("touchstart click", function(e){
    self.closeOpenedLinkIfNotOnSelectedElements(e);
  });
  this.padInner.contents().find('html').on("touchstart click", function(e){
    self.closeOpenedLinkIfNotOnSelectedElements(e);
  });
}

// Close link that is opened
ep_links.prototype.closeOpenedLink = function(e) {
  var linkId = this.linkIdOf(e);
  linkBoxes.hideLink(linkId);
}

// Close link if event target was outside of link or on a link icon
ep_links.prototype.closeOpenedLinkIfNotOnSelectedElements = function(e) {
  // Don't do anything if clicked on the allowed elements:
  // any of the link icons
  if (linkIcons.shouldNotCloseLink(e) || linkBoxes.shouldNotCloseLink(e)) { // a link box or the link modal
    return;
  }
  // All clear, can close the link
  this.closeOpenedLink(e);
}

// Collect Links and link text content to the links div
ep_links.prototype.collectLinkReplies = function(callback){
  var self        = this;
  var container   = this.container;
  var linkReplies = this.linkReplies;
  var padLink  = this.padInner.contents().find('.link');

  $.each(this.linkReplies, function(replyId, reply){
    var linkId = reply.linkId;
    if (linkId) {
    // tell link icon that this link has 1+ replies
    linkIcons.linkHasReply(linkId);

    var existsAlready = $('iframe[name="ace_outer"]').contents().find('#'+replyId).length;
    if(existsAlready) return;

    reply.replyId = replyId;
    reply.text = reply.text || ""
    reply.date = prettyDate(reply.timestamp);
    reply.formattedDate = new Date(reply.timestamp).toISOString();

    var content = $("#replyTemplate").tmpl(reply);
    // localize link reply
    linkL10n.localize(content);
    var repliesContainer = $('iframe[name="ace_outer"]').contents().find('#'+linkId + ' .link-replies-container');
    repliesContainer.append(content);
    }
  });
};

ep_links.prototype.linkIdOf = function(e){
  var cls             = e.currentTarget.classList;
  var classLinkId  = /(?:^| )(c-[A-Za-z0-9]*)/.exec(cls);

  return (classLinkId) ? classLinkId[1] : null;
};

// Insert link container in sidebar
ep_links.prototype.insertContainers = function(){
  var target = $('iframe[name="ace_outer"]').contents().find("#outerdocbody");

  // Create hover modal
  target.prepend("<div class='link-modal popup'><div class='popup-content link-modal-link'></div></div>");

  // Add links side bar container
  target.prepend('<div id="links"></div>');

  this.container = this.padOuter.find('#links');
};

// Insert a link node
ep_links.prototype.insertLink = function(linkId, link, index){
  var content           = null;
  var container         = this.container;
  var linkAfterIndex = container.find('.sidebar-link').eq(index);

  link.linkId = linkId;
  link.reply = true;
  content = $('#linksTemplate').tmpl(link);

  linkL10n.localize(content);

  // position doesn't seem to be relative to rep

  // console.log('position', index, linkAfterIndex);
  if (index === 0) {
    content.prependTo(container);
  } else if (linkAfterIndex.length === 0) {
    content.appendTo(container);
  } else {
    linkAfterIndex.before(content);
  }

  // insert icon
  linkIcons.addIcon(linkId, link);
};

// Set all links to be inline with their target REP
ep_links.prototype.setYofLinks = function(){
  // for each link in the pad
  var padOuter = $('iframe[name="ace_outer"]').contents();
  var padInner = padOuter.find('iframe[name="ace_inner"]');
  var inlineLinks = this.getFirstOcurrenceOfLinkIds();
  var linksToBeShown = [];

  $.each(inlineLinks, function(){
    var linkId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(this.className); // classname is the ID of the link
    if(!linkId || !linkId[1]) return;
    var linkEle = padOuter.find('#'+linkId[1])

    var topOffset = this.offsetTop;
    topOffset += parseInt(padInner.css('padding-top').split('px')[0])
    topOffset += parseInt($(this).css('padding-top').split('px')[0])

    if(linkId) {
      // adjust outer link...
      linkBoxes.adjustTopOf(linkId[1], topOffset);
      // ... and adjust icons too
      linkIcons.adjustTopOf(linkId[1], topOffset);

      // mark this link to be displayed if it was visible before we start adjusting its position
      if (linkIcons.shouldShow(linkEle)) linksToBeShown.push(linkEle);
    }
  });

  // re-display links that were visible before
  _.each(linksToBeShown, function(linkEle) {
    linkEle.show();
  });
};

ep_links.prototype.getFirstOcurrenceOfLinkIds = function(){
  var padOuter = $('iframe[name="ace_outer"]').contents();
  var padInner = padOuter.find('iframe[name="ace_inner"]').contents();
  var linksId = this.getUniqueLinksId(padInner);
  var firstOcurrenceOfLinkIds = _.map(linksId, function(linkId){
   return padInner.find("." + linkId).first().get(0);
  });
  return firstOcurrenceOfLinkIds;
 }

ep_links.prototype.getUniqueLinksId = function(padInner){
  var inlineLinks = padInner.find(".link");
  var linksId = _.map(inlineLinks, function(inlineLink){
   var linkId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(inlineLink.className);
   // avoid when it has a '.link' that it has a fakeLink class 'fakelink-123' yet.
   if(linkId && linkId[1]) return linkId[1];
  });
  return _.uniq(linksId);
}

// Indicates if all links are on the correct Y position, and don't need to
// be adjusted
ep_links.prototype.allLinksOnCorrectYPosition = function(){
  // for each link in the pad
  var padOuter = $('iframe[name="ace_outer"]').contents();
  var padInner = padOuter.find('iframe[name="ace_inner"]');
  var inlineLinks = padInner.contents().find(".link");
  var allLinksAreCorrect = true;

  $.each(inlineLinks, function(){
    var y = this.offsetTop;
    var linkId = /(?:^| )(c-[A-Za-z0-9]*)/.exec(this.className);
    if(linkId && linkId[1]) {
      if (!linkBoxes.isOnTop(linkId[1], y)) { // found one link on the incorrect place
        allLinksAreCorrect = false;
        return false; // to break loop
      }
    }
  });

  return allLinksAreCorrect;
}

ep_links.prototype.localizeExistingLinks = function() {
  var self        = this;
  var padLinks = this.padInner.contents().find('.link');
  var links    = this.links;

  padLinks.each(function(it) {
    var $this           = $(this);
    var cls             = $this.attr('class');
    var classLinkId  = /(?:^| )(c-[A-Za-z0-9]*)/.exec(cls);
    var linkId       = (classLinkId) ? classLinkId[1] : null;

    if (linkId !== null) {
      var linkElm  = self.container.find('#'+ linkId);
      var link     = links[linkId];

      // localize link element...
      linkL10n.localize(linkElm);
      // ... and update its date
      link.data.date = prettyDate(link.data.timestamp);
      link.data.formattedDate = new Date(link.data.timestamp).toISOString();
    }
  });
};

// Set links content data
ep_links.prototype.setLinks = function(links){
  for(var linkId in links){
    this.setLink(linkId, links[linkId]);
  }
};

// Set link data
ep_links.prototype.setLink = function(linkId, link){
  var links = this.links;
  link.date = prettyDate(link.timestamp);
  link.formattedDate = new Date(link.timestamp).toISOString();

  if (links[linkId] == null) links[linkId] = {};
  links[linkId].data = link;

};

// linkReply = ['c-reply-123', linkDataObject]
// linkDataObject = {author:..., name:..., text:..., ...}
ep_links.prototype.setLinkReply = function(linkReply){
  var linkReplies = this.linkReplies;
  var replyId = linkReply[0];
  linkReplies[replyId] = linkReply[1];
};

// set the text of the link or link reply
ep_links.prototype.setLinkOrReplyNewText = function(linkOrReplyId, text){
  if(this.links[linkOrReplyId]){
    this.links[linkOrReplyId].data.text = text;
  }else if(this.linkReplies[linkOrReplyId]){
    this.linkReplies[linkOrReplyId].text = text;
  }
};

// Get all links
ep_links.prototype.getLinks = function (callback){
  var req = { padId: this.padId };

  this.socket.emit('getLinks', req, function (res){
    callback(res.links);
  });
};

// Get all link replies
ep_links.prototype.getLinkReplies = function (callback){
  var req = { padId: this.padId };
  this.socket.emit('getLinkReplies', req, function (res){
    // console.log("res.replies", res.replies);
    callback(res.replies);
  });
};

ep_links.prototype.getLinkData = function (){
  var data = {};

  // Insert link data
  data.padId              = this.padId;
  data.link            = {};
  data.link.author     = clientVars.userId;
  data.link.name       = pad.myUserInfo.name;
  data.link.timestamp  = new Date().getTime();

  // If client is anonymous
  if(data.link.name === undefined){
    data.link.name = clientVars.userAgent;
  }

  return data;
}

// Delete a pad link
ep_links.prototype.deleteLink = function(linkId){
  $('iframe[name="ace_outer"]').contents().find('#' + linkId).remove();
}

ep_links.prototype.displayNewLinkForm = function() {
  var self = this;
  var rep = {};
  var ace = this.ace;

  ace.callWithAce(function(ace) {
    var saveRep = ace.ace_getRep();

    rep.lines    = saveRep.lines;
    rep.selStart = saveRep.selStart;
    rep.selEnd   = saveRep.selEnd;
  },'saveLinkedSelection', true);

  var selectedText = self.getSelectedText(rep);
  // we have nothing selected, do nothing
  var noTextSelected = (selectedText.length === 0);
  if (noTextSelected) {
    $.gritter.add({text: html10n.translations["ep_full_hyperlinks.add_link.hint"] || "Please first select the text to link"})
    return;
  }

  self.createNewLinkFormIfDontExist(rep);

  // Write the text to the changeFrom form
  $('#newLink').find(".from-value").text(selectedText);

  // Display form
  newLink.showNewLinkPopup();

  // Check if the first element selected is visible in the viewport
  var $firstSelectedElement = self.getFirstElementSelected();
  var firstSelectedElementInViewport = self.isElementInViewport($firstSelectedElement);

  if(!firstSelectedElementInViewport){
    self.scrollViewportIfSelectedTextIsNotVisible($firstSelectedElement);
  }

  // Adjust focus on the form
  $('#newLink').find('.link-content').focus();
}

ep_links.prototype.scrollViewportIfSelectedTextIsNotVisible = function($firstSelectedElement){
  // Set the top of the form to be the same Y as the target Rep
    var y = $firstSelectedElement.offsetTop;
    var padOuter = $('iframe[name="ace_outer"]').contents();
    padOuter.find('#outerdocbody').scrollTop(y); // Works in Chrome
    padOuter.find('#outerdocbody').parent().scrollTop(y); // Works in Firefox
}

ep_links.prototype.isElementInViewport = function(element) {
  var elementPosition = element.getBoundingClientRect();
  var scrollTopFirefox = $('iframe[name="ace_outer"]').contents().find('#outerdocbody').parent().scrollTop(); // works only on firefox
  var scrolltop = $('iframe[name="ace_outer"]').contents().find('#outerdocbody').scrollTop() || scrollTopFirefox;
  // position relative to the current viewport
  var elementPositionTopOnViewport = elementPosition.top - scrolltop;
  var elementPositionBottomOnViewport = elementPosition.bottom - scrolltop;

  var $ace_outer = $('iframe[name="ace_outer"]');
  var ace_outerHeight = $ace_outer.height();
  var ace_outerPaddingTop = this.getIntValueOfCSSProperty($ace_outer, "padding-top");

  var clientHeight = ace_outerHeight - ace_outerPaddingTop;

  var elementAboveViewportTop = elementPositionTopOnViewport < 0;
  var elementBelowViewportBottom = elementPositionBottomOnViewport > clientHeight;

  return !(elementAboveViewportTop || elementBelowViewportBottom);
}

ep_links.prototype.getIntValueOfCSSProperty = function($element, property){
  var valueString = $element.css(property);
  return parseInt(valueString) || 0;
}

ep_links.prototype.getFirstElementSelected = function(){
  var element;

  this.ace.callWithAce(function(ace) {
    var rep = ace.ace_getRep();
    var line = rep.lines.atIndex(rep.selStart[0]);
    var key = "#"+line.key;
    var padOuter = $('iframe[name="ace_outer"]').contents();
    var padInner = padOuter.find('iframe[name="ace_inner"]').contents();
    element = padInner.find(key);

  },'getFirstElementSelected', true);

  return element[0];
}

// Indicates if user selected some text on editor
ep_links.prototype.checkNoTextSelected = function(rep) {
  var noTextSelected = ((rep.selStart[0] == rep.selEnd[0]) && (rep.selStart[1] == rep.selEnd[1]));

  return noTextSelected;
}

// Create form to add link
ep_links.prototype.createNewLinkFormIfDontExist = function(rep) {
  var data = this.getLinkData();
  var self = this;

  // If a new link box doesn't already exist, create one
  newLink.insertNewLinkPopupIfDontExist(data, function(link, index) {
    if(link.changeTo){
      data.link.changeFrom = link.changeFrom;
      data.link.changeTo = link.changeTo;
    }
    data.link.text = link.text;

    self.saveLink(data, rep);
  });
};

// Get a string representation of the text selected on the editor
ep_links.prototype.getSelectedText = function(rep) {
  var self = this;
  var firstLine = rep.selStart[0];
  var lastLine = self.getLastLine(firstLine, rep);
  var selectedText = "";

  _(_.range(firstLine, lastLine + 1)).each(function(lineNumber){
     // rep looks like -- starts at line 2, character 1, ends at line 4 char 1
     /*
     {
        rep.selStart[2,0],
        rep.selEnd[4,2]
     }
     */
     var line = rep.lines.atIndex(lineNumber);
     // If we span over multiple lines
     if(rep.selStart[0] === lineNumber){
       // Is this the first line?
       if(rep.selStart[1] > 0){
         var posStart = rep.selStart[1];
       }else{
         var posStart = 0;
       }
     }
     if(rep.selEnd[0] === lineNumber){
       if(rep.selEnd[1] <= line.text.length){
         var posEnd = rep.selEnd[1];
       }else{
         var posEnd = 0;
       }
     }
     var lineText = line.text.substring(posStart, posEnd);
     // When it has a selection with more than one line we select at least the beginning
     // of the next line after the first line. As it is not possible to select the beginning
     // of the first line, we skip it.
     if(lineNumber > firstLine){
      // if the selection takes the very beginning of line, and the element has a lineMarker,
      // it means we select the * as well, so we need to clean it from the text selected
      lineText = self.cleanLine(line, lineText);
      lineText = '\n' + lineText;
     }
     selectedText += lineText;
  });
  return selectedText;
}

ep_links.prototype.getLastLine = function(firstLine, rep){
  var lastLineSelected = rep.selEnd[0];

  if (lastLineSelected > firstLine){
    // Ignore last line if the selected text of it it is empty
    if(this.lastLineSelectedIsEmpty(rep, lastLineSelected)){
      lastLineSelected--;
    }
  }
  return lastLineSelected;
}

ep_links.prototype.lastLineSelectedIsEmpty = function(rep, lastLineSelected){
  var line = rep.lines.atIndex(lastLineSelected);
  // when we've a line with line attribute, the first char line position
  // in a line is 1 because of the *, otherwise is 0
  var firstCharLinePosition = this.lineHasMarker(line) ? 1 : 0;
  var lastColumnSelected = rep.selEnd[1];

  return lastColumnSelected === firstCharLinePosition;
}

ep_links.prototype.lineHasMarker = function(line){
  return line.lineMarker === 1;
}

ep_links.prototype.cleanLine = function(line, lineText){
  var hasALineMarker = this.lineHasMarker(line);
  if(hasALineMarker){
    lineText = lineText.substring(1);
  }
  return lineText;
}

// Save link
ep_links.prototype.saveLink = function(data, rep) {
  var self = this;
  self.socket.emit('addLink', data, function (linkId, link){
    link.linkId = linkId;

    self.ace.callWithAce(function (ace){
      // console.log('addLink :: ', rep, link);
      ace.ace_performSelectionChange(rep.selStart, rep.selEnd, true);
      ace.ace_setAttributeOnSelection('link', linkId);
    },'insertLink', true);

    self.setLink(linkId, link);
    self.collectLinks();
  });
}

// linkData = {c-newLinkId123: data:{author:..., date:..., ...}, c-newLinkId124: data:{...}}
ep_links.prototype.saveLinkWithoutSelection = function (padId, linkData) {
  var self = this;
  var data = self.buildLinks(linkData);
  self.socket.emit('bulkAddLink', padId, data, function (links){
    self.setLinks(links);
    self.shouldCollectLink = true
  });
}

ep_links.prototype.buildLinks = function(linksData){
  var self = this;
  var links = _.map(linksData, function(linkData, linkId){
    return self.buildLink(linkId, linkData.data);
  });
  return links;
}

// linkData = {c-newLinkId123: data:{author:..., date:..., ...}, ...
ep_links.prototype.buildLink = function(linkId, linkData){
  var data = {};
  data.padId = this.padId;
  data.linkId = linkId;
  data.text = linkData.text;
  data.changeTo = linkData.changeTo
  data.changeFrom = linkData.changeFrom;
  data.name = linkData.name;
  data.timestamp = parseInt(linkData.timestamp);

  return data;
}

ep_links.prototype.getMapfakeLinks = function(){
  return this.mapFakeLinks;
}

// linkReplyData = {c-reply-123:{linkReplyData1}, c-reply-234:{linkReplyData1}, ...}
ep_links.prototype.saveLinkReplies = function(padId, linkReplyData){
  var self = this;
  var data = self.buildLinkReplies(linkReplyData);
  self.socket.emit('bulkAddLinkReplies', padId, data, function (replies){
    _.each(replies,function(reply){
      self.setLinkReply(reply);
    });
    self.shouldCollectLink = true; // force collect the link replies saved
  });
}

ep_links.prototype.buildLinkReplies = function(repliesData){
  var self = this;
  var replies = _.map(repliesData, function(replyData){
    return self.buildLinkReply(replyData);
  });
  return replies;
}

// take a replyData and add more fields necessary. E.g. 'padId'
ep_links.prototype.buildLinkReply = function(replyData){
  var data = {};
  data.padId = this.padId;
  data.linkId = replyData.linkId;
  data.text = replyData.text;
  data.changeTo = replyData.changeTo
  data.changeFrom = replyData.changeFrom;
  data.replyId = replyData.replyId;
  data.name = replyData.name;
  data.timestamp = parseInt(replyData.timestamp);

  return data;
}

// Listen for link
ep_links.prototype.linkListen = function(){
  var self = this;
  var socket = this.socket;
  socket.on('pushAddLinkInBulk', function (){
    self.getLinks(function (allLinks){
      if (!$.isEmptyObject(allLinks)){
        // we get the links in this format {c-123:{author:...}, c-124:{author:...}}
        // but it's expected to be {c-123: {data: {author:...}}, c-124:{data:{author:...}}}
        // in this.links
        var linksProcessed = {};
        _.map(allLinks, function (link, linkId) {
          linksProcessed[linkId] = {}
          linksProcessed[linkId].data = link;
        });
        self.links = linksProcessed;
        self.collectLinksAfterSomeIntervalsOfTime(); // here we collect on the collaborators
      }
    });
  });
};

// Listen for link replies
ep_links.prototype.linkRepliesListen = function(){
  var self = this;
  var socket = this.socket;
  socket.on('pushAddLinkReply', function (replyId, reply, changeTo, changeFrom){
    // console.warn("pAcR response", replyId, reply, changeTo, changeFrom);
    // callback(replyId, reply);
    // self.collectLinkReplies();
    self.getLinkReplies(function (replies){
      if (!$.isEmptyObject(replies)){
        // console.log("collecting link replies");
        self.linkReplies = replies;
        self.collectLinkReplies();
      }
    });
  });

};

ep_links.prototype.updateLinkBoxText = function (linkId, linkText) {
  var $link = this.container.parent().find("[data-linkid='" + linkId + "']");
  var textBox = this.findLinkText($link);
  textBox.text(linkText)
}

ep_links.prototype.showChangeAsAccepted = function(linkId){
  var self = this;

  // Get the link
  var link = this.container.parent().find("[data-linkid='" + linkId + "']");
  // Revert other link that have already been accepted
  link.closest('.sidebar-link')
         .find('.link-container.change-accepted').addBack('.change-accepted')
         .each(function() {
    $(this).removeClass('change-accepted');
    var data = {linkId: $(this).attr('data-linkid'), padId: self.padId}
    self.socket.emit('revertChange', data, function (){});
  })

  // this link get accepted
  link.addClass('change-accepted');
}

ep_links.prototype.showChangeAsReverted = function(linkId){
  var self = this;
  // Get the link
  var link = self.container.parent().find("[data-linkid='" + linkId + "']");
  link.removeClass('change-accepted');
}

// Push link from collaborators
ep_links.prototype.pushLink = function(eventType, callback){
  var socket = this.socket;
  var self = this;

  socket.on('textLinkUpdated', function (linkId, linkText) {
    self.updateLinkBoxText(linkId, linkText);
  })

  socket.on('linkDeleted', function(linkId){
    self.deleteLink(linkId);
  });

  socket.on('changeAccepted', function(linkId){
    self.showChangeAsAccepted(linkId);
  });

  socket.on('changeReverted', function(linkId){
    self.showChangeAsReverted(linkId);
  });

  // On collaborator add a link in the current pad
  if (eventType == 'add'){
    socket.on('pushAddLink', function (linkId, link){
      callback(linkId, link);
    });
  }

  // On reply
  else if (eventType == "addLinkReply"){
    socket.on('pushAddLinkReply', function (replyId, reply){
      callback(replyId, reply);
    });
  }
};

/************************************************************************/
/*                           Etherpad Hooks                             */
/************************************************************************/

var hooks = {

  // Init pad links
  postAceInit: function(hook, context){
    if(!pad.plugins) pad.plugins = {};
    var Links = new ep_links(context);
    pad.plugins.ep_full_hyperlinks = Links;

    if (!$('#editorcontainerbox').hasClass('flex-layout')) {
      $.gritter.add({
        title: "Error",
        text: "ep_full_hyperlinks: Please upgrade to etherpad 1.8.3 for this plugin to work correctly",
        sticky: true,
        class_name: "error"
      })
    }
  },

  aceEditEvent: function(hook, context){
    if(!pad.plugins) pad.plugins = {};
    // first check if some text is being marked/unmarked to add link to it
    var eventType = context.callstack.editEvent.eventType;
    if(eventType === "unmarkPreSelectedTextToLink") {
      pad.plugins.ep_full_hyperlinks.preLinkMarker.handleUnmarkText(context);
    } else if(eventType === "markPreSelectedTextToLink") {
      pad.plugins.ep_full_hyperlinks.preLinkMarker.handleMarkText(context);
    }

    if(eventType == "setup" || eventType == "setBaseText" || eventType == "importText") return;
    
    if(context.callstack.docTextChanged && pad.plugins.ep_full_hyperlinks){
      pad.plugins.ep_full_hyperlinks.setYofLinks();
    }

    // some times on init ep_full_hyperlinks is not yet on the plugin list
    if (pad.plugins.ep_full_hyperlinks) {
      var linkWasPasted = pad.plugins.ep_full_hyperlinks.shouldCollectLink;
      var domClean = context.callstack.domClean;
      // we have to wait the DOM update from a fakeLink 'fakelink-123' to a link class 'c-123'
      if(linkWasPasted && domClean){
        pad.plugins.ep_full_hyperlinks.collectLinks(function(){
          pad.plugins.ep_full_hyperlinks.collectLinkReplies();
          pad.plugins.ep_full_hyperlinks.shouldCollectLink = false;
        });
      }
    }
  },

  // Insert links classes
  aceAttribsToClasses: function(hook, context){
    if(context.key === 'link' && context.value !== "link-deleted") {
      return ['link', context.value];
    }
    // only read marks made by current user
    if(context.key === preLinkMark.MARK_CLASS && context.value === clientVars.userId) {
      return [preLinkMark.MARK_CLASS, context.value];
    }
  },

  aceEditorCSS: function(){
    return cssFiles;
  }

};

exports.aceEditorCSS          = hooks.aceEditorCSS;
exports.postAceInit           = hooks.postAceInit;
exports.aceAttribsToClasses   = hooks.aceAttribsToClasses;
exports.aceEditEvent          = hooks.aceEditEvent;

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
function getRepFromSelector(selector, container){
  var attributeManager = this.documentAttributeManager;

  var repArr = [];

  // first find the element
  var elements = container.contents().find(selector);
  // One might expect this to be a rep for the entire document
  // However what we actually need to do is find each selection that includes
  // this link and remove it.  This is because content can be pasted
  // Mid link which would mean a remove selection could have unexpected consequences

  $.each(elements, function(index, span){
    // create a rep array container we can push to..
    var rep = [[],[]];

    // span not be the div so we have to go to parents until we find a div
    var parentDiv = $(span).closest("div");
    // line Number is obviously relative to entire document
    // So find out how many elements before in this parent?
    var lineNumber = $(parentDiv).prevAll("div").length;
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
    var leftOffset = 0;

    // If the line has a lineAttribute then leftOffset should be +1
    // Get each line Attribute on this line..
    var hasLineAttribute = false;
    var attrArr = attributeManager.getAttributesOnLine(lineNumber);
    $.each(attrArr, function(attrK, value){
      if(value[0] === "lmkr") hasLineAttribute = true;
    });
    if(hasLineAttribute) leftOffset++;

    $(span).prevAll("span").each(function(){
      var spanOffset = $(this).text().length;
      leftOffset += spanOffset;
    });
    rep[0][1] = leftOffset;

    // All we need to know is span text length and it's left offset in chars
    var spanLength = $(span).text().length;

    rep[1][1] = rep[0][1] + $(span).text().length; // Easy!
    repArr.push(rep);
  });
  return repArr;
}
// Once ace is initialized, we set ace_doInsertHeading and bind it to the context
exports.aceInitialized = function(hook, context){
  var editorInfo = context.editorInfo;
  editorInfo.ace_getRepFromSelector = _(getRepFromSelector).bind(context);
  editorInfo.ace_getLinkIdOnFirstPositionSelected = _(getLinkIdOnFirstPositionSelected).bind(context);
  editorInfo.ace_hasLinkOnSelection = _(hasLinkOnSelection).bind(context);
}

