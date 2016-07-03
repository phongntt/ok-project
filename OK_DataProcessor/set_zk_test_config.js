var main_conf_file = './conf/conf.yml';

var controller = require('./controller.js');

controller.load_config(main_conf_file);

controller.zk_write_test_config();

console.log('DONE.');