import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KeyboardShortcutsModal = ({ open, onOpenChange }: KeyboardShortcutsModalProps) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    {
      section: "general",
      items: [
        { keys: [`${modKey}`, "K"], action: "quick capture (create new task)" },
        { keys: ["?"], action: "show keyboard shortcuts" },
        { keys: ["Esc"], action: "close modal/cancel action" },
      ]
    },
    {
      section: "navigation",
      items: [
        { keys: ["G", "P"], action: "go to planning" },
        { keys: ["G", "C"], action: "go to calendar" },
        { keys: ["G", "L"], action: "go to clients" },
        { keys: ["G", "M"], action: "go to money" },
        { keys: ["G", "T"], action: "go to today" },
      ]
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="lowercase text-xl">keyboard shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {shortcuts.map((section) => (
            <div key={section.section}>
              <h3 className="text-sm font-semibold lowercase mb-3 text-muted-foreground">
                {section.section}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                  >
                    <span className="text-sm lowercase">{shortcut.action}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs px-2 py-1"
                          >
                            {key}
                          </Badge>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-muted-foreground lowercase border-t pt-4">
          press <Badge variant="outline" className="font-mono mx-1">?</Badge> to toggle this menu
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsModal;
