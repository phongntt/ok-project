export IP='127.0.0.1'
export PORT=8080


# App config
export OK_ZK_HOST='127.0.0.1'
export OK_ZK_PORT='2181'
export OK_ZK_MAIN_CONF='/danko/conf'
export OK_ZK_APPNAME='headquater' ## For HeadQuater - Don't change this config
export OK_LOGFILE='./logs/danko.log'
export OK_PID_FILE='./pid.txt'

# For debug
export DEBUG=*
./node server.js