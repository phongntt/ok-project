"use strict";

// DEFAULT CONFIG
var config = null;

const controller = require('./controller.js');

function add_env_var() {
/*
Add Environment Variables to config
*/
    config = {};
    
    config.zk = {};
    config.zk.host = process.env.NODE_OK_ZK_CLI_ZK_HOST;
    config.zk.port = process.env.NODE_OK_ZK_CLI_ZK_PORT;
}

function main_run() {
    add_env_var();
    
    controller.set_config(config);
    
    let data = `-
  host: 192.168.72.66
  apps:
    - 
      name: INTERNET_BANKING
      type: tomcat
      location: "/u02/apache-tomcat-7.0.41"
    - 
      name: COREBS
      type: jboss
      location: "/u02/jboss-eab-5.1"
      instance: dafault-khcn
-
  host: 192.168.72.80
  apps:
    - 
      name: INTERNET_BANKING
      type: tomcat
      location: "/u02/apache-tomcat-7.0.41"
    - 
      name: COREBS
      type: jboss
      location: "/u02/jboss-eab-5.1"
      instance: dafault-khcn
-
  host: 192.168.8.111
  apps:
    - 
      name: "SAMPLE_APP"
      type: "sampleapp"
      location: "/home/ubuntu/workspace/node.js/apps/OK_sample_app"
      run_as_user: "tomcat"
      commands:
        start: "/home/ubuntu/workspace/node.js/apps/OK_sample_app/bin/startup.sh"
        stop: "/home/ubuntu/workspace/node.js/apps/OK_sample_app/bin/stop.sh"
    - 
      name: "TEST_TOMCAT_CTLR"
      type: "tomcat"
      location: "/home/ubuntu/workspace/tomcat"
      run_as_user: "tomcat"
      commands:
        start: "echo start"
        stop: "echo stop"
    - 
      name: TEST_JBOSS_CTLR
      type: jboss
      location: "/home/ubuntu/workspace/jboss"
      instance: dafault
      run_as_user: "jboss"
      commands:
        start: "echo start"
        stop: "echo stop"`;
    
    controller.set_data('/danko/app_info', data);
}

main_run();
