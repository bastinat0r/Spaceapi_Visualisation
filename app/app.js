
/**
 * Module dependencies.
 */
var util = require('util');

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

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

app.get('/', routes.index);
app.get(/^\/space.*/, function(req, res) {
	var opts = {
		host : "localhost",
		port : 5984,
		method : "GET",
		path : req.originalUrl,
	};
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

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
}, "0.0.0.0");
