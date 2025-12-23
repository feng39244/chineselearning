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

// Get user-specific characters file path
function getCharactersFile(username: string): string {
  return path.join(DATA_DIR, "users", username, "characters.csv")
}

// Ensure user data directory exists
function ensureUserDir(username: string) {
  const userDir = path.join(DATA_DIR, "users", username)
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
  }
}

// Parse CSV content to characters array
function parseCSV(content: string) {
  const lines = content.trim().split("\n")
  if (lines.length <= 1) return []

  const characters = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Handle CSV parsing with potential commas in fields
    const parts = line.split(",")
    if (parts.length >= 3) {
      characters.push({
        id: parts[0]?.trim() || Date.now().toString() + i,
        character: parts[1]?.trim() || "",
        pinyin: parts[2]?.trim() || "",
        meaning: parts[3]?.trim() || "",
        phrase: parts[4]?.trim() || "",
      })
    }
  }
  return characters
}

// Convert characters array to CSV content
function toCSV(characters: any[]) {
  const header = "id,character,pinyin,meaning,phrase"
  const rows = characters.map(c => 
    `${c.id},${c.character},${c.pinyin},${c.meaning},${c.phrase || ""}`
  )
  return [header, ...rows].join("\n")
}

// GET - Read all characters
export async function GET(request: Request) {
  try {
    const username = getUsername(request)
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    ensureUserDir(username)
    const charactersFile = getCharactersFile(username)
    
    if (!fs.existsSync(charactersFile)) {
      return NextResponse.json([])
    }

    const content = fs.readFileSync(charactersFile, "utf-8")
    const characters = parseCSV(content)
    return NextResponse.json(characters)
  } catch (error) {
    console.error("Error reading characters:", error)
    return NextResponse.json({ error: "Failed to read characters" }, { status: 500 })
  }
}

// POST - Add new characters
export async function POST(request: Request) {
  try {
    const username = getUsername(request)
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    ensureUserDir(username)
    const charactersFile = getCharactersFile(username)
    
    const newCharacters = await request.json()
    
    // Read existing characters
    let existingCharacters: any[] = []
    if (fs.existsSync(charactersFile)) {
      const content = fs.readFileSync(charactersFile, "utf-8")
      existingCharacters = parseCSV(content)
    }

    // Filter out duplicates - check if character already exists
    const existingCharSet = new Set(existingCharacters.map(c => c.character))
    const uniqueNewCharacters = newCharacters.filter((newChar: any) => {
      return !existingCharSet.has(newChar.character)
    })

    // Merge only unique new characters
    const allCharacters = [...existingCharacters, ...uniqueNewCharacters]
    
    // Write back to file
    fs.writeFileSync(charactersFile, toCSV(allCharacters), "utf-8")

    return NextResponse.json({ 
      success: true, 
      count: allCharacters.length,
      added: uniqueNewCharacters.length,
      skipped: newCharacters.length - uniqueNewCharacters.length
    })
  } catch (error) {
    console.error("Error saving characters:", error)
    return NextResponse.json({ error: "Failed to save characters" }, { status: 500 })
  }
}

// DELETE - Remove a character or clear all
export async function DELETE(request: Request) {
  try {
    const username = getUsername(request)
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    ensureUserDir(username)
    const charactersFile = getCharactersFile(username)
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id === "all") {
      // Clear all characters
      fs.writeFileSync(charactersFile, "id,character,pinyin,meaning,phrase", "utf-8")
      return NextResponse.json({ success: true })
    }

    if (id) {
      // Remove specific character
      if (fs.existsSync(charactersFile)) {
        const content = fs.readFileSync(charactersFile, "utf-8")
        let characters = parseCSV(content)
        characters = characters.filter(c => c.id !== id)
        fs.writeFileSync(charactersFile, toCSV(characters), "utf-8")
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "No id provided" }, { status: 400 })
  } catch (error) {
    console.error("Error deleting character:", error)
    return NextResponse.json({ error: "Failed to delete character" }, { status: 500 })
  }
}
