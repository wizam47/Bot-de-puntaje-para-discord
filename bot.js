require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');

// Inicializa el cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Objeto para almacenar puntajes
const scores = {};

// Evento: Bot conectado
client.on('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  // Registra los comandos de slash
  const commands = [
    {
      name: 'asignar',
      description: 'Asigna puntos a un usuario.',
      options: [
        {
          name: 'usuario',
          type: 6, // USER
          description: 'Usuario al que asignar puntos.',
          required: true,
        },
        {
          name: 'puntos',
          type: 4, // INTEGER
          description: 'Cantidad de puntos a asignar.',
          required: true,
        },
      ],
    },
    {
      name: 'ver',
      description: 'Ver puntos de un usuario.',
      options: [
        {
          name: 'usuario',
          type: 6, // USER
          description: 'Usuario del que ver los puntos (opcional).',
          required: false,
        },
      ],
    },
    {
      name: 'quitar',
      description: 'Quita puntos a un usuario.',
      options: [
        {
          name: 'usuario',
          type: 6, // USER
          description: 'Usuario al que quitar puntos.',
          required: true,
        },
        {
          name: 'puntos',
          type: 4, // INTEGER
          description: 'Cantidad de puntos a quitar.',
          required: true,
        },
      ],
    },
    {
      name: 'top',
      description: 'Muestra el top 10 de usuarios con más puntos.',
    },
    {
      name: 'reiniciar',
      description: 'Reinicia todos los puntos de los usuarios a cero.',
    },
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    console.log('Registrando comandos de slash...');
    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        '1399522484658634763' // Reemplaza con el ID de tu servidor
      ),
      { body: commands }
    );
    console.log('Comandos registrados correctamente.');
  } catch (error) {
    console.error('Error al registrar comandos:', error);
  }
});

// Evento: Interacción con comandos
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options } = interaction;

  if (commandName === 'asignar') {
    const user = options.getUser('usuario');
    const points = options.getInteger('puntos');
    if (!scores[user.id]) scores[user.id] = 0;
    scores[user.id] += points;
    await interaction.reply(`${user.tag} ahora tiene ${scores[user.id]} puntos.`);
  }

  if (commandName === 'ver') {
    const user = options.getUser('usuario') || interaction.user;
    const points = scores[user.id] || 0;
    await interaction.reply(`${user.tag} tiene ${points} puntos.`);
  }

  if (commandName === 'quitar') {
    const user = options.getUser('usuario');
    const points = options.getInteger('puntos');
    if (!scores[user.id] || scores[user.id] <= 0) {
      await interaction.reply(`${user.tag} no tiene puntos para quitar.`);
      return;
    }
    scores[user.id] -= points;
    if (scores[user.id] < 0) scores[user.id] = 0; // Evita puntajes negativos
    await interaction.reply(`${user.tag} ahora tiene ${scores[user.id]} puntos.`);
  }

  // Comando /top
  if (commandName === 'top') {
    const sortedScores = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Toma solo los primeros 5

    // Si no hay usuarios con puntos
    if (sortedScores.length === 0) {
      await interaction.reply('Aún no hay usuarios en el ranking.');
      return;
    }

    // Embed de presentación
    const presentationEmbed = new EmbedBuilder()
      .setTitle('👑 **RANKING** 👑')
      .setColor('#FF6B6B');

    // Crea un embed por cada usuario en el top 5
    const embeds = [];
    for (const [userId, points] of sortedScores) {
      try {
        const user = await client.users.fetch(userId);
        const position = sortedScores.findIndex(([id]) => id === userId) + 1;
        const embed = new EmbedBuilder()
          .setTitle(`${position} 🏅 ${user.tag}`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 64 }))
          .setDescription(`\`${points}\` puntos`)
          .setColor('#FF6B6B');
        embeds.push(embed);
      } catch (error) {
        console.error(`Error al obtener el usuario ${userId}:`, error);
      }
    }
    await interaction.reply({ embeds: [presentationEmbed, ...embeds] });
  }

  // Comando /reiniciar
  if (commandName === 'reiniciar') {
    for (const userId in scores) {
      scores[userId] = 0;
    }
    await interaction.reply('✅ Todos los puntajes han sido reiniciados a cero.');
  }
});

// Inicia sesión del bot
client.login(process.env.TOKEN);

// =============================================
// Servidor HTTP para mantener el servicio activo
// =============================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Ruta básica para mantener el servicio activo
app.get('/', (req, res) => {
  res.send('Bot de Discord en línea');
});

// Inicia el servidor HTTP
app.listen(PORT, () => {
  console.log(`Servidor HTTP escuchando en el puerto ${PORT}`);
});
