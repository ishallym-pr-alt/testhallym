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
