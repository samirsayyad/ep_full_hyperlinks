'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const settings = require('ep_etherpad-lite/node/utils/Settings');
const formidable = require('formidable');
const clientIO = require('socket.io-client');
const linkManager = require('./linkManager');
const links = require('./links');
const apiUtils = require('./apiUtils');
const _ = require('underscore');
//var meta = require('meta-resolver');

// const metascraper = require('metascraper')([
//   require('metascraper-description')(),
//   require('metascraper-image')(),
//   require('metascraper-logo')(),
//   require('metascraper-title')(),
//   require('metascraper-url')(),
// ]);

const urlMetadata = require('url-metadata')


//const got = require('got');

const padRemove = async (hook_name, context, callback) => {
	return await Promise.all([
    linkManager.deleteLinkReplies(context.padID),
    linkManager.deleteLinks(context.padID),
  ]);
};

const padCopy = async (hook_name, context, callback) => {
	await Promise.all([
    linkManager.copyLinks(context.originalPad.id, context.destinationID),
    linkManager.copyLinkReplies(context.originalPad.id, context.destinationID),
  ]);
};

const handleMessageSecurity = (hook_name, context, callback) => {
	const {message: {data: {apool} = {}} = {}} = context;
  if (apool && apool[0] && apool[0][0] === 'link') {
    // link change, allow it to override readonly security model!!
    return callback(true);
  }
  return callback();
};

const socketio = (hook_name, args, cb) => {
  const io = args.io;
  io.of('/link')
      .on('connection', (socket) => {
        // Join the rooms
        socket.on('getLinks', (data, callback) => {
          const padId = data.padId;
          socket.join(padId);
          linkManager.getLinks(padId, (err, links) => {
            callback(links);
          });
        });

        socket.on('getLinkReplies', (data, callback) => {
          const padId = data.padId;
          linkManager.getLinkReplies(padId, (err, replies) => {
            callback(replies);
          });
        });

        // On add events
        socket.on('addLink', (data, callback) => {
          const padId = data.padId;
          const content = data.link;
          linkManager.addLink(padId, content, (err, linkId, link) => {
            socket.broadcast.to(padId).emit('pushAddLink', linkId, link);
            callback(linkId, link);
          });
        });

        socket.on('deleteLink', (data, callback) => {
          // delete the link on the database
          linkManager.deleteLink(data.padId, data.linkId, () => {
            // Broadcast to all other users that this link was deleted
            socket.broadcast.to(data.padId).emit('linkDeleted', data.linkId);
          });
        });

        socket.on('revertChange', (data, callback) => {
          // Broadcast to all other users that this change was accepted.
          // Note that linkId here can either be the linkId or replyId..
          const padId = data.padId;
          linkManager.changeAcceptedState(padId, data.linkId, false, () => {
            socket.broadcast.to(padId).emit('changeReverted', data.linkId);
          });
        });

        socket.on('acceptChange', (data, callback) => {
          // Broadcast to all other users that this change was accepted.
          // Note that linkId here can either be the linkId or replyId..
          const padId = data.padId;
          linkManager.changeAcceptedState(padId, data.linkId, true, () => {
            socket.broadcast.to(padId).emit('changeAccepted', data.linkId);
          });
        });

        socket.on('bulkAddLink', (padId, data, callback) => {
          linkManager.bulkAddLinks(padId, data, (error, linksId, links) => {
            socket.broadcast.to(padId).emit('pushAddLinkInBulk');
            const linkWithLinkId = _.object(linksId, links); // {c-123:data, c-124:data}
            callback(linkWithLinkId);
          });
        });

        socket.on('bulkAddLinkReplies', (padId, data, callback) => {
          linkManager.bulkAddLinkReplies(padId, data, (err, repliesId, replies) => {
            socket.broadcast.to(padId).emit('pushAddLinkReply', repliesId, replies);
            const repliesWithReplyId = _.zip(repliesId, replies);
            callback(repliesWithReplyId);
          });
        });

        socket.on('updateLinkText', (data, callback) => {
          // Broadcast to all other users that the link text was changed.
          // Note that linkId here can either be the linkId or replyId..
          const padId = data.padId;
          const linkId = data.linkId;
          const linkText = data.linkText;
          const hyperlink = data.hyperlink;


          // linkManager.changeLinkText(padId, linkId, linkText, function(err) {
          //   if(!err){
          //     socket.broadcast.to(padId).emit('textLinkUpdated', linkId, linkText);
          //   }
          //   callback(err);
          // });
          linkManager.changeLinkData(data, (err) => {
            if (!err) {
              socket.broadcast.to(padId).emit('textLinkUpdated', linkId, linkText, hyperlink);
            }
            callback(err);
          });
        });
        // resolve meta of url
        socket.on('metaResolver', async (data, callback) => {
          // var hyperlink = data.hyperlink;
          // let promise =new Promise((resolve,reject)=>{
          //   meta.fetch(hyperlink,[],(err,meta) =>{
          //     resolve(meta)
          //   })
          // })
          // let result = await promise
          try {
            // const {body: html, url} = await got(data.hyperlink);
            // const metadata = await metascraper({html, url});
            // callback({
            //   metadata,
            //   last: data.last,
            // });

            urlMetadata(data.hyperlink).then(
            function (metadata) { // success handler
              console.log("mmetadatane",metadata)
              callback({
                metadata,
                last: data.last,
              });
            },
            function (e) { // failure handler
              console.log("mmetadatane error",e.message , e.status )

              callback({
                metadata: false,
                last: data.last,
              });
            })
          } catch (e) {
            console.log(e.message , e.status  )
            callback({
              metadata: false,
              last: data.last,
            });
          }
        });

        socket.on('addLinkReply', (data, callback) => {
          const padId = data.padId;
          linkManager.addLinkReply(padId, data, (err, replyId, reply, changeTo, changeFrom, changeAccepted, changeReverted) => {
            reply.replyId = replyId;
            socket.broadcast.to(padId).emit('pushAddLinkReply', replyId, reply, changeTo, changeFrom, changeAccepted, changeReverted);
            callback(replyId, reply);
          });
        });

        // link added via API
        socket.on('apiAddLinks', (data) => {
          const padId = data.padId;
          const linkIds = data.linkIds;
          const links = data.links;

          for (let i = 0, len = linkIds.length; i < len; i++) {
            socket.broadcast.to(padId).emit('pushAddLink', linkIds[i], links[i]);
          }
        });

        // link reply added via API
        socket.on('apiAddLinkReplies', (data) => {
          const padId = data.padId;
          const replyIds = data.replyIds;
          const replies = data.replies;

          for (let i = 0, len = replyIds.length; i < len; i++) {
            const reply = replies[i];
            const replyId = replyIds[i];
            reply.replyId = replyId;
            socket.broadcast.to(padId).emit('pushAddLinkReply', replyId, reply);
          }
        });
      });
	return cb();
};

const eejsBlock_dd_insert = (hook_name, args, cb) => {
	args.content += eejs.require('ep_full_hyperlinks/templates/menuButtons.ejs');
  return cb();
};

const eejsBlock_mySettings = (hook_name, args, cb) => {
	args.content += eejs.require('ep_full_hyperlinks/templates/settings.ejs');
  return cb();
};

const padInitToolbar = (hookName, args, cb) => {
  const toolbar = args.toolbar;

  const button = toolbar.button({
    command: 'addLink',
    localizationId: 'ep_full_hyperlinks.add_link.title',
    class: 'buttonicon buttonicon-link',
  });

  toolbar.registerButton('addLink', button);

  return cb();
};

const eejsBlock_editbarMenuLeft = (hook_name, args, cb) => {
	// check if custom button is used
	if (JSON.stringify(settings.toolbar).indexOf('addLink') > -1) {
		return cb();
	}
	args.content += eejs.require('ep_full_hyperlinks/templates/linkBarButtons.ejs');
	return cb();
};

const eejsBlock_scripts = (hook_name, args, cb) => {
	args.content += eejs.require('ep_full_hyperlinks/templates/links.html');
  args.content += eejs.require('ep_full_hyperlinks/templates/linkIcons.html');
  return cb();
};

const eejsBlock_styles = (hook_name, args, cb) => {
	args.content += eejs.require('ep_full_hyperlinks/templates/styles.html');
  return cb();
};

const clientVars = (hook, context, cb) => {
  const displayLinkAsIcon = settings.ep_full_hyperlinks ? settings.ep_full_hyperlinks.displayLinkAsIcon : false;
  const highlightSelectedText = settings.ep_full_hyperlinks ? settings.ep_full_hyperlinks.highlightSelectedText : false;
	return cb({
		displayLinkAsIcon,
		highlightSelectedText,
	});
};

const expressCreateServer = (hook_name, args, callback) => {
  args.app.get('/p/:pad/:rev?/links', (req, res) => {
    const fields = req.query;
    // check the api key
    if (!apiUtils.validateApiKey(fields, res)) return;

    // sanitize pad id before continuing
    const padIdReceived = apiUtils.sanitizePadId(req);

    links.getPadLinks(padIdReceived, (err, data) => {
      if (err) {
        res.json({code: 2, message: 'internal error', data: null});
      } else {
        res.json({code: 0, data});
      }
    });
  });

  args.app.post('/p/:pad/:rev?/links', (req, res) => {
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
      // check the api key
      if (!apiUtils.validateApiKey(fields, res)) return;

      // check required fields from link data
      if (!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

      // sanitize pad id before continuing
      const padIdReceived = apiUtils.sanitizePadId(req);

      // create data to hold link information:
      try {
        const data = JSON.parse(fields.data);

        links.bulkAddPadLinks(padIdReceived, data, (err, linkIds, links) => {
          if (err) {
            res.json({code: 2, message: 'internal error', data: null});
          } else {
            broadcastLinksAdded(padIdReceived, linkIds, links);
            res.json({code: 0, linkIds});
          }
        });
      } catch (e) {
        res.json({code: 1, message: 'data must be a JSON', data: null});
      }
    });
  });

  args.app.get('/p/:pad/:rev?/linkReplies', (req, res) => {
    // it's the same thing as the formidable's fields
    const fields = req.query;
    // check the api key
    if (!apiUtils.validateApiKey(fields, res)) return;

    // sanitize pad id before continuing
    const padIdReceived = apiUtils.sanitizePadId(req);

    // call the route with the pad id sanitized
    links.getPadLinkReplies(padIdReceived, (err, data) => {
      if (err) {
        res.json({code: 2, message: 'internal error', data: null});
      } else {
        res.json({code: 0, data});
      }
    });
  });

  args.app.post('/p/:pad/:rev?/linkReplies', (req, res) => {
    new formidable.IncomingForm().parse(req, (err, fields, files) => {
      // check the api key
      if (!apiUtils.validateApiKey(fields, res)) return;

      // check required fields from link data
      if (!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

      // sanitize pad id before continuing
      const padIdReceived = apiUtils.sanitizePadId(req);

      // create data to hold link reply information:
      try {
        const data = JSON.parse(fields.data);

        links.bulkAddPadLinkReplies(padIdReceived, data, (err, replyIds, replies) => {
          if (err) {
            res.json({code: 2, message: 'internal error', data: null});
          } else {
            broadcastLinkRepliesAdded(padIdReceived, replyIds, replies);
            res.json({code: 0, replyIds});
          }
        });
      } catch (e) {
        res.json({code: 1, message: 'data must be a JSON', data: null});
      }
    });
  });

	return callback();
};

const broadcastLinksAdded = (padId, linkIds, links) => {
  const socket = clientIO.connect(broadcastUrl);

  const data = {
    padId,
    linkIds,
    links,
  };

  socket.emit('apiAddLinks', data);
};

const broadcastLinkRepliesAdded = (padId, replyIds, replies) => {
  const socket = clientIO.connect(broadcastUrl);

  const data = {
    padId,
    replyIds,
    replies,
  };

  socket.emit('apiAddLinkReplies', data);
};

const broadcastUrl = apiUtils.broadcastUrlFor('/link');

module.exports = {
	padRemove,
	padCopy,
	handleMessageSecurity,
	socketio,
	eejsBlock_dd_insert,
	eejsBlock_mySettings,
	padInitToolbar,
	eejsBlock_editbarMenuLeft,
	eejsBlock_scripts,
	eejsBlock_styles,
	clientVars,
	expressCreateServer,
}
