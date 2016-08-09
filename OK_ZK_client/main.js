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
      instance: dafault-khcn`;
    
    controller.set_data('/danko/app_info', data);
}

main_run();
