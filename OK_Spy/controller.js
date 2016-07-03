var async = require("async");
var config = {zk_server: {host: '127.0.0.1', port: 2181}, log_file: './logs/danko.log'};
var runtime_config = null;
var YAML = require('yamljs');

//OK_Project utils
var common_utils = require('./utils/common_utils');
var zk_helper = require('./utils/zk_helper');

var const_danko_conf_path = '/danko/conf/';
var const_danko_result_path = '/danko/result/';
var const_danko_alive_path = '/danko/alive/';


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
function load_config(filename) {
    config = YAML.load(filename);
    common_utils.logging_config(config.log_file);
    common_utils.write_log('info', 'load_config', 'SUCCESS', 'Main config loaded!');
    return config;
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

function load_runtime_config_from_zk(host, port, path, callback) {
// @ Async Compatible
    async.waterfall([
            async.apply(zk_helper.zk_get_node_data, host, port, path)
        ], 
        function (err, data) {
            if (err) {
                console.log('Cannot load runtime_config because of error: %s', err);
                common_utils.write_log('info', 'controller.load_runtime_config_from_zk', 'FAILED', 
                        {host: host, port: port, path: path, msg: 'Get Error when loading runtime_config'});
                callback(err);
            }
            else {
                runtime_config = YAML.parse(data);
                console.log('Runtime Config loaded:\n%s', YAML.stringify(runtime_config, 10));
                common_utils.write_log('info', 'controller.load_runtime_config_from_zk', 'SUCCESS', 
                        {host: host, port: port, path: path, msg: 'Success loading runtime_config'});
                callback(null, runtime_config);
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
	    var err = 'No tasks_group.';
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
        	
			var funcs_to_run = get_tasks_function_arr(tasks_group);
			
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
    	    var err = 'No Task to run.';
    	    console.log('Controller.run_parallel_group --> ' + err);
    	    callback(err);
    	}
	}
	else {
	    var err = 'No tasks_group.';
	    console.log('Controller.run_parallel_group --> ' + err);
	    callback(err);
	}
    //--------------------------------------------------------------------
}


function run_status_expression(var_dict, expression) {
// var_dict: {var_name: value in (true, false) }
// return {err: err, result: value in (true/false)}
    console.log('Start [run_status_expression]: %s', expression);
    
    if(expression) {
        if (common_utils.check_expression_valid(expression)) {
            if (var_dict) {
                var expr_str = expression;
                for (var key in var_dict) { //key is task.name
                    // Neu ket qua ghi nhan thanh cong --> {{var}} = TRUE
                    if (var_dict[key]) {
                        expr_str = expr_str.split('{{' + key + '}}').join('true');
                    }
                    else {
                    // Neu khong co ket qua ghi nhan thanh cong (false hoac khong check duoc)
                    //   --> {{var}} = FALSE
                        expr_str = expr_str.split('{{' + key + '}}').join('false');
                    }
                }
                
                //Thay nhung {{var}} con sot lai thanh FALSE
                expr_str = expr_str.replace(/{{[a-zA-Z0-9_.]+}}/g, 'false');
    
                console.log('[run_status_expression] expression to evaluate = %s', expr_str);
                
                var eval_result = {
                    "result": eval(expr_str)
                }
                console.log('[run_status_expression] result = %s', eval_result.result);
                return eval_result;
            }
            
            // If not var_dict --> return TRUE
            return {
                "result":true
            };
        }
        else {
            console.log('[run_status_expression] expression is not valid.');
            return {
                "err": "expression is not valid"
            }
        }
    }
    else {
        // If no expression --> AND all key of the dict
        for (var key in var_dict) {
            if (var_dict[key] == false) {
                return {"result": false};
            }
        }
        return {"result": true};
    }
}

function create_var_dict_from_run_result() {
    var var_dict = {};
    for (var key in run_result) {
        if(run_result[key].is_success) {
            var_dict[key] = run_result[key].data;
        }
        else {
            var_dict[key] = false;
        }
    }
    return var_dict;
}

function process_for_is_alive(callback) {
    if (runtime_config.is_alive) {
        console.log('Start check for is_alive: %s', runtime_config.is_alive);
        var eval_is_alive = run_status_expression(create_var_dict_from_run_result(), runtime_config.is_alive);
        if (eval_is_alive.err) {
            console.log('[process_for_is_live] %s', eval_is_alive.err);
            run_result.is_alive = false;
        }
        else {
            run_result.is_alive = eval_is_alive.result;
        }
    }
    callback(null, true);
}

function process_for_is_alive_list(callback) {
    if (runtime_config.is_alive_list) {
        console.log('Start [process_for_is_alive_list]');
        
        run_result.alive_list = {};
        
        var var_dict = create_var_dict_from_run_result();
        
        runtime_config.is_alive_list.forEach(
            function(item) {
                var eval_is_alive = run_status_expression(var_dict, item.expression);
                
                if (eval_is_alive.err) {
                    console.log('[process_for_is_alive_list]    name=%s    err=%s', item.name, eval_is_alive.err);
                    run_result.alive_list[item.name] = false;
                }
                else {
                    run_result.alive_list[item.name] = eval_is_alive.result;
                }
            }
        );
    }
    callback(null, true);
}


function check_depend_app(app_name, depended_app_status, callback) {
    var app_alive_path = const_danko_alive_path + app_name;
    zk_helper.zk_check_node_exists(
            config.zk_server.host, 
            config.zk_server.port, 
            app_alive_path, 
            function(err, status) {
                if(err) {
                    depended_app_status[app_name] = false;
                    callback(err);
                }
                else {
                    if(status) {
                        depended_app_status[app_name] = status;
                    }
                    else {
                        depended_app_status[app_name] = false;
                    }
                    callback(null, status);
                }
            }
    );
}

function get_depend_on_app_status(callback) {
    console.log('START get_depend_on_app_status');
    if(runtime_config) {
        if(runtime_config.depend_on_app) {
            if(runtime_config.depend_on_app.list) {
                console.log('Check get_depend_on_app_status: %s', JSON.stringify(runtime_config.depend_on_app.list));
                depended_app_status = {}
                var tasks_arr = [];
                runtime_config.depend_on_app.list.forEach(
                    function(app_name) {
                        console.log('get_depend_on_app_status    Add app_name: %s', app_name);
                        tasks_arr.push(async.apply(check_depend_app, app_name, depended_app_status));
                    }
                );
                
                async.parallel(
                    tasks_arr,
                    function (err, result) {
                        if(err) {
                            console.log('Check depend_on_app get ERROR: %s', err);
                            callback(err);
                        }
                        else {
                            console.log('Check depend_on_app get RESULT: %s', result);
                            callback(null, result);
                        }
                    }
                );
            }
            else {
                console.log('[get_depend_on_app_status] No runtime_config.depend_on_app.list');
                callback(null, true);
            }
        }
        else {
        console.log('[get_depend_on_app_status] No runtime_config.depend_on_app');
            callback(null, true);
        }
    }
    else {
        console.log('[get_depend_on_app_status] No runtime_config');
        callback(null, true);
    }
}

function process_for_dependencies(callback) {
    var eval_is_alive = null;
    
    if (runtime_config.depend_on_app) {
        if (runtime_config.depend_on_app.list) {
            if (runtime_config.depend_on_app.expression) {
                console.log('Start [process_for_dependencies]: %s', runtime_config.depend_on_app.expression);
                eval_is_alive = run_status_expression(depended_app_status, runtime_config.depend_on_app.expression);
            }
            else {
                console.log('Start [process_for_dependencies]: No expression');
                eval_is_alive = run_status_expression(depended_app_status, null);
            }

            if (eval_is_alive.err) {
                console.log('[process_for_dependencies] %s', eval_is_alive.err);
                run_result.dependencies_alive = false;
            }
            else {
                run_result.dependencies_alive = eval_is_alive.result;
            }
        }
    }
    
    if (eval_is_alive == null) {
        // No dependencies
        console.log('[process_for_dependencies] No dependencies ---> TRUE');
        run_result.dependencies_alive = true;
    }
    
    callback(null, true);
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

function run_group_runtime_config(callback) {
	console.log('== RUN 1st ========================================================');
	
	run_result = {};
	console.log('Start: Controller.run_group_runtime_config');
    run_group(runtime_config.main_task, callback);
}

function manage_alive_node(host, port, path, callback) {
    console.log('Run [manage_alive_node]');
    if(run_result.is_alive) {
        zk_helper.zk_create_emphemeral_node_sure(host, port, path, callback);
    }
    else {
        zk_helper.zk_remove_node_sure(host, port, path, callback);
    }
}

function manage_alive_list(host, port, callback) {
    console.log('Run [manage_alive_list]');
    var path_prefix = const_danko_alive_path;
    
    if(run_result.alive_list) {
        var dict_to_run = run_result.alive_list;
        
        var run_func_arr = [];
        
        for (var name in dict_to_run) { //dict_to_run = {"name1": true, "name2": false}
            var path = path_prefix + name;
            if (dict_to_run[name]) {
                run_func_arr.push(async.apply(zk_helper.zk_create_emphemeral_node_sure, host, port, path));
            }
            else {
                run_func_arr.push(async.apply(zk_helper.zk_remove_node_sure, host, port, path));
            }
        }
        
        async.parallel(
                run_func_arr,
                callback
        );
    }
    else {
        console.log('No [run_result.alive_list]')
        callback(null, false); //---> khong chay    
    }
}


function run() {
    var conf_path = const_danko_conf_path + config.zk_server.conf_name;
    var result_path = const_danko_result_path + config.zk_server.conf_name;
    //var alive_path = const_danko_alive_path + config.zk_server.conf_name;
    
	async.series (
		[
			async.apply(load_runtime_config_from_zk, config.zk_server.host, config.zk_server.port, conf_path),
			run_group_runtime_config,
			//process_for_is_alive,
			//process_for_is_alive_list,
			//get_depend_on_app_status,
			//process_for_dependencies,
			show_result, // TAM MO TRONG QUA TRINH TEST
			async.apply(write_result_data_to_zk, config.zk_server.host, config.zk_server.port, result_path),
			//async.apply(manage_alive_node, config.zk_server.host, config.zk_server.port, alive_path),
			//async.apply(manage_alive_list, config.zk_server.host, config.zk_server.port)
		],
		run_async_final
	);
}





/* FOR TESTING */
/*
 ____                        _       __   __ _    __  __ _     
/ ___|  __ _ _ __ ___  _ __ | | ___  \ \ / // \  |  \/  | |    
\___ \ / _` | '_ ` _ \| '_ \| |/ _ \  \ V // _ \ | |\/| | |    
 ___) | (_| | | | | | | |_) | |  __/   | |/ ___ \| |  | | |___ 
|____/ \__,_|_| |_| |_| .__/|_|\___|   |_/_/   \_\_|  |_|_____|
*/
function zk_write_test_config(host, port, path) {
    var test_conf_str = YAML.load('./conf/zk_test_conf.yml');
    console.log(YAML.stringify(test_conf_str, 10));
    zk_helper.zk_set_node_data(config.zk_server.host, config.zk_server.port, const_danko_conf_path + config.zk_server.conf_name, 
            YAML.stringify(test_conf_str, 10), 
            function(err, data) {
                console.log('DONE err=%s data=%s', err, data);
            });

	// get to check data
	//zk_get_node_data(config.zk_server.host, config.zk_server.port, danko_conf_path + config.zk_server.conf_name);
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
//zk_create_node('127.0.0.1', 2181, '/danko/alive', function(){});

exports.run = run;
//exports.set_logger = set_logger;
exports.load_config = load_config;

exports.zk_write_test_config = zk_write_test_config;
