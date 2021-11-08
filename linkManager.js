const _ = require('underscore');
const db = require('ep_etherpad-lite/node/db/DB').db;
const ERR = require('ep_etherpad-lite/node_modules/async-stacktrace');
const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
const readOnlyManager = require('ep_etherpad-lite/node/db/ReadOnlyManager.js');
const {shared} = require('./static/dist/js/ep.full.hyperlinks.mini').moduleList;

exports.getLink = (padId, linkId, callback) => {
  db.get(`links:${padId}`, (err, links) => {
    if (ERR(err, callback)) return;
    let link = {};
    if (!links) links = {};
    if (links[linkId]) link = {id: linkId, ...links[linkId]};
    callback(null, link);
  });
};

exports.getLinks = (padId, callback) => {
  // We need to change readOnly PadIds to Normal PadIds
  const isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, (err, rwPadId) => {
      padId = rwPadId;
    });
  }

  // Not sure if we will encouter race conditions here..  Be careful.

  // get the globalLinks
  db.get(`links:${padId}`, (err, links) => {
    if (ERR(err, callback)) return;
    // link does not exists
    if (links == null) links = {};
    callback(null, {links});
  });
};

exports.deleteLink = (padId, linkId, callback) => {
  db.get(`links:${padId}`, (err, links) => {
    if (ERR(err, callback)) return;

    // the entry doesn't exist so far, let's create it
    if (links == null) links = {};

    delete links[linkId];
    db.set(`links:${padId}`, links);

    callback(padId, linkId);
  });
};

exports.deleteLinks = async (padId) => db.remove(`links:${padId}`);

exports.addLink = (padId, data, callback) => {
  exports.bulkAddLinks(padId, [data], (err, linkIds, links) => {
    if (ERR(err, callback)) return;

    if (linkIds && linkIds.length > 0 && links && links.length > 0) {
      callback(null, linkIds[0], links[0]);
    }
  });
};

exports.bulkAddLinks = (padId, data, callback) => {
  // We need to change readOnly PadIds to Normal PadIds
  const isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, (err, rwPadId) => {
      padId = rwPadId;
    });
  }

  // get the entry
  db.get(`links:${padId}`, (err, links) => {
    if (ERR(err, callback)) return;

    // the entry doesn't exist so far, let's create it
    if (links == null) links = {};

    const newLinks = [];
    const linkIds = _.map(data, (linkData) => {
      // if the link was copied it already has a linkID, so we don't need create one
      const linkId = linkData.linkId || shared.generateLinkId();

      const link = {
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
    db.set(`links:${padId}`, links);

    callback(null, linkIds, newLinks);
  });
};

exports.copyLinks = async (originalPadId, newPadID, callback) => {
  // get the comments of original pad
  const originalComments = await db.get(`links:${originalPadId}`);
  // make sure we have different copies of the comment between pads
  const copiedComments = _.mapObject(originalComments, (thisComment) => _.clone(thisComment));

  // save the comments on new pad
  await db.set(`links:${newPadID}`, copiedComments);
};

exports.changeAcceptedState = (padId, linkId, state, callback) => {
  // Given a link we update that link to say the change was accepted or reverted

  // We need to change readOnly PadIds to Normal PadIds
  const isReadOnly = padId.indexOf('r.') === 0;
  if (isReadOnly) {
    readOnlyManager.getPadId(padId, (err, rwPadId) => {
      padId = rwPadId;
    });
  }

  const prefix = 'links:';

  // get the entry
  db.get(prefix + padId, (err, links) => {
    if (ERR(err, callback)) return;

    // add the entry for this pad
    const link = links[linkId];

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

exports.changeLinkText = (padId, linkId, linkText, callback) => {
  const linkTextIsNotEmpty = linkText.length > 0;
  if (linkTextIsNotEmpty) {
    // Given a link we update the link text
    // We need to change readOnly PadIds to Normal PadIds
    const isReadOnly = padId.indexOf('r.') === 0;
    if (isReadOnly) {
      readOnlyManager.getPadId(padId, (err, rwPadId) => {
        padId = rwPadId;
      });
    }

    const prefix = 'links:';

    // get the entry
    db.get(prefix + padId, (err, links) => {
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

exports.changeLinkData = (data, callback) => {
  // var linkTextIsNotEmpty = data.linkText.length > 0;
  if (data.linkText) {
    // Given a link we update the link text
    // We need to change readOnly PadIds to Normal PadIds
    const isReadOnly = data.padId.indexOf('r.') === 0;
    if (isReadOnly) {
      readOnlyManager.getPadId(data.padId, (err, rwPadId) => {
        data.padId = rwPadId;
      });
    }

    const prefix = 'links:';

    // get the entry
    db.get(prefix + data.padId, (err, links) => {
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
