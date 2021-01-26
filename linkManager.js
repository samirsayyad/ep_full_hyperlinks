let _ = require('ep_etherpad-lite/static/js/underscore');
var db = require('ep_etherpad-lite/node/db/DB').db;
var ERR = require('ep_etherpad-lite/node_modules/async-stacktrace');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
var readOnlyManager = require('ep_etherpad-lite/node/db/ReadOnlyManager.js');
var shared = require('./static/js/shared');

exports.getLinks = function (padId, callback)
{
  // We need to change readOnly PadIds to Normal PadIds
  let isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, (err, rwPadId)=> {
      padId = rwPadId;
    });
  }

  // Not sure if we will encouter race conditions here..  Be careful.

  //get the globalLinks
  db.get('links:' + padId, (err, links)
  => {
    if (ERR(err, callback)) return;
    // link does not exists
    if (links == null) links = {};
    callback(null, {links: links});
  });
};

exports.deleteLink = function (padId, linkId, callback)
{
  db.get(`links:${  padId}`, (err, links)
  => {
    if (ERR(err, callback)) return;

    // the entry doesn't exist so far, let's create it
    if (links == null) links = {};

    delete links[linkId];
    db.set('links:' + padId, links);

    callback(padId, linkId);

  });
};

exports.deleteLinks = function (padId, callback)
{
  db.remove(`links:${  padId}`, (err)
  => {
    if (ERR(err, callback)) return;
    callback(null);
  });
};

exports.addLink = function (padId, data, callback)
{
  exports.bulkAddLinks(padId, [data], (err, linkIds, links) => {
    if (ERR(err, callback)) return;

    if (linkIds && linkIds.length > 0 && links && links.length > 0) {
      callback(null, linkIds[0], links[0]);
    }
  });
};

exports.bulkAddLinks = function (padId, data, callback)
{
 // We need to change readOnly PadIds to Normal PadIds
  let isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, (err, rwPadId)=> {
      padId = rwPadId;
    });
  }

  //get the entry
  db.get('links:' + padId, (err, links) => {
    if (ERR(err, callback)) return;

    // the entry doesn't exist so far, let's create it
    if (links == null) links = {};

    let newLinks = [];
    let linkIds = _.map(data, (linkData) => {
      // if the link was copied it already has a linkID, so we don't need create one
      let linkId = linkData.linkId || shared.generateLinkId();

      let link = {
        author: linkData.author || 'empty',
        name: linkData.name,
        text: linkData.text,
        hyperlink: linkData.hyperlink,
        changeTo: linkData.changeTo,
        changeFrom: linkData.changeFrom,
        timestamp: parseInt(linkData.timestamp) || new Date().getTime(),
      };
      // add the entry for this pad
      links[linkId] = link;

      newLinks.push(link);
      return linkId;
    });

    // save the new element back
    db.set('links:' + padId, links);

    callback(null, linkIds, newLinks);
  });
};

exports.copyLinks = function (originalPadId, newPadID, callback)
{
  // get the links of original pad
  db.get(`links:${  originalPadId}`, (err, originalLinks) => {
    if (ERR(err, callback)) return;

    let copiedLinks = _.mapObject(originalLinks, (thisLink, thisLinkId) => {
      // make sure we have different copies of the link between pads
      return _.clone(thisLink);
    });

    // save the links on new pad
    db.set(`links:${  newPadID}`, copiedLinks);

    callback(null);
  });
};

exports.getLinkReplies = function (padId, callback) {
 // We need to change readOnly PadIds to Normal PadIds
  let isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, (err, rwPadId)=> {
      padId = rwPadId;
    });
  }

  //get the globalLinks replies
  db.get('link-replies:' + padId, (err, replies)
  => {
    if (ERR(err, callback)) return;
    // link does not exists
    if (replies == null) replies = {};
    callback(null, {replies: replies});
  });
};

exports.deleteLinkReplies = function (padId, callback) {
  db.remove(`link-replies:${  padId}`, (err)
  => {
    if (ERR(err, callback)) return;
    callback(null);
  });
};

exports.addLinkReply = function (padId, data, callback) {
  exports.bulkAddLinkReplies(padId, [data], (err, replyIds, replies) => {
    if (ERR(err, callback)) return;

    if (replyIds && replyIds.length > 0 && replies && replies.length > 0) {
      callback(null, replyIds[0], replies[0]);
    }
  });
};

exports.bulkAddLinkReplies = function (padId, data, callback) {
  // We need to change readOnly PadIds to Normal PadIds
  let isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, (err, rwPadId)=> {
      padId = rwPadId;
    });
  }

  //get the entry
  db.get('link-replies:' + padId, (err, replies)=> {
    if (ERR(err, callback)) return;

    // the entry doesn't exist so far, let's create it
    if (replies == null) replies = {};

    let newReplies = [];
    let replyIds = _.map(data, (replyData) => {
      // create the new reply id
      let replyId = 'c-reply-' + randomString(16);

      metadata = replyData.link || {};

      let reply = {
        linkId  : replyData.linkId,
        text       : replyData.reply || replyData.text,
        changeTo   : replyData.changeTo || null,
        changeFrom : replyData.changeFrom || null,
        author     : metadata.author || 'empty',
        name       : metadata.name || replyData.name,
        timestamp  : parseInt(replyData.timestamp) || new Date().getTime(),
      };

      // add the entry for this pad
      replies[replyId] = reply;

      newReplies.push(reply);
      return replyId;
    });

    // save the new element back
    db.set('link-replies:' + padId, replies);

    callback(null, replyIds, newReplies);
  });
};

exports.copyLinkReplies = function (originalPadId, newPadID, callback) {
  // get the replies of original pad
  db.get(`link-replies:${  originalPadId}`, (err, originalReplies)=> {
    if (ERR(err, callback)) return;

    let copiedReplies = _.mapObject(originalReplies, (thisReply, thisReplyId) => {
      // make sure we have different copies of the reply between pads
      return _.clone(thisReply);
    });

    // save the link replies on new pad
    db.set(`link-replies:${  newPadID}`, copiedReplies);

    callback(null);
  });
};

exports.changeAcceptedState = function (padId, linkId, state, callback) {
  // Given a link we update that link to say the change was accepted or reverted

  // We need to change readOnly PadIds to Normal PadIds
  let isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, (err, rwPadId)=> {
      padId = rwPadId;
    });
  }

  // If we're dealing with link replies we need to a different query
  var prefix = 'links:';
  if (linkId.substring(0, 7) === 'c-reply') {
    prefix = 'link-replies:';
  }

  // get the entry
  db.get(prefix + padId, (err, links)=> {

    if (ERR(err, callback)) return;

    // add the entry for this pad
    let link = links[linkId];

    if (state) {
      link.changeAccepted = true;
      link.changeReverted = false;
    } else {
      link.changeAccepted = false;
      link.changeReverted = true;
    }

    links[linkId] = link;

    // save the new element back
    db.set(prefix + padId, links);

    callback(null, linkId, link);
  });
};

exports.changeLinkText = function (padId, linkId, linkText, callback) {
  let linkTextIsNotEmpty = linkText.length > 0;
  if (linkTextIsNotEmpty) {
    // Given a link we update the link text
    // We need to change readOnly PadIds to Normal PadIds
    let isReadOnly = padId.indexOf('r.') === 0;
    if (isReadOnly) {
      readOnlyManager.getPadId(padId, (err, rwPadId)=> {
        padId = rwPadId;
      });
    }

    // If we're dealing with link replies we need to a different query
    var prefix = 'links:';
    if (linkId.substring(0, 7) === 'c-reply') {
      prefix = 'link-replies:';
    }


    // get the entry
    db.get(prefix + padId, (err, links)=> {
      if (ERR(err, callback)) return;

      // update the link text
      links[linkId].hyperlink = linkText;

      // save the link updated back
      db.set(prefix + padId, links);

      callback(null);
    });
  } else { // don't save link text blank
    callback(true);
  }
};





exports.changeLinkData = function (data, callback) {
  // var linkTextIsNotEmpty = data.linkText.length > 0;
  if (data.linkText) {
    // Given a link we update the link text
    // We need to change readOnly PadIds to Normal PadIds
    let isReadOnly = data.padId.indexOf('r.') === 0;
    if (isReadOnly) {
      readOnlyManager.getPadId(data.padId, (err, rwPadId)=> {
        data.padId = rwPadId;
      });
    }

    // If we're dealing with link replies we need to a different query
    var prefix = 'links:';
    if (data.linkId.substring(0, 7) === 'c-reply') {
      prefix = 'link-replies:';
    }


    // get the entry
    db.get(prefix + data.padId, (err, links)=> {
      if (ERR(err, callback)) return;
      // update the link text
      links[data.linkId].hyperlink = data.hyperlink;
      links[data.linkId].text = data.linkText;

      // save the link updated back
      db.set(prefix + data.padId, links);

      callback(null);
    });
  } else { // don't save link text blank
    callback(true);
  }
};
