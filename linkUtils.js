'use strict';

/**
 * URI spitter method - direct from RFC 3986
 * @param {string} link uri e.g. 'https://www.google.com'
 * @returns URI object with properties uri, scheme, authority, path, query, fragment.
 */
exports.splitUri = function (link) {
    const splitted = link.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
    let uri = splitted[0];
    let scheme = splitted[1];
    let authority = splitted[2];
    let path = splitted[3];
    let query = splitted[4];
    let fragment = splitted[5];
    return {
        uri,
        scheme,
        authority,
        path,
        query,
        fragment,
    };
}