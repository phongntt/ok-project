export OKSP_PID_PATH='/home/ubuntu/workspace/node.js/apps/OK_sample_app/pid.txt'

kill `cat $OKSP_PID_PATH`

rm $OKSP_PID_PATH

echo '"Sample app" is stoped!'