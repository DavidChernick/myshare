'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/supabase/types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create once
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false

    async function fetchProfile() {
      if (!userId) {
        if (!cancelled) {
          setProfile(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)

      console.log('[useProfile] Fetching profile for user:', userId)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle() // IMPORTANT: returns null if 0 rows

      console.log('[useProfile] Profile fetch result:', { data, error, userId })

      if (cancelled) return

      if (error) {
        console.error('[useProfile] Error fetching profile:', error)
        setProfile(null)
        setError(error.message || 'Failed to fetch profile')
      } else {
        console.log('[useProfile] Profile loaded:', data)
        // maybeSingle() returns null if no rows, or the row if found
        setProfile(data)
        setError(null)
      }

      setLoading(false)
    }

    fetchProfile()

    return () => {
      cancelled = true
    }
  }, [userId, supabase])

  return { profile, loading, error }
}