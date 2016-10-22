'use strict'

const fs = require('fs');
const running = require("is-running");


function check_file(filename, task_name, next_process, async_callback) {
    const debug_logger = require('debug')('danko_pid_check.task_callback');

    debug_logger('RUN');
    
    if(fs.existsSync(filename)) {
        debug_logger('PID File exists');
        
        //load PID from file
        fs.readFile(filename, function (err,data) {
            if (err) {
                debug_logger('ERROR - Cannot read PID file - ' + err);
                next_process(task_name, 'Cannot read PID file: ' + filename, null, async_callback);
            }
            else {
                var pid = data;
                var result = running(pid);
                if (result == true) {
                    debug_logger('Process ' + pid + ' is running');
                    next_process(task_name, null, true, async_callback);
                }
                else {
                    debug_logger('Process ' + pid + ' is not running');
                    next_process(task_name, 'Process ' + pid + ' is not running.', null, async_callback);
                }
            }
        });
    }
    else {
        debug_logger('PID File not exists')
        next_process(task_name, 'File not exists: ' + filename, null, async_callback);
    }
}

function check_pid(pid_num) {
    var result = running(pid_num);
    return result;
}




exports.check_file = check_file;
exports.check_pid = check_pid;
