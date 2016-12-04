'use strict';

const MODULE_NAME = 'controller';

var async = require("async");
//var config = {zk_server: {host: '127.0.0.1', port: 2181}, log_file: './logs/danko.log'};
var config = {};
var runtime_config = null;
var YAML = require('yamljs');

//OK_Project utils
var common_utils = require('./utils/common_utils');
////var config_utils = require('./utils/config_utils');
var zk_helper = require('./utils/zk_helper');

////var const_danko_conf_path = '/danko/conf/';
////var const_danko_result_path = '/danko/result/';
////var const_danko_alive_path = '/danko/alive/';


var run_result = null;
////var depended_app_status = null;


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

/*
 _                    _    ____             __ _       
| |    ___   __ _  __| |  / ___|___  _ __  / _(_) __ _ 
| |   / _ \ / _` |/ _` | | |   / _ \| '_ \| |_| |/ _` |
| |__| (_) | (_| | (_| | | |__| (_) | | | |  _| | (_| |
|_____\___/ \__,_|\__,_|  \____\___/|_| |_|_| |_|\__, |
                                                 |___/ 
===========================================
*/
function set_config(p_config, p_runtime_config) {
    config = p_config;
    runtime_config = p_runtime_config;
}


function write_result_data_to_zk(app_config, callback) {
// @ Async Compatible
    const debug_logger = require('debug')(MODULE_NAME + '.write_result_data_to_zk');

    let host = app_config.zk_server.host;
    let port = app_config.zk_server.port;
    let result_path = app_config.zk_server.main_conf_data.spy_report_path 
        + '/' + app_config.zk_server.app_name;
    
    debug_logger('Result path: ' + result_path);

    let result_data = YAML.stringify(run_result);
    async.series([
            async.apply(zk_helper.zk_create_node_sure, host, port, result_path),
            async.apply(zk_helper.zk_set_node_data, host, port, result_path, result_data)
        ], 
        function (err, data) {
            if (err) {
                console.log('Cannot write RUNNING RESULT because of error: %s', err);
                //common_utils.write_log('info', 'controller.write_result_data_to_zk', 'FAILED', 
                //        {host: host, port: port, path: result_path, msg: 'Get Error when writting RUNNING RESULT'});
                callback(err);
            }
            else {
                console.log('RUNNING RESULT wrote:\n%s', result_data);
                //common_utils.write_log('info', 'controller.write_result_data_to_zk', 'FAILED', 
                //        {host: host, port: port, path: result_path, msg: 'Success writting RUNNING RESULT'});
                callback(null, run_result);
            }
        }
    );
}


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
    let tasks_arr = [];
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
    // Funtion to Process after a task was run and call to callback
    function rot__task_callback(task_name, err, data, rot__callback) {
        const debug_logger = require('debug')(MODULE_NAME + '.rot__task_callback');
        debug_logger('Called with task: ' + task_name);
    
        if(err) {
            run_result[task_name] = {is_success: false, error: err};
            console.log('Task: %s --> Get Error: %s', task_name, err);
        }
        else {
            run_result[task_name] = {is_success: true, data: data};
            console.log('Task: %s --> Success: %s', 
                    task_name, JSON.stringify(run_result[task_name]));
        }
        console.log('---- Task run: %s - END   ----', task_name);
        rot__callback(null, true);
    }
    
    const debug_logger = require('debug')(MODULE_NAME + '.run_one_task');
    
    debug_logger('Run task: ' + task_conf.name);
    console.log('---- Task run: %s - BEGIN ----', task_conf.name);
    let mod = require(task_conf.module.name); // Get module to run by name
    let func = mod[task_conf.module.function]; // get the function to be run by name
    debug_logger('Module to run: ' + task_conf.module.name);
    debug_logger('Function to run: ' + task_conf.module.function);
    
    if (task_conf.module.type == ModFunctionType.ReturnValue) { 
        let result = func.apply(this, task_conf.module.params);
        run_result[task_conf.name] = result;
        console.log('Result: %s', JSON.stringify(result));
        console.log('---- Task run: %s - END   ----', task_conf.name);
        callback(null, true);
        return;
    }
    else if (task_conf.module.type == ModFunctionType.Callback) {
        console.log('Callback Type...');
        
        let mod_params = [];
        mod_params = mod_params.concat(task_conf.module.params);
        mod_params.push(task_conf.name);
        mod_params.push(rot__task_callback); //process before sending result to callback
        mod_params.push(callback); //calback for async
        
        func.apply(func, mod_params);
        return;
    }
    else {
        common_utils.write_log('info', 'coltroller.run_one_task.check_module_type', 'FAILED', 
                {task_conf: task_conf, msg: 'Unknowk type: ' + task_conf.module.type});
        console.log('Unknowk type: ' + task_conf.module.type);
        console.log('---- Task run: %s - END   ----', task_conf.name);
        callback(null, true);
        return;
    }
}

function run_serial_group(tasks_group, callback) {
// @ Async Compatible
	console.log('Controller.run_serial_group ---> ' + 'RUN group: %s', tasks_group.name);
	if (tasks_group) {
	    if(tasks_group.tasks) {
        	//---- Run Stages ----
        	console.log('Controller.run_serial_group --> RUN tasks');
        	
			let funcs_to_run = get_tasks_function_arr(tasks_group);
			
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
    	    let err = 'No Task to run.';
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
	console.log('***** RESULT'); 
	console.log('----------------------------------------'); 
	console.log(YAML.stringify(run_result)); 
	console.log('----------------------------------------'); 

	callback(null, true);
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

function run_group_mainTask(callback) {
	console.log('== RUN 1st ========================================================');
	
	run_result = {};
	console.log('Start: Controller.run_group_mainTask');
    run_group(runtime_config.main_task, callback);
}



function run(callback) {
    function run_async_final(err, result) {
        const debug_logger = require('debug')(MODULE_NAME + '.run_async_final');
        
        debug_logger('RUN TO HERE');
        
    	if (err) {
    		console.log('Controller.Run --> Error: %s', err);
    		callback(err);
    	}
    	else {
    		console.log('Controller.Run --> Success');
    		callback(null, true); // SUCCESS
    	}
    }

    
	async.series (
		[
			// Load configs from ZK and save it to @runtime_config
			//async.apply(load_runtime_config_from_zk, config),
			
			run_group_mainTask,
			//process_for_is_alive,
			//process_for_is_alive_list,
			//get_depend_on_app_status,
			//process_for_dependencies,
			show_result, // TAM MO TRONG QUA TRINH TEST
			async.apply(write_result_data_to_zk, config)
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
exports.set_config = set_config;