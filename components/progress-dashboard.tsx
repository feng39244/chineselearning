"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

interface Character {
  id: string
  character: string
  pinyin: string
  meaning: string
}

interface Progress {
  [characterId: string]: {
    correct: number
    incorrect: number
  }
}

export function ProgressDashboard() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [progress, setProgress] = useState<Progress>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [charsResponse, progressResponse] = await Promise.all([
          fetch("/api/characters"),
          fetch("/api/progress"),
        ])

        if (charsResponse.ok) {
          const charsData = await charsResponse.json()
          setCharacters(charsData)
        }

        if (progressResponse.ok) {
          const progressData = await progressResponse.json()
          setProgress(progressData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const stats = characters.map((char) => {
    const charProgress = progress[char.id] || { correct: 0, incorrect: 0 }
    const total = charProgress.correct + charProgress.incorrect
    const accuracy = total > 0 ? Math.round((charProgress.correct / total) * 100) : 0

    return {
      ...char,
      ...charProgress,
      total,
      accuracy,
    }
  })

  const overallStats = {
    totalCharacters: characters.length,
    totalAttempts: Object.values(progress).reduce((sum, p) => sum + p.correct + p.incorrect, 0),
    totalCorrect: Object.values(progress).reduce((sum, p) => sum + p.correct, 0),
    overallAccuracy:
      Object.values(progress).reduce((sum, p) => sum + p.correct + p.incorrect, 0) > 0
        ? Math.round(
            (Object.values(progress).reduce((sum, p) => sum + p.correct, 0) /
              Object.values(progress).reduce((sum, p) => sum + p.correct + p.incorrect, 0)) *
              100,
          )
        : 0,
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading progress...</p>
      </div>
    )
  }

  if (characters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No characters uploaded yet. Start by uploading characters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Total Characters</p>
          <p className="text-3xl font-bold text-blue-600">{overallStats.totalCharacters}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-sm text-gray-600 mb-1">Total Attempts</p>
          <p className="text-3xl font-bold text-green-600">{overallStats.totalAttempts}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-sm text-gray-600 mb-1">Total Correct</p>
          <p className="text-3xl font-bold text-purple-600">{overallStats.totalCorrect}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <p className="text-sm text-gray-600 mb-1">Overall Accuracy</p>
          <p className="text-3xl font-bold text-orange-600">{overallStats.overallAccuracy}%</p>
        </Card>
      </div>

      <div>
        <h3 className="font-semibold mb-4 text-lg">Character Progress</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {stats.map((stat) => (
            <Card key={stat.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <p className="text-3xl font-bold text-indigo-600 w-12">{stat.character}</p>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{stat.pinyin}</p>
                    <p className="text-xs text-gray-600">{stat.meaning}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">{stat.accuracy}%</p>
                  <p className="text-xs text-gray-600">
                    {stat.correct}/{stat.total}
                  </p>
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${stat.accuracy}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
