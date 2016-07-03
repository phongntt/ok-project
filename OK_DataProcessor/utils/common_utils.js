var winston = require('winston'); //for logging
var logger = winston;


/*---------------------------------------------------------------------
######## ##     ## ##    ##  ######  ######## ####  #######  ##    ##  ######  
##       ##     ## ###   ## ##    ##    ##     ##  ##     ## ###   ## ##    ## 
##       ##     ## ####  ## ##          ##     ##  ##     ## ####  ## ##       
######   ##     ## ## ## ## ##          ##     ##  ##     ## ## ## ##  ######  
##       ##     ## ##  #### ##          ##     ##  ##     ## ##  ####       ## 
##       ##     ## ##   ### ##    ##    ##     ##  ##     ## ##   ### ##    ## 
##        #######  ##    ##  ######     ##    ####  #######  ##    ##  ######  
---------------------------------------------------------------------*/

function create_var_dict_from_all_spy_result(all_spy_result) {
    var var_dict = {};
    for (var spy_name in all_spy_result) {
        var spy_result = all_spy_result[spy_name];
        
        var spy_dict = create_var_dict_from_spy_result(spy_result);
        
        for(var task_name in spy_dict) {
            var_dict[spy_name + '-->' + task_name] = spy_dict[task_name];
        }
    }
    return var_dict;
}


function create_var_dict_from_spy_result(spy_result) {
    var var_dict = {};
    for (var task_name in spy_result) {
        if(spy_result[task_name].is_success) {
            var_dict[task_name] = spy_result[task_name].data;
        }
        else {
            var_dict[task_name] = false;
        }
    }
    return var_dict;
}


function check_expression_valid(expr_str) {
    var check_str = expr_str.replace(/{{[a-zA-Z0-9_.\->]+}}/g, '');
    check_str = check_str.replace(/-->/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/&&/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/||/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\(/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\)/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\s/g, '');
    //console.log('check_str = %', check_str);
    write_console('common_utils.check_expression_valid', 'Last expr_str: ' + check_str);
    return check_str.length == 0;
}

function calculate_status_expression(var_dict, expression) {
// var_dict: {var_name: value in (true, false) }
// return: true/false
    write_console('[common_utils.calculate_status_expression]', 'Start to check expr = "' + expression + '"');
    
    if (var_dict) {
        var expr_str = expression;
        for (var key in var_dict) { //key is "spy_name-->task_name"
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
        expr_str = expr_str.replace(/{{[a-zA-Z0-9_.->]+}}/g, 'false');

        write_console('[common_utils.calculate_status_expression]', 'Expression to evaluate = ' + expr_str);
        
        var eval_result = eval(expr_str);
        write_console('[common_utils.calculate_status_expression]', 'Result = ' + eval_result);
        return eval_result;
    }
    
    // If not var_dict --> return TRUE
    return true;
}


function find_obj_in_array_by_property_value(arr, property_name, property_value) {
    for (var i in arr) {
        var item = arr[i];
        if(item[property_name] == property_value) {
            return item;
        }
    }
    
    return null;
}


function set_child_dict_property(parent_dict, childname, property_name, property_value) {
    if(!parent_dict[childname]) {
        parent_dict[childname] = {}
    }
    parent_dict[childname][property_name] = property_value;
}


function status_to_num(status) {
    if(status == 'OK') {
        return 1;
    }
    if(status == 'WARN') {
        return 2;
    }
    if(status == 'FAIL') {
        return 3;
    }
    return 9999; //UNKNOWN
}


function num_to_status(status_num) {
    if(status_num == 1) {
        return 'OK';
    }
    if(status_num == 2) {
        return 'WARN';
    }
    if(status_num == 3) {
        return 'FAIL';
    }
    return 'UNKNOWN'; //UNKNOWN
}

/*
 _                
| |    ___   __ _ 
| |   / _ \ / _` |
| |__| (_) | (_| |
|_____\___/ \__, |
            |___/ 
===========================================
*/
function set_logger(new_logger) {
    logger = new_logger;
}

function logging_config(filename) {
    logger = new(winston.Logger)({
        transports: [
            new(winston.transports.File)({filename: filename})
        ],
        level: 'debug'
    });
}

function write_log(log_level, command, result, msg) {
    var log_obj = {
        timestamp: new Date().toISOString(),
        app_name: 'DANKO',
        command: command,
        result: result,
        message: msg
    };
    logger.log(log_level, log_obj);
}

function write_console(module, msg) {
    //template: <TIMESTAMP> [MODULE] --{ MESSAGE }--
    console.log('<%s> [%s] --{ %s }--', new Date().toISOString(), module, msg);
}






exports.check_expression_valid = check_expression_valid;
exports.set_logger = set_logger;
exports.logging_config = logging_config;
exports.write_log = write_log;
exports.write_console = write_console;
exports.create_var_dict_from_all_spy_result = create_var_dict_from_all_spy_result;
exports.create_var_dict_from_spy_result = create_var_dict_from_spy_result;
exports.calculate_status_expression = calculate_status_expression;
exports.find_obj_in_array_by_property_value = find_obj_in_array_by_property_value;
exports.set_child_dict_property = set_child_dict_property;
exports.status_to_num = status_to_num;
exports.num_to_status = num_to_status;