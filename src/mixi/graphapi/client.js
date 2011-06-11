var url         = require('url');
var http        = require('http');
var https       = require('https');
var querystring = require('querystring');

var AUTH_PAGE = {
    'pc'           : 'http://mixi.jp/connect_authorize.pl',
    'smartphone'   : 'http://mixi.jp/connect_authorize.pl',
    'featurephone' : 'http://m.mixi.jp/connect_authorize.pl'
};

var SECURE_TOKEN_ENDPOINT = 'https://secure.mixi-platform.com/2/';
var API_ENDPOINT          = 'http://api.mixi-platform.com/2/';

var Client = function (param) {
    if (!param.consumerKey || !param.secret) {
        throw new Error('param.consumerKey and param.secret must be String.');
    }
    this.consumerKey = param.consumerKey;
    this.secret = param.secret;
    this.redirectUri = param.redirectUri || '';
    this.device = param.device || 'pc';
};

Client.prototype._request = function (endPoint, params) {
    var header = params.header || {};
    var target   = params.target || '';
    var queryParam  = params.query || {};
    var cb = params.callback || function () {};
    var method = params.method || 'GET';
    var endPointUrl = url.parse(endPoint);
    var path, data;
    if (method === 'POST') {
        path = endPointUrl.pathname + target;
        data = querystring.stringify(queryParam);
        header['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    else {
        path = endPointUrl.pathname
            + target
            + '?'
            + querystring.stringify(queryParam);
    }
    var client = (endPointUrl.protocol === 'https:')
        ? https : http;
    var request = client.request({
        'method'   : method,
        'path'     : path,
        'host'     : endPointUrl.hostname,
        'headers'  : header
    });
    if (data) {
        request.write(data);
    }
    request.end();
    request.on('response', function (response) {
        response.setEncoding('utf8');
        var body = '';
        response.on('data', function (chunk) {body += chunk;});
        response.on('end', function () {
            if (cb) {
                cb({
                    'code'    : response.statusCode,
                    'headers' : response.headers,
                    'body'    : body
                });
            }
        });
    });
};

var createResponseParser = function (callback) {
    return function (response) {
        var result;
        if (response.body) {
            result = JSON.parse(response.body);
        }
        callback(result);
    };
};

Client.prototype.authPageUrl = function (scopes, state) {
    var authUrl = url.parse(AUTH_PAGE[this.device] || AUTH_PAGE['pc']);
    var queryParam = querystring.stringify({
        'client_id' : this.consumerKey,
        'response_type' : 'code',
        'scope'         : scopes.join(' '),
        'display'       : this.device,
        'state'         : state || ''
    });
    return [authUrl.href, queryParam].join('?');
};

Client.prototype.getTokens = function (code, callback) {
    if (!code) {
        return {};
    }
    var cb = (callback) ? callback : function () {};
    var requestParam = {
        'grant_type'    : 'authorization_code',
        'client_id'     : this.consumerKey,
        'client_secret' : this.secret,
        'code'          : code,
        'redirect_uri'  : this.redirectUri
    };
    return this._request(SECURE_TOKEN_ENDPOINT, {
        'method'   : 'POST',
        'target'   : 'token',
        'query'    : requestParam,
        'callback' : createResponseParser(cb)
    });
};

Client.prototype.refresh = function (refreshToken, callback) {
    var cb = (callback) ? callback : function () {};
    var requestParam = {
        'grant_type'    : 'refresh_token',
        'client_id'     : this.consumerKey,
        'client_secret' : this.secret,
        'refresh_token' : refreshToken
    };
    return this._request(SECURE_TOKEN_ENDPOINT, {
        'method'   : 'POST',
        'target'   : 'token',
        'query'    : requestParam,
        'callback' : createResponseParser(cb)
    });
};

Client.prototype.request = function (params, callback) {
    var accessToken   = params.accessToken;
    var target        = params.target;
    var requestParam  = params.param || {};
    var cb = (callback) ? callback : function () {};
    this._request(API_ENDPOINT, {
        'method' : 'GET',
        'target' : target,
        'query'  : requestParam,
        'header' : {
            'Authorization' : 'OAuth ' + accessToken
        },
        'callback' : function (response) {
            var result;
            if (response.body) {
                result = JSON.parse(response.body);
            }
            else {
                var errorCode = response.headers['www-authenticate'];
                var re = /^^OAuth error='(.*?)'$/;
                var regexResult = errorCode.match(re);
                if (regexResult.length > 1) {
                    result = {'error' : regexResult[1]};
                }
            }
            cb(result);
        }
    });
};

exports.createClient = function (param) {
    return new Client(param);
};
