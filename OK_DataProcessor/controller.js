'use strict'

const MODULE_NAME = 'controller'

var async = require("async");
var YAML = require('yamljs');
const zookeeper = require('node-zookeeper-client');

//OK_Project utils
var common_utils = require('./utils/common_utils');
var data_process_utils = require('./utils/data_process_utils');
var zk_helper = require('./utils/zk_helper');

var const_result_to_child_separator = '-->';

var const_OK_data_processor_conf_path = '/danko/data_processor';
var const_OK_data_processor_result_path = '/danko/app_status';
var const_OK_spy_result_path = '/danko/result/';


var config = {zk_server: {host: '127.0.0.1', port: 2080}, log_file: './logs/danko.log'};
var runtime_config = null;

var app_zkClient = null; // to keep an ephemeral node

// ZK_Ephemeral_node to notice that this app is alive
var alive_ephemeral_node_path = '/danko/monitor/dataprocessor'; //default value


var all_spy_result = null;
var all_spy_result_var_dict = null;
var run_result = null;
var depended_app_status = null;

var app_checking_stack = null;

/* CONSTANT */
var ModFunctionType = {
    ReturnValue: 'return_value',
    Callback: 'callback'
};

var TaskType = {
	Serial: 'serial_group',
	Parallel: 'parallel_group'
};


/*---------------------------------------------------------------------
######## ##     ## ##    ##  ######  ######## ####  #######  ##    ##  ######  
##       ##     ## ###   ## ##    ##    ##     ##  ##     ## ###   ## ##    ## 
##       ##     ## ####  ## ##          ##     ##  ##     ## ####  ## ##       
######   ##     ## ## ## ## ##          ##     ##  ##     ## ## ## ##  ######  
##       ##     ## ##  #### ##          ##     ##  ##     ## ##  ####       ## 
##       ##     ## ##   ### ##    ##    ##     ##  ##     ## ##   ### ##    ## 
##        #######  ##    ##  ######     ##    ####  #######  ##    ##  ######  
---------------------------------------------------------------------*/

function zk_create_client(callback) {
    const timeout_second = 5;
    const selfname = '[' + MODULE_NAME + '.zk_create_client] '

    app_zkClient = zookeeper.createClient(config.zk_server.host + ':' + config.zk_server.port);

    let timer = null;

    app_zkClient.once('connected', function() {
        // Xoa time-out check
        if (timer) {
            clearTimeout(timer);
        }
        callback(null, app_zkClient);
        // Log when connect SUCCESS
        console.log(selfname, 'Create ZK-Client Connected to Server.');
    });

    timer = setTimeout(() => {
        console.log(selfname + 'TimeOut - Current state is: %s', app_zkClient.getState());
        app_zkClient.close();
        callback('Timeout when calling to ZK-Server.'); //ERR
    }, timeout_second * 1000);

    app_zkClient.connect();
}

/**
 * Create a Node to let other know that this process is alive.
 */
function create_alive_node(callback) {
    const selfname = '[' + MODULE_NAME + '.create_alive_node] ';

    app_zkClient.create(alive_ephemeral_node_path, zookeeper.CreateMode.EPHEMERAL, (error) => {
        if (error) {
            console.log(selfname + 'Failed to create ALIVE_NODE: %s due to: %s.', alive_ephemeral_node_path, error);
            callback(true); // ERROR
        }
        else {
            console.log(selfname + 'ALIVE_NODE created SUCCESS: %s', alive_ephemeral_node_path);
            callback(null, true); //SUCCESS
        }
    });
}

function delete_alive_node(callback) {
    const selfname = '[' + MODULE_NAME + '.delete_alive_node] ';

    app_zkClient.remove(alive_ephemeral_node_path, (error) => {
        if (error) {
            console.log(selfname + 'Failed to remove ALIVE_NODE: %s due to: %s.', alive_ephemeral_node_path, error);
            callback(true); // ERROR
        }
        else {
            console.log(selfname + 'ALIVE_NODE removed SUCCESS: %s', alive_ephemeral_node_path);
            callback(null, true); //SUCCESS
        }
    });
}





/*
 _                    _    ____             __ _       
| |    ___   __ _  __| |  / ___|___  _ __  / _(_) __ _ 
| |   / _ \ / _` |/ _` | | |   / _ \| '_ \| |_| |/ _` |
| |__| (_) | (_| | (_| | | |__| (_) | | | |  _| | (_| |
|_____\___/ \__,_|\__,_|  \____\___/|_| |_|_| |_|\__, |
                                                 |___/ 
===========================================
*/
function load_config(filename) {
    config = YAML.load(filename);
    common_utils.logging_config(config.log_file);
    common_utils.write_log('info', 'load_config', 'SUCCESS', 'Main config loaded!');
    common_utils.write_console('controller.load_config','Main config loaded!');
    return config;
}

function set_config(p_config, p_runtime_config) {
    config = p_config;
    runtime_config = p_runtime_config;
}


function init_by_conf(callback) {
    const debug_logger = require('debug')(MODULE_NAME + '.init_by_conf');
    
    const mkdirp = require('mkdirp');
    const path = require('path');

    const selfname = '[' + MODULE_NAME + '.init_by_conf] ';
    
    async.series(
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

            // Create alive node
            zk_create_client,
            create_alive_node
        ],
        (err, result) => {
            debug_logger('Init result: ' + result);
            
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

/**
 * NOT USE - BECAUSE, @runtime_config LOADED WHEN STARTUP
 * -------------------------------------------
function load_runtime_config_from_zk(host, port, path, callback) {
// @ Async Compatible
    const debug_logger = require('debug')(MODULE_NAME + '.load_runtime_config_from_zk');
    
    async.waterfall([
            async.apply(zk_helper.zk_get_node_data, host, port, path)
        ], 
        function (err, data) {
            if (err) {
                debug_logger('Cannot load runtime_config because of error: ' + err);
                callback(err);
            }
            else {
                runtime_config = YAML.parse(data);
                debug_logger('Runtime Config loaded.');
                callback(null, runtime_config);
            }
        }
    );
}
 * -------------------------------------------*/


/*
  ____ _               _    _               ____                              
 / ___| |__   ___  ___| | _(_)_ __   __ _  |  _ \ _ __ ___   ___ ___  ___ ___ 
| |   | '_ \ / _ \/ __| |/ / | '_ \ / _` | | |_) | '__/ _ \ / __/ _ \/ __/ __|
| |___| | | |  __/ (__|   <| | | | | (_| | |  __/| | | (_) | (_|  __/\__ \__ \
 \____|_| |_|\___|\___|_|\_\_|_| |_|\__, | |_|   |_|  \___/ \___\___||___/___/
                                    |___/                                     
===========================================
*/
function get_tasks_function_arr(tasks_group) {
    var tasks_arr = [];
	console.log('Coltroller.get_tasks_function_arr --> ' + 'RUN');
    if (tasks_group) {
        if (tasks_group.tasks) {
            tasks_group.tasks.forEach(
                // Task may be a Single Task or Group-of-tasks
				// we temporary call it a 'task'
				function(task) {
                    console.log('Coltroller.get_tasks_function_arr --> ' + 'Add task: %s, type: %s', task.name, task.type);
                    // We call 'run_group' funtion here bacause 'run_group' also used for running a Group or a task
					tasks_arr.push(async.apply(run_group, task));
                }
            );
        }
		else {
			console.log('Coltroller.get_tasks_function_arr --> ' + 'No tasks');
		}
    }
	else {
		console.log('Coltroller.get_tasks_function_arr --> ' + 'No tasks_group');
	}
    
    return tasks_arr;
}

function run_one_task(task_conf, callback) {
// @ Async Compatible
    console.log('---- Task run: %s - BEGIN ----', task_conf.name);
    var mod = require(task_conf.module.name);
    var func = mod[task_conf.module.function];
    
    if (task_conf.module.type == ModFunctionType.ReturnValue) { 
        var result = func.apply(this, task_conf.module.params);
        run_result[task_conf.name] = result;
        console.log('Result: %s', JSON.stringify(result));
        console.log('---- Task run: %s - END   ----', task_conf.name);
        callback(null, true);
    }
    else if (task_conf.module.type == ModFunctionType.Callback) {
        console.log('Callback Type...');
        var mod_params = task_conf.module.params;
        mod_params.push(task_conf.name);
        mod_params.push(task_callback);
        mod_params.push(callback); //for async
        func.apply(this, mod_params);
    }
    else {
        common_utils.write_log('info', 'coltroller.run_one_task.check_module_type', 'FAILED', 
                {task_conf: task_conf, msg: 'Unknowk type: ' + task_conf.module.type});
        console.log('Unknowk type: ' + task_conf.module.type);
        console.log('---- Task run: %s - END   ----', task_conf.name);
        callback(null, true);
    }
}


function task_callback(task_name, err, data, callback) {
    if(err) {
        run_result[task_name] = {is_success: false, error: err};
        console.log('Task: %s --> Get Error: %s', task_name, err);
    }
    else {
        run_result[task_name] = {is_success: true, data: data};
        console.log('Task: %s --> Success: %s', task_name, JSON.stringify(run_result[task_name]));
    }
    console.log('---- Task run: %s - END   ----', task_name);
    callback(null, true);
}

function run_serial_group(tasks_group, callback) {
// @ Async Compatible
	console.log('Controller.run_serial_group ---> ' + 'RUN group: %s', tasks_group.name);
	if (tasks_group) {
	    if(tasks_group.tasks) {
        	//---- Run Stages ----
        	console.log('Controller.run_serial_group --> RUN tasks');
        	
			var funcs_to_run = get_tasks_function_arr(tasks_group);
			
        	async.series(
        	    funcs_to_run,
                function(err, results){
                    if(err) {
                        console.log('Controller.run_serial_group --> ' + 'ERROR: Stages running get error: %s', err);
                        callback(err);
                    }
                    else {
                        console.log('Controller.run_serial_group --> ' + 'Finished');
        	            callback(null, run_result);
                    }
                }
            );
        	//---- Run Stages ----
    	}
    	else {
    	    var err = 'No Task to run.';
    	    console.log('Controller.run_serial_group --> ' + err);
    	    callback(err);
    	}
	}
	else {
	    let err = 'No tasks_group.';
	    console.log('Controller.run_serial_group --> ' + err);
	    callback(err);
	}
    //--------------------------------------------------------------------
}


function run_parallel_group(tasks_group, callback) {
// @ Async Compatible
	console.log('Controller.run_parallel_group ---> ' + 'RUN group %s', tasks_group.name);
	if (tasks_group) {
	    if(tasks_group.tasks) {
        	//---- Run Stages ----
        	console.log('Controller.run_parallel_group --> RUN tasks');
        	
			let funcs_to_run = get_tasks_function_arr(tasks_group);
			
        	async.parallel(
        	    funcs_to_run,
                function(err, results){
                    if(err) {
                        console.log('Controller.run_parallel_group --> ' + 'ERROR: Stages running get error: %s', err);
                        callback(err);
                    }
                    else {
                        console.log('Controller.run_parallel_group --> ' + 'Finished');
        	            callback(null, run_result);
                    }
                }
            );
        	//---- Run Stages ----
    	}
    	else {
    	    let err = 'No Task to run.';
    	    console.log('Controller.run_parallel_group --> ' + err);
    	    callback(err);
    	}
	}
	else {
	    let err = 'No tasks_group.';
	    console.log('Controller.run_parallel_group --> ' + err);
	    callback(err);
	}
    //--------------------------------------------------------------------
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
	console.log('***** LOCAL CONFIG'); 
	console.log('----------------------------------------'); 
	console.log(YAML.stringify(config, 10)); 
	console.log('----------------------------------------'); 

	console.log('\n\n\n\n----------------------------------------'); 
	console.log('***** RUNTIME CONFIG'); 
	console.log('----------------------------------------'); 
	console.log(YAML.stringify(runtime_config, 10)); 
	console.log('----------------------------------------'); 

	console.log('\n\n\n\n----------------------------------------'); 
	console.log('***** SPY_RESULT'); 
	console.log('----------------------------------------'); 
	console.log(YAML.stringify(all_spy_result, 10)); 
	console.log('----------------------------------------'); 

	console.log('\n\n\n\n----------------------------------------'); 
	console.log('***** RESULT'); 
	console.log('----------------------------------------'); 
	console.log(YAML.stringify(run_result, 10)); 
	console.log('----------------------------------------'); 

	console.log('\n\n\n\n----------------------------------------'); 
	console.log('***** DEPEND'); 
	console.log('----------------------------------------'); 
	console.log(YAML.stringify(depended_app_status, 10)); 
	console.log('----------------------------------------'); 

	callback(null, true);
}
	
function run_async_final(err, result) {
    const debug_logger = require('debug')(MODULE_NAME + '.run_async_final');

	if (err) {
		debug_logger('Error: ' + err);
		end();
	}
	else {
		debug_logger(' --> Success');

        // Kiem tra + dat loop time
        let sleepSec = parseInt(common_utils.if_null_then_default(runtime_config.sleep_seconds, 0), 10);

        debug_logger('SLEEP SECONDS: ' + sleepSec);
        
        // sleepSec never be null, read above
        if (sleepSec > 0) {
                setTimeout(run, sleepSec * 1000);
		        debug_logger('Next loop will be run at next ' + sleepSec + ' second(s)');
            console.log("\n\n\n\n\n");
        }
        else {
            end();
        }
	}
}

function run_group(tasks_group, callback) {
	console.log('Controller.run_group ---> ' + 'RUN group: %s', tasks_group.name);
    switch (tasks_group.type) {
		case TaskType.Serial:
			run_serial_group(tasks_group, callback);
			break;
		case TaskType.Parallel:
			run_parallel_group(tasks_group, callback);
			break;
		default:
			run_one_task(tasks_group, callback);
			break;
	}
}




//------------------------------------------------------------------------------
//--  GET SPY RESULT - Begin group  --------------------------------------------
//------------------------------------------------------------------------------
function get_spy_result(host, port, spy_name, callback) {
    const debug_logger = require('debug')(MODULE_NAME + '.get_spy_result');
    
    debug_logger('RUN: spy_name=' + spy_name);
    var spy_result_path = const_OK_spy_result_path + spy_name;
    zk_helper.zk_get_node_data(host, port, spy_result_path, 
            function(err, data) {
                if(err) {
                    debug_logger('ERR: ' + err);
                }
                else {
                    all_spy_result[spy_name] = YAML.parse(data);
                    debug_logger('DATA: spy_app_result[' + spy_name + '] = ' + all_spy_result[spy_name]);
                }
                callback(null, true);
            }
    );
}

function get_used_spy_app_result(callback) {
// @async compatible
    const debug_logger = require('debug')(MODULE_NAME + '.get_used_spy_app_result');
    

// Lay toan bo ket qua cua nhung spy ve mot dict
// spy_app_result = {spy_name1: {...}, spy_name2: {...}, ...}
    debug_logger('controller.get_used_spy_app_result', '---> RUN');
    
    all_spy_result = {};
    
    let spy_app_result_to_get_data = [];
    
    if(runtime_config.status_check) {
        // get list of spy app result to get and put in ASYNC_FUNC_ARR to call later
        for (let arr_index in runtime_config.status_check) {
            if (runtime_config.status_check[arr_index].importance) {
                let imp_list = runtime_config.status_check[arr_index].importance;
                for (let imp_idx in imp_list) {
                    let spy_name = imp_list[imp_idx].split(const_result_to_child_separator)[0];
                    
                    if(!all_spy_result[spy_name]) {
                        debug_logger('Add ' + spy_name + ' to spy_result list to get.');
                        all_spy_result[spy_name] = {};
                        
                        let get_spy_result_funcs = async.apply(get_spy_result, config.zk_server.host, config.zk_server.port, spy_name);
                        if (get_spy_result_funcs !== null) {
                            spy_app_result_to_get_data.push(get_spy_result_funcs);
                        }
                    }
                }
            }
            else {
            }
        }
        
        // Get Spy result
        if(spy_app_result_to_get_data !== null && spy_app_result_to_get_data.length > 0) {
            debug_logger('Start to get {Spy_result} data.');
            async.parallel(
                    spy_app_result_to_get_data, // <-- a list of functions "get_spy_result"
                    function(err, result) {
                        debug_logger('---> END');
                        callback(null, true);
                    }
            );
        }
        else {
            debug_logger('No {Spy_result} need to get data.');
            debug_logger('---> END');
            callback(null, true);
        }
    }
    else {
        debug_logger('No {runtime_config.status_check}.');
        debug_logger('---> END');
        callback(true, {"message": 'No {runtime_config.status_check}.'});
    }
}
//------------------------------------------------------------------------------
//--  GET SPY RESULT - End group  ----------------------------------------------
//------------------------------------------------------------------------------


//------------------------------------------------------------------------------
//--  CALCULATE INTERNAL STATUS - Begin group  ---------------------------------
//------------------------------------------------------------------------------
function is_importance_line_true(imp_line) {
    var imp_arr = imp_line.split(const_result_to_child_separator);
    if (imp_arr.length > 1) {
        var spy_name = imp_arr[0];
        var spy_check = imp_arr[1];
        if (all_spy_result[spy_name]) {
            if (all_spy_result[spy_name][spy_check]) {
                var spy_check_result = all_spy_result[spy_name][spy_check];
                if (spy_check_result.is_success) {
                    if (spy_check_result.data) {
                        return true;
                    }
                }
            }
        }
    }
    
    //imp_arr.length < 2 ---> FALSE
    //no spy_name ---> FALSE
    //no spy_check ---> FALSE
    //spy_check.is_success = false ---> FALSE
    return false; 
}

function is_all_importance_lines_true(app_check_info) {
    if(app_check_info.importance) {
        for (var i in app_check_info.importance) {
            var importance_line = app_check_info.importance[i];
            if (!is_importance_line_true(importance_line)) {
                return false; //if any importance line false ---> FALSE
            }
        }
        
        return true;
    }
    
    // no importance ---> true
    return true;
}

function is_mini_status_true(app_check_info) {
    const debug_logger = require('debug')(MODULE_NAME + '.is_mini_status_true');
    
    // Tinh mini_expression
    if(app_check_info.mini_expression) {
        let mini_expr = app_check_info.mini_expression;
        
        if (data_process_utils.check_expression_valid(mini_expr)) {
            return data_process_utils.calculate_status_expression(all_spy_result_var_dict, mini_expr);
        }
        else {
            debug_logger('mini_status invalid.');
        }
    }
    
    // no mini_expression ---> FALSE (die)
    // mini_expression not valid ---> FALSE (die)
    return false;
}

function process_for_internal_status(callback) {
// @async compatible
// remember to do: run_result = {};
    const debug_logger = require('debug')(MODULE_NAME + '.process_for_internal_status');

    if(runtime_config.status_check) {
        for (var intsts_idx in runtime_config.status_check) {
            var app_check_info = runtime_config.status_check[intsts_idx];
            
            var app_inter_sts = {};
            app_inter_sts.name = app_check_info.name;
            
            if(is_all_importance_lines_true(app_check_info)) {
                app_inter_sts.internal_status = 'OK';
            }
            else {
                if(is_mini_status_true(app_check_info)) {
                    app_inter_sts.internal_status = 'WARN';
                }
                else {
                    app_inter_sts.internal_status = 'FAIL';
                }
            }
            
            //run_result.push(app_inter_sts);
            run_result[app_inter_sts.name] = app_inter_sts;
        }
        debug_logger('---> END (processed)');
        callback(null, true);
    }    
    else {
        debug_logger('No {runtime_config.status_check}.');
        debug_logger('---> END');
        callback(true, {"message": 'No {runtime_config.status_check}.'});
    }
}
//------------------------------------------------------------------------------
//--  CALCULATE INTERNAL STATUS - End group  -----------------------------------
//------------------------------------------------------------------------------


//------------------------------------------------------------------------------
//--  CALCULATE EXTERNAL STATUS - Begin group  ---------------------------------
//------------------------------------------------------------------------------

function process_one_app_external_status(app_check_info) {
    const debug_logger = require('debug')(MODULE_NAME + '.calculate_final_status');

    debug_logger('Check for ' + app_check_info.name);
    
    // App status is calculated before
    if(run_result[app_check_info.name].final_status) {
        debug_logger('Status caculated before');
        return;
    }
    
    if(app_check_info.dependencies) {
        if(app_check_info.dependencies.length > 0) {
            //To store dependencies
            common_utils.set_child_dict_property(run_result, app_check_info.name, 'dependencies', app_check_info.dependencies);
        
            if (app_checking_stack.indexOf(app_check_info.name) > -1) {
                // app is exists in stack
                //   ---> this app depend on it self after a loop
                //   ---> dependencies_status = 'OK'
                debug_logger('App loop: ' + app_check_info.name + 
                    ' ---> ext_status = int_status = OK');
                ////run_result[app_check_info.name].dependencies_status = 'OK';
                common_utils.set_child_dict_property(run_result, app_check_info.name, 'dependencies_status', 'OK');
                calculate_final_status(app_check_info.name);
            }
            else {
                debug_logger('Push to Stack: ' + app_check_info.name);
                app_checking_stack.push(app_check_info.name);
                for (var i in app_check_info.dependencies) {
                    debug_logger('Push to Stack: ' + app_check_info.dependencies[i]);
                    app_checking_stack.push(app_check_info.dependencies[i]);
                }
                
                var cur_app_name = '_**_SPECIAL_NAME_**_';
                do {
                    cur_app_name = app_checking_stack.pop();
                    debug_logger('Pop from Stack: ' + cur_app_name);
                    
                    // Pop other app ---> get status
                    if(cur_app_name != app_check_info.name) {
                        ////common_utils.write_console('controller.process_one_app_external_status', 'NOT MAIN APP');
                        var cur_app_check_info = common_utils.find_obj_in_array_by_property_value(runtime_config.status_check, 'name', cur_app_name);
                        process_one_app_external_status(cur_app_check_info);
                    }
                    // When Pop app (it self) ---> calculate status
                    else {
                        ////common_utils.write_console('controller.process_one_app_external_status', 'MAIN APP');
                        common_utils.set_child_dict_property(run_result, cur_app_name, 'dependencies_status', 'OK');
                        for (var i in app_check_info.dependencies) {
                            var depend_app_name = app_check_info.dependencies[i];
                            if (run_result[depend_app_name].dependencies_status != 'OK') {
                                common_utils.set_child_dict_property(run_result, cur_app_name, 'dependencies_status', 'WARN');
                                break;
                            }
                        }
                        debug_logger('Dependencies_Status = ' + run_result[cur_app_name].dependencies_status);
                    }
                }
                while(cur_app_name != app_check_info.name);
                calculate_final_status(cur_app_name);
            }
        }
        else {
            //no dependencies ---> Externet Status = OK
            ////run_result[app_check_info.name].dependencies_status = 'OK';
            common_utils.set_child_dict_property(run_result, app_check_info.name, 'dependencies_status', 'OK');
            calculate_final_status(app_check_info.name);
        }
    }
    else {
        //no dependencies ---> Externet Status = OK
        ////run_result[app_check_info.name].dependencies_status = 'OK';
        common_utils.set_child_dict_property(run_result, app_check_info.name, 'dependencies_status', 'OK');
        calculate_final_status(app_check_info.name);
    }
}


function process_for_external_status(callback) {
// @async compatible
// Kiem tra trang thai dua vao phan cau hinh "dependencies"
//   ---> Ket qua: set cau hinh vao run_result.app_name.dependencies_status = true/false
    const debug_logger = require('debug')(MODULE_NAME + '.process_for_external_status');

    debug_logger('---> START');
    if(runtime_config.status_check) {
        app_checking_stack = []; // stack to save sequnce of apps to check
        
        for(var app_idx in runtime_config.status_check) {
            var app = runtime_config.status_check[app_idx];
            
            //App.final_status not null ---> status is calculate before when checking another app
            if(!run_result[app.name].final_status) {
                debug_logger('App ' + app.name + ' not has final_status yet.');
                if(app.dependencies) {
                    debug_logger('App ' + app.name + 'dependence on other apps.');
                    process_one_app_external_status(app);
                }
                else {
                    debug_logger('App ' + app.name + 'is NOT dependence on other apps.');
                    // no dependencies ---> OK
                    common_utils.set_child_dict_property(run_result, app.name, 'dependencies_status', 'OK');
                    calculate_final_status(app.name);
                }
            }
        }
        callback(null, true);
    }
    else {
        debug_logger('No {runtime_config.status_check}.');
        debug_logger('---> END');
        callback(true, {"message": 'No {runtime_config.status_check}.'});
    }
}

//*************************************
function calculate_final_status(app_name) {
    const debug_logger = require('debug')(MODULE_NAME + '.calculate_final_status');

    debug_logger('Run for:  ' + app_name);

    ////common_utils.write_console('controller.calculate_final_status', 'internal_status = ' + run_result[app_name].internal_status);
    ////common_utils.write_console('controller.calculate_final_status', 'dependencies_status = ' + run_result[app_name].dependencies_status);

    var int_sts = common_utils.status_to_num(run_result[app_name].internal_status);
    var dep_sts = common_utils.status_to_num(run_result[app_name].dependencies_status);
    var fin_sts = Math.max(int_sts, dep_sts);
    
    debug_logger('final_status = ' + common_utils.num_to_status(fin_sts));
    common_utils.set_child_dict_property(run_result, app_name, 'final_status', common_utils.num_to_status(fin_sts));
}
//------------------------------------------------------------------------------
//--  CALCULATE EXTERNAL STATUS - End group  -----------------------------------
//------------------------------------------------------------------------------



function create_all_spy_result_var_dict(callback) {
    all_spy_result_var_dict = data_process_utils.create_var_dict_from_all_spy_result(all_spy_result);
    callback(null, true);
}


function run() {
    var conf_path = const_OK_data_processor_conf_path;
    var result_path = const_OK_data_processor_result_path;
    //var alive_path = const_danko_alive_path + config.zk_server.conf_name;
    
	run_result = {};
	
	async.series (
		[
			////async.apply(load_runtime_config_from_zk, config.zk_server.host, config.zk_server.port, conf_path),
			get_used_spy_app_result,
			create_all_spy_result_var_dict,
			process_for_internal_status,
			process_for_external_status,
			show_result, // TAM MO TRONG QUA TRINH TEST
			async.apply(write_result_data_to_zk, config.zk_server.host, config.zk_server.port, result_path),
		],
		run_async_final
	);
}


function end() {
    delete_alive_node((err, result) => {
        if(err) {
            console.log('controller.end', 'ERROR', 'Remove EPHEMERAL NODE get error: ' + err);
        }
        else {
            console.log('controller.end', 'ERROR', 'Remove EPHEMERAL NODE SUCCESS');
        }
        
        app_zkClient.close();
    });
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
exports.load_config = load_config;
exports.set_config = set_config;
exports.init_by_conf = init_by_conf;
