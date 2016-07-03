var main_conf_file = './conf/conf.yml';


var express=require('express');
var YAML=require('yamljs');
var app=express();

function load_config(filename) {
    config = YAML.load(filename);
    return config;
}

var config = null;
config = load_config(main_conf_file);
console.log('Config: ' + JSON.stringify(config));

app.zk_server = config.zk_server;

require('./router/main')(app);


app.use('/client', express.static(__dirname + '/ember_client'));

//app.engine('html', require('ejs').renderFile);

var server=app.listen(process.env.PORT, process.env.IP, function(){
	console.log("Express is running on port " + process.env.PORT);
});