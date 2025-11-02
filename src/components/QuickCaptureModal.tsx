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
}

const QuickCaptureModal = ({ open, onOpenChange }: QuickCaptureModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="lowercase text-base">quick capture</DialogTitle>
        </DialogHeader>
        <QuickCaptureForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default QuickCaptureModal;