import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, Target, Zap, Clock, Trophy, BarChart3, Brain, Star } from "lucide-react";

interface DifficultyAnalysis {
  currentLevel: number;
  suggestedLevel: number;
  confidence: number;
  reasoning: string;
  performanceTrend: 'improving' | 'stable' | 'declining';
}

interface PersonalizedChallenge {
  id: string;
  type: 'speed' | 'accuracy' | 'complexity' | 'endurance';
  title: string;
  description: string;
  targetMetric: number;
  currentMetric: number;
  difficulty: number;
  reward: string;
  timeLimit?: number;
  expressions: any[];
}

interface AdaptiveChallenge {
  id: number;
  challengeType: string;
  difficultyLevel: number;
  targetMetric: number;
  isCompleted: boolean;
  reward: string;
  createdAt: string;
  expiresAt?: string;
}

interface PerformanceAnalytics {
  id: number;
  responseTime: number;
  accuracyScore: number;
  difficultyAttempted: number;
  confidenceScore: number;
  improvementSuggestion: string;
  createdAt: string;
}

export default function AdaptiveDifficulty() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId] = useState('guest'); // For guest mode - in real app would get from auth

  // Fetch difficulty analysis
  const { data: analysis, isLoading: analysisLoading } = useQuery<DifficultyAnalysis>({
    queryKey: [`/api/adaptive/analysis/${userId}`],
    retry: false,
  });

  // Fetch personalized challenges
  const { data: personalizedChallenges, isLoading: challengesLoading } = useQuery<PersonalizedChallenge[]>({
    queryKey: [`/api/adaptive/challenges/${userId}`],
    retry: false,
  });

  // Fetch user's challenges
  const { data: userChallenges, isLoading: userChallengesLoading } = useQuery<AdaptiveChallenge[]>({
    queryKey: [`/api/challenges/${userId}`],
    retry: false,
  });

  // Fetch performance analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<PerformanceAnalytics[]>({
    queryKey: [`/api/analytics/${userId}`, { limit: 10 }],
    retry: false,
  });

  // Create challenge mutation
  const createChallengeMutation = useMutation({
    mutationFn: async (challenge: PersonalizedChallenge) => {
      return apiRequest(`/api/adaptive/challenge`, {
        method: 'POST',
        body: JSON.stringify({ userId, challenge }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Challenge Created",
        description: "New adaptive challenge has been added to your list!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${userId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create challenge",
        variant: "destructive",
      });
    },
  });

  // Complete challenge mutation
  const completeChallengeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      return apiRequest(`/api/challenges/${challengeId}/complete`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      toast({
        title: "Challenge Completed",
        description: "Congratulations! You've completed an adaptive challenge!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/challenges/${userId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete challenge",
        variant: "destructive",
      });
    },
  });

  // Update difficulty mutation
  const updateDifficultyMutation = useMutation({
    mutationFn: async (analysisData: DifficultyAnalysis) => {
      return apiRequest(`/api/adaptive/difficulty/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(analysisData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Difficulty Updated",
        description: "Your adaptive difficulty level has been adjusted!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/adaptive/analysis/${userId}`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update difficulty",
        variant: "destructive",
      });
    },
  });

  const getDifficultyColor = (level: number) => {
    if (level <= 1) return "bg-green-500";
    if (level <= 2) return "bg-blue-500";
    if (level <= 3) return "bg-yellow-500";
    if (level <= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
    return <Target className="h-4 w-4 text-blue-500" />;
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'speed': return <Zap className="h-5 w-5" />;
      case 'accuracy': return <Target className="h-5 w-5" />;
      case 'complexity': return <Brain className="h-5 w-5" />;
      case 'endurance': return <Clock className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  if (analysisLoading || challengesLoading || userChallengesLoading || analyticsLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center">Loading adaptive difficulty system...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Adaptive Learning System</h1>
          <p className="text-muted-foreground">Personalized challenges and intelligent difficulty adjustment</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Star className="h-4 w-4 mr-2" />
          Level {analysis?.currentLevel || 1}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Difficulty Analysis */}
          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Analysis
                </CardTitle>
                <CardDescription>AI-powered assessment of your learning progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Current Level</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getDifficultyColor(analysis.currentLevel)}`} />
                      <span className="text-2xl font-bold">{analysis.currentLevel}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Suggested Level</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getDifficultyColor(analysis.suggestedLevel)}`} />
                      <span className="text-2xl font-bold">{analysis.suggestedLevel}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Performance Trend</div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(analysis.performanceTrend)}
                      <span className="text-lg font-semibold capitalize">{analysis.performanceTrend}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Confidence Level</div>
                  <Progress value={analysis.confidence * 100} className="h-2" />
                  <div className="text-xs text-muted-foreground">{Math.round(analysis.confidence * 100)}% confidence</div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="text-sm font-medium mb-2">AI Insights</div>
                  <p className="text-sm">{analysis.reasoning}</p>
                </div>

                {analysis.suggestedLevel !== analysis.currentLevel && (
                  <Button 
                    onClick={() => updateDifficultyMutation.mutate(analysis)}
                    disabled={updateDifficultyMutation.isPending}
                    className="w-full"
                  >
                    Apply Suggested Difficulty
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Challenges</p>
                    <p className="text-2xl font-bold">{userChallenges?.filter(c => !c.isCompleted).length || 0}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Challenges</p>
                    <p className="text-2xl font-bold">{userChallenges?.filter(c => c.isCompleted).length || 0}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                    <p className="text-2xl font-bold">
                      {analytics?.length ? Math.round(analytics.reduce((sum, a) => sum + a.accuracyScore, 0) / analytics.length * 100) : 0}%
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-6">
          {/* Personalized Challenges */}
          {personalizedChallenges && personalizedChallenges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Challenges</CardTitle>
                <CardDescription>AI-generated challenges based on your performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personalizedChallenges.map((challenge) => (
                    <Card key={challenge.id} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getChallengeIcon(challenge.type)}
                            <h3 className="font-semibold">{challenge.title}</h3>
                          </div>
                          <Badge variant="outline">Level {challenge.difficulty}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span>{challenge.currentMetric}/{challenge.targetMetric}</span>
                          </div>
                          <Progress 
                            value={(challenge.currentMetric / challenge.targetMetric) * 100} 
                            className="h-1" 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {challenge.timeLimit && `${challenge.timeLimit} min limit`}
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => createChallengeMutation.mutate(challenge)}
                            disabled={createChallengeMutation.isPending}
                          >
                            Accept Challenge
                          </Button>
                        </div>
                        <div className="mt-2 text-xs text-green-600">
                          🎁 {challenge.reward}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Challenges */}
          {userChallenges && userChallenges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Challenges</CardTitle>
                <CardDescription>Track your progress on active and completed challenges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userChallenges.map((challenge) => (
                    <div key={challenge.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getChallengeIcon(challenge.challengeType)}
                        <div>
                          <div className="font-medium capitalize">{challenge.challengeType} Challenge</div>
                          <div className="text-sm text-muted-foreground">Level {challenge.difficultyLevel}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">Target: {challenge.targetMetric}</div>
                          <div className="text-xs text-muted-foreground">
                            {challenge.reward}
                          </div>
                        </div>
                        {challenge.isCompleted ? (
                          <Badge variant="default">Completed</Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => completeChallengeMutation.mutate(challenge.id)}
                            disabled={completeChallengeMutation.isPending}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && analytics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Detailed insights into your learning performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.map((analytic) => (
                    <div key={analytic.id} className="p-4 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Response Time</div>
                          <div className="text-lg font-semibold">{analytic.responseTime?.toFixed(1)}s</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Accuracy</div>
                          <div className="text-lg font-semibold">{Math.round(analytic.accuracyScore * 100)}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Difficulty</div>
                          <div className="text-lg font-semibold">Level {analytic.difficultyAttempted}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Confidence</div>
                          <div className="text-lg font-semibold">{Math.round((analytic.confidenceScore || 0) * 100)}%</div>
                        </div>
                      </div>
                      {analytic.improvementSuggestion && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded">
                          <div className="text-sm font-medium text-blue-800 dark:text-blue-200">AI Suggestion</div>
                          <div className="text-sm text-blue-700 dark:text-blue-300">{analytic.improvementSuggestion}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Adaptive Learning Settings</CardTitle>
              <CardDescription>Configure how the system adapts to your learning style</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Adaptation Speed</label>
                <p className="text-xs text-muted-foreground">How quickly the system adjusts difficulty based on your performance</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Conservative</Button>
                  <Button variant="outline" size="sm">Balanced</Button>
                  <Button variant="outline" size="sm">Aggressive</Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Challenge Types</label>
                <p className="text-xs text-muted-foreground">Select which types of challenges you want to receive</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Speed Challenges</Badge>
                  <Badge variant="outline">Accuracy Challenges</Badge>
                  <Badge variant="outline">Complexity Challenges</Badge>
                  <Badge variant="outline">Endurance Challenges</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}