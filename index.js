var eejs = require('ep_etherpad-lite/node/eejs/');
var settings = require('ep_etherpad-lite/node/utils/Settings');
var formidable = require('formidable');
var clientIO = require('socket.io-client');
var linkManager = require('./linkManager');
var links = require('./links');
var apiUtils = require('./apiUtils');
var _ = require('ep_etherpad-lite/static/js/underscore');
var meta = require('meta-resolver');

exports.padRemove = (hook_name, context, callback) => {
  linkManager.deleteLinkReplies(context.padID, function() {
    linkManager.deleteLinks(context.padID, callback);
  });
  return [];

}
exports.padCopy = (hook_name, context, callback) => {
  linkManager.copyLinks(context.originalPad.id, context.destinationID, function() {
    linkManager.copyLinkReplies(context.originalPad.id, context.destinationID, callback);
  });
  return [];
}

exports.handleMessageSecurity = (hook_name, context, callback) =>{
  if(context.message && context.message.data && context.message.data.apool){
    var apool = context.message.data.apool;
    if(apool.numToAttrib && apool.numToAttrib[0] && apool.numToAttrib[0][0]){
      if(apool.numToAttrib[0][0] === "link"){
        // Link change, allow it to override readonly security model!!
        return true;
      }else{
        return false;
      }
    }else{
      return false;
    }
  }else{
    return false;
  }
};

exports.socketio = (hook_name, args, cb) =>{
  var app = args.app;
  var io = args.io;
  var pushLink;
  var padLink = io;

  var linkSocket = io
  .of('/link')
  .on('connection',  (socket)  =>{

    // Join the rooms
    socket.on('getLinks', (data, callback)  => {
      var padId = data.padId;
      socket.join(padId);
      linkManager.getLinks(padId,  (err, links)  =>{
        callback(links);
      });
    });

    socket.on('getLinkReplies',  (data, callback) => {
      var padId = data.padId;
      linkManager.getLinkReplies(padId,  (err, replies)  =>{
        callback(replies);
      });
    });

    // On add events
    socket.on('addLink',  (data, callback) =>{
      var padId = data.padId;
      var content = data.link;
      linkManager.addLink(padId, content,  (err, linkId, link)=>{
        socket.broadcast.to(padId).emit('pushAddLink', linkId, link);
        callback(linkId, link);
      });
    });

    socket.on('deleteLink', (data, callback)=> {
      // delete the link on the database
      linkManager.deleteLink(data.padId, data.linkId, ()=>{
        // Broadcast to all other users that this link was deleted
        socket.broadcast.to(data.padId).emit('linkDeleted', data.linkId);
      });

    });

    socket.on('revertChange', (data, callback) =>{
      // Broadcast to all other users that this change was accepted.
      // Note that linkId here can either be the linkId or replyId..
      var padId = data.padId;
      linkManager.changeAcceptedState(padId, data.linkId, false, ()=>{
        socket.broadcast.to(padId).emit('changeReverted', data.linkId);
      });
    });

    socket.on('acceptChange', function(data, callback) {
      // Broadcast to all other users that this change was accepted.
      // Note that linkId here can either be the linkId or replyId..
      var padId = data.padId;
      linkManager.changeAcceptedState(padId, data.linkId, true, function(){
        socket.broadcast.to(padId).emit('changeAccepted', data.linkId);
      });
    });

    socket.on('bulkAddLink', function (padId, data, callback) {
      linkManager.bulkAddLinks(padId, data, function(error, linksId, links){
        socket.broadcast.to(padId).emit('pushAddLinkInBulk');
        var linkWithLinkId = _.object(linksId, links); // {c-123:data, c-124:data}
        callback(linkWithLinkId)
      });
    });

    socket.on('bulkAddLinkReplies', (padId, data, callback)=>{
      linkManager.bulkAddLinkReplies(padId, data, (err, repliesId, replies)=>{
        socket.broadcast.to(padId).emit('pushAddLinkReply', repliesId, replies);
        var repliesWithReplyId = _.zip(repliesId, replies);
        callback(repliesWithReplyId);
      });
    });

    socket.on('updateLinkText', (data, callback) =>{
      // Broadcast to all other users that the link text was changed.
      // Note that linkId here can either be the linkId or replyId..
      var padId = data.padId;
      var linkId = data.linkId;
      var linkText = data.linkText;
      var hyperlink = data.hyperlink;
      


      // linkManager.changeLinkText(padId, linkId, linkText, function(err) {
      //   if(!err){
      //     socket.broadcast.to(padId).emit('textLinkUpdated', linkId, linkText);
      //   }
      //   callback(err);
      // });
        linkManager.changeLinkData(data, (err) => {
        if(!err){
          socket.broadcast.to(padId).emit('textLinkUpdated', linkId, linkText,hyperlink);
        }
        callback(err);
      });
    });
    // resolve meta of url
    socket.on('metaResolver', async (data, callback) =>{
      var hyperlink = data.hyperlink;
      let promise =new Promise((resolve,reject)=>{
        meta.fetch(hyperlink,[],(err,meta) =>{
          resolve(meta)
        })
      })
      let result = await promise
      callback(result)
    })

    socket.on('addLinkReply', (data, callback)  =>{
      var padId = data.padId;
      var content = data.reply;
      var changeTo = data.changeTo || null;
      var changeFrom = data.changeFrom || null;
      var changeAccepted = data.changeAccepted || null;
      var changeReverted = data.changeReverted || null;
      var linkId = data.linkId;
      linkManager.addLinkReply(padId, data,  (err, replyId, reply, changeTo, changeFrom, changeAccepted, changeReverted) =>{
        reply.replyId = replyId;
        socket.broadcast.to(padId).emit('pushAddLinkReply', replyId, reply, changeTo, changeFrom, changeAccepted, changeReverted);
        callback(replyId, reply);
      });
    });

    // link added via API
    socket.on('apiAddLinks', (data)  =>{
      var padId = data.padId;
      var linkIds = data.linkIds;
      var links = data.links;

      for (var i = 0, len = linkIds.length; i < len; i++) {
        socket.broadcast.to(padId).emit('pushAddLink', linkIds[i], links[i]);
      }
    });

    // link reply added via API
    socket.on('apiAddLinkReplies',  (data) => {
      var padId = data.padId;
      var replyIds = data.replyIds;
      var replies = data.replies;

      for (var i = 0, len = replyIds.length; i < len; i++) {
        var reply = replies[i];
        var replyId = replyIds[i];
        reply.replyId = replyId;
        socket.broadcast.to(padId).emit('pushAddLinkReply', replyId, reply);
      }
    });

  });
  return []
};

exports.eejsBlock_dd_insert = (hook_name, args, cb)  =>{
  args.content = args.content + eejs.require("ep_full_hyperlinks/templates/menuButtons.ejs");
  return [];
};

exports.eejsBlock_mySettings = (hook_name, args, cb)  =>{
  args.content = args.content + eejs.require("ep_full_hyperlinks/templates/settings.ejs");
  return [];
};

exports.eejsBlock_editbarMenuLeft = (hook_name, args, cb)  =>{
  args.content = args.content + eejs.require("ep_full_hyperlinks/templates/linkBarButtons.ejs");
  return [];
};

exports.eejsBlock_scripts = (hook_name, args, cb)  =>{
  args.content = args.content + eejs.require("ep_full_hyperlinks/templates/links.html", {}, module);
  args.content = args.content + eejs.require("ep_full_hyperlinks/templates/linkIcons.html", {}, module);
  return [];
};

exports.eejsBlock_styles =  (hook_name, args, cb)  =>{
  args.content = args.content + eejs.require("ep_full_hyperlinks/templates/styles.html", {}, module);
  return [];
};

exports.clientVars = (hook, context, cb) => {
  var displayLinkAsIcon = settings.ep_full_hyperlinks ? settings.ep_full_hyperlinks.displayLinkAsIcon : false;
  var highlightSelectedText = settings.ep_full_hyperlinks ? settings.ep_full_hyperlinks.highlightSelectedText : false;
  return {
    "displayLinkAsIcon": displayLinkAsIcon,
    "highlightSelectedText": highlightSelectedText,
  };
};

exports.expressCreateServer = (hook_name, args, callback) => {
  args.app.get('/p/:pad/:rev?/links', (req, res)  =>{
    var fields = req.query;
    // check the api key
    if(!apiUtils.validateApiKey(fields, res)) return;

    // sanitize pad id before continuing
    var padIdReceived = apiUtils.sanitizePadId(req);

    links.getPadLinks(padIdReceived, function(err, data) {
      if(err) {
        res.json({code: 2, message: "internal error", data: null});
      } else {
        res.json({code: 0, data: data});
      }
    });
  });

  args.app.post('/p/:pad/:rev?/links', (req, res)  =>{
    new formidable.IncomingForm().parse(req, function (err, fields, files) {
      // check the api key
      if(!apiUtils.validateApiKey(fields, res)) return;

      // check required fields from link data
      if(!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

      // sanitize pad id before continuing
      var padIdReceived = apiUtils.sanitizePadId(req);

      // create data to hold link information:
      try {
        var data = JSON.parse(fields.data);

        links.bulkAddPadLinks(padIdReceived, data, function(err, linkIds, links) {
          if(err) {
            res.json({code: 2, message: "internal error", data: null});
          } else {
            broadcastLinksAdded(padIdReceived, linkIds, links);
            res.json({code: 0, linkIds: linkIds});
          }
        });
      } catch(e) {
        res.json({code: 1, message: "data must be a JSON", data: null});
      }
    });
  });

  args.app.get('/p/:pad/:rev?/linkReplies', (req, res) =>{
    //it's the same thing as the formidable's fields
    var fields = req.query;
    // check the api key
    if(!apiUtils.validateApiKey(fields, res)) return;

    //sanitize pad id before continuing
    var padIdReceived = apiUtils.sanitizePadId(req);

    // call the route with the pad id sanitized
    links.getPadLinkReplies(padIdReceived, function(err, data) {
      if(err) {
        res.json({code: 2, message: "internal error", data:null})
      } else {
        res.json({code: 0, data: data});
      }
    });
  });

  args.app.post('/p/:pad/:rev?/linkReplies', (req, res) => {
    new formidable.IncomingForm().parse(req, function (err, fields, files) {
      // check the api key
      if(!apiUtils.validateApiKey(fields, res)) return;

      // check required fields from link data
      if(!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

      // sanitize pad id before continuing
      var padIdReceived = apiUtils.sanitizePadId(req);

      // create data to hold link reply information:
      try {
        var data = JSON.parse(fields.data);

        links.bulkAddPadLinkReplies(padIdReceived, data, function(err, replyIds, replies) {
          if(err) {
            res.json({code: 2, message: "internal error", data: null});
          } else {
            broadcastLinkRepliesAdded(padIdReceived, replyIds, replies);
            res.json({code: 0, replyIds: replyIds});
          }
        });
      } catch(e) {
        res.json({code: 1, message: "data must be a JSON", data: null});
      }
    });
  });

  return [];

}

var broadcastLinksAdded = (padId, linkIds, links)  =>{
  var socket = clientIO.connect(broadcastUrl);

  var data = {
    padId: padId,
    linkIds: linkIds,
    links: links
  };

  socket.emit('apiAddLinks', data);
}

var broadcastLinkRepliesAdded = (padId, replyIds, replies)  =>{
  var socket = clientIO.connect(broadcastUrl);

  var data = {
    padId: padId,
    replyIds: replyIds,
    replies: replies
  };

  socket.emit('apiAddLinkReplies', data);
}

var broadcastUrl = apiUtils.broadcastUrlFor("/link");
