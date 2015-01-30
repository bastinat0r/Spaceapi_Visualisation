


drawAll(window.location.hash ? window.location.hash.substring(1): "netz39");

d3.json("/spaces/_design/all/_view/json", function(err, res) {
	if(err)
		console.log(err);
	else {
		var data = res.rows;
		data = data.sort(function(a, b) {
			if(a.value.name.toLowerCase() < b.value.name.toLowerCase())
				return -1;
			return 1;
		});
		console.log(data);
		var sel = d3.select("select");
		sel.selectAll("option")
			.data(data, function(d) {
				return d.value._id;
			})
			.enter().append("option")
			.attr("value", function(d) {
				return d.value._id;
			})
			.text(function(d) {
				return d.value.name;
			})
			.attr("selected", function(d) {
				if(!window.location.hash) {
					if(d.value._id == "netz39")
						return "selected";
				}
				if(("#" + d.value._id) == window.location.hash) {
					return "selected";
				}
			});
		sel.on('change', function() {
			var v = sel.node().options[sel.node().options.selectedIndex].value;
			console.log(v);
			drawAll(v);
		});
	}
});

var data = [];
var global_scale_x = d3.time.scale();
var scale_vis_x = d3.time.scale();
var brush = d3.svg.brush()
	.x(global_scale_x);

var width = window.innerWidth - 200; 
var height = 40;
	
function drawAll(spacename) {
	showSpaceInfo(spacename);
	d3.selectAll("svg").remove();

	now = (new Date()).getTime()/1000;
	oneweek = now - 7 * 24 * 60 * 60;
	onemonth = now - 30 * 24 * 60 * 60;
	oneyear = Math.max(now - 356 * 24 * 60 * 60, 1372684896); // t-1y > start-of-logging ?
	d3.json("/"+spacename+"/_design/space/_view/all?endkey=" + now, function(err, res) {
		d3.select("div#rowSelect")
			.style("display", "none");
		if(err)
			console.log(err);
		else {
			data = res.rows;
			if(data[0]) {
				d3.select("div#rowSelect")
					.style("display", "inline");
				data = res.rows.sort(function(a,b) {
					return a.value.lastchange*1000 - b.value.lastchange*1000;
				});
				global_scale_x.domain([d3.min(data, function(d) {
					return new Date(d.value.lastchange*1000);
				}), new Date()]);
				brush.clear();
				global_scale_x.range([0,width]);
				scale_vis_x.range([0,width]);
				scale_vis_x.domain(global_scale_x.domain());
				startSelect("placeholder_select", 6);

			}
		}
	});
/*	
	d3.json("/"+spacename+"/_design/space/_view/all?startkey=" + oneyear + "&endkey=" + now, function(err, res) {
		d3.select("div#rowVis")
			.style("display", "none");
		if(err)
			console.log(err);
		else {
			data = res.rows;
			if(data[0]) {
				data.unshift({id : "0", key: oneyear, value: {lastchange: oneyear, open: false}})
				d3.select("div#rowVis")
					.style("display", "inline");
				data = res.rows.sort(function(a,b) {
					return a.value.lastchange*1000 - b.value.lastchange*1000;
				});
			}
		}
	});
*/
}
function brushed() {
	scale_vis_x.domain(brush.empty() ? global_scale_x.domain() : brush.extent());
	drawTimeline(10);
	drawUptime(data, "placeholder_vis");
	drawBarchart(data, "placeholder_vis");
}

function startSelect(placeholder, num_ticks){
	
	var chart = d3.select("span#" + placeholder).append("svg")
		.attr("height", 90)
		.attr("width", width)
	var tl = chart.append('g')
		.attr("class", "timeline")

	var rects = tl.selectAll(".bars")
		.data(data)
		.enter().append("rect")
		.attr("class", "bars")
		.attr("y", 40)
		.attr("x", function(d, i) {
			return global_scale_x(new Date(d.value.lastchange*1000))
		})
		.attr("width", function(d, i) {
			if(i+1 < data.length) {
				return global_scale_x(data[i+1].value.lastchange*1000) - global_scale_x(d.value.lastchange*1000)
			}
			return global_scale_x(new Date()) - global_scale_x(d.value.lastchange*1000);
		})
		.attr("height", 30)
		.attr("style", function(d) {
			if(d.value.open) {
				return "fill : #0c0";
			}
			return "fill : #b00";
		});


	
	tl.selectAll("line").data(global_scale_x.ticks(num_ticks))
		.enter().append("line")
		.attr("x1", global_scale_x)
		.attr("x2", global_scale_x)
		.attr("y1", 34)
		.attr("y2", 70)
		.attr("style", "stroke: #ccc");

	tl.selectAll(".rule")
		.data(global_scale_x.ticks(num_ticks))
		.enter().append("text")
		.attr("class", "rule")
		.attr("x", global_scale_x)
		.attr("y", 32)
		.attr("text-anchor", "middle")
		.text(function(d) {
			x = new Date(d)
			return x.toISOString().split('T')[0]
		});

	var b = tl.append("g")
		.attr("class", "brush")
		.call(brush);
	b.selectAll('rect')
		.attr('height', 42)
		.attr('y', 35);

	var brush_begin = Math.max(onemonth * 1000, d3.min(global_scale_x.domain()));
	brush.extent([new Date(brush_begin), new Date()]);
	brush(b);
	brush.on('brush', brushed);

	d3.select("span#placeholder_vis").append("svg")
		.attr("class", "svgTimeline")
		.attr("height", 70)
		.attr("width", width);


	d3.select("span#placeholder_vis").append("svg")
		.attr("class", "svgUptime")
		.attr("width", 300)
		.attr("height", 150);

	d3.select("span#placeholder_vis").append("svg")
		.attr("class", "svgBarchart")
		.attr("height", 220)
		.attr("width", 800);

	brushed();
	
}

function drawUptime() {

	var open_time = 0;
	var closed_time = 0;
	for(var i = 0; i < (data.length - 1); i++) {
		timediff = data[i+1].value.lastchange*1000 - data[i].value.lastchange*1000;
		if(data[i].value.open)
			open_time += timediff;
		else
			closed_time += timediff;
	}
	if(data[data.length -1].value.open) {
		open_time += (new Date()).getTime()- data[data.length - 1].value.lastchange*1000;
	} else {
		closed_time +=  (new Date()).getTime() - data[data.length - 1].value.lastchange*1000;
	}

	svg = d3.select("span#" + placeholder)
		.append("svg")
		.attr("width", 300)
		.attr("height", 150)
	.append("g")
		.attr("transform", "translate(150, 150)");  

	var pie = d3.layout.pie()
		.sort(null)
		.value(function(d) { return d.time; })
		.startAngle(-1 * Math.PI / 2)
		.endAngle(Math.PI / 2);

	var arc = d3.svg.arc()
		.outerRadius(150 - 5)
		.innerRadius(150 - 55)
		
	var g = svg.selectAll(".arc")
		.data(pie([{open: true, time: open_time}, {open: false, time: closed_time}]))
		.enter().append("g")
		.attr("class", "arc");

	g.append("path")
		.attr("d", arc)
		.style("fill", function(d) {
			if(d.data.open)
				return "#0c0"
			return "#b00"
		});

	g.append("text")
		.attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
		.attr("dy", ".35em")
		.style("text-anchor", "middle")
		.text(function(d) { return (d.data.open ? "open " : "closed ") + (100 * d.data.time / (open_time + closed_time)).toFixed(2) + "%";})

}

function showSpaceInfo(spacename) {
	d3.select("div#spaceInfo").selectAll("dl").remove();
	d3.select("div#statusLogo").selectAll("img").remove();
	d3.select("div#Logo").selectAll("img").remove();
	d3.select("div#divSelect").selectAll("a").remove();
	d3.select("div#divSelect").append("a")
		.attr("href", "#"+spacename)
		.text("permalink");
	d3.json("/current/"+spacename, function(err, res) {
		if(err) {
			console.log(err);
		}
		if(res) {
			console.log(res);
			if(res.api == "0.13") {
				if(res.location) {
					res.address = res.location.address;
					res.lat = res.location.lat;
					res.lon = res.location.lon;
				};
				if(res.state) {
					res.open = res.state.open;
					res.icon = res.state.icon;
				}
			}
			if(res.logo) {	
				d3.select("div#Logo").append("img")
					.attr("src", res.logo)
					.style("width", "100%");
			}
			var si = d3.select("div#spaceInfo").append("dl")
				.attr("class", "dl-horizontal");
			si.append("dt").text("name");
			si.append("dd").text(res.space);
			if(res.address) {
				si.append("dt").text("address");
				si.append("dd").text(res.address);
			}
			si.append("dt").text("api version");
			si.append("dd").text(res.api);
			si.append("dt").text("contact");
			var contact = si.append("dd").append("ul").attr("class", "unstyled");
			for(var c in res.contact) {
				if(c != "issue_mail") {
					contact.append("li").text(c + ": " + res.contact[c]);
				}
			}
			si.append("dt").text("website");
			si.append("dd").append("a")
				.attr("href", res.url)
				.text(res.url);
			if(res.lastchange) {
				si.append("dt").text("last update");
				si.append("dd")
					.text((new Date(res.lastchange * 1000)).toLocaleString());
			}
			if(res.lat && res.lon) {
				si.append("dt").text("coordinates");
				si.append("dd").html("<a href=\"http://www.openstreetmap.org/?mlat=" + res.lat + "&mlon="+ res.lon + "&zoom=12\">" + "lat: " + res.lat + ", lon: " + res.lon + "</a>");
			}
			if(res.cam) {
				si.append("dt").text("webcam");
				var contact = si.append("dd").append("ul").attr("class", "unstyled");
				for(var c in res.cam) {
					contact.append("li").append("a").attr("href", res.cam[c]).text(res.cam[c]);
				}
			}

			if(!res.icon) {
				res.icon = {
					open : "http://bastinat0r.de/open.png",
					closed : "http://bastinat0r.de/close.png"
				}
			}
			d3.select("div#statusLogo").append("img")
				.attr("src", res.open ? res.icon.open : res.icon.closed)
				.attr("height", "100%")
				.style("margin-top", "25px")
				.style("margin-right", "25px")
				.style("position", "relative")
				.style("display", "inline-block")
		}
	});
};

function getHours(d) {
	if(d.length < 2)
		return [];
	var current = d.shift();
	var begin_time = new Date(current.value.lastchange * 1000);
	var full_hour = new Date(begin_time.getFullYear(), begin_time.getMonth(), begin_time.getDate(), begin_time.getHours() + 1);
	var open = current.value.open;
	var hours = [];
	for(var i = 0; i<24; i++) {
		hours.push({
			id : i,
			open : 0,
			close : 0
		});
	}
	while(full_hour.getTime() < d[d.length -1].value.lastchange * 1000) {
		if(d[0].value.lastchange * 1000 < full_hour.getTime()) {
			current = d.shift();
			open = current.value.open;
			
		}
		else{
			if(open) {
				hours[full_hour.getHours()].open++;
			} else {
				hours[full_hour.getHours()].close++;
			}
			full_hour = new Date(full_hour.getTime() + 60 * 60 * 1000);
		}
	}
/*
	var i = 0;
	var h = new Date(data[i].value.lastchange*1000);
	var current = data[i].value.open;
	h.setMinutes(0);
	h.setSeconds(0);
	h = h.getTime() + 60 * 60 * 1000;
	var next = data[1].value.lastchange*1000;

	while(h < data[data.length -1].value.lastchange) {
		if(h > next) {
			i++;
			current = data[i].value.open;
			if(data[i+1] == null) {
				return hours;
			} else {
				next = data[i+1].value.lastchange*1000;
			}
		} else {
			hours[(new Date(h)).getHours()][current ? "open" : "close"]++;
			h += 60 * 60 * 1000;
		}
	}
*/
	return hours;
};

function drawBarchart() {

	var chart = d3.select("span#placeholder_vis").select(".svgBarchart");

	var begin = d3.min(scale_vis_x.domain()).getTime();
	var end = d3.max(scale_vis_x.domain()).getTime();
	var d = data.filter(function(x) {
		return (x.value.lastchange * 1000 > begin && x.value.lastchange * 1000 < end);	
	});
	if(d[0]) {
		d.unshift({id : "0", key: begin / 1000, value: {lastchange: begin / 1000, open: !d[0].value.open}});
	}
	if(d[0]) {
		d.push({id : "0", key: end / 1000, value: {lastchange: end / 1000, open: !d[d.length-1].value.open}});
	}



	var x = d3.scale.linear()
		.domain([0,23])
		.range([100,700]);

	var hours = getHours(d);
	var bars = chart.selectAll("rect")
		.data(hours);
	bars.exit().remove();
	bars.enter().append("rect");

	bars.transition().duration(100)
		.attr("y", 220)
		.attr("x", function(d, i) {
			return x(d.id)
		})
		.attr("width", 25)
		.attr("height", function(d) {
			if(d.open + d.close == 0) {
				return 0;
			}
			return 200 * d.open / (d.open + d.close);
		})
		.attr("y", function(d) {
			if(d.open + d.close == 0) {
				return 0;
			}
			return 220 - 200 * d.open / (d.open + d.close);
		})
		.attr("style", "fill: #0c0");
	bars.append("svg:title");
	bars.selectAll("title").text(function(d) {
			if(d.open + d.close == 0) {
				return 0;
			}
			return (d.open / (d.open + d.close) * 100).toFixed(2) + "%";
		})
		
	chart.selectAll("text").remove();
	chart.selectAll("text")
		.data(d3.range(24))
		.enter().append("text")
		.attr("x", function (d) {
			return x(d) + 12;
		})
		.attr("y", 215)
		.style("text-anchor", "middle")
		.text(function(d) {return d});
}

function drawTimeline(num_ticks) {
	var x = scale_vis_x;
	var chart = d3.select("span#placeholder_vis").select(".svgTimeline");
	var rects = chart.selectAll("rect")
		.data(data);
	rects.exit().remove();
	rects.enter().append("rect");
	rects.attr("y", 20)
		.attr("x", function(d, i) {
			return x(new Date(d.value.lastchange*1000))
		})
		.attr("width", function(d, i) {
			if(i+1 < data.length) {
				return x(data[i+1].value.lastchange*1000) - x(d.value.lastchange*1000)
			}
			return x(new Date()) - x(d.value.lastchange*1000);
		})
		.attr("height", 30)
		.attr("style", function(d) {
			if(d.value.open) {
				return "fill : #0c0";
			}
			return "fill : #b00";
		})
	
	var line = chart.selectAll("line").data(x.ticks(num_ticks));
	line.enter().append("line");
	line.exit().remove();
	line.attr("x1", x)
		.attr("x2", x)
		.attr("y1", 14)
		.attr("y2", 50)
		.attr("style", "stroke: #ccc");


	var rule = chart.selectAll(".rule")
		.data(x.ticks(num_ticks));
	rule.enter().append("text");
	rule.exit().remove();
	rule.attr("class", "rule")
		.attr("x", x)
		.attr("y", 12)
		.attr("text-anchor", "middle")
		.text(function(d) {
			x = new Date(d)
			return x.toISOString().split('T')[0]
		});
}

function drawUptime() {

	var open_time = 0;
	var closed_time = 0;
	
	var begin = d3.min(scale_vis_x.domain()).getTime();
	var end = d3.max(scale_vis_x.domain()).getTime();

	var d = data.filter(function(x) {
		return (x.value.lastchange * 1000 > begin && x.value.lastchange * 1000 < end);	
	});

	if(!d[0]) {
		return;
	}

	if(!d[0].value.open) {
		open_time = d[0].value.lastchange * 1000 - begin;
	} else {
		closed_time = d[0].value.lastchange * 1000 - begin;
	}

	for(var i = 0; i < (d.length - 1); i++) {
			timediff = d[i+1].value.lastchange*1000 - d[i].value.lastchange*1000;
			if(d[i].value.open)
				open_time += timediff;
			else {
				closed_time += timediff;
			}
	}
	if(d[d.length -1].value.open) {
		open_time += end - d[d.length -1].value.lastchange * 1000;
	}
	else {
		closed_time += end - d[d.length -1].value.lastchange * 1000;
	}
	if(open_time + closed_time == 0)
		return 0;

	d3.select("span#placeholder_vis").select(".svgUptime").select("g").remove();
	svg = d3.select("span#placeholder_vis").select(".svgUptime").append("g")
			.attr("transform", "translate(150, 150)");  

	var pie = d3.layout.pie()
		.sort(null)
		.value(function(d) { return d.time; })
		.startAngle(-1 * Math.PI / 2)
		.endAngle(Math.PI / 2);

	var arc = d3.svg.arc()
		.outerRadius(150 - 5)
		.innerRadius(150 - 55)
	
	svg.selectAll(".arc").remove();
	var g = svg.selectAll(".arc")
		.data(pie([{open: true, time: open_time}, {open: false, time: closed_time}]));
	g.enter().append("g")
		.attr("class", "arc");

	g.append("path")
		.attr("d", arc)
		.style("fill", function(d) {
			if(d.data.open)
				return "#0c0"
			return "#b00"
		});

	g.append("text")
		.attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
		.attr("dy", ".35em")
		.style("text-anchor", "middle")
		.text(function(d) { return (d.data.open ? "open " : "closed ") + (100 * d.data.time / (open_time + closed_time)).toFixed(2) + "%";})
}	
