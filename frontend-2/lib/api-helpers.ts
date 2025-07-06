import { client } from '@/src/client/client.gen'

/**
 * Custom PATCH request for multipart/form-data uploads
 * The generated client forces Content-Type headers which breaks file uploads
 */
export async function patchWithFormData(url: string, formData: FormData) {
  // Get the client configuration
  const config = client.getConfig()
  const baseUrl = config.baseUrl || ''
  
  // Build the full URL
  const fullUrl = `${baseUrl}${url}`
  
  // Make the request without setting Content-Type
  // The browser will automatically set it with the correct boundary
  const response = await fetch(fullUrl, {
    method: 'PATCH',
    credentials: 'include',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed with status ${response.status}`)
  }
  
  return response.json()
}

/**
 * Custom POST request for multipart/form-data uploads
 */
export async function postWithFormData(url: string, formData: FormData) {
  const config = client.getConfig()
  const baseUrl = config.baseUrl || ''
  const fullUrl = `${baseUrl}${url}`
  
  const response = await fetch(fullUrl, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed with status ${response.status}`)
  }
  
  return response.json()
}