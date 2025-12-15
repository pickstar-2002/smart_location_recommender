/**
 * 格式化时间为具体时间点
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的时间字符串（HH:MM格式）
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 获取当前时间戳
 * @returns 当前时间戳（毫秒）
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}