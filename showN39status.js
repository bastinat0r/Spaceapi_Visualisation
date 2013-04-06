var http = require('http');
var util = require('util');

http.get('http://spaceapi.n39.eu/json', function(res) {
	var data = "";
	res.on('data', function(chunk) {
		data = data + chunk;
	});
	res.on('end', function() {
		data = JSON.parse(data);
		util.puts(JSON.stringify(data));
		if(data.open) {
			util.puts("Netz39 is open");
		} else {
			util.puts("Netz39 is closed");
		}
		util.puts("Since " + (new Date(data.lastchange)).toLocaleString());
	});
}).on('error', function(err) {
	util.puts(err);
});;
