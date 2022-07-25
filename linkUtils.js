/**
 * URI spitter method - direct from RFC 3986
 * @param {string} link uri e.g. 'https://www.google.com'
 * @returns URI object with properties uri, scheme, authority, path, query, fragment.
 */
exports.splitUri = (link) => {
  const splitted = link.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
  const uri = splitted[0];
  const scheme = splitted[1];
  const authority = splitted[2];
  const path = splitted[3];
  const query = splitted[4];
  const fragment = splitted[5];
  return {
    uri,
    scheme,
    authority,
    path,
    query,
    fragment,
  };
};
