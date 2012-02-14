/*
 * (info
 * 
 * このサンプルコードで実際にmixi Graph APIを利用するフローを体験することができます。
 * Consumer KeyとConsumer Secretを https://sap.mixi.jp/ で取得し
 * 実際に動きを確かめて見てください。
 * また、リダイレクトURLはローカル環境で確認できるように
 * http://localhost:8080/callback を設定しています。
 * 
 * */

var CONSUMER_KEY    = '';
var CONSUMER_SECRET = '';
var REDIRECT_URL    = 'http://localhost:8080/callback';

var sys  = require('sys');
var http = require('http');
var url  = require('url');
var querystring = require('querystring');
var api = require('../src/mixi/graphapi/client');

var client = api.createClient({
    'consumerKey' : CONSUMER_KEY,
    'secret'      : CONSUMER_SECRET,
    'redirectUri' : REDIRECT_URL,
    'device'      : 'pc'
});

var apiCallbackHandler = function (req, res) {
    var requestInfo = url.parse(req.url);
    var code = requestInfo.query.split('=');

    // アクセストークンを取得し、そのままAPIをリクエスト
    var tokens;
    client.getTokens(code[1], function (response) {
        tokens = response;

        client.request({
            'accessToken' : tokens.access_token,
            'target'      : 'people/@me/@friends',
            'param'       : {
                'sortBy'    : 'affinity',
                'sortOrder' : 'descending',
                'startIndex' : 0,
                'count'      : 1000,
                'fields'     : 'thumbnailDetails,profileUrl'
            }
        }, function (result) {
            var entries = result.entry || [];

            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            res.write('<html><head><title>mixi graph api client for node sample!</title></head><body>');
//            res.write('<b>tokens:</b>' + JSON.stringify(tokens) + '<br />');
            res.write('<b>friend count:' + result.totalResults + '</b>');
            res.write('<ul>');
            // マイミクの一覧を画面に表示する
            entries.forEach(function (friend) {
                var thumbnail = friend.thumbnailDetails[2];
                res.write('<li>');
                res.write('<img src="' + thumbnail.url +'" width="' + thumbnail.width + 'px" height="' + thumbnail.height +'px" />');
                res.write('<a href="' + friend.profileUrl + '" target="_blank">' + friend.displayName + '</a>');
                res.write('</li>');
            });
            res.write('</ul>');
            res.write('</body></html>');
            res.end();

        });
    });
    
};

var anyRequestHandler = function (req, res) {
    var authPageURL = client.authPageUrl(['r_profile', 'r_profile_status']);

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<html><head><title>mixi graph api client for node sample!</title></head><body>');
    res.write('<a href="' + authPageURL +'">auth.</a>');
    res.write('</body></html>');
    res.end();
};

var server = http.createServer(
    function (req, res) {
        var requestInfo = url.parse(req.url);
        if (requestInfo.pathname === '/callback') {
            apiCallbackHandler(req, res);
        }
        else {
            anyRequestHandler(req, res);
        }
    }
).listen(8080);

sys.log('Server running at http://127.0.0.1:8080/');