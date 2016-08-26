'use strict'

const process = require('process'); 
const fs = require('fs');

const SLEEP_SECONDS = 5;

/**
 * A Sample app
 */
 
function show_some_thing() {
    let currentdate = new Date();
    console.log(currentdate.toString(), 'INFO', 'Running');
    console.log(currentdate.toString(), 'INFO', 'ENV:', process.env.OKSP_ENV);
}

function write_pid_to_file(pid) {
    let filePath = process.env.OKSP_PID_PATH;
    
    fs.writeFile(filePath, pid, function(err) {
        if(err) {
            let currentdate = new Date();
            console.log(currentdate.toString(), 'ERROR', 
                'Save PID to file get error', err);
            return;
        }
    
        console.log("The PID file was saved!");
    }); 
}


let pid = process.pid;

write_pid_to_file(pid);

let currentdate = new Date();
console.log(currentdate.toString(), 'INFO', 'START, PID=' + pid);
setInterval(show_some_thing, SLEEP_SECONDS * 1000);