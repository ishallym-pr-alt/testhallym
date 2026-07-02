'use client';

import { Search, KanbanSquare, GitCommit, Wrench } from 'lucide-react';
import { useState } from 'react';

interface EquipmentHeaderProps {
  activeView: 'plan' | 'roadmap';
  setActiveView: (view: 'plan' | 'roadmap') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCount: number;
  onViewChange?: () => void; // 탭 변경 시 추가 동작 (모달 닫기 등)
}

export default function EquipmentHeader({
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  filteredCount,
  onViewChange,
}: EquipmentHeaderProps) {
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleMediinfoLaunch = () => {
    let hasBlurred = false;
    const onBlur = () => { hasBlurred = true; };
    window.addEventListener('blur', onBlur);

    // mediinfo:// URI 호출
    window.location.href = 'mediinfo://open';
    showToast('메디인포를 실행하거나 활성화합니다...');

    // 1초 후에도 창 포커스를 잃지 않았다면 프로토콜 미등록으로 간주
    setTimeout(() => {
      window.removeEventListener('blur', onBlur);
      if (!hasBlurred) {
        showToast('연동 설정이 필요하여 자동 설정 파일을 다운로드합니다.');
        downloadSetupBat();
      }
    }, 1000);
  };

  const downloadSetupBat = () => {
    const origin = window.location.origin;
    const batContent = `@echo off
chcp 65001 >nul
echo ===================================================
echo MediInfo Protocol Setup Script
echo ===================================================
echo.
echo [1/2] Downloading required script...

set "TARGET_DIR=%USERPROFILE%\\MediInfo"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

powershell -Command "Invoke-WebRequest -Uri '${origin}/scripts/launch_mediinfo.ps1' -OutFile '%TARGET_DIR%\\launch_mediinfo.ps1'"

if not exist "%TARGET_DIR%\\launch_mediinfo.ps1" (
    echo [Error] Failed to download script.
    pause
    exit /b
)

echo [2/2] Registering registry protocol...
reg add "HKCU\\Software\\Classes\\mediinfo" /ve /t REG_SZ /d "URL:MediInfo Protocol" /f
reg add "HKCU\\Software\\Classes\\mediinfo" /v "URL Protocol" /t REG_SZ /d "" /f
reg add "HKCU\\Software\\Classes\\mediinfo\\shell\\open\\command" /ve /t REG_SZ /d "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \\"%TARGET_DIR%\\launch_mediinfo.ps1\\" \\"%%1\\"" /f

echo.
echo ===================================================
echo [Success] Setup completed successfully!
echo Please click the MediInfo button again on the website.
echo ===================================================
pause
`;
    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediinfo_setup.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
      {/* 좌측: 제목 + 뷰 탭 */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <h2 className="text-xl font-bold text-gray-900 whitespace-nowrap">장비 이슈</h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => {
              setActiveView('plan');
              onViewChange?.();
            }}
            className={`flex items-center justify-center gap-1.5 min-w-[80px] px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'plan' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <KanbanSquare className="w-4 h-4 shrink-0" /> 플랜
          </button>
          <button 
            onClick={() => {
              setActiveView('roadmap');
              onViewChange?.();
            }}
            className={`flex items-center justify-center gap-1.5 min-w-[80px] px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'roadmap' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <GitCommit className="w-4 h-4 shrink-0" /> 로드맵
          </button>
        </div>
      </div>

      {/* 우측: 검색 + 건수 + 메디인포 버튼 */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-9 pr-4 bg-gray-100 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#004b8d]/20 border border-transparent focus:border-[#004b8d] transition-all"
          />
        </div>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-bold rounded-full whitespace-nowrap">
          {filteredCount}건
        </span>

        {/* 메디인포 바로가기 버튼 */}
        <button
          id="mediinfo-shortcut-btn"
          onClick={handleMediinfoLaunch}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#004b8d] hover:bg-[#003c71] text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
          title="메디인포 바로가기"
        >
          <Wrench className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">메디인포</span>
        </button>
      </div>

      {/* 토스트 알림 */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Wrench className="w-4 h-4 text-orange-400 shrink-0" />
          {toastMsg}
        </div>
      )}
    </div>
  );
}
