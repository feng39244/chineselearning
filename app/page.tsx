"use client"

import { useState, useEffect } from "react"
import { CharacterUpload } from "@/components/character-upload"
import { QuizMode } from "@/components/quiz-mode"
import { ProgressDashboard } from "@/components/progress-dashboard"
import { AuthForm } from "@/components/auth-form"

type Page = "upload" | "quiz" | "dashboard"

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard")
  const [user, setUser] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth")
        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error("Auth check failed:", error)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      })
      setUser(null)
      setCurrentPage("dashboard")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-indigo-700 text-lg">Loading...</p>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!user) {
    return <AuthForm onLogin={setUser} />
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 pt-6">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">中文学习</h1>
          <p className="text-indigo-700">Chinese Character Learning</p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="text-sm text-gray-600">
              Logged in as <span className="font-semibold text-indigo-600">{user}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Logout
            </button>
          </div>
        </header>

        <nav className="flex gap-3 justify-center mb-8 flex-wrap">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              currentPage === "dashboard"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-indigo-600 hover:shadow-md"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentPage("upload")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              currentPage === "upload"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-indigo-600 hover:shadow-md"
            }`}
          >
            Manage Characters
          </button>
          <button
            onClick={() => setCurrentPage("quiz")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              currentPage === "quiz" ? "bg-indigo-600 text-white shadow-lg" : "bg-white text-indigo-600 hover:shadow-md"
            }`}
          >
            Start Quiz
          </button>
        </nav>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {currentPage === "dashboard" && <ProgressDashboard />}
          {currentPage === "upload" && <CharacterUpload onUploadComplete={() => setCurrentPage("dashboard")} />}
          {currentPage === "quiz" && <QuizMode />}
        </div>
      </div>
    </main>
  )
}
