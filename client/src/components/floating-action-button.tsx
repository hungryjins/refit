import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface FloatingActionButtonProps {
  onAdd: () => void;
}

export default function FloatingActionButton({ onAdd }: FloatingActionButtonProps) {
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={onAdd}
          size="lg"
          className="w-14 h-14 gradient-primary text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <span className="text-lg">➕</span>
        </Button>
      </motion.div>
    </motion.div>
  );
}
