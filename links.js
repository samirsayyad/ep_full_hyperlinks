'use strict'

const linkManager = require('./linkManager');
const ERR = require('ep_etherpad-lite/node_modules/async-stacktrace');

exports.getPadLinks = (padID, callback) => {
  linkManager.getLinks(padID, (err, padLinks) => {
    if (ERR(err, callback)) return;
    if (padLinks != null) callback(null, padLinks);
  });
};

exports.getPadLinkReplies = (padID, callback) => {
  linkManager.getLinkReplies(padID, (err, padLinkReplies) => {
    if (ERR(err, callback)) return;
    if (padLinkReplies != null) callback(null, padLinkReplies);
  });
};

exports.bulkAddPadLinks = (padID, data, callback) => {
  linkManager.bulkAddLinks(padID, data, (err, linkIDs, links) => {
    if (ERR(err, callback)) return;
    if (linkIDs != null) callback(null, linkIDs, links);
  });
};

exports.bulkAddPadLinkReplies = (padID, data, callback) => {
  linkManager.bulkAddLinkReplies(padID, data, (err, replyIDs, replies) => {
    if (ERR(err, callback)) return;
    if (replyIDs != null) callback(null, replyIDs, replies);
  });
};
