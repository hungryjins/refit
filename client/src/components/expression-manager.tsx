import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useExpressions } from "@/hooks/use-expressions";
import type { InsertExpression } from "@shared/schema";

const categories = [
  { value: "greeting", label: "Greetings & Introductions", icon: "👋", color: "from-blue-500 to-purple-500" },
  { value: "ordering", label: "Restaurant & Food", icon: "🍽️", color: "from-green-500 to-teal-500" },
  { value: "asking", label: "Questions & Requests", icon: "❓", color: "from-purple-500 to-pink-500" },
  { value: "compliment", label: "Compliments & Praise", icon: "🌟", color: "from-yellow-500 to-orange-500" },
  { value: "business", label: "Business & Work", icon: "💼", color: "from-gray-500 to-slate-500" },
  { value: "travel", label: "Travel & Directions", icon: "🗺️", color: "from-indigo-500 to-blue-500" },
];

export default function ExpressionManager() {
  const [newExpression, setNewExpression] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { toast } = useToast();
  const { expressions, refetch } = useExpressions();

  const addExpressionMutation = useMutation({
    mutationFn: async (data: InsertExpression) => {
      const response = await apiRequest("POST", "/api/expressions", data);
      return response.json();
    },
    onSuccess: () => {
      setNewExpression("");
      setSelectedCategory("");
      refetch();
      toast({
        title: "Success! 🎉",
        description: "Expression added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add expression",
        variant: "destructive",
      });
    },
  });

  const handleAddExpression = () => {
    if (!newExpression.trim()) {
      toast({
        title: "Error",
        description: "Please enter an expression",
        variant: "destructive",
      });
      return;
    }

    addExpressionMutation.mutate({
      text: newExpression.trim(),
      category: selectedCategory || null,
    });
  };

  const groupedExpressions = expressions.reduce((acc, expr) => {
    const category = expr.category || "uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(expr);
    return acc;
  }, {} as Record<string, typeof expressions>);

  return (
    <div className="space-y-6">
      {/* Add New Expression */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-primary rounded-2xl shadow-lg p-6 text-white"
      >
        <h3 className="text-xl font-bold mb-4 flex items-center">
          ➕ Add New Expression
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 opacity-90">
              English Expression
            </label>
            <Input
              value={newExpression}
              onChange={(e) => setNewExpression(e.target.value)}
              placeholder="e.g., Could you please help me with..."
              className="w-full bg-white bg-opacity-20 backdrop-blur-sm rounded-xl py-3 px-4 text-white placeholder-white placeholder-opacity-70 border-white border-opacity-30 focus:ring-2 focus:ring-white focus:ring-opacity-50"
              onKeyPress={(e) => e.key === "Enter" && handleAddExpression()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 opacity-90">
              Category (Optional)
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full bg-white bg-opacity-20 backdrop-blur-sm rounded-xl py-3 px-4 text-white border-white border-opacity-30">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddExpression}
            disabled={addExpressionMutation.isPending}
            className="w-full bg-white text-primary-600 font-semibold py-3 rounded-xl hover:bg-opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {addExpressionMutation.isPending ? "Saving..." : "💾 Save Expression"}
          </Button>
        </div>
      </motion.div>

      {/* Expression Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category, index) => {
          const categoryExpressions = groupedExpressions[category.value] || [];
          if (categoryExpressions.length === 0) return null;

          return (
            <motion.div
              key={category.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardHeader className={`bg-gradient-to-r ${category.color} text-white p-4`}>
                  <CardTitle className="font-semibold flex items-center gap-2">
                    <span>{category.icon}</span>
                    {category.label}
                  </CardTitle>
                  <p className="text-xs opacity-90">
                    {categoryExpressions.length} expression{categoryExpressions.length !== 1 ? 's' : ''}
                  </p>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {categoryExpressions.map((expr) => {
                    const accuracy = expr.totalCount > 0 
                      ? Math.round((expr.correctCount / expr.totalCount) * 100)
                      : 0;
                    
                    return (
                      <motion.div
                        key={expr.id}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            "{expr.text}"
                          </p>
                          <p className="text-xs text-gray-600">
                            Used {expr.totalCount} time{expr.totalCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-medium ${
                            accuracy >= 80 ? "text-green-600" : 
                            accuracy >= 60 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {expr.totalCount > 0 ? `${accuracy}%` : "New"}
                          </div>
                          {expr.totalCount > 0 && (
                            <div className="text-xs text-gray-500">
                              {expr.correctCount}/{expr.totalCount}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {expressions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No expressions yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start by adding your first English expression above!
          </p>
        </motion.div>
      )}
    </div>
  );
}
