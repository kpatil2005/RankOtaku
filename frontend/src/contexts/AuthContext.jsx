import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState(localStorage.getItem('token'))

    useEffect(() => {
        const verifyToken = async () => {
            const storedToken = localStorage.getItem('token')
            
            if (!storedToken) {
                setUser(null)
                setLoading(false)
                return
            }

            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${storedToken}`
                    }
                })

                const data = await res.json()

                if (res.ok) {
                    setUser(data.user)
                } else {
                    localStorage.removeItem('token')
                    setUser(null)
                }

            } catch {
                localStorage.removeItem('token')
                setUser(null)
            }

            setLoading(false)
        }

        verifyToken()
    }, [])

    const login = async (email, password) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Login failed')
            }

            localStorage.setItem('token', data.token)
            setToken(data.token)
            setUser(data.user)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const signup = async (username, email, password) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed')
            }

            localStorage.setItem('token', data.token)
            setToken(data.token)
            setUser(data.user)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const logout = async () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
    }

    const value = {
        user,
        setUser,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}