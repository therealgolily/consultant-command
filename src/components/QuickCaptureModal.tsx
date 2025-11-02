import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QuickCaptureForm from "./QuickCaptureForm";

interface QuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDueDate?: Date;
}

const QuickCaptureModal = ({ open, onOpenChange, initialDueDate }: QuickCaptureModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="lowercase text-base">quick capture</DialogTitle>
        </DialogHeader>
        <QuickCaptureForm onSuccess={() => onOpenChange(false)} initialDueDate={initialDueDate} />
      </DialogContent>
    </Dialog>
  );
};

export default QuickCaptureModal;