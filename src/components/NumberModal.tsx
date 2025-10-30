import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  number: string;
}

const NumberModal = ({ isOpen, onClose, number }: NumberModalProps) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(number);
    toast({
      title: "Nomor berhasil disalin",
      description: "Nomor telah disalin ke clipboard",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Nomor Dokumen Anda</DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          <div className="bg-muted rounded-lg p-6 text-center">
            <p className="text-2xl font-bold text-primary break-all">
              {number}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleCopy} className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            Copy Nomor
          </Button>
          <Button onClick={onClose} variant="outline" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NumberModal;
