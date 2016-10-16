'use strict'

const module_name = 'router.main';
const YAML=require('yamljs');



function zk_get_children(host, port, path, req, res, callback) {
    const selfname = module_name + '.zk_get_children';
    const debug_logger = require('debug')(selfname);

	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);

    zkClient.once('connected', function () {
        console.log('Connected to the ZK server');
        zkClient.getChildren(path, function (error, children, stats) {
            if (error) {
                console.log('Failed to get children of node: %s due to: %s.', path, error);
                callback(error, null, req, res);
            } else {
                console.log('Get ZK node children "%s" --> OK', path);
                debug_logger('children = ' + children);
                callback(null, children, req, res);
            }
			zkClient.close();
			console.log('Close the connection to the ZK server');
        });
    });
     
    zkClient.connect();
}


function zk_create_node(host, port, path, req, res, callback) {
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);

    zkClient.once('connected', function () {
        console.log('Connected to the ZK server');
        zkClient.create(path, function (error) {
            if (error) {
                console.log('Failed to create node: %s due to: %s.', path, error);
                callback(error, null, req, res);
            } else {
                console.log('Create ZK node "%s" --> OK', path);
                callback(null, true, req, res);
            }
			zkClient.close();
			console.log('Close the connection to the ZK server');
        });
    });
     
    zkClient.connect();
}


function zk_delete_node(host, port, path, req, res, callback) {
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);

    zkClient.once('connected', function () {
        console.log('Connected to the ZK server');
        zkClient.remove(path, function (error) {
            if (error) {
                console.log('Failed to delete node: %s due to: %s.', path, error);
                callback(error, null, req, res);
            } else {
                console.log('Delete ZK node "%s" --> OK', path);
                callback(null, true, req, res);
            }
			zkClient.close();
			console.log('Close the connection to the ZK server');
        });
    });
     
    zkClient.connect();
}


function zk_get_node_data(host, port, path, req, res, callback) {
// @ Async compatible  
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);

    zkClient.once('connected', function () {
        //write_log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Connected to the ZK server'});
        console.log('debug', 'routet.main.zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Connected to the ZK server'});
		zkClient.getData(
			path,
			function (error, data, stat) {
				if (error) {
                    console.log('debug', 'routet.main..zk_get_node_data', 'FAILED', {host: host, port: port, path: path, error: error});
					callback(error, null, req, res);
				}
				else {
                    console.log('debug', 'routet.main..zk_get_node_data', 'SUCCESS', {host: host, port: port, path: path, msg: 'Get ZK_node data OK'});
					var res_data = '';
					if(data) {
						res_data = data.toString('utf8');
					}
					callback(null, res_data, req, res);
				}
				zkClient.close();
                console.log('debug', 'routet.main..zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Close the connection to the ZK server'});
			}
		);
    });
     
    zkClient.connect();
}


function zk_set_node_data(host, port, path, data, req, res, callback) {
// @ Async compatible  
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);

    zkClient.once('connected', function () {
		zkClient.setData(
			path,
			new Buffer(data, "binary"),
			function (error, stat) {
				if (error) {
                    console.log('debug', 'controller.zk_set_node_data', 'FAILED');
					callback(error, null, req, res);
				}
				else {
                    console.log('debug', 'controller.zk_set_node_data', 'SUCCESS');
					callback(null, stat, req, res);
				}
				zkClient.close();
			}
		);
    });
     
    zkClient.connect();
}


//===========================================

function yaml_data_response_callback(err, data, req, res) {
	var resData = {};
	var name = req.query.name;
	resData.name = name;
	if(err) {
		resData.content = err;
	}
	else {
		resData.content = YAML.parse(data);
		console.log('resData.content =', resData.content);
	}
	res.send(JSON.stringify(resData));
}


function data_response_callback(err, data, req, res) {
	var resData = {};
	var name = req.query.name;
	resData.name = name;
	if(err) {
		resData.content = err;
	}
	else {
		resData.content = data;
		console.log('resData.content =', resData.content);
	}
	res.send(JSON.stringify(resData));
}


function process_nodes_links_data(err, data, req, res) {
	var YAML = require('yamljs');
	
	var resData = {};
	if(err) {
		resData.content = err;
	}
	else {
		var app_status = YAML.parse(data); 
		var nodes = {};
		var links = [];
		
		for(var app_name in app_status) {
			var node = {
				name: app_name,
				type: app_status[app_name].final_status
			}
			nodes[app_name] = node;
			
			if(app_status[app_name].dependencies) {
				var dependencies_list = app_status[app_name].dependencies;
				for(var di in dependencies_list) {
					var dependence_app = dependencies_list[di];
					
					var link = {
						source: app_name,
						target: dependence_app,
						type: app_status[dependence_app].final_status,
						label: ''
					}
					links.push(link);
				}
			}
			else {
				var link = {
					source: app_name,
					target: app_name,
					type: app_status[app_name].final_status,
					label: ''
				}
				links.push(link);
			}
		}
		
		resData.nodes = nodes;
		resData.links = links;
	}
	res.send(JSON.stringify(resData));
}


function generate_command_path(zk_path_prefix, attacker_name, app_name, command, job_name_seperator) {
    let currentdate = new Date();
    let currentdate_epoch = (currentdate.getTime()-currentdate.getMilliseconds())/1000;
	let path = zk_path_prefix + '/' + attacker_name + '/' + currentdate_epoch 
		+ job_name_seperator + app_name 
		+ job_name_seperator + command;
	return path;
}


module.exports=function(app)
{
	const zkHost = app.config.zk_server.host;
	const zkPort = app.config.zk_server.port;
	const zk_appInfoPath = app.config.zk_conf.app_info_path;
	const zk_appConfigPath = app.config.zk_conf.app_conf_path;
	const zk_appResultPath = app.config.zk_conf.app_result_path;
	const zk_appStatusPath = app.config.zk_conf.app_status_path;
	const zk_attackerPathPrefix = app.config.zk_conf.attacker_path_prefix;
	const zk_jobNameSeperator = app.config.zk_conf.job_name_seperator;

	
	app.get('/server/hello', function(req,res) {
		res.send('Hello!');
	});
	
	// Get conf for apps
	app.get('/server/get-conf', function(req,res) {
		console.log('[server/get-conf] Run');

		var conf_name = req.query.name;
		
		var path = zk_appConfigPath + '/' + conf_name;
		console.log('Call zk_get_node_data');
    	zk_get_node_data(zkHost, zkPort, path, req, res, data_response_callback);
	});

	// Get conf with @path in reqest
	app.get('/server/get-conf-by-path', function(req,res) {
		console.log('[server/get-conf-by-path] Run');

		var conf_path = req.query.path;
		
		console.log('[server/get-conf-by-path]', 'Call zk_get_node_data');
    	zk_get_node_data(zkHost, zkPort, conf_path, req, res, data_response_callback);
	});

	app.get('/server/get-result', function(req,res) {
		var app_name = req.query.name;

		var path = zk_appResultPath + '/' + app_name;

		console.log('Call zk_get_node_data: ' + path);
    	zk_get_node_data(zkHost, zkPort, path, req, res, data_response_callback);
	});

	app.get('/server/create-app', function(req,res) {
		var app_name = req.query.name;
		var path = zk_appConfigPath + '/' + app_name;

		console.log('Call zk_create_node');
    	zk_create_node(zkHost, zkPort, path, req, res, data_response_callback);
	});

	app.get('/server/delete-app', function(req,res) {
		var app_name = req.query.name;
		var path = zk_appConfigPath + '/' + app_name;

		console.log('Call zk_delete_node');
    	zk_delete_node(zkHost, zkPort, path, req, res, data_response_callback);
	});

	app.get('/server/get-app-list', function(req,res) {
		console.log('[/server/get-app-list]', 'Call zk_get_children');
    	zk_get_children(zkHost, zkPort, zk_appConfigPath, req, res, data_response_callback);
	});

	/**
	 * Get info about controlled app on ZK
	 *   In now, it is on /danko/app_info
	 */
	app.get('/server/get-control-info', function(req,res) {
    	const debug_logger = require('debug')('router.main.get-control-info');
		
		console.log('[/server/get-control-info]', 'Call zk_get_children');
		debug_logger('Host = ' + zkHost + ' | Port = ' + zkPort + ' | Path = ' + zk_appInfoPath);
		
    	zk_get_node_data(zkHost, zkPort, zk_appInfoPath, req, res, yaml_data_response_callback);
	});

	app.get('/server/get-app-result-list', function(req,res) {
		console.log('[/server/get-app-result-list]', 'Call zk_get_children');
    	zk_get_children(zkHost, zkPort, zk_appResultPath, req, res, data_response_callback);
	});

	app.get('/server/get-diagram-nodes-links', function(req,res) {
		console.log('[/server/get-diagram-nodes-links]', 'Call zk_get_node_data');
    	zk_get_node_data(zkHost, zkPort, zk_appStatusPath, req, res, process_nodes_links_data);
	});
	
	app.get('/server/control_app', function(req,res) {
		let attacker_name = req.query.attacker;
		let app_nane = req.query.app_name;
		let command = req.query.command;
		
		let path = generate_command_path(zk_attackerPathPrefix, attacker_name, app_nane, command, zk_jobNameSeperator);

		console.log('[/server/control_app]', 'Call zk_create_node: ' + path);
    	zk_create_node(zkHost, zkPort, path, req, res, data_response_callback);
	});

	
	// Save node data with @path in reqest
	app.post('/server/set-conf', function(req,res) {
    	const debug_logger = require('debug')('router.main.set-conf');

		console.log('[server/set-conf] Run');

		function setConf__response_callback(err, result) {
			let resData = {};

			if(err) {
				resData.content = {is_success: false, err_msg: 'Set config FAILED.', more_info: err}
			}
			else {
				resData.content = {is_success: true, err_msg: 'Set config SUCCESS.'};
			}
			
			debug_logger('Response Data: ' + JSON.stringify(resData));
			res.send(JSON.stringify(resData));
		}

		let conf_path = zk_appConfigPath + '/' + req.body.name;
		let data = req.body.data;
		
		console.log('[server/set-conf]', 'Call zk_set_node_data');
		zk_set_node_data(
			zkHost, zkPort, 
			conf_path, data, 
			req, res,
			setConf__response_callback
		);
	});

	
	// Save node data with @path in reqest
	app.post('/server/set-conf-by-path', function(req,res) {
    	const debug_logger = require('debug')('router.main.set-conf-by-path');

		console.log('[server/set-conf-by-path] Run');

		function setConf__response_callback(err, result) {
			let resData = {};

			if(err) {
				resData.content = {is_success: false, err_msg: 'Set config FAILED.', more_info: err}
			}
			else {
				resData.content = {is_success: true, err_msg: 'Set config SUCCESS.'};
			}
			
			debug_logger('Response Data: ' + JSON.stringify(resData));
			res.send(JSON.stringify(resData));
		}

		let conf_path = req.body.path;
		let data = req.body.data;
		
		console.log('[server/set-conf-by-path]', 'Call zk_set_node_data');
		zk_set_node_data(
			zkHost, zkPort, 
			conf_path, data, 
			req, res,
			setConf__response_callback
		);
	});

	
};