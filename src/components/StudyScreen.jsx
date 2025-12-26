import { useState, useEffect } from "react";
import { words } from "@/data/words";
import { useWordProgress } from "@/hooks/useWordProgress";
import { useExampleSentence } from "@/hooks/useExampleSentence";
import { FlashCard } from "@/components/FlashCard";
import { Sidebar } from "@/components/Sidebar";
import { WordListScreen } from "@/components/WordListScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotateCcw, Menu, Trophy, TrendingUp, Settings, Minus, Plus } from "lucide-react";

export function StudyScreen({ user }) {
  const { loading, progress, updateWordScore, getWordScore, getStudyWords, getStats, isMemorized, isDeleted, markAsMemorized, deleteWord } = useWordProgress(user.uid);
  const { getExample, getExampleSync, isLoading: isExampleLoading } = useExampleSentence();
  const [studyQueue, setStudyQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [showStats, setShowStats] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState("words");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wordCount, setWordCount] = useState(20);
  const [excludeMemorized, setExcludeMemorized] = useState(true);
  const [randomOrder, setRandomOrder] = useState(true);

  useEffect(() => {
    if (!loading && currentScreen === "study") {
      const queue = getStudyWords(words, { count: wordCount, excludeMemorized, randomOrder });
      setStudyQueue(queue);
    }
  }, [loading, getStudyWords, wordCount, excludeMemorized, randomOrder, currentScreen]);

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
    const queue = getStudyWords(words, { count: wordCount, excludeMemorized, randomOrder });
    setStudyQueue(queue);
    setCurrentIndex(0);
    setSessionStats({ correct: 0, incorrect: 0 });
    setShowStats(false);
  };

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
  };

  const handleFlip = (word) => {
    getExample(word);
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
        isMemorized={isMemorized}
        isDeleted={isDeleted}
        markAsMemorized={markAsMemorized}
        deleteWord={deleteWord}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigate={handleNavigate}
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
          <span className="font-semibold">Study</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-[280px]">
          <DialogHeader>
            <DialogTitle>Study Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Words to study</label>
              <p className="text-xs text-muted-foreground">Sequential from word 1</p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWordCount(Math.max(1, wordCount - 1))}
                  disabled={wordCount <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center">{wordCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWordCount(Math.min(500, wordCount + 1))}
                  disabled={wordCount >= 500}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Exclude memorized</label>
                <p className="text-xs text-muted-foreground">10+ correct, 90%+ acc</p>
              </div>
              <Button
                variant={excludeMemorized ? "default" : "outline"}
                size="sm"
                onClick={() => setExcludeMemorized(!excludeMemorized)}
              >
                {excludeMemorized ? "On" : "Off"}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Random order</label>
              <Button
                variant={randomOrder ? "default" : "outline"}
                size="sm"
                onClick={() => setRandomOrder(!randomOrder)}
              >
                {randomOrder ? "On" : "Off"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              onFlip={handleFlip}
              example={getExampleSync(currentWord.id)}
              exampleLoading={isExampleLoading(currentWord.id)}
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
