import { Profile } from '@/lib/supabase/types'

/**
 * Get the user's first name with fallback
 * @param profile - User profile object
 * @returns First name or fallback to 'there'
 */
export function getFirstName(profile: Profile | null): string {
  if (!profile) return 'there'

  // Use first_name if available
  if (profile.first_name) {
    return profile.first_name
  }

  // Fallback to extracting from full_name
  if (profile.full_name) {
    const parts = profile.full_name.split(' ')
    return parts[0]
  }

  return 'there'
}

/**
 * Get the user's full name
 * @param profile - User profile object
 * @returns Full name constructed from first_name + last_name, or full_name field
 */
export function getFullName(profile: Profile | null): string {
  if (!profile) return ''

  // Use first_name + last_name if available
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name} ${profile.last_name}`
  }

  // Use just first_name if that's all we have
  if (profile.first_name) {
    return profile.first_name
  }

  // Fallback to full_name field
  return profile.full_name || ''
}
