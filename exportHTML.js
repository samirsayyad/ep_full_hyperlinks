'use strict';

const _ = require('underscore');


// Add the props to be supported in export
exports.exportHtmlAdditionalTagsWithData = (hook, pad, cb) => {
  const links_used = findAllLinkUsedOn(pad);
  const tags = transformLinksIntoTags(links_used);

  return tags;
};

// Iterate over pad attributes to find only the link ones
const findAllLinkUsedOn = (pad) => {
  const links_used = [];

  pad.pool.eachAttrib((key, value) => {
    if (key === 'link') {
      links_used.push(value);
    }
  });

  return links_used;
};

// Transforms an array of link names into link tags like ["link", "c-1234"]
const transformLinksIntoTags = (link_names) => _.map(link_names, (link_name) => ['link', link_name]);

// TODO: when "asyncLineHTMLForExport" hook is available on Etherpad, use it instead of "getLineHTMLForExport"
// exports.asyncLineHTMLForExport = function (hook, context, cb) {
//   cb(rewriteLine);
// }

exports.getLineHTMLForExport = (hook, context) => {
  rewriteLine(context);
  return [];
};


const rewriteLine = (context) => {
  let lineContent = context.lineContent;
  lineContent = replaceDataByClass(lineContent);
  // TODO: when "asyncLineHTMLForExport" hook is available on Etherpad, return "lineContent" instead of re-setting it
  context.lineContent = lineContent;
  // return lineContent;
};

const replaceDataByClass = (text) => text.replace(/data-link=["|'](c-[0-9a-zA-Z]+)["|']/gi, "class='link $1'");
