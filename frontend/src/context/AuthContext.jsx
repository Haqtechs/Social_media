import { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const API_URL = 'https://social-media-4kso.onrender.com/api'

  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(response.data)
    } catch (error) {
      console.error('Error fetching user:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    setToken(token)
    setUser(user)
    return response.data
  }

  const signup = async (username, email, password, full_name) => {
    const response = await axios.post(`${API_URL}/auth/signup`, {
      username,
      email,
      password,
      full_name
    })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    setToken(token)
    setUser(user)
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    API_URL
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
