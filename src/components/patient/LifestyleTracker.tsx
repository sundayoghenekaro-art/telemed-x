import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {
  Flame, Utensils, Footprints, Dumbbell, Target, Sparkles, Loader2,
  Plus, Trash2, Baby, Heart, Apple, BicepsFlexed
} from 'lucide-react';

interface Props {
  patientUserId: string;
}

interface Meal {
  id: string;
  meal_name: string;
  meal_type: string;
  calories: number;
  logged_at: string;
  notes: string | null;
}

interface Exercise {
  id: string;
  exercise_type: string;
  duration_minutes: number;
  calories_burned: number;
  steps: number | null;
  logged_at: string;
  notes: string | null;
}

export function LifestyleTracker({ patientUserId }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('other');
  const [mealCalories, setMealCalories] = useState('');
  const [exerciseType, setExerciseType] = useState('walking');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseCalories, setExerciseCalories] = useState('');
  const [exerciseSteps, setExerciseSteps] = useState('');

  // AI states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiType, setAiType] = useState<string | null>(null);

  // Goal editing
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState('');

  // Special section states
  const [pregnancyStage, setPregnancyStage] = useState('pregnant');
  const [trimester, setTrimester] = useState('first');
  const [toddlerAge, setToddlerAge] = useState('12');

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [mealsRes, exercisesRes, goalRes] = await Promise.all([
      supabase.from('patient_meals').select('*').eq('patient_user_id', patientUserId).eq('logged_at', today).order('created_at', { ascending: false }),
      supabase.from('patient_exercises').select('*').eq('patient_user_id', patientUserId).eq('logged_at', today).order('created_at', { ascending: false }),
      supabase.from('patient_calorie_goals').select('*').eq('patient_user_id', patientUserId).maybeSingle(),
    ]);
    if (mealsRes.data) setMeals(mealsRes.data as Meal[]);
    if (exercisesRes.data) setExercises(exercisesRes.data as Exercise[]);
    if (goalRes.data) {
      setCalorieGoal((goalRes.data as any).daily_calorie_goal);
      setGoalId((goalRes.data as any).id);
    }
    setLoading(false);
  }, [patientUserId, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalConsumed = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalBurned = exercises.reduce((sum, e) => sum + e.calories_burned, 0);
  const totalSteps = exercises.reduce((sum, e) => sum + (e.steps || 0), 0);
  const netCalories = totalConsumed - totalBurned;
  const remaining = calorieGoal - netCalories;
  const isOver = netCalories > calorieGoal;
  const progressPct = Math.min((netCalories / calorieGoal) * 100, 100);

  const addMeal = async () => {
    if (!mealName.trim() || !mealCalories) { toast.error('Enter meal name and calories'); return; }
    const { error } = await supabase.from('patient_meals').insert({
      patient_user_id: patientUserId, meal_name: mealName.trim(), meal_type: mealType,
      calories: parseInt(mealCalories), logged_at: today,
    });
    if (error) { toast.error('Failed to add meal'); return; }
    toast.success('Meal added');
    setMealName(''); setMealCalories('');
    fetchData();
  };

  const deleteMeal = async (id: string) => {
    await supabase.from('patient_meals').delete().eq('id', id);
    fetchData();
  };

  const addExercise = async () => {
    if (!exerciseDuration || !exerciseCalories) { toast.error('Enter duration and calories burned'); return; }
    const { error } = await supabase.from('patient_exercises').insert({
      patient_user_id: patientUserId, exercise_type: exerciseType,
      duration_minutes: parseInt(exerciseDuration), calories_burned: parseInt(exerciseCalories),
      steps: exerciseSteps ? parseInt(exerciseSteps) : null, logged_at: today,
    });
    if (error) { toast.error('Failed to add exercise'); return; }
    toast.success('Exercise logged');
    setExerciseDuration(''); setExerciseCalories(''); setExerciseSteps('');
    fetchData();
  };

  const deleteExercise = async (id: string) => {
    await supabase.from('patient_exercises').delete().eq('id', id);
    fetchData();
  };

  const saveGoal = async () => {
    const goal = parseInt(newGoal);
    if (!goal || goal < 500 || goal > 10000) { toast.error('Enter a goal between 500-10000'); return; }
    if (goalId) {
      await supabase.from('patient_calorie_goals').update({ daily_calorie_goal: goal, updated_at: new Date().toISOString() }).eq('id', goalId);
    } else {
      await supabase.from('patient_calorie_goals').insert({ patient_user_id: patientUserId, daily_calorie_goal: goal });
    }
    toast.success('Calorie goal updated');
    setEditingGoal(false);
    fetchData();
  };

  const askAI = async (type: string, context: Record<string, any>) => {
    setAiLoading(true); setAiResult(null); setAiType(type);
    try {
      const { data, error } = await supabase.functions.invoke('lifestyle-ai', { body: { type, context } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiResult(data.suggestion);
    } catch {
      toast.error('AI suggestion failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" /> Lifestyle Tracker
          </h2>
          <p className="text-sm text-muted-foreground">Track meals, exercise, and get AI-powered wellness advice</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="meals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Meals</TabsTrigger>
          <TabsTrigger value="exercise" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Exercise</TabsTrigger>
          <TabsTrigger value="ai-coach" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">AI Coach</TabsTrigger>
          <TabsTrigger value="special" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Wellness Hub</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {/* Calorie Goal */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Daily Calorie Goal</span>
                </div>
                {editingGoal ? (
                  <div className="flex items-center gap-2">
                    <Input type="number" value={newGoal} onChange={e => setNewGoal(e.target.value)} className="w-24 h-8" placeholder={String(calorieGoal)} />
                    <Button size="sm" onClick={saveGoal}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingGoal(false)}>Cancel</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => { setNewGoal(String(calorieGoal)); setEditingGoal(true); }}>
                    {calorieGoal} kcal — Edit
                  </Button>
                )}
              </div>
              <Progress value={progressPct} className="h-3" />
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-muted-foreground">Net: <span className={`font-semibold ${isOver ? 'text-destructive' : 'text-foreground'}`}>{netCalories} kcal</span></span>
                <span className="text-muted-foreground">{isOver ? `${Math.abs(remaining)} over` : `${remaining} remaining`}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4 pb-4 text-center">
              <Utensils className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <p className="text-2xl font-bold">{totalConsumed}</p>
              <p className="text-xs text-muted-foreground">Calories Consumed</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{totalBurned}</p>
              <p className="text-xs text-muted-foreground">Calories Burned</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <Footprints className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{totalSteps.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Steps Today</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 pb-4 text-center">
              <Apple className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{meals.length}</p>
              <p className="text-xs text-muted-foreground">Meals Logged</p>
            </CardContent></Card>
          </div>

          {/* Quick AI buttons */}
          {isOver && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium text-destructive mb-2">⚠️ You're {Math.abs(remaining)} kcal over your goal!</p>
                <Button size="sm" onClick={() => { setActiveTab('ai-coach'); askAI('burn_calories', { totalCalories: totalConsumed, calorieGoal, excessCalories: Math.abs(remaining), caloriesBurned: totalBurned }); }}>
                  <Sparkles className="h-4 w-4 mr-1" /> Get AI Burn Suggestions
                </Button>
              </CardContent>
            </Card>
          )}
          {!isOver && remaining > 200 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium text-foreground mb-2">You have {remaining} kcal remaining. Need meal ideas?</p>
                <Button size="sm" variant="outline" onClick={() => { setActiveTab('ai-coach'); askAI('meal_suggestion', { remainingCalories: remaining, calorieGoal, consumedCalories: totalConsumed }); }}>
                  <Sparkles className="h-4 w-4 mr-1" /> AI Meal Suggestions
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* MEALS */}
        <TabsContent value="meals" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Log a Meal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Meal Name</Label>
                  <Input value={mealName} onChange={e => setMealName(e.target.value)} placeholder="e.g. Grilled Chicken Salad" />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={mealType} onValueChange={setMealType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Calories</Label>
                  <Input type="number" value={mealCalories} onChange={e => setMealCalories(e.target.value)} placeholder="e.g. 450" />
                </div>
                <Button onClick={addMeal}><Plus className="h-4 w-4 mr-1" /> Add Meal</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Today's Meals</h3>
            {meals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No meals logged today</p>
            ) : (
              meals.map(m => (
                <Card key={m.id}>
                  <CardContent className="pt-3 pb-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{m.meal_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.meal_type} • {m.calories} kcal</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMeal(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* EXERCISE */}
        <TabsContent value="exercise" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Log Exercise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={exerciseType} onValueChange={setExerciseType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walking">Walking</SelectItem>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="cycling">Cycling</SelectItem>
                      <SelectItem value="swimming">Swimming</SelectItem>
                      <SelectItem value="gym">Gym</SelectItem>
                      <SelectItem value="yoga">Yoga</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Duration (min)</Label>
                  <Input type="number" value={exerciseDuration} onChange={e => setExerciseDuration(e.target.value)} placeholder="e.g. 30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Calories Burned</Label>
                  <Input type="number" value={exerciseCalories} onChange={e => setExerciseCalories(e.target.value)} placeholder="e.g. 200" />
                </div>
                <div>
                  <Label className="text-xs">Steps (optional)</Label>
                  <Input type="number" value={exerciseSteps} onChange={e => setExerciseSteps(e.target.value)} placeholder="e.g. 5000" />
                </div>
              </div>
              <Button onClick={addExercise}><Plus className="h-4 w-4 mr-1" /> Log Exercise</Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-foreground">Today's Exercises</h3>
            {exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No exercises logged today</p>
            ) : (
              exercises.map(e => (
                <Card key={e.id}>
                  <CardContent className="pt-3 pb-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm capitalize">{e.exercise_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.duration_minutes} min • {e.calories_burned} kcal burned
                        {e.steps ? ` • ${e.steps.toLocaleString()} steps` : ''}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteExercise(e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* AI COACH */}
        <TabsContent value="ai-coach" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => askAI('burn_calories', { totalCalories: totalConsumed, calorieGoal, excessCalories: Math.max(0, netCalories - calorieGoal), caloriesBurned: totalBurned })}>
              <CardContent className="pt-4 pb-4 text-center">
                <BicepsFlexed className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <p className="font-semibold text-sm">Burn Activities</p>
                <p className="text-xs text-muted-foreground">AI exercise suggestions</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => askAI('meal_suggestion', { remainingCalories: Math.max(0, remaining), calorieGoal, consumedCalories: totalConsumed })}>
              <CardContent className="pt-4 pb-4 text-center">
                <Utensils className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="font-semibold text-sm">Meal Ideas</p>
                <p className="text-xs text-muted-foreground">AI meal suggestions</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => askAI('diet_plan', { calorieGoal })}>
              <CardContent className="pt-4 pb-4 text-center">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="font-semibold text-sm">Full Diet Plan</p>
                <p className="text-xs text-muted-foreground">AI daily plan</p>
              </CardContent>
            </Card>
          </div>

          {aiLoading && (
            <Card>
              <CardContent className="pt-6 pb-6 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generating AI suggestion...</span>
              </CardContent>
            </Card>
          )}

          {aiResult && !aiLoading && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI {aiType === 'burn_calories' ? 'Burn' : aiType === 'meal_suggestion' ? 'Meal' : 'Diet Plan'} Suggestion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{aiResult}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SPECIAL WELLNESS HUB */}
        <TabsContent value="special" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pregnant Women */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Heart className="h-5 w-5 text-pink-500" /> Pregnancy Wellness</CardTitle>
                <CardDescription>Safe nutrition, exercises & tips</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Stage</Label>
                  <Select value={pregnancyStage} onValueChange={setPregnancyStage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pregnant">Currently Pregnant</SelectItem>
                      <SelectItem value="postpartum">Postpartum</SelectItem>
                      <SelectItem value="nursing">Nursing Mother</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {pregnancyStage === 'pregnant' && (
                  <div>
                    <Label className="text-xs">Trimester</Label>
                    <Select value={trimester} onValueChange={setTrimester}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first">First Trimester</SelectItem>
                        <SelectItem value="second">Second Trimester</SelectItem>
                        <SelectItem value="third">Third Trimester</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full" size="sm" onClick={() => askAI('pregnancy_wellness', { stage: pregnancyStage, trimester: pregnancyStage === 'pregnant' ? trimester : undefined })}>
                  <Sparkles className="h-4 w-4 mr-1" /> Get Wellness Plan
                </Button>
              </CardContent>
            </Card>

            {/* Nursing Mothers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Baby className="h-5 w-5 text-blue-500" /> Toddler Health</CardTitle>
                <CardDescription>Nutrition, activities & safety for toddlers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Toddler Age (months)</Label>
                  <Input type="number" value={toddlerAge} onChange={e => setToddlerAge(e.target.value)} placeholder="e.g. 12" min="1" max="60" />
                </div>
                <Button className="w-full" size="sm" onClick={() => askAI('toddler_health', { ageMonths: parseInt(toddlerAge) || 12 })}>
                  <Sparkles className="h-4 w-4 mr-1" /> Get Toddler Health Plan
                </Button>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><BicepsFlexed className="h-5 w-5 text-green-500" /> Fitness Plan</CardTitle>
                <CardDescription>AI diet & exercise for staying fit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Get a personalized daily plan based on your calorie goal of <span className="font-semibold">{calorieGoal} kcal</span>.</p>
                <Button className="w-full" size="sm" onClick={() => askAI('diet_plan', { calorieGoal })}>
                  <Sparkles className="h-4 w-4 mr-1" /> Generate Fitness Plan
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Show AI result in special tab too */}
          {aiLoading && (
            <Card>
              <CardContent className="pt-6 pb-6 flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generating wellness plan...</span>
              </CardContent>
            </Card>
          )}
          {aiResult && !aiLoading && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Wellness Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{aiResult}</ReactMarkdown>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
