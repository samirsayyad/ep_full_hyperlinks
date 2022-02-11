'use strict';

const linkManager = require('./linkManager');

exports.getPadLink = async (padId, linkId) => linkManager.getLink(padId, linkId);

exports.getPadLinks = async (padId) => linkManager.getLinks(padId);

exports.bulkAddPadLinks = async (padId, data) => linkManager.bulkAddLinks(padId, data);
