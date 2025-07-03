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
  style = "minimal"
}: AdSenseContainerProps) {
  
  const containerStyles = {
    minimal: "bg-gray-50 border border-gray-200 rounded-lg",
    gradient: "gradient-secondary rounded-xl shadow-lg",
    outlined: "border-2 border-dashed border-gray-300 rounded-lg bg-white"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${containerStyles[style]} ${className}`}
    >
      <div className="p-4 text-center">
        {/* AdSense 코드가 여기에 들어갑니다 */}
        <ins 
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-xxxxxxxxxx" // 실제 AdSense 클라이언트 ID로 교체
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
        
        {/* 개발 환경에서 보이는 플레이스홀더 */}
        {import.meta.env.DEV && (
          <div className="text-sm text-gray-500 py-8 px-4 bg-gray-100 rounded border-2 border-dashed border-gray-300">
            <div className="text-lg mb-2">📢 AdSense 광고 영역</div>
            <div>실제 배포시 광고가 표시됩니다</div>
            <div className="text-xs mt-2 opacity-70">Format: {format} | Slot: {slot}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// AdSense 타입 선언
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

// AdSense 스크립트를 초기화하는 함수
export function initializeAdSense() {
  if (typeof window !== 'undefined') {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.log('AdSense initialization error:', e);
    }
  }
}