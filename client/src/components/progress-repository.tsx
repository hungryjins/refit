import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpressions } from "@/hooks/use-expressions";
import type { UserStats, Achievement } from "@shared/schema";

interface ProgressRingProps {
  percentage: number;
  size?: number;
}

function ProgressRing({ percentage, size = 64 }: ProgressRingProps) {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  const getColor = (percent: number) => {
    if (percent >= 80) return "#10b981"; // green
    if (percent >= 60) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="progress-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#e5e7eb"
          strokeWidth="3"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={getColor(percentage)}
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color: getColor(percentage) }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export default function ProgressRepository() {
  const { expressions } = useExpressions();
  
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/stats"],
  });

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ["/api/achievements"],
  });

  const totalExpressions = expressions.length;
  const totalAttempts = expressions.reduce((sum, expr) => sum + expr.totalCount, 0);
  const totalCorrect = expressions.reduce((sum, expr) => sum + expr.correctCount, 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const achievementTypes = [
    { type: "streak", title: "7-Day Streak", description: "Keep it up!", icon: "🔥", color: "from-yellow-50 to-orange-50", borderColor: "border-yellow-200", bgColor: "bg-yellow-500" },
    { type: "perfect", title: "First Perfect", description: "100% accuracy", icon: "⭐", color: "from-green-50 to-emerald-50", borderColor: "border-green-200", bgColor: "bg-green-500" },
    { type: "learner", title: "Quick Learner", description: "10+ expressions", icon: "🎓", color: "from-blue-50 to-indigo-50", borderColor: "border-blue-200", bgColor: "bg-blue-500" },
    { type: "conversationalist", title: "Conversation Pro", description: "20+ sessions", icon: "💬", color: "from-purple-50 to-pink-50", borderColor: "border-purple-200", bgColor: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="gradient-primary text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Total Expressions</p>
                  <motion.p 
                    className="text-3xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    {totalExpressions}
                  </motion.p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">📚</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="gradient-success text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Overall Accuracy</p>
                  <motion.p 
                    className="text-3xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    {overallAccuracy}%
                  </motion.p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="gradient-warning text-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Practice Sessions</p>
                  <motion.p 
                    className="text-3xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                  >
                    {stats?.totalSessions || 0}
                  </motion.p>
                </div>
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <span className="text-xl">📈</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-yellow-500 text-xl">🏆</span>
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievementTypes.map((achievement, index) => (
                <motion.div
                  key={achievement.type}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={`text-center p-4 bg-gradient-to-br ${achievement.color} rounded-xl border ${achievement.borderColor}`}
                >
                  <div className={`w-12 h-12 ${achievement.bgColor} text-white rounded-full flex items-center justify-center mx-auto mb-2`}>
                    <span className="text-lg">{achievement.icon}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{achievement.title}</p>
                  <p className="text-xs text-gray-600">{achievement.description}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Expression Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-primary text-xl">📊</span>
              Expression Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expressions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600">No expressions to track yet. Add some expressions to see your progress!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expressions
                  .filter(expr => expr.totalCount > 0)
                  .sort((a, b) => {
                    const aAccuracy = a.totalCount > 0 ? (a.correctCount / a.totalCount) * 100 : 0;
                    const bAccuracy = b.totalCount > 0 ? (b.correctCount / b.totalCount) * 100 : 0;
                    return bAccuracy - aAccuracy;
                  })
                  .map((expr, index) => {
                    const accuracy = expr.totalCount > 0 ? Math.round((expr.correctCount / expr.totalCount) * 100) : 0;
                    const daysSinceLastUsed = expr.lastUsed 
                      ? Math.floor((new Date().getTime() - new Date(expr.lastUsed).getTime()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <motion.div
                        key={expr.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-4">
                          <ProgressRing percentage={accuracy} />
                          <div>
                            <p className="font-semibold text-gray-800">"{expr.text}"</p>
                            <p className="text-sm text-gray-600">{expr.category || "General"} category</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span>✅ {expr.correctCount} correct</span>
                              <span>❌ {expr.totalCount - expr.correctCount} incorrect</span>
                              <span>📅 Last used: {daysSinceLastUsed !== null ? `${daysSinceLastUsed} days ago` : "Never"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">
                            {expr.correctCount}/{expr.totalCount}
                          </div>
                          <p className="text-xs text-gray-600">attempts</p>
                          {accuracy === 100 && expr.totalCount >= 3 && (
                            <div className="text-xs text-green-600 font-medium">🎉 Perfect!</div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                {expressions.filter(expr => expr.totalCount === 0).length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="font-medium text-gray-700 mb-3">Unused Expressions</h4>
                    <div className="space-y-2">
                      {expressions
                        .filter(expr => expr.totalCount === 0)
                        .map((expr) => (
                          <div key={expr.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-800">"{expr.text}"</p>
                              <p className="text-xs text-gray-600">{expr.category || "General"} category</p>
                            </div>
                            <div className="text-xs text-yellow-600 font-medium">Ready to practice</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
