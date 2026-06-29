import { useStore } from '@/store/useStore';
import { AlertCircle, ChevronRight, Check } from 'lucide-react';

export default function Dashboard() {
  const { handovers, currentUser, setCurrentPage } = useStore();

  const hasUnsignedHandovers = handovers.some(h => !h.isSigned && (h.receiver === currentUser.name || h.receiver === '사용자' || currentUser.name === '사용자'));

  return (
    <div className="p-4 sm:p-6 fade-enter">
      {hasUnsignedHandovers && (
        <div 
          className="mb-6 bg-accent-500 rounded-2xl p-4 sm:p-5 shadow-lg shadow-orange-200 text-white flex items-center justify-between gap-4 cursor-pointer hover:bg-accent-600 transition-colors"
          onClick={() => setCurrentPage('handovers')}
        >
          <div className="flex items-center gap-3 text-left">
            <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse text-white shrink-0" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">미서명된 업무 인수인계가 있습니다.</h3>
              <p className="text-xs sm:text-sm text-accent-50 mt-0.5">확인 후 서명해 주세요.</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-accent-100 shrink-0" />
        </div>
      )}

      <div className="max-w-xl mx-auto mt-8 sm:mt-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-500 mb-6 shadow-lg shadow-orange-200">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">로그인 성공!</h2>
        <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
          메인 화면 뼈대 공간입니다.<br />
          <span className="text-gray-400">(다음 Phase에서 메뉴가 구현됩니다)</span>
        </p>
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-100 text-green-700 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          시스템 정상 가동 중
        </div>
        
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-accent-500">—</div>
            <div className="text-xs text-gray-400 mt-1">공지사항</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-accent-500">—</div>
            <div className="text-xs text-gray-400 mt-1">인수인계</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-accent-500">—</div>
            <div className="text-xs text-gray-400 mt-1">장비 알림</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-300">—</div>
            <div className="text-xs text-gray-400 mt-1">나의 할 일</div>
          </div>
        </div>
      </div>
    </div>
  );
}
