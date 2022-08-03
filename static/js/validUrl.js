// https://github.com/ogt/valid-url


/**
 * URI spitter method - direct from RFC 3986
 * @param {string} link uri e.g. 'https://www.google.com'
 * @returns URI object with properties uri, scheme, authority, path, query, fragment.
 */
export const splitUri = (link) => {
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

export const isUri = (value) => {
  if (!value) {
    return;
  }

  // check for illegal characters
  if (/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(value)) return;

  // check for hex escapes that aren't complete
  if (/%[^0-9a-f]/i.test(value)) return;
  if (/%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)) return;

  let splitted = [];
  let scheme = '';
  let authority = '';
  let path = '';
  let query = '';
  let fragment = '';
  let out = '';

  // from RFC 3986
  splitted = splitUri(value);
  scheme = splitted.scheme;
  authority = splitted.authority;
  path = splitted.path;
  query = splitted.query;
  fragment = splitted.fragment;

  // if authority is present, the path must be empty or begin with a /
  if (authority && authority.length) {
    if (!(path.length === 0 || /^\//.test(path))) return;
  } else {
    // if authority is not present, the path must not start with //
    if (/^\/\//.test(path)) return;
  }

  if (scheme && scheme.length) {
    // scheme must begin with a letter, then consist of letters, digits, +, ., or -
    if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase())) return;
  }

  // re-assemble the URL per section 5.3 in RFC 3986
  if (scheme && scheme.length) {
    out += `${scheme}:`;
  }
  if (authority && authority.length) {
    out += `//${authority}`;
  }

  out += path;

  if (query && query.length) {
    out += `?${query}`;
  }

  if (fragment && fragment.length) {
    out += `#${fragment}`;
  }

  return out;
};
