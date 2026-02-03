import React, { useState, useCallback } from 'react';
import { Upload, Button, message, Modal, Input, Space } from 'antd';
import { UploadOutlined, CheckCircleTwoTone, CloseCircleTwoTone, DownloadOutlined } from '@ant-design/icons';
import { useFetchWrapper } from '_helpers';
import { Table } from 'antd';
import * as XLSX from 'xlsx';

export { UploadForm };


function UploadForm(props) {
  const [fileList, setFileList] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [modalTitle, setModalTitle] = useState("Đang upload");
  const [log, setLog] = useState("Đang upload\n");
  const [result, setResult] = useState({
    registered: [],
    failed: []
  });

  const fetchWrapper = useFetchWrapper();
  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
    window.location.reload();
  };

  // ============================================
  // DOWNLOAD SAMPLE TEMPLATE FUNCTION
  // ============================================
  const handleDownloadTemplate = useCallback(() => {
    // Get headers from columns (excluding 'error' column)
    const headers = (props.columns || [])
      .filter(col => col.dataIndex !== 'error')
      .map(col => col.title);

    if (headers.length === 0) {
      message.warning('Không có cột dữ liệu để tạo file mẫu');
      return;
    }

    // Create sample data based on the form type
    let sampleData = [];
    const dataIndexes = (props.columns || [])
      .filter(col => col.dataIndex !== 'error')
      .map(col => col.dataIndex);

    // Detect template type for context-aware sample (e.g. student vs lecturer email)
    const templateType = props.templateType || (props.formurl && props.formurl.includes('lecturer') ? 'lecturer' : (props.formurl && props.formurl.includes('users') ? 'student' : ''));

    // Generate 2 rows of sample data based on column types (TASK 3: Vietnamese headers + dob, phone, class_name)
    const generateSampleValue = (dataIndex, rowNum, templateKind) => {
      const kind = templateKind != null ? templateKind : templateType;
      const samples = {
        // ============================================
        // STUDENT FIELDS (Preferred Vietnamese sample file)
        // ============================================
        'vnu_id': ['SV001', 'SV002'],
        'student_code': ['SV001', 'SV002'],
        'name': ['Nguyễn Văn A', 'Trần Thị B'],
        'full_name': ['Nguyễn Văn A', 'Trần Thị B'],
        'date_of_birth': ['01/01/2000', '15/06/2001'],
        'dob': ['01/01/2000', '15/06/2001'],
        'phone_number': ['0987654321', '0123456789'],
        'phone': ['0987654321', '0123456789'],
        'parent_number': ['0813087990', '0912345678'],
        'address': ['Khu Trung Đoàn 918, Long Biên, Hà Nội', '123 Nguyễn Huệ, Q.1, TP.HCM'],
        'gender': ['Nam', 'Nữ'],
        'role': ['student', 'student'],
        'location': ['Hà Nội', 'TP. Hồ Chí Minh'],
        'class_name': ['CNTT-K62', 'CNTT-K63'],
        'username': ['nguyenvana', 'tranthib'],
        'password': ['123456', '123456'],
        'email': kind === 'lecturer' ? ['gv001@vnu.edu.vn', 'gv002@vnu.edu.vn'] : ['sv001@student.intern.local', 'sv002@student.intern.local'],
        
        // ============================================
        // LECTURER FIELDS (Giảng viên hướng dẫn)
        // ============================================
        'lecturer_id': ['GV001', 'GV002'],
        'department': ['Khoa CNTT', 'Viện Điện tử'],
        
        // ============================================
        // COMPANY FIELDS (Doanh nghiệp)
        // ============================================
        'company_name': ['FPT Software', 'Viettel Solutions'],
        'company_address': ['Tòa nhà FPT, Cầu Giấy, Hà Nội', '1 Trần Hữu Dực, Nam Từ Liêm, Hà Nội'],
        'company_email': ['hr@fpt.com.vn', 'tuyendung@viettel.com.vn'],
        'company_field': ['Công nghệ thông tin', 'Viễn thông & CNTT'],
        
        // ============================================
        // INTERNSHIP BATCH FIELDS (Đợt thực tập)
        // ============================================
        'batch_id': ['2025-HE', '2025-DONG'],
        'batch_name': ['Đợt Hè 2025', 'Đợt Đông 2025'],
        'start_date': ['01/06/2025', '01/12/2025'],
        'end_date': ['31/08/2025', '28/02/2026'],
        
        // ============================================
        // INTERNSHIP RESULT FIELDS (Kết quả thực tập)
        // ============================================
        'internship_score': [8.5, 9.0],
        'evaluation': ['Hoàn thành tốt nhiệm vụ', 'Xuất sắc, có khả năng làm việc độc lập'],
        
        // ============================================
        // STATUS FIELDS (Tình trạng)
        // ============================================
        'status': ['Đang thực tập', 'Hoàn thành'],
      };

      const key = dataIndex.toLowerCase();
      for (const [sampleKey, values] of Object.entries(samples)) {
        if (key === sampleKey.toLowerCase() || 
            key.includes(sampleKey.toLowerCase()) || 
            sampleKey.toLowerCase().includes(key)) {
          return values[rowNum - 1] || values[0];
        }
      }
      
      // Default fallback
      return `Mẫu ${rowNum}`;
    };

    // Create 2 sample rows
    for (let rowNum = 1; rowNum <= 2; rowNum++) {
      const row = {};
      dataIndexes.forEach((dataIndex, idx) => {
        row[headers[idx]] = generateSampleValue(dataIndex, rowNum);
      });
      sampleData.push(row);
    }

    // Create worksheet data (array of arrays)
    const wsData = [
      headers,
      ...sampleData.map(row => headers.map(h => row[h]))
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths for better readability
    const colWidths = headers.map(h => ({ wch: Math.max(h.length + 5, 20) }));
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Mẫu Import');

    // Generate filename based on templateType or form URL (reuse templateType from above)
    let filename = 'Mau_Import.xlsx';
    
    if (templateType) {
      const filenameMap = {
        'student': 'Mau_Import_SinhVien.xlsx',
        'lecturer': 'Mau_Import_GiangVien.xlsx',
        'company': 'Mau_Import_DoanhNghiep.xlsx',
        'batch': 'Mau_Import_DotThucTap.xlsx',
        'result': 'Mau_Import_KetQuaThucTap.xlsx',
        'status': 'Mau_Import_TrangThai.xlsx',
      };
      filename = filenameMap[templateType] || filename;
    } else if (props.formurl) {
      // Fallback to URL-based detection
      if (props.formurl.includes('dssv')) filename = 'Mau_Import_SinhVien.xlsx';
      else if (props.formurl.includes('lecturer')) filename = 'Mau_Import_GiangVien.xlsx';
      else if (props.formurl.includes('compan')) filename = 'Mau_Import_DoanhNghiep.xlsx';
      else if (props.formurl.includes('batch')) filename = 'Mau_Import_DotThucTap.xlsx';
      else if (props.formurl.includes('result')) filename = 'Mau_Import_KetQuaThucTap.xlsx';
      else if (props.formurl.includes('status')) filename = 'Mau_Import_TrangThai.xlsx';
    }

    // Trigger download
    XLSX.writeFile(wb, filename);
    message.success(`Đã tải xuống file mẫu: ${filename}`);
  }, [props.columns, props.formurl, props.templateType]);

  async function handleUpload(){
    console.log(fileList);
    showModal();
    setLog("Đã bắt đầu upload");
    if (fileList){
      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetchWrapper.post(props.formurl, null, formData);
        response.json().then(rawjson => { 
          if ("status" in rawjson) {
            if (rawjson.status === "Success"){
              setModalTitle("Upload thành công");
            } else (setModalTitle("Upload thất bại"));
            if ("registered" in rawjson.message) {
              setResult(rawjson.message);
            }
            setLog(log => {
              var newLog = log;
              var newRawJson = rawjson.message;
              newLog = JSON.stringify(newRawJson, null, 4);
              return newLog;
            });
            console.log(log);
          }
        });
      }    
    }
  };
const delError = (col) => {
  var abc = [...col]
  delete abc[col.length-1]
  return abc;
}
  const cprops = {
      // multiple:true,
      onRemove: file => {
        setFileList(fileList => {
          const index = fileList.indexOf(file);
          const newFileList = fileList.slice();
          newFileList.splice(index, 1);
          return newFileList;
        });
      },
      beforeUpload: file => {
        setFileList(fileList => ([...fileList, file]));
        return false;
      },
      fileList,
    };

    return (
      <div>
        <Modal title={modalTitle} visible={isModalVisible} onCancel={handleOk} footer={[]} style={{ height: 700 }} width={1000}>
          <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: '15px', display: 'inline-block', verticalAlign: 'middle' }}/> Dữ liệu thêm thành công: <b>{result.registered?.length || 0}</b>
          <br/>
          <CloseCircleTwoTone twoToneColor="#eb2f96" style={{ fontSize: '15px', display: 'inline-block', verticalAlign: 'middle' }}/> Dữ liệu thêm thất bại: <b>{result.failed?.length || 0}</b>
          <br/>
          <br/>
          <b>Thành công:</b>
          {props.columns && (
            <Table
              columns={delError(props.columns)}
              dataSource={(result.registered || []).map((r, i) => ({
                ...r,
                key: i,
                batch_id: r.batch_id ?? r.code,
                batch_name: r.batch_name ?? r.name,
              }))}
              rowKey={(r, i) => r.key ?? i}
            />
          )}
          
          <b>Thất bại:</b>
          {props.columns && <Table columns={props.columns} dataSource={result.failed || []} rowKey={(r, i) => i} />}
        </Modal>
        
        {/* Download Template Button */}
        <Button
          type="default"
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
          style={{ 
            marginBottom: 12,
            borderColor: '#52c41a',
            color: '#52c41a'
          }}
        >
          📥 Tải file mẫu
        </Button>
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Upload {...cprops}>
            <Button icon={<UploadOutlined />}>Chọn file</Button>
          </Upload>
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={fileList?.length === 0}
          >
            Tải lên
          </Button>
        </div>
      </div>
    );
  
}