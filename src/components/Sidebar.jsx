import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, GraduationCap } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";

export function Sidebar({ open, onOpenChange, onNavigate }) {
  const handleLogout = () => {
    signOut(auth);
    onOpenChange(false);
  };

  const handleNavClick = (screen) => {
    onNavigate(screen);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Frequency</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 p-2 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavClick("words")}
          >
            <BookOpen className="h-5 w-5" />
            Word List
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavClick("study")}
          >
            <GraduationCap className="h-5 w-5" />
            Study
          </Button>
        </nav>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Log out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
