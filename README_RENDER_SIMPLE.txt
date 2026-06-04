БЫСТРАЯ ИНСТРУКЦИЯ: DEPLOY НА RENDER

1. GitHub
- Создай новый репозиторий, например wedding-render.
- Загрузи в него ВСЕ файлы из этой папки, не ZIP-архив.
- В корне репозитория должны быть index.html, admin.html, style.css, server.js, package.json, render.yaml.

2. Render
- Открой Render.
- Нажми New -> Blueprint.
- Подключи GitHub и выбери репозиторий wedding-render.
- Render найдёт файл render.yaml и предложит создать Web Service + PostgreSQL.
- Нажми Apply / Create.

3. Пароль админки
- В Render открой созданный Web Service.
- Перейди в Environment.
- Добавь или проверь переменную:
  ADMIN_PASSWORD=2706
- Можно поставить свой пароль.

4. Проверка
- Сайт: https://твой-сервис.onrender.com
- Проверка сервера: https://твой-сервис.onrender.com/health
- Админка: https://твой-сервис.onrender.com/admin.html

5. Чтобы Render не засыпал
- Зарегистрируйся в UptimeRobot.
- Add New Monitor.
- Monitor Type: HTTP(s).
- URL: https://твой-сервис.onrender.com/health
- Interval: 5 minutes.
- Save.

ВАЖНО
- На Render Free сайт может засыпать без входящих запросов.
- UptimeRobot раз в 5 минут будет дёргать /health и обычно не даст ему уснуть.
- Бесплатный Render не даёт 100% гарантию, но для свадебного сайта это самый простой рабочий вариант.
- Заявки гостей сохраняются в PostgreSQL, который Render создаёт по render.yaml.
- После свадьбы зайди в админку и скачай CSV со списком гостей.
