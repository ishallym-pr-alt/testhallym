/**
 * 한림병원 직원용 포탈 Google Apps Script 백엔드 API (한글화 + 직원관리 연동 + 퇴사자 관리 및 엑셀 자동가입 버전)
 * 
 * [설정 방법]
 * 1. 연동할 Google Spreadsheet를 엽니다.
 * 2. **(안내)** 기존 시트 탭이 있더라도 삭제할 필요가 없습니다. (새 보안 관련 컬럼이 자동으로 추가됩니다.)
 * 3. 상단 메뉴에서 [확장 프로그램] -> [Apps Script]를 클릭합니다.
 * 4. 기존 코드를 모두 지우고 이 파일의 전체 내용을 복사해서 붙여넣습니다.
 * 5. 상단 세이브 아이콘(디스크 모양)을 눌러 저장합니다.
 * 6. 우측 상단 [배포] -> [배포 관리]를 클릭합니다.
 * 7. 우측 상단의 편집(연필 모양)을 누르고, 버전을 **[새 버전]**으로 지정하여 배포합니다.
 * 8. 이렇게 하면 웹 앱 URL은 그대로 유지되며, 스프레드시트에 새로운 한글 탭과 한글 헤더가 생성됩니다.
 */

function formatDateTime(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  var d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput);
  }
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1);
  if (mm.length < 2) mm = '0' + mm;
  var dd = String(d.getDate());
  if (dd.length < 2) dd = '0' + dd;
  var hh = String(d.getHours());
  if (hh.length < 2) hh = '0' + hh;
  var min = String(d.getMinutes());
  if (min.length < 2) min = '0' + min;
  var ss = String(d.getSeconds());
  if (ss.length < 2) ss = '0' + ss;
  return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min + ':' + ss;
}

// 데이터 탭(시트) 한글 이름 목록
var SHEETS = {
  notices: '공지사항',
  handovers: '인수인계',
  equipment: '의료장비',
  employees: '직원명부',
  schedules: '근무표',
  vacations: '연차신청',
  pushSubscriptions: '푸시구독',
  workplaces: '근무지목록',
  memos: '캘린더메모'
};

/**
 * 각 시트별 [영어 JSON 키 ➡️ 한글 열 헤더] 1:1 매핑 정보를 반환합니다.
 */
function getHeaderMap(sheetTitle) {
  var map = {};
  if (sheetTitle === SHEETS.notices) {
    map = {
      id: '고유ID',
      title: '제목',
      content: '내용',
      date: '등록일',
      author: '작성자',
      category: '카테고리',
      isImportant: '중요여부',
      comments: '댓글목록',
      likes: '좋아요목록',
      readBy: '읽은사람목록',
      targetDepartment: '대상부서'
    };
  } else if (sheetTitle === SHEETS.handovers) {
    map = {
      id: '고유ID',
      sender: '인수인계자',
      receiver: '인수자',
      content: '인수인계내용',
      date: '등록일',
      isSigned: '서명여부',
      signedEmpId: '서명자',
      signedAt: '서명시간',
      title: '제목',
      mainWorkplace: '주근무지',
      isApproved: '부서장승인여부',
      comments: '댓글목록',
      likes: '좋아요목록',
      readBy: '읽은사람목록'
    };
  } else if (sheetTitle === SHEETS.equipment) {
    map = {
      id: '순번',
      equipmentName: '장비명',
      title: '제목',
      content: '내용',
      reporter: '신고자',
      date: '신고일',
      endDate: '종료일',
      isApproved: '부서장확인여부',
      department: '부서',
      mainWorkplace: '주근무지',
      category: '카테고리',
      room: '검사실',
      status: '진행상태',
      confirmedUsers: '확인자목록',
      comments: '댓글목록',
      likes: '좋아요목록',
      readBy: '읽은사람목록',
      isMediInfoRegistered: '메디인포_작성여부'
    };
  } else if (sheetTitle === SHEETS.employees) {
    map = {
      no: '번호',
      empId: '사번',
      name: '이름',
      position: '직급',
      department: '부서',
      mainWorkplace: '주근무지',
      subWorkplace: '보조근무지',
      password: '비밀번호',
      isManager: '부서장여부',
      isRetired: '퇴사여부',
      attempts: '로그인실패횟수',
      lockUntil: '잠금만료일시',
      lockCount: '누적잠금횟수'
    };
  } else if (sheetTitle === SHEETS.schedules) {
    map = {
      year: '연도',
      month: '월',
      empId: '사번'
    };
    for (var d = 1; d <= 31; d++) {
      map['day_' + d + '_shift'] = d + '일_근무';
      map['day_' + d + '_support_am'] = d + '일_오전지원';
      map['day_' + d + '_support_pm'] = d + '일_오후지원';
    }
  } else if (sheetTitle === SHEETS.vacations) {
    map = {
      id: '고유ID',
      empId: '사번',
      name: '이름',
      department: '부서',
      mainWorkplace: '주근무지',
      subWorkplace: '보조근무지',
      vacationDate: '신청일자',
      vacationType: '연차구분',
      reason: '사유',
      status: '상태',
      createdAt: '신청일시',
      handoverEmpId: '인수자사번',
      approvedBy: '승인자목록'
    };
  } else if (sheetTitle === SHEETS.pushSubscriptions) {
    map = {
      empId: '사번',
      subscription: '구독정보'
    };
  } else if (sheetTitle === SHEETS.workplaces) {
    map = {
      id: '고유ID',
      name: '근무지명',
      floor: '층'
    };
  } else if (sheetTitle === SHEETS.memos) {
    map = { dateKey: '날짜', memoText: '메모내용', author: '작성자' };
  }
  return map;
}

/**
 * 각 시트별 [한글 열 헤더 ➡️ 영어 JSON 키] 역매핑 정보를 반환합니다.
 */
function getReverseHeaderMap(sheetTitle) {
  var map = getHeaderMap(sheetTitle);
  var revMap = {};
  for (var key in map) {
    revMap[map[key]] = key;
  }
  if (sheetTitle === SHEETS.notices) {
    revMap['카테고리'] = 'category';
    revMap['구분'] = 'category';
    revMap['층'] = 'category';
    revMap['주근무지'] = 'category';
  }
  return revMap;
}

/**
 * 탭을 가져오거나 없을 경우 기본 한글 헤더로 초기 탭을 만듭니다.
 */
function getSheet(sheetTitle) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetTitle);
  var map = getHeaderMap(sheetTitle);
  var keys = [];

  if (sheetTitle === SHEETS.notices) {
    keys = ['id', 'title', 'content', 'date', 'author', 'category', 'isImportant', 'comments', 'likes', 'readBy', 'targetDepartment'];
  } else if (sheetTitle === SHEETS.handovers) {
    keys = ['id', 'sender', 'receiver', 'content', 'date', 'isSigned', 'signedEmpId', 'signedAt', 'title', 'mainWorkplace', 'isApproved', 'comments', 'likes', 'readBy'];
  } else if (sheetTitle === SHEETS.equipment) {
    keys = ['id', 'equipmentName', 'title', 'content', 'reporter', 'date', 'endDate', 'isApproved', 'department', 'mainWorkplace', 'category', 'room', 'status', 'confirmedUsers', 'comments', 'likes', 'readBy', 'isMediInfoRegistered'];
  } else if (sheetTitle === SHEETS.employees) {
    keys = ['no', 'empId', 'name', 'position', 'department', 'mainWorkplace', 'subWorkplace', 'password', 'isManager', 'isRetired', 'attempts', 'lockUntil', 'lockCount'];
  } else if (sheetTitle === SHEETS.vacations) {
    keys = ['id', 'empId', 'name', 'department', 'mainWorkplace', 'subWorkplace', 'vacationDate', 'vacationType', 'reason', 'status', 'createdAt', 'handoverEmpId', 'approvedBy'];
  } else if (sheetTitle === SHEETS.pushSubscriptions) {
    keys = ['empId', 'subscription'];
  } else if (sheetTitle === SHEETS.workplaces) {
    keys = ['id', 'name', 'floor'];
  } else if (sheetTitle === SHEETS.memos) {
    keys = ['dateKey', 'memoText', 'author'];
  }

  if (!sheet) {
    sheet = ss.insertSheet(sheetTitle);
    var headers = [];
    if (sheetTitle === SHEETS.schedules) {
      headers = [map['year'], map['month'], map['empId']];
      for (var d = 1; d <= 31; d++) {
        headers.push(map['day_' + d + '_shift']);
        headers.push(map['day_' + d + '_support_am']);
        headers.push(map['day_' + d + '_support_pm']);
      }
    } else {
      headers = keys.map(function (k) { return map[k] || k; });
    }
    if (headers.length > 0) {
      sheet.appendRow(headers);
    }
  } else if (sheetTitle !== SHEETS.schedules && keys.length > 0) {
    // 누락된 헤더 자동 검사 및 추가
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var missingHeaders = [];
      for (var i = 0; i < keys.length; i++) {
        var expectedHeader = map[keys[i]] || keys[i];
        if (currentHeaders.indexOf(expectedHeader) === -1) {
          missingHeaders.push(expectedHeader);
        }
      }
      if (missingHeaders.length > 0) {
        var range = sheet.getRange(1, lastCol + 1, 1, missingHeaders.length);
        range.setValues([missingHeaders]);
      }
    }
  }
  return sheet;
}

/**
 * 1-based Row Index를 찾습니다. 없으면 -1 반환.
 */
function findRowIndex(sheet, idColName, valueToFind) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var sheetTitle = sheet.getName();
  var map = getHeaderMap(sheetTitle);
  var korColName = map[idColName] || idColName;
  var colIndex = headers.indexOf(korColName);
  if (colIndex === -1) return -1;

  var values = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(valueToFind)) {
      return i + 2; // Row index (1-based, headers at row 1)
    }
  }
  return -1;
}

/**
 * 특정 근무표 행의 Row Index를 찾습니다.
 */
function findScheduleRowIndex(sheet, year, month, empId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var sheetTitle = sheet.getName();
  var map = getHeaderMap(sheetTitle);

  var yearCol = headers.indexOf(map['year'] || 'year') + 1;
  var monthCol = headers.indexOf(map['month'] || 'month') + 1;
  var empCol = headers.indexOf(map['empId'] || 'empId') + 1;

  var yearVals = sheet.getRange(2, yearCol, lastRow - 1, 1).getValues();
  var monthVals = sheet.getRange(2, monthCol, lastRow - 1, 1).getValues();
  var empVals = sheet.getRange(2, empCol, lastRow - 1, 1).getValues();

  for (var i = 0; i < yearVals.length; i++) {
    if (Number(yearVals[i][0]) === Number(year) &&
      Number(monthVals[i][0]) === Number(month) &&
      String(empVals[i][0]) === String(empId)) {
      return i + 2;
    }
  }
  return -1;
}

/**
 * JSON 응답 생성 도우미
 */
function makeJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 푸시 구독 정보 전체 조회
 */
function getAllSubscriptions() {
  var sheet = getSheet(SHEETS.pushSubscriptions);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = getHeaderMap(SHEETS.pushSubscriptions);
  var subCol = headers.indexOf(map['subscription']) + 1;
  var empIdCol = headers.indexOf(map['empId']) + 1;

  if (subCol <= 0 || empIdCol <= 0) return [];

  var vals = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var subs = [];
  for (var i = 0; i < vals.length; i++) {
    var str = vals[i][subCol - 1];
    var eId = vals[i][empIdCol - 1];
    if (str) {
      try {
        subs.push({ empId: String(eId), sub: JSON.parse(str) });
      } catch (e) { }
    }
  }
  return subs;
}

function migrateAndInitializeWorkplaces() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Create or get '근무지목록'
  var workplacesSheet = getSheet(SHEETS.workplaces);
  var lastRow = workplacesSheet.getLastRow();

  // If it's empty (only headers), insert the 10 workplaces
  if (lastRow < 2) {
    var initialWorkplaces = [
      { id: 'immunology', name: '면역치료실', floor: '8F' },
      { id: 'ophthalmology', name: '안과검사실', floor: '4F' },
      { id: 'sleep', name: '수면다원검사실', floor: '4F' },
      { id: 'emg', name: '근전도실', floor: '1F' },
      { id: 'eeg', name: '뇌파검사실', floor: '3F' },
      { id: 'digestion', name: '소화기능검사실', floor: '2F' },
      { id: 'cardiac', name: '심장기능검사실', floor: '2F' },
      { id: 'echo', name: '심장초음파실', floor: '2F' },
      { id: 'respiratory', name: '호흡기능검사실', floor: '1F' },
      { id: 'hearing', name: '청력기능검사실', floor: 'B1' }
    ];

    for (var i = 0; i < initialWorkplaces.length; i++) {
      var w = initialWorkplaces[i];
      workplacesSheet.appendRow([w.id, w.name, w.floor]);
    }
  }

  // 2. Mapping definitions
  var mapping = {
    '면역': '면역치료실',
    '면역치료': '면역치료실',
    '8F 면역치료': '면역치료실',
    '안과': '안과검사실',
    '안과기능': '안과검사실',
    '4F 안과기능': '안과검사실',
    '수면': '수면다원검사실',
    '수면다원': '수면다원검사실',
    '4F 수면다원': '수면다원검사실',
    '근전도': '근전도실',
    '근전도실': '근전도실',
    '1F 근전도': '근전도실',
    '뇌파': '뇌파검사실',
    '뇌파검사': '뇌파검사실',
    '3F 뇌파': '뇌파검사실',
    '소화': '소화기능검사실',
    '소화기능': '소화기능검사실',
    '2F 소화기능': '소화기능검사실',
    '심기능': '심장기능검사실',
    '심장기능': '심장기능검사실',
    '2F 심장기능': '심장기능검사실',
    '심초': '심장초음파실',
    '심초음파': '심장초음파실',
    '2F 심장초음파': '심장초음파실',
    '호흡': '호흡기능검사실',
    '호흡기능': '호흡기능검사실',
    '1F 호흡기능': '호흡기능검사실',
    '청력': '청력기능검사실',
    '청력검사': '청력기능검사실',
    'B1 청력': '청력기능검사실'
  };

  // Helper function to migrate a column in a sheet
  var migrateColumn = function (sheetName, colName) {
    var sh = ss.getSheetByName(sheetName);
    if (!sh) return;
    var lastR = sh.getLastRow();
    if (lastR < 2) return;
    var lastC = sh.getLastColumn();
    var headers = sh.getRange(1, 1, 1, lastC).getValues()[0];

    var map = getHeaderMap(sheetName);
    var korCol = map[colName] || colName;
    var colIdx = headers.indexOf(korCol);
    if (colIdx === -1) return;

    var range = sh.getRange(2, colIdx + 1, lastR - 1, 1);
    var values = range.getValues();
    var changed = false;

    for (var r = 0; r < values.length; r++) {
      var val = String(values[r][0] || '').trim();
      if (mapping[val]) {
        values[r][0] = mapping[val];
        changed = true;
      }
    }

    if (changed) {
      range.setValues(values);
    }
  };

  // Migrate columns across sheets
  migrateColumn(SHEETS.employees, 'mainWorkplace');
  migrateColumn(SHEETS.handovers, 'department');
  migrateColumn(SHEETS.equipment, 'mainWorkplace');
  migrateColumn(SHEETS.vacations, 'mainWorkplace');
}

/**
 * GET 요청 핸들러 (조회)
 */
function doGet(e) {
  try {
    var action = e.parameter.action;
    if (!action) {
      return makeJsonResponse({ error: 'Action parameter is required.' });
    }

    if (action === 'getNotices') {
      var noticeSheet = getSheet(SHEETS.notices);
      var employeeSheet = getSheet(SHEETS.employees);

      var notices = readSheetData(noticeSheet);
      var employees = readSheetData(employeeSheet);

      var empMap = {};
      for (var i = 0; i < employees.length; i++) {
        var emp = employees[i];
        if (emp.name) {
          empMap[emp.name.trim()] = emp;
        }
      }

      for (var j = 0; j < notices.length; j++) {
        var notice = notices[j];
        if (notice.author) {
          var empInfo = empMap[notice.author.trim()];
          if (empInfo) {
            notice.author = empInfo.name || notice.author;
          }
        }
      }
      return makeJsonResponse(notices);
    }

    if (action === 'getHandovers') {
      var handoverSheet = getSheet(SHEETS.handovers);
      var employeeSheet = getSheet(SHEETS.employees);

      var handovers = readSheetData(handoverSheet);
      var employees = readSheetData(employeeSheet);

      var empMap = {};
      for (var i = 0; i < employees.length; i++) {
        var emp = employees[i];
        if (emp.name) {
          empMap[emp.name.trim()] = emp;
        }
      }

      for (var j = 0; j < handovers.length; j++) {
        var handover = handovers[j];
        if (handover.sender) {
          var senderInfo = empMap[handover.sender.trim()];
          if (senderInfo) {
            handover.department = senderInfo.mainWorkplace || ''; // department는 '주근무지'
            handover.sender = senderInfo.name || handover.sender;
          }
        }
        if (handover.receiver) {
          var receiverInfo = empMap[handover.receiver.trim()];
          if (receiverInfo) {
            handover.receiver = receiverInfo.name || handover.receiver;
          }
        }
        if (handover.signedEmpId) {
          var signerInfo = empMap[handover.signedEmpId.trim()];
          if (signerInfo) {
            handover.signedEmpId = signerInfo.name || handover.signedEmpId;
          }
        }
      }
      return makeJsonResponse(handovers);
    }

    if (action === 'getEquipment') {
      var sheet = getSheet(SHEETS.equipment);
      return makeJsonResponse(readSheetData(sheet));
    }

    if (action === 'getEmployees') {
      var sheet = getSheet(SHEETS.employees);
      return makeJsonResponse(readSheetData(sheet));
    }

    if (action === 'getSchedule') {
      var sheet = getSheet(SHEETS.schedules);
      var year = Number(e.parameter.year);
      var month = Number(e.parameter.month);
      var allData = readSheetData(sheet);

      // 필터링 적용
      if (!isNaN(year) && !isNaN(month)) {
        allData = allData.filter(function (row) {
          return Number(row.year) === year && Number(row.month) === month;
        });
      }
      return makeJsonResponse(allData);
    }

    if (action === 'getVacations') {
      var sheet = getSheet(SHEETS.vacations);
      return makeJsonResponse(readSheetData(sheet));
    }

    if (action === 'getSubscriptions') {
      return makeJsonResponse(getAllSubscriptions());
    }

    if (action === 'getWorkplaces') {
      var sheet = getSheet(SHEETS.workplaces);
      return makeJsonResponse(readSheetData(sheet));
    }

    if (action === 'getMemos') {
      var sheet = getSheet(SHEETS.memos);
      return makeJsonResponse(readSheetData(sheet));
    }

    if (action === 'migrate') {
      migrateAndInitializeWorkplaces();
      return makeJsonResponse({ success: true, message: 'Migration completed successfully.' });
    }

    return makeJsonResponse({ error: 'Unknown action: ' + action });
  } catch (error) {
    return makeJsonResponse({ error: error.toString(), stack: error.stack });
  }
}

/**
 * POST 요청 핸들러 (추가 / 수정 / 삭제)
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return makeJsonResponse({ error: 'Post body is empty.' });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (!action) {
      return makeJsonResponse({ error: 'Action is required in post body.' });
    }

    var data = payload.data || {};

    // 0. 로그인 검증
    if (action === 'login') {
      var sheet = getSheet(SHEETS.employees);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var lastRow = sheet.getLastRow();

      var empId = String(data.empId || '').trim();
      var password = String(data.password || '').trim();

      var map = getHeaderMap(SHEETS.employees);
      var empIdCol = headers.indexOf(map['empId']) + 1;
      var pwCol = headers.indexOf(map['password']) + 1;
      var retiredCol = headers.indexOf(map['isRetired']) + 1;
      var attemptsCol = headers.indexOf(map['attempts']) + 1;
      var lockUntilCol = headers.indexOf(map['lockUntil']) + 1;
      var lockCountCol = headers.indexOf(map['lockCount']) + 1;

      var rowIndex = -1;
      if (lastRow >= 2 && empIdCol > 0) {
        var empVals = sheet.getRange(2, empIdCol, lastRow - 1, 1).getValues();
        for (var i = 0; i < empVals.length; i++) {
          if (String(empVals[i][0]).trim() === empId) {
            rowIndex = i + 2;
            break;
          }
        }
      }

      if (rowIndex !== -1) {
        var currentPassword = String(sheet.getRange(rowIndex, pwCol).getValue() || '');
        var isRetired = retiredCol > 0 ? String(sheet.getRange(rowIndex, retiredCol).getValue()).toUpperCase() === 'TRUE' : false;
        var attempts = Number(sheet.getRange(rowIndex, attemptsCol).getValue()) || 0;

        var lockUntilVal = sheet.getRange(rowIndex, lockUntilCol).getValue();
        var lockUntil = 0;
        if (lockUntilVal) {
          var lockUntilDate = new Date(lockUntilVal);
          if (!isNaN(lockUntilDate.getTime())) {
            lockUntil = lockUntilDate.getTime();
          }
        }

        var lockCount = Number(sheet.getRange(rowIndex, lockCountCol).getValue()) || 0;

        // 1. 영구 차단 검증 (누적 잠금 횟수 >= 5)
        if (lockCount >= 5) {
          return makeJsonResponse({ success: false, error: '로그인 시도 횟수 초과로 계정이 잠겼습니다. 관리자에게 문의하세요.' });
        }

        // 2. 5분 잠금 검증
        var now = Date.now();
        if (lockUntil > 0 && now < lockUntil) {
          var minutesLeft = Math.ceil((lockUntil - now) / 60000);
          return makeJsonResponse({ success: false, error: '비밀번호 5회 오류로 인해 로그인이 제한됩니다. (남은 시간: 약 ' + minutesLeft + '분)' });
        }

        // 3. 비밀번호 일치 검증
        if (currentPassword === password) {
          if (isRetired) {
            return makeJsonResponse({ success: false, error: '퇴사 처리된 사번은 로그인할 수 없습니다.' });
          }

          // 로그인 성공 시 로그인 실패 및 잠금 정보 리셋
          if (attemptsCol > 0) sheet.getRange(rowIndex, attemptsCol).setValue(0);
          if (lockUntilCol > 0) sheet.getRange(rowIndex, lockUntilCol).setValue('');
          if (lockCountCol > 0) sheet.getRange(rowIndex, lockCountCol).setValue(0);

          // 직원의 모든 정보 반환
          var rowVals = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
          var revMap = getReverseHeaderMap(SHEETS.employees);
          var employeeObj = {};
          for (var j = 0; j < headers.length; j++) {
            var engKey = revMap[headers[j]] || headers[j];
            if (engKey === 'isManager' || engKey === 'isRetired') {
              employeeObj[engKey] = String(rowVals[j]).toUpperCase() === 'TRUE';
            } else {
              employeeObj[engKey] = rowVals[j];
            }
          }
          return makeJsonResponse({ success: true, employee: employeeObj });
        } else {
          // 비밀번호 불일치 시
          attempts += 1;
          if (attempts >= 5) {
            lockCount += 1;
            var newLockUntil = new Date(now + 5 * 60 * 1000); // 5분 뒤

            if (attemptsCol > 0) sheet.getRange(rowIndex, attemptsCol).setValue(0);
            if (lockUntilCol > 0) sheet.getRange(rowIndex, lockUntilCol).setValue(formatDateTime(newLockUntil));
            if (lockCountCol > 0) sheet.getRange(rowIndex, lockCountCol).setValue(lockCount);

            if (lockCount >= 5) {
              return makeJsonResponse({ success: false, error: '로그인 시도 횟수 초과로 계정이 잠겼습니다. 관리자에게 문의하세요.' });
            } else {
              return makeJsonResponse({ success: false, error: '비밀번호 5회 오류로 인해 5분간 로그인이 제한됩니다.' });
            }
          } else {
            if (attemptsCol > 0) sheet.getRange(rowIndex, attemptsCol).setValue(attempts);
            var remaining = 5 - attempts;
            return makeJsonResponse({ success: false, error: '사번 또는 비밀번호가 일치하지 않습니다. (남은 시도 횟수: ' + remaining + '회)' });
          }
        }
      }
      return makeJsonResponse({ success: false, error: '사번 또는 비밀번호가 일치하지 않습니다.' });
    }

    if (action === 'saveMemo') {
      var sheet = getSheet(SHEETS.memos);
      var rowIndex = findRowIndex(sheet, 'dateKey', data.dateKey);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.memos);
      var authorName = data.author || data.userName || '알 수 없음';

      if (rowIndex === -1) {
        if (data.memoText && data.memoText.trim() !== '') {
          var rowData = new Array(headers.length).fill('');
          rowData[headers.indexOf(map['dateKey'])] = data.dateKey;
          rowData[headers.indexOf(map['memoText'])] = data.memoText;
          if (headers.indexOf(map['author']) !== -1) {
            rowData[headers.indexOf(map['author'])] = authorName;
          }
          sheet.appendRow(rowData);
        }
      } else {
        if (!data.memoText || data.memoText.trim() === '') {
          sheet.deleteRow(rowIndex);
        } else {
          sheet.getRange(rowIndex, headers.indexOf(map['memoText']) + 1).setValue(data.memoText);
          if (headers.indexOf(map['author']) !== -1) {
            sheet.getRange(rowIndex, headers.indexOf(map['author']) + 1).setValue(authorName);
          }
        }
      }
      return makeJsonResponse({ success: true });
    }

    // 1. 공지사항 추가
    if (action === 'addNotice') {
      var sheet = getSheet(SHEETS.notices);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowData = new Array(headers.length).fill('');
      var map = getHeaderMap(SHEETS.notices);

      var empSheet = getSheet(SHEETS.employees);
      var employees = readSheetData(empSheet);
      var authorName = data.author || '';
      var mainWorkplace = data.floor || ''; // frontend passes floor as mainWorkplace

      // Find correct spelling and mainWorkplace from Employee Registry
      for (var i = 0; i < employees.length; i++) {
        if (employees[i].name && employees[i].name.trim() === authorName.trim()) {
          mainWorkplace = employees[i].mainWorkplace || mainWorkplace;
          authorName = employees[i].name || authorName;
          break;
        }
      }

      rowData[headers.indexOf(map['id'])] = String(data.id || Date.now());
      rowData[headers.indexOf(map['title'])] = data.title || '';
      rowData[headers.indexOf(map['content'])] = data.content || '';
      rowData[headers.indexOf(map['date'])] = data.date || formatDateTime(new Date());
      rowData[headers.indexOf(map['author'])] = authorName;

      // Handle category mapping with fallbacks
      var categoryHeaderName = map['category'] || '카테고리';
      var categoryColIndex = headers.indexOf(categoryHeaderName);
      if (categoryColIndex === -1) categoryColIndex = headers.indexOf('구분');
      if (categoryColIndex === -1) categoryColIndex = headers.indexOf('주근무지');
      if (categoryColIndex === -1) categoryColIndex = headers.indexOf('층');

      if (categoryColIndex !== -1) {
        rowData[categoryColIndex] = data.category || '기능검사팀 공지';
      }

      rowData[headers.indexOf(map['isImportant'])] = data.isImportant ? 'TRUE' : 'FALSE';
      rowData[headers.indexOf(map['comments'])] = JSON.stringify(data.comments || []);
      rowData[headers.indexOf(map['likes'])] = JSON.stringify(data.likes || []);
      if (headers.indexOf(map['targetDepartment']) !== -1) {
        rowData[headers.indexOf(map['targetDepartment'])] = data.targetDepartment || '';
      }

      sheet.appendRow(rowData);
      return makeJsonResponse({ success: true, id: rowData[headers.indexOf(map['id'])], subscriptions: getAllSubscriptions() });
    }

    // 1-b. 공지사항 수정
    if (action === 'editNotice') {
      var sheet = getSheet(SHEETS.notices);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Notice not found: ' + data.id });
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.notices);
      if (data.title !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['title']) + 1).setValue(data.title);
      if (data.content !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['content']) + 1).setValue(data.content);
      if (data.isImportant !== undefined) {
        sheet.getRange(rowIndex, headers.indexOf(map['isImportant']) + 1).setValue(data.isImportant ? 'TRUE' : 'FALSE');
      }
      if (data.comments !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['comments']) + 1).setValue(JSON.stringify(data.comments));
      if (data.likes !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['likes']) + 1).setValue(JSON.stringify(data.likes));
      if (data.targetDepartment !== undefined && headers.indexOf(map['targetDepartment']) !== -1) {
        sheet.getRange(rowIndex, headers.indexOf(map['targetDepartment']) + 1).setValue(data.targetDepartment);
      }

      // Update category if provided
      if (data.category !== undefined) {
        var categoryColIndex = headers.indexOf(map['category'] || '카테고리');
        if (categoryColIndex === -1) categoryColIndex = headers.indexOf('구분');
        if (categoryColIndex === -1) categoryColIndex = headers.indexOf('주근무지');
        if (categoryColIndex === -1) categoryColIndex = headers.indexOf('층');
        if (categoryColIndex !== -1) {
          sheet.getRange(rowIndex, categoryColIndex + 1).setValue(data.category);
        }
      }
      return makeJsonResponse({ success: true });
    }

    // 1-c. 공지사항 삭제
    if (action === 'deleteNotice') {
      var sheet = getSheet(SHEETS.notices);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Notice not found: ' + data.id });
      sheet.deleteRow(rowIndex);
      return makeJsonResponse({ success: true });
    }
    // 1-d. 읽음 처리 (공통)
    if (action === 'markAsRead') {
      var sheetName;
      if (data.category === 'notice') sheetName = SHEETS.notices;
      else if (data.category === 'handover') sheetName = SHEETS.handovers;
      else if (data.category === 'equipment') sheetName = SHEETS.equipment;
      else return makeJsonResponse({ error: 'Invalid category for markAsRead' });

      var sheet = getSheet(sheetName);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Item not found: ' + data.id });

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(sheetName);
      var readByColIndex = headers.indexOf(map['readBy']) + 1;

      if (readByColIndex > 0) {
        var currentReadByStr = String(sheet.getRange(rowIndex, readByColIndex).getValue() || '');
        var currentReadBy = currentReadByStr ? currentReadByStr.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [];
        if (currentReadBy.indexOf(data.userName) === -1) {
          currentReadBy.push(data.userName);
          sheet.getRange(rowIndex, readByColIndex).setValue(currentReadBy.join(', '));
        }
      }
      return makeJsonResponse({ success: true });
    }


    // 2. 인수인계 추가
    if (action === 'addHandover') {
      var sheet = getSheet(SHEETS.handovers);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowData = new Array(headers.length).fill('');
      var map = getHeaderMap(SHEETS.handovers);

      rowData[headers.indexOf(map['id'])] = String(data.id || Date.now());
      rowData[headers.indexOf(map['sender'])] = data.sender || '';
      rowData[headers.indexOf(map['receiver'])] = data.receiver || '';
      rowData[headers.indexOf(map['content'])] = data.content || '';
      rowData[headers.indexOf(map['date'])] = data.date || formatDateTime(new Date());
      rowData[headers.indexOf(map['isSigned'])] = 'FALSE';
      rowData[headers.indexOf(map['signedEmpId'])] = '';
      rowData[headers.indexOf(map['signedAt'])] = '';
      rowData[headers.indexOf(map['title'])] = data.title || '';
      rowData[headers.indexOf(map['mainWorkplace'])] = data.mainWorkplace || '';
      rowData[headers.indexOf(map['isApproved'])] = 'FALSE';
      rowData[headers.indexOf(map['comments'])] = JSON.stringify(data.comments || []);
      rowData[headers.indexOf(map['likes'])] = JSON.stringify(data.likes || []);

      sheet.appendRow(rowData);
      return makeJsonResponse({ success: true, id: rowData[headers.indexOf(map['id'])], subscriptions: getAllSubscriptions() });
    }

    // 2-b. 인수인계 수정(내용 변경용 — 서명 업데이트와는 별도)
    if (action === 'editHandover') {
      var sheet = getSheet(SHEETS.handovers);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Handover not found: ' + data.id });
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.handovers);
      if (data.title !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['title']) + 1).setValue(data.title);
      if (data.content !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['content']) + 1).setValue(data.content);
      if (data.comments !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['comments']) + 1).setValue(JSON.stringify(data.comments));
      if (data.likes !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['likes']) + 1).setValue(JSON.stringify(data.likes));
      return makeJsonResponse({ success: true });
    }

    // 2-c. 인수인계 삭제
    if (action === 'deleteHandover') {
      var sheet = getSheet(SHEETS.handovers);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Handover not found: ' + data.id });
      sheet.deleteRow(rowIndex);
      return makeJsonResponse({ success: true });
    }

    // 2-d. 인수인계 승인/취소
    if (action === 'approveHandover') {
      var sheet = getSheet(SHEETS.handovers);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Handover not found: ' + data.id });
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.handovers);
      sheet.getRange(rowIndex, headers.indexOf(map['isApproved']) + 1).setValue(data.isApproved || '');
      return makeJsonResponse({ success: true, subscriptions: getAllSubscriptions() });
    }

    // 3. 인수인계 서명 (수정)
    if (action === 'updateHandover') {
      var sheet = getSheet(SHEETS.handovers);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) {
        return makeJsonResponse({ error: 'Handover issue not found: ' + data.id });
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.handovers);
      sheet.getRange(rowIndex, headers.indexOf(map['isSigned']) + 1).setValue('TRUE');
      sheet.getRange(rowIndex, headers.indexOf(map['signedEmpId']) + 1).setValue(data.signedEmpId || '');
      sheet.getRange(rowIndex, headers.indexOf(map['signedAt']) + 1).setValue(data.signedAt || formatDateTime(new Date()));

      return makeJsonResponse({ success: true });
    }

    // 4. 의료장비 문제 추가
    if (action === 'addEquipment') {
      var sheet = getSheet(SHEETS.equipment);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowData = new Array(headers.length).fill('');
      var map = getHeaderMap(SHEETS.equipment);

      rowData[headers.indexOf(map['id'])] = String(data.id || Date.now());
      rowData[headers.indexOf(map['equipmentName'])] = data.equipmentName || '';
      rowData[headers.indexOf(map['title'])] = data.title || '';
      rowData[headers.indexOf(map['content'])] = data.content || '';
      rowData[headers.indexOf(map['reporter'])] = data.reporter || '';
      rowData[headers.indexOf(map['date'])] = data.date || formatDateTime(new Date());
      rowData[headers.indexOf(map['endDate'])] = data.endDate || '';
      rowData[headers.indexOf(map['isApproved'])] = data.isApproved ? 'TRUE' : 'FALSE';
      rowData[headers.indexOf(map['department'])] = data.department || '';
      rowData[headers.indexOf(map['mainWorkplace'])] = data.mainWorkplace || '';
      rowData[headers.indexOf(map['category'])] = data.category || '의료장비 고장';
      rowData[headers.indexOf(map['room'])] = data.room || '';
      rowData[headers.indexOf(map['status'])] = data.status || '신고됨';
      rowData[headers.indexOf(map['confirmedUsers'])] = JSON.stringify(data.confirmedUsers || [data.reporter || '사용자']);
      rowData[headers.indexOf(map['comments'])] = JSON.stringify(data.comments || []);
      if (headers.indexOf(map['isMediInfoRegistered']) !== -1) {
        rowData[headers.indexOf(map['isMediInfoRegistered'])] = data.isMediInfoRegistered ? 'TRUE' : 'FALSE';
      }

      sheet.appendRow(rowData);
      return makeJsonResponse({ success: true, id: rowData[headers.indexOf(map['id'])], subscriptions: getAllSubscriptions() });
    }

    // 4-b. 의료장비 수정
    if (action === 'editEquipment') {
      var sheet = getSheet(SHEETS.equipment);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Equipment not found: ' + data.id });
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.equipment);
      if (data.equipmentName !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['equipmentName']) + 1).setValue(data.equipmentName);
      if (data.title !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['title']) + 1).setValue(data.title);
      if (data.content !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['content']) + 1).setValue(data.content);
      if (data.date !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['date']) + 1).setValue(data.date);
      if (data.endDate !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['endDate']) + 1).setValue(data.endDate);
      if (data.department !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['department']) + 1).setValue(data.department);
      if (data.mainWorkplace !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['mainWorkplace']) + 1).setValue(data.mainWorkplace);
      if (data.category !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['category']) + 1).setValue(data.category);
      if (data.room !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['room']) + 1).setValue(data.room);
      if (data.status !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['status']) + 1).setValue(data.status);
      if (data.comments !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['comments']) + 1).setValue(JSON.stringify(data.comments));
      if (data.likes !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['likes']) + 1).setValue(JSON.stringify(data.likes));
      if (data.isMediInfoRegistered !== undefined && headers.indexOf(map['isMediInfoRegistered']) !== -1) {
        sheet.getRange(rowIndex, headers.indexOf(map['isMediInfoRegistered']) + 1).setValue(data.isMediInfoRegistered ? 'TRUE' : 'FALSE');
      }
      return makeJsonResponse({ success: true, subscriptions: getAllSubscriptions() });
    }

    // 4-c. 의료장비 삭제
    if (action === 'deleteEquipment') {
      var sheet = getSheet(SHEETS.equipment);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Equipment not found: ' + data.id });
      sheet.deleteRow(rowIndex);
      return makeJsonResponse({ success: true });
    }

    // 4-d. 의료장비 승인/취소
    if (action === 'approveEquipment') {
      var sheet = getSheet(SHEETS.equipment);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Equipment not found: ' + data.id });
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.equipment);
      sheet.getRange(rowIndex, headers.indexOf(map['isApproved']) + 1).setValue(data.isApproved ? 'TRUE' : 'FALSE');
      return makeJsonResponse({ success: true });
    }

    // 5. 의료장비 문제 업데이트
    if (action === 'updateEquipment') {
      var sheet = getSheet(SHEETS.equipment);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) {
        return makeJsonResponse({ error: 'Equipment issue not found: ' + data.id });
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.equipment);
      var updateAction = data.updateAction;

      if (updateAction === 'changeStatus') {
        sheet.getRange(rowIndex, headers.indexOf(map['status']) + 1).setValue(data.newStatus);
        if (data.endDate !== undefined) {
          sheet.getRange(rowIndex, headers.indexOf(map['endDate']) + 1).setValue(data.endDate);
        }
      } else if (updateAction === 'confirm') {
        var confCol = headers.indexOf(map['confirmedUsers']) + 1;
        var currentUsersStr = sheet.getRange(rowIndex, confCol).getValue() || '[]';
        var currentUsers;
        try {
          currentUsers = JSON.parse(currentUsersStr);
        } catch (e) {
          currentUsers = [];
        }
        if (!currentUsers.includes(data.userName)) {
          currentUsers.push(data.userName);
          sheet.getRange(rowIndex, confCol).setValue(JSON.stringify(currentUsers));
        }
      }

      return makeJsonResponse({ success: true });
    }

    // 6. 직원 추가
    if (action === 'addEmployee') {
      var sheet = getSheet(SHEETS.employees);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var lastRow = sheet.getLastRow();
      var map = getHeaderMap(SHEETS.employees);

      var maxNo = 0;
      if (lastRow >= 2) {
        var noCol = headers.indexOf(map['no']) + 1;
        var values = sheet.getRange(2, noCol, lastRow - 1, 1).getValues();
        for (var i = 0; i < values.length; i++) {
          var val = Number(values[i][0]) || 0;
          if (val > maxNo) maxNo = val;
        }
      }
      var newNo = maxNo + 1;

      var rowData = new Array(headers.length).fill('');
      rowData[headers.indexOf(map['no'])] = String(newNo);
      rowData[headers.indexOf(map['empId'])] = data.empId || '';
      rowData[headers.indexOf(map['name'])] = data.name || '';
      rowData[headers.indexOf(map['position'])] = data.position || '';
      rowData[headers.indexOf(map['department'])] = data.department || '';
      rowData[headers.indexOf(map['mainWorkplace'])] = data.mainWorkplace || '';
      rowData[headers.indexOf(map['subWorkplace'])] = data.subWorkplace || '';
      rowData[headers.indexOf(map['password'])] = data.password || '';
      rowData[headers.indexOf(map['isManager'])] = data.isManager ? 'TRUE' : 'FALSE';
      rowData[headers.indexOf(map['isRetired'])] = data.isRetired ? 'TRUE' : 'FALSE';

      sheet.appendRow(rowData);
      return makeJsonResponse({ success: true, no: newNo });
    }

    // 7. 직원 수정
    if (action === 'updateEmployee') {
      var sheet = getSheet(SHEETS.employees);
      var rowIndex = findRowIndex(sheet, 'empId', data.empId);
      if (rowIndex === -1) {
        return makeJsonResponse({ error: 'Employee not found: ' + data.empId });
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.employees);
      for (var key in data) {
        var colIdx = headers.indexOf(map[key] || key);
        if (colIdx !== -1 && key !== 'empId') {
          var val = data[key];
          if (key === 'isManager' || key === 'isRetired') {
            val = val ? 'TRUE' : 'FALSE';
          }
          sheet.getRange(rowIndex, colIdx + 1).setValue(String(val));
        }
      }
      return makeJsonResponse({ success: true });
    }

    // 8. 직원 삭제
    if (action === 'deleteEmployee') {
      var sheet = getSheet(SHEETS.employees);
      var rowIndex = findRowIndex(sheet, 'empId', data.empId);
      if (rowIndex === -1) {
        return makeJsonResponse({ error: 'Employee not found: ' + data.empId });
      }
      sheet.deleteRow(rowIndex);
      return makeJsonResponse({ success: true });
    }

    // 9. 월별 근무표 저장 (신규 사원 자동 가입 처리 탑재)
    if (action === 'saveSchedule') {
      var scheduleSheet = getSheet(SHEETS.schedules);
      var scheduleLastRow = scheduleSheet.getLastRow();
      var year = data.year;
      var month = data.month;
      var scheduleMap = getHeaderMap(SHEETS.schedules);

      var empSheet = getSheet(SHEETS.employees);
      var empHeaders = empSheet.getRange(1, 1, 1, empSheet.getLastColumn()).getValues()[0];
      var empMap = getHeaderMap(SHEETS.employees);
      var empIdColIdx = empHeaders.indexOf(empMap['empId']) + 1;

      var inputEmployees = data.employees || [];

      // 1. 신규 직원 발견 시 자동 가입 처리
      if (inputEmployees.length > 0 && empIdColIdx > 0) {
        var existingEmpIds = [];
        var empLastRow = empSheet.getLastRow();
        if (empLastRow >= 2) {
          var empIdVals = empSheet.getRange(2, empIdColIdx, empLastRow - 1, 1).getValues();
          existingEmpIds = empIdVals.map(function (v) { return String(v[0]).trim(); });
        }

        for (var i = 0; i < inputEmployees.length; i++) {
          var inputEmp = inputEmployees[i];
          var inputEmpId = String(inputEmp.empId).trim();
          if (inputEmpId && !existingEmpIds.includes(inputEmpId)) {
            // 없는 사번인 경우 자동 가입 처리
            var empMaxNo = 0;
            var currentLastRow = empSheet.getLastRow();
            if (currentLastRow >= 2) {
              var noColIdx = empHeaders.indexOf(empMap['no']) + 1;
              var noVals = empSheet.getRange(2, noColIdx, currentLastRow - 1, 1).getValues();
              for (var j = 0; j < noVals.length; j++) {
                var v = Number(noVals[j][0]) || 0;
                if (v > empMaxNo) empMaxNo = v;
              }
            }
            var newNo = empMaxNo + 1;

            var newEmpRow = new Array(empHeaders.length).fill('');
            newEmpRow[empHeaders.indexOf(empMap['no'])] = String(newNo);
            newEmpRow[empHeaders.indexOf(empMap['empId'])] = inputEmpId;
            newEmpRow[empHeaders.indexOf(empMap['name'])] = inputEmp.name || '';
            newEmpRow[empHeaders.indexOf(empMap['position'])] = inputEmp.position || '사원';
            newEmpRow[empHeaders.indexOf(empMap['department'])] = inputEmp.department || '';
            newEmpRow[empHeaders.indexOf(empMap['mainWorkplace'])] = inputEmp.department || '';
            newEmpRow[empHeaders.indexOf(empMap['subWorkplace'])] = '';
            newEmpRow[empHeaders.indexOf(empMap['password'])] = '1234'; // 초기 비밀번호는 1234 설정
            newEmpRow[empHeaders.indexOf(empMap['isManager'])] = 'FALSE';
            newEmpRow[empHeaders.indexOf(empMap['isRetired'])] = 'FALSE';

            empSheet.appendRow(newEmpRow);
            existingEmpIds.push(inputEmpId);
          }
        }
      }

      // 2. 기존 해당 연/월 및 입력된 사원들의 데이터만 제거하여 타 부서 데이터 보호
      if (scheduleLastRow >= 2) {
        var scheduleHeaders = scheduleSheet.getRange(1, 1, 1, scheduleSheet.getLastColumn()).getValues()[0];
        var yearCol = scheduleHeaders.indexOf(scheduleMap['year']) + 1;
        var monthCol = scheduleHeaders.indexOf(scheduleMap['month']) + 1;
        var empIdCol = scheduleHeaders.indexOf(scheduleMap['empId']) + 1;

        var yearVals = scheduleSheet.getRange(2, yearCol, scheduleLastRow - 1, 1).getValues();
        var monthVals = scheduleSheet.getRange(2, monthCol, scheduleLastRow - 1, 1).getValues();
        var empIdVals = scheduleSheet.getRange(2, empIdCol, scheduleLastRow - 1, 1).getValues();

        var inputEmpIds = inputEmployees.map(function (e) { return String(e.empId).trim(); });

        // 역순 제거로 인덱스 꼬임 방지
        for (var i = yearVals.length - 1; i >= 0; i--) {
          var y = Number(yearVals[i][0]);
          var m = Number(monthVals[i][0]);
          var id = String(empIdVals[i][0]).trim();
          if (y === Number(year) && m === Number(month) && inputEmpIds.indexOf(id) !== -1) {
            scheduleSheet.deleteRow(i + 2);
          }
        }
      }

      var shifts = data.shifts || {};
      var supports = data.supports || {};

      if (inputEmployees.length > 0) {
        var scheduleHeaders = scheduleSheet.getRange(1, 1, 1, scheduleSheet.getLastColumn()).getValues()[0];
        var colCount = scheduleHeaders.length;

        var values = [];
        for (var i = 0; i < inputEmployees.length; i++) {
          var emp = inputEmployees[i];
          var rowData = new Array(colCount).fill('');

          rowData[scheduleHeaders.indexOf(scheduleMap['year'])] = String(year);
          rowData[scheduleHeaders.indexOf(scheduleMap['month'])] = String(month);
          rowData[scheduleHeaders.indexOf(scheduleMap['empId'])] = emp.empId;

          for (var d = 1; d <= 31; d++) {
            var shiftVal = (shifts[emp.empId] && shifts[emp.empId][d]) || '';
            rowData[scheduleHeaders.indexOf(scheduleMap['day_' + d + '_shift'])] = shiftVal;

            var amVal = (supports[emp.empId] && supports[emp.empId][d] && supports[emp.empId][d].am) ? JSON.stringify(supports[emp.empId][d].am) : '';
            var pmVal = (supports[emp.empId] && supports[emp.empId][d] && supports[emp.empId][d].pm) ? JSON.stringify(supports[emp.empId][d].pm) : '';

            rowData[scheduleHeaders.indexOf(scheduleMap['day_' + d + '_support_am'])] = amVal;
            rowData[scheduleHeaders.indexOf(scheduleMap['day_' + d + '_support_pm'])] = pmVal;
          }
          values.push(rowData);
        }

        var nextRow = scheduleSheet.getLastRow() + 1;
        scheduleSheet.getRange(nextRow, 1, values.length, colCount).setValues(values);
      }

      // 3. 연차 자동 스캔 및 승인 등록 (엑셀 업로드 시에만)
      var vacSheet = getSheet(SHEETS.vacations);
      var vacHeaders = vacSheet.getRange(1, 1, 1, vacSheet.getLastColumn()).getValues()[0];
      var vacMap = getHeaderMap(SHEETS.vacations);
      var vacLastRow = vacSheet.getLastRow();

      // 1. 기존 엑셀 업로드 연차 싹 지우기 (초기화)
      if (vacLastRow >= 2) {
        var dateCol = vacHeaders.indexOf(vacMap['vacationDate']) + 1;
        var reasonCol = vacHeaders.indexOf(vacMap['reason']) + 1;
        if (dateCol > 0 && reasonCol > 0) {
          var dVals = vacSheet.getRange(2, dateCol, vacLastRow - 1, 1).getValues();
          var rVals = vacSheet.getRange(2, reasonCol, vacLastRow - 1, 1).getValues();
          var targetPrefix = year + '-' + String(month).padStart(2, '0');

          for (var v = dVals.length - 1; v >= 0; v--) {
            var vacDate = dVals[v][0];
            var reason = String(rVals[v][0]).trim();
            var vacDateStr = '';
            if (vacDate instanceof Date) {
              vacDateStr = vacDate.getFullYear() + '-' + String(vacDate.getMonth() + 1).padStart(2, '0');
            } else {
              vacDateStr = String(vacDate).trim();
            }

            if (vacDateStr.startsWith(targetPrefix) && reason === '엑셀 업로드 자동 승인') {
              vacSheet.deleteRow(v + 2);
            }
          }
        }
      }

      // 2. 새로운 연차 삽입 (existingVacations 체크 생략)
      var newVacations = [];
      for (var i = 0; i < inputEmployees.length; i++) {
        var emp = inputEmployees[i];
        for (var d = 1; d <= 31; d++) {
          var shiftVal = (shifts[emp.empId] && shifts[emp.empId][d]) || '';
          shiftVal = shiftVal.toString().trim();

          if (shiftVal === '연차' || shiftVal === '반차' || shiftVal === '오전반차' || shiftVal === '오후반차' || shiftVal === '토요일 오전 MO' || shiftVal === '토요일 오후 MO' || shiftVal === '대체 오전 HO' || shiftVal === '대체 오후 HO') {
            var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var vacType = shiftVal;
            if (shiftVal === '연차') vacType = '종일연차';
            else if (shiftVal === '반차') vacType = '오전반차';

            var rowData = new Array(vacHeaders.length).fill('');
            rowData[vacHeaders.indexOf(vacMap['id'])] = String(Date.now() + Math.floor(Math.random() * 10000) + d);
            rowData[vacHeaders.indexOf(vacMap['empId'])] = emp.empId;
            rowData[vacHeaders.indexOf(vacMap['name'])] = emp.name || '';
            rowData[vacHeaders.indexOf(vacMap['department'])] = emp.department || '';
            rowData[vacHeaders.indexOf(vacMap['mainWorkplace'])] = emp.mainWorkplace || emp.department || '';
            rowData[vacHeaders.indexOf(vacMap['subWorkplace'])] = emp.subWorkplace || '';
            rowData[vacHeaders.indexOf(vacMap['vacationDate'])] = dateStr;
            rowData[vacHeaders.indexOf(vacMap['vacationType'])] = vacType;
            rowData[vacHeaders.indexOf(vacMap['reason'])] = '엑셀 업로드 자동 승인';
            rowData[vacHeaders.indexOf(vacMap['status'])] = '승인'; // 엑셀 업로드 시에만 자동 승인 처리
            rowData[vacHeaders.indexOf(vacMap['createdAt'])] = formatDateTime(new Date());

            newVacations.push(rowData);
          }
        }
      }

      if (newVacations.length > 0) {
        var startRow = vacSheet.getLastRow() + 1;
        vacSheet.getRange(startRow, 1, newVacations.length, vacHeaders.length).setValues(newVacations);
      }

      return makeJsonResponse({ success: true, subscriptions: getAllSubscriptions() });
    }

    // 10. 단일 근무표 수정
    if (action === 'updateSchedule') {
      var sheet = getSheet(SHEETS.schedules);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var year = data.year;
      var month = data.month;
      var empId = data.empId;
      var map = getHeaderMap(SHEETS.schedules);

      var rowIndex = findScheduleRowIndex(sheet, year, month, empId);
      if (rowIndex === -1) {
        // 없다면 행 추가
        var rowData = new Array(headers.length).fill('');
        rowData[headers.indexOf(map['year'])] = String(year);
        rowData[headers.indexOf(map['month'])] = String(month);
        rowData[headers.indexOf(map['empId'])] = empId;
        sheet.appendRow(rowData);
        rowIndex = sheet.getLastRow();
      }

      var updateAction = data.updateAction;
      if (updateAction === 'updateShift') {
        var day = data.day;
        var shiftCode = data.shiftCode;
        var colIndex = headers.indexOf(map['day_' + day + '_shift']) + 1;
        sheet.getRange(rowIndex, colIndex).setValue(shiftCode || '');
      } else if (updateAction === 'updateSupport') {
        var day = data.day;
        var am = data.am;
        var pm = data.pm;
        if (am !== undefined) {
          var colIndex = headers.indexOf(map['day_' + day + '_support_am']) + 1;
          sheet.getRange(rowIndex, colIndex).setValue(am ? JSON.stringify(am) : '');
        }
        if (pm !== undefined) {
          var colIndex = headers.indexOf(map['day_' + day + '_support_pm']) + 1;
          sheet.getRange(rowIndex, colIndex).setValue(pm ? JSON.stringify(pm) : '');
        }
      }

      return makeJsonResponse({ success: true });
    }

    // 11. 연차 신청 추가
    if (action === 'addVacation') {
      var sheet = getSheet(SHEETS.vacations);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rowData = new Array(headers.length).fill('');
      var map = getHeaderMap(SHEETS.vacations);

      rowData[headers.indexOf(map['id'])] = String(data.id || Date.now());
      rowData[headers.indexOf(map['empId'])] = data.empId || '';
      rowData[headers.indexOf(map['name'])] = data.name || '';
      rowData[headers.indexOf(map['department'])] = data.department || '';
      rowData[headers.indexOf(map['mainWorkplace'])] = data.mainWorkplace || '';
      rowData[headers.indexOf(map['subWorkplace'])] = data.subWorkplace || '';
      rowData[headers.indexOf(map['vacationDate'])] = data.vacationDate || '';
      rowData[headers.indexOf(map['vacationType'])] = data.vacationType || '종일연차';
      rowData[headers.indexOf(map['reason'])] = data.reason || '';
      rowData[headers.indexOf(map['status'])] = '대기';
      rowData[headers.indexOf(map['createdAt'])] = data.createdAt || formatDateTime(new Date());
      rowData[headers.indexOf(map['handoverEmpId'])] = data.handoverEmpId || '';

      sheet.appendRow(rowData);
      return makeJsonResponse({ success: true, id: rowData[headers.indexOf(map['id'])] });
    }

    // 11-b. 연차 수정
    if (action === 'editVacation') {
      var sheet = getSheet(SHEETS.vacations);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Vacation not found: ' + data.id });
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.vacations);

      var oldStatus = sheet.getRange(rowIndex, headers.indexOf(map['status']) + 1).getValue();
      if (oldStatus === '승인') {
        syncVacationSupportToSchedule(rowIndex, '대기'); // 일단 롤백
      }

      if (data.vacationDate !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['vacationDate']) + 1).setValue(data.vacationDate);
      if (data.vacationType !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['vacationType']) + 1).setValue(data.vacationType);
      if (data.reason !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['reason']) + 1).setValue(data.reason);
      if (data.handoverEmpId !== undefined) sheet.getRange(rowIndex, headers.indexOf(map['handoverEmpId']) + 1).setValue(data.handoverEmpId);

      if (oldStatus === '승인') {
        syncVacationSupportToSchedule(rowIndex, '승인'); // 다시 세팅
      }
      return makeJsonResponse({ success: true });
    }

    // 11-c. 연차 삭제
    if (action === 'deleteVacation') {
      var sheet = getSheet(SHEETS.vacations);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Vacation not found: ' + data.id });

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.vacations);
      var oldStatus = sheet.getRange(rowIndex, headers.indexOf(map['status']) + 1).getValue();

      if (oldStatus === '승인') {
        // 인수자 supports 제거
        syncVacationSupportToSchedule(rowIndex, '삭제');

        // 인계자 shift 코드 제거
        var empId = sheet.getRange(rowIndex, headers.indexOf(map['empId']) + 1).getValue();
        var vacDateStr = sheet.getRange(rowIndex, headers.indexOf(map['vacationDate']) + 1).getValue();
        var vacParts = String(vacDateStr).split('-');
        if (vacParts.length === 3) {
          var year = Number(vacParts[0]);
          var month = Number(vacParts[1]);
          var day = Number(vacParts[2]);

          var schedSheet = getSheet(SHEETS.schedules);
          var schedHeaders = schedSheet.getRange(1, 1, 1, schedSheet.getLastColumn()).getValues()[0];
          var schedMap = getHeaderMap(SHEETS.schedules);
          var schedRowIndex = findScheduleRowIndex(schedSheet, year, month, empId);
          if (schedRowIndex !== -1) {
            var colIndex = schedHeaders.indexOf(schedMap['day_' + day + '_shift']) + 1;
            schedSheet.getRange(schedRowIndex, colIndex).setValue('');
          }
        }
      }

      sheet.deleteRow(rowIndex);
      return makeJsonResponse({ success: true });
    }

    // 12. 연차 승인/반려 상태 업데이트
    if (action === 'updateVacationStatus') {
      var sheet = getSheet(SHEETS.vacations);
      var rowIndex = findRowIndex(sheet, 'id', data.id);
      if (rowIndex === -1) return makeJsonResponse({ error: 'Vacation request not found' });

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.vacations);
      var oldStatus = sheet.getRange(rowIndex, headers.indexOf(map['status']) + 1).getValue();

      var appByCol = headers.indexOf(map['approvedBy']) + 1;
      var oldApprovedByStr = appByCol > 0 ? String(sheet.getRange(rowIndex, appByCol).getValue() || '') : '';
      var approvedByList = oldApprovedByStr ? oldApprovedByStr.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [];

      var userName = data.userName;
      var reqStatus = data.status; // '승인', '반려', '대기', '승인취소'
      var newStatus = oldStatus;

      // 현재 부서장 목록 전체 가져오기
      var empSheet = getSheet(SHEETS.employees);
      var empData = readSheetData(empSheet);
      var activeManagers = empData.filter(function (e) { return e.isManager && !e.isRetired; });
      var managerNames = activeManagers.map(function (m) { return m.name.trim(); });

      if (reqStatus === '승인') {
        if (userName && approvedByList.indexOf(userName) === -1) approvedByList.push(userName);
        var allApproved = true;
        for (var i = 0; i < managerNames.length; i++) {
          if (approvedByList.indexOf(managerNames[i]) === -1) { allApproved = false; break; }
        }
        newStatus = allApproved ? '승인' : '대기';
      } else if (reqStatus === '승인취소') {
        if (userName) {
          var idx = approvedByList.indexOf(userName);
          if (idx !== -1) approvedByList.splice(idx, 1);
        }
        newStatus = '대기';
      } else if (reqStatus === '대기') {
        approvedByList = []; // 되돌리기 시 완전 초기화
        newStatus = '대기';
      } else if (reqStatus === '반려') {
        newStatus = '반려';
      }

      // 롤백 (승인 -> 대기/반려)
      if (oldStatus === '승인' && newStatus !== '승인') {
        syncVacationSupportToSchedule(rowIndex, '대기');
        var empId = sheet.getRange(rowIndex, headers.indexOf(map['empId']) + 1).getValue();
        var vacDateStr = sheet.getRange(rowIndex, headers.indexOf(map['vacationDate']) + 1).getValue();
        var vacParts = String(vacDateStr).split('-');
        if (vacParts.length === 3) {
          var schedSheet = getSheet(SHEETS.schedules);
          var schedHeaders = schedSheet.getRange(1, 1, 1, schedSheet.getLastColumn()).getValues()[0];
          var schedMap = getHeaderMap(SHEETS.schedules);
          var schedRowIndex = findScheduleRowIndex(schedSheet, Number(vacParts[0]), Number(vacParts[1]), empId);
          if (schedRowIndex !== -1) {
            schedSheet.getRange(schedRowIndex, schedHeaders.indexOf(schedMap['day_' + Number(vacParts[2]) + '_shift']) + 1).setValue('');
          }
        }
      }

      sheet.getRange(rowIndex, headers.indexOf(map['status']) + 1).setValue(newStatus);
      if (appByCol > 0) sheet.getRange(rowIndex, appByCol).setValue(approvedByList.join(', '));

      // 최종 승인 연동 (대기 -> 승인)
      if (oldStatus !== '승인' && newStatus === '승인') {
        var empId = sheet.getRange(rowIndex, headers.indexOf(map['empId']) + 1).getValue();
        var vacDateStr = sheet.getRange(rowIndex, headers.indexOf(map['vacationDate']) + 1).getValue();
        var vacType = sheet.getRange(rowIndex, headers.indexOf(map['vacationType']) + 1).getValue();
        var vacParts = String(vacDateStr).split('-');
        if (vacParts.length === 3) {
          var day = Number(vacParts[2]);
          var schedSheet = getSheet(SHEETS.schedules);
          var schedHeaders = schedSheet.getRange(1, 1, 1, schedSheet.getLastColumn()).getValues()[0];
          var schedMap = getHeaderMap(SHEETS.schedules);
          var schedRowIndex = findScheduleRowIndex(schedSheet, Number(vacParts[0]), Number(vacParts[1]), empId);

          if (schedRowIndex === -1) {
            var schedRowData = new Array(schedHeaders.length).fill('');
            schedRowData[schedHeaders.indexOf(schedMap['year'])] = String(Number(vacParts[0]));
            schedRowData[schedHeaders.indexOf(schedMap['month'])] = String(Number(vacParts[1]));
            schedRowData[schedHeaders.indexOf(schedMap['empId'])] = empId;
            schedSheet.appendRow(schedRowData);
            schedRowIndex = schedSheet.getLastRow();
          }
          var shiftCode = '연차';
          if (vacType === '종일연차') shiftCode = '연차';
          else if (vacType === '오전반차' || vacType === '오후반차') shiftCode = '반차';
          else if (vacType === '토요일 오전 MO' || vacType === '토요일 오후 MO') shiftCode = 'MO';
          else if (vacType === '대체 오전 HO' || vacType === '대체 오후 HO') shiftCode = 'HO';

          schedSheet.getRange(schedRowIndex, schedHeaders.indexOf(schedMap['day_' + day + '_shift']) + 1).setValue(shiftCode);
        }
        syncVacationSupportToSchedule(rowIndex, '승인');
      }

      return makeJsonResponse({ success: true });
    }

    // 13. 웹 푸시 구독 저장
    if (action === 'saveSubscription') {
      var sheet = getSheet(SHEETS.pushSubscriptions);
      var rowIndex = findRowIndex(sheet, 'empId', data.empId);
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var map = getHeaderMap(SHEETS.pushSubscriptions);

      var subscriptionStr = JSON.stringify(data.subscription || {});

      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, headers.indexOf(map['subscription']) + 1).setValue(subscriptionStr);
      } else {
        var rowData = new Array(headers.length).fill('');
        rowData[headers.indexOf(map['empId'])] = String(data.empId);
        rowData[headers.indexOf(map['subscription'])] = subscriptionStr;
        sheet.appendRow(rowData);
      }
      return makeJsonResponse({ success: true });
    }

    return makeJsonResponse({ error: 'Unknown action: ' + action });
  } catch (error) {
    return makeJsonResponse({ error: error.toString(), stack: error.stack });
  }
}

/**
 * 시트 데이터를 JSON 객체 배열로 변환 (한글 헤더 ➡️ 영어 JSON 키 변환 처리)
 */
function readSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var lastCol = sheet.getLastColumn();

  var sheetTitle = sheet.getName();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var revMap = getReverseHeaderMap(sheetTitle);
  var data = [];

  for (var i = 0; i < values.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerVal = headers[j];
      var engKey = revMap[headerVal] || headerVal; // 한글 헤더를 영어 JSON 키로 번역

      var value = values[i][j];
      if (engKey === 'isManager' || engKey === 'isRetired') {
        value = String(value).toUpperCase() === 'TRUE';
      }

      rowObj[engKey] = value;
    }
    data.push(rowObj);
  }
  return data;
}

/**
 * 근무지 풀네임을 단축명(예: '면역', '안과')으로 변환합니다.
 */
function getShortWorkplace(full) {
  if (!full) return '';
  var map = {
    '면역치료실': '면역', '면역치료': '면역', '8F 면역치료': '면역',
    '안과검사실': '안과', '안과기능': '안과', '4F 안과기능': '안과',
    '수면다원검사실': '수면', '수면다원': '수면', '4F 수면다원': '수면',
    '근전도실': '근전도', '1F 근전도': '근전도',
    '뇌파검사실': '뇌파', '뇌파검사': '뇌파', '3F 뇌파': '뇌파',
    '소화기능검사실': '소화', '소화기능': '소화', '2F 소화기능': '소화',
    '심장기능검사실': '심기능', '심장기능': '심기능', '2F 심장기능': '심기능',
    '심장초음파실': '심초', '심장초음파': '심초', '2F 심장초음파': '심초',
    '호흡기능검사실': '호흡', '호흡기능': '호흡', '1F 호흡기능': '호흡',
    '청력기능검사실': '청력', '청력검사': '청력', 'B1 청력': '청력'
  };
  return map[full] || full;
}

/**
 * 연차 승인/취소/반려 시 인수자(대타)의 supports(근무지 지원) 정보를 동기화합니다.
 */
function syncVacationSupportToSchedule(vacRowIndex, newStatus) {
  try {
    var vacSheet = getSheet(SHEETS.vacations);
    var vacHeaders = vacSheet.getRange(1, 1, 1, vacSheet.getLastColumn()).getValues()[0];
    var vacMap = getHeaderMap(SHEETS.vacations);

    var handoverEmpId = String(vacSheet.getRange(vacRowIndex, vacHeaders.indexOf(vacMap['handoverEmpId']) + 1).getValue() || '').trim();
    if (!handoverEmpId) return; // 인수자가 없으면 아무 작업도 하지 않음

    var empId = String(vacSheet.getRange(vacRowIndex, vacHeaders.indexOf(vacMap['empId']) + 1).getValue() || '').trim();
    var vacDateStr = String(vacSheet.getRange(vacRowIndex, vacHeaders.indexOf(vacMap['vacationDate']) + 1).getValue() || '').trim();
    var vacType = String(vacSheet.getRange(vacRowIndex, vacHeaders.indexOf(vacMap['vacationType']) + 1).getValue() || '').trim();

    var vacParts = vacDateStr.split('-');
    if (vacParts.length !== 3) return;
    var year = Number(vacParts[0]);
    var month = Number(vacParts[1]);
    var day = Number(vacParts[2]);

    // 인계자의 원래 주근무지 가져오기
    var empSheet = getSheet(SHEETS.employees);
    var empHeaders = empSheet.getRange(1, 1, 1, empSheet.getLastColumn()).getValues()[0];
    var empMap = getHeaderMap(SHEETS.employees);
    var giverRowIdx = findRowIndex(empSheet, 'empId', empId);
    var giverWorkplace = '';
    if (giverRowIdx !== -1) {
      var fullWorkplace = empSheet.getRange(giverRowIdx, empHeaders.indexOf(empMap['mainWorkplace']) + 1).getValue();
      if (!fullWorkplace) {
        fullWorkplace = empSheet.getRange(giverRowIdx, empHeaders.indexOf(empMap['department']) + 1).getValue();
      }
      giverWorkplace = getShortWorkplace(fullWorkplace);
    }
    if (!giverWorkplace) giverWorkplace = '기능검사'; // Fallback

    var schedSheet = getSheet(SHEETS.schedules);
    var schedHeaders = schedSheet.getRange(1, 1, 1, schedSheet.getLastColumn()).getValues()[0];
    var schedMap = getHeaderMap(SHEETS.schedules);
    var schedRowIndex = findScheduleRowIndex(schedSheet, year, month, handoverEmpId);

    var isApprove = (newStatus === '승인');

    if (isApprove) {
      // 행이 없다면 행 신규 생성
      if (schedRowIndex === -1) {
        var schedRowData = new Array(schedHeaders.length).fill('');
        schedRowData[schedHeaders.indexOf(schedMap['year'])] = String(year);
        schedRowData[schedHeaders.indexOf(schedMap['month'])] = String(month);
        schedRowData[schedHeaders.indexOf(schedMap['empId'])] = handoverEmpId;
        schedSheet.appendRow(schedRowData);
        schedRowIndex = schedSheet.getLastRow();
      }

      var amCol = schedHeaders.indexOf(schedMap['day_' + day + '_support_am']) + 1;
      var pmCol = schedHeaders.indexOf(schedMap['day_' + day + '_support_pm']) + 1;

      if (vacType === '종일연차' || vacType === '오전반차' || vacType === '토요일 오전 MO' || vacType === '대체 오전 HO') {
        var amVal = String(schedSheet.getRange(schedRowIndex, amCol).getValue() || '').trim();
        var amArr = [];
        try { if (amVal) amArr = JSON.parse(amVal); } catch (e) { }
        if (!Array.isArray(amArr)) amArr = [];
        if (amArr.indexOf(giverWorkplace) === -1) {
          amArr.push(giverWorkplace);
          schedSheet.getRange(schedRowIndex, amCol).setValue(JSON.stringify(amArr));
        }
      }
      if (vacType === '종일연차' || vacType === '오후반차' || vacType === '토요일 오후 MO' || vacType === '대체 오후 HO') {
        var pmVal = String(schedSheet.getRange(schedRowIndex, pmCol).getValue() || '').trim();
        var pmArr = [];
        try { if (pmVal) pmArr = JSON.parse(pmVal); } catch (e) { }
        if (!Array.isArray(pmArr)) pmArr = [];
        if (pmArr.indexOf(giverWorkplace) === -1) {
          pmArr.push(giverWorkplace);
          schedSheet.getRange(schedRowIndex, pmCol).setValue(JSON.stringify(pmArr));
        }
      }
    } else {
      // 롤백 (제거)
      if (schedRowIndex === -1) return;

      var amCol = schedHeaders.indexOf(schedMap['day_' + day + '_support_am']) + 1;
      var pmCol = schedHeaders.indexOf(schedMap['day_' + day + '_support_pm']) + 1;

      if (vacType === '종일연차' || vacType === '오전반차' || vacType === '토요일 오전 MO' || vacType === '대체 오전 HO') {
        var amVal = String(schedSheet.getRange(schedRowIndex, amCol).getValue() || '').trim();
        var amArr = [];
        try { if (amVal) amArr = JSON.parse(amVal); } catch (e) { }
        if (Array.isArray(amArr)) {
          var idx = amArr.indexOf(giverWorkplace);
          if (idx !== -1) {
            amArr.splice(idx, 1);
            schedSheet.getRange(schedRowIndex, amCol).setValue(amArr.length > 0 ? JSON.stringify(amArr) : '');
          }
        }
      }
      if (vacType === '종일연차' || vacType === '오후반차' || vacType === '토요일 오후 MO' || vacType === '대체 오후 HO') {
        var pmVal = String(schedSheet.getRange(schedRowIndex, pmCol).getValue() || '').trim();
        var pmArr = [];
        try { if (pmVal) pmArr = JSON.parse(pmVal); } catch (e) { }
        if (Array.isArray(pmArr)) {
          var idx = pmArr.indexOf(giverWorkplace);
          if (idx !== -1) {
            pmArr.splice(idx, 1);
            schedSheet.getRange(schedRowIndex, pmCol).setValue(pmArr.length > 0 ? JSON.stringify(pmArr) : '');
          }
        }
      }
    }
  } catch (error) {
    Logger.log('syncVacationSupportToSchedule Error: ' + error.toString());
  }
}
