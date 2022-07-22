'use strict';

const eejs = require('ep_etherpad-lite/node/eejs/');
const settings = require('ep_etherpad-lite/node/utils/Settings');
const formidable = require('formidable');
const linkManager = require('./linkManager');
const links = require('./links');
const linkUtils = require('./linkUtils');
const apiUtils = require('./apiUtils');
const _ = require('underscore');
const readOnlyManager = require('ep_etherpad-lite/node/db/ReadOnlyManager.js');
const axios = require('axios');
const HTMLparser = require('node-html-parser');

let io;

const padRemove = async (hookName, context, callback) => await Promise.all([linkManager.deleteLinks(context.padID)]);

const padCopy = async (hookName, context, callback) => {
  await Promise.all([
    linkManager.copyLinks(context.originalPad.id, context.destinationID),
  ]);
};

const handleMessageSecurity = (hookName, context, callback) => {
  const {message: {data: {apool} = {}} = {}} = context;
  if (apool && apool[0] && apool[0][0] === 'link') {
    // link change, allow it to override readonly security model!!
    return callback(true);
  }
  return callback();
};

const socketio = (hookName, args, cb) => {
  const io = args.io.of('/link');
  io.on('connection', (socket) => {
    const handler = (fn) => (...args) => {
      const respond = args.pop();
      (async () => await fn(...args))().then(
          (val) => respond(null, val),
          (err) => respond({name: err.name, message: err.message}));
    };

    // Join the rooms
    socket.on('getLinks', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      // Put read-only and read-write users in the same socket.io "room" so that they can see each
      // other's updates.
      socket.join(padId);
      const links = await linkManager.getLinks(padId);
      return links;
    }));

    // On add events
    socket.on('addLink', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      const content = data.link;
      const [linkId, link] = await linkManager.addLink(padId, content);
      if (linkId != null && link != null) {
        socket.broadcast.to(padId).emit('pushAddlink', linkId, link);
        return [linkId, link];
      }
    }));

    socket.on('deleteLink', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      await linkManager.deleteLink(padId, data.linkId, data.authorId);
      socket.broadcast.to(padId).emit('linkDeleted', data.linkId);
    }));

    socket.on('revertChange', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      // Broadcast to all other users that this change was accepted.
      // Note that linkId here can either be the linkId or replyId..
      await linkManager.changeAcceptedState(padId, data.linkId, false);
      socket.broadcast.to(padId).emit('changeReverted', data.linkId);
    }));

    socket.on('acceptChange', handler(async (data) => {
      const {padId} = await readOnlyManager.getIds(data.padId);
      // Broadcast to all other users that this change was accepted.
      // Note that linkId here can either be the linkId or replyId..
      await linkManager.changeAcceptedState(padId, data.linkId, true);
      socket.broadcast.to(padId).emit('changeAccepted', data.linkId);
    }));

    socket.on('bulkAddLink', handler(async (padId, data) => {
      padId = (await readOnlyManager.getIds(padId)).padId;
      const [linkIds, links] = await linkManager.bulkAddLinks(padId, data);
      socket.broadcast.to(padId).emit('pushAddLinkInBulk');
      return _.object(linkIds, links); // {c-123:data, c-124:data}
    }));

    socket.on('updateLinkText', handler(async (data) => {
      const {linkId, linkText} = data;
      const {padId} = await readOnlyManager.getIds(data.padId);
      await linkManager.changeLinkData({padId, ...data});
      socket.broadcast.to(padId).emit('textLinkUpdated', linkId, linkText);
    }));

    /**
     * Loads the favicon and title of the webpage.
     */
    socket.on('metaResolver', async (data, callback) => {
      try {
        const hyperlink = data.hyperlink || data.editedHyperlink;
        const response = await axios(hyperlink);
        const html = HTMLparser.parse(response.data);

        // get "https://en.wikipedia.org" from "https://en.wikipedia.org/wiki/The_Thing_(1982_film)"
        const splitUri = linkUtils.splitUri(hyperlink);
        const baseLink = `${splitUri.scheme}://${splitUri.authority}`;
        // search the head section for a link tag with a link attribute that contains 'icon'.
        const iconTag = html.querySelector("head link[rel*='icon']");
        let faviconUrl;
        if (iconTag) {
          // if link tag with attribute 'icon' was found, that's where the favicon should be
          faviconUrl = baseLink + iconTag.getAttribute('href');
        } else {
          // if not check the default path for favicons
          faviconUrl = `${baseLink}/favicon.ico`; // e.g. "en.wikipedia.org/favicon.ico"
        }
        const siteTitle = html.querySelector('title').text;

        callback({
          metadata: {
            image: faviconUrl || null,
            title: siteTitle || null,
          },
          last: data.last,
        });
      } catch (e) {
        console.error(e.message, e.status, 'error');
        callback({
          metadata: false,
          last: data.last,
        });
      }
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
  });
  return cb();
};

const eejsBlock_dd_insert = (hookName, args, cb) => {
  args.content += eejs.require('ep_full_hyperlinks/templates/menuButtons.ejs');
  return cb();
};

const eejsBlock_mySettings = (hookName, args, cb) => {
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

const eejsBlock_editbarMenuLeft = (hookName, args, cb) => {
  // check if custom button is used
  if (JSON.stringify(settings.toolbar).indexOf('addLink') > -1) {
    return cb();
  }
  args.content += eejs.require(
      'ep_full_hyperlinks/templates/linkBarButtons.ejs',
  );
  return cb();
};

const eejsBlock_scripts = (hookName, args, cb) => {
  args.content += eejs.require('ep_full_hyperlinks/templates/links.html');
  return cb();
};

const eejsBlock_styles = (hookName, args, cb) => {
  args.content += eejs.require('ep_full_hyperlinks/templates/styles.html');
  return cb();
};

const clientVars = (hook, context, cb) => {
  const displayLinkAsIcon = settings.ep_full_hyperlinks
    ? settings.ep_full_hyperlinks.displayLinkAsIcon
    : false;
  const highlightSelectedText = settings.ep_full_hyperlinks
    ? settings.ep_full_hyperlinks.highlightSelectedText
    : false;
  return cb({
    displayLinkAsIcon,
    highlightSelectedText,
  });
};

const expressCreateServer = (hookName, args, callback) => {
  args.app.get('/pluginfw/hyperlink/:pad/links/:linkId', async (req, res) => {
    // sanitize pad id before continuing
    const padId = apiUtils.sanitizePadId(req);
    const {linkId} = req.params;
    let data;
    try {
      data = await links.getPadLink(padId, linkId);
    } catch (err) {
      console.error(err.stack ? err.stack : err.toString());
      res.json({code: 2, message: 'internal error', data: null});
      return;
    }
    res.json({status: true, link: data});
  });

  args.app.get('/pluginfw/hyperlink/:pad/links', async (req, res) => {
    // sanitize pad id before continuing
    const padIdReceived = apiUtils.sanitizePadId(req);
    let data;
    try {
      data = await links.getPadLinks(padIdReceived);
    } catch (err) {
      console.error(err.stack ? err.stack : err.toString());
      res.json({code: 2, message: 'internal error', data: null});
      return;
    }
    if (data == null) return;
    res.json({code: 0, data});
  });

  args.app.post('/pluginfw/hyperlink/:pad', async (req, res) => {
    const fields = await new Promise((resolve, reject) => {
      (new formidable.IncomingForm()).parse(req, (err, fields) => {
        if (err != null) return reject(err);
        resolve(fields);
      });
    });

    // check the api key
    if (!apiUtils.validateApiKey(fields, res)) return;

    // check required fields from link data
    if (!apiUtils.validateRequiredFields(fields, ['data'], res)) return;

    // sanitize pad id before continuing
    const padIdReceived = apiUtils.sanitizePadId(req);

    // create data to hold link information:
    let data;
    try {
      data = JSON.parse(fields.data);
    } catch (err) {
      res.json({code: 1, message: 'data must be a JSON', data: null});
      return;
    }

    let linkIds, links;
    try {
      [linkIds, links] = await linkManager.bulkAddPadLinks(padIdReceived, data);
    } catch (err) {
      console.error(err.stack ? err.stack : err.toString());
      res.json({code: 2, message: 'internal error', data: null});
      return;
    }
    if (linkIds == null) return;
    for (let i = 0; i < linkIds.length; i++) {
      io.to(padIdReceived).emit('pushAddLink', linkIds[i], links[i]);
    }
    res.json({code: 0, linkIds});
  });

  return callback();
};

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
};
