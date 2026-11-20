# Mikaela VPN — расширение для Firefox

Бесплатный прокси для браузера Firefox: одна кнопка, выбор страны, замер задержки.
Прокси работают на серверах Mikaela VPN; список серверов берётся из репозитория
[Mikaela-VPN-Chrome-Extension](https://github.com/tneange1/Mikaela-VPN-Chrome-Extension) (`servers.json`, обновляет Telegram-бот).
Расширение загружает только данные (JSON), удалённый код не выполняется.

- Приложения для всего устройства (Windows, Android): https://cabinet.mikaelavpn.xyz
- Политика конфиденциальности: [PRIVACY.md](PRIVACY.md)

## Сборка
GitHub Actions собирает `mikaela-vpn-firefox.zip` при каждом изменении и раз в 6 часов (подтягивает свежий список серверов).
Скачать: https://github.com/tneange1/Mikaela-VPN-Extension-FireFox/releases/latest/download/mikaela-vpn-firefox.zip

## Проверка локально
`about:debugging#/runtime/this-firefox` → «Загрузить временное дополнение» → `manifest.json` из распакованного ZIP.

## Публикация на addons.mozilla.org
Загрузить `mikaela-vpn-firefox.zip` (исходники не минифицируются, отдельный архив исходников не нужен).
Название: «Mikaela VPN: fast & free proxy». Категория: Privacy & Security. Политика: ссылка на PRIVACY.md в этом репозитории.
Если Mozilla просит пояснение к `<all_urls>` и `proxy`: прокси включается кнопкой и действует на все сайты; расширение не читает и не изменяет содержимое страниц.
