var crypto = require ('crypto');

/* see also => https://github.com/unscene/node-oauth */
var Signature = require('oauth-client').Signature;

var RequestVerifier = function (publicKey) {
    this.publicKey = publicKey;
};
RequestVerifier.prototype.verify = function (requestMethod, requestURL, requestParam) {
    var sig = (requestParam.oauth_signature || '')
        .replace(/[\r\n]]/mg, '');

    delete requestParam.oauth_signature;
    delete requestParam.realm;
    return crypto.createVerify(requestParam.oauth_signature_method)
        .update(new Signature().baseString(requestMethod, requestURL, requestParam))
        .verify(this.publicKey, sig, 'base64');
};

exports.RequestVerifier = RequestVerifier;