const randomString = (len) => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let randomstring = '';
  len = len || 20;
  for (let i = 0; i < len; i++) {
    const rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
};

export const generateLinkId = () => `lc-${randomString(16)}`;

export const collectContentPre = (hook, context) => {
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
