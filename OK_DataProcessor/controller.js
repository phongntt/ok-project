'use strict';

const MODULE_NAME = 'controller'

const STATUS_OK = 'OK';
const STATUS_WARN = 'WARN';
const STATUS_FAIL = 'FAIL';

var async = require("async");
var YAML = require('yamljs');

//OK_Project utils
var common_utils = require('./utils/common_utils');
var data_process_utils = require('./utils/data_process_utils');
var zk_helper = require('./utils/zk_helper');

var config = {zk_server: {host: '127.0.0.1', port: 2080}, log_file: './logs/danko.log'};
var runtime_config = null;

var all_spy_result = null;
var all_spy_result_var_dict = null;
var run_result = null;
var depended_app_status = null;

var app_checking_stack = null;


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
    common_utils.write_console('controller.load_config','Main config loaded!');
    return config;
}

function set_config(p_config, p_runtime_config) {
    config = p_config;
    runtime_config = p_runtime_config;
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
                callback(err); //forward the error
            }
            else {
                console.log('RUNNING RESULT wrote:\n%s', result_data);
                common_utils.write_log('info', 'controller.write_result_data_to_zk', 'SUCCESS', 
                        {host: host, port: port, path: path, msg: 'Success writting RUNNING RESULT'});
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
	



//------------------------------------------------------------------------------
//--  GET SPY RESULT - Begin group  --------------------------------------------
//------------------------------------------------------------------------------
function get_spy_result(host, port, spy_name, callback) {
    const debug_logger = require('debug')(MODULE_NAME + '.get_spy_result');
    
    debug_logger('RUN: spy_name=' + spy_name);
    
    let cur_spy_report_path = config.zk_server.main_conf_data.spy_report_path + '/' + spy_name;

    zk_helper.zk_get_node_data(host, port, cur_spy_report_path, 
            function(err, data) {
                if(err) {
                    debug_logger('ERR: ' + err);
                    
                    //getting error when get data ---> mean data = ''
                    all_spy_result[spy_name] = '';
                    debug_logger('DATA: spy_app_result[' + spy_name + '] = ' + all_spy_result[spy_name]);
                    callback(null, true);
                }
                else {
                    all_spy_result[spy_name] = YAML.parse(data);
                    debug_logger('DATA: spy_app_result[' + spy_name + '] = ' + all_spy_result[spy_name]);
                    callback(null, true);
                }
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
                    let to_child_sign = runtime_config.to_child_sign;
                    let spy_name = imp_list[imp_idx].split(to_child_sign)[0];
                    
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
                        if (err) {
                            debug_logger('ERROR:');
                            debug_logger(err);
                        }
                        else {
                            debug_logger('---> END');
                            callback(null, true);
                        }
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
    let to_child_sign = runtime_config.to_child_sign;
    let imp_arr = imp_line.split(to_child_sign);

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
                app_inter_sts.internal_status = STATUS_OK;
            }
            else {
                if(is_mini_status_true(app_check_info)) {
                    app_inter_sts.internal_status = STATUS_WARN;
                }
                else {
                    app_inter_sts.internal_status = STATUS_FAIL;
                }
            }
            
            //run_result.push(app_inter_sts);
            run_result[app_inter_sts.name] = app_inter_sts;
        }
        debug_logger('---> END (processed)');
        callback(null, true);
    }    
    else {
        debug_logger('No @runtime_config.status_check');
        debug_logger('---> END');
        callback(common_utils.create_error(12000, 'No @runtime_config.status_check'));
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
                //   ---> dependencies_status = sTAtUS_OK
                debug_logger('App loop: ' + app_check_info.name + 
                    ' ---> ext_status = int_status = OK');
                ////run_result[app_check_info.name].dependencies_status = sTAtUS_OK;
                common_utils.set_child_dict_property(run_result, app_check_info.name, 'dependencies_status', STATUS_OK);
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
                        common_utils.set_child_dict_property(run_result, cur_app_name, 'dependencies_status', STATUS_OK);
                        for (var i in app_check_info.dependencies) {
                            var depend_app_name = app_check_info.dependencies[i];
                            if (run_result[depend_app_name].dependencies_status != STATUS_OK) {
                                common_utils.set_child_dict_property(run_result, cur_app_name, 'dependencies_status', STATUS_WARN);
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
            ////run_result[app_check_info.name].dependencies_status = STATUS_OK;
            common_utils.set_child_dict_property(run_result, app_check_info.name, 'dependencies_status', STATUS_OK);
            calculate_final_status(app_check_info.name);
        }
    }
    else {
        //no dependencies ---> Externet Status = OK
        ////run_result[app_check_info.name].dependencies_status = STATUS_OK;
        common_utils.set_child_dict_property(run_result, app_check_info.name, 'dependencies_status', STATUS_OK);
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
                    common_utils.set_child_dict_property(run_result, app.name, 'dependencies_status', STATUS_OK);
                    calculate_final_status(app.name);
                }
            }
        }
        callback(null, true);
    }
    else {
        debug_logger('No {runtime_config.status_check}.');
        debug_logger('---> END');
        callback(common_utils.create_error(12000, 'No @runtime_config.status_check'));
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


function run(callback) {

    function run_async_final(err, result) {
        const debug_logger = require('debug')(MODULE_NAME + '.run_async_final');
    
    	if (err) {
    		debug_logger('Error: ' + err);
    		callback(err); //forward the error
    	}
    	else {
    		debug_logger(' --> Success');
            callback(null, true); //Notify that RUN SUCCESS
    	}
    }
    
    
    const debug_logger = require('debug')(MODULE_NAME + '.run');

    let result_path = config.zk_server.main_conf_data.app_status_path;
    //var alive_path = const_danko_alive_path + config.zk_server.conf_name;
    debug_logger('@result_path = ' + result_path);
    
	run_result = {};
	
	async.series (
		[
			////async.apply(load_runtime_config_from_zk, config.zk_server.host, config.zk_server.port, conf_path),
			get_used_spy_app_result,
			create_all_spy_result_var_dict,
			process_for_internal_status,
			process_for_external_status,
			show_result, // TAM MO TRONG QUA TRINH TEST
			async.apply(write_result_data_to_zk, 
			    config.zk_server.host, config.zk_server.port, result_path),
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
exports.load_config = load_config;
exports.set_config = set_config;