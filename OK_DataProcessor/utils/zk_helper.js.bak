var async = require("async");

//OK_Project utils
var common_utils = require('./common_utils');


/*
 ______  __
|__  / |/ /
  / /| ' / 
 / /_| . \ 
/____|_|\_\
*/
function zk_check_node_exists(host, port, path, callback) {
// @ Async compatible    
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);
    zkClient.once('connected', function () {
        zkClient.exists(path, function (error, stat) {
            if (error) {
                console.log('Failed to check exists node: %s due to: %s.', path, error);
                callback(true); //err= true
            } else {
                if (stat) {
                    console.log('Node exists: %s', path);
                }
                else {
                    console.log('Node not exists: %s', path);
                }
                callback(null, stat);
            }
            zkClient.close();
        });
    });
    zkClient.connect();
}

function zk_create_node(host, port, path, callback) {
// @ Async compatible    
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);
    zkClient.once('connected', function () {
        zkClient.create(path, function (error) {
            if (error) {
                console.log('Failed to create node: %s due to: %s.', path, error);
                if(callback) {
                    callback(true); //err= true
                }
            } else {
                console.log('Path created SUCCESS: %s', path);
                if(callback) {
                    callback(null, true);
                }
            }
            zkClient.close();
        });
    });
    zkClient.connect();
}

function zk_create_node_sure(host, port, path, callback) {
    async.waterfall(
        [async.apply(zk_check_node_exists, host, port, path)],
        function (err, result) {
            if(!err) {
                if(!result) {
                    zk_create_node(host, port, path, callback);
                }
                else {
                    callback(null, true);
                }
            }
            else {
                callback(err);
            }
        }
    );
}

function zk_create_emphemeral_node(host, port, path, callback) {
// @ Async compatible    
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);
    zkClient.once('connected', function () {
        zkClient.create(path, zookeeper.CreateMode.EPHEMERAL, function (error) {
            if (error) {
                console.log('Failed to create emphemeral_node: %s due to: %s.', path, error);
                if(callback) {
                    callback(true); // ERROR
                }
            } else {
                console.log('Path created SUCCESS: %s', path);
                if(callback) {
                    callback(null, true); //SUCCESS
                }
            }
            zkClient.close();
        });
    });
    zkClient.connect();
}

function zk_create_emphemeral_node_sure(host, port, path, callback) {
    async.waterfall(
        [async.apply(zk_check_node_exists, host, port, path)],
        function (err, result) {
            if(!err) {
                if(!result) {
                    zk_create_emphemeral_node(host, port, path, callback);
                }
                else {
                    callback(null, true); //Success
                }
            }
            else {
                callback(err); //Error
            }
        }
    );
}

function zk_remove_node(host, port, path, callback) {
// @ Async compatible    
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);
    zkClient.once('connected', function () {
        zkClient.remove(path, function (error) {
            if (error) {
                console.log('Failed to remove node: %s due to: %s.', path, error);
                if(callback) {
                    callback(true); //err= true
                }
            } else {
                console.log('Path removed SUCCESS: %s', path);
                if(callback) {
                    callback(null, true);
                }
            }
            zkClient.close();
        });
    });
    zkClient.connect();
}

function zk_remove_node_sure(host, port, path, callback) {
    async.waterfall(
        [async.apply(zk_check_node_exists, host, port, path)],
        function (err, result) {
            if(!err) {
                if(result) {
                    zk_remove_node(host, port, path, callback);
                }
                else {
                    callback(null, true);
                }
            }
            else {
                callback(err);
            }
        }
    );
}


function zk_set_node_data(host, port, path, data, callback) {
// @ Async compatible    
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);

    zkClient.once('connected', function () {
        common_utils.write_log('debug', 'controller.zk_set_node_data', 'SUCCESS', {host: host, port: port, msg: 'Connected to the ZK server'});
		zkClient.setData(path, new Buffer(data, "binary"), function (error, stat) {
            if (error) {
                common_utils.write_log('debug', 'controller.zk_set_node_data', 'FAILED', {host: host, port: port, path: path, error: error});
                callback(error);
            } else {
                common_utils.write_log('debug', 'controller.zk_set_node_data', 'SUCCESS', {host: host, port: port, path: path, msg: 'Set ZK_node data OK'});
                callback(null, data);
            }
			zkClient.close();
            common_utils.write_log('debug', 'controller.zk_set_node_data', 'SUCCESS', {host: host, port: port, msg: 'Close the connection to the ZK server'});
        });
    });
     
    zkClient.connect();
}

function zk_get_node_data(host, port, path, callback) {
// @ Async compatible  
	var zookeeper = require('node-zookeeper-client');
    var zkClient = zookeeper.createClient(host + ':' + port);

    zkClient.once('connected', function () {
        common_utils.write_log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Connected to the ZK server'});
		zkClient.getData(
			path,
			function (error, data, stat) {
				if (error) {
                    common_utils.write_log('debug', 'controller.zk_get_node_data', 'FAILED', {host: host, port: port, path: path, error: error});
					callback(error);
				}
				else {
                    common_utils.write_log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, path: path, msg: 'Get ZK_node data OK'});
					callback(null, data.toString('utf8'));
				}
				zkClient.close();
                common_utils.write_log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Close the connection to the ZK server'});
			}
		);
    });
     
    zkClient.connect();
}





exports.zk_check_node_exists = zk_check_node_exists;
exports.zk_create_node = zk_create_node;
exports.zk_create_node_sure = zk_create_node_sure;
exports.zk_create_emphemeral_node = zk_create_emphemeral_node;
exports.zk_create_emphemeral_node_sure = zk_create_emphemeral_node_sure;
exports.zk_remove_node = zk_remove_node;
exports.zk_remove_node_sure = zk_remove_node_sure;
exports.zk_set_node_data = zk_set_node_data;
exports.zk_get_node_data = zk_get_node_data;
