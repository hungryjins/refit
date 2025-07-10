import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { UserStats } from "@shared/schema";

export default function NavigationHeader() {
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/stats"],
  });

  return (
    <header className="gradient-primary text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div 
              className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-lg">💬</span>
            </motion.div>
            <div>
              <h1 className="text-xl font-bold">Convo</h1>
              <p className="text-xs opacity-90">Master conversations daily</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-xs opacity-90">Streak</p>
              <motion.p 
                className="font-bold flex items-center gap-1"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {stats?.currentStreak || 0} days 🔥
              </motion.p>
            </div>
            <motion.div 
              className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-sm">👤</span>
            </motion.div>
          </div>
        </div>
      </div>
    </header>
  );
}
