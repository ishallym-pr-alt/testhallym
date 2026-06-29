"use client";

import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function LoginScreen() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useStore();

  useEffect(() => {
    const saved = localStorage.getItem('savedEmpId');
    if (saved) {
      setEmployeeId(saved);
      setRememberId(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !password) {
      alert('사번과 비밀번호를 모두 입력해주세요.');
      return;
    }
    setIsLoading(true);

    try {
      const result = await login(employeeId, password);
      if (!result.success) {
        alert(result.error || '로그인 실패');
      } else {
        if (rememberId) {
          localStorage.setItem('savedEmpId', employeeId);
        } else {
          localStorage.removeItem('savedEmpId');
        }
      }
    } catch (err) {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="screen-login" className="login-bg fixed inset-0 z-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto flex flex-row items-center justify-center gap-2 sm:gap-3 px-4 mb-6">
        <img src="/logo.png" className="h-6 sm:h-8 w-auto object-contain" alt="인성의료재단 한림병원" />
        <span className="text-gray-300 text-sm sm:text-base font-light">|</span>
        <h1 className="portal-title text-[#004b8d] font-bold text-sm sm:text-lg tracking-tight whitespace-nowrap">직원용 포탈</h1>
      </div>

      <div className="login-card w-full mx-4 md:mx-0 max-w-md px-6 md:px-10 py-8">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5 flex flex-col min-w-0">
            <label className="block text-sm font-semibold text-gray-700">사번</label>
            <div className="relative w-full min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="사번을 입력하세요"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="input-toss w-full pl-10 pr-4 py-3 text-sm min-w-0"
              />
            </div>
          </div>

          <div className="space-y-1.5 flex flex-col min-w-0">
            <label className="block text-sm font-semibold text-gray-700">비밀번호</label>
            <div className="relative w-full min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                autoComplete="off"
                spellCheck="false"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-toss w-full pl-10 pr-11 py-3 text-sm min-w-0 ${!showPassword ? 'password-mask' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center text-xs text-gray-500 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberId}
                onChange={(e) => setRememberId(e.target.checked)}
                className="w-4 h-4 rounded text-[#004b8d] border-gray-300 focus:ring-[#004b8d] cursor-pointer"
              />
              <span>사번 저장</span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-login w-full py-3.5 flex items-center justify-center gap-2"
            >
              <span>{isLoading ? '로그인 중...' : '로그인'}</span>
              {isLoading && <div className="spinner"></div>}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 인성의료재단 한림병원
        </p>
      </div>
    </div>
  );
}
