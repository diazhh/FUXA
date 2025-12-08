module.exports = {
  apps: [
    {
      name: 'fuxa-proyectos',
      script: 'main.js',
      cwd: '/var/proyectos/FUXA/server',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};