import { OpenAI } from 'openai';

// Types for our application
interface Env {
  TELEGRAM_BOT_TOKEN: string;
  OPENAI_API_KEY: string;
  USER_DATA: KVNamespace;
  FOOD_HISTORY: KVNamespace;
}

interface UserProfile {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  tdee?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}

interface WizardSession {
  step: 'gender' | 'age' | 'height' | 'weight' | 'activity' | 'complete';
  partialProfile: Partial<UserProfile>;
}

interface FoodEntry {
  description: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  timestamp: number;
}

interface DailyStats {
  date: string;
  entries: FoodEntry[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

// Telegram API types
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: Array<Array<InlineKeyboardButton>>;
}

interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  text?: string;
  date: number;
  reply_markup?: InlineKeyboardMarkup;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,      // Little or no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Heavy exercise 6-7 days/week
};

// Function to calculate TDEE using Mifflin-St Jeor formula
function calculateTDEE(profile: UserProfile): number {
  // Base metabolic rate (BMR)
  let bmr: number;
  
  if (profile.gender === 'male') {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
  }
  
  // Multiply BMR by activity factor to get TDEE
  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  return Math.round(bmr * activityMultiplier);
}

// Calculate macronutrient targets
function calculateMacros(tdee: number): { protein: number; fat: number; carbs: number } {
  // Standard macro split: 30% protein, 30% fat, 40% carbs
  const protein = Math.round((tdee * 0.3) / 4); // 4 calories per gram of protein
  const fat = Math.round((tdee * 0.3) / 9);     // 9 calories per gram of fat
  const carbs = Math.round((tdee * 0.4) / 4);   // 4 calories per gram of carbs
  
  return { protein, fat, carbs };
}

// Helper function to send messages to Telegram
async function sendTelegramMessage(
  chatId: number, 
  text: string, 
  botToken: string,
  reply_markup?: InlineKeyboardMarkup
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API error: ${errorText}`);
  }
}

// Handle the /start command and setup wizard
async function handleStartCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const userId = message.from.id;
  const chatId = message.chat.id;
  
  // Initialize a new wizard session
  const wizardSession: WizardSession = {
    step: 'gender',
    partialProfile: {}
  };
  
  // Store the wizard session
  await env.USER_DATA.put(`wizard:${userId}`, JSON.stringify(wizardSession));
  
  // Create inline keyboard for gender selection
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '👨 Мужской', callback_data: 'gender_male' },
        { text: '👩 Женский', callback_data: 'gender_female' }
      ]
    ]
  };
  
  // Send welcome message with gender selection buttons
  await sendTelegramMessage(
    chatId,
    'Добро пожаловать! Это твой личный КБЖУ-дневник — всё по-честному 😎\n\nВыберите ваш пол:',
    env.TELEGRAM_BOT_TOKEN,
    keyboard
  );
}

// Handle callback queries from inline buttons
async function handleCallbackQuery(
  query: CallbackQuery,
  env: Env
): Promise<void> {
  const userId = query.from.id;
  const chatId = query.message?.chat.id;
  
  if (!chatId) return;
  
  // Get wizard session
  const wizardData = await env.USER_DATA.get(`wizard:${userId}`);
  if (!wizardData) return;
  
  const wizard: WizardSession = JSON.parse(wizardData);
  
  if (wizard.step === 'gender') {
    if (query.data === 'gender_male') {
      wizard.partialProfile.gender = 'male';
    } else if (query.data === 'gender_female') {
      wizard.partialProfile.gender = 'female';
    }
    
    // Update wizard step
    wizard.step = 'age';
    await env.USER_DATA.put(`wizard:${userId}`, JSON.stringify(wizard));
    
    // Send next question
    await sendTelegramMessage(
      chatId,
      'Отлично! Теперь введите ваш возраст (лет):',
      env.TELEGRAM_BOT_TOKEN
    );
  } else if (wizard.step === 'activity') {
    let activityLevel: UserProfile['activityLevel'];
    
    switch (query.data) {
      case 'activity_sedentary':
        activityLevel = 'sedentary';
        break;
      case 'activity_light':
        activityLevel = 'light';
        break;
      case 'activity_moderate':
        activityLevel = 'moderate';
        break;
      case 'activity_active':
        activityLevel = 'active';
        break;
      default:
        return;
    }
    
    wizard.partialProfile.activityLevel = activityLevel;
    
    // Complete the profile and calculate TDEE and macros
    const completeProfile: UserProfile = wizard.partialProfile as UserProfile;
    completeProfile.tdee = calculateTDEE(completeProfile);
    
    const macros = calculateMacros(completeProfile.tdee);
    completeProfile.protein = macros.protein;
    completeProfile.fat = macros.fat;
    completeProfile.carbs = macros.carbs;
    
    // Save the complete profile
    await env.USER_DATA.put(`profile:${userId}`, JSON.stringify(completeProfile));
    
    // Delete the wizard session
    await env.USER_DATA.delete(`wizard:${userId}`);
    
    // Send the results
    await sendTelegramMessage(
      chatId,
      `✅ Ваш профиль создан!\n\n` +
      `Ваша суточная норма калорий (TDEE): ${completeProfile.tdee} ккал\n\n` +
      `Рекомендуемые макронутриенты:\n` +
      `🥩 Белки: ${completeProfile.protein} г\n` +
      `🧈 Жиры: ${completeProfile.fat} г\n` +
      `🍚 Углеводы: ${completeProfile.carbs} г\n\n` +
      `Теперь вы можете отправить мне название любого блюда, и я оценю его КБЖУ.`,
      env.TELEGRAM_BOT_TOKEN
    );
  }
}

// Process the wizard steps based on user responses
async function processWizard(
  message: TelegramMessage,
  env: Env
): Promise<boolean> {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const text = message.text || '';
  
  // Check if user has an active wizard session
  const wizardData = await env.USER_DATA.get(`wizard:${userId}`);
  if (!wizardData) {
    return false;
  }
  
  const wizard: WizardSession = JSON.parse(wizardData);
  
  // Process the current step
  switch (wizard.step) {
    case 'gender':
      if (text.toLowerCase() === 'м') {
        wizard.partialProfile.gender = 'male';
      } else if (text.toLowerCase() === 'ж') {
        wizard.partialProfile.gender = 'female';
      } else {
        await sendTelegramMessage(chatId, 'Пожалуйста, введите "м" для мужского пола или "ж" для женского.', env.TELEGRAM_BOT_TOKEN);
        return true;
      }
      
      wizard.step = 'age';
      await env.USER_DATA.put(`wizard:${userId}`, JSON.stringify(wizard));
      await sendTelegramMessage(chatId, 'Введите ваш возраст (лет):', env.TELEGRAM_BOT_TOKEN);
      return true;
      
    case 'age':
      const age = parseInt(text, 10);
      if (isNaN(age) || age < 10 || age > 100) {
        await sendTelegramMessage(chatId, 'Пожалуйста, введите корректный возраст от 10 до 100 лет.', env.TELEGRAM_BOT_TOKEN);
        return true;
      }
      
      wizard.partialProfile.age = age;
      wizard.step = 'height';
      await env.USER_DATA.put(`wizard:${userId}`, JSON.stringify(wizard));
      await sendTelegramMessage(chatId, 'Введите ваш рост (см):', env.TELEGRAM_BOT_TOKEN);
      return true;
      
    case 'height':
      const height = parseInt(text, 10);
      if (isNaN(height) || height < 100 || height > 250) {
        await sendTelegramMessage(chatId, 'Пожалуйста, введите корректный рост от 100 до 250 см.', env.TELEGRAM_BOT_TOKEN);
        return true;
      }
      
      wizard.partialProfile.height = height;
      wizard.step = 'weight';
      await env.USER_DATA.put(`wizard:${userId}`, JSON.stringify(wizard));
      await sendTelegramMessage(chatId, 'Введите ваш вес (кг):', env.TELEGRAM_BOT_TOKEN);
      return true;
      
    case 'weight':
      const weight = parseInt(text, 10);
      if (isNaN(weight) || weight < 30 || weight > 300) {
        await sendTelegramMessage(chatId, 'Пожалуйста, введите корректный вес от 30 до 300 кг.', env.TELEGRAM_BOT_TOKEN);
        return true;
      }
      
      wizard.partialProfile.weight = weight;
      wizard.step = 'activity';
      await env.USER_DATA.put(`wizard:${userId}`, JSON.stringify(wizard));
      
      // Create inline keyboard for activity level selection
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '👩🏼‍💻 Сидячий', callback_data: 'activity_sedentary' },
            { text: '🧘‍♂️ Лёгкий', callback_data: 'activity_light' }
          ],
          [
            { text: '🏃‍♀️ Средний', callback_data: 'activity_moderate' },
            { text: '🏋️ Высокий', callback_data: 'activity_active' }
          ]
        ]
      };
      
      await sendTelegramMessage(
        chatId,
        'Выберите уровень вашей физической активности:\n\n' +
        '👩🏼‍💻 Сидячий - мало или совсем нет физических нагрузок\n' +
        '🧘‍♂️ Лёгкий - легкие упражнения 1-3 раза в неделю\n' +
        '🏃‍♀️ Средний - умеренные упражнения 3-5 раз в неделю\n' +
        '🏋️ Высокий - интенсивные упражнения 6-7 раз в неделю',
        env.TELEGRAM_BOT_TOKEN,
        keyboard
      );
      return true;
      
    case 'activity':
      let activityLevel: UserProfile['activityLevel'];
      
      switch (text) {
        case '1':
          activityLevel = 'sedentary';
          break;
        case '2':
          activityLevel = 'light';
          break;
        case '3':
          activityLevel = 'moderate';
          break;
        case '4':
          activityLevel = 'active';
          break;
        default:
          await sendTelegramMessage(chatId, 'Пожалуйста, выберите уровень активности от 1 до 4.', env.TELEGRAM_BOT_TOKEN);
          return true;
      }
      
      wizard.partialProfile.activityLevel = activityLevel;
      
      // Complete the profile and calculate TDEE and macros
      const completeProfile: UserProfile = wizard.partialProfile as UserProfile;
      completeProfile.tdee = calculateTDEE(completeProfile);
      
      const macros = calculateMacros(completeProfile.tdee);
      completeProfile.protein = macros.protein;
      completeProfile.fat = macros.fat;
      completeProfile.carbs = macros.carbs;
      
      // Save the complete profile
      await env.USER_DATA.put(`profile:${userId}`, JSON.stringify(completeProfile));
      
      // Delete the wizard session
      await env.USER_DATA.delete(`wizard:${userId}`);
      
      // Send the results
      await sendTelegramMessage(
        chatId,
        `✅ Ваш профиль создан!\n\n` +
        `Ваша суточная норма калорий (TDEE): ${completeProfile.tdee} ккал\n\n` +
        `Рекомендуемые макронутриенты:\n` +
        `🥩 Белки: ${completeProfile.protein} г\n` +
        `🧈 Жиры: ${completeProfile.fat} г\n` +
        `🍚 Углеводы: ${completeProfile.carbs} г\n\n` +
        `А теперь по-честному…\n` +
        `👉 **Каким был твой первый приём пищи сегодня?**\n` +
        `(пиши как хочешь: "кофе и тост", "захомячил шаурму", "бутер 432kcal, 27жир, 22белок, 29угли", "не ел, только слёзы пил" — я разберусь)`,
        env.TELEGRAM_BOT_TOKEN
      );
      
      return true;
      
    default:
      return false;
  }
}

// Analyze food using OpenAI
async function analyzeFoodWithOpenAI(
  foodDescription: string,
  env: Env
): Promise<FoodEntry | null> {
  console.log(`[OpenAI] Analyzing food: "${foodDescription}"`);
  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
  
  try {
    console.log(`[OpenAI] Sending request to OpenAI API for: "${foodDescription}"`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'Ты - помощник по подсчету пищевой ценности. Оцени калорийность и содержание белков, жиров и углеводов для стандартной порции указанного блюда. Предоставь результат строго в формате JSON без дополнительных пояснений. Пример: {"calories": 450, "protein": 30, "fat": 15, "carbs": 45}'
        },
        {
          role: 'user',
          content: foodDescription
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0].message.content;
    console.log(`[OpenAI] Received raw response: ${content}`);
    
    if (!content) {
      console.error(`[OpenAI] Empty content received from OpenAI API`);
      return null;
    }
    
    const nutritionData = JSON.parse(content);
    console.log(`[OpenAI] Parsed nutrition data:`, nutritionData);
    
    return {
      description: foodDescription,
      calories: nutritionData.calories,
      protein: nutritionData.protein,
      fat: nutritionData.fat,
      carbs: nutritionData.carbs,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`[OpenAI] API error:`, error);
    return null;
  }
}

// Save food entry to user's daily log
async function saveFoodEntry(
  userId: number,
  entry: FoodEntry,
  env: Env
): Promise<DailyStats> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const dailyKey = `daily:${userId}:${today}`;
  console.log(`[KV] Saving food entry to key: ${dailyKey}`);
  
  // Get existing daily stats or create new
  let dailyStats: DailyStats;
  const existingStats = await env.FOOD_HISTORY.get(dailyKey);
  console.log(`[KV] Existing stats for ${dailyKey}:`, existingStats);
  
  if (existingStats) {
    dailyStats = JSON.parse(existingStats);
    dailyStats.entries.push(entry);
  } else {
    console.log(`[KV] No existing stats found, creating new record`);
    dailyStats = {
      date: today,
      entries: [entry],
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0
    };
  }
  
  // Update totals
  dailyStats.totalCalories = dailyStats.entries.reduce((sum, e) => sum + e.calories, 0);
  dailyStats.totalProtein = dailyStats.entries.reduce((sum, e) => sum + e.protein, 0);
  dailyStats.totalFat = dailyStats.entries.reduce((sum, e) => sum + e.fat, 0);
  dailyStats.totalCarbs = dailyStats.entries.reduce((sum, e) => sum + e.carbs, 0);
  
  // Save updated stats
  const dataToSave = JSON.stringify(dailyStats);
  console.log(`[KV] Saving data: ${dataToSave}`);
  await env.FOOD_HISTORY.put(dailyKey, dataToSave);
  
  return dailyStats;
}

// Handle food description from user
async function handleFoodDescription(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const userId = message.from.id;
  const chatId = message.chat.id;
  const foodDescription = message.text || '';
  
  console.log(`[Bot] User ${userId} requested food analysis: "${foodDescription}"`);
  
  // Check if description is too short
  if (foodDescription.trim().length < 8) {
    console.log(`[Bot] Food description too short: "${foodDescription}"`);
    await sendTelegramMessage(
      chatId,
      'Опиши блюдо чуть подробнее, чтобы я мог посчитать КБЖУ 🧐',
      env.TELEGRAM_BOT_TOKEN
    );
    return;
  }
  
  // First check if user has a profile
  const profileData = await env.USER_DATA.get(`profile:${userId}`);
  console.log(`[KV] User profile data: ${profileData}`);
  
  if (!profileData) {
    console.log(`[Bot] User ${userId} has no profile, sending instructions`);
    await sendTelegramMessage(
      chatId,
      'Для начала работы, пожалуйста, используйте команду /start для создания профиля.',
      env.TELEGRAM_BOT_TOKEN
    );
    return;
  }
  
  // Send "processing" message
  await sendTelegramMessage(
    chatId,
    'Анализирую ваше блюдо...',
    env.TELEGRAM_BOT_TOKEN
  );
  
  // Analyze the food using OpenAI
  const foodEntry = await analyzeFoodWithOpenAI(foodDescription, env);
  
  if (!foodEntry) {
    console.log(`[Bot] Failed to analyze food for user ${userId}`);
    await sendTelegramMessage(
      chatId,
      '😔 Сорян, не удалось проанализировать это блюдо. Возможно, оно неизвестное для меня. Либо что-то пошло не так под капотом.',
      env.TELEGRAM_BOT_TOKEN
    );
    return;
  }
  
  console.log(`[Bot] Successfully analyzed food for user ${userId}:`, foodEntry);
  
  // Check if calories is zero
  if (foodEntry.calories === 0) {
    console.log(`[Bot] Zero-calorie food detected, not saving to diary: "${foodDescription}"`);
    await sendTelegramMessage(
      chatId,
      `*${foodDescription}*\n\n` +
      `🔥 Калории: ${foodEntry.calories} ккал\n` +
      `🥩 Белки: ${foodEntry.protein} г\n` +
      `🧈 Жиры: ${foodEntry.fat} г\n` +
      `🍚 Углеводы: ${foodEntry.carbs} г\n\n` +
      `😁 Ну и зачем мне это записывать? Воздух калорий не имеет! В дневник не добавляю.`,
      env.TELEGRAM_BOT_TOKEN
    );
    return;
  }
  
  // Save the food entry
  try {
    const dailyStats = await saveFoodEntry(userId, foodEntry, env);
    console.log(`[Bot] Updated daily stats for user ${userId}:`, dailyStats);
  } catch (error) {
    console.error(`[KV] Error saving food entry:`, error);
    // Continue anyway to show results to user
  }
  
  // Send the results
  await sendTelegramMessage(
    chatId,
    `*${foodDescription}*\n\n` +
    `🔥 Калории: ${foodEntry.calories} ккал\n` +
    `🥩 Белки: ${foodEntry.protein} г\n` +
    `🧈 Жиры: ${foodEntry.fat} г\n` +
    `🍚 Углеводы: ${foodEntry.carbs} г\n\n` +
    `Данные сохранены в вашем дневнике питания.`,
    env.TELEGRAM_BOT_TOKEN
  );
}

// Handle the /result command
async function handleTotalCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const userId = message.from.id;
  const chatId = message.chat.id;
  
  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `daily:${userId}:${today}`;
  
  // Get user profile for comparison
  const profileData = await env.USER_DATA.get(`profile:${userId}`);
  if (!profileData) {
    await sendTelegramMessage(
      chatId,
      'Для начала работы, пожалуйста, используйте команду /start для создания профиля.',
      env.TELEGRAM_BOT_TOKEN
    );
    return;
  }
  
  const profile: UserProfile = JSON.parse(profileData);
  
  // Get today's stats
  const statsData = await env.FOOD_HISTORY.get(dailyKey);
  
  if (!statsData) {
    await sendTelegramMessage(
      chatId,
      'У вас пока нет записей о питании на сегодня.',
      env.TELEGRAM_BOT_TOKEN
    );
    return;
  }
  
  const stats: DailyStats = JSON.parse(statsData);
  
  // Calculate percentage of daily targets
  const caloriePercent = Math.round((stats.totalCalories / profile.tdee!) * 100);
  const proteinPercent = Math.round((stats.totalProtein / profile.protein!) * 100);
  const fatPercent = Math.round((stats.totalFat / profile.fat!) * 100);
  const carbsPercent = Math.round((stats.totalCarbs / profile.carbs!) * 100);
  
  // Build the list of foods
  let foodList = '';
  stats.entries.forEach((entry, index) => {
    foodList += `${index + 1}. ${entry.description} - ${entry.calories} ккал\n`;
  });
  
  // Send the results
  await sendTelegramMessage(
    chatId,
    `*Итоги питания за ${today}*\n\n` +
    `${foodList}\n` +
    `*Всего за день:*\n` +
    `🔥 Калории: ${stats.totalCalories} / ${profile.tdee} ккал (${caloriePercent}%)\n` +
    `🥩 Белки: ${stats.totalProtein} / ${profile.protein} г (${proteinPercent}%)\n` +
    `🧈 Жиры: ${stats.totalFat} / ${profile.fat} г (${fatPercent}%)\n` +
    `🍚 Углеводы: ${stats.totalCarbs} / ${profile.carbs} г (${carbsPercent}%)`,
    env.TELEGRAM_BOT_TOKEN
  );
}

// Handle the /profile command for updating user data
async function handleProfileCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const userId = message.from.id;
  const chatId = message.chat.id;
  
  // Initialize a new wizard session
  const wizardSession: WizardSession = {
    step: 'gender',
    partialProfile: {}
  };
  
  // Store the wizard session
  await env.USER_DATA.put(`wizard:${userId}`, JSON.stringify(wizardSession));
  
  // Create inline keyboard for gender selection
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: '👨 Мужской', callback_data: 'gender_male' },
        { text: '👩 Женский', callback_data: 'gender_female' }
      ]
    ]
  };
  
  // Send profile update message with gender selection buttons
  await sendTelegramMessage(
    chatId,
    'Давайте обновим ваш профиль.\n\nВыберите ваш пол:',
    env.TELEGRAM_BOT_TOKEN,
    keyboard
  );
}

// Main webhook handler for Telegram updates
async function handleWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const update: TelegramUpdate = await request.json();
    console.log(`[Bot] Received update:`, update);
    
    // Handle callback queries from inline buttons
    if (update.callback_query) {
      console.log(`[Bot] Received callback query:`, update.callback_query);
      await handleCallbackQuery(update.callback_query, env);
      return new Response('OK', { status: 200 });
    }
    
    if (!update.message) {
      console.log(`[Bot] No message in update`);
      return new Response('No message in update', { status: 200 });
    }
    
    const message = update.message;
    const text = message.text || '';
    
    console.log(`[Bot] Received message from user ${message.from.id}: "${text}"`);
    
    // Check if message is a command (starts with /)
    if (text.startsWith('/')) {
      // It's a command, handle accordingly
      if (text === '/start') {
        console.log(`[Bot] Processing /start command for user ${message.from.id}`);
        await handleStartCommand(message, env);
      } else if (text === '/result') {
        console.log(`[Bot] Processing /result command for user ${message.from.id}`);
        await handleTotalCommand(message, env);
      } else if (text === '/profile') {
        console.log(`[Bot] Processing /profile command for user ${message.from.id}`);
        await handleProfileCommand(message, env);
      } else {
        // Unknown command
        console.log(`[Bot] Unknown command from user ${message.from.id}: "${text}"`);
        await sendTelegramMessage(
          message.chat.id, 
          `🤷‍♂️ Сорян, я не знаю команды "${text}"\n\nДоступные команды:\n/start - начать работу с ботом\n/profile - обновить данные профиля\n/result - показать дневную статистику`, 
          env.TELEGRAM_BOT_TOKEN
        );
      }
      return new Response('OK', { status: 200 });
    }
    
    // Not a command - check if user is in wizard flow
    const isInWizard = await processWizard(message, env);
    if (isInWizard) {
      console.log(`[Bot] User ${message.from.id} is in wizard flow`);
      return new Response('OK', { status: 200 });
    }
    
    // Handle as food description
    console.log(`[Bot] Processing food description from user ${message.from.id}`);
    await handleFoodDescription(message, env);
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Bot] Error handling webhook:', error);
    return new Response('Error', { status: 500 });
  }
}

// Setup route for the webhook
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle webhook route
    if (url.pathname === '/webhook') {
      return handleWebhook(request, env);
    }
    
    // Handle other routes or setup webhook
    if (url.pathname === '/setup') {
      const telegramApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`;
      const webhookUrl = `${url.origin}/webhook`;
      
      try {
        const response = await fetch(telegramApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: webhookUrl,
          }),
        });
        
        const result = await response.json();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to set webhook' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    }
    
    // Default response
    return new Response('Food Daily Bot is running', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
}; 