# FoodDaily Telegram Bot

Бот для расчета КБЖУ (калории, белки, жиры, углеводы) и отслеживания приемов пищи в Telegram.

## Технологии

- TypeScript
- Cloudflare Workers
- Telegram Bot API
- OpenAI API (GPT-4)
- Cloudflare KV для хранения данных

## Функциональность

1. **/start** - запускает диалог, где бот запрашивает:
   - Пол (м/ж)
   - Возраст
   - Рост (см)
   - Вес (кг)
   - Уровень активности

2. Расчет КБЖУ по формуле Миффлина-Сан Жеора

3. Анализ блюд: отправьте боту название блюда, и он с помощью GPT-4 оценит его калорийность и состав

4. **/result** - показывает суммарный КБЖУ за день и сравнивает с вашей нормой

## Настройка и деплой

### Предварительные требования

- Node.js и npm
- Аккаунт Cloudflare
- Токен Telegram бота (получается через @BotFather)
- API ключ OpenAI

### Установка

1. Клонировать репозиторий:
```
git clone https://github.com/yourusername/food-daily-bot.git
cd food-daily-bot
```

2. Установить зависимости:
```
npm install
```

3. Настроить Cloudflare KV:
   - Создайте два KV namespace в Cloudflare:
     - USER_DATA (для хранения пользовательских профилей)
     - FOOD_HISTORY (для хранения истории питания)
   - Добавьте их ID в wrangler.toml

4. Настройте переменные окружения в wrangler.toml:
   - TELEGRAM_BOT_TOKEN
   - OPENAI_API_KEY

### Деплой

1. Авторизуйтесь в Cloudflare:
```
npx wrangler login
```

2. Опубликуйте воркер:
```
npm run deploy
```

3. Установите вебхук для вашего бота:
   - Перейдите по URL: `https://your-worker.yourusername.workers.dev/setup`

### Локальная разработка

```
npm run dev
```

## Использование

1. Найдите бота в Telegram по его имени
2. Нажмите /start и следуйте инструкциям
3. После настройки отправляйте боту названия блюд для анализа
4. Используйте /result для просмотра дневной статистики 