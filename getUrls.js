var http = require('http');
var util = require('util');
var couch = require('./couch.js');

var spaces = {};
http.get('http://spaceapi.fixme.ch/directory.json', function(res) {
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
		updateList(list, '/spaces/', function() {
			util.puts('done.');
		});
	});
}).on('error', function(e) {
	util.puts(JSON.stringify(e));
});

function updateList(list, dbpath, cb) {
	if(list[0]) {
		current = list.pop();
		couch.createDB("/" + current._id, function(res) {
			util.puts(res.statusCode);
			res.on('data', util.puts);
			couch.update(JSON.parse("{\"_id\":\"_design/space\",\"language\":\"javascript\",\"views\":{\"all\":{\"map\":\"function(doc) { emit(doc.lastchange, {open : doc.open, lastchange : doc.lastchange});}\"}}}"), "/"+ current._id + "/", function(res) {
				res.on('data', util.puts);
			});
		});
		couch.update(current, dbpath, function(res) {
			res.on('data', util.puts);
			res.on('end', function() {
				updateList(list, dbpath, cb);
			});
		});
	} else {
		cb();
	}
}
