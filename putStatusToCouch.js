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
		});
	} else {
		http.get(url, cb).on('error', function(e) {
			util.puts(JSON.stringify(e));
			util.puts(url);
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
	});
}

function getListItems(spaces) {
	var current = spaces.pop();
	
	if(!current)
		return;

	getHttpAndHttps(current.key, function(res) {
		data = "";
		res.on('data', function(chunk){
			data = data + chunk;
		});
		res.on('end', function() {
			try {
				data = JSON.parse(data);
				util.puts(util.inspect(data));
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
				couch.update(data, "/" + current.id + "/", function(res) {
					res.on('data', util.puts);
					res.on('end', function() {
						getListItems(spaces);
					});
				});
			} catch (e) {
				util.puts(current.key);
				getListItems(spaces);
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
