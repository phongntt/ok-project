"use strict";

var async = require("async");

//OK_Project utils
var common_utils = require('./common_utils');

var module_name = 'zk_helper';

/*
 ______  __
|__  / |/ /
  / /| ' / 
 / /_| . \ 
/____|_|\_\
*/
function zk_call(host, port, path, processor, callback) {
// @ Async compatible
    const selfname = '[' + module_name + '.zk_call] '


	const zookeeper = require('node-zookeeper-client');
    const zkClient = zookeeper.createClient(host + ':' + port);
    //console.log('Current state is: %s', zkClient.getState());
    
    let is_timeout = false;
    let was_connected = false;
    
    zkClient.once('connected', function () {
        was_connected = true;
        if (!is_timeout) {
            // Call processor when connected
            processor(host, port, path, zkClient, callback);
        }
    });
    
    zkClient.once('expired', () => {
        console.log(selfname + 'Connect to server expired');
        ////if (!is_timeout) {
        ////    callback('Session time-out');
        ////}
    });
    
    zkClient.once('disconnected', () => {
        console.log(selfname + 'Disconnected to server');
        
        ////if (!is_timeout) {
        ////    callback('Disconnected');
        ////}
    });
    
    /*
    zkClient.on('state', (state) => {
        console.log(selfname + "state : %s", state);
    });
    */
    
    zkClient.connect();
    
    setTimeout(() => {
        console.log(selfname + 'TimeOut - Current state is: %s', zkClient.getState());
        if(!was_connected) {
            is_timeout = true;
            zkClient.close();
            callback('Timeout when calling to ZK-Server.'); //ERR
        }
    }, 5000);
}



function zk_check_node_exists(host, port, path, callback) {
    function processor_zk_check_node_exists(host, port, path, zkClient, callback) {
        const selfname = '[' + module_name + '.zk_check_node_exists] '
        
        zkClient.exists(path, function (error, stat) {
            if (error) {
                console.log(selfname + 'Failed to check exists node: %s due to: %s.', path, error);
                callback(true); //err= true
            } else {
                if (stat) {
                    console.log(selfname + 'Node exists: %s', path);
                }
                else {
                    console.log(selfname + 'Node not exists: %s', path);
                }
                callback(null, stat);
            }
            zkClient.close();
        });
    }
    
    zk_call(host, port, path, processor_zk_check_node_exists, callback);
}


function zk_create_node(host, port, path, callback) {
// @ Async compatible
    function processor_zk_create_node(host, port, path, zkClient, callback) {
        const selfname = '[' + module_name + '.zk_create_node] '

        zkClient.create(path, function (error) {
            if (error) {
                console.log(selfname + 'Failed to create node: %s due to: %s.', path, error);
                if(callback) {
                    callback(true); //err= true
                }
            } else {
                console.log(selfname + 'Path created SUCCESS: %s', path);
                if(callback) {
                    callback(null, true);
                }
            }
            zkClient.close();
        });
    }
    
    zk_call(host, port, path, processor_zk_create_node, callback);
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
    function processor_zk_create_emphemeral_node(host, port, path, zkClient, callback) {
        const selfname = '[' + module_name + '.zk_create_emphemeral_node] '

	    var zookeeper = require('node-zookeeper-client');
        zkClient.create(path, zookeeper.CreateMode.EPHEMERAL, function (error) {
            if (error) {
                console.log(selfname + 'Failed to create emphemeral_node: %s due to: %s.', path, error);
                if(callback) {
                    callback(true); // ERROR
                }
            } else {
                console.log(selfname + 'Path created SUCCESS: %s', path);
                if(callback) {
                    callback(null, true); //SUCCESS
                }
            }
            zkClient.close();
        });
    }

    zk_call(host, port, path, processor_zk_create_emphemeral_node, callback);
}

function zk_create_emphemeral_node_sure(host, port, path, callback) {
    async.waterfall(
        [async.apply(zk_check_node_exists, host, port, path)],
        function (err, result) {
            const selfname = '[' + module_name + '.zk_create_emphemeral_node_sure] '
            
            if(!err) {
                if(!result) {
                    zk_create_emphemeral_node(host, port, path, callback);
                }
                else {
                    console.log(selfname + 'zk_node created.');
                    callback(null, true); //SUCCESS
                }
            }
            else {
                console.log(selfname + 'Cannot create zk_node.');
                callback(err); //ERROR
            }
        }
    );
}

function zk_remove_node(host, port, path, callback) {
// @ Async compatible    
    function processor_zk_remove_node(host, port, path, zkClient, callback) {
        zkClient.remove(path, function (error) {
            const selfname = '[' + module_name + '.zk_remove_node] '
            
            if (error) {
                console.log(selfname + 'Failed to remove node: %s due to: %s.', path, error);
                if(callback) {
                    callback(true); //err= true
                }
            } else {
                console.log(selfname + 'Path removed SUCCESS: %s', path);
                if(callback) {
                    callback(null, true);
                }
            }
            zkClient.close();
        });
    }
    
    zk_call(host, port, path, processor_zk_remove_node, callback);
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
    function processor_zk_set_node_data(host, port, path, zkClient, callback) {
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
    }
    
    zk_call(host, port, path, processor_zk_set_node_data, callback);
}

function zk_get_node_data(host, port, path, callback) {
// @ Async compatible  
    function processor_zk_get_node_data(host, port, path, zkClient, callback) {
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
    }
    
    zk_call(host, port, path, processor_zk_get_node_data, callback);
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
