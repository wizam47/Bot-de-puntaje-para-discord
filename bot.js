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

// Manejo de errores globales
client.on('error', (error) => {
  console.error('Error en el cliente de Discord:', error);
});

// Evento: Bot conectado
client.on('clientReady', async () => {
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
      Routes.applicationGuildCommands(client.user.id, '1130595217582608567'),
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

  try {
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
      if (points > currentPoints) {
        await interaction.editReply(`${user.tag} no tiene suficientes puntos para quitar.`);
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

      const sortedScores = Object.entries(allScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const presentationEmbed = new EmbedBuilder()
        .setTitle('👑 **RANKING** 👑')
        .setColor('#FF6B6B');

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
          const position = index + 1;
          const embed = new EmbedBuilder()
            .setTitle(`${position} 🏅 Usuario desconocido`)
            .setDescription(`\`${points}\` puntos`)
            .setColor('#FF6B6B');
          embeds.push(embed);
        }
      }
      await interaction.editReply({ embeds: [presentationEmbed, ...embeds] });
    }

    // Comando /reiniciar
    if (commandName === 'reiniciar') {
      await interaction.deferReply();
      await resetAllPoints();
      await interaction.editReply('✅ Todos los puntajes han sido reiniciados a cero.');
    }
  } catch (error) {
    console.error(`Error en el comando ${commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Ocurrió un error al ejecutar este comando.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Ocurrió un error al ejecutar este comando.', ephemeral: true });
    }
  }
});

// Inicia sesión del bot
client.login(process.env.TOKEN).catch((error) => {
  console.error('Error al iniciar sesión:', error);
});

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

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).send('Página no encontrada');
});

// Manejo de errores del servidor
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error en el servidor');
});

// Inicia el servidor HTTP
app.listen(PORT, () => {
  console.log(`Servidor HTTP escuchando en el puerto ${PORT}`);
});
