import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")

// Get username from cookie
function getUsername(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=")
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  return cookies["user"] || null
}

// Get user-specific progress file path
function getProgressFile(username: string): string {
  return path.join(DATA_DIR, "users", username, "progress.csv")
}

// Ensure user data directory exists
function ensureUserDir(username: string) {
  const userDir = path.join(DATA_DIR, "users", username)
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
  }
}

// Parse CSV content to progress object
function parseCSV(content: string) {
  const lines = content.trim().split("\n")
  if (lines.length <= 1) return {}

  const progress: Record<string, { correct: number; incorrect: number }> = {}
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const [characterId, correct, incorrect] = line.split(",")
    if (characterId) {
      progress[characterId.trim()] = {
        correct: parseInt(correct?.trim() || "0", 10),
        incorrect: parseInt(incorrect?.trim() || "0", 10),
      }
    }
  }
  return progress
}

// Convert progress object to CSV content
function toCSV(progress: Record<string, { correct: number; incorrect: number }>) {
  const header = "characterId,correct,incorrect"
  const rows = Object.entries(progress).map(
    ([id, stats]) => `${id},${stats.correct},${stats.incorrect}`
  )
  return [header, ...rows].join("\n")
}

// GET - Read all progress
export async function GET(request: Request) {
  try {
    const username = getUsername(request)
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    ensureUserDir(username)
    const progressFile = getProgressFile(username)
    
    if (!fs.existsSync(progressFile)) {
      return NextResponse.json({})
    }

    const content = fs.readFileSync(progressFile, "utf-8")
    const progress = parseCSV(content)
    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error reading progress:", error)
    return NextResponse.json({ error: "Failed to read progress" }, { status: 500 })
  }
}

// POST - Update progress
export async function POST(request: Request) {
  try {
    const username = getUsername(request)
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    ensureUserDir(username)
    const progressFile = getProgressFile(username)
    
    const newProgress = await request.json()
    
    // Read existing progress
    let existingProgress: Record<string, { correct: number; incorrect: number }> = {}
    if (fs.existsSync(progressFile)) {
      const content = fs.readFileSync(progressFile, "utf-8")
      existingProgress = parseCSV(content)
    }

    // Merge progress - add to existing counts
    for (const [id, stats] of Object.entries(newProgress) as [string, { correct: number; incorrect: number }][]) {
      if (existingProgress[id]) {
        existingProgress[id].correct += stats.correct
        existingProgress[id].incorrect += stats.incorrect
      } else {
        existingProgress[id] = stats
      }
    }
    
    // Write back to file
    fs.writeFileSync(progressFile, toCSV(existingProgress), "utf-8")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving progress:", error)
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 })
  }
}

// DELETE - Clear all progress
export async function DELETE(request: Request) {
  try {
    const username = getUsername(request)
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    ensureUserDir(username)
    const progressFile = getProgressFile(username)
    
    fs.writeFileSync(progressFile, "characterId,correct,incorrect", "utf-8")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing progress:", error)
    return NextResponse.json({ error: "Failed to clear progress" }, { status: 500 })
  }
}
