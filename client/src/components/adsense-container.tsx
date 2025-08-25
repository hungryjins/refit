import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface AdSenseContainerProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal";
  className?: string;
  style?: "minimal" | "gradient" | "outlined";
}

export default function AdSenseContainer({
  slot = "your-ad-slot-id",
  format = "auto",
  className = "",
  style = "minimal",
}: AdSenseContainerProps) {
  const containerStyles = {
    minimal: "bg-gray-50 border border-gray-200 rounded-lg",
    gradient: "gradient-secondary rounded-xl shadow-lg",
    outlined: "border-2 border-dashed border-gray-300 rounded-lg bg-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${containerStyles[style]} ${className}`}
    >
      <div className="p-4 text-center">
        {/* AdSense code goes here */}
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-xxxxxxxxxx" // Replace with actual AdSense client ID
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />

        {/* Placeholder shown in development environment */}
        {import.meta.env.DEV && (
          <div className="text-sm text-gray-500 py-8 px-4 bg-gray-100 rounded border-2 border-dashed border-gray-300">
            <div className="text-lg mb-2">📢 AdSense Ad Area</div>
            <div>Ads will be displayed in production</div>
            <div className="text-xs mt-2 opacity-70">
              Format: {format} | Slot: {slot}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// AdSense type declaration
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// Function to initialize AdSense script
export function initializeAdSense() {
  if (typeof window !== "undefined") {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.log("AdSense initialization error:", e);
    }
  }
}
