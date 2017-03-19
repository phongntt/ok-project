#rm pid.txt stop.ok

# App config
export OK_ZK_HOST='127.0.0.1'
export OK_ZK_PORT='2181'
export OK_ZK_MAIN_CONF='/danko/conf'
export OK_ZK_APPNAME='Deployer_192.168.8.111'
export OK_LOGFILE='./logs/danko.log'
export OK_PID_FILE='./pid.txt'
export OK_STOP_COMMAND_FILE='./stop.ok'

# For Attacker
#---> chuyen thanh 'app_info_path' tren @config.main_conf_data
##export OK_ZK_APP_INFO='/danko/app_info'

#---> 4 cai ben duoi: chuyen thanh DATA tren /danko/attackers/[app_name]
##export NODE_HOST_IP='192.168.8.111' # this localhost IP
##export NODE_OKATK_SLEEP_SEC=20
##export NODE_OKATK_JOB_EXP_TIME=0
##export NODE_OKATK_INFO_EXP_TIME=0

# For debug
export DEBUG=* #for debug module (https://www.npmjs.com/package/debug)
./node OK_Deployer.js