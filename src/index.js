"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var openai_1 = require("openai");
// Activity level multipliers for TDEE calculation
var ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2, // Little or no exercise
    light: 1.375, // Light exercise 1-3 days/week
    moderate: 1.55, // Moderate exercise 3-5 days/week
    active: 1.725, // Heavy exercise 6-7 days/week
    very_active: 1.9 // Very heavy exercise, physical job or training twice a day
};
// Function to calculate TDEE using Mifflin-St Jeor formula
function calculateTDEE(profile) {
    // Base metabolic rate (BMR)
    var bmr;
    if (profile.gender === 'male') {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    }
    else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }
    // Multiply BMR by activity factor to get TDEE
    var activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
    return Math.round(bmr * activityMultiplier);
}
// Calculate macronutrient targets
function calculateMacros(tdee) {
    // Standard macro split: 30% protein, 30% fat, 40% carbs
    var protein = Math.round((tdee * 0.3) / 4); // 4 calories per gram of protein
    var fat = Math.round((tdee * 0.3) / 9); // 9 calories per gram of fat
    var carbs = Math.round((tdee * 0.4) / 4); // 4 calories per gram of carbs
    return { protein: protein, fat: fat, carbs: carbs };
}
// Helper function to send messages to Telegram
function sendTelegramMessage(chatId, text, botToken) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response, errorText;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "https://api.telegram.org/bot".concat(botToken, "/sendMessage");
                    return [4 /*yield*/, fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: text,
                                parse_mode: 'Markdown',
                            }),
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    errorText = _a.sent();
                    throw new Error("Telegram API error: ".concat(errorText));
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Handle the /start command and setup wizard
function handleStartCommand(message, env) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, chatId, wizardSession;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = message.from.id;
                    chatId = message.chat.id;
                    wizardSession = {
                        step: 'gender',
                        partialProfile: {}
                    };
                    // Store the wizard session
                    return [4 /*yield*/, env.USER_DATA.put("wizard:".concat(userId), JSON.stringify(wizardSession))];
                case 1:
                    // Store the wizard session
                    _a.sent();
                    // Send welcome message and first question
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Добро пожаловать в FoodDaily бот! Давайте настроим ваш профиль для расчета КБЖУ.\n\nУкажите ваш пол (м/ж):', env.TELEGRAM_BOT_TOKEN)];
                case 2:
                    // Send welcome message and first question
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Process the wizard steps based on user responses
function processWizard(message, env) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, chatId, text, wizardData, wizard, _a, age, height, weight, activityLevel, _b, completeProfile, macros;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    userId = message.from.id;
                    chatId = message.chat.id;
                    text = message.text || '';
                    return [4 /*yield*/, env.USER_DATA.get("wizard:".concat(userId))];
                case 1:
                    wizardData = _c.sent();
                    if (!wizardData) {
                        return [2 /*return*/, false];
                    }
                    wizard = JSON.parse(wizardData);
                    _a = wizard.step;
                    switch (_a) {
                        case 'gender': return [3 /*break*/, 2];
                        case 'age': return [3 /*break*/, 9];
                        case 'height': return [3 /*break*/, 14];
                        case 'weight': return [3 /*break*/, 19];
                        case 'activity': return [3 /*break*/, 24];
                    }
                    return [3 /*break*/, 36];
                case 2:
                    if (!(text.toLowerCase() === 'м')) return [3 /*break*/, 3];
                    wizard.partialProfile.gender = 'male';
                    return [3 /*break*/, 6];
                case 3:
                    if (!(text.toLowerCase() === 'ж')) return [3 /*break*/, 4];
                    wizard.partialProfile.gender = 'female';
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, sendTelegramMessage(chatId, 'Пожалуйста, введите "м" для мужского пола или "ж" для женского.', env.TELEGRAM_BOT_TOKEN)];
                case 5:
                    _c.sent();
                    return [2 /*return*/, true];
                case 6:
                    wizard.step = 'age';
                    return [4 /*yield*/, env.USER_DATA.put("wizard:".concat(userId), JSON.stringify(wizard))];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Введите ваш возраст (лет):', env.TELEGRAM_BOT_TOKEN)];
                case 8:
                    _c.sent();
                    return [2 /*return*/, true];
                case 9:
                    age = parseInt(text, 10);
                    if (!(isNaN(age) || age < 10 || age > 100)) return [3 /*break*/, 11];
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Пожалуйста, введите корректный возраст от 10 до 100 лет.', env.TELEGRAM_BOT_TOKEN)];
                case 10:
                    _c.sent();
                    return [2 /*return*/, true];
                case 11:
                    wizard.partialProfile.age = age;
                    wizard.step = 'height';
                    return [4 /*yield*/, env.USER_DATA.put("wizard:".concat(userId), JSON.stringify(wizard))];
                case 12:
                    _c.sent();
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Введите ваш рост (см):', env.TELEGRAM_BOT_TOKEN)];
                case 13:
                    _c.sent();
                    return [2 /*return*/, true];
                case 14:
                    height = parseInt(text, 10);
                    if (!(isNaN(height) || height < 100 || height > 250)) return [3 /*break*/, 16];
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Пожалуйста, введите корректный рост от 100 до 250 см.', env.TELEGRAM_BOT_TOKEN)];
                case 15:
                    _c.sent();
                    return [2 /*return*/, true];
                case 16:
                    wizard.partialProfile.height = height;
                    wizard.step = 'weight';
                    return [4 /*yield*/, env.USER_DATA.put("wizard:".concat(userId), JSON.stringify(wizard))];
                case 17:
                    _c.sent();
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Введите ваш вес (кг):', env.TELEGRAM_BOT_TOKEN)];
                case 18:
                    _c.sent();
                    return [2 /*return*/, true];
                case 19:
                    weight = parseInt(text, 10);
                    if (!(isNaN(weight) || weight < 30 || weight > 300)) return [3 /*break*/, 21];
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Пожалуйста, введите корректный вес от 30 до 300 кг.', env.TELEGRAM_BOT_TOKEN)];
                case 20:
                    _c.sent();
                    return [2 /*return*/, true];
                case 21:
                    wizard.partialProfile.weight = weight;
                    wizard.step = 'activity';
                    return [4 /*yield*/, env.USER_DATA.put("wizard:".concat(userId), JSON.stringify(wizard))];
                case 22:
                    _c.sent();
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Выберите уровень вашей физической активности:\n' +
                            '1 - Сидячий (мало или совсем нет физических нагрузок)\n' +
                            '2 - Лёгкий (легкие упражнения 1-3 раза в неделю)\n' +
                            '3 - Средний (умеренные упражнения 3-5 раз в неделю)\n' +
                            '4 - Высокий (интенсивные упражнения 6-7 раз в неделю)\n' +
                            '5 - Очень высокий (очень интенсивные нагрузки, физическая работа или тренировки дважды в день)', env.TELEGRAM_BOT_TOKEN)];
                case 23:
                    _c.sent();
                    return [2 /*return*/, true];
                case 24:
                    activityLevel = void 0;
                    _b = text;
                    switch (_b) {
                        case '1': return [3 /*break*/, 25];
                        case '2': return [3 /*break*/, 26];
                        case '3': return [3 /*break*/, 27];
                        case '4': return [3 /*break*/, 28];
                        case '5': return [3 /*break*/, 29];
                    }
                    return [3 /*break*/, 30];
                case 25:
                    activityLevel = 'sedentary';
                    return [3 /*break*/, 32];
                case 26:
                    activityLevel = 'light';
                    return [3 /*break*/, 32];
                case 27:
                    activityLevel = 'moderate';
                    return [3 /*break*/, 32];
                case 28:
                    activityLevel = 'active';
                    return [3 /*break*/, 32];
                case 29:
                    activityLevel = 'very_active';
                    return [3 /*break*/, 32];
                case 30: return [4 /*yield*/, sendTelegramMessage(chatId, 'Пожалуйста, выберите уровень активности от 1 до 5.', env.TELEGRAM_BOT_TOKEN)];
                case 31:
                    _c.sent();
                    return [2 /*return*/, true];
                case 32:
                    wizard.partialProfile.activityLevel = activityLevel;
                    completeProfile = wizard.partialProfile;
                    completeProfile.tdee = calculateTDEE(completeProfile);
                    macros = calculateMacros(completeProfile.tdee);
                    completeProfile.protein = macros.protein;
                    completeProfile.fat = macros.fat;
                    completeProfile.carbs = macros.carbs;
                    // Save the complete profile
                    return [4 /*yield*/, env.USER_DATA.put("profile:".concat(userId), JSON.stringify(completeProfile))];
                case 33:
                    // Save the complete profile
                    _c.sent();
                    // Delete the wizard session
                    return [4 /*yield*/, env.USER_DATA.delete("wizard:".concat(userId))];
                case 34:
                    // Delete the wizard session
                    _c.sent();
                    // Send the results
                    return [4 /*yield*/, sendTelegramMessage(chatId, "\u2705 \u0412\u0430\u0448 \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0441\u043E\u0437\u0434\u0430\u043D!\n\n" +
                            "\u0412\u0430\u0448\u0430 \u0441\u0443\u0442\u043E\u0447\u043D\u0430\u044F \u043D\u043E\u0440\u043C\u0430 \u043A\u0430\u043B\u043E\u0440\u0438\u0439 (TDEE): ".concat(completeProfile.tdee, " \u043A\u043A\u0430\u043B\n\n") +
                            "\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C\u044B\u0435 \u043C\u0430\u043A\u0440\u043E\u043D\u0443\u0442\u0440\u0438\u0435\u043D\u0442\u044B:\n" +
                            "\uD83E\uDD69 \u0411\u0435\u043B\u043A\u0438: ".concat(completeProfile.protein, " \u0433\n") +
                            "\uD83E\uDDC8 \u0416\u0438\u0440\u044B: ".concat(completeProfile.fat, " \u0433\n") +
                            "\uD83C\uDF5A \u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B: ".concat(completeProfile.carbs, " \u0433\n\n") +
                            "\u0422\u0435\u043F\u0435\u0440\u044C \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043C\u043D\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043B\u044E\u0431\u043E\u0433\u043E \u0431\u043B\u044E\u0434\u0430, \u0438 \u044F \u043E\u0446\u0435\u043D\u044E \u0435\u0433\u043E \u041A\u0411\u0416\u0423.", env.TELEGRAM_BOT_TOKEN)];
                case 35:
                    // Send the results
                    _c.sent();
                    return [2 /*return*/, true];
                case 36: return [2 /*return*/, false];
            }
        });
    });
}
// Analyze food using OpenAI
function analyzeFoodWithOpenAI(foodDescription, env) {
    return __awaiter(this, void 0, void 0, function () {
        var openai, response, content, nutritionData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("[OpenAI] Analyzing food: \"".concat(foodDescription, "\""));
                    openai = new openai_1.OpenAI({
                        apiKey: env.OPENAI_API_KEY,
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log("[OpenAI] Sending request to OpenAI API for: \"".concat(foodDescription, "\""));
                    return [4 /*yield*/, openai.chat.completions.create({
                            model: 'gpt-4',
                            messages: [
                                {
                                    role: 'system',
                                    content: 'Ты - помощник по подсчету пищевой ценности. Оцени калорийность и содержание белков, жиров и углеводов для стандартной порции указанного блюда. Предоставь результат в формате JSON без дополнительных пояснений. Пример: {"calories": 450, "protein": 30, "fat": 15, "carbs": 45}'
                                },
                                {
                                    role: 'user',
                                    content: foodDescription
                                }
                            ],
                            temperature: 0.3,
                            response_format: { type: 'json_object' }
                        })];
                case 2:
                    response = _a.sent();
                    content = response.choices[0].message.content;
                    console.log("[OpenAI] Received raw response: ".concat(content));
                    if (!content) {
                        console.error("[OpenAI] Empty content received from OpenAI API");
                        return [2 /*return*/, null];
                    }
                    nutritionData = JSON.parse(content);
                    console.log("[OpenAI] Parsed nutrition data:", nutritionData);
                    return [2 /*return*/, {
                            description: foodDescription,
                            calories: nutritionData.calories,
                            protein: nutritionData.protein,
                            fat: nutritionData.fat,
                            carbs: nutritionData.carbs,
                            timestamp: Date.now()
                        }];
                case 3:
                    error_1 = _a.sent();
                    console.error("[OpenAI] API error:", error_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Save food entry to user's daily log
function saveFoodEntry(userId, entry, env) {
    return __awaiter(this, void 0, void 0, function () {
        var today, dailyKey, dailyStats, existingStats, dataToSave;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    today = new Date().toISOString().split('T')[0];
                    dailyKey = "daily:".concat(userId, ":").concat(today);
                    console.log("[KV] Saving food entry to key: ".concat(dailyKey));
                    return [4 /*yield*/, env.FOOD_HISTORY.get(dailyKey)];
                case 1:
                    existingStats = _a.sent();
                    console.log("[KV] Existing stats for ".concat(dailyKey, ":"), existingStats);
                    if (existingStats) {
                        dailyStats = JSON.parse(existingStats);
                        dailyStats.entries.push(entry);
                    }
                    else {
                        console.log("[KV] No existing stats found, creating new record");
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
                    dailyStats.totalCalories = dailyStats.entries.reduce(function (sum, e) { return sum + e.calories; }, 0);
                    dailyStats.totalProtein = dailyStats.entries.reduce(function (sum, e) { return sum + e.protein; }, 0);
                    dailyStats.totalFat = dailyStats.entries.reduce(function (sum, e) { return sum + e.fat; }, 0);
                    dailyStats.totalCarbs = dailyStats.entries.reduce(function (sum, e) { return sum + e.carbs; }, 0);
                    dataToSave = JSON.stringify(dailyStats);
                    console.log("[KV] Saving data: ".concat(dataToSave));
                    return [4 /*yield*/, env.FOOD_HISTORY.put(dailyKey, dataToSave)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, dailyStats];
            }
        });
    });
}
// Handle food description from user
function handleFoodDescription(message, env) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, chatId, foodDescription, profileData, foodEntry, dailyStats, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = message.from.id;
                    chatId = message.chat.id;
                    foodDescription = message.text || '';
                    console.log("[Bot] User ".concat(userId, " requested food analysis: \"").concat(foodDescription, "\""));
                    return [4 /*yield*/, env.USER_DATA.get("profile:".concat(userId))];
                case 1:
                    profileData = _a.sent();
                    console.log("[KV] User profile data: ".concat(profileData));
                    if (!!profileData) return [3 /*break*/, 3];
                    console.log("[Bot] User ".concat(userId, " has no profile, sending instructions"));
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Для начала работы, пожалуйста, используйте команду /start для создания профиля.', env.TELEGRAM_BOT_TOKEN)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
                case 3: 
                // Send "processing" message
                return [4 /*yield*/, sendTelegramMessage(chatId, 'Анализирую ваше блюдо...', env.TELEGRAM_BOT_TOKEN)];
                case 4:
                    // Send "processing" message
                    _a.sent();
                    return [4 /*yield*/, analyzeFoodWithOpenAI(foodDescription, env)];
                case 5:
                    foodEntry = _a.sent();
                    if (!!foodEntry) return [3 /*break*/, 7];
                    console.log("[Bot] Failed to analyze food for user ".concat(userId));
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Извините, не удалось проанализировать это блюдо. Пожалуйста, попробуйте описать его более подробно.', env.TELEGRAM_BOT_TOKEN)];
                case 6:
                    _a.sent();
                    return [2 /*return*/];
                case 7:
                    console.log("[Bot] Successfully analyzed food for user ".concat(userId, ":"), foodEntry);
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, saveFoodEntry(userId, foodEntry, env)];
                case 9:
                    dailyStats = _a.sent();
                    console.log("[Bot] Updated daily stats for user ".concat(userId, ":"), dailyStats);
                    return [3 /*break*/, 11];
                case 10:
                    error_2 = _a.sent();
                    console.error("[KV] Error saving food entry:", error_2);
                    return [3 /*break*/, 11];
                case 11: 
                // Send the results
                return [4 /*yield*/, sendTelegramMessage(chatId, "*".concat(foodDescription, "*\n\n") +
                        "\uD83D\uDD25 \u041A\u0430\u043B\u043E\u0440\u0438\u0438: ".concat(foodEntry.calories, " \u043A\u043A\u0430\u043B\n") +
                        "\uD83E\uDD69 \u0411\u0435\u043B\u043A\u0438: ".concat(foodEntry.protein, " \u0433\n") +
                        "\uD83E\uDDC8 \u0416\u0438\u0440\u044B: ".concat(foodEntry.fat, " \u0433\n") +
                        "\uD83C\uDF5A \u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B: ".concat(foodEntry.carbs, " \u0433\n\n") +
                        "\u0414\u0430\u043D\u043D\u044B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B \u0432 \u0432\u0430\u0448\u0435\u043C \u0434\u043D\u0435\u0432\u043D\u0438\u043A\u0435 \u043F\u0438\u0442\u0430\u043D\u0438\u044F.", env.TELEGRAM_BOT_TOKEN)];
                case 12:
                    // Send the results
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Handle the /итого command
function handleTotalCommand(message, env) {
    return __awaiter(this, void 0, void 0, function () {
        var userId, chatId, today, dailyKey, profileData, profile, statsData, stats, caloriePercent, proteinPercent, fatPercent, carbsPercent, foodList;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    userId = message.from.id;
                    chatId = message.chat.id;
                    today = new Date().toISOString().split('T')[0];
                    dailyKey = "daily:".concat(userId, ":").concat(today);
                    return [4 /*yield*/, env.USER_DATA.get("profile:".concat(userId))];
                case 1:
                    profileData = _a.sent();
                    if (!!profileData) return [3 /*break*/, 3];
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'Для начала работы, пожалуйста, используйте команду /start для создания профиля.', env.TELEGRAM_BOT_TOKEN)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
                case 3:
                    profile = JSON.parse(profileData);
                    return [4 /*yield*/, env.FOOD_HISTORY.get(dailyKey)];
                case 4:
                    statsData = _a.sent();
                    if (!!statsData) return [3 /*break*/, 6];
                    return [4 /*yield*/, sendTelegramMessage(chatId, 'У вас пока нет записей о питании на сегодня.', env.TELEGRAM_BOT_TOKEN)];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
                case 6:
                    stats = JSON.parse(statsData);
                    caloriePercent = Math.round((stats.totalCalories / profile.tdee) * 100);
                    proteinPercent = Math.round((stats.totalProtein / profile.protein) * 100);
                    fatPercent = Math.round((stats.totalFat / profile.fat) * 100);
                    carbsPercent = Math.round((stats.totalCarbs / profile.carbs) * 100);
                    foodList = '';
                    stats.entries.forEach(function (entry, index) {
                        foodList += "".concat(index + 1, ". ").concat(entry.description, " - ").concat(entry.calories, " \u043A\u043A\u0430\u043B\n");
                    });
                    // Send the results
                    return [4 /*yield*/, sendTelegramMessage(chatId, "*\u0418\u0442\u043E\u0433\u0438 \u043F\u0438\u0442\u0430\u043D\u0438\u044F \u0437\u0430 ".concat(today, "*\n\n") +
                            "".concat(foodList, "\n") +
                            "*\u0412\u0441\u0435\u0433\u043E \u0437\u0430 \u0434\u0435\u043D\u044C:*\n" +
                            "\uD83D\uDD25 \u041A\u0430\u043B\u043E\u0440\u0438\u0438: ".concat(stats.totalCalories, " / ").concat(profile.tdee, " \u043A\u043A\u0430\u043B (").concat(caloriePercent, "%)\n") +
                            "\uD83E\uDD69 \u0411\u0435\u043B\u043A\u0438: ".concat(stats.totalProtein, " / ").concat(profile.protein, " \u0433 (").concat(proteinPercent, "%)\n") +
                            "\uD83E\uDDC8 \u0416\u0438\u0440\u044B: ".concat(stats.totalFat, " / ").concat(profile.fat, " \u0433 (").concat(fatPercent, "%)\n") +
                            "\uD83C\uDF5A \u0423\u0433\u043B\u0435\u0432\u043E\u0434\u044B: ".concat(stats.totalCarbs, " / ").concat(profile.carbs, " \u0433 (").concat(carbsPercent, "%)"), env.TELEGRAM_BOT_TOKEN)];
                case 7:
                    // Send the results
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Main webhook handler for Telegram updates
function handleWebhook(request, env) {
    return __awaiter(this, void 0, void 0, function () {
        var update, message, text, isInWizard, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 9]);
                    return [4 /*yield*/, request.json()];
                case 1:
                    update = _a.sent();
                    console.log("[Bot] Received update:", update);
                    if (!update.message) {
                        console.log("[Bot] No message in update");
                        return [2 /*return*/, new Response('No message in update', { status: 200 })];
                    }
                    message = update.message;
                    text = message.text || '';
                    console.log("[Bot] Received message from user ".concat(message.from.id, ": \"").concat(text, "\""));
                    if (!(text === '/start')) return [3 /*break*/, 3];
                    console.log("[Bot] Processing /start command for user ".concat(message.from.id));
                    return [4 /*yield*/, handleStartCommand(message, env)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, new Response('OK', { status: 200 })];
                case 3:
                    if (!(text === '/итого')) return [3 /*break*/, 5];
                    console.log("[Bot] Processing /\u0438\u0442\u043E\u0433\u043E command for user ".concat(message.from.id));
                    return [4 /*yield*/, handleTotalCommand(message, env)];
                case 4:
                    _a.sent();
                    return [2 /*return*/, new Response('OK', { status: 200 })];
                case 5: return [4 /*yield*/, processWizard(message, env)];
                case 6:
                    isInWizard = _a.sent();
                    if (isInWizard) {
                        console.log("[Bot] User ".concat(message.from.id, " is in wizard flow"));
                        return [2 /*return*/, new Response('OK', { status: 200 })];
                    }
                    // Handle food description
                    console.log("[Bot] Processing food description from user ".concat(message.from.id));
                    return [4 /*yield*/, handleFoodDescription(message, env)];
                case 7:
                    _a.sent();
                    return [2 /*return*/, new Response('OK', { status: 200 })];
                case 8:
                    error_3 = _a.sent();
                    console.error('[Bot] Error handling webhook:', error_3);
                    return [2 /*return*/, new Response('Error', { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Setup route for the webhook
exports.default = {
    fetch: function (request, env, ctx) {
        return __awaiter(this, void 0, void 0, function () {
            var url, telegramApiUrl, webhookUrl, response, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = new URL(request.url);
                        // Handle webhook route
                        if (url.pathname === '/webhook') {
                            return [2 /*return*/, handleWebhook(request, env)];
                        }
                        if (!(url.pathname === '/setup')) return [3 /*break*/, 5];
                        telegramApiUrl = "https://api.telegram.org/bot".concat(env.TELEGRAM_BOT_TOKEN, "/setWebhook");
                        webhookUrl = "".concat(url.origin, "/webhook");
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch(telegramApiUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    url: webhookUrl,
                                }),
                            })];
                    case 2:
                        response = _a.sent();
                        return [4 /*yield*/, response.json()];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, new Response(JSON.stringify(result), {
                                status: 200,
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            })];
                    case 4:
                        error_4 = _a.sent();
                        return [2 /*return*/, new Response(JSON.stringify({ error: 'Failed to set webhook' }), {
                                status: 500,
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            })];
                    case 5: 
                    // Default response
                    return [2 /*return*/, new Response('Food Daily Bot is running', {
                            status: 200,
                            headers: {
                                'Content-Type': 'text/plain',
                            },
                        })];
                }
            });
        });
    },
};
