"use strict";

const async = require("async");
const YAML = require('yamljs');

//OK_Project utils
const common_utils = require('./utils/common_utils');
const zk_helper = require('./utils/zk_helper');

const module_name = 'controller';


/*---------------------------------------------------------------------
##     ##    ###    ########  
##     ##   ## ##   ##     ## 
##     ##  ##   ##  ##     ## 
##     ## ##     ## ########  
 ##   ##  ######### ##   ##   
  ## ##   ##     ## ##    ##  
   ###    ##     ## ##     ##  
---------------------------------------------------------------------*/

var config = {zk_server: {host: '127.0.0.1', port: 2181}, log_file: './logs/danko.log'};
var runtime_config = null;


const const_danko_queue_path = '/danko/attacker/';


var run_result = null;
var depended_app_status = null;


/* CONSTANT */
var ModFunctionType = {
    ReturnValue: 'return_value',
    Callback: 'callback'
}
var TaskType = {
	Serial: 'serial_group',
	Parallel: 'parallel_group'
}

/*---------------------------------------------------------------------
######## ##     ## ##    ##  ######  ######## ####  #######  ##    ##  ######  
##       ##     ## ###   ## ##    ##    ##     ##  ##     ## ###   ## ##    ## 
##       ##     ## ####  ## ##          ##     ##  ##     ## ####  ## ##       
######   ##     ## ## ## ## ##          ##     ##  ##     ## ## ## ##  ######  
##       ##     ## ##  #### ##          ##     ##  ##     ## ##  ####       ## 
##       ##     ## ##   ### ##    ##    ##     ##  ##     ## ##   ### ##    ## 
##        #######  ##    ##  ######     ##    ####  #######  ##    ##  ######  
---------------------------------------------------------------------*/

/*
 _                    _    ____             __ _       
| |    ___   __ _  __| |  / ___|___  _ __  / _(_) __ _ 
| |   / _ \ / _` |/ _` | | |   / _ \| '_ \| |_| |/ _` |
| |__| (_) | (_| | (_| | | |__| (_) | | | |  _| | (_| |
|_____\___/ \__,_|\__,_|  \____\___/|_| |_|_| |_|\__, |
                                                 |___/ 
===========================================
*/
function init_create_command_queue(host, port, path) {
    zk_helper.zk_create_emphemeral_node_sure(
        host, port, path,
        (err, data) => {
            if (err) {
                config.is_init_err = true;
            }
        }
    )
}

function init_by_conf(config, callback) {
    const mkdirp = require('mkdirp');
    const path = require('path');
    
    const selfname = '[' + module_name + '.init_by_conf] '

    async.parallel(
        [
            // Create log directory if not exists
            (callback) => {
                let log_path = path.dirname(config.log_file);
                mkdirp(log_path,
                    (err, data) => {
                        if (err) {
                            console.log(selfname + 'Create dir fail: ' + JSON.stringify(err));
                            callback(true); //ERR
                        }
                        else {
                            console.log(selfname + 'Create dir success');
                            callback(null, true); //SUCCESS
                        }
                    }
                );
            },
            // Create command queue
            async.apply(
                zk_helper.zk_create_emphemeral_node_sure,
                config.zk_server.host,
                config.zk_server.port,
                const_danko_queue_path + config.zk_server.queue_name
            )
        ], 
        (err, result) => {
            if (err) {
                console.log('[init_by_conf] INIT FASLE');
                console.log('err = ' + JSON.stringify(err));
                callback(true); // ERR
            }
            else {
                console.log('[init_by_conf] INIT SUCCESS');
                callback(null, true); //SUCCESS
            }
        }
    );
}

function load_config_from_file(filename) {
    config = YAML.load(filename);
    return config;
}

function do_config(config, callback) {
    common_utils.logging_config(config.log_file);
    common_utils.write_log('info', 'load_config', 'SUCCESS', 'Main config loaded!');
    callback(null, true); //Always SUCCESS
}


function write_result_data_to_zk(host, port, path, callback) {
// @ Async Compatible
    var result_data = YAML.stringify(run_result);
    async.series([
            async.apply(zk_helper.zk_set_node_data, host, port, path, result_data)
        ], 
        function (err, data) {
            if (err) {
                console.log('Cannot write RUNNING RESULT because of error: %s', err);
                common_utils.write_log('info', 'controller.write_result_data_to_zk', 'FAILED', 
                        {host: host, port: port, path: path, msg: 'Get Error when writting RUNNING RESULT'});
                callback(err);
            }
            else {
                console.log('RUNNING RESULT wrote:\n%s', result_data);
                common_utils.write_log('info', 'controller.write_result_data_to_zk', 'FAILED', 
                        {host: host, port: port, path: path, msg: 'Success writting RUNNING RESULT'});
                callback(null, run_result);
            }
        }
    );
}





/*
 ____              
|  _ \ _   _ _ __  
| |_) | | | | '_ \ 
|  _ <| |_| | | | |
|_| \_\\__,_|_| |_|
===========================================
*/
function show_result(callback) {
	console.log('\n\n\n\n----------------------------------------'); 
	console.log('***** RESULT'); 
	console.log('----------------------------------------'); 
	console.log(YAML.stringify(run_result)); 
	console.log('----------------------------------------'); 

	console.log('\n\n\n\n----------------------------------------'); 
	console.log('***** DEPEND'); 
	console.log('----------------------------------------'); 
	console.log(YAML.stringify(depended_app_status)); 
	console.log('----------------------------------------'); 

	callback(null, true);
}
	
function run_async_final(err, result) {
	if (err) {
		console.log('Controller.Run --> Error: %s', err);
	}
	else {
		console.log('Controller.Run --> Success');
	
        // Kiem tra + dat loop time
        if (runtime_config.sleep_seconds) {
            if(runtime_config.sleep_seconds > 0) {
                setTimeout(run, parseInt(runtime_config.sleep_seconds) * 1000);
                console.log('Next loop will be run at next %s second(s)', 
                        parseInt(runtime_config.sleep_seconds));
            }
        }
	}
}

function run(callback) {
    //var alive_path = const_danko_alive_path + config.zk_server.conf_name;
    
	async.series (
		[
			//async.apply(load_runtime_config_from_zk, config.zk_server.host, config.zk_server.port, conf_path),
			//process_for_is_alive,
			//process_for_is_alive_list,
			//get_depend_on_app_status,
			//process_for_dependencies,
			show_result, // TAM MO TRONG QUA TRINH TEST
			//async.apply(write_result_data_to_zk, config.zk_server.host, config.zk_server.port, result_path),
			//async.apply(manage_alive_node, config.zk_server.host, config.zk_server.port, alive_path),
			//async.apply(manage_alive_list, config.zk_server.host, config.zk_server.port)
		],
		run_async_final
	);
}






/*---------------------------------------------------------------------
 ______                       _       
|  ____|                     | |      
| |__  __  ___ __   ___  _ __| |_ ___ 
|  __| \ \/ / '_ \ / _ \| '__| __/ __|
| |____ >  <| |_) | (_) | |  | |_\__ \
|______/_/\_\ .__/ \___/|_|   \__|___/
            | |                       
            |_|                       
---------------------------------------------------------------------*/
exports.run = run;
//exports.set_logger = set_logger;
exports.load_config_from_file = load_config_from_file;
exports.do_config = do_config;
exports.init_by_conf = init_by_conf;
