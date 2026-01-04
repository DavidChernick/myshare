import { createClient } from './supabase/client'

export async function trackEvent(
  userId: string | null,
  eventName: string,
  metadata?: Record<string, any>
) {
  try {
    const supabase = createClient()
    await supabase.from('events').insert({
      user_id: userId,
      event_name: eventName,
      metadata: metadata || null,
    })
  } catch (error) {
    // Silently fail - don't block user experience for tracking failures
    console.error('Event tracking error:', error)
  }
}
