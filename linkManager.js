'use strict';

const _ = require('underscore');
const db = require('ep_etherpad-lite/node/db/DB');
const log4js = require('ep_etherpad-lite/node_modules/log4js');
const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
const generateLinkId = () => `lc-${randomString(16)}`;

const logger = log4js.getLogger('ep_full_hyperlinks');

exports.getLink = async (padId, linkId) => {
  let links = await db.get(`links:${padId}`);
  let link = {};
  if (!links) links = {};
  if (links[linkId]) link = {id: linkId, ...links[linkId]};
  return link;
};

exports.getLinks = async (padId) => {
  // Not sure if we will encouter race conditions here..  Be careful.
  // get the globalLinks
  let links = await db.get(`links:${padId}`);
  if (!links) links = {};
  return {links};
};

exports.deleteLink = async (padId, linkId, authorId) => {
  const links = await db.get(`links:${padId}`);
  if (links == null || links[linkId] == null) {
    logger.debug(`ignoring attempt to delete non-existent link ${linkId}`);
    throw new Error('no_such_link');
  }
  // if (links[linkId].author !== authorId) {
  //   logger.debug(`author ${authorId} attempted to delete link ${linkId} ` +
  //                `belonging to author ${links[linkId].author}`);
  //   throw new Error('unauth');
  // }
  delete links[linkId];
  await db.set(`links:${padId}`, links);
};

exports.deleteLinks = async (padId) => {
  await db.remove(`links:${padId}`);
};

exports.addLink = async (padId, data) => {
  const [linkIds, links] = await exports.bulkAddLinks(padId, [data]);
  return [linkIds[0], links[0]];
};

exports.bulkAddLinks = async (padId, data) => {
  // get the entry
  let links = await db.get(`links:${padId}`);

  // the entry doesn't exist so far, let's create it
  if (links == null) links = {};

  const newlinks = [];
  const linkIds = data.map((linkData) => {
    // if the link was copied it already has a linkID, so we don't need create one
    const linkId = linkData.linkId || generateLinkId();

    const link = {
      ...linkData,
      author: linkData.author || 'empty',
      name: linkData.name,
      text: linkData.text,
      changeTo: linkData.changeTo,
      changeFrom: linkData.changeFrom,
      timestamp: parseInt(linkData.timestamp) || new Date().getTime(),
    };
    // add the entry for this pad
    links[linkId] = link;

    newlinks.push(link);
    return linkId;
  });

  // save the new element back
  await db.set(`links:${padId}`, links);

  return [linkIds, newlinks];
};

exports.copyLinks = async (originalPadId, newPadID) => {
  // get the links of original pad
  const originalLinks = await db.get(`links:${originalPadId}`);
  // make sure we have different copies of the link between pads
  const copiedLinks = _.mapObject(originalLinks, (thisLink) => _.clone(thisLink));

  // save the links on new pad
  await db.set(`links:${newPadID}`, copiedLinks);
};

exports.changeAcceptedState = async (padId, linkId, state) => {
  // get the entry
  const links = await db.get(`links:${padId}`);

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
  await db.set(`links:${padId}`, links);
};

exports.changeLinkData = async (data) => {
  const {padId, linkId, linkText, authorId, hyperlink} = data;
  if (linkText.length <= 0) {
    logger.debug(`ignoring attempt to change link ${linkId} to the empty string`);
    throw new Error('link_cannot_be_empty');
  }

  // get the entry
  const links = await db.get(`links:${padId}`);
  if (links == null || links[linkId] == null) {
    logger.debug(`ignoring attempt to edit non-existent link ${linkId}`);
    throw new Error('no_such_link');
  }
  // if (links[linkId].author !== authorId) {
  //   logger.debug(`author ${authorId} attempted to edit link ${linkId} ` +
  //                `belonging to author ${links[linkId].author}`);
  //   throw new Error('unauth');
  // }
  // update the link text
  links[linkId].text = linkText;
  links[data.linkId].hyperlink = hyperlink;
  links[data.linkId].text = linkText;

  // save the link updated back
  await db.set(`links:${padId}`, links);
};
