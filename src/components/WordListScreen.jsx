import { useState, useRef, useCallback, useEffect } from "react";
import { words } from "@/data/words";
import { usePhrases } from "@/hooks/usePhrases";
import { usePhraseBreakdown } from "@/hooks/usePhraseBreakdown";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Menu, Star, Loader2, ChevronDown, Check, Trash2, Volume2 } from "lucide-react";

export function WordListScreen({ progress, isMemorized, isDeleted, markAsMemorized, deleteWord, sidebarOpen, setSidebarOpen, onNavigate }) {
  const [expandedWord, setExpandedWord] = useState(null);
  const [phrases, setPhrases] = useState({});
  const [loadingWord, setLoadingWord] = useState(null);
  const { getPhrases } = usePhrases();

  // Breakdown modal state
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const { getBreakdown, loading: breakdownLoading, error: breakdownError } = usePhraseBreakdown();
  const { speak, isSpeaking, isLoading: isTTSLoading } = useTextToSpeech();

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ open: false, word: null, x: 0, y: 0 });
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const canCloseMenu = useRef(false);
  const scrollContainerRef = useRef(null);

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

  const openContextMenu = useCallback((word, x, element) => {
    canCloseMenu.current = false;

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const rect = element?.getBoundingClientRect();
    const scrollContainer = scrollContainerRef.current;
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    const containerTop = scrollContainer?.getBoundingClientRect().top || 0;

    setContextMenu({
      open: true,
      word,
      x: x,
      y: (rect?.top || 0) + scrollTop - containerTop
    });

    setTimeout(() => {
      canCloseMenu.current = true;
    }, 400);
  }, []);

  const handleContextMenu = useCallback((e, word) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(word, e.clientX, e.currentTarget);
  }, [openContextMenu]);

  // Use native touch events via ref callback
  const setupTouchHandlers = useCallback((element, word) => {
    if (!element) return;

    let timer = null;
    let triggered = false;
    let startX = 0;
    let startY = 0;

    const onTouchStart = (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      triggered = false;
      longPressTriggered.current = false;

      timer = setTimeout(() => {
        triggered = true;
        longPressTriggered.current = true;
        openContextMenu(word, startX, element);
      }, 500);
    };

    const onTouchMove = (e) => {
      if (timer) {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startX);
        const dy = Math.abs(touch.clientY - startY);
        if (dx > 20 || dy > 20) {
          clearTimeout(timer);
          timer = null;
        }
      }
    };

    const onTouchEnd = (e) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (triggered) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
    element.addEventListener('touchend', onTouchEnd, { passive: false });

    // Store cleanup function
    element._cleanupTouch = () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      if (timer) clearTimeout(timer);
    };
  }, [openContextMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup handled by ref callbacks
    };
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

  const handleSpeak = (e, text, id) => {
    e.stopPropagation();
    speak(text, id);
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
                className={index !== visibleWords.length - 1 ? 'border-b border-border/50' : ''}
              >
                <div
                  ref={(el) => {
                    if (el && !el._cleanupTouch) {
                      setupTouchHandlers(el, word);
                    }
                  }}
                  onClick={() => handleWordClick(word)}
                  onContextMenu={(e) => handleContextMenu(e, word)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors select-none"
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
                      <button
                        onClick={(e) => handleSpeak(e, word.japanese, `word-${word.id}`)}
                        className={`p-1 rounded-full hover:bg-accent transition-colors ${isSpeaking(`word-${word.id}`) ? 'text-primary' : 'text-muted-foreground'}`}
                        disabled={isTTSLoading(`word-${word.id}`)}
                      >
                        {isTTSLoading(`word-${word.id}`) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
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
                              <div className="flex items-center gap-2">
                                <p className="font-medium flex-1">{phrase.japanese}</p>
                                <button
                                  onClick={(e) => handleSpeak(e, phrase.japanese, `phrase-${word.id}-${i}`)}
                                  className={`p-1 rounded-full hover:bg-accent transition-colors ${isSpeaking(`phrase-${word.id}-${i}`) ? 'text-primary' : 'text-muted-foreground'}`}
                                  disabled={isTTSLoading(`phrase-${word.id}-${i}`)}
                                >
                                  {isTTSLoading(`phrase-${word.id}-${i}`) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Volume2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
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
