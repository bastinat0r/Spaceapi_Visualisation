var http = require('http');
var https = require('https');
var util = require('util');
var crypto = require('crypto');
var couch = require('./couch.js');
var timers = require('timers');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

function getHttpAndHttps(url, cb) {
	if(/^https/.test(url)) {
		https.get(url, cb).on('error', function(e) {
			util.puts(JSON.stringify(e));
			util.puts(url);
			cb(null);
		}).on('error', function(e) {
			util.puts(e);
		});
	} else {
		http.get(url, cb).on('error', function(e) {
			util.puts(JSON.stringify(e));
			util.puts(url);
			cb(null);
		}).on('error', function(e) {
			util.puts(e);
		});
	}
}

function putToCouch() {
	var spaces = http.get('http://localhost:5984/spaces/_design/all/_view/json', function(res) {
		var data = "";
		res.on('data', function(chunk){
			data = data + chunk;
		});
		res.on('end', function() {
			spaces = JSON.parse(data).rows;
			util.puts(JSON.stringify(spaces));
			getListItems(spaces);
		});
	}).on('error', function(e) {
		util.puts('Couch Response Error');
		util.puts(e);
	});
}

function getListItems(spaces) {
	var current = spaces.pop();
	
	if(!current)
		return;
	
	util.puts(current.key);
	timers.setTimeout(getListItems, 3000, spaces);
	getHttpAndHttps(current.key, function(res) {
		if(res == null) {
			return;
		}
		data = "";
		res.on('data', function(chunk){
			data = data + chunk;
		});
		res.on('end', function() {
			try {
				data = JSON.parse(data);
				// util.puts(util.inspect(data));
				var spacedate = {
					space : data.space,
					open : false,
					lastchange : (new Date()).getTime() / 1000,
				}
				if(data.lastchange)
					spacedate.lastchange = data.lastchange;
				if(data.open) {
					spacedate.open = true;
				}
				if(data.state) {
					if(data.state.lastchange) {
						spacedate.lastchange = data.state.lastchange;
					}
					if(data.state.open) {
						spacedate.open = true;
					}
				}
				util.puts(util.inspect(spacedate));
				
				/* get last info and compare lastchange */
				http.get('http://localhost:5984/' + current.id + '/_design/space/_view/all', function(res) {
					var data = "";
					res.on('data', function(chunk) {
						data = data + chunk;
					});
					res.on('end', function() {
						var answer = JSON.parse(data).rows;
						if(answer && answer.length > 0) {
							var last = answer.pop();
							if(last.value.open == spacedate.open) {
								util.puts("Already have this: ");
								util.puts(util.inspect(last));
								return;
							}
						}
						couch.update(spacedate, "/" + current.id + "/", function(res) {
							res.on('data', util.puts);
							res.on('end', function() {
							});
						});
					});
				});

				
			} catch (e) {
				util.puts(current.key);
			}
		});
	});
};

function hash(str) {
	var hash = crypto.createHash('sha256');
	hash.update("" + str);
	return hash.digest('hex');
};

putToCouch();
timers.setInterval(putToCouch, 1000 * 60 * 10);
