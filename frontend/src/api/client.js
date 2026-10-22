import axios from 'axios'
import { getLanguage } from '../i18n/languages'

const client = axios.create({ baseURL: '/api' })

client.interceptors.request.use((config) => {
  config.headers['X-Language'] = getLanguage()
  const access = localStorage.getItem('sc_access')
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    // A 401 from the login call itself is a wrong password, not an expired session.
    const isAuthCall = original.url?.startsWith('/auth/')
    if (error.response && error.response.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true
      const refresh = localStorage.getItem('sc_refresh')
      if (refresh) {
        try {
          const { data } = await axios.post('/api/auth/refresh/', { refresh })
          localStorage.setItem('sc_access', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return client(original)
        } catch (refreshError) {
          localStorage.removeItem('sc_access')
          localStorage.removeItem('sc_refresh')
          window.location.href = '/'
        }
      } else {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default client
