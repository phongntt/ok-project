DONE
--------------------------------------------------------------------------------
* controller
  - DONE: Viet ham lay SERVER info tu ZK ---> luu vao runtime_config.server_app_info
    + runtime_config.server_app_info.data ---> luu du lieu
    + runtime_config.server_app_info.last_update_epoch ---> luu thoi gian cap nhat
      ---> Dung de kiem tra trong truong hop can load lai thong tin sau nay
  - DONE: Ham get_app_info: can chinh sua, neu lay khong duoc thong tin app 
     thi thu update 
     ---> Khi co update thi truyen command vao JOB_NODE: ALL__epoch__UPDATE_SERVER_INFO

  - DONE: Tao SAMPLE_APP de chay thu
  
  - DONE: Sau xem lai truong hop JOB_NODE khong co command thi ung dung co bi loi khong
  
  - DONE: Tao them node <ip>_run de luu JOB dang lam va lam roi
  
  - DONE: commnon_controller: run real shell command (check START and STOP)
  
  - Chinh sua
    + DONE: JOB NODE --> from epochTime__AppName__Command to AppName__epochTime__Command
    + DONE: Bo qua nhung JOB_NODE co phan dau khong phai la so
  
--------------------------------------------------------------------------------



Cần làm:
--------------------------------------------------------------------------------
* Using "debug" as a replacement for console.log

* controller
  - Scan and get JOB
    ---> create JOB-ing ---> delete JOB
    ---> DO_JOB
    ---> Create JOB-done with result ---> delete JOB-ing

================================================================================
  


Cai tien:
================================================================================
Xem xet viec OK_Attacker co the chay cung luc nhieu JOB cua nhieu app khac nhau
  - Ham "get_one_job" hien chi lay 1 JOB dua theo thoi gian tao
    ---> Can sua thanh lay moi app 1 job
    ---> Sau khi xong, can chinh ham "do_job" de ho tro chay cho nhieu app 1 luc

================================================================================




Ghi chu:
--------------------------------------------------------------------------------
* JOB Node ---> AppName__epochTime__Command
    TEST_TOMCAT_CTLR__1469354031__Command
  ---> Can sua thanh: epochTime__AppName__Command
  ---> Bo qua (khong xu ly) nhung JOB co PART1 (danh cho epoch) khong phai la so

* Attacker Node ---> /danko/attacker/192.168.8.111

* epoch example ---> 1469354011

* @runtime_config.job_to_run = {
    app_name: 'APP_NAME',
    created_epoch: epoch_time,
    command: "COMMAND",
    app: @app_info //xem ben duoi
}

* app_info = { 
    "name": 'TEST_TOMCAT_CTLR',
    "type": 'tomcat',
    "location": '/home/ubuntu/workspace/tomcat' }

* Job object to send to Controller is same as @runtime_config.job_to_run
{
    app_name: 'APP_NAME',
    created_epoch: epoch_time,
    command: "COMMAND",
    app: @app_info
}