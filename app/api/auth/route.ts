import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import crypto from "crypto"

const DATA_DIR = path.join(process.cwd(), "data")
const USERS_FILE = path.join(DATA_DIR, "users.csv")

// Simple password hashing
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex")
}

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// Ensure user data directory exists
function ensureUserDir(username: string) {
  const userDir = path.join(DATA_DIR, "users", username)
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
  }
  return userDir
}

// Parse users CSV
function parseUsersCSV(content: string): Map<string, string> {
  const users = new Map<string, string>()
  const lines = content.trim().split("\n")
  if (lines.length <= 1) return users

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const [username, passwordHash] = line.split(",")
    if (username && passwordHash) {
      users.set(username.trim(), passwordHash.trim())
    }
  }
  return users
}

// Save users to CSV
function saveUsersCSV(users: Map<string, string>) {
  const header = "username,passwordHash"
  const rows = Array.from(users.entries()).map(([u, p]) => `${u},${p}`)
  fs.writeFileSync(USERS_FILE, [header, ...rows].join("\n"), "utf-8")
}

// Load users from CSV
function loadUsers(): Map<string, string> {
  ensureDataDir()
  if (!fs.existsSync(USERS_FILE)) {
    return new Map()
  }
  const content = fs.readFileSync(USERS_FILE, "utf-8")
  return parseUsersCSV(content)
}

// POST - Login or Register
export async function POST(request: Request) {
  try {
    const { action, username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json({ error: "Username must be 2-20 characters" }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 })
    }

    // Only allow alphanumeric usernames
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 })
    }

    const users = loadUsers()
    const passwordHash = hashPassword(password)

    if (action === "register") {
      if (users.has(username)) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 })
      }

      users.set(username, passwordHash)
      saveUsersCSV(users)
      ensureUserDir(username)

      const response = NextResponse.json({ success: true, username })
      response.cookies.set("user", username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      return response
    }

    if (action === "login") {
      const storedHash = users.get(username)
      if (!storedHash || storedHash !== passwordHash) {
        return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
      }

      ensureUserDir(username)

      const response = NextResponse.json({ success: true, username })
      response.cookies.set("user", username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      return response
    }

    if (action === "logout") {
      const response = NextResponse.json({ success: true })
      response.cookies.delete("user")
      return response
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}

// GET - Check current user
export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie")
    if (!cookieHeader) {
      return NextResponse.json({ user: null })
    }

    const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=")
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const username = cookies["user"]
    if (!username) {
      return NextResponse.json({ user: null })
    }

    // Verify user exists
    const users = loadUsers()
    if (!users.has(username)) {
      const response = NextResponse.json({ user: null })
      response.cookies.delete("user")
      return response
    }

    return NextResponse.json({ user: username })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ user: null })
  }
}

