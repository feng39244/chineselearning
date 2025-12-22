"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DrawingCanvas } from "@/components/drawing-canvas"

interface Character {
  id: string
  character: string
  pinyin: string
  meaning: string
  phrase: string
}

interface QuizStats {
  characterId: string
  correct: number
  incorrect: number
  lastAttempt: number
}

type QuizType = "recognition" | "reverse" | "multiple-choice"

export function QuizMode() {
  const [allCharacters, setAllCharacters] = useState<Character[]>([])
  const [quizCharacters, setQuizCharacters] = useState<Character[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [selectedPinyin, setSelectedPinyin] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null)
  const [sessionStats, setSessionStats] = useState<QuizStats[]>([])
  const [quizComplete, setQuizComplete] = useState(false)
  const [quizType, setQuizType] = useState<QuizType | null>(null)
  const [characterCount, setCharacterCount] = useState<number | null>(null)
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<Character[]>([])
  const [pinyinOptions, setPinyinOptions] = useState<string[]>([])
  const [showAnswer, setShowAnswer] = useState(false)
  const [selfAssessment, setSelfAssessment] = useState<"correct" | "incorrect" | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const generateMultipleChoiceOptions = (index: number, chars: Character[]) => {
    const correctChar = chars[index]
    const options = [correctChar]

    while (options.length < Math.min(4, allCharacters.length)) {
      const randomChar = allCharacters[Math.floor(Math.random() * allCharacters.length)]
      if (!options.find((o) => o.id === randomChar.id)) {
        options.push(randomChar)
      }
    }

    setMultipleChoiceOptions(options.sort(() => Math.random() - 0.5))
  }

  const generatePinyinOptions = (index: number, chars: Character[]) => {
    const correctChar = chars[index]
    const options = [correctChar.pinyin]

    // Get random pinyin from other characters as wrong options
    const otherChars = allCharacters.filter(c => c.id !== correctChar.id)
    const shuffledOthers = [...otherChars].sort(() => Math.random() - 0.5)
    
    for (const char of shuffledOthers) {
      if (options.length >= 4) break
      if (!options.includes(char.pinyin)) {
        options.push(char.pinyin)
      }
    }

    setPinyinOptions(options.slice(0, 4).sort(() => Math.random() - 0.5))
  }

  const selectRandomCharacters = (count: number) => {
    const shuffled = [...allCharacters].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(count, allCharacters.length))
    setQuizCharacters(selected)
    return selected
  }

  // Generate phrase hint by replacing target character with its pinyin
  const getPhraseHint = (char: Character) => {
    if (!char.phrase) return `(${char.pinyin})`
    
    // Replace the target character in the phrase with pinyin in parentheses
    const hint = char.phrase.replace(
      new RegExp(char.character, 'g'),
      `(${char.pinyin})`
    )
    return hint
  }

  // Text-to-speech for writing quiz: Read the phrase when question is displayed
  useEffect(() => {
    if (quizType === "reverse" && quizCharacters.length > 0 && !feedback && !showAnswer) {
      const currentCharacter = quizCharacters[currentIndex]
      if (currentCharacter?.phrase) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel()
        
        // Create and speak the phrase
        const utterance = new SpeechSynthesisUtterance(currentCharacter.phrase)
        utterance.lang = 'zh-CN' // Set language to Chinese
        utterance.rate = 0.8 // Slightly slower for clarity
        window.speechSynthesis.speak(utterance)
      }
    }
  }, [currentIndex, quizType, quizCharacters, feedback, showAnswer])

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch("/api/characters")
        if (response.ok) {
          const data = await response.json()
          setAllCharacters(data)
        }
      } catch (error) {
        console.error("Error fetching characters:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCharacters()
  }, [])

  // Auto-advance to next question after 2 seconds when feedback is shown
  useEffect(() => {
    if (feedback !== null) {
      const timer = setTimeout(() => {
        handleNext()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading characters...</p>
      </div>
    )
  }

  if (allCharacters.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No characters uploaded yet. Please upload characters first.</p>
      </div>
    )
  }

  if (!quizType) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold text-indigo-900">Choose a Quiz Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            onClick={() => setQuizType("recognition")}
            className="p-6 cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all border-2 border-gray-200"
          >
            <h3 className="text-lg font-bold text-indigo-900 mb-2">Read</h3>
            <p className="text-sm text-gray-600">See the character, select the correct pinyin</p>
          </Card>
          <Card
            onClick={() => setQuizType("reverse")}
            className="p-6 cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all border-2 border-gray-200"
          >
            <h3 className="text-lg font-bold text-indigo-900 mb-2">Writing</h3>
            <p className="text-sm text-gray-600">See the phrase hint, write the character</p>
          </Card>
          <Card
            onClick={() => setQuizType("multiple-choice")}
            className="p-6 cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all border-2 border-gray-200"
          >
            <h3 className="text-lg font-bold text-indigo-900 mb-2">Multiple Choice</h3>
            <p className="text-sm text-gray-600">Pick the correct character</p>
          </Card>
        </div>
      </div>
    )
  }

  if (characterCount === null) {
    const countOptions = [5, 10, 20, 30]
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold text-indigo-900">How many characters?</h2>
        <p className="text-gray-600">You have {allCharacters.length} characters available</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {countOptions.map((count) => (
            <Card
              key={count}
              onClick={() => {
                const selected = selectRandomCharacters(count)
                setCharacterCount(count)
                if (quizType === "recognition") {
                  generatePinyinOptions(0, selected)
                } else {
                  generateMultipleChoiceOptions(0, selected)
                }
              }}
              className={`p-6 cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all border-2 ${
                count > allCharacters.length ? "border-gray-200 opacity-50" : "border-gray-200"
              }`}
            >
              <h3 className="text-2xl font-bold text-indigo-900 mb-1">{count}</h3>
              <p className="text-sm text-gray-600">characters</p>
              {count > allCharacters.length && (
                <p className="text-xs text-orange-600 mt-1">Only {allCharacters.length} available</p>
              )}
            </Card>
          ))}
        </div>
        <Button variant="outline" onClick={() => setQuizType(null)}>
          ← Back to Quiz Type
        </Button>
      </div>
    )
  }

  const currentCharacter = quizCharacters[currentIndex]

  const handleRecognitionAnswer = (selectedPinyinOption: string) => {
    const isCorrect = selectedPinyinOption === currentCharacter.pinyin
    setSelectedPinyin(selectedPinyinOption)
    setFeedback(isCorrect ? "correct" : "incorrect")
    updateStats(isCorrect)
  }

  const handleReverseAnswer = () => {
    if (!userAnswer.trim()) {
      alert("Please enter an answer")
      return
    }

    const isCorrect = userAnswer.trim() === currentCharacter.character
    setFeedback(isCorrect ? "correct" : "incorrect")
    updateStats(isCorrect)
  }

  const handleMultipleChoice = (selectedChar: Character) => {
    const isCorrect = selectedChar.id === currentCharacter.id
    setSelectedChoice(selectedChar.id)
    setFeedback(isCorrect ? "correct" : "incorrect")
    updateStats(isCorrect)
  }

  const updateStats = (isCorrect: boolean) => {
    const existingStats = sessionStats.find((s) => s.characterId === currentCharacter.id)
    if (existingStats) {
      if (isCorrect) {
        existingStats.correct++
      } else {
        existingStats.incorrect++
      }
      existingStats.lastAttempt = Date.now()
    } else {
      sessionStats.push({
        characterId: currentCharacter.id,
        correct: isCorrect ? 1 : 0,
        incorrect: isCorrect ? 0 : 1,
        lastAttempt: Date.now(),
      })
    }

    setSessionStats([...sessionStats])
  }

  const handleNext = () => {
    setUserAnswer("")
    setSelectedChoice(null)
    setSelectedPinyin(null)
    setFeedback(null)
    setShowAnswer(false)
    setSelfAssessment(null)

    if (currentIndex < quizCharacters.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      if (quizType === "recognition") {
        generatePinyinOptions(nextIndex, quizCharacters)
      } else {
        generateMultipleChoiceOptions(nextIndex, quizCharacters)
      }
    } else {
      setQuizComplete(true)
      saveProgress()
    }
  }

  const saveProgress = async () => {
    const progressToSave: Record<string, { correct: number; incorrect: number }> = {}

    sessionStats.forEach((stat) => {
      progressToSave[stat.characterId] = {
        correct: stat.correct,
        incorrect: stat.incorrect,
      }
    })

    try {
      // Save cumulative progress
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progressToSave),
      })

      // Save quiz session history
      const correctCount = sessionStats.reduce((sum, s) => sum + s.correct, 0)
      const totalAttempts = sessionStats.reduce((sum, s) => sum + s.correct + s.incorrect, 0)
      const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

      const quizTypeLabels = {
        recognition: "Read",
        reverse: "Writing",
        "multiple-choice": "Multiple Choice",
      }

      await fetch("/api/quiz-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: Date.now(),
          quizType: quizTypeLabels[quizType as keyof typeof quizTypeLabels] || quizType,
          totalQuestions: quizCharacters.length,
          correctAnswers: correctCount,
          accuracy: accuracy,
        }),
      })
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  if (quizComplete) {
    const correctCount = sessionStats.reduce((sum, s) => sum + s.correct, 0)
    const totalAttempts = sessionStats.reduce((sum, s) => sum + s.correct + s.incorrect, 0)
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0

    return (
      <div className="text-center py-12 space-y-6">
        <h2 className="text-2xl font-bold text-indigo-900">Quiz Complete!</h2>
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <p className="text-5xl font-bold text-green-600 mb-2">{accuracy}%</p>
          <p className="text-gray-700">
            {correctCount} / {totalAttempts} Correct
          </p>
        </Card>
        <Button
          onClick={() => {
            setCurrentIndex(0)
            setSessionStats([])
            setQuizComplete(false)
            setFeedback(null)
            setUserAnswer("")
            setSelectedChoice(null)
            setSelectedPinyin(null)
            setQuizType(null)
            setCharacterCount(null)
            setQuizCharacters([])
            setShowAnswer(false)
            setSelfAssessment(null)
          }}
        >
          Try Another Quiz
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">
            {quizType === "recognition" && "Read Mode"}
            {quizType === "reverse" && "Writing Mode"}
            {quizType === "multiple-choice" && "Multiple Choice Mode"}
          </h2>
          <p className="text-sm text-gray-600">
            Character {currentIndex + 1} / {quizCharacters.length}
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Correct: {sessionStats.reduce((sum, s) => sum + s.correct, 0)} / Incorrect:{" "}
          {sessionStats.reduce((sum, s) => sum + s.incorrect, 0)}
        </div>
      </div>

      {quizType === "recognition" && (
        <>
          <Card className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 text-center">
            <p className="text-6xl font-bold text-indigo-600 mb-4">{currentCharacter.character}</p>
            <p className="text-lg text-gray-600">Meaning: {currentCharacter.meaning}</p>
          </Card>

          <div className="space-y-3">
            <label className="block text-sm font-medium">Select the correct Pinyin:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pinyinOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => !feedback && handleRecognitionAnswer(option)}
                  disabled={feedback !== null}
                  className={`p-4 rounded-lg border-2 transition-all font-semibold text-lg ${
                    selectedPinyin === option
                      ? option === currentCharacter.pinyin
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-red-500 bg-red-50 text-red-800"
                      : feedback && option === currentCharacter.pinyin
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-gray-300 hover:border-indigo-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {feedback && (
            <Card
              className={`p-4 text-center ${
                feedback === "correct"
                  ? "bg-green-100 border-green-300 text-green-800"
                  : "bg-red-100 border-red-300 text-red-800"
              }`}
            >
              <p className="font-semibold">
                {feedback === "correct" ? "Correct!" : `Incorrect. Correct answer: ${currentCharacter.pinyin}`}
              </p>
              <p className="text-sm mt-2 opacity-70">Next question in 2 seconds...</p>
            </Card>
          )}
        </>
      )}

      {quizType === "reverse" && (
        <>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 text-center">
            <p className="text-3xl font-bold text-purple-600 mb-2">{getPhraseHint(currentCharacter)}</p>
            <p className="text-xl text-gray-700">{currentCharacter.meaning}</p>
          </Card>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-center">Write the character:</label>
            <DrawingCanvas key={currentIndex} disabled={selfAssessment !== null} />
          </div>

          {!showAnswer && !selfAssessment && (
            <Button 
              onClick={() => setShowAnswer(true)} 
              className="w-full"
              style={{ maxWidth: "300px", margin: "0 auto", display: "block" }}
            >
              Show Answer
            </Button>
          )}

          {showAnswer && !selfAssessment && (
            <div className="space-y-4">
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 text-center">
                <p className="text-sm text-gray-600 mb-2">Correct character:</p>
                <p className="text-6xl font-bold text-blue-600">{currentCharacter.character}</p>
              </Card>
              
              <p className="text-center text-sm font-medium text-gray-700">Did you write it correctly?</p>
              <div className="flex gap-3" style={{ maxWidth: "300px", margin: "0 auto" }}>
                <Button 
                  onClick={() => {
                    setSelfAssessment("correct")
                    setFeedback("correct")
                    updateStats(true)
                  }} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  ✓ Yes
                </Button>
                <Button 
                  onClick={() => {
                    setSelfAssessment("incorrect")
                    setFeedback("incorrect")
                    updateStats(false)
                  }} 
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  ✗ No
                </Button>
              </div>
            </div>
          )}

          {selfAssessment && (
            <Card
              className={`p-4 text-center ${
                selfAssessment === "correct"
                  ? "bg-green-100 border-green-300 text-green-800"
                  : "bg-red-100 border-red-300 text-red-800"
              }`}
            >
              <p className="font-semibold">
                {selfAssessment === "correct" ? "Great job!" : "Keep practicing!"}
              </p>
              <p className="text-sm mt-2 opacity-70">Next question in 2 seconds...</p>
            </Card>
          )}
        </>
      )}

      {quizType === "multiple-choice" && (
        <>
          <Card className="p-8 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 text-center">
            <p className="text-sm text-gray-600 mb-4">Select the correct meaning:</p>
            <p className="text-6xl font-bold text-orange-600">{currentCharacter.character}</p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {multipleChoiceOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => !feedback && handleMultipleChoice(option)}
                disabled={feedback !== null}
                className={`p-4 rounded-lg border-2 transition-all font-semibold ${
                  selectedChoice === option.id
                    ? option.id === currentCharacter.id
                      ? "border-green-500 bg-green-50"
                      : "border-red-500 bg-red-50"
                    : "border-gray-300 hover:border-indigo-300"
                }`}
              >
                <p className="text-gray-600">{option.meaning}</p>
              </button>
            ))}
          </div>

          {feedback && (
            <Card
              className={`p-4 text-center ${
                feedback === "correct"
                  ? "bg-green-100 border-green-300 text-green-800"
                  : "bg-red-100 border-red-300 text-red-800"
              }`}
            >
              <p className="font-semibold">
                {feedback === "correct" ? "Correct!" : `Incorrect. Correct answer: ${currentCharacter.meaning}`}
              </p>
              <p className="text-sm mt-2 opacity-70">Next question in 2 seconds...</p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
