import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Check, X, Loader2 } from "lucide-react";

export function FlashCard({ word, onSwipe, score, example, exampleLoading, onFlip }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [exitX, setExitX] = useState(0);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const rightIndicatorOpacity = useTransform(x, [0, 100], [0, 1]);
  const leftIndicatorOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) {
      setExitX(300);
      onSwipe(true);
    } else if (info.offset.x < -100) {
      setExitX(-300);
      onSwipe(false);
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
    }
  };

  return (
    <motion.div
      className="absolute w-full"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={{ x: exitX }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Swipe indicators */}
      <motion.div
        className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full bg-red-500/20 p-3"
        style={{ opacity: leftIndicatorOpacity }}
      >
        <X className="h-8 w-8 text-red-500" />
      </motion.div>
      <motion.div
        className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-green-500/20 p-3"
        style={{ opacity: rightIndicatorOpacity }}
      >
        <Check className="h-8 w-8 text-green-500" />
      </motion.div>

      <Card
        className="mx-auto w-full max-w-sm cursor-grab active:cursor-grabbing select-none"
        onClick={() => {
          if (!isFlipped && onFlip) {
            onFlip(word);
          }
          setIsFlipped(!isFlipped);
        }}
      >
        <div className="flex min-h-[300px] flex-col items-center justify-center p-6">
          {!isFlipped ? (
            <>
              <p className="text-5xl font-bold mb-2">{word.japanese}</p>
              <p className="text-muted-foreground text-lg">{word.romaji}</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold mb-1">{word.japanese}</p>
              <p className="text-xl text-primary mb-1">{word.english}</p>
              <p className="text-muted-foreground mb-4">{word.romaji}</p>

              <div className="w-full border-t pt-3 mt-2">
                {exampleLoading ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading example...</span>
                  </div>
                ) : example ? (
                  <div className="text-center">
                    <p className="font-medium">{example.japanese}</p>
                    <p className="text-sm text-muted-foreground">{example.romaji}</p>
                    <p className="text-sm text-primary">{example.english}</p>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
        <div className="border-t px-4 py-3 flex justify-between items-center text-sm text-muted-foreground">
          <span>#{word.id}</span>
          <span>Score: {score.toFixed(1)}</span>
        </div>
      </Card>
    </motion.div>
  );
}
