export function formatDateTime(dateInput: Date | string | number | undefined | null): string {
  if (!dateInput) return '';
  
  // 이미 yyyy-mm-dd hh:mm:ss 형식의 문자열인지 확인
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return String(dateInput);
  }
  
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export function getDeptColor(dept: string): string {
  if (!dept) return 'bg-gray-50 text-gray-600 border-gray-200';
  if (dept.includes('면역')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (dept.includes('근전')) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (dept.includes('뇌파')) return 'bg-green-50 text-green-700 border-green-200';
  if (dept.includes('안과')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (dept.includes('심기') || dept.includes('심장기능') || dept.includes('심초')) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (dept.includes('청력')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  if (dept.includes('소화')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (dept.includes('호흡')) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (dept.includes('수면')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (dept.includes('휴직')) return 'bg-gray-100 text-gray-500 border-gray-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

export function getDeptTextColor(dept: string): string {
  if (!dept) return 'text-gray-600';
  if (dept.includes('면역')) return 'text-purple-700';
  if (dept.includes('근전')) return 'text-teal-700';
  if (dept.includes('뇌파')) return 'text-green-700';
  if (dept.includes('안과')) return 'text-blue-700';
  if (dept.includes('심기') || dept.includes('심장기능') || dept.includes('심초')) return 'text-orange-700';
  if (dept.includes('청력')) return 'text-cyan-700';
  if (dept.includes('소화')) return 'text-amber-700';
  if (dept.includes('호흡')) return 'text-teal-700';
  if (dept.includes('수면')) return 'text-indigo-700';
  if (dept.includes('휴직')) return 'text-gray-500';
  return 'text-gray-600';
}
