'use strict'

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
    const debug_logger = require('debug')('data_process_utils' + '.check_expression_valid');
    
    debug_logger('@expr_str = ' + expr_str);
    
    if(typeof expr_str !== 'string') {
        debug_logger('@expr_str is not a string!');
        return false;
    }
    
    let check_str = expr_str.replace(/{{[a-zA-Z0-9_.\->]+}}/g, '');
    check_str = check_str.replace(/-->/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/&&/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\|\|/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\(/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\)/g, '');
    //console.log('check_str = %', check_str);
    check_str = check_str.replace(/\s/g, '');
    //console.log('check_str = %', check_str);
    debug_logger('Last expr_str: ' + check_str);
    return check_str.length == 0;
}


function calculate_status_expression(var_dict, expression) {
    const debug_logger = require('debug')('data_process_utils' + '.calculate_status_expression');
    
    debug_logger('Start to check expr = "' + expression + '"');
    
    if (var_dict) {
        let expr_str = expression;
        for (let key in var_dict) { //key is "spy_name-->task_name"
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
        
        debug_logger('Expression before set "false" = ' + expr_str);
        //Thay nhung {{var}} con sot lai thanh FALSE
        expr_str = expr_str.replace(/{{[a-zA-Z0-9_.\->]+}}/g, 'false');

        debug_logger('Expression to evaluate = ' + expr_str);
        let eval_result = eval(expr_str);
        
        debug_logger('Result = ' + eval_result);
        return eval_result;
    }
    
    // If not var_dict --> return TRUE
    return true;
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
exports.check_expression_valid = check_expression_valid;
exports.create_var_dict_from_all_spy_result = create_var_dict_from_all_spy_result;
exports.create_var_dict_from_spy_result = create_var_dict_from_spy_result;
exports.calculate_status_expression = calculate_status_expression;