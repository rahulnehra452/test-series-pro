import { format, formatDistanceToNow } from 'date-fns'

/**
 * Standardized date formatting utility for the admin panel.
 * Use this instead of inline format() calls for consistency.
 */
export function formatDate(
  date: string | Date | null | undefined,
  style: 'short' | 'full' | 'relative' | 'datetime' = 'short'
): string {
  if (!date) return '—'

  try {
    const d = typeof date === 'string' ? new Date(date) : date

    switch (style) {
      case 'short':
        return format(d, 'MMM d, yyyy')
      case 'full':
        return format(d, 'EEEE, MMMM d, yyyy')
      case 'datetime':
        return format(d, 'MMM d, yyyy · HH:mm')
      case 'relative':
        return formatDistanceToNow(d, { addSuffix: true })
      default:
        return format(d, 'MMM d, yyyy')
    }
  } catch {
    return '—'
  }
}
