var fs = require('fs');
var running = require("is-running");

function check_file(filename, task_name, next_process, async_callback) {
    if(fs.existsSync(filename)) {
        //load PID from file
        fs.readFile(filename, function (err,data) {
            if (err) {
                next_process(task_name, 'Cannot read PID file: ' + filename, null, async_callback);
            }
            else {
                var pid = data;
                var result = running(pid);
                if (result == true) {
                    next_process(task_name, null, true, async_callback);
                }
            }
        });
    }
    else {
        next_process(task_name, 'File not exists: ' + filename, null, async_callback);
    }
}

function check_pid(pid_num) {
    var result = running(pid_num);
    return result;
}




exports.check_file = check_file;
exports.check_pid = check_pid;
