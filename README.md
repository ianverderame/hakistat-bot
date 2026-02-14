# hakistat-bot

New commands must export:
    - a one word name
    - a description
    - usage including the command itself

To update, first run: 
`scp -r <project> root@<ip>:/root/hakistat-bot/`
Then ssh into the server ~/hakistat-bot/
`pm2 restart hakistat-bot`