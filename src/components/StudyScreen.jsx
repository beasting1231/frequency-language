import { useState, useEffect } from "react";
import { words } from "@/data/words";
import { useWordProgress } from "@/hooks/useWordProgress";
import { FlashCard } from "@/components/FlashCard";
import { Sidebar } from "@/components/Sidebar";
import { WordListScreen } from "@/components/WordListScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Menu, Trophy, TrendingUp } from "lucide-react";

export function StudyScreen({ user }) {
  const { loading, progress, updateWordScore, getWordScore, getStudyWords, getStats } = useWordProgress(user.uid);
  const [studyQueue, setStudyQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [showStats, setShowStats] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("study");

  useEffect(() => {
    if (!loading) {
      const queue = getStudyWords(words, 20);
      setStudyQueue(queue);
    }
  }, [loading, getStudyWords]);

  const handleSwipe = async (isCorrect) => {
    const currentWord = studyQueue[currentIndex];
    await updateWordScore(currentWord.id, isCorrect);

    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));

    if (currentIndex < studyQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowStats(true);
    }
  };

  const handleRestart = () => {
    const queue = getStudyWords(words, 20);
    setStudyQueue(queue);
    setCurrentIndex(0);
    setSessionStats({ correct: 0, incorrect: 0 });
    setShowStats(false);
  };

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (currentScreen === "words") {
    return (
      <WordListScreen
        progress={progress}
        onBack={() => setCurrentScreen("study")}
      />
    );
  }

  if (showStats) {
    const accuracy = sessionStats.correct + sessionStats.incorrect > 0
      ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)
      : 0;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Session Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-green-500">{sessionStats.correct}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-500">{sessionStats.incorrect}</p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">{accuracy}%</p>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </div>
            <Button onClick={handleRestart} className="w-full gap-2">
              <RotateCcw className="h-4 w-4" />
              Study More
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentWord = studyQueue[currentIndex];

  return (
    <div className="flex min-h-screen flex-col">
      <Sidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onNavigate={handleNavigate}
      />

      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Frequency</span>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b px-4 py-2">
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-primary" />
            <span>{stats.mastered} mastered</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>Avg: {stats.avgScore}</span>
          </div>
          <span className="text-muted-foreground">
            {currentIndex + 1} / {studyQueue.length}
          </span>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm h-[400px]">
          {currentWord && (
            <FlashCard
              key={currentWord.id + "-" + currentIndex}
              word={currentWord}
              score={getWordScore(currentWord.id)}
              onSwipe={handleSwipe}
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
        <p>Swipe right if you know it, left if you don't</p>
      </div>
    </div>
  );
}
