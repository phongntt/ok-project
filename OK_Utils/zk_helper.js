'use strict';

const async = require("async");
const zookeeper = require('node-zookeeper-client');


//OK_Project utils
var common_utils = require('./common_utils');

var MODDULE_NAME = 'zk_helper';

/*
 ______  __
|__  / |/ /
  / /| ' / 
 / /_| . \ 
/____|_|\_\
*/

/**
 * Create a ZK Client
 * 
 * Param:
 *   @host, @port: Host and port to connect to ZK Server
 *   @Callback: Callback function (err, data)
 *     @err: An error message if this function got error
 *     @data: ZK Client that created by this function
 */
function create_client(host, port, callback) {
    //const debug_logger = require('debug')(MODDULE_NAME + '.create_client');

    const timeout_second = 5;

    let app_zkClient = zookeeper.createClient(host + ':' + port);

    let timer = null;

    app_zkClient.once('connected', function() {
        // Xoa time-out check
        if (timer) {
            clearTimeout(timer);
        }
        callback(null, app_zkClient);
    });

    timer = setTimeout(() => {
        app_zkClient.close();
        callback('Timeout when calling to ZK-Server.'); //ERR
    }, timeout_second * 1000);

    app_zkClient.connect();
}


function zk_call(host, port, path, processor, callback) {
// @ Async compatible
    const debug_logger = require('debug')(MODDULE_NAME + '.zk_call');
    
    const selfname = '[' + MODDULE_NAME + '.zk_call] ';
    const timeout_second = 5;

	const zookeeper = require('node-zookeeper-client');
    const zkClient = zookeeper.createClient(host + ':' + port);
    //console.log('Current state is: %s', zkClient.getState());
    
    let timer = null;

    zkClient.once('connected', function () {
        // Xoa time-out check
        if(timer) {
            clearTimeout(timer);
        }
        // Call processor when connected
        processor(host, port, path, zkClient, callback);
    });
    
    zkClient.once('expired', () => {
        console.log(selfname + 'Connect to server expired');
        ////if (!is_timeout) {
        ////    callback('Session time-out');
        ////}
    });
    
    zkClient.once('disconnected', () => {
        debug_logger('Disconnected to server');
    });
    
    zkClient.on('state', (state) => {
        debug_logger('state : ' + state);
    });

    timer = setTimeout(() => {
        console.log(selfname + 'TimeOut - Current state is: %s', zkClient.getState());
        zkClient.close();
        callback('Timeout when calling to ZK-Server.'); //ERR
    }, timeout_second * 1000);

    zkClient.connect();
}



function zk_check_node_exists(host, port, path, callback) {
    function processor_zk_check_node_exists(host, port, path, zkClient, callback) {
        const selfname = MODDULE_NAME + '.zk_check_node_exists';
        const debug_logger = require('debug')(selfname);
        
        zkClient.exists(path, function (error, stat) {
            if (error) {
                console.log(selfname + 'Failed to check exists node: %s due to: %s.', path, error);
                callback(true); //err= true
            } else {
                if (stat) {
                    debug_logger('DEBUG', 'Node exists:', path);
                }
                else {
                    debug_logger('DEBUG', 'Node not exists:', path);
                }
                callback(null, stat);
            }
            zkClient.close();
        });
    }
    
    zk_call(host, port, path, processor_zk_check_node_exists, callback);
}


/**
 * Check ZK_Node at the @path exists or not
 * 
 * Params:
 *   @zkClient: the ZK Client handle
 *   @path: ZK_Node path to check
 *   @callback: the callback function
 *     @status: exists (True) or not exists (False) 
 */
function zk_check_node_exists_by_client(zkClient, path, callback) {
    const debug_logger = require('debug')(MODDULE_NAME + '.zk_check_node_exists_by_client');
    
    zkClient.exists(path, function (error, stat) {
        if (error) {
            debug_logger('Failed to check exists node: %s due to: %s.', path, error);
            callback(true); //err= true
        } else {
            if (stat) {
                debug_logger('DEBUG', 'Node exists:', path);
            }
            else {
                debug_logger('DEBUG', 'Node not exists:', path);
            }
            callback(null, stat);
        }
    });
}


function zk_create_node(host, port, path, callback) {
// @ Async compatible
    function processor_zk_create_node(host, port, path, zkClient, callback) {
        const selfname = MODDULE_NAME + '.zk_create_node';
        const debug_logger = require('debug')(selfname);
        const debug_logger_x = require('debug')(selfname+'_x');

        zkClient.create(path, function (error) {
            if (error) {
                console.log(selfname + 'Failed to create node: %s due to: %s.', path, error);
                debug_logger('FAIL');
                debug_logger_x('More Info -', 'path =', path, '; Error =', error);
                
                if(callback) {
                    callback(true); //err= true
                }
            } else {
                console.log(selfname + 'Path created SUCCESS: %s', path);
                debug_logger('SUCCESS');
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
    const debug_logger = require('debug')(MODDULE_NAME + '.zk_create_node_sure');
    
    debug_logger('Called to create Node: ' + path);

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

function zk_create_emphemeral_node(zkClient, path, callback) {
// @ Async compatible    
    const debug_logger = require('debug')(MODDULE_NAME + '.zk_create_emphemeral_node');

    var zookeeper = require('node-zookeeper-client');
    zkClient.create(path, zookeeper.CreateMode.EPHEMERAL, function (error) {
        if (error) {
            debug_logger('Failed to create emphemeral_node: %s due to: %s.', path, error);
            if(callback) {
                callback(true); // ERROR
            }
        } else {
            debug_logger('Path created SUCCESS: %s', path);
            if(callback) {
                callback(null, zkClient); //SUCCESS return @zkClient
            }
        }
    });
}

/**
 * Sure to create an ephemeral node if not exists
 * 
 * Params:
 *   @zkClient: a zk_client handle
 *   @path: path of the node that need to created
 *   @callback: callback function (err, data)
 *     @data: the @zkClient
 */
function zk_create_emphemeral_node_sure(zkClient, path, callback) {
    const debug_logger = require('debug')(MODDULE_NAME + '.zk_create_emphemeral_node_sure');
    
    async.waterfall(
        [async.apply(zk_check_node_exists_by_client, zkClient, path)],
        function (err, result) {
            if(err) {
                debug_logger('ERROR');
                debug_logger(err);
                callback(err); //ERROR
            }
            else {
                if(!result) {
                    zk_create_emphemeral_node(zkClient, path, callback);
                }
                else {
                    debug_logger('Node exists ---> No need to create.');
                    callback(null, true); //SUCCESS
                }
            }
        }
    );
}

function zk_remove_node(host, port, path, callback) {
// @ Async compatible    
    function processor_zk_remove_node(host, port, path, zkClient, callback) {
        const selfname = MODDULE_NAME + '.zk_remove_node';
        const debug_logger = require('debug')(selfname);
        const debug_logger_x = require('debug')(selfname+'_x');

        zkClient.remove(path, function (error) {

            if (error) {
                console.log(selfname + 'Failed to remove node: %s due to: %s.', path, error);
                debug_logger('FAIL');
                debug_logger_x('More info -', 'path =', path, 'error =', error);
                
                if(callback) {
                    callback(true); //err= true
                }
            } else {
                console.log(selfname + 'Path removed SUCCESS: %s', path);
                debug_logger('SUCCESS');
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
    const selfname = MODDULE_NAME + '.zk_set_node_data';
    const debug_logger = require('debug')(selfname);
    const debug_logger_x = require('debug')(selfname+'_x');

    function processor_zk_set_node_data(host, port, path, zkClient, callback) {

        common_utils.write_log('debug', 'controller.zk_set_node_data', 'SUCCESS', {host: host, port: port, msg: 'Connected to the ZK server'});
        debug_logger('Connected to the ZK server');
		
		zkClient.setData(path, new Buffer(data, "binary"), function (error, stat) {
            if (error) {
                common_utils.write_log('debug', 'controller.zk_set_node_data', 'FAILED', {host: host, port: port, path: path, error: error});
                debug_logger('FAIL');
                debug_logger_x('More info: error =', error);
                debug_logger('Close the connection to the ZK server');
    			zkClient.close();
                callback(error);
                return;
            } else {
                common_utils.write_log('debug', 'controller.zk_set_node_data', 'SUCCESS', {host: host, port: port, path: path, msg: 'Set ZK_node data OK'});
                debug_logger('Set node SUCCESS');
                debug_logger('Close the connection to the ZK server');
    			zkClient.close();
                callback(null, data);
            }
            common_utils.write_log('debug', 'controller.zk_set_node_data', 'SUCCESS', {host: host, port: port, msg: 'Close the connection to the ZK server'});
        });
    }
    
    zk_call(host, port, path, processor_zk_set_node_data, callback);
}

function zk_get_node_data(host, port, path, callback) {
// @ Async compatible  
    const selfname = MODDULE_NAME + '.zk_get_node_data';
    const debug_logger = require('debug')(selfname);
    const debug_logger_x = require('debug')(selfname+'_x');

    function processor_zk_get_node_data(host, port, path, zkClient, callback) {
        common_utils.write_log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, msg: 'Connected to the ZK server'});
        debug_logger('Connected to the ZK server');
        debug_logger_x('More info ===>', {host: host, port: port});
		zkClient.getData(
			path,
			function (error, data, stat) {
				if (error) {
                    common_utils.write_log('debug', 'controller.zk_get_node_data', 'FAILED', {host: host, port: port, path: path, error: error});
                    debug_logger('FAIL');
                    debug_logger_x('More info ===>', {host: host, port: port, path: path, error: error});
					
                    debug_logger('Close connection to the ZK server');
				    zkClient.close();
					callback(error);
				}
				else {
                    common_utils.write_log('debug', 'controller.zk_get_node_data', 'SUCCESS', {host: host, port: port, path: path, msg: 'Get ZK_node data OK'});
                    debug_logger('SUCCESS', 'Get ZK_node data OK');
                    debug_logger_x('More info ===>', {host: host, port: port, path: path});
					if(data) {
                        debug_logger('Close connection to the ZK server');
				        zkClient.close();
					    callback(null, data.toString('utf8'));
					}
					else {
                        debug_logger('Close connection to the ZK server');
				        zkClient.close();
					    callback(null, '');
					}
				}
			}
		);
    }
    
    zk_call(host, port, path, processor_zk_get_node_data, callback);
}

function zk_get_children(host, port, path, callback) {
// @ Async compatible  
    function processor_zk_get_children(host, port, path, zkClient, callback) {
        const name2log = 'zk_helpder.zk_get_children';
        
        common_utils.write_log('debug', name2log, 'SUCCESS', {host: host, port: port, msg: 'Connected to the ZK server'});
		zkClient.getChildren(path,
		    (err, children, stats) => {
                if (err) {
                    common_utils.write_log('debug', name2log, 'FAIL', {host: host, port: port, path: path, msg: err});
                    callback(err);
                }
                else {
                    callback(null, children);
                }
				zkClient.close();
            }
        );
    }
    
    zk_call(host, port, path, processor_zk_get_children, callback);
}


/**
 * Copy data from Source-Node (@src_path) to Destination-Node (@des_path)
 * @host {string} Zookeeper host
 * @port {string} Zookeeper port
 * @src_path {string} Path of Source Node
 * @des_path {string} Path of Destination Node
 * @callback {function} Callback function
 * @return No return
 */
function zk_copy_data(host, port, src_path, des_path, callback) {
// @ Async compatible
    const selfname = MODDULE_NAME + '.zk_copy_data';
    const debug_logger = require('debug')(selfname);
    const debug_logger_x = require('debug')(selfname+'_x');

    debug_logger('Copy data from ' + src_path + ' to ' + des_path);
    async.waterfall(
        [
            async.apply(zk_get_node_data, host, port, src_path),
            (node_data, callback) => {
                zk_set_node_data(host, port, des_path, node_data, callback);
            }
        ],
        (err, data) => {
            if(err) {
                debug_logger('FAIL');
                debug_logger_x('error =', err);
                callback(true, err); //ERROR
            }
            else {
                debug_logger('SUCCESS');
                callback(null, data); //SUCCESS
            }
        }
    );
}


/**
 * Move node by create new node and delete old node
 * @host {string} Zookeeper host
 * @port {string} Zookeeper port
 * @src_path {string} Path of old-node
 * @des_path {string} Path of new-node
 * @callback {function} Callback function
 * @return No return
 */
function zk_move_node(host, port, src_path, des_path, callback) {
// @ Async compatible
    const selfname = MODDULE_NAME + '.zk_move_node';
    const debug_logger = require('debug')(selfname);
    const debug_logger_x = require('debug')(selfname+'_x');

    debug_logger('Mode node: from ' + src_path + ' to ' + des_path);
    async.series(
        [
            // Create Destination Node
            async.apply(zk_create_node_sure, host, port, des_path),
            // Copy Data
            async.apply(zk_copy_data, host, port, src_path, des_path),
            // Delete Source Node
            async.apply(zk_remove_node_sure, host, port, src_path),
        ],
        (err, data) => {
            if(err) {
                debug_logger('FAIL', 'Get Error when moving node');
                debug_logger_x('ERROR ===> ' + err);
                callback(true, err); //ERROR
            }
            else {
                debug_logger('SUCCESS', 'Node moved!');
                callback(null, data); //SUCCESS
            }
        }
    );
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
exports.zk_get_children = zk_get_children;
exports.zk_copy_data = zk_copy_data;
exports.zk_move_node = zk_move_node;
exports.create_client = create_client;
exports.zk_check_node_exists_by_client = zk_check_node_exists_by_client;