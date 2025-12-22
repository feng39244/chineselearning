import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

function getUsername(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null

  const cookies = Object.fromEntries(
    cookieHeader.split("; ").map((c) => {
      const [key, ...values] = c.split("=")
      return [key, values.join("=")]
    }),
  )

  return cookies.username || null
}

function getQuizHistoryFile(username: string) {
  const dataDir = path.join(process.cwd(), "data", "users", username)
  return path.join(dataDir, "quiz-history.csv")
}

function ensureUserDir(username: string) {
  const userDir = path.join(process.cwd(), "data", "users", username)
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
  }
}

interface QuizSession {
  timestamp: number
  quizType: string
  totalQuestions: number
  correctAnswers: number
  accuracy: number
}

// Parse CSV content to quiz history array
function parseCSV(content: string): QuizSession[] {
  const lines = content.trim().split("\n")
  if (lines.length <= 1) return []

  const history: QuizSession[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const [timestamp, quizType, totalQuestions, correctAnswers, accuracy] = line.split(",")
    if (timestamp) {
      history.push({
        timestamp: parseInt(timestamp.trim(), 10),
        quizType: quizType.trim(),
        totalQuestions: parseInt(totalQuestions.trim(), 10),
        correctAnswers: parseInt(correctAnswers.trim(), 10),
        accuracy: parseFloat(accuracy.trim()),
      })
    }
  }
  return history
}

// Convert quiz history array to CSV content
function toCSV(history: QuizSession[]) {
  const header = "timestamp,quizType,totalQuestions,correctAnswers,accuracy"
  const rows = history.map(
    (session) =>
      `${session.timestamp},${session.quizType},${session.totalQuestions},${session.correctAnswers},${session.accuracy}`,
  )
  return [header, ...rows].join("\n")
}

// GET - Read quiz history (last N sessions)
export async function GET(request: Request) {
  try {
    const username = getUsername(request)
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "10", 10)

    ensureUserDir(username)
    const historyFile = getQuizHistoryFile(username)

    if (!fs.existsSync(historyFile)) {
      return NextResponse.json([])
    }

    const content = fs.readFileSync(historyFile, "utf-8")
    const history = parseCSV(content)

    // Sort by timestamp descending and limit results
    const recentHistory = history.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)

    return NextResponse.json(recentHistory)
  } catch (error) {
    console.error("Error reading quiz history:", error)
    return NextResponse.json({ error: "Failed to read quiz history" }, { status: 500 })
  }
}

// POST - Add a new quiz session
export async function POST(request: Request) {
  try {
    const username = getUsername(request)
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    ensureUserDir(username)
    const historyFile = getQuizHistoryFile(username)

    const newSession: QuizSession = await request.json()

    // Read existing history
    let existingHistory: QuizSession[] = []
    if (fs.existsSync(historyFile)) {
      const content = fs.readFileSync(historyFile, "utf-8")
      existingHistory = parseCSV(content)
    }

    // Add new session
    existingHistory.push(newSession)

    // Keep only last 50 sessions to prevent file from growing too large
    if (existingHistory.length > 50) {
      existingHistory = existingHistory
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50)
    }

    // Write back to file
    fs.writeFileSync(historyFile, toCSV(existingHistory), "utf-8")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving quiz history:", error)
    return NextResponse.json({ error: "Failed to save quiz history" }, { status: 500 })
  }
}


