'use strict';

const linkManager = require('./linkManager');
const ERR = require('ep_etherpad-lite/node_modules/async-stacktrace');

exports.getPadLink = (padID, linkID, callback) => {
  linkManager.getLink(padID, linkID, (err, link) => {
    if (ERR(err, callback)) return;
    if (link != null) callback(null, link);
  });
};

exports.getPadLinks = (padID, callback) => {
  linkManager.getLinks(padID, (err, padLinks) => {
    if (ERR(err, callback)) return;
    if (padLinks != null) callback(null, padLinks);
  });
};

exports.bulkAddPadLinks = (padID, data, callback) => {
  linkManager.bulkAddLinks(padID, data, (err, linkIDs, links) => {
    if (ERR(err, callback)) return;
    if (linkIDs != null) callback(null, linkIDs, links);
  });
};
