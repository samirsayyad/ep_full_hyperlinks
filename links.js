
var linkManager = require('./linkManager');
var padManager = require("ep_etherpad-lite/node/db/PadManager");
var ERR = require("ep_etherpad-lite/node_modules/async-stacktrace");

exports.getPadLinks = function(padID, callback)
{
  linkManager.getLinks(padID, function (err, padLinks)
  {
    if(ERR(err, callback)) return;

    if(padLinks !== null) callback(null, padLinks);
  });
};

exports.getPadLinkReplies = function(padID, callback)
{
  linkManager.getLinkReplies(padID, function (err, padLinkReplies)
  {
    if(ERR(err, callback)) return;

    if(padLinkReplies !== null) callback(null, padLinkReplies);
  });
};

exports.bulkAddPadLinks = function(padID, data, callback)
{
  linkManager.bulkAddLinks(padID, data, function (err, linkIDs, links)
  {
    if(ERR(err, callback)) return;

    if(linkIDs !== null) callback(null, linkIDs, links);
  });
};

exports.bulkAddPadLinkReplies = function(padID, data, callback)
{
  linkManager.bulkAddLinkReplies(padID, data, function (err, replyIDs, replies)
  {
    if(ERR(err, callback)) return;

    if(replyIDs !== null) callback(null, replyIDs, replies);
  });
};