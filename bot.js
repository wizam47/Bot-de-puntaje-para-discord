require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const { getPoints, setPoints, resetAllPoints, getAllScores, subtractPoints } = require('./firebase');

// Inicializa el cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

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
      description: 'Muestra el top 5 de usuarios con más puntos.',
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
      Routes.applicationCommands(client.user.id),
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

  // Comando /asignar
  if (commandName === 'asignar') {
    await interaction.deferReply();
    const user = options.getUser('usuario');
    const points = options.getInteger('puntos');
    const currentPoints = await getPoints(user.id);
    await setPoints(user.id, currentPoints + points);
    await interaction.editReply(`${user.tag} ahora tiene ${await getPoints(user.id)} puntos.`);
  }

  // Comando /ver
  if (commandName === 'ver') {
    await interaction.deferReply();
    const user = options.getUser('usuario') || interaction.user;
    const points = await getPoints(user.id);
    await interaction.editReply(`${user.tag} tiene ${points} puntos.`);
  }

  // Comando /quitar
  if (commandName === 'quitar') {
    await interaction.deferReply();
    const user = options.getUser('usuario');
    const points = options.getInteger('puntos');
    const currentPoints = await getPoints(user.id);
    if (currentPoints <= 0) {
      await interaction.editReply(`${user.tag} no tiene puntos para quitar.`);
      return;
    }
    const newPoints = await subtractPoints(user.id, points);
    await interaction.editReply(`${user.tag} ahora tiene ${newPoints} puntos.`);
  }

  // Comando /top
  if (commandName === 'top') {
    await interaction.deferReply();
    const allScores = await getAllScores();
    if (Object.keys(allScores).length === 0) {
      await interaction.editReply('Aún no hay usuarios en el ranking.');
      return;
    }

    // Convierte el objeto a un array y ordena por puntos
    const sortedScores = Object.entries(allScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const embeds = [];
    for (const [index, [userId, points]] of sortedScores.entries()) {
      try {
        const user = await client.users.fetch(userId);
        const position = index + 1;
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
    await interaction.editReply({ embeds: embeds });
  }

  // Comando /reiniciar
  if (commandName === 'reiniciar') {
    await interaction.deferReply();
    await resetAllPoints();
    await interaction.editReply('✅ Todos los puntajes han sido reiniciados a cero.');
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
