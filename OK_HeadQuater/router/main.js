function zk_get_children(host, port, path, req, res, callback) {
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
        console.log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Connected to the ZK server'});
		zkClient.getData(
			path,
			function (error, data, stat) {
				if (error) {
                    //write_log('debug', 'controller.zk_get_node_data', 'FAILED', {host: host, port: port, path: path, error: error});
                    console.log('debug', 'controller.zk_get_node_data', 'FAILED', {host: host, port: port, path: path, error: error});
					callback(error, null, req, res);
				}
				else {
                    //write_log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, path: path, msg: 'Get ZK_node data OK'});
                    console.log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, path: path, msg: 'Get ZK_node data OK'});
					var res_data = '';
					if(data) {
						res_data = data.toString('utf8');
					}
					callback(null, res_data, req, res);
				}
				zkClient.close();
                //write_log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Close the connection to the ZK server'});
                console.log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Close the connection to the ZK server'});
			}
		);
    });
     
    zkClient.connect();
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


module.exports=function(app)
{
	app.get('/server/hello', function(req,res) {
		res.send('Hello!');
	});
	
	app.get('/server/get-conf', function(req,res) {
		var conf_name = req.query.name;
		//var zk_server = {host: '127.0.0.1', port: 2181, path: '/danko/conf/' + conf_name};
		var zk_server = app.zk_server;
		var path = zk_server.app_conf_path + '/' + conf_name;
		console.log('Call zk_get_node_data');
    	zk_get_node_data(zk_server.host, zk_server.port, path, req, res, data_response_callback);
	});

	app.get('/server/get-result', function(req,res) {
		var app_name = req.query.name;
		//var zk_server = {host: '127.0.0.1', port: 2181, path: '/danko/result/' + app_name};
		var zk_server = app.zk_server;
		var path = zk_server.app_result_path + '/' + app_name;

		console.log('Call zk_get_node_data: ' + path);
    	zk_get_node_data(zk_server.host, zk_server.port, path, req, res, data_response_callback);
	});

	app.get('/server/create-app', function(req,res) {
		var app_name = req.query.name;
		//var zk_server = {host: '127.0.0.1', port: 2181, path: '/danko/conf/' + app_name};
		var zk_server = app.zk_server;
		var path = zk_server.app_conf_path + '/' + app_name;

		console.log('Call zk_create_node');
    	zk_create_node(zk_server.host, zk_server.port, path, req, res, data_response_callback);
	});

	app.get('/server/delete-app', function(req,res) {
		var app_name = req.query.name;
		//var zk_server = {host: '127.0.0.1', port: 2181, path: '/danko/conf/' + app_name};
		var zk_server = app.zk_server;
		var path = zk_server.app_conf_path + '/' + app_name;

		console.log('Call zk_delete_node');
    	zk_delete_node(zk_server.host, zk_server.port, path, req, res, data_response_callback);
	});

	app.get('/server/get-app-list', function(req,res) {
		//var zk_server = {host: '127.0.0.1', port: 2181, path: '/danko/conf'};
		var zk_server = app.zk_server;

		console.log('Call zk_get_children');
    	zk_get_children(zk_server.host, zk_server.port, zk_server.app_conf_path, req, res, data_response_callback);
	});

	app.get('/server/get-app-result-list', function(req,res) {
		//var zk_server = {host: '127.0.0.1', port: 2181, path: '/danko/result'};
		var zk_server = app.zk_server;

		console.log('Call zk_get_children');
    	zk_get_children(zk_server.host, zk_server.port, zk_server.app_result_path, req, res, data_response_callback);
	});

	app.get('/server/get-diagram-nodes-links', function(req,res) {
		//var zk_server = {host: '127.0.0.1', port: 2181, path: '/danko/app_status'};
		var zk_server = app.zk_server;

		console.log('Call zk_get_node_data');
    	zk_get_node_data(zk_server.host, zk_server.port, zk_server.app_status_path, req, res, process_nodes_links_data);
	});
}
