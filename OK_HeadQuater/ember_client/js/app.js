var serverUrl = 'https://demo-project-c9-mrwindy.c9.io';

var App = Ember.Application.create({
    LOG_TRANSITIONS: true,
    LOG_BINDINGS: true,
    LOG_VIEW_LOOKUPS: true,
    LOG_STACKTRACE_ON_DEPRECATION: true,
    LOG_VERSION: true,
    debugMode: true
});


App.Config = Ember.Object.extend({
    name: '',
	content: '',
	is_locked: true
});

App.Roll = Ember.Object.extend({
    diceNumber: 0,
    totalRolls: 0,
    numberOfRolls: 0,

    proportion: function() {
        var width = 50 + parseInt(400 * this.get("numberOfRolls") / this.get("totalRolls"));
        return "width: " + width + "px;";
    }.property("totalRolls", "numberOfRolls")
});

App.Router.map(function () { 
    this.route("configs", function() {
		this.route("config", { path: '/:conf_name' });
	});
    this.route("results", function() {
		this.route("appname", { path: '/:app_name' });
	});
    this.route("diagram");
});

/*
App.IndexRoute = Ember.Route.extend({
    redirect: function () {
        this.transitionTo("roll");
    }
});
*/

App.ConfigsRoute = Ember.Route.extend({
	model: function () {
	    var url = serverUrl + '/server/get-app-list';
		return Ember.$.getJSON(url).then(function(data) {
			return App.Config.create({
				conf_list: data.content
			});
		});
    },

    setupController: function(controller, model) {
        controller.set('model', model);
    }
});



App.ConfigsConfigRoute = Ember.Route.extend({
	model: function (params) {
		var url = serverUrl + '/server/get-conf?name=' + params.conf_name;
	
		return Ember.$.getJSON(url).then(function(data) {
			return App.Config.create({
				name: data.name, 
				content: data.content, 
				is_locked: true
			});
		});
    },

    setupController: function(controller, model) {
        controller.set('conf', model);
    }
});

App.ConfigsConfigController = Ember.Controller.extend({
    actions: {
		unlockToggle: function (curState) {
			this.set("conf.is_locked", !curState);
		},
		
		saveConfig: function (conf) {
			alert('Config saved: ' + conf.name);
		}
	}
});


App.ResultsRoute = Ember.Route.extend({
	model: function () {
	    var url = serverUrl + '/server/get-app-result-list';
		return Ember.$.getJSON(url).then(function(data) {
			return App.Config.create({
				conf_list: data.content
			});
		});
    },

    setupController: function(controller, model) {
        controller.set('model', model);
    }
});

App.ResultsAppnameRoute = Ember.Route.extend({
	model: function (params) {
		var url = serverUrl + '/server/get-result?name=' + params.app_name;
	
		return Ember.$.getJSON(url).then(function(data) {
			return App.Config.create({
				name: data.name, 
				content: data.content
			});
		});
    },

    setupController: function(controller, model) {
        controller.set('result', model);
    }
});

App.DiagramRoute = Ember.Route.extend({
	model: function (params) {
    },

    setupController: function(controller, model) {
    },

    actions: {
		drawDiagram: function () {
			var path = null;
			var circle = null;
			var text = null;

			var nodes = {
				"EBank": {
					name: 'EBank',
					type: 'OK'
				},
				"CoreBS": {
					name: 'CoreBS',
					type: 'WARN'
				},
				"XCard": {
					name: 'XCard',
					type: 'OK'
				},
				"FCC": {
					name: 'FCC',
					type: 'FAIL'
				},
				"StandAlone": {
					name: 'StandAlone',
					type: 'FAIL	'
				}
			};

			var links = [{
				source: "EBank",
				target: "CoreBS",
				type: "WARN",
				label: ""
			}, {
				source: "EBank",
				target: "FCC",
				type: "FAIL",
				label: ""
			}, {
				source: "EBank",
				target: "XCard",
				type: "OK",
				label: ""
			}, {
				source: "CoreBS",
				target: "XCard",
				type: "OK",
				label: ""
			}, {
				source: "CoreBS",
				target: "FCC",
				type: "FAIL",
				label: ""
			}, {
				source: "StandAlone",
				target: "StandAlone",
				type: "OK",
				label: ""
			}
			];
			
			var w = 950,
					h = 550,
					markerWidth = 6,
					markerHeight = 6,
					cRadius = 20, // play with the cRadius value
					refX = cRadius + (markerWidth * 2),
					refY = -Math.sqrt(cRadius),
					drSub = cRadius + refY;

			function draw_my_diagram() {
				links.forEach(function (link) {
					link.source = nodes[link.source];
					link.target = nodes[link.target];
				});

				

				var force = d3.layout.force()
					.gravity(.05)
					.nodes(d3.values(nodes))
					.links(links)
					.size([w, h])
					.linkDistance(100)
					.charge(-2000)
					.on("tick", tick)
					.start();

				var svg = d3.select("div#diagram_area").append("svg:svg")
					.attr("width", w)
					.attr("height", h);

				// Per-type markers, as they don't inherit styles.
				svg.append("svg:defs").selectAll("marker")
					.data(["OK", "FAIL", "WARN"])
					.enter().append("svg:marker")
					.attr("id", String)
					.attr("viewBox", "0 -5 10 10")
					.attr("refX", refX)
					.attr("refY", refY)
					.attr("markerWidth", markerWidth)
					.attr("markerHeight", markerHeight)
					.attr("orient", "auto")
					.append("svg:path")
					.attr("d", "M0,-5L10,0L0,5");

				path = svg.append("svg:g").selectAll("path")
					.data(force.links())
					.enter().append("svg:path")
					.attr("class", function (d) {
					return "link " + d.type;
				})
					.attr("marker-end", function (d) {
					return "url(#" + d.type + ")";
				});

				circle = svg.append("svg:g").selectAll("circle")
					.data(force.nodes())
					.enter().append("svg:circle")
					.attr("r", cRadius)
					.attr("class", function (d) { return "" + d.type;})
					.call(force.drag);

				text = svg.append("svg:g").selectAll("g")
					.data(force.nodes())
					.enter().append("svg:g");

				text.append("svg:text")
					.attr("x", 0)
					.attr("y", ".51em")
					.text(function (d) {
					return d.name;
				});
			}

			// Use elliptical arc path segments to doubly-encode directionality.
			function tick() {
				circle.attr("cx", function(d) { return d.x = Math.max(cRadius, Math.min(w - cRadius, d.x)); })
					.attr("cy", function(d) { return d.y = Math.max(cRadius, Math.min(h - cRadius, d.y)); });
				
				path.attr("d", function (d) {
					var dx = d.target.x - d.source.x,
						dy = (d.target.y - d.source.y),
						dr = Math.sqrt(dx * dx + dy * dy);
					return "M" + d.source.x + "," + d.source.y + "A" + (dr - drSub) + "," + (dr - drSub) + " 0 0,1 " + d.target.x + "," + d.target.y;
				});

				text.attr("transform", function (d) {
					return "translate(" + d.x + "," + d.y + ")";
				});
			}


			function load_data_and_draw_diagram() {
				// get nodes and links data from server
				var url = serverUrl + '/server/get-diagram-nodes-links';
			
				nodes = null;
				links = null;
				
				Ember.$.getJSON(url).then(function(data) {
					nodes= data.nodes;
					links = data.links;
					
					draw_my_diagram();
				});
			}
			
			load_data_and_draw_diagram();
		}
	}
});



