'use strict'

const shared = (() => {
  const collectContentPre = (hook, context) => {
    const link = /(?:^| )(lc-[A-Za-z0-9]*)/.exec(context.cls);
    const fakeLink = /(?:^| )(fakelink-[A-Za-z0-9]*)/.exec(context.cls);

    if (link && link[1]) {
      context.cc.doAttrib(context.state, `link::${link[1]}`);
    }

    // a fake link is a link copied from this or another pad. To avoid conflicts
    // with existing links, a fake linkId is used, so then we generate a new one
    // when the link is saved
    if (fakeLink) {
      const mapFakeLinks = pad.plugins.ep_full_hyperlinks.getMapfakeLinks();
      const fakeLinkId = fakeLink[1];
      const linkId = mapFakeLinks[fakeLinkId];
      context.cc.doAttrib(context.state, `link::${linkId}`);
    }

    return [];
  };

  const generateLinkId = function () {
    const linkId = `lc-${randomString(16)}`;
    return linkId;
  };

  return {
    collectContentPre,
    generateLinkId,
  };
})();
