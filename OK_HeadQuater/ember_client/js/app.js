////var serverUrl = 'https://demo-project-c9-mrwindy.c9.io';

var App = Ember.Application.create({
    LOG_TRANSITIONS: true,
    LOG_BINDINGS: true,
    LOG_VIEW_LOOKUPS: true,
    LOG_STACKTRACE_ON_DEPRECATION: true,
    LOG_VERSION: true,
    debugMode: true,
    rootUrl: 'https://demo-project-c9-mrwindy.c9.io'
});


App.ControlData = Ember.Object.extend({});

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
    this.route("rooturl");
    this.route("control");
    this.route("deploy");
    this.route("editpath");
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

App.ControlRoute = Ember.Route.extend({
	model: function () {
	    var url = App.rootUrl + '/server/get-control-info';
		return App.$.getJSON(url).then(function(data) {
			console.log('[App.ConfigsRoute] data =', data);
			return App.ControlData.create({
				attackers: data.content
			});
		});
    },

    setupController: function(controller, model) {
        controller.set('model', model);
    }
});

App.ControlController = Ember.Controller.extend({
    actions: {
		showAttackerInfo: function (attacker) {
			//let attackers = this.get('model.server_app_info');
			//let attacker = findAttacker(attackers, attacker_name);
			this.set("attacker", attacker); // Set attacker to show apps
			this.set('app_with_commands', null); // Reset app_commands when change attacker
		},
		showAppCommands: function (app_info) {
			let attacker_name = this.get('attacker.host');
			let app_name = app_info.name;
			let commands = app_info.commands;
			
			let app_commands = [];
			
			for(let key in commands) {
				let command = {
					command_name: key,
					app_name: app_name,
					attacker_name: attacker_name
				};
				
				app_commands.push(command);
			}
			
			let app_with_commands = {
				name: app_name,
				commands: app_commands
			};
			
			this.set('app_with_commands', app_with_commands);
		},
		doCommand: function (attacker_name, app_name, command) {
	    	let url = App.rootUrl + '/server/control_app' 
	    		+ '?' + 'attacker=' + attacker_name + '&app_name=' + app_name 
	    		+ '&command='  + command;
			
			App.$.getJSON(url).then(function(data) {
				console.log('[App.ControlController.doCommand] data =', JSON.stringify(data));
				if (data.content === true) {
					alert('Command sent!!');
				}
				else {
					alert('Send command FAIL: ' + JSON.stringify(data));
				}
			});
		}
	}
});



// ROOT_URL 
//--------------------------------
App.RooturlRoute = Ember.Route.extend({
	model: function () {
		return {rootUrl: App.rootUrl};
    },

    setupController: function(controller, model) {
        controller.set('model', model);
    }
});

App.RooturlController = Ember.Controller.extend({
    actions: {
		saveRootURL: function (rootUrl) {
			App.rootUrl = rootUrl;
			alert('Save deploy data SUCCESS!');
		}
    }
});
//---------------------------------



// DEPLOY 
//--------------------------------
App.DeployRoute = Ember.Route.extend({
	model: function () {
		return {};
		//model = {
	    //	datetime: datetime to do deploy action
	    //	data: data that used for deploy process (host, path, files, ...)
		//}
    },

    setupController: function(controller, model) {
        controller.set('model', model);
    }
});

App.DeployController = Ember.Controller.extend({
    actions: {
		saveDeployData: function (model) {
			function saveConfig__processSuccess(data) {
				let resContent = JSON.parse(data).content;

				if (resContent === true) {
					alert('Save deploy data SUCCESS!');
				}
				else {
					alert('Save deploy data FAILED! Error: "' + resContent + '"');
				}
				
			}
			
			function saveConfig__processError(jqXHR, textStatus) {
				alert('Save deploy data FAIL! Info: ' + JSON.stringify(textStatus));
			}
			
			//Call to server to Save the content
			let postUrl = App.rootUrl + '/server/set-deploy-command';
			let postRequest = App.$.ajax({
        		type: "POST",
        		url: postUrl,
        		data: { datetime: model.datetime, data: model.data },
    		});
    		postRequest.done(saveConfig__processSuccess);
			postRequest.fail(saveConfig__processError);
		}
    }
});
//---------------------------------



App.ControlAttackerRoute = Ember.Route.extend({
	model: function (params) {
		let attackers = this.get('model');
		
		if (attackers) {
			return [attackers[0].host];
		}
		
		return null;
    },

    setupController: function(controller, model) {
        controller.set('apps', model);
    }
});




App.ConfigsRoute = Ember.Route.extend({
	model: function () {
	    var url = App.rootUrl + '/server/get-app-list';
		return App.$.getJSON(url).then(function(data) {
			console.log('[App.ConfigsRoute] data =', data);
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
		var url = App.rootUrl + '/server/get-conf?name=' + params.conf_name;
	
		return App.$.getJSON(url).then(function(data) {
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
			let self = this;
			
			function saveConfig__processSuccess(data) {
				let dataObj = JSON.parse(data).content;
				
				let isSuccess = dataObj.is_success;
				let errMsg = dataObj.err_msg;
				if (isSuccess) {
					alert('Save SUCCESS!');
				}
				else {
					alert('Save FAILED! Error: "' + errMsg + '"');
				}
				
			}
			
			function saveConfig__processError(jqXHR, textStatus) {
				alert('Save FAIL! Info: ' + JSON.stringify(textStatus));
			}
			
			//Lock the Content-textarea before Save
			self.set('conf.is_locked', true);
			
			//Call to server to Save the content
			let postUrl = App.rootUrl + '/server/set-conf';
			let postRequest = App.$.ajax({
        		type: "POST",
        		url: postUrl,
        		data: { name: conf.name, data: conf.content },
        		//success: saveConfig__processSuccess
    		});
    		postRequest.done(saveConfig__processSuccess);
			postRequest.fail(saveConfig__processError);
		}
	}
});


App.ResultsRoute = Ember.Route.extend({
	model: function () {
	    var url = App.rootUrl + '/server/get-app-result-list';
		return App.$.getJSON(url).then(function(data) {
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
		var url = App.rootUrl + '/server/get-result?name=' + params.app_name;
	
		return App.$.getJSON(url).then(function(data) {
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


App.EditpathRoute = Ember.Route.extend({
	model: function () {
	    return {
	    	//path: 'Vui lòng nhập path',
	    	//content: 'Sau khi tìm được path, dữ liệu sẽ được load vào đây!',
	    	//is_locked: true
	    }
    },

    setupController: function(controller, model) {
        controller.set('model', model);
    }
});

App.EditpathController = Ember.Controller.extend({
    actions: {
		unlockToggle: function (curState) {
			this.set("model.is_locked", !curState);
		},
		
		loadData: function(path) {
			let self = this;
			let url = App.rootUrl + '/server/get-conf-by-path?path=' + path;
		
			return App.$.getJSON(url).then(function(data) {
				self.set('model', {
					path: path, 
					content: data.content, 
					is_locked: true
				});
			});
		},
		
		saveData: function (model) {
			//alert('Save data: ' + "\n"
			//	+ 'path: ' + model.path + "\n" 
			//	+ 'data: ' + model.content);

			let self = this;
			
			function saveDataByPath__processSuccess(data) {
				let dataObj = JSON.parse(data).content;
				
				let isSuccess = dataObj.is_success;
				let errMsg = dataObj.err_msg;
				if (isSuccess) {
					alert('Save SUCCESS!');
				}
				else {
					alert('Save FAILED! Error: "' + errMsg + '"');
				}
				
			}
			
			function saveDataByPath__processError(jqXHR, textStatus) {
				alert('Save FAIL! Info: ' + JSON.stringify(textStatus));
			}
			
			
			//Check empty content
			if (model.path == null || model.path == '') {
				alert('Bạn chưa nhập PATH!');
				return;
			}
			
			// Check empty content
			if (model.content == null || model.content == '') {
				alert('Vui lòng nhập dữ liệu node!');
				return;
			}
			
			//Lock the Content-textarea before Save
			self.set('model.is_locked', true);
			
			//Call to server to Save the content
			let postUrl = App.rootUrl + '/server/set-conf-by-path';
			let postRequest = App.$.ajax({
        		type: "POST",
        		url: postUrl,
        		data: { path: model.path, data: model.content },
    		});
    		postRequest.done(saveDataByPath__processSuccess);
			postRequest.fail(saveDataByPath__processError);
		}
	}
});



App.DiagramRoute = Ember.Route.extend({
	model: function (params) {
    },

    setupController: function(controller, model) {
    },

    actions: {
    	reloadDiagram: function () {
    		alert('The diagram will be load after NodeData updated! Keep calm and wait :D');

			let url = App.rootUrl + '/server/gen-sys-diagram';
		
			return App.$.getJSON(url).then(function(data) {
				if(data.code != 1) {
					alert ('Error when generate data for Diagram!');
					return;
				}
				
	    		let the_iframe = App.$('#diagram_frame');
	    		the_iframe.attr('src',the_iframe.attr('src')); //reload the iframe
			});
    	}
	}
});



