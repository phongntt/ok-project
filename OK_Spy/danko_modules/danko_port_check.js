function check_port_openning(server_ip, port_num, task_name, next_process, async_callback) {
    var tcpPortUsed = require('tcp-port-used');
    
    tcpPortUsed.check(port_num, server_ip)
    .then(function(inUse) {
        next_process(task_name, null, true, async_callback);
        //return {is_success: true, data: true};
    }, function(err) {
        next_process(task_name, err, null, async_callback);
        //return {is_success: false, data: {err: err}};
    });
}




exports.check_port_openning = check_port_openning;
