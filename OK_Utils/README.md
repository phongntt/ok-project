#Thông tin
Thư mục này chứa những file utils dùng cho các project OK_*

#Cách sử dụng
Copy các file trong thư mục này vào thư mục "utils" của các dự án khác (OK_*)

#Error Notes

Code: 0001 - 0999 ---> Lỗi nghiêm trọng, ảnh huởng đến luồng xử lý của ứng dụng. Ứng dụng ngưng khi phát sinh những lỗi này.
  0001 - 0099 ---> Lỗi về luồng khởi tạo của ứng dụng
    0001 ---> Resever for a FATAL error at startup of the app (not used yet)
    0002 ---> Error when load local config
    0003 ---> Error when load config from ZK Server
    0004 ---> Error when create PID
  0100 - 0299 ---> Lỗi về luồng họat động của ứng dụng
  0300 - 0999 ---> Chưa dùng
  
Code: 1001 - 9998 ---> Lỗi ít nghiêm trọng. Ứng dụng có thể chạy tiếp tùy trường hợp
  1001 - 1099 ---> Lỗi trong quá trình giao tiếp với ZK
    1001 ---> Error when reading data from ZK_Node
    1002 ---> Error when writting data to ZK_Node
    1003 ---> Error when creating ZK_Node
    1004 ---> Error when deleting ZK_Node
    1005 ---> Error when geting child list of ZK_Node
  1200 - 1499 ---> Lỗi phát sinh trong quá trình họat động của ứng dụng (tùy ứng dụng)
  1500 - 1599 ---> Lỗi trong quá trình ngưng ứng dụng
    1500 ---> Error when delete Ephemeral node

Code: 9999 ---> Chưa xác định được mức độ nghiêm trọng khi phát sinh lỗi. VD: trường hợp lỗi phát sinh từ một vài hàm thông dụng (đọc/ghi file, tạo ZK_Node, ...).