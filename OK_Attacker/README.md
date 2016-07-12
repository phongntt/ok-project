##Giới thiệu:
OK_Attacker là ứng dụng dùng để thực thi những lệnh cần thực hiện lên server đang chạy ứng dụng.
OK_Attacker sẽ nhận lệnh (Job) từ OK_HeadQuater cho những việc cần chạy.
Với mỗi Job cần chạy, OK_HeadQuater sẽ tạo 1 Node vào Queue nhận kệnh của OK_Attacker, tạm gọi là Job_Node.
(OK_Attacker chỉ chạy những Job_Node được tạo không quá một khoảng thời gian được cấu hình trước - NODE_OK_ATK_DUETIME)
OK_Attacker sau khi thực thi xong sẽ phản hồi thông tin bằng cách cập nhật Data của Job_Node.
Sau khi OK_HeadQuater nhận được thông tin sẽ remove Job_Node tương ứng.

##Quá trình chạy của ứng dụng Attacker:

###Sơ lược:
Để OK_Attcker có thể nhận được Job từ OK_HeadQuater, người dùng cần tạo 1 node lên ZK_Server như sau:
- Node name: /danko/attacker_info
Nội dung Node:
```YAML
-
  host: 192.168.72.66
  attacker_name: attacker_72.66
-
  host: 192.168.72.80
  attacker_name: attacker_72.80
```
OK_HeadQuater sẽ dựa vào thông tin định nghĩa này để ra lệnh cho OK_Attacker tại server phù hợp.
Khi gửi Job, OK_HeadQuater sẽ kiểm tra node nhận lệnh của OK_Attacker tương ứng có tồn tại hay không.
  Nếu node nhận lệnh không tồn tại tương ứng với việc OK_Attcker không hoạt động.

Khi OK_Attacker được chạyỨng dụng sẽ lặp đi lặp lại định kỳ thực hiện các công việc sau
1. Lấy thông Job cần chạy từ ZK
2. Chạy Job và lưu kết quả
3. Cập nhật kết quả lên ZK

###Chi tiết:

####Job:
Job cần được chạy bởi Attcker, được gửi vào ZK_Node bởi các ứng dụng khác
(thường là từ HeadQuater).
Mỗi Job là 1 ZK_Node và có tên như bên dưới:
Node name: <sequence>_<Job>_<yyyymmdd_hh24:mi:ss>

Mô tả:
<sequence>: số thứ tự Job - dùng để biết thứ tự cần chạy
<Job>: công việc cần thực hiện. VD: Start, Stop, Restart, ...
<yyyymmdd_hh24:mi:ss>: thời gian tạo Job. Job nào quá 15pp mà chưa có kết quả thì coi như bỏ qua.

####Kết quả chạy Job:
Kết quả sau khi chạy Job được Attcker gửi lên, được ghi thêm vào nội dung của Job_Node, cấu trúc như sau:
{
    result: "(OK/FAIL)",
    finish_time: "yyyymmdd_hh24:mi:ss",
    detail: {
        task1: "Thong tin ve task1",
        task2: "Thong tin ve task2",
        task3: "Thong tin ve task3"
    }
}
