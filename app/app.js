
/**
 * Module dependencies.
 */
var util = require('util');

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
	, https = require('https');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/static', express.directory(__dirname + '/public'));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

function getHttpAndHttps(url, cb) {
	if(/^https/.test(url)) {
		https.get(url, cb).on('error', function(e) {
			util.puts(JSON.stringify(e));
			util.puts(url);
			cb(null);
		});
	} else {
		http.get(url, cb).on('error', function(e) {
			util.puts(JSON.stringify(e));
			util.puts(url);
			cb(null);
		});
	}
}

app.get('/', routes.index);
app.get(/_design/, function(req, res) {
	var opts = {
		host : "localhost",
		port : 5984,
		method : "GET",
		path : req.originalUrl,
	};
	util.puts(opts.path);
	var dbReq = http.request(opts, function(dbRes) {
		res.writeHead(dbRes.statusCode, dbRes.headers);
		dbRes.on('data', function(chunk) {
			res.write(chunk);
		});
		dbRes.on('end', function() {
			res.end();
		});
	}).end();

});
app.get(/^\/current/, function(req, srvRes) {
	var s = req.originalUrl.split("/");
	if(s[2]) {
		var id = s[2];
		util.puts(id);
		http.get("http://localhost:5984/spaces/"+id, function(res) {
			var data = "";
			res.on('data', function(chunk) {
				data = data + chunk;
			});
			res.on('end', function() {
				var space = JSON.parse(data);
				util.puts(space.url);
				getHttpAndHttps(""+space.url, function(spaceApiRes) {
					if(spaceApiRes && spaceApiRes.statusCode < 300) {
						srvRes.writeHead(200);
						spaceApiRes.on('data', function(data) {
							srvRes.write(data);
						});
						spaceApiRes.on('end', function() {
							srvRes.end();
						});
					} else {
						srvRes.writeHead(404);
						srvRes.end(JSON.stringify("not found"));
					}
				});
			});
		}).on('error', function(err) {
			util.puts(err);
		});
	}
	else {
		srvRes.writeHead(404);
		srvRes.end(JSON.stringify("not found"));
	}
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
}, "0.0.0.0");
