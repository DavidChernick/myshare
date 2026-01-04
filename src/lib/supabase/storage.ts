import { createClient } from './client'

const BUCKET_NAME = 'charity-photos'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Upload a charity photo to Supabase Storage
 * @param charityId - The charity's ID
 * @param file - The image file to upload
 * @returns The public URL of the uploaded image
 */
export async function uploadCharityPhoto(
  charityId: string,
  file: File
): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 5MB')
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('File must be a JPEG, PNG, or WebP image')
  }

  const supabase = createClient()

  // Get file extension
  const fileExt = file.name.split('.').pop()
  const filePath = `${charityId}/logo.${fileExt}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      upsert: true, // Replace existing file
      contentType: file.type,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw new Error(`Failed to upload image: ${uploadError.message}`)
  }

  // Get public URL
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return data.publicUrl
}

/**
 * Delete a charity photo from Supabase Storage
 * @param charityId - The charity's ID
 */
export async function deleteCharityPhoto(charityId: string): Promise<void> {
  const supabase = createClient()

  // List all files in the charity's folder
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(charityId)

  if (listError) {
    console.error('List error:', listError)
    throw new Error(`Failed to list files: ${listError.message}`)
  }

  if (!files || files.length === 0) {
    return // No files to delete
  }

  // Delete all files in the charity's folder
  const filePaths = files.map((file) => `${charityId}/${file.name}`)
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(filePaths)

  if (deleteError) {
    console.error('Delete error:', deleteError)
    throw new Error(`Failed to delete image: ${deleteError.message}`)
  }
}

/**
 * Validate an image file before upload
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be less than 5MB'
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'File must be a JPEG, PNG, or WebP image'
  }

  return null
}
