Сайт-приглашение на свадьбу — Сергей и Людмила
Версия для Vercel + Neon Postgres

Что внутри:
- index.html — сайт-приглашение;
- admin.html — скрытая админка, открывается по прямому адресу /admin.html;
- api/ — Vercel Functions для сохранения RSVP;
- lib/db.js — подключение к Neon Postgres;
- schema.sql — таблица для базы, но сайт также создаёт таблицу автоматически;
- sergey-lyudmila-wedding.ics — файл календаря;
- assets/ — логотип и favicon.

Почему не сохраняем в файл:
На Vercel нельзя надёжно сохранять RSVP в data/rsvp.json, потому что функции запускаются как serverless.
Поэтому заявки гостей сохраняются в Neon Postgres через переменную DATABASE_URL.

Быстрая схема деплоя:
1. Создайте аккаунт на GitHub.
2. Создайте новый репозиторий и загрузите туда все файлы из этой папки.
3. Откройте Vercel -> Add New -> Project.
4. Импортируйте GitHub-репозиторий.
5. Framework Preset: Other.
6. Build Command: оставьте пустым.
7. Output Directory: оставьте пустым или укажите .
8. Deploy.
9. Подключите Neon Postgres:
   - либо через Vercel Marketplace -> Neon;
   - либо создайте базу на neon.tech и скопируйте connection string.
10. В Vercel откройте Project -> Settings -> Environment Variables и добавьте:
    DATABASE_URL=ваша_строка_подключения_Neon
    ADMIN_PASSWORD=любой_свой_пароль
11. Нажмите Redeploy.

Проверка после деплоя:
- Сайт: https://ваш-проект.vercel.app
- Проверка API: https://ваш-проект.vercel.app/api/health
- Админка: https://ваш-проект.vercel.app/admin.html

Пароль администратора по умолчанию:
2706

Как запустить локально:
1. Скопируйте .env.example в .env.local.
2. Вставьте DATABASE_URL из Neon.
3. Выполните:
   npm install -g pnpm
   pnpm install
   pnpm dev
4. Откройте http://localhost:3000

Важно:
- Если DATABASE_URL не добавлен, форма RSVP не сможет сохранять ответы.
- Если гости из России открывают Vercel без VPN и сайт не грузится, это ограничение доступности Vercel/провайдера, а не ошибка проекта.
- Для надёжности можно держать Vercel как основной вариант и PHP-архив под российский хостинг как запасной.

Команды запуска:
npm install -g pnpm
pnpm install
pnpm dev
