## Giới thiệu:
**OK_Deployer** là ứng dụng dùng để thực thi những lệnh liên quan đến việc triển khai ứng dụng. **OK_Deployer** có thể được cài đặt thành 1 hoặc nhiều instances (trên nhiều máy khác nhau).  
**OK_Deployer** sẽ nhận lệnh (Job) từ **OK_HeadQuater** cho những việc cần chạy.
Với mỗi Job cần chạy, **OK_HeadQuater** sẽ tạo 1 Node vào Queue nhận kệnh của **OK_Deployer**, tạm gọi là Job_Node.
(**OK_Deployer** chỉ chạy những Job_Node được tạo không quá một khoảng thời gian được cấu hình trước - Environment Variable: NODE_OK_DPL_DUETIME)
Trong quá trình **OK_Deployer** thực hiện JOB, JOB sẽ được luân chuyển qua các Queue khác nhau tùy vào trạng thái của JOB (vd: đang thực hiện, thực hiện không thành công, thực hiện thành công).
**OK_HeadQuater** dựa vào những Queue kết quả để kiểm tra thông tin JOB có được hoàn thành hay không.

## Quá trình chạy của ứng dụng Deployer:

### Sơ lược:
Để **OK_Deployer** có thể nhận được Job từ **OK_HeadQuater**, người dùng cần tạo 1 node lên **ZK_Server** như sau:
- Node name: /danko/app_info
Nội dung Node:
```YAML
-
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
```
**OK_HeadQuater** sẽ dựa vào thông tin định nghĩa này để ra lệnh cho **OK_Deployer** triển khai ứng dụng tại server phù hợp. **OK_Deployer** cũng dựa vào những thông tin này để thực hiện các công việc liên quan đến triển khai.  

Khi **OK_Deployer** được start, nó sẽ tạo 1 node có tên ```/danko/deplyer/<deployer_name>``` để làm node nhận lệnh.  
Trong đó, ```<deployer_name>```: tên của **OK_Deployer** được cấu hình cho ứng dụng khi chạy (xem run.sh)

Tước khi gửi Job cho **OK_Deployer**, **OK_HeadQuater** sẽ kiểm tra node nhận lệnh của **OK_Deployer** tương ứng có tồn tại hay không.
  Nếu node nhận lệnh không tồn tại tương ứng với việc **OK_Deployer** không hoạt động.

Khi **OK_Deployer** được chạy, ứng dụng sẽ lặp đi lặp lại định kỳ thực hiện các công việc sau
1. Lấy thông Job cần chạy từ ZK
2. Chạy Job và lưu kết quả
3. Cập nhật kết quả lên ZK

### Chi tiết:

#### Job:
Job cần được chạy bởi **OK_Deployer**, được gửi vào **ZK_Node** bởi các ứng dụng khác (thường là từ **OK_HeadQuater**).
Mỗi Job là 1 **ZK_Node** và có tên như bên dưới:
Node name: ```DeployerName__epochRuntime```

Mô tả:
```<DeployerName>```: Tên của **OK_Deployer**
```<epochRuntime>```: thời gian cần chạy lệnh. Lưu ý: lệnh chỉ được thực thi khi ```<epochRuntime>``` <= sysdate và ```<epochRuntime>``` <= sysdate - dueTiem (Biến môi tr: NODE_OK_DPL_DUETIME)

#### Kết quả chạy Job:
(Bổ sung sau khi hoàn thành)

### Những biến môi trường cần khai báo:
(Bố sung sau khi hoàn thành)

### Những ZK_NODE mà ứng dụng tự động tạo
- ```/danko/deployer/<deployer_name>```
  - ```<deployer_name>```: tên của **OK_Deployer** được cấu hình cho ứng dụng khi chạy (xem run.sh)

### Những ZK_NODE mà ứng dụng cần để chạy nhưng không tự động tạo
- ```/danko/deployer/jobs```: **OK_HeadQuater** sẽ tạo
  - Đây là job_queue, chứa thông tin những JOB đang cần các Attacker thực hiện
- ```/danko/attacker/running_jobs```: **OK_HeadQuater** sẽ tạo
  - Đây là nơi chứa thông tin những JOB **đang** được **OK_Attacker** xử lý
- ```/danko/attacker/fail_jobs``` ---> **OK_HeadQuater** sẽ tạo
  - Đây là nơi chứa thông tin những JOB đã được xử lý nhưng bị FAIL
- ```/danko/attacker/success_jobs``` ---> **OK_HeadQuater** sẽ tạo
  - Đây là nơi chứa thông tin những JOB đã được thực hiện xong

## Cách viết worker

### Tổng quan:
(lưu ý: tham khảo Attacker)  

## Mã lỗi
(bổ sung sau)