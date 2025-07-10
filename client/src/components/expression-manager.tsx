import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useExpressions } from "@/hooks/use-expressions";
import { useCategories } from "@/hooks/use-categories";
import { useLanguage } from "@/contexts/language-context";
import type { InsertExpression, InsertCategory, Expression, Category } from "@shared/schema";

export default function ExpressionManager() {
  const [newExpression, setNewExpression] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📝");
  const [newCategoryColor, setNewCategoryColor] = useState("from-blue-500 to-purple-500");
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingExpression, setEditingExpression] = useState<Expression | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("");
  const { toast } = useToast();
  const { expressions, refetch, updateExpression, deleteExpression } = useExpressions();
  const { categories, createCategory, updateCategory, deleteCategory, isCreating } = useCategories();
  const { t } = useLanguage();

  const addExpressionMutation = useMutation({
    mutationFn: async (data: InsertExpression) => {
      const response = await apiRequest("POST", "/api/expressions", data);
      return response.json();
    },
    onSuccess: () => {
      setNewExpression("");
      setSelectedCategoryId(null);
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

  const addCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      setNewCategoryName("");
      setNewCategoryIcon("📝");
      setNewCategoryColor("from-blue-500 to-purple-500");
      setIsCreateCategoryOpen(false);
      toast({
        title: "Success! 🎉",
        description: "Category created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create category",
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
      categoryId: selectedCategoryId,
    });
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    addCategoryMutation.mutate({
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      color: newCategoryColor,
    });
  };

  const handleEditExpression = (expression: Expression) => {
    setEditingExpression(expression);
    setEditText(expression.text);
    setEditCategoryId(expression.categoryId);
  };

  const handleUpdateExpression = () => {
    if (!editingExpression || !editText.trim()) return;

    updateExpression({
      id: editingExpression.id,
      text: editText.trim(),
      categoryId: editCategoryId,
    });

    setEditingExpression(null);
    setEditText("");
    setEditCategoryId(null);

    toast({
      title: "성공! 🎉",
      description: "표현이 수정되었습니다",
    });
  };

  const handleDeleteExpression = (id: number) => {
    deleteExpression(id);
    toast({
      title: "삭제됨 🗑️",
      description: "표현이 삭제되었습니다",
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryIcon(category.icon);
    setEditCategoryColor(category.color);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !editCategoryName.trim()) return;

    updateCategory({
      id: editingCategory.id,
      name: editCategoryName.trim(),
      icon: editCategoryIcon,
      color: editCategoryColor,
    });

    setEditingCategory(null);
    setEditCategoryName("");
    setEditCategoryIcon("");
    setEditCategoryColor("");

    toast({
      title: "성공! 🎉",
      description: "카테고리가 수정되었습니다",
    });
  };

  const handleDeleteCategory = (id: number) => {
    deleteCategory(id);
    toast({
      title: "삭제됨 🗑️",
      description: "카테고리가 삭제되었습니다",
    });
  };

  const groupedExpressions = expressions.reduce((acc, expr) => {
    const categoryId = expr.categoryId || "uncategorized";
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(expr);
    return acc;
  }, {} as Record<string | number, typeof expressions>);

  const colorOptions = [
    "from-blue-500 to-purple-500",
    "from-green-500 to-teal-500", 
    "from-purple-500 to-pink-500",
    "from-yellow-500 to-orange-500",
    "from-gray-500 to-slate-500",
    "from-indigo-500 to-blue-500",
    "from-red-500 to-pink-500",
    "from-cyan-500 to-blue-500",
  ];

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
            <div className="flex gap-2">
              <Select value={selectedCategoryId?.toString() || "uncategorized"} onValueChange={(value) => setSelectedCategoryId(value === "uncategorized" ? null : parseInt(value))}>
                <SelectTrigger className="flex-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl py-3 px-4 text-white border-white border-opacity-30">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">미분류</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white bg-opacity-20 hover:bg-opacity-30 border-white border-opacity-30 text-white px-3">
                    ➕
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                    <DialogDescription>
                      새로운 카테고리를 만들어 표현들을 분류해보세요.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category Name</label>
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g., Daily Conversations"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Icon</label>
                      <Input
                        value={newCategoryIcon}
                        onChange={(e) => setNewCategoryIcon(e.target.value)}
                        placeholder="📝"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Color Theme</label>
                      <div className="grid grid-cols-4 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewCategoryColor(color)}
                            className={`h-8 rounded-lg bg-gradient-to-r ${color} ${
                              newCategoryColor === color ? "ring-2 ring-blue-500" : ""
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleCreateCategory}
                        disabled={addCategoryMutation.isPending}
                        className="flex-1"
                      >
                        {addCategoryMutation.isPending ? "Creating..." : "Create Category"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreateCategoryOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
          const categoryExpressions = groupedExpressions[category.id] || [];
          if (categoryExpressions.length === 0) return null;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardHeader className={`bg-gradient-to-r ${category.color} text-white p-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-semibold flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.name}
                      </CardTitle>
                      <p className="text-xs opacity-90">
                        {categoryExpressions.length} expression{categoryExpressions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white hover:bg-opacity-20 p-1 h-7 w-7"
                        onClick={() => handleEditCategory(category)}
                      >
                        ✏️
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:bg-white hover:bg-opacity-20 p-1 h-7 w-7"
                          >
                            🗑️
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{category.name}" 카테고리를 삭제하시겠습니까? 이 카테고리에 속한 표현들은 미분류로 이동됩니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
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
                        <div className="flex items-center gap-2">
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
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="p-1 h-6 w-6 text-gray-600 hover:text-blue-600"
                              onClick={() => handleEditExpression(expr)}
                            >
                              ✏️
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="p-1 h-6 w-6 text-gray-600 hover:text-red-600"
                                >
                                  🗑️
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>표현 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{expr.text}" 표현을 삭제하시겠습니까?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteExpression(expr.id)}>
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        
        {/* Uncategorized expressions */}
        {groupedExpressions["uncategorized"] && groupedExpressions["uncategorized"].length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categories.length * 0.1 }}
          >
            <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-gray-500 to-slate-500 text-white p-4">
                <CardTitle className="font-semibold flex items-center gap-2">
                  <span>📋</span>
                  Uncategorized
                </CardTitle>
                <p className="text-xs opacity-90">
                  {groupedExpressions["uncategorized"].length} expression{groupedExpressions["uncategorized"].length !== 1 ? 's' : ''}
                </p>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {groupedExpressions["uncategorized"].map((expr) => {
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
        )}
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

      {/* Edit Expression Dialog */}
      <Dialog open={!!editingExpression} onOpenChange={() => setEditingExpression(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>표현 수정</DialogTitle>
            <DialogDescription>
              표현의 텍스트나 카테고리를 변경할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">표현 텍스트</label>
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="영어 표현을 입력하세요"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">카테고리</label>
              <Select value={editCategoryId?.toString() || "uncategorized"} onValueChange={(value) => setEditCategoryId(value === "uncategorized" ? null : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">미분류</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateExpression} className="flex-1">
                수정
              </Button>
              <Button variant="outline" onClick={() => setEditingExpression(null)} className="flex-1">
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>카테고리 수정</DialogTitle>
            <DialogDescription>
              카테고리의 이름, 아이콘, 색상을 변경할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">카테고리 이름</label>
              <Input
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                placeholder="카테고리 이름"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">아이콘</label>
              <Input
                value={editCategoryIcon}
                onChange={(e) => setEditCategoryIcon(e.target.value)}
                placeholder="📝"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">색상 테마</label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditCategoryColor(color)}
                    className={`h-8 rounded-lg bg-gradient-to-r ${color} ${
                      editCategoryColor === color ? "ring-2 ring-blue-500" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateCategory} className="flex-1">
                수정
              </Button>
              <Button variant="outline" onClick={() => setEditingCategory(null)} className="flex-1">
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
