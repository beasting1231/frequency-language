import { useState, useRef, useCallback, useEffect } from "react";
import { words } from "@/data/words";
import { usePhrases } from "@/hooks/usePhrases";
import { usePhraseBreakdown } from "@/hooks/usePhraseBreakdown";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Menu, Star, Loader2, ChevronDown, Check, Trash2 } from "lucide-react";

export function WordListScreen({ progress, isMemorized, isDeleted, markAsMemorized, deleteWord, sidebarOpen, setSidebarOpen, onNavigate }) {
  const [expandedWord, setExpandedWord] = useState(null);
  const [phrases, setPhrases] = useState({});
  const [loadingWord, setLoadingWord] = useState(null);
  const { getPhrases } = usePhrases();

  // Breakdown modal state
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const { getBreakdown, loading: breakdownLoading, error: breakdownError } = usePhraseBreakdown();

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ open: false, word: null, x: 0, y: 0 });
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const canCloseMenu = useRef(false);
  const scrollContainerRef = useRef(null);
  const wordRefs = useRef({});

  // Close menu on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !contextMenu.open) return;

    const handleScroll = () => {
      if (contextMenu.open) {
        setContextMenu({ open: false, word: null, x: 0, y: 0 });
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [contextMenu.open]);

  const handleContextMenu = useCallback((e, word) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const scrollContainer = scrollContainerRef.current;
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    canCloseMenu.current = false;
    setContextMenu({
      open: true,
      word,
      x: e.clientX,
      y: rect.top + scrollTop - (scrollContainer?.getBoundingClientRect().top || 0)
    });

    setTimeout(() => {
      canCloseMenu.current = true;
    }, 400);
  }, []);

  const touchStartPos = useRef({ x: 0, y: 0 });
  const touchStartTime = useRef(0);

  const handleTouchStart = useCallback((e, word) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchStartTime.current = Date.now();
    longPressTriggered.current = false;

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      canCloseMenu.current = false;

      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      const rect = e.target.closest('[data-word-item]')?.getBoundingClientRect();
      const scrollContainer = scrollContainerRef.current;
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const containerTop = scrollContainer?.getBoundingClientRect().top || 0;

      setContextMenu({
        open: true,
        word,
        x: touchStartPos.current.x,
        y: (rect?.top || touchStartPos.current.y) + scrollTop - containerTop
      });

      setTimeout(() => {
        canCloseMenu.current = true;
      }, 400);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (longPressTriggered.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (longPressTimer.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  }, []);

  const closeContextMenu = useCallback(() => {
    if (!canCloseMenu.current) return;
    setContextMenu({ open: false, word: null, x: 0, y: 0 });
  }, []);

  const forceCloseContextMenu = useCallback(() => {
    setContextMenu({ open: false, word: null, x: 0, y: 0 });
  }, []);

  const handleMarkAsMemorized = useCallback(() => {
    if (contextMenu.word) {
      markAsMemorized(contextMenu.word.id);
    }
    forceCloseContextMenu();
  }, [contextMenu.word, markAsMemorized, forceCloseContextMenu]);

  const handleDeleteWord = useCallback(() => {
    if (contextMenu.word) {
      deleteWord(contextMenu.word.id);
    }
    forceCloseContextMenu();
  }, [contextMenu.word, deleteWord, forceCloseContextMenu]);

  const getWordStatus = (wordId) => {
    const wordProgress = progress[wordId];
    if (!wordProgress) return { score: null, mastered: false };
    return {
      score: wordProgress.score,
      mastered: isMemorized(wordId),
    };
  };

  const handleWordClick = async (word) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    if (expandedWord === word.id) {
      setExpandedWord(null);
      return;
    }

    setExpandedWord(word.id);

    if (!phrases[word.id]) {
      setLoadingWord(word.id);
      const result = await getPhrases(word);
      if (result) {
        setPhrases(prev => ({ ...prev, [word.id]: result }));
      }
      setLoadingWord(null);
    }
  };

  const handlePhraseClick = async (phrase, wordId, phraseIndex, e) => {
    e.stopPropagation();
    setSelectedPhrase(phrase);
    setBreakdown(null);
    const result = await getBreakdown(phrase, wordId, phraseIndex);
    if (result) {
      setBreakdown(result);
    }
  };

  const handleCloseBreakdown = () => {
    setSelectedPhrase(null);
    setBreakdown(null);
  };

  // Filter out deleted words
  const visibleWords = words.filter(word => !isDeleted(word.id));
  const masteredCount = visibleWords.filter(word => isMemorized(word.id)).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Sidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        onNavigate={onNavigate}
      />

      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <span className="font-semibold">Word List</span>
            <p className="text-sm text-muted-foreground">
              {masteredCount} / {visibleWords.length} mastered
            </p>
          </div>
        </div>
      </header>

      {/* Word list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 relative">
        <Card className="mx-auto max-w-xl">
          {visibleWords.map((word, index) => {
            const { score, mastered } = getWordStatus(word.id);
            const isExpanded = expandedWord === word.id;
            const isLoading = loadingWord === word.id;
            const wordPhrases = phrases[word.id];

            return (
              <div
                key={word.id}
                data-word-item
                ref={el => wordRefs.current[word.id] = el}
                className={index !== visibleWords.length - 1 ? 'border-b border-border/50' : ''}
              >
                <div
                  onClick={() => handleWordClick(word)}
                  onContextMenu={(e) => handleContextMenu(e, word)}
                  onTouchStart={(e) => handleTouchStart(e, word)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors select-none"
                  style={{ touchAction: 'pan-y' }}
                >
                  <div className="w-6 flex justify-center">
                    {mastered && (
                      <Star className="h-4 w-4 fill-primary text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">{word.japanese}</span>
                      <span className="text-muted-foreground">{word.romaji}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {word.english}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {score !== null && (
                      <span className={`text-sm font-medium ${mastered ? 'text-primary' : 'text-muted-foreground'}`}>
                        {score.toFixed(1)}
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1">
                    <div className="ml-6 pl-3 border-l-2 border-primary/30">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Example Phrases</p>

                      {isLoading && (
                        <div className="flex items-center gap-2 py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Generating...</span>
                        </div>
                      )}

                      {!isLoading && wordPhrases && (
                        <div className="space-y-2">
                          {wordPhrases.map((phrase, i) => (
                            <div
                              key={i}
                              onClick={(e) => handlePhraseClick(phrase, word.id, i, e)}
                              className="p-2 rounded bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors"
                            >
                              <p className="font-medium">{phrase.japanese}</p>
                              <p className="text-muted-foreground text-sm">{phrase.romaji}</p>
                              <p className="text-sm">{phrase.english}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {/* Context Menu - positioned within scroll container */}
        {contextMenu.open && (
          <div
            className="absolute z-50 min-w-[160px] rounded-lg border bg-popover p-1 shadow-lg"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 170),
              top: contextMenu.y,
            }}
          >
            <button
              onTouchEnd={(e) => { e.preventDefault(); handleMarkAsMemorized(); }}
              onClick={handleMarkAsMemorized}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <Check className="h-4 w-4" />
              Mark as memorized
            </button>
            <button
              onTouchEnd={(e) => { e.preventDefault(); handleDeleteWord(); }}
              onClick={handleDeleteWord}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-accent transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete word
            </button>
          </div>
        )}
      </div>

      {/* Overlay to close context menu */}
      {contextMenu.open && (
        <div
          className="fixed inset-0 z-40"
          onTouchEnd={(e) => { e.preventDefault(); closeContextMenu(); }}
          onClick={closeContextMenu}
        />
      )}

      {/* Phrase breakdown modal */}
      <Dialog open={!!selectedPhrase} onOpenChange={handleCloseBreakdown}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {selectedPhrase && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {selectedPhrase.japanese}
                </DialogTitle>
                <p className="text-muted-foreground">{selectedPhrase.romaji}</p>
                <p className="text-primary">{selectedPhrase.english}</p>
              </DialogHeader>

              <div className="mt-4">
                {breakdownLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Analyzing sentence...</span>
                  </div>
                )}

                {!breakdownLoading && breakdownError && (
                  <div className="py-4 text-center">
                    <p className="text-red-500 text-sm">Failed to load breakdown.</p>
                    <p className="text-muted-foreground text-xs mt-1">Check Firestore rules include "breakdowns" collection.</p>
                  </div>
                )}

                {!breakdownLoading && !breakdownError && breakdown && breakdown.words && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Word by Word</h3>
                      <div className="space-y-2">
                        {breakdown.words.map((word, i) => (
                          <div key={i} className="p-3 rounded-lg bg-accent/30">
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold">{word.japanese}</span>
                              <span className="text-muted-foreground text-sm">{word.romaji}</span>
                            </div>
                            <p className="text-primary text-sm">{word.meaning}</p>
                            <p className="text-xs text-muted-foreground mt-1">{word.role}</p>
                            {word.dictionaryForm && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Dictionary form: <span className="font-medium">{word.dictionaryForm}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {breakdown.explanation && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">How it works</h3>
                        <p className="text-sm leading-relaxed">{breakdown.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
