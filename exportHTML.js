var eejs = require('ep_etherpad-lite/node/eejs/');
var _ = require('ep_etherpad-lite/static/js/underscore');


// Add the props to be supported in export
exports.exportHtmlAdditionalTagsWithData = function(hook, pad, cb){
  var links_used = findAllLinkUsedOn(pad);
  var tags = transformLinksIntoTags(links_used);

  cb(tags);
};

// Iterate over pad attributes to find only the link ones
function findAllLinkUsedOn(pad) {
  var links_used = [];

  pad.pool.eachAttrib(function(key, value){
    if (key === "link") {
      links_used.push(value);
    }
  });

  return links_used;
}

// Transforms an array of link names into link tags like ["link", "c-1234"]
function transformLinksIntoTags(link_names) {
  return _.map(link_names, function(link_name) {
    return ["link", link_name];
  });
}

// TODO: when "asyncLineHTMLForExport" hook is available on Etherpad, use it instead of "getLineHTMLForExport"
// exports.asyncLineHTMLForExport = function (hook, context, cb) {
//   cb(rewriteLine);
// }

exports.getLineHTMLForExport = function (hook, context) {
  rewriteLine(context);
}


function rewriteLine(context){
  var lineContent = context.lineContent;
  lineContent = replaceDataByClass(lineContent);
  // TODO: when "asyncLineHTMLForExport" hook is available on Etherpad, return "lineContent" instead of re-setting it
   context.lineContent = lineContent;
   // return lineContent;
 }

function replaceDataByClass(text) {
  return text.replace(/data-link=["|'](c-[0-9a-zA-Z]+)["|']/gi, "class='link $1'");
 }
