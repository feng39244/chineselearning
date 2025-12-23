"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Character {
  id: string
  character: string
  pinyin: string
  meaning: string
  phrase: string
}

interface CharacterUploadProps {
  onUploadComplete: () => void
}

export function CharacterUpload({ onUploadComplete }: CharacterUploadProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [character, setCharacter] = useState("")
  const [pinyin, setPinyin] = useState("")
  const [meaning, setMeaning] = useState("")
  const [phrase, setPhrase] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Load characters from API on mount
  useEffect(() => {
    fetchCharacters()
  }, [])

  const fetchCharacters = async () => {
    try {
      const response = await fetch("/api/characters")
      if (response.ok) {
        const data = await response.json()
        setCharacters(data)
      }
    } catch (error) {
      console.error("Error fetching characters:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addCharacter = async () => {
    if (!character || !pinyin || !meaning) {
      alert("Please fill in all fields")
      return
    }

    const newChar: Character = {
      id: Date.now().toString(),
      character,
      pinyin,
      meaning,
      phrase,
    }

    try {
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([newChar]),
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.skipped > 0) {
          alert(`Character '${character}' already exists in your collection`)
        } else {
          // Refresh the character list from server
          await fetchCharacters()
          setCharacter("")
          setPinyin("")
          setMeaning("")
          setPhrase("")
          alert("Character added successfully!")
        }
      } else {
        alert("Failed to save character")
      }
    } catch (error) {
      console.error("Error saving character:", error)
      alert("Failed to save character")
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split("\n")
      const newCharacters: Character[] = []

      lines.forEach((line, index) => {
        if (index === 0) return // Skip header
        const [char, pin, mean, phr] = line.split(",").map((s) => s.trim())
        if (char && pin && mean) {
          newCharacters.push({
            id: Date.now().toString() + index,
            character: char,
            pinyin: pin,
            meaning: mean,
            phrase: phr || "",
          })
        }
      })

      try {
        const response = await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCharacters),
        })

        if (response.ok) {
          const result = await response.json()
          // Refresh the character list from server to get the actual state
          await fetchCharacters()
          
          if (result.skipped > 0) {
            alert(
              `Upload complete!\n` +
              `Added: ${result.added} new character(s)\n` +
              `Skipped: ${result.skipped} duplicate(s)`
            )
          } else {
            alert(`Successfully uploaded ${result.added} character(s)`)
          }
          
          // Reset file input so the same file can be uploaded again
          e.target.value = ""
        } else {
          alert("Failed to upload characters")
        }
      } catch (error) {
        console.error("Error uploading characters:", error)
        alert("Failed to upload characters")
      }
    }
    reader.readAsText(file)
  }

  const removeCharacter = async (id: string) => {
    try {
      const response = await fetch(`/api/characters?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCharacters(characters.filter((c) => c.id !== id))
      } else {
        alert("Failed to remove character")
      }
    } catch (error) {
      console.error("Error removing character:", error)
      alert("Failed to remove character")
    }
  }

  const downloadCSVTemplate = () => {
    const template = "Character,Pinyin,Meaning,Phrase\n备,bèi,prepare,准备\n文,wén,writing,文字"
    const blob = new Blob([template], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "character-template.csv"
    a.click()
  }

  const exportCharacters = () => {
    if (characters.length === 0) {
      alert("No characters to export")
      return
    }

    // Create CSV content
    const header = "Character,Pinyin,Meaning,Phrase"
    const rows = characters.map(
      (char) => `${char.character},${char.pinyin},${char.meaning},${char.phrase || ""}`
    )
    const csvContent = [header, ...rows].join("\n")

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const date = new Date().toISOString().split("T")[0]
    a.download = `my-characters-${date}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading characters...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Import & Export</h3>
        <p className="text-sm text-blue-800 mb-1">CSV format: Character, Pinyin, Meaning, Phrase (词组)</p>
        <p className="text-xs text-blue-700 mb-3">Note: Phrase is a word containing the character (e.g., 准备 for 备)</p>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={downloadCSVTemplate} variant="outline" size="sm">
            Download CSV Template
          </Button>
          <Button 
            onClick={exportCharacters} 
            variant="outline" 
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700 border-green-600"
            disabled={characters.length === 0}
          >
            Export My Characters
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-3 text-lg">Import Characters</h3>
          <label className="block text-sm font-medium mb-2">Upload CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="w-full border border-gray-300 rounded-lg p-2"
          />
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-600 mb-4">Or add character manually:</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Chinese Character"
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
            />
            <input
              type="text"
              placeholder="Pinyin (e.g., zhōng)"
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
            />
            <input
              type="text"
              placeholder="Meaning (e.g., middle)"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
            />
            <input
              type="text"
              placeholder="Phrase/词组 (e.g., 准备)"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
            />
            <Button onClick={addCharacter} className="w-full">
              Add Character
            </Button>
          </div>
        </div>
      </div>

      {characters.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Loaded Characters ({characters.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {characters.map((char) => (
              <Card key={char.id} className="p-3 flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold text-indigo-600">{char.character}</p>
                  <p className="text-sm text-gray-600">{char.pinyin}</p>
                  <p className="text-sm text-gray-500">{char.meaning}</p>
                </div>
                <button
                  onClick={() => removeCharacter(char.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
