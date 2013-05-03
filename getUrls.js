var http = require('http');
var util = require('util');
var couch = require('./couch.js');

var spaces = {};
http.get('http://openspace.slopjong.de/directory.json', function(res) {
	var data = "";
	res.on('data', function(chunk) {
		data = data + chunk;
		util.puts(chunk);
	});
	res.on('end', function() {
		data = JSON.parse(data);
		var list = [];
		for(var s in data) {
			list.push({
				_id: s.replace(/\W/g, '').toLowerCase(),
				name : s,
				url : data[s]
			});
		};
		couch.updateList(list, '/spaces/', function() {
			util.puts('done.');
		});
	});
}).on('error', function(e) {
	util.puts(JSON.stringify(e));
});

