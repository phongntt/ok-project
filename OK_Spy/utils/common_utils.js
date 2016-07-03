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

function check_expression_valid(expr_str) {
    var check_str = expr_str.replace(/{{[a-zA-Z0-9_.]+}}/g, '');
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
    return check_str.length == 0;
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






exports.check_expression_valid = check_expression_valid;
exports.set_logger = set_logger;
exports.logging_config = logging_config;
exports.write_log = write_log;
